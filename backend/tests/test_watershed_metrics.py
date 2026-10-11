"""GIS regression tests with synthetic DEMs; no remote DEM service is used."""

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin

from app.services.watershed import _process, _flow_distances_m
from pysheds.sview import Raster, ViewFinder
from pyproj import Proj


def test_geographic_dem_flow_length_is_in_metres(tmp_path):
    # 100 eastward links of 3 arcseconds near the equator: ~9.277 km.
    # A cross-valley gradient steers tributaries to the central row.
    rows, cols = 5, 101
    dem = (np.arange(cols)[::-1][None, :] * 10.0
           + np.abs(np.arange(rows)[:, None] - 2) * 20.0).astype("float32")
    cell = 1 / 1200
    transform = from_origin(0, rows * cell, cell, cell)
    path = tmp_path / "synthetic_wgs84.tif"
    with rasterio.open(path, "w", driver="GTiff", height=rows, width=cols,
                       count=1, dtype=dem.dtype, crs="EPSG:4326",
                       transform=transform, nodata=-9999) as dst:
        dst.write(dem, 1)
    lon, lat = transform @ (cols - 0.5, 2.5)
    result = _process(str(path), lat, lon)
    assert result["length_km"] == pytest.approx(9.277, abs=0.15)
    assert 0.1 < result["area_km2"] < 10
    assert result["length_method"] == "longest_d8_flow_path_geodesic"


def test_projected_links_include_diagonals_and_border_outlet():
    # Two links to an outlet on the corner: one diagonal, one eastward.
    values = np.array([[2, 0, 0], [0, 1, 0]], dtype=np.int64)
    view = ViewFinder(affine=from_origin(0, 180, 90, 90), shape=values.shape,
                      crs=Proj("EPSG:32721"), nodata=0)
    distances = _flow_distances_m(Raster(values, viewfinder=view), 1, 2)
    assert distances[1, 1] == pytest.approx(90)
    assert distances[0, 0] == pytest.approx(90 + 90 * np.sqrt(2))
    assert distances[1, 2] == 0
    assert np.isnan(distances[0, 1])


@pytest.mark.parametrize("latitude,expected", [(0, 111.31949), (-60, 55.80)])
def test_geographic_eastward_links_respect_latitude(latitude, expected):
    values = np.array([[1, 1, 0]], dtype=np.int64)
    view = ViewFinder(affine=from_origin(0, latitude + 0.0005, 0.001, 0.001),
                      shape=values.shape, crs=Proj("EPSG:4326"), nodata=0)
    distances = _flow_distances_m(Raster(values, viewfinder=view), 0, 2)
    assert distances[0, 0] == pytest.approx(2 * expected, rel=0.001)
