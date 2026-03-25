"""
Culvert (alcantarilla) sizing calculator.

Implements inlet control (FHWA nomographs approximated) and outlet control
(energy equation) for circular pipes and rectangular box culverts.

References:
  - FHWA HDS-5: Hydraulic Design of Highway Culverts, 3rd ed.
  - Sotelo Avila, G.: Hidráulica General (Mexican/Argentine practice)
  - IRAM / CIRSOC standard Argentine commercial sizes
"""

from __future__ import annotations

import math
from typing import Any

# ── Standard Argentine commercial sizes ──────────────────────────────────────

CIRCULAR_DIAMETERS_M: list[float] = [0.40, 0.50, 0.60, 0.80, 1.00, 1.20, 1.50, 1.80, 2.00]

BOX_SIZES_M: list[tuple[float, float]] = [
    (1.0, 1.0),
    (1.5, 1.0),
    (1.5, 1.5),
    (2.0, 1.5),
    (2.0, 2.0),
    (2.5, 2.0),
    (3.0, 2.0),
]

# ── Manning's n for culvert materials ─────────────────────────────────────────

MANNING_N: dict[str, float] = {
    "hormigon": 0.013,
    "pead": 0.011,
    "chapa_corrugada": 0.024,
}

MATERIAL_LABELS: dict[str, str] = {
    "hormigon": "Hormigón",
    "pead": "PEAD (polietileno)",
    "chapa_corrugada": "Chapa corrugada",
}

# ── Inlet loss coefficients (Ke) by inlet type ────────────────────────────────
# Source: FHWA HDS-5, Table B-1 (approximate)

INLET_KE: dict[str, float] = {
    "proyectante": 0.9,       # projecting from fill, no wingwalls
    "sin_alas": 0.5,          # headwall only, no wingwalls
    "con_alas_30_75": 0.4,    # headwall with 30–75° wingwalls
    "con_alas_90": 0.2,       # headwall with 90° wingwalls (square edge)
    "biselado": 0.2,          # beveled edges
    "redondeado": 0.1,        # well-rounded edge
}

INLET_LABELS: dict[str, str] = {
    "proyectante": "Proyectante (sin alas ni alero)",
    "sin_alas": "Con alero, sin alas",
    "con_alas_30_75": "Con alas 30–75°",
    "con_alas_90": "Con alas 90° (arista recta)",
    "biselado": "Biselado",
    "redondeado": "Redondeado",
}

# Inlet control coefficients for FHWA nomograph approximation
# For circular concrete culverts (HDS-5 Chart 1B / Eq. 3-1)
# Q = A * (D/2)^0.5 * g^0.5 form solved via HW/D vs Q/AD^0.5
# We use the polynomial form HW/D = c1*(Q/(A*D^0.5))^c2 + c3
# Values below are for "square-edge / headwall" as baseline; Ke adjusts later.
_G = 9.81  # m/s²


# ─────────────────────────────────────────────────────────────────────────────
# Helper: area of circular cross-section given depth y
# ─────────────────────────────────────────────────────────────────────────────

def _circular_area(D: float, y: float) -> float:
    if y <= 0:
        return 0.0
    if y >= D:
        return math.pi * D ** 2 / 4
    theta = 2 * math.acos(max(-1.0, min(1.0, 1 - 2 * y / D)))
    return (D ** 2 / 8) * (theta - math.sin(theta))


# ─────────────────────────────────────────────────────────────────────────────
# Inlet control — FHWA unsubmerged/submerged approximation
#
# Two flow zones (FHWA HDS-5 equation 3-1):
#   Unsubmerged (HW/D < 1.2):  HW/D = K*(Q/(A*D^0.5))^M + c - 0.5*S
#   Submerged   (HW/D >= 1.2): HW/D = c*(Q/(A*D^0.5))^2 + Y - 0.5*S
#
# For box culverts slightly different formulation is used but same principle.
# We use a simplified implementation with the standard coefficients.
# ─────────────────────────────────────────────────────────────────────────────

# FHWA Chart 1 (circular concrete, square-edge headwall)
_CIRC_IC_UNSUBMERGED = {"K": 0.0098, "M": 2.0, "c": 0.0398, "Y": 0.67}
_CIRC_IC_SUBMERGED   = {"c": 0.0292, "Y": 0.74}

# FHWA Chart 10 (box culvert, square-edge headwall)
_BOX_IC_UNSUBMERGED  = {"K": 0.0018, "M": 2.5, "c": 0.0243, "Y": 0.83}
_BOX_IC_SUBMERGED    = {"c": 0.0243, "Y": 0.83}


def _inlet_control_hw(
    Q: float,
    culvert_type: str,
    dim: float | tuple[float, float],
    slope: float,
    inlet_type: str,
) -> float:
    """
    Return headwater depth HW (m) under inlet control.

    dim: diameter (m) for circular, (width, height) for box
    """
    Ke = INLET_KE.get(inlet_type, 0.5)
    S = slope

    if culvert_type == "circular":
        D = float(dim)
        A = math.pi * D ** 2 / 4  # full area — inlet control uses full area
        # Dimensionless flow parameter
        Qstar = Q / (A * D ** 0.5)
        ic = _CIRC_IC_UNSUBMERGED
        # Try unsubmerged first
        HWD = ic["K"] * (Qstar ** ic["M"]) + ic["c"] - 0.5 * S
        if HWD < 1.2:
            # Unsubmerged governs
            pass
        else:
            ic2 = _CIRC_IC_SUBMERGED
            HWD = ic2["c"] * Qstar ** 2 + ic2["Y"] - 0.5 * S
        # Adjust for Ke (approximate: add 0.5*Ke*(V^2/2g)/D)
        V_full = Q / A
        HWD += 0.5 * Ke * (V_full ** 2 / (2 * _G * D))
        return max(HWD * D, 0.0)

    else:  # box
        W, H = dim
        A = W * H
        D_eq = H  # reference dimension for box = height
        Qstar = Q / (A * D_eq ** 0.5)
        ic = _BOX_IC_UNSUBMERGED
        HWD = ic["K"] * (Qstar ** ic["M"]) + ic["c"] - 0.5 * S
        if HWD >= 1.2:
            ic2 = _BOX_IC_SUBMERGED
            HWD = ic2["c"] * Qstar ** 2 + ic2["Y"] - 0.5 * S
        V_full = Q / A
        HWD += 0.5 * Ke * (V_full ** 2 / (2 * _G * D_eq))
        return max(HWD * D_eq, 0.0)


# ─────────────────────────────────────────────────────────────────────────────
# Outlet control — full flow energy equation (FHWA HDS-5 Eq. 3-4)
#
# HW = H + ho - S*L
# H = (1 + Ke + Kf) * V²/(2g)
# Kf = 2*g*n²*L / R^(4/3)   (friction loss coefficient)
# ho = max(critical depth + D/2, tailwater)
# ─────────────────────────────────────────────────────────────────────────────

def _critical_depth_circular(D: float, Q: float, tol: float = 1e-5) -> float:
    """Bisection to find critical depth in circular pipe."""
    if Q <= 0:
        return 0.0
    # Critical: Fr = 1 → Q² * T = g * A³
    def _fn(y: float) -> float:
        A = _circular_area(D, y)
        if A <= 0:
            return -1.0
        theta = 2 * math.acos(max(-1.0, min(1.0, 1 - 2 * y / D)))
        T = D * math.sin(theta / 2)
        if T <= 0:
            return 1.0
        return Q ** 2 * T - _G * A ** 3

    lo, hi = 1e-6, D
    if _fn(hi) < 0:
        return D  # full flow
    for _ in range(60):
        mid = (lo + hi) / 2
        if _fn(mid) < 0:
            lo = mid
        else:
            hi = mid
        if hi - lo < tol:
            break
    return (lo + hi) / 2


def _critical_depth_box(W: float, H: float, Q: float) -> float:
    """Critical depth for rectangular section yc = (Q²/(g*W²))^(1/3)."""
    yc = (Q ** 2 / (_G * W ** 2)) ** (1.0 / 3.0)
    return min(yc, H)


def _outlet_control_hw(
    Q: float,
    culvert_type: str,
    dim: float | tuple[float, float],
    slope: float,
    length: float,
    manning_n: float,
    tailwater: float,
    inlet_type: str,
) -> tuple[float, float]:
    """
    Return (HW, outlet_velocity) under outlet control.
    tailwater: depth of water at culvert outlet (m). 0 = free outfall.
    """
    Ke = INLET_KE.get(inlet_type, 0.5)
    S = slope

    if culvert_type == "circular":
        D = float(dim)
        A = math.pi * D ** 2 / 4
        P = math.pi * D
        R = A / P
        V = Q / A
        yc = _critical_depth_circular(D, Q)
    else:
        W, H = dim
        A = W * H
        R = (W * H) / (W + 2 * H)
        V = Q / A
        yc = _critical_depth_box(W, H, Q)
        D = H  # reference height

    # Friction loss factor
    Kf = (2 * _G * manning_n ** 2 * length) / R ** (4.0 / 3.0)

    # Total head loss through culvert
    H_loss = (1 + Ke + Kf) * V ** 2 / (2 * _G)

    # Tailwater elevation at outlet
    # If free outfall, use (yc + D/2)/2 as effective ho per HDS-5
    ho = max((yc + D / 2) / 2, tailwater)

    HW = H_loss + ho - S * length
    HW = max(HW, 0.0)

    return HW, V


# ─────────────────────────────────────────────────────────────────────────────
# Size a single culvert and return all hydraulic results
# ─────────────────────────────────────────────────────────────────────────────

def _check_circular(
    D: float,
    Q: float,
    slope: float,
    length: float,
    manning_n: float,
    tailwater: float,
    inlet_type: str,
    hw_max: float,
) -> dict[str, Any]:
    A_full = math.pi * D ** 2 / 4
    V_full = Q / A_full

    hw_ic = _inlet_control_hw(Q, "circular", D, slope, inlet_type)
    hw_oc, v_out = _outlet_control_hw(
        Q, "circular", D, slope, length, manning_n, tailwater, inlet_type
    )

    hw = max(hw_ic, hw_oc)
    control = "inlet" if hw_ic >= hw_oc else "outlet"
    control_label = "Control de entrada" if control == "inlet" else "Control de salida"

    hwd_ratio = hw / D
    ok = hw <= hw_max

    return {
        "type": "circular",
        "diameter_m": D,
        "label": f"Ø {D:.2f} m",
        "hw_m": round(hw, 3),
        "hw_ic_m": round(hw_ic, 3),
        "hw_oc_m": round(hw_oc, 3),
        "hwd_ratio": round(hwd_ratio, 3),
        "outlet_velocity_ms": round(v_out, 3),
        "control": control,
        "control_label": control_label,
        "ok": ok,
        "area_m2": round(A_full, 4),
    }


def _check_box(
    W: float,
    H: float,
    Q: float,
    slope: float,
    length: float,
    manning_n: float,
    tailwater: float,
    inlet_type: str,
    hw_max: float,
) -> dict[str, Any]:
    A_full = W * H
    V_full = Q / A_full

    hw_ic = _inlet_control_hw(Q, "box", (W, H), slope, inlet_type)
    hw_oc, v_out = _outlet_control_hw(
        Q, "box", (W, H), slope, length, manning_n, tailwater, inlet_type
    )

    hw = max(hw_ic, hw_oc)
    control = "inlet" if hw_ic >= hw_oc else "outlet"
    control_label = "Control de entrada" if control == "inlet" else "Control de salida"

    D_ref = H
    hwd_ratio = hw / D_ref
    ok = hw <= hw_max

    return {
        "type": "box",
        "width_m": W,
        "height_m": H,
        "label": f"{W:.1f}×{H:.1f} m",
        "hw_m": round(hw, 3),
        "hw_ic_m": round(hw_ic, 3),
        "hw_oc_m": round(hw_oc, 3),
        "hwd_ratio": round(hwd_ratio, 3),
        "outlet_velocity_ms": round(v_out, 3),
        "control": control,
        "control_label": control_label,
        "ok": ok,
        "area_m2": round(A_full, 4),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def calculate_culvert(params: dict[str, Any]) -> dict[str, Any]:
    """
    Size a culvert for the given design parameters.

    Parameters
    ----------
    params:
        design_flow_m3s     : float  — caudal de diseño (m³/s)
        culvert_type        : str    — "circular" | "box"
        material            : str    — "hormigon" | "pead" | "chapa_corrugada"
        length_m            : float  — longitud del conducto (m)
        slope               : float  — pendiente m/m (e.g. 0.01)
        inlet_type          : str    — key in INLET_KE
        headwater_max_m     : float  — tirante aguas arriba máximo admisible (m)
        tailwater_m         : float  — nivel aguas abajo (m); 0 = libre

    Returns a dict with:
        recommended         : dict  — smallest passing commercial size
        alternatives        : list  — all checked sizes with results
        warnings            : list[str]
    """
    Q = float(params["design_flow_m3s"])
    ctype = params["culvert_type"]
    material = params.get("material", "hormigon")
    length = float(params["length_m"])
    slope = float(params["slope"])
    inlet_type = params.get("inlet_type", "sin_alas")
    hw_max = float(params["headwater_max_m"])
    tailwater = float(params.get("tailwater_m", 0.0))

    if Q <= 0:
        raise ValueError("El caudal de diseño debe ser mayor que cero.")
    if length <= 0:
        raise ValueError("La longitud de la alcantarilla debe ser positiva.")
    if slope <= 0:
        raise ValueError("La pendiente debe ser positiva.")
    if hw_max <= 0:
        raise ValueError("El tirante máximo admisible debe ser positivo.")

    n = MANNING_N.get(material, 0.013)
    warnings: list[str] = []

    results: list[dict[str, Any]] = []

    if ctype == "circular":
        for D in CIRCULAR_DIAMETERS_M:
            res = _check_circular(D, Q, slope, length, n, tailwater, inlet_type, hw_max)
            results.append(res)
    elif ctype == "box":
        for W, H in BOX_SIZES_M:
            res = _check_box(W, H, Q, slope, length, n, tailwater, inlet_type, hw_max)
            results.append(res)
    else:
        raise ValueError(f"Tipo de alcantarilla no reconocido: '{ctype}'")

    # Find smallest passing size
    passing = [r for r in results if r["ok"]]
    recommended = passing[0] if passing else results[-1]  # largest if none pass

    if not passing:
        warnings.append(
            "Ninguno de los tamaños comerciales disponibles cumple con el tirante máximo admisible. "
            "Considere reducir el tirante máximo, aumentar la pendiente, o usar múltiples conductos."
        )

    # Additional warnings
    if recommended["outlet_velocity_ms"] > 4.5:
        warnings.append(
            f"Velocidad de salida {recommended['outlet_velocity_ms']:.2f} m/s muy elevada — "
            "instalar disipador de energía o protección contra erosión."
        )
    if recommended["outlet_velocity_ms"] < 0.5:
        warnings.append(
            f"Velocidad de salida {recommended['outlet_velocity_ms']:.2f} m/s baja — "
            "verificar riesgo de sedimentación y obstrucción."
        )
    if recommended["hwd_ratio"] > 1.5:
        warnings.append(
            f"Relación HW/D = {recommended['hwd_ratio']:.2f} — tirante aguas arriba "
            "excede 1.5× el diámetro/altura. Revisar diseño."
        )
    if slope > 0.05:
        warnings.append(
            "Pendiente > 5%: verificar estabilidad de taludes y posible control de entrada dominante."
        )

    return {
        "design_flow_m3s": Q,
        "culvert_type": ctype,
        "material": material,
        "material_label": MATERIAL_LABELS.get(material, material),
        "manning_n": n,
        "length_m": length,
        "slope": slope,
        "inlet_type": inlet_type,
        "inlet_label": INLET_LABELS.get(inlet_type, inlet_type),
        "headwater_max_m": hw_max,
        "recommended": recommended,
        "alternatives": results,
        "warnings": warnings,
    }


def get_reference_data() -> dict[str, Any]:
    return {
        "circular_diameters_m": CIRCULAR_DIAMETERS_M,
        "box_sizes_m": [{"width": w, "height": h} for w, h in BOX_SIZES_M],
        "materials": [
            {"id": k, "label": v, "manning_n": MANNING_N[k]}
            for k, v in MATERIAL_LABELS.items()
        ],
        "inlet_types": [
            {"id": k, "label": v, "ke": INLET_KE[k]}
            for k, v in INLET_LABELS.items()
        ],
    }
