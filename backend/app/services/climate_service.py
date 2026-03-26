"""
Climate change adjustment service for AutoHydro Argentina.

Applies IPCC AR6 / CIMA-based intensity multipliers to IDF values.

Scenarios:
  RCP 4.5 — Moderate emissions (Paris Agreement achieved)
  RCP 8.5 — High emissions (business as usual)

Horizons: 2030, 2050, 2100

Regional corrections based on projected precipitation changes over Argentina
(IPCC AR6 WGI Chapter 12; CIMA / UBA regional studies).
"""

from __future__ import annotations

# ── Base intensity factors by scenario and horizon ────────────────────────────
# Multiplicative factor applied to design intensity (IDF).
# Example: 1.10 means +10 % increase in extreme rainfall intensity.

_BASE_FACTORS: dict[str, dict[int, float]] = {
    "rcp45": {2030: 1.05, 2050: 1.10, 2100: 1.15},
    "rcp85": {2030: 1.10, 2050: 1.20, 2100: 1.35},
}

# ── Regional extra corrections (additive to base factor) ─────────────────────
# Positive → wetter / more intense events; negative → drier

_NOA_PROVINCES = {
    "Jujuy", "Salta", "Tucumán", "Catamarca",
    "La Rioja", "Santiago del Estero",
}
_NEA_PROVINCES = {
    "Chaco", "Formosa", "Misiones", "Corrientes", "Entre Ríos",
}
_CUYO_PROVINCES = {"Mendoza", "San Juan", "San Luis"}


def _regional_extra(province: str) -> float:
    """Return additive correction to base factor for the given province."""
    if province in _NOA_PROVINCES:
        return 0.05   # NOA: higher intensity increase
    if province in _NEA_PROVINCES:
        return 0.05   # NEA: higher intensity increase
    if province in _CUYO_PROVINCES:
        return -0.02  # Cuyo: slight decrease trend
    return 0.0        # Pampa Húmeda + Patagonia: base factor


# ── Public API ────────────────────────────────────────────────────────────────

def get_climate_factor(scenario: str, horizon: int, province: str = "") -> float:
    """
    Return the intensity multiplier for the given climate scenario.

    Args:
        scenario: "none" | "rcp45" | "rcp85"
        horizon:  2030 | 2050 | 2100
        province: Argentine province name (for regional correction)

    Returns:
        Multiplier >= 1.0 (e.g. 1.15 = +15 % intensity)
    """
    if scenario not in _BASE_FACTORS:
        return 1.0

    # Clamp horizon to nearest available key
    available = sorted(_BASE_FACTORS[scenario].keys())
    h = min(available, key=lambda x: abs(x - horizon))
    base = _BASE_FACTORS[scenario][h]
    extra = _regional_extra(province)
    return round(base + extra, 3)


def adjust_idf_intensity(
    intensity_mm_hr: float,
    scenario: str,
    horizon: int,
    province: str = "",
) -> tuple[float, float]:
    """
    Apply climate change factor to an IDF intensity value.

    Returns:
        (adjusted_intensity_mm_hr, factor_applied)
    """
    factor = get_climate_factor(scenario, horizon, province)
    adjusted = round(intensity_mm_hr * factor, 3)
    return adjusted, factor


def scenario_label(scenario: str, horizon: int) -> str:
    """Human-readable description of the scenario."""
    labels = {
        "rcp45": f"RCP 4.5 — Escenario moderado (horizonte {horizon})",
        "rcp85": f"RCP 8.5 — Escenario alto (horizonte {horizon})",
    }
    return labels.get(scenario, "Sin ajuste por cambio climático")
