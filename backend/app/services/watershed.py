"""
Watershed delineation service using pysheds + SRTM DEM from OpenTopography.

DEM source: OpenTopography Global DEM API (SRTMGL3 - 90 m resolution).
Free API key required: https://portal.opentopography.org/myopentopo
Set OPENTOPOGRAPHY_API_KEY in the .env file.
"""

from __future__ import annotations

import logging
import os
import tempfile
from typing import Any

import numpy as np
import httpx

logger = logging.getLogger(__name__)

# Maximum delineatable area (server-side guard).
# Very large watersheds take too long and exceed the DEM tile size.
_MAX_AREA_KM2 = 500.0
_MIN_AREA_KM2 = 0.05  # below this the result is unreliable

# DEM download settings
_DEM_BUFFER_DEG = 0.25   # degrees of padding around the pour point (~28 km)
_DEM_TYPE = "SRTMGL3"    # 90 m global SRTM


# ── DEM download ──────────────────────────────────────────────────────────────

def _download_dem(lat: float, lon: float, buffer: float = _DEM_BUFFER_DEG) -> bytes:
    """Download a GeoTIFF DEM tile from the OpenTopography global DEM API."""
    api_key = os.getenv("OPENTOPOGRAPHY_API_KEY", "").strip()

    params: dict[str, Any] = {
        "demtype": _DEM_TYPE,
        "south": lat - buffer,
        "north": lat + buffer,
        "west": lon - buffer,
        "east": lon + buffer,
        "outputFormat": "GTiff",
    }
    if api_key:
        params["API_Key"] = api_key

    try:
        resp = httpx.get(
            "https://portal.opentopography.org/API/globaldem",
            params=params,
            timeout=90,
        )
    except httpx.RequestError as exc:
        raise RuntimeError(f"Error de red al descargar el DEM: {exc}") from exc

    if resp.status_code in (401, 403):
        raise RuntimeError(
            "Se requiere una API key de OpenTopography. "
            "Registrate gratis en https://portal.opentopography.org/myopentopo "
            "y agregá OPENTOPOGRAPHY_API_KEY en el archivo .env del backend."
        )

    if not resp.ok:
        raise RuntimeError(
            f"El servidor DEM devolvió un error {resp.status_code}. "
            "Verificá que las coordenadas estén dentro del rango de SRTM "
            "(-60° a 60° de latitud)."
        )

    content_type = resp.headers.get("content-type", "")
    if "text" in content_type or "html" in content_type:
        # OpenTopography sometimes returns error pages as text/html
        snippet = resp.text[:300].strip()
        raise RuntimeError(f"Respuesta inesperada del servidor DEM: {snippet}")

    return resp.content


# ── pysheds processing ────────────────────────────────────────────────────────

def _check_imports() -> None:
    """Raise a clear error if the geo dependencies are not installed."""
    missing = []
    for pkg in ("pysheds", "rasterio", "shapely"):
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        raise RuntimeError(
            f"Dependencias no instaladas: {', '.join(missing)}. "
            "Ejecutá: pip install pysheds rasterio shapely"
        )


def _approx_cell_area_m2(affine: Any, lat: float) -> float:
    """
    Approximate geodesic cell area in m² from the raster affine and latitude.
    For SRTM3 (~3 arc-seconds / ~90 m) this is good to within ~1 %.
    """
    deg = abs(affine[0])  # degrees per pixel (square pixels assumed)
    m_per_deg_lat = 111_320.0
    m_per_deg_lon = 111_320.0 * np.cos(np.radians(lat))
    return (deg * m_per_deg_lat) * (deg * m_per_deg_lon)


def _process(dem_path: str, lat: float, lon: float) -> dict[str, Any]:
    from pysheds.grid import Grid
    from rasterio.features import shapes as rio_shapes
    from shapely.geometry import mapping, shape
    from shapely.ops import unary_union

    # ── Load and condition DEM ────────────────────────────────────────────────
    grid = Grid.from_raster(dem_path)
    dem = grid.read_raster(dem_path)

    pit_filled = grid.fill_pits(dem)
    flooded = grid.fill_depressions(pit_filled)
    inflated = grid.resolve_flats(flooded)

    # ── Flow direction & accumulation ─────────────────────────────────────────
    fdir = grid.flowdir(inflated)
    acc = grid.accumulation(fdir)

    # ── Snap pour point to nearest stream cell ────────────────────────────────
    # Use 1 % of max accumulation as stream threshold (min 50 cells).
    acc_max = float(acc.max())
    threshold = max(50, int(acc_max * 0.01))
    try:
        x_snap, y_snap = grid.snap_to_mask(acc > threshold, (lon, lat))
    except Exception:
        # If snap fails (e.g. no stream cells near the point) try with a lower threshold
        x_snap, y_snap = grid.snap_to_mask(acc > 10, (lon, lat))

    # ── Delineate catchment ───────────────────────────────────────────────────
    catch = grid.catchment(x=x_snap, y=y_snap, fdir=fdir, xytype="coordinate")

    n_cells = int(catch.sum())
    if n_cells == 0:
        raise ValueError("no_watershed")

    # ── Clip grid to the catchment extent ────────────────────────────────────
    grid.clip_to(catch)
    catch_view = grid.view(catch)
    dem_view = grid.view(inflated)

    # ── Area ─────────────────────────────────────────────────────────────────
    try:
        # pysheds >= 0.4 exposes cell_area()
        cell_areas = grid.cell_area(latlon=True, inplace=False)
        area_m2 = float(np.sum(grid.view(cell_areas) * catch_view))
    except Exception:
        cell_m2 = _approx_cell_area_m2(grid.affine, lat)
        area_m2 = int(catch_view.sum()) * cell_m2

    area_km2 = area_m2 / 1_000_000.0

    if area_km2 < _MIN_AREA_KM2:
        raise ValueError("no_watershed")
    if area_km2 > _MAX_AREA_KM2:
        raise ValueError("too_large")

    # ── Average slope within the watershed ───────────────────────────────────
    dem_masked = np.where(catch_view.astype(bool), dem_view.astype(float), np.nan)
    dy, dx = np.gradient(dem_masked)
    deg_per_px = abs(grid.affine[0])
    m_per_px = deg_per_px * 111_320.0  # approximate (good enough for slope)
    slope_mag = np.sqrt((dx / m_per_px) ** 2 + (dy / m_per_px) ** 2)
    valid_slope = slope_mag[catch_view.astype(bool) & np.isfinite(slope_mag)]
    avg_slope = float(np.mean(valid_slope)) if valid_slope.size > 0 else 0.005
    avg_slope = float(np.clip(avg_slope, 0.0005, 2.0))

    # ── Main channel length ───────────────────────────────────────────────────
    try:
        dist = grid.distance_to_outlet(
            x=x_snap,
            y=y_snap,
            fdir=fdir,
            catch=catch,
            xytype="coordinate",
        )
        dist_view = grid.view(dist)
        channel_m = float(np.nanmax(dist_view[catch_view.astype(bool)]))
        channel_km = channel_m / 1_000.0
    except Exception:
        # Fallback: empirical relationship L ≈ 1.5 · A^0.6 (km, Kirpich-like)
        channel_km = 1.5 * (area_km2 ** 0.6)

    channel_km = float(np.clip(channel_km, 0.1, 1_000.0))

    # ── Vectorise watershed → GeoJSON polygon ────────────────────────────────
    catch_uint8 = catch_view.astype(np.uint8)
    polys = [
        shape(geom)
        for geom, val in rio_shapes(catch_uint8, transform=grid.affine)
        if val == 1
    ]
    if not polys:
        raise ValueError("no_watershed")

    watershed_poly = unary_union(polys)
    # Simplify to reduce GeoJSON payload size (~10 m tolerance at SRTM3 resolution)
    watershed_poly = watershed_poly.simplify(0.001, preserve_topology=True)

    return {
        "geojson": mapping(watershed_poly),
        "area_km2": round(area_km2, 4),
        "slope": round(avg_slope, 6),
        "length_km": round(channel_km, 3),
    }


# ── Public API ────────────────────────────────────────────────────────────────

def delineate_watershed(lat: float, lon: float) -> dict[str, Any]:
    """
    Download SRTM DEM and delineate the watershed draining to (lat, lon).

    Returns
    -------
    dict with keys: geojson, area_km2, slope (m/m), length_km

    Raises
    ------
    ValueError  – "no_watershed" or "too_large" (user-facing business errors)
    RuntimeError – dependency / network / DEM server errors
    """
    _check_imports()

    dem_bytes = _download_dem(lat, lon)

    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
        tmp.write(dem_bytes)
        dem_path = tmp.name

    try:
        return _process(dem_path, lat, lon)
    finally:
        try:
            os.unlink(dem_path)
        except OSError:
            pass
