"""
Flood simulation service for AutoHydro Argentina.
Simplified 1D steady-state model using Manning's equation for normal depth.
"""

import math
from typing import Any


# Risk thresholds (max flood depth above bank, meters)
_RISK_THRESHOLDS = [
    (0.0, "Sin riesgo", "Flujo contenido en el cauce"),
    (0.3, "Bajo", "Transitable a pie con precaución"),
    (1.0, "Medio", "Peligroso para peatones"),
    (2.0, "Alto", "Peligroso para vehículos"),
    (float("inf"), "Muy Alto", "Evacuación necesaria"),
]

# Depth zones [lower, upper, hex_color, label]
_DEPTH_ZONES = [
    (0.0, 0.3, "#87CEEB", "0–0.3 m"),
    (0.3, 1.0, "#4169E1", "0.3–1.0 m"),
    (1.0, 2.0, "#00008B", "1.0–2.0 m"),
    (2.0, float("inf"), "#4B0082", "> 2.0 m"),
]


def _normal_depth_rect(Q: float, width: float, slope: float, n: float) -> float:
    """
    Solve Manning's equation for normal depth in a rectangular channel.
    Uses Newton-Raphson iteration.
    """
    b = width
    # Initial guess: assume average velocity ≈ 1.5 m/s
    y = max(Q / (b * 1.5), 0.01)
    sqrt_s = math.sqrt(slope)

    for _ in range(200):
        A = b * y
        P = b + 2.0 * y
        R = A / P
        Q_calc = (A / n) * R ** (2.0 / 3.0) * sqrt_s

        # Numerical derivative dQ/dy
        dy = y * 1e-4 + 1e-9
        A2 = b * (y + dy)
        P2 = b + 2.0 * (y + dy)
        R2 = A2 / P2
        Q2 = (A2 / n) * R2 ** (2.0 / 3.0) * sqrt_s
        dQdy = (Q2 - Q_calc) / dy

        if abs(dQdy) < 1e-14:
            break
        delta = (Q_calc - Q) / dQdy
        y_new = max(y - delta, 1e-4)
        if abs(y_new - y) < 1e-7:
            y = y_new
            break
        y = y_new

    return round(y, 5)


def _channel_capacity(width: float, depth: float, slope: float, n: float) -> float:
    """Bankfull capacity of rectangular channel."""
    A = width * depth
    P = width + 2.0 * depth
    R = A / P
    return (A / n) * R ** (2.0 / 3.0) * math.sqrt(slope)


def _classify_risk(flood_depth: float) -> tuple[str, str]:
    """Return (risk_level, description) for a given flood depth above bank."""
    if flood_depth <= 0:
        return "Sin riesgo", "Flujo contenido en el cauce"
    for threshold, level, desc in _RISK_THRESHOLDS[1:]:
        if flood_depth <= threshold:
            return level, desc
    return "Muy Alto", "Evacuación necesaria"


def _offset_latlng(lat: float, lng: float, dx_m: float, dy_m: float) -> list[float]:
    """Approximate offset in meters → [lat, lng]."""
    d_lat = dy_m / 111_000.0
    d_lng = dx_m / (111_000.0 * math.cos(math.radians(lat)))
    return [lat + d_lat, lng + d_lng]


def simulate_flood(
    design_flow_m3s: float,
    channel_type: str,  # rectangular | trapezoidal | natural
    channel_width: float,
    channel_depth: float,
    slope: float,
    manning_n: float,
    floodplain_width_m: float,
    simulation_length_m: float,
    center_lat: float,
    center_lng: float,
) -> dict[str, Any]:
    """
    Simplified 1D steady-state flood simulation.

    1. Computes normal depth for design_flow_m3s via Manning.
    2. If normal depth > channel_depth → flood onto floodplain.
    3. Estimates flooded area as rectangle (channel + floodplain × length).
    4. Returns GeoJSON polygon (axis-aligned rectangle around center point).
    """
    # ── 1. Normal depth (treat all types as rectangular for this simplified model) ──
    normal_depth_m = _normal_depth_rect(
        Q=design_flow_m3s, width=channel_width, slope=slope, n=manning_n
    )

    # ── 2. Bankfull capacity ────────────────────────────────────────────────────
    q_bank = _channel_capacity(channel_width, channel_depth, slope, manning_n)

    # ── 3. Flood extent ─────────────────────────────────────────────────────────
    if normal_depth_m <= channel_depth:
        flood_above_bank_m = 0.0
        flooded_half_width_m = 0.0
    else:
        flood_above_bank_m = normal_depth_m - channel_depth
        # Flood progressively covers floodplain; saturates at 2× bankfull depth
        fraction = min(1.0, flood_above_bank_m / max(channel_depth, 0.3))
        flooded_half_width_m = floodplain_width_m * fraction

    max_depth_m = round(flood_above_bank_m, 3)
    avg_depth_m = round(max_depth_m * 0.45, 3)  # ~triangular cross-section

    total_flood_width_m = channel_width + 2.0 * flooded_half_width_m
    flooded_area_m2 = total_flood_width_m * simulation_length_m
    flooded_area_ha = round(flooded_area_m2 / 10_000.0, 3)

    # ── 4. Risk ─────────────────────────────────────────────────────────────────
    risk_level, risk_desc = _classify_risk(max_depth_m)

    # ── 5. Depth zones (linear profile assumption) ──────────────────────────────
    depth_zones: list[dict] = []
    if max_depth_m > 0:
        for lower, upper, color, label in _DEPTH_ZONES:
            if lower >= max_depth_m:
                break
            eff_upper = min(upper, max_depth_m)
            frac = (eff_upper - lower) / max_depth_m
            if frac > 0:
                depth_zones.append({
                    "level": label,
                    "area_ha": round(flooded_area_ha * frac, 4),
                    "color": color,
                })

    # ── 6. GeoJSON rectangle polygon ────────────────────────────────────────────
    half_l = simulation_length_m / 2.0
    half_w = total_flood_width_m / 2.0
    corners = [
        _offset_latlng(center_lat, center_lng, -half_w, -half_l),
        _offset_latlng(center_lat, center_lng, +half_w, -half_l),
        _offset_latlng(center_lat, center_lng, +half_w, +half_l),
        _offset_latlng(center_lat, center_lng, -half_w, +half_l),
    ]
    # GeoJSON uses [lng, lat]
    ring = [[c[1], c[0]] for c in corners]
    ring.append(ring[0])

    flood_polygon = {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [ring]},
        "properties": {
            "max_depth_m": max_depth_m,
            "area_ha": flooded_area_ha,
            "risk_level": risk_level,
        },
    }

    # ── 7. Summary ──────────────────────────────────────────────────────────────
    if max_depth_m == 0:
        summary = (
            f"El caudal de diseño Q={design_flow_m3s:.3f} m³/s es contenido por el cauce "
            f"(tirante normal yn={normal_depth_m:.3f} m ≤ profundidad bancaria {channel_depth:.2f} m). "
            f"No se produce desborde."
        )
    else:
        summary = (
            f"Desborde detectado: Q={design_flow_m3s:.3f} m³/s supera la capacidad bancaria "
            f"Qb={q_bank:.3f} m³/s. Tirante normal yn={normal_depth_m:.3f} m, "
            f"exceso sobre la banca: {flood_above_bank_m:.3f} m. "
            f"Área inundada estimada: {flooded_area_ha:.2f} ha — Riesgo {risk_level}: {risk_desc}."
        )

    return {
        "flooded_area_ha": flooded_area_ha,
        "max_depth_m": max_depth_m,
        "avg_depth_m": avg_depth_m,
        "normal_depth_m": round(normal_depth_m, 3),
        "channel_capacity_m3s": round(q_bank, 3),
        "flood_above_bank_m": round(flood_above_bank_m, 3),
        "total_flood_width_m": round(total_flood_width_m, 2),
        "risk_level": risk_level,
        "risk_description": risk_desc,
        "flood_polygon": flood_polygon,
        "depth_zones": depth_zones,
        "summary": summary,
    }
