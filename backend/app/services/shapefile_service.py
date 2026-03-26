"""
Shapefile import/export service for AutoHydro Argentina.
Uses pyshp (shapefile) for reading and writing ESRI Shapefiles.
"""

import io
import math
import zipfile
from typing import Any, Optional

import shapefile  # pyshp


# WGS84 projection WKT (standard for web GIS)
_WGS84_PRJ = (
    'GEOGCS["GCS_WGS_1984",'
    'DATUM["D_WGS_1984",'
    'SPHEROID["WGS_1984",6378137.0,298.257223563]],'
    'PRIMEM["Greenwich",0.0],'
    'UNIT["Degree",0.0174532925199433]]'
)


def _geodesic_area_km2(coords_lng_lat: list[list[float]]) -> float:
    """Approximate geodesic area from WGS84 polygon (lng, lat) in km²."""
    if len(coords_lng_lat) < 3:
        return 0.0
    R = 6371.0
    total = 0.0
    n = len(coords_lng_lat)
    for i in range(n):
        j = (i + 1) % n
        lng1, lat1 = coords_lng_lat[i]
        lng2, lat2 = coords_lng_lat[j]
        total += math.radians(lng2 - lng1) * (
            2 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2))
        )
    area = abs(total * R * R / 2)
    return area


# ── Export ─────────────────────────────────────────────────────────────────────

def export_polygon_to_shapefile_zip(
    polygon: list[list[float]],       # [[lat, lng], ...] — Leaflet order
    attributes: Optional[dict[str, Any]] = None,
    name: str = "cuenca",
) -> bytes:
    """
    Convert a Leaflet polygon ([[lat, lng], ...]) to a ZIP file with .shp/.shx/.dbf/.prj.

    Returns ZIP bytes ready for HTTP response.
    """
    attrs = attributes or {}

    # Convert [lat, lng] → [lng, lat] for shapefile (X, Y = lng, lat)
    coords_lng_lat = [[p[1], p[0]] for p in polygon]

    # Close polygon if not already closed
    if coords_lng_lat and coords_lng_lat[0] != coords_lng_lat[-1]:
        coords_lng_lat.append(coords_lng_lat[0])

    shp_buf = io.BytesIO()
    shx_buf = io.BytesIO()
    dbf_buf = io.BytesIO()

    with shapefile.Writer(shp=shp_buf, shx=shx_buf, dbf=dbf_buf,
                          shapeType=shapefile.POLYGON) as w:
        # Define attribute fields
        w.field("nombre",        "C", size=60)
        w.field("area_km2",      "N", decimal=4)
        w.field("perimetro_km",  "N", decimal=4)
        w.field("retorno_anos",  "N")
        w.field("metodo",        "C", size=30)
        w.field("CN",            "N", decimal=1)
        w.field("C_escorrentia", "N", decimal=3)
        w.field("Q_diseno_m3s",  "N", decimal=4)
        w.field("riesgo",        "C", size=20)

        # Compute area and perimeter from coords
        area = _geodesic_area_km2(coords_lng_lat[:-1])  # exclude closing point

        # Simple perimeter estimate (sum of geodesic segment lengths)
        R = 6371.0
        perim = 0.0
        n = len(coords_lng_lat) - 1
        for i in range(n):
            lng1, lat1 = math.radians(coords_lng_lat[i][0]), math.radians(coords_lng_lat[i][1])
            lng2, lat2 = math.radians(coords_lng_lat[i+1][0]), math.radians(coords_lng_lat[i+1][1])
            dlng = lng2 - lng1
            dlat = lat2 - lat1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
            perim += 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        # Write shape and record
        w.poly([coords_lng_lat])
        w.record(
            nombre=attrs.get("project_name", "Cuenca")[:60],
            area_km2=round(area, 4),
            perimetro_km=round(perim, 4),
            retorno_anos=int(attrs.get("return_period", 0)),
            metodo=str(attrs.get("method", ""))[:30],
            CN=round(float(attrs.get("cn", 0) or 0), 1),
            C_escorrentia=round(float(attrs.get("runoff_coeff", 0) or 0), 3),
            Q_diseno_m3s=round(float(attrs.get("peak_flow_m3s", 0) or 0), 4),
            riesgo=str(attrs.get("risk_level", ""))[:20],
        )

    # Pack into ZIP
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{name}.shp", shp_buf.getvalue())
        zf.writestr(f"{name}.shx", shx_buf.getvalue())
        zf.writestr(f"{name}.dbf", dbf_buf.getvalue())
        zf.writestr(f"{name}.prj", _WGS84_PRJ)

    return zip_buf.getvalue()


# ── Import ─────────────────────────────────────────────────────────────────────

def import_shapefile_from_zip(zip_bytes: bytes) -> dict[str, Any]:
    """
    Read the first polygon from a ZIP file containing shapefile components.

    Returns:
        {
          "polygon": [[lat, lng], ...],   # Leaflet order
          "area_km2": float,
          "attributes": dict              # first record's attributes
        }
    """
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        shp_name = next((n for n in names if n.lower().endswith(".shp")), None)
        dbf_name = next((n for n in names if n.lower().endswith(".dbf")), None)
        shx_name = next((n for n in names if n.lower().endswith(".shx")), None)

        if not shp_name:
            raise ValueError("No se encontró archivo .shp en el ZIP")

        shp_buf = io.BytesIO(zf.read(shp_name))
        dbf_buf = io.BytesIO(zf.read(dbf_name)) if dbf_name else None
        shx_buf = io.BytesIO(zf.read(shx_name)) if shx_name else None

        kwargs: dict[str, Any] = {"shp": shp_buf}
        if dbf_buf:
            kwargs["dbf"] = dbf_buf
        if shx_buf:
            kwargs["shx"] = shx_buf

        r = shapefile.Reader(**kwargs)

        if r.numRecords == 0:
            raise ValueError("El shapefile no contiene entidades")

        shape = r.shape(0)

        # Support polygon and multipatch types
        if shape.shapeType not in (5, 15, 25, 31):
            raise ValueError(
                f"El shapefile debe contener polígonos (tipo {shape.shapeType} no soportado)"
            )

        # Extract first ring of first shape (lng, lat from shapefile)
        if not shape.points:
            raise ValueError("El polígono no tiene coordenadas")

        # Get outer ring: for polygon type, first ring is exterior
        coords_lng_lat: list[list[float]] = [list(p) for p in shape.points]

        # Remove closing duplicate if present
        if len(coords_lng_lat) > 1 and coords_lng_lat[0] == coords_lng_lat[-1]:
            coords_lng_lat = coords_lng_lat[:-1]

        # Convert (lng, lat) → [lat, lng] for Leaflet/frontend
        polygon_lat_lng = [[p[1], p[0]] for p in coords_lng_lat]

        area = _geodesic_area_km2(coords_lng_lat)

        # Extract attributes from first record
        attrs: dict[str, Any] = {}
        if dbf_buf:
            try:
                rec = r.record(0)
                attrs = dict(zip(r.fields[1:], rec))  # skip deletion flag
                # Convert field tuples to string keys
                attrs = {str(k[0]) if isinstance(k, (list, tuple)) else str(k): v
                         for k, v in attrs.items()}
            except Exception:
                pass

        return {
            "polygon": polygon_lat_lng,
            "area_km2": round(area, 4),
            "attributes": attrs,
        }


def import_shapefile_from_shp(shp_bytes: bytes) -> dict[str, Any]:
    """Import from a raw .shp file (no .dbf)."""
    shp_buf = io.BytesIO(shp_bytes)
    r = shapefile.Reader(shp=shp_buf)

    if r.numRecords == 0:
        raise ValueError("El shapefile no contiene entidades")

    shape = r.shape(0)
    if shape.shapeType not in (5, 15, 25, 31):
        raise ValueError("El shapefile debe contener polígonos")

    coords_lng_lat = [list(p) for p in shape.points]
    if len(coords_lng_lat) > 1 and coords_lng_lat[0] == coords_lng_lat[-1]:
        coords_lng_lat = coords_lng_lat[:-1]

    polygon_lat_lng = [[p[1], p[0]] for p in coords_lng_lat]
    area = _geodesic_area_km2(coords_lng_lat)

    return {
        "polygon": polygon_lat_lng,
        "area_km2": round(area, 4),
        "attributes": {},
    }
