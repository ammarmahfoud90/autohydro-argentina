"""
Manning's equation hydraulic calculator for open channels.

Formula: Q = (1/n) * A * R^(2/3) * S^(1/2)

Supports rectangular, trapezoidal, circular, and triangular cross-sections.
"""

from __future__ import annotations

import math
from typing import Any

# ── Manning's n reference values for Argentina ────────────────────────────────

MANNING_N_REFERENCE: list[dict] = [
    # Canales revestidos
    {
        "id": "hormigon_liso",
        "description": "Canal revestido — Hormigón liso",
        "n_min": 0.012,
        "n_typical": 0.013,
        "n_max": 0.015,
        "group": "Canales revestidos",
    },
    {
        "id": "hormigon_rugoso",
        "description": "Canal revestido — Hormigón rugoso / encofrado",
        "n_min": 0.015,
        "n_typical": 0.017,
        "n_max": 0.020,
        "group": "Canales revestidos",
    },
    {
        "id": "mamposteria_mortero",
        "description": "Canal revestido — Mampostería con mortero",
        "n_min": 0.017,
        "n_typical": 0.020,
        "n_max": 0.025,
        "group": "Canales revestidos",
    },
    {
        "id": "piedra_seca",
        "description": "Canal revestido — Piedra seca / emplantillado",
        "n_min": 0.025,
        "n_typical": 0.030,
        "n_max": 0.035,
        "group": "Canales revestidos",
    },
    # Canales de tierra
    {
        "id": "tierra_limpia",
        "description": "Canal de tierra — Limpio, sin vegetación",
        "n_min": 0.022,
        "n_typical": 0.025,
        "n_max": 0.030,
        "group": "Canales de tierra",
    },
    {
        "id": "tierra_con_grava",
        "description": "Canal de tierra — Con grava y algo de vegetación",
        "n_min": 0.025,
        "n_typical": 0.028,
        "n_max": 0.033,
        "group": "Canales de tierra",
    },
    {
        "id": "tierra_con_vegetacion",
        "description": "Canal de tierra — Con vegetación densa",
        "n_min": 0.030,
        "n_typical": 0.040,
        "n_max": 0.050,
        "group": "Canales de tierra",
    },
    # Alcantarillas / estructuras
    {
        "id": "alcantarilla_hormigon",
        "description": "Alcantarilla de hormigón / tubo liso",
        "n_min": 0.012,
        "n_typical": 0.013,
        "n_max": 0.015,
        "group": "Alcantarillas y estructuras",
    },
    {
        "id": "caño_corrugado",
        "description": "Caño corrugado de chapa / PEAD corrugado",
        "n_min": 0.020,
        "n_typical": 0.024,
        "n_max": 0.030,
        "group": "Alcantarillas y estructuras",
    },
    # Cauces naturales
    {
        "id": "cauce_limpio",
        "description": "Cauce natural — Limpio, recto, sin irregularidades",
        "n_min": 0.030,
        "n_typical": 0.035,
        "n_max": 0.040,
        "group": "Cauces naturales",
    },
    {
        "id": "cauce_sinuoso",
        "description": "Cauce natural — Sinuoso, con algo de vegetación",
        "n_min": 0.035,
        "n_typical": 0.045,
        "n_max": 0.050,
        "group": "Cauces naturales",
    },
    {
        "id": "cauce_vegetacion_densa",
        "description": "Cauce natural — Con vegetación densa y obstrucciones",
        "n_min": 0.050,
        "n_typical": 0.075,
        "n_max": 0.100,
        "group": "Cauces naturales",
    },
    {
        "id": "planicie_inundacion",
        "description": "Planicie de inundación — Pastura / cultivo",
        "n_min": 0.025,
        "n_typical": 0.035,
        "n_max": 0.050,
        "group": "Cauces naturales",
    },
]

# ── Velocity limits by lining type ────────────────────────────────────────────

VELOCITY_LIMITS: dict[str, dict] = {
    "hormigon": {
        "label": "Hormigón",
        "v_min": 0.60,
        "v_max": 5.0,
    },
    "tierra_arcillosa": {
        "label": "Tierra arcillosa",
        "v_min": 0.30,
        "v_max": 0.90,
    },
    "tierra_limosa": {
        "label": "Tierra limosa",
        "v_min": 0.30,
        "v_max": 0.75,
    },
    "tierra_arenosa": {
        "label": "Tierra arenosa",
        "v_min": 0.30,
        "v_max": 0.60,
    },
    "grava_fina": {
        "label": "Grava fina",
        "v_min": 0.30,
        "v_max": 1.20,
    },
    "grava_gruesa": {
        "label": "Grava gruesa / canto rodado",
        "v_min": 0.30,
        "v_max": 1.80,
    },
    "roca": {
        "label": "Roca",
        "v_min": 0.60,
        "v_max": 6.0,
    },
}

_G = 9.81  # m/s²


# ── Geometry helpers ──────────────────────────────────────────────────────────

def _rect(b: float, y: float) -> tuple[float, float, float]:
    """Return (A, P, T) for rectangular section."""
    A = b * y
    P = b + 2 * y
    T = b
    return A, P, T


def _trap(b: float, y: float, z: float) -> tuple[float, float, float]:
    """Return (A, P, T) for trapezoidal section (z:1 side slope)."""
    A = (b + z * y) * y
    P = b + 2 * y * math.sqrt(1 + z ** 2)
    T = b + 2 * z * y
    return A, P, T


def _circ(D: float, y: float) -> tuple[float, float, float]:
    """Return (A, P, T) for partially-full circular section."""
    if y <= 0:
        return 0.0, 0.0, 0.0
    if y >= D:
        # Full pipe
        A = math.pi * D ** 2 / 4
        P = math.pi * D
        T = 0.0  # no free surface
        return A, P, T
    theta = 2 * math.acos(1 - 2 * y / D)  # central angle (rad)
    A = (D ** 2 / 8) * (theta - math.sin(theta))
    P = D * theta / 2
    T = D * math.sin(theta / 2)
    return A, P, T


def _trian(z: float, y: float) -> tuple[float, float, float]:
    """Return (A, P, T) for triangular section (z:1 each side)."""
    A = z * y ** 2
    P = 2 * y * math.sqrt(1 + z ** 2)
    T = 2 * z * y
    return A, P, T


# ── Main calculator ───────────────────────────────────────────────────────────

def calculate_manning(params: dict[str, Any]) -> dict[str, Any]:
    """
    Calculate hydraulic properties using Manning's equation.

    Expected params:
        channel_type: "rectangular" | "trapezoidal" | "circular" | "triangular"
        manning_n: float
        slope: float  (m/m, e.g. 0.001)
        design_flow: float | None  (m³/s — for design check mode)

        For rectangular:  width, depth
        For trapezoidal:  bottom_width, depth, side_slope (z in z:1)
        For circular:     diameter, depth
        For triangular:   side_slope (z in z:1), depth
        lining_type: str | None  (key in VELOCITY_LIMITS, for warnings)

    Returns dict with all hydraulic parameters and warnings.
    """
    ch = params["channel_type"]
    n = float(params["manning_n"])
    S = float(params["slope"])
    design_Q = params.get("design_flow")
    lining = params.get("lining_type")

    if n <= 0:
        raise ValueError("El coeficiente de Manning n debe ser mayor que cero.")
    if S <= 0:
        raise ValueError("La pendiente longitudinal debe ser mayor que cero.")

    # Geometry
    if ch == "rectangular":
        b = float(params["width"])
        y = float(params["depth"])
        if b <= 0 or y <= 0:
            raise ValueError("Ancho y tirante deben ser positivos.")
        A, P, T = _rect(b, y)
    elif ch == "trapezoidal":
        b = float(params["bottom_width"])
        y = float(params["depth"])
        z = float(params["side_slope"])
        if b < 0 or y <= 0 or z < 0:
            raise ValueError("Parámetros geométricos inválidos para sección trapecial.")
        A, P, T = _trap(b, y, z)
    elif ch == "circular":
        D = float(params["diameter"])
        y = float(params["depth"])
        if D <= 0 or y < 0:
            raise ValueError("Diámetro y tirante deben ser positivos.")
        if y > D:
            raise ValueError(f"El tirante ({y} m) no puede superar el diámetro ({D} m).")
        A, P, T = _circ(D, y)
    elif ch == "triangular":
        z = float(params["side_slope"])
        y = float(params["depth"])
        if z <= 0 or y <= 0:
            raise ValueError("Talud y tirante deben ser positivos.")
        A, P, T = _trian(z, y)
    else:
        raise ValueError(f"Tipo de canal no reconocido: '{ch}'")

    if A <= 0 or P <= 0:
        raise ValueError("La sección calculada tiene área o perímetro nulos.")

    # Hydraulic radius
    R = A / P

    # Manning's Q
    Q = (1.0 / n) * A * (R ** (2.0 / 3.0)) * math.sqrt(S)

    # Velocity
    V = Q / A

    # Hydraulic depth (for Froude)
    if T > 0:
        D_h = A / T
        Fr = V / math.sqrt(_G * D_h)
    else:
        # Full circular pipe — no free surface
        Fr = None

    # Flow regime
    if Fr is None:
        regime = "a_presion"
        regime_label = "Flujo a presión (tubo lleno)"
    elif Fr < 0.95:
        regime = "subcritical"
        regime_label = "Subcrítico (lento / fluvial)"
    elif Fr <= 1.05:
        regime = "critical"
        regime_label = "Crítico"
    else:
        regime = "supercritical"
        regime_label = "Supercrítico (rápido / torrencial)"

    # Velocity warnings
    warnings: list[str] = []
    if lining and lining in VELOCITY_LIMITS:
        vl = VELOCITY_LIMITS[lining]
        if V > vl["v_max"]:
            warnings.append(
                f"Velocidad {V:.2f} m/s supera el máximo para {vl['label']} "
                f"({vl['v_max']} m/s) — riesgo de EROSIÓN."
            )
        elif V < vl["v_min"]:
            warnings.append(
                f"Velocidad {V:.2f} m/s está por debajo del mínimo para {vl['label']} "
                f"({vl['v_min']} m/s) — riesgo de SEDIMENTACIÓN."
            )
    else:
        # General warning thresholds
        if V > 3.0:
            warnings.append(
                f"Velocidad {V:.2f} m/s elevada — verificar resistencia al desgaste del revestimiento."
            )
        if V < 0.30:
            warnings.append(
                f"Velocidad {V:.2f} m/s muy baja — riesgo de sedimentación y proliferación de vegetación."
            )

    # Design check
    design_check: dict | None = None
    if design_Q is not None:
        design_Q_f = float(design_Q)
        sufficient = Q >= design_Q_f
        margin_pct = ((Q - design_Q_f) / design_Q_f * 100) if design_Q_f > 0 else 0.0
        design_check = {
            "design_flow_m3s": design_Q_f,
            "channel_capacity_m3s": round(Q, 4),
            "sufficient": sufficient,
            "margin_pct": round(margin_pct, 1),
            "message": (
                f"Capacidad suficiente — excedente del {margin_pct:.1f}%."
                if sufficient
                else f"INSUFICIENTE — déficit del {abs(margin_pct):.1f}%. Aumentar sección o pendiente."
            ),
        }

    result: dict[str, Any] = {
        "flow_m3s": round(Q, 4),
        "velocity_ms": round(V, 3),
        "area_m2": round(A, 4),
        "wetted_perimeter_m": round(P, 4),
        "hydraulic_radius_m": round(R, 4),
        "top_width_m": round(T, 4) if T is not None else None,
        "froude": round(Fr, 3) if Fr is not None else None,
        "flow_regime": regime,
        "flow_regime_label": regime_label,
        "warnings": warnings,
        "design_check": design_check,
    }

    # Geometry echo for diagram
    result["geometry"] = {k: v for k, v in params.items()
                          if k not in {"manning_n", "slope", "design_flow", "lining_type"}}
    return result
