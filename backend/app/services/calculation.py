"""
Hydrological calculation engine for AutoHydro Argentina.

Implements:
  - Método Racional (Rational Method)
  - Método Racional Modificado (Modified Rational Method — Témez areal reduction)
  - Método SCS-CN (with Argentine Pampa Húmeda λ variant)
  - Risk classification with Argentine infrastructure thresholds
"""

import math
from typing import Optional

from app.data.idf_argentina import calculate_idf_intensity, IDF_ARGENTINA
from app.data.cn_argentina import calculate_composite_cn
from app.services.tc_service import calculate_all_tc
from app.models.schemas import (
    CalculationRequest,
    CalculationResponse,
    CNSensitivityPoint,
    MethodResult,
    RiskRecommendations,
    TcFormulaResult,
)


# ── Risk classification ───────────────────────────────────────────────────────

# Thresholds in m³/s per infrastructure type
_RISK_THRESHOLDS: dict[str, dict[str, float]] = {
    "alcantarilla_menor": {
        "muy_bajo": 0.5, "bajo": 1.5, "moderado": 3.0, "alto": 5.0
    },
    "alcantarilla_mayor": {
        "muy_bajo": 2.0, "bajo": 5.0, "moderado": 10.0, "alto": 20.0
    },
    "puente_menor": {
        "muy_bajo": 5.0, "bajo": 15.0, "moderado": 30.0, "alto": 50.0
    },
    "puente_mayor": {
        "muy_bajo": 20.0, "bajo": 50.0, "moderado": 100.0, "alto": 200.0
    },
    "canal_urbano": {
        "muy_bajo": 1.0, "bajo": 3.0, "moderado": 8.0, "alto": 15.0
    },
    "canal_rural": {
        "muy_bajo": 3.0, "bajo": 10.0, "moderado": 25.0, "alto": 50.0
    },
    "defensa_costera": {
        "muy_bajo": 10.0, "bajo": 30.0, "moderado": 80.0, "alto": 150.0
    },
}

_RISK_RECOMMENDATIONS: dict[str, dict[str, str]] = {
    "muy_bajo": {
        "general": "Condiciones favorables para la infraestructura propuesta.",
        "action": "Proceder con diseño estándar.",
        "verification": "Verificación básica de capacidad hidráulica.",
    },
    "bajo": {
        "general": "Caudal manejable con diseño convencional.",
        "action": "Dimensionar según normativa estándar.",
        "verification": "Verificar velocidades máximas y erosión.",
    },
    "moderado": {
        "general": "Requiere atención en el diseño hidráulico.",
        "action": "Considerar obras de protección adicionales.",
        "verification": "Análisis de socavación y estabilidad de márgenes.",
    },
    "alto": {
        "general": "Condiciones exigentes que requieren diseño detallado.",
        "action": "Estudio hidráulico completo recomendado (HEC-RAS o similar).",
        "verification": "Modelación hidráulica, análisis de alternativas.",
    },
    "muy_alto": {
        "general": "Condiciones críticas. Riesgo significativo.",
        "action": "Estudio integral obligatorio. Considerar alternativas de emplazamiento.",
        "verification": "Modelación 2D, análisis de riesgo, plan de contingencia.",
    },
}


def classify_risk(
    Q: float,
    infrastructure: str,
    return_period: int,
) -> tuple[str, RiskRecommendations]:
    """
    Classify flood risk given peak discharge and infrastructure type.

    Returns:
        (risk_level string, RiskRecommendations)
    """
    thresholds = _RISK_THRESHOLDS.get(infrastructure, _RISK_THRESHOLDS["canal_rural"])

    if Q < thresholds["muy_bajo"]:
        level = "muy_bajo"
    elif Q < thresholds["bajo"]:
        level = "bajo"
    elif Q < thresholds["moderado"]:
        level = "moderado"
    elif Q < thresholds["alto"]:
        level = "alto"
    else:
        level = "muy_alto"

    base = _RISK_RECOMMENDATIONS[level].copy()

    period_note: Optional[str] = None
    if return_period < 10:
        period_note = (
            f"Período de retorno de {return_period} años es bajo para obras permanentes. "
            f"Considerar T ≥ 25 años."
        )
    elif return_period >= 100:
        period_note = (
            f"Período de retorno de {return_period} años apropiado para infraestructura crítica."
        )

    recs = RiskRecommendations(
        general=base["general"],
        action=base["action"],
        verification=base["verification"],
        period_note=period_note,
    )
    return level, recs


# ── Rational Method ───────────────────────────────────────────────────────────

def rational_method(
    C: float,
    i_mm_hr: float,
    A_km2: float,
) -> float:
    """
    Q = C × i × A / 3.6  [m³/s]

    Args:
        C: Runoff coefficient (0–1)
        i_mm_hr: Rainfall intensity (mm/hr)
        A_km2: Basin area (km²)

    Returns:
        Peak discharge Q (m³/s)
    """
    return C * i_mm_hr * A_km2 / 3.6


# ── Modified Rational Method ──────────────────────────────────────────────────

def _areal_reduction_k(A_km2: float) -> float:
    """
    Témez areal reduction factor.

    K = 1 - (A^0.1 - 1) / 7    (A in km²)

    Clipped to [0.1, 1.0] for physical validity.
    """
    k = 1.0 - (A_km2 ** 0.1 - 1.0) / 7.0
    return max(0.1, min(1.0, k))


def modified_rational_method(
    C: float,
    i_mm_hr: float,
    A_km2: float,
) -> tuple[float, float]:
    """
    Q = C × i × A × K / 3.6  [m³/s]

    Returns:
        (Q in m³/s, K areal reduction factor)
    """
    K = _areal_reduction_k(A_km2)
    Q = C * i_mm_hr * A_km2 * K / 3.6
    return Q, K


# ── SCS-CN Method ─────────────────────────────────────────────────────────────

def scs_cn_method(
    CN: float,
    P_mm: float,
    A_km2: float,
    tc_hours: float,
    use_pampa_lambda: bool = False,
) -> dict[str, float]:
    """
    SCS-CN peak discharge using triangular unit hydrograph.

    Args:
        CN: Composite curve number
        P_mm: Precipitation depth (mm) = intensity × duration converted
        A_km2: Basin area (km²)
        tc_hours: Time of concentration (hours)
        use_pampa_lambda: If True, use λ=0.05 (Pampa Húmeda); else λ=0.20 (standard)

    Returns:
        dict with keys: Q_mm (runoff depth), S_mm, Ia_mm, Qp_m3s, Tp_hr
    """
    lam = 0.05 if use_pampa_lambda else 0.20

    # Potential max retention (mm)
    S = 25400.0 / CN - 254.0

    # Initial abstraction (mm)
    Ia = lam * S

    # Direct runoff depth (mm)
    if P_mm > Ia:
        Q_mm = (P_mm - Ia) ** 2 / (P_mm - Ia + S)
    else:
        Q_mm = 0.0

    # Time to peak (hr) — SCS triangular hydrograph
    Tp = 0.6 * tc_hours

    # Peak discharge (m³/s) — SCS formula
    # Qp = 0.208 × A (km²) × Q (mm) / Tp (hr)
    if Tp > 0 and Q_mm > 0:
        Qp = 0.208 * A_km2 * Q_mm / Tp
    else:
        Qp = 0.0

    return {
        "Q_mm": round(Q_mm, 3),
        "S_mm": round(S, 3),
        "Ia_mm": round(Ia, 3),
        "Qp_m3s": round(Qp, 4),
        "Tp_hr": round(Tp, 4),
    }


# ── SCS Unit Hydrograph ───────────────────────────────────────────────────────

# Standard SCS dimensionless curvilinear unit hydrograph
# Source: USDA-SCS, National Engineering Handbook, Section 4 (1972/1986)
# Coordinates: (t/Tp, q/Qp)
_SCS_DIM_UH: list[tuple[float, float]] = [
    (0.0, 0.000),
    (0.1, 0.015), (0.2, 0.075), (0.3, 0.160), (0.4, 0.280),
    (0.5, 0.430), (0.6, 0.600), (0.7, 0.770), (0.8, 0.890),
    (0.9, 0.970), (1.0, 1.000),
    (1.1, 0.980), (1.2, 0.920), (1.3, 0.840), (1.4, 0.750),
    (1.5, 0.660), (1.6, 0.560), (1.7, 0.460), (1.8, 0.390),
    (1.9, 0.330), (2.0, 0.280),
    (2.2, 0.207), (2.4, 0.147), (2.6, 0.107), (2.8, 0.077),
    (3.0, 0.055), (3.2, 0.040), (3.4, 0.029), (3.6, 0.021),
    (3.8, 0.015), (4.0, 0.011),
    (4.5, 0.005), (5.0, 0.000),
]


def scs_unit_hydrograph(
    Qp: float,
    Tp: float,
) -> dict:
    """
    Generate the SCS curvilinear unit hydrograph for a storm event.

    Args:
        Qp:  Peak discharge (m³/s) from scs_cn_method
        Tp:  Time to peak (hours) = 0.6 * Tc

    Returns dict with:
        times_hr:       list of time values (hours)
        flows_m3s:      list of discharge values (m³/s)
        runoff_volume:  total volume under hydrograph (m³)
        base_time_hr:   time base (hours) ≈ 5 × Tp for curvilinear
        time_to_peak_hr: Tp
    """
    times = [ratio * Tp for ratio, _ in _SCS_DIM_UH]
    flows = [ratio * Qp for _, ratio in _SCS_DIM_UH]

    # Trapezoidal integration for volume (m³)
    volume = 0.0
    for i in range(1, len(times)):
        dt = (times[i] - times[i - 1]) * 3600.0  # convert hr → s
        volume += 0.5 * (flows[i] + flows[i - 1]) * dt

    base_time = times[-1]  # last point = 5 × Tp

    return {
        "times_hr": [round(t, 4) for t in times],
        "flows_m3s": [round(q, 5) for q in flows],
        "runoff_volume_m3": round(volume, 1),
        "base_time_hr": round(base_time, 4),
        "time_to_peak_hr": round(Tp, 4),
    }


# ── CN sensitivity analysis ───────────────────────────────────────────────────

def compute_cn_sensitivity(
    cn_base: float,
    P_mm: float,
    A_km2: float,
    tc_hours: float,
    use_pampa_lambda: bool,
) -> list[CNSensitivityPoint]:
    """
    Compute peak flow for CN-5, CN, and CN+5.
    CN is clamped to [30, 98] to stay within physical bounds.

    Returns:
        List of three CNSensitivityPoint objects (low, base, high).
    """
    deltas = [(-5, "CN-5"), (0, "CN"), (5, "CN+5")]
    raw: list[dict] = []
    base_q = 0.0

    for delta, label in deltas:
        cn = round(max(30.0, min(98.0, cn_base + delta)), 1)
        scs = scs_cn_method(cn, P_mm, A_km2, tc_hours, use_pampa_lambda)
        q = round(scs["Qp_m3s"], 4)
        if label == "CN":
            base_q = q
        raw.append({"label": label, "cn": cn, "peak_flow_m3s": q})

    result: list[CNSensitivityPoint] = []
    for p in raw:
        if p["label"] == "CN":
            var_pct = 0.0
        elif base_q > 0:
            var_pct = round((p["peak_flow_m3s"] - base_q) / base_q * 100, 1)
        else:
            var_pct = 0.0
        result.append(
            CNSensitivityPoint(
                label=p["label"],
                cn=p["cn"],
                peak_flow_m3s=p["peak_flow_m3s"],
                variation_pct=var_pct,
            )
        )

    return result


# ── Precipitation depth from intensity ───────────────────────────────────────

def intensity_to_precipitation(i_mm_hr: float, duration_min: float) -> float:
    """Convert intensity (mm/hr) × duration (min) to precipitation depth (mm)."""
    return i_mm_hr * duration_min / 60.0


# ── Main calculation orchestrator ────────────────────────────────────────────

def run_calculation(payload: dict) -> dict:
    """
    Orchestrate the full hydrological calculation from a raw request dict.
    Validates via CalculationRequest, runs all requested computations,
    and returns a CalculationResponse-compatible dict.
    """
    req = CalculationRequest.model_validate(payload)

    # ── 1. Find IDF city ──────────────────────────────────────────────────
    city_data = next((c for c in IDF_ARGENTINA if c["city"] == req.city), None)
    if city_data is None:
        raise ValueError(f"Ciudad '{req.city}' no encontrada en la base de datos IDF")

    # Clamp duration within valid range for this city
    vr = city_data["validRange"]
    t_clamped = max(vr["tMin"], min(vr["tMax"], req.duration_min))
    T_clamped = max(vr["TMin"], min(vr["TMax"], req.return_period))

    # ── 2. IDF intensity ─────────────────────────────────────────────────
    intensity = calculate_idf_intensity(req.city, T=float(T_clamped), t=float(t_clamped))

    # ── 3. Tc calculation ─────────────────────────────────────────────────
    L_m = req.length_km * 1000.0
    tc_raw = calculate_all_tc(
        L_m=L_m,
        L_km=req.length_km,
        S=req.slope,
        A_km2=req.area_km2,
        H_m=req.elevation_diff_m,
        Hm_m=req.avg_elevation_m,
        formulas=req.tc_formulas,
    )

    if not tc_raw:
        raise ValueError(
            "No se pudo calcular el Tiempo de Concentración con las fórmulas y datos provistos"
        )

    # Adopt average Tc from selected formulas
    tc_adopted_hr = sum(r["tcHours"] for r in tc_raw) / len(tc_raw)
    tc_adopted_min = tc_adopted_hr * 60.0

    tc_results = [TcFormulaResult(**r) for r in tc_raw]

    # ── 4. CN (if SCS-CN) ────────────────────────────────────────────────
    cn_value: Optional[float] = None
    if req.method == "scs_cn":
        if req.cn_override is not None:
            cn_value = req.cn_override
        else:
            cn_value = calculate_composite_cn(
                categories=[
                    {
                        "land_use": cat.land_use,
                        "area_percent": cat.area_percent,
                        "condition": cat.condition,
                    }
                    for cat in req.land_use_categories  # type: ignore[union-attr]
                ],
                soil_group=req.soil_group,  # type: ignore[arg-type]
            )

    # ── 5. Precipitation depth ───────────────────────────────────────────
    # Use adopted Tc as duration for SCS; use requested duration for Rational
    precip_duration_min = req.duration_min
    P_mm = intensity_to_precipitation(intensity, precip_duration_min)

    # ── 6. Primary calculation ───────────────────────────────────────────
    Q_primary: float
    extra: dict = {}

    if req.method == "rational":
        Q_primary = rational_method(
            C=req.runoff_coeff,  # type: ignore[arg-type]
            i_mm_hr=intensity,
            A_km2=req.area_km2,
        )
        extra["runoff_coeff"] = req.runoff_coeff

    elif req.method == "modified_rational":
        Q_primary, K = modified_rational_method(
            C=req.runoff_coeff,  # type: ignore[arg-type]
            i_mm_hr=intensity,
            A_km2=req.area_km2,
        )
        extra["runoff_coeff"] = req.runoff_coeff
        extra["areal_reduction_k"] = round(K, 4)

    else:  # scs_cn
        scs = scs_cn_method(
            CN=cn_value,  # type: ignore[arg-type]
            P_mm=P_mm,
            A_km2=req.area_km2,
            tc_hours=tc_adopted_hr,
            use_pampa_lambda=req.use_pampa_lambda,
        )
        Q_primary = scs["Qp_m3s"]
        extra["cn"] = cn_value
        extra["s_mm"] = scs["S_mm"]
        extra["ia_mm"] = scs["Ia_mm"]
        extra["runoff_depth_mm"] = scs["Q_mm"]
        extra["cn_sensitivity"] = compute_cn_sensitivity(
            cn_base=cn_value,  # type: ignore[arg-type]
            P_mm=P_mm,
            A_km2=req.area_km2,
            tc_hours=tc_adopted_hr,
            use_pampa_lambda=req.use_pampa_lambda,
        )
        # Unit hydrograph (only when there is actual runoff)
        if scs["Qp_m3s"] > 0 and scs["Tp_hr"] > 0:
            uh = scs_unit_hydrograph(Qp=scs["Qp_m3s"], Tp=scs["Tp_hr"])
            extra["hydrograph_times"] = uh["times_hr"]
            extra["hydrograph_flows"] = uh["flows_m3s"]
            extra["runoff_volume_m3"] = uh["runoff_volume_m3"]
            extra["time_to_peak_hr"] = uh["time_to_peak_hr"]
            extra["base_time_hr"] = uh["base_time_hr"]

    specific_flow = Q_primary / req.area_km2 if req.area_km2 > 0 else 0.0

    # ── 7. Method comparison (compute all three always) ──────────────────
    method_comparison: list[MethodResult] = []

    # Rational (needs C)
    if req.runoff_coeff:
        Q_rat = rational_method(req.runoff_coeff, intensity, req.area_km2)
        method_comparison.append(
            MethodResult(
                method="rational",
                methodName="Método Racional",
                peakFlow=round(Q_rat, 4),
                tc=round(tc_adopted_hr, 4),
                intensity=round(intensity, 2),
                notes="Aplicable a cuencas < 2–5 km²",
            )
        )
        Q_mod, K_comp = modified_rational_method(req.runoff_coeff, intensity, req.area_km2)
        method_comparison.append(
            MethodResult(
                method="modified_rational",
                methodName="Racional Modificado",
                peakFlow=round(Q_mod, 4),
                tc=round(tc_adopted_hr, 4),
                intensity=round(intensity, 2),
                notes=f"K={K_comp:.3f} (reducción areal Témez)",
            )
        )

    if cn_value is not None:
        scs_comp = scs_cn_method(cn_value, P_mm, req.area_km2, tc_adopted_hr, req.use_pampa_lambda)
        method_comparison.append(
            MethodResult(
                method="scs_cn",
                methodName="SCS-CN",
                peakFlow=round(scs_comp["Qp_m3s"], 4),
                tc=round(tc_adopted_hr, 4),
                intensity=round(intensity, 2),
                notes=f"CN={cn_value:.1f}, lám. de escorrentía={scs_comp['Q_mm']:.1f} mm",
            )
        )

    # ── 8. Risk classification ────────────────────────────────────────────
    risk_level, risk_recs = classify_risk(
        Q=Q_primary,
        infrastructure=req.infrastructure_type,
        return_period=req.return_period,
    )

    # ── 9. Assemble response ──────────────────────────────────────────────
    response = CalculationResponse(
        city=req.city,
        province=city_data["province"],
        return_period=req.return_period,
        duration_min=req.duration_min,
        area_km2=req.area_km2,
        method=req.method,
        location_description=req.location_description,
        intensity_mm_hr=round(intensity, 3),
        idf_source=city_data["source"],
        idf_verified=city_data["verified"],
        tc_results=tc_results,
        tc_adopted_hours=round(tc_adopted_hr, 4),
        tc_adopted_minutes=round(tc_adopted_min, 2),
        peak_flow_m3s=round(Q_primary, 4),
        specific_flow_m3s_km2=round(specific_flow, 4),
        method_comparison=method_comparison,
        risk_level=risk_level,
        risk_recommendations=risk_recs,
        infrastructure_type=req.infrastructure_type,
        **extra,
    )

    return response.model_dump()
