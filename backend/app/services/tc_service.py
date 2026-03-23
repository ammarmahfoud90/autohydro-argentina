"""
Tiempo de Concentración (Tc) calculation service.

All six formulas used in Argentine hydrological practice are implemented.
Each formula is documented with its source, parameters, units, and applicability.
"""

import math
from enum import Enum
from typing import Optional


class TcFormula(str, Enum):
    KIRPICH = "kirpich"
    CALIFORNIA = "california"
    TEMEZ = "temez"
    GIANDOTTI = "giandotti"
    VENTURA_HERAS = "ventura_heras"
    PASSINI = "passini"


class TcResult:
    """Result from a single Tc formula calculation."""

    def __init__(
        self,
        formula: TcFormula,
        tc_hours: float,
        formula_name: str,
        applicability: str,
        notes: str = "",
    ):
        self.formula = formula
        self.tc_hours = tc_hours
        self.tc_minutes = tc_hours * 60
        self.formula_name = formula_name
        self.applicability = applicability
        self.notes = notes

    def to_dict(self) -> dict:
        return {
            "formula": self.formula.value,
            "formulaName": self.formula_name,
            "tcHours": round(self.tc_hours, 4),
            "tcMinutes": round(self.tc_minutes, 1),
            "applicability": self.applicability,
            "notes": self.notes,
        }


def calculate_tc_kirpich(L: float, S: float) -> TcResult:
    """
    Kirpich (1940)

    Tc = 0.0195 × L^0.77 × S^(-0.385)

    Args:
        L: Longitud del cauce principal (m)
        S: Pendiente media del cauce (m/m)

    Returns:
        Tc en minutos → converted to hours in TcResult

    Applicability: cuencas rurales pequeñas, áreas < 0.5 km², pendientes 3-10%
    """
    if L <= 0:
        raise ValueError("L must be positive")
    if S <= 0:
        raise ValueError("S must be positive")

    tc_min = 0.0195 * (L ** 0.77) * (S ** -0.385)
    return TcResult(
        formula=TcFormula.KIRPICH,
        tc_hours=tc_min / 60.0,
        formula_name="Kirpich (1940)",
        applicability="Cuencas rurales pequeñas (< 0.5 km²), pendientes 3–10%",
        notes="L en metros. Desarrollada para cuencas agrícolas de Tennessee.",
    )


def calculate_tc_california(L: float, H: float) -> TcResult:
    """
    California Culverts Practice (1942)

    Tc = 57 × (L³ / H)^0.385

    Args:
        L: Longitud del cauce (km)
        H: Desnivel total (m)

    Returns:
        Tc en minutos → converted to hours in TcResult

    Applicability: cuencas montañosas, pequeñas a medianas
    """
    if L <= 0:
        raise ValueError("L must be positive")
    if H <= 0:
        raise ValueError("H must be positive")

    tc_min = 57.0 * ((L ** 3) / H) ** 0.385
    return TcResult(
        formula=TcFormula.CALIFORNIA,
        tc_hours=tc_min / 60.0,
        formula_name="California Culverts Practice (1942)",
        applicability="Cuencas montañosas, pequeñas a medianas",
        notes="L en km, H en metros.",
    )


def calculate_tc_temez(L: float, S: float) -> TcResult:
    """
    Témez (1978) — Recommended for Argentina and Spain

    Tc = 0.3 × (L / S^0.25)^0.76

    Args:
        L: Longitud del cauce principal (km)
        S: Pendiente media del cauce (m/m)

    Returns:
        Tc en horas

    Applicability: cuencas naturales de amplio rango; recomendado para Argentina
    """
    if L <= 0:
        raise ValueError("L must be positive")
    if S <= 0:
        raise ValueError("S must be positive")

    tc_hr = 0.3 * ((L / (S ** 0.25)) ** 0.76)
    return TcResult(
        formula=TcFormula.TEMEZ,
        tc_hours=tc_hr,
        formula_name="Témez (1978)",
        applicability="Cuencas naturales, amplio rango de tamaños. Recomendado para Argentina.",
        notes="L en km. Método preferido en práctica argentina y española.",
    )


def calculate_tc_giandotti(A: float, L: float, Hm: float) -> TcResult:
    """
    Giandotti (1934)

    Tc = (4 × √A + 1.5 × L) / (0.8 × √Hm)

    Args:
        A: Área de la cuenca (km²)
        L: Longitud del cauce principal (km)
        Hm: Altura media de la cuenca sobre el punto de cierre (m)

    Returns:
        Tc en horas

    Applicability: cuencas grandes (> 10 km²), terreno montañoso
    """
    if A <= 0:
        raise ValueError("A must be positive")
    if L <= 0:
        raise ValueError("L must be positive")
    if Hm <= 0:
        raise ValueError("Hm must be positive")

    tc_hr = (4 * math.sqrt(A) + 1.5 * L) / (0.8 * math.sqrt(Hm))
    return TcResult(
        formula=TcFormula.GIANDOTTI,
        tc_hours=tc_hr,
        formula_name="Giandotti (1934)",
        applicability="Cuencas grandes (> 10 km²), terreno montañoso",
        notes="A en km², L en km, Hm en metros.",
    )


def calculate_tc_ventura_heras(A: float, S: float) -> TcResult:
    """
    Ventura-Heras

    Tc = 0.3 × √(A / S)

    Args:
        A: Área de la cuenca (km²)
        S: Pendiente media de la cuenca (m/m)

    Returns:
        Tc en horas

    Applicability: cuencas pequeñas a medianas; uso común en España y Argentina
    """
    if A <= 0:
        raise ValueError("A must be positive")
    if S <= 0:
        raise ValueError("S must be positive")

    tc_hr = 0.3 * math.sqrt(A / S)
    return TcResult(
        formula=TcFormula.VENTURA_HERAS,
        tc_hours=tc_hr,
        formula_name="Ventura-Heras",
        applicability="Cuencas pequeñas a medianas. Pampa Húmeda (pendientes bajas).",
        notes="A en km². Útil cuando solo se dispone de área y pendiente media.",
    )


def calculate_tc_passini(A: float, L: float, S: float) -> TcResult:
    """
    Passini

    Tc = 0.108 × (A × L)^(1/3) / √S

    Args:
        A: Área de la cuenca (km²)
        L: Longitud del cauce (km)
        S: Pendiente media (m/m)

    Returns:
        Tc en horas

    Applicability: cuencas rurales, pendientes moderadas
    """
    if A <= 0:
        raise ValueError("A must be positive")
    if L <= 0:
        raise ValueError("L must be positive")
    if S <= 0:
        raise ValueError("S must be positive")

    tc_hr = 0.108 * ((A * L) ** (1.0 / 3.0)) / math.sqrt(S)
    return TcResult(
        formula=TcFormula.PASSINI,
        tc_hours=tc_hr,
        formula_name="Passini",
        applicability="Cuencas rurales con pendientes moderadas",
        notes="A en km², L en km.",
    )


# Guidance on which formulas to use for different basin types
TC_RECOMMENDATIONS: dict[str, dict] = {
    "urban_small": {
        "description": "Cuencas urbanas pequeñas (< 2 km²)",
        "recommended": [TcFormula.KIRPICH],
        "alternative": [TcFormula.CALIFORNIA],
        "notes": "Considerar reducción por impermeabilización",
    },
    "rural_small": {
        "description": "Cuencas rurales pequeñas (< 5 km²)",
        "recommended": [TcFormula.KIRPICH, TcFormula.TEMEZ],
        "alternative": [TcFormula.CALIFORNIA],
        "notes": "Témez preferido en práctica argentina",
    },
    "rural_medium": {
        "description": "Cuencas rurales medianas (5-50 km²)",
        "recommended": [TcFormula.TEMEZ, TcFormula.GIANDOTTI],
        "alternative": [TcFormula.VENTURA_HERAS, TcFormula.PASSINI],
        "notes": "Comparar múltiples métodos",
    },
    "mountainous": {
        "description": "Cuencas montañosas (cualquier tamaño)",
        "recommended": [TcFormula.GIANDOTTI, TcFormula.CALIFORNIA],
        "alternative": [TcFormula.TEMEZ],
        "notes": "Verificar con datos locales si disponibles",
    },
    "pampa_humeda": {
        "description": "Pampa Húmeda (pendientes muy bajas)",
        "recommended": [TcFormula.VENTURA_HERAS, TcFormula.TEMEZ],
        "alternative": [TcFormula.PASSINI],
        "notes": "Pendientes < 1% requieren análisis especial",
    },
}


def calculate_all_tc(
    L_m: float,
    L_km: float,
    S: float,
    A_km2: float,
    H_m: Optional[float] = None,
    Hm_m: Optional[float] = None,
    formulas: Optional[list[str]] = None,
) -> list[dict]:
    """
    Calculate Tc using multiple formulas.

    Args:
        L_m: Channel length in meters (for Kirpich)
        L_km: Channel length in km (for California, Témez, Giandotti, Passini)
        S: Average channel slope (m/m)
        A_km2: Basin area (km²)
        H_m: Total elevation difference in meters (for California)
        Hm_m: Average elevation above outlet in meters (for Giandotti)
        formulas: List of formula keys to compute; if None, computes all possible

    Returns:
        List of TcResult dicts, sorted by formula name
    """
    results = []
    requested = set(formulas) if formulas else {f.value for f in TcFormula}

    def _try(formula_key: str, fn, *args):
        if formula_key not in requested:
            return
        try:
            results.append(fn(*args).to_dict())
        except (ValueError, ZeroDivisionError):
            pass  # Skip formula if required inputs are missing or invalid

    _try(TcFormula.KIRPICH, calculate_tc_kirpich, L_m, S)
    _try(TcFormula.TEMEZ, calculate_tc_temez, L_km, S)
    _try(TcFormula.VENTURA_HERAS, calculate_tc_ventura_heras, A_km2, S)
    _try(TcFormula.PASSINI, calculate_tc_passini, A_km2, L_km, S)

    if H_m and H_m > 0:
        _try(TcFormula.CALIFORNIA, calculate_tc_california, L_km, H_m)

    if Hm_m and Hm_m > 0:
        _try(TcFormula.GIANDOTTI, calculate_tc_giandotti, A_km2, L_km, Hm_m)

    return results
