"""
Culvert (alcantarilla) sizing calculator.

Implements inlet control (FHWA HDS-5 Appendix A equations in SI) and outlet control
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
# Source: FHWA HDS-5, Table C.2. Values below are the box/headwall
# baseline; projecting circular pipes depend on material.

INLET_KE: dict[str, float] = {
    "proyectante": 0.9,       # projecting from fill, no wingwalls
    "sin_alas": 0.5,          # headwall only, no wingwalls
    "con_alas_30_75": 0.4,    # headwall with 30–75° wingwalls
    "con_alas_90": 0.5,       # square edge
    "biselado": 0.2,          # beveled edges
    "redondeado": 0.2,        # radius D/12 (or B/12 for box)
}

INLET_LABELS: dict[str, str] = {
    "proyectante": "Proyectante (sin alas ni alero)",
    "sin_alas": "Con alero, sin alas",
    "con_alas_30_75": "Con alas 30–75°",
    "con_alas_90": "Con alas 90° (arista recta)",
    "biselado": "Biselado",
    "redondeado": "Redondeado",
}

# FHWA HDS-5 Appendix A inlet equations use geometry-specific coefficients.
# Ke is used only for the separate outlet-control entrance energy loss.
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
_CIRC_IC_SUBMERGED   = {"c": 0.0398, "Y": 0.67}

# FHWA Chart 10 (box culvert, square-edge headwall)
_BOX_IC_UNSUBMERGED  = {"K": 0.061, "M": 0.75, "c": 0.0400, "Y": 0.80}
_BOX_IC_SUBMERGED    = {"c": 0.0400, "Y": 0.80}


def _inlet_coefficients(culvert_type: str, inlet_type: str, material: str) -> dict:
    """HDS-5 Table A.1 rows; geometry assumptions are reported to users."""
    if culvert_type == "circular":
        if inlet_type == "biselado":
            return dict(K=0.0018, M=2.5, c=0.0300, Y=0.74, form=1,
                        description="Circular, anillo biselado a 45° (tabla A.1, gráfico 3A)")
        if material == "chapa_corrugada":
            if inlet_type == "proyectante":
                return dict(K=0.0340, M=1.50, c=0.0553, Y=0.54, form=1,
                            description="Circular de metal corrugado, proyectante (gráfico 2, escala 3)")
            return dict(K=0.0078, M=2.0, c=0.0379, Y=0.69, form=1,
                        description="Circular de metal corrugado con alero (gráfico 2, escala 1)")
        if inlet_type == "proyectante":
            return dict(K=0.0045, M=2.0, c=0.0317, Y=0.69, form=1,
                        description="Circular de hormigón proyectante con extremo de ranura (gráfico 1, escala 3)")
        return dict(**_CIRC_IC_UNSUBMERGED, form=1,
                    description="Circular de hormigón, arista recta con alero (gráfico 1, escala 1)")
    if inlet_type == "con_alas_30_75":
        return dict(K=0.026, M=1.0, c=0.0347, Y=0.81, form=1,
                    description="Cajón de hormigón, alas de 30° a 75° (gráfico 8, escala 1)")
    if inlet_type == "biselado":
        return dict(K=0.495, M=0.667, c=0.0314, Y=0.82, form=2,
                    description="Cajón de hormigón, alero a 90° con biseles a 45° (gráfico 10, escala 2)")
    return dict(**_BOX_IC_UNSUBMERGED, form=1,
                description="Cajón de hormigón, arista recta y alero/alas a 90° (gráfico 8, escala 2)")


def _entrance_loss(culvert_type: str, inlet_type: str, material: str = "hormigon") -> float:
    """Ke is used only for outlet control, never as an inlet-control correction."""
    if inlet_type == "proyectante" and culvert_type == "circular":
        return 0.9 if material == "chapa_corrugada" else 0.2  # assumed groove end
    if culvert_type == "circular" and inlet_type in {"sin_alas", "con_alas_90", "con_alas_30_75"}:
        return 0.5
    return INLET_KE[inlet_type]


def _inlet_control_hw(
    Q: float,
    culvert_type: str,
    dim: float | tuple[float, float],
    slope: float,
    inlet_type: str,
    material: str = "hormigon",
) -> float:
    """
    Return headwater depth HW (m) under inlet control.

    dim: diameter (m) for circular, (width, height) for box
    """
    if Q <= 0:
        return 0.0
    if culvert_type == "circular":
        D = float(dim)
        A = math.pi * D ** 2 / 4
    else:
        W, D = dim
        A = W * D
    ic = _inlet_coefficients(culvert_type, inlet_type, material)
    qstar = 1.811 * Q / (A * math.sqrt(D))  # HDS-5 Ku for SI, not dimensionless

    def unsubmerged(q_factor: float) -> float:
        q = q_factor * A * math.sqrt(D) / 1.811
        if ic["form"] == 2:
            return ic["K"] * q_factor ** ic["M"]
        if culvert_type == "circular":
            yc = _critical_depth_circular(D, q, tol=1e-9)
            ac = _circular_area(D, yc)
        else:
            yc = _critical_depth_box(W, D, q)
            ac = W * yc
        hc = yc + (q / ac) ** 2 / (2 * _G)
        return hc / D + ic["K"] * q_factor ** ic["M"] - 0.5 * slope

    def submerged(q_factor: float) -> float:
        return ic["c"] * q_factor ** 2 + ic["Y"] - 0.5 * slope

    if qstar <= 3.5:
        hwd = unsubmerged(qstar)
    elif qstar >= 4.0:
        hwd = submerged(qstar)
    else:
        # Appendix A separates the two equations by a hand-smoothed zone.
        # Linear interpolation is an explicit approximation, not a HY-8 polynomial.
        f = (qstar - 3.5) / 0.5
        hwd = (1 - f) * unsubmerged(3.5) + f * submerged(4.0)
    return max(hwd * D, 0.0)


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

    if D <= 0 or not math.isfinite(D) or not math.isfinite(Q):
        raise ValueError("Diámetro y caudal deben ser finitos; diámetro > 0.")
    # The residual is positive near y=0 and negative at y=D. Negative at
    # the crown is the upper bracket, not a reason to return full depth.
    lo, hi = 0.0, D
    for _ in range(100):
        mid = (lo + hi) / 2
        if _fn(mid) > 0:
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
    material: str = "hormigon",
) -> tuple[float, float]:
    """
    Return (HW, outlet_velocity) under outlet control.
    tailwater: depth of water at culvert outlet (m). 0 = free outfall.
    """
    Ke = _entrance_loss(culvert_type, inlet_type, material)
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
        R = (W * H) / (2 * W + 2 * H)  # closed conduit: include the roof
        V = Q / A
        yc = _critical_depth_box(W, H, Q)
        D = H  # reference height

    # Friction loss factor
    Kf = (2 * _G * manning_n ** 2 * length) / R ** (4.0 / 3.0)

    # Total head loss through culvert
    H_loss = (1 + Ke + Kf) * V ** 2 / (2 * _G)

    # Tailwater elevation at outlet
    # HDS-5 §3.1.3: approximate HGL depth halfway from critical depth to crown.
    ho = max((yc + D) / 2, tailwater)

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
    material: str = "hormigon",
) -> dict[str, Any]:
    A_full = math.pi * D ** 2 / 4
    V_full = Q / A_full

    hw_ic = _inlet_control_hw(Q, "circular", D, slope, inlet_type, material)
    hw_oc, v_out = _outlet_control_hw(
        Q, "circular", D, slope, length, manning_n, tailwater, inlet_type, material
    )

    hw = max(hw_ic, hw_oc)
    control = "inlet" if hw_ic >= hw_oc else "outlet"
    control_label = "Control de entrada" if control == "inlet" else "Control de salida"

    hwd_ratio = hw / D
    insufficient = hwd_ratio > 4.0
    # HW/D > 3 is outside this app's conservative screening range; require review.
    hwd_out_of_range = hwd_ratio > 3.0
    ok = hw <= hw_max and not insufficient

    return {
        "type": "circular",
        "diameter_m": D,
        "label": f"Ø {D:.2f} m",
        "culvert_insufficient": insufficient,
        "hwd_out_of_range": hwd_out_of_range,
        "hw_m": round(hw, 3),
        "hw_ic_m": round(hw_ic, 3),
        "hw_oc_m": round(hw_oc, 3),
        "hwd_ratio": round(hwd_ratio, 3),
        "outlet_velocity_ms": round(v_out, 3),
        "control": control,
        "control_label": control_label,
        "ok": ok,
        "area_m2": round(A_full, 4),
        "outlet_approximation_applicable": hw_oc >= 0.75 * D,
        "inlet_transition_approximation": 3.5 < 1.811 * Q / (A_full * math.sqrt(D)) < 4.0,
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
    material: str = "hormigon",
) -> dict[str, Any]:
    A_full = W * H
    V_full = Q / A_full

    hw_ic = _inlet_control_hw(Q, "box", (W, H), slope, inlet_type, material)
    hw_oc, v_out = _outlet_control_hw(
        Q, "box", (W, H), slope, length, manning_n, tailwater, inlet_type, material
    )

    hw = max(hw_ic, hw_oc)
    control = "inlet" if hw_ic >= hw_oc else "outlet"
    control_label = "Control de entrada" if control == "inlet" else "Control de salida"

    D_ref = H
    hwd_ratio = hw / D_ref
    insufficient = hwd_ratio > 4.0
    hwd_out_of_range = hwd_ratio > 3.0
    ok = hw <= hw_max and not insufficient

    return {
        "type": "box",
        "culvert_insufficient": insufficient,
        "hwd_out_of_range": hwd_out_of_range,
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
        "outlet_approximation_applicable": hw_oc >= 0.75 * H,
        "inlet_transition_approximation": 3.5 < 1.811 * Q / (A_full * math.sqrt(H)) < 4.0,
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

    if not all(math.isfinite(v) for v in (Q, length, slope, hw_max, tailwater)):
        raise ValueError("Los parámetros hidráulicos deben ser finitos.")
    if material not in MANNING_N or inlet_type not in INLET_KE:
        raise ValueError("Material o tipo de entrada no reconocido.")
    if inlet_type == "redondeado" or (ctype == "box" and inlet_type == "proyectante"):
        raise ValueError("Esta entrada requiere geometría adicional y no tiene coeficientes implementados. Use una entrada documentada por FHWA o un modelo hidráulico detallado.")
    if tailwater < 0:
        raise ValueError("El tirante aguas abajo no puede ser negativo.")
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
            res = _check_circular(D, Q, slope, length, n, tailwater, inlet_type, hw_max, material)
            results.append(res)
    elif ctype == "box":
        for W, H in BOX_SIZES_M:
            res = _check_box(W, H, Q, slope, length, n, tailwater, inlet_type, hw_max, material)
            results.append(res)
    else:
        raise ValueError(f"Tipo de alcantarilla no reconocido: '{ctype}'")

    # Find smallest passing size
    passing = [r for r in results if r["ok"]]
    recommended = passing[0] if passing else results[-1]  # largest if none pass

    if not passing:
        warnings.append(
            "Ninguno de los tamaños comerciales disponibles cumple con el tirante máximo admisible. "
            "Evaluar secciones mayores o múltiples conductos y revisar las condiciones del sitio."
        )

    assumptions = [_inlet_coefficients(ctype, inlet_type, material)["description"],
                   "Velocidades de aproximación y aguas abajo despreciadas; conducto sin obstrucción."]
    if material == "pead":
        warnings.append("PEAD: se usan coeficientes de entrada de conducto liso por analogía con hormigón. Validar la entrada con información del fabricante.")
    if ctype == "box" and material != "hormigon":
        warnings.append("Los coeficientes de entrada del cajón corresponden a hormigón; la analogía con otro material requiere validación.")
    if inlet_type in {"proyectante", "biselado"}:
        warnings.append("Verificar la geometría de entrada asumida: " + assumptions[0] + ".")
    if recommended["inlet_transition_approximation"]:
        warnings.append("Control de entrada en zona de transición: interpolación lineal aproximada; verificar con HY-8.")
    if not recommended["outlet_approximation_applicable"]:
        warnings.append("HW de salida < 0.75D: la aproximación de conducto lleno no es suficiente. Se requiere calcular el perfil de flujo parcialmente lleno (HDS-5 §3.1.3).")

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
    if recommended.get("culvert_insufficient"):
        warnings.append(
            f"Alcantarilla insuficiente — HW/D = {recommended['hwd_ratio']:.2f} "
            "excede el límite de predimensionamiento adoptado por esta aplicación (4.0); "
            "se requiere una alcantarilla más grande, múltiples conductos o un puente."
        )
    elif recommended["hwd_ratio"] > 2.5:
        warnings.append(
            f"HW/D = {recommended['hwd_ratio']:.2f} — cercano al límite recomendado. "
            "Verificar diseño y considerar una sección mayor."
        )
    elif recommended["hwd_ratio"] > 1.5:
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
        "tailwater_m": tailwater,
        "source": "FHWA HDS-5 (2012), apéndice A, tabla A.1; §3.1.3; tabla C.2",
        "assumptions": assumptions,
        "validation_status": "preliminary",
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
            {"id": k, "label": v, "ke": INLET_KE[k], "supported_types": ["circular"] if k == "proyectante" else ["circular", "box"]}
            for k, v in INLET_LABELS.items() if k != "redondeado"
        ],
    }
