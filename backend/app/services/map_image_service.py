"""
Static map image generator for basin polygon visualization.

Uses the staticmap library to generate a PNG with the drawn basin polygon
overlaid on OpenStreetMap tiles.
"""

from __future__ import annotations

from io import BytesIO
from typing import Optional

try:
    from staticmap import StaticMap, Polygon, Line
    _STATICMAP_AVAILABLE = True
except ImportError:
    _STATICMAP_AVAILABLE = False


def generate_basin_map_image(
    polygon: list[list[float]],
    width: int = 800,
    height: int = 500,
) -> Optional[bytes]:
    """
    Generate a static map PNG showing the basin polygon.

    Args:
        polygon: List of [lat, lng] coordinate pairs.
        width: Image width in pixels.
        height: Image height in pixels.

    Returns:
        PNG image bytes, or None if staticmap is unavailable or generation fails.
    """
    if not _STATICMAP_AVAILABLE or not polygon or len(polygon) < 3:
        return None

    try:
        # staticmap expects (lng, lat) order
        coords = [(pt[1], pt[0]) for pt in polygon]

        m = StaticMap(width, height, url_template="https://tile.openstreetmap.org/{z}/{x}/{y}.png")

        # Filled polygon (semi-transparent blue fill via outline only — staticmap uses
        # a Polygon for fill and a Line for a distinct border)
        m.add_polygon(Polygon(coords, fill_color="#3b82f680", outline_color="#1d4ed8", simplify=True))

        # Thicker border line on top
        closed_coords = coords + [coords[0]]
        m.add_line(Line(closed_coords, "#1d4ed8", width=3))

        image = m.render()

        buf = BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)
        return buf.read()

    except Exception:
        return None
