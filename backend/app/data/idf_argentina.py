"""
IDF (Intensity-Duration-Frequency) coefficients for major Argentine cities.

Formula: i = (a * T^b) / (t + c)^d
  i = rainfall intensity (mm/hr)
  T = return period (years)
  t = duration (minutes)
  a, b, c, d = regional coefficients

Sources: Caamaño Nelli et al. (1999), INA regional publications, SMN.

DISCLAIMER: These coefficients are for preliminary engineering estimates only.
For final designs, verify against the most recent local hydrological studies.
"""

from typing import TypedDict


class ValidRange(TypedDict):
    tMin: int   # minimum duration (min)
    tMax: int   # maximum duration (min)
    TMin: int   # minimum return period (years)
    TMax: int   # maximum return period (years)


class IDFCity(TypedDict):
    city: str
    province: str
    a: float
    b: float
    c: float
    d: float
    source: str
    validRange: ValidRange


IDF_ARGENTINA: list[IDFCity] = [
    {
        "city": "Buenos Aires (Aeroparque)",
        "province": "CABA",
        "a": 1656.36,
        "b": 0.197,
        "c": 13.0,
        "d": 0.846,
        "source": "Caamaño Nelli et al. (1999) / INA",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Buenos Aires (Ezeiza)",
        "province": "Buenos Aires",
        "a": 1490.0,
        "b": 0.178,
        "c": 12.0,
        "d": 0.820,
        "source": "Caamaño Nelli et al. (1999)",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Córdoba (Observatorio)",
        "province": "Córdoba",
        "a": 2850.0,
        "b": 0.220,
        "c": 15.0,
        "d": 0.900,
        "source": "Rühle (1966) / Actualización INA",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Rosario",
        "province": "Santa Fe",
        "a": 1800.0,
        "b": 0.185,
        "c": 12.0,
        "d": 0.850,
        "source": "INA - Centro Regional Litoral",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Mendoza (Aeropuerto)",
        "province": "Mendoza",
        "a": 720.0,
        "b": 0.250,
        "c": 10.0,
        "d": 0.750,
        "source": "INA - Centro Regional Andino",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 50},
    },
    {
        "city": "Salta",
        "province": "Salta",
        "a": 2200.0,
        "b": 0.210,
        "c": 14.0,
        "d": 0.880,
        "source": "SMN / Estudios regionales NOA",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Resistencia",
        "province": "Chaco",
        "a": 2400.0,
        "b": 0.195,
        "c": 12.0,
        "d": 0.860,
        "source": "INA - Centro Regional NEA",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Santa Fe",
        "province": "Santa Fe",
        "a": 1950.0,
        "b": 0.190,
        "c": 12.0,
        "d": 0.855,
        "source": "INA - Centro Regional Litoral",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Neuquén",
        "province": "Neuquén",
        "a": 580.0,
        "b": 0.240,
        "c": 10.0,
        "d": 0.720,
        "source": "INA - Centro Regional Comahue",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 50},
    },
    {
        "city": "Bahía Blanca",
        "province": "Buenos Aires",
        "a": 1100.0,
        "b": 0.200,
        "c": 11.0,
        "d": 0.800,
        "source": "Caamaño Nelli et al. (1999)",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Tucumán",
        "province": "Tucumán",
        "a": 2600.0,
        "b": 0.205,
        "c": 14.0,
        "d": 0.875,
        "source": "SMN / Estudios regionales NOA",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Posadas",
        "province": "Misiones",
        "a": 2800.0,
        "b": 0.188,
        "c": 13.0,
        "d": 0.870,
        "source": "INA - Centro Regional NEA",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Comodoro Rivadavia",
        "province": "Chubut",
        "a": 380.0,
        "b": 0.260,
        "c": 8.0,
        "d": 0.680,
        "source": "INA - Centro Regional Patagonia",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 50},
    },
    {
        "city": "La Plata",
        "province": "Buenos Aires",
        "a": 1580.0,
        "b": 0.192,
        "c": 12.5,
        "d": 0.840,
        "source": "UNLP - Departamento de Hidráulica",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
    {
        "city": "Mar del Plata",
        "province": "Buenos Aires",
        "a": 1320.0,
        "b": 0.188,
        "c": 11.5,
        "d": 0.825,
        "source": "Caamaño Nelli et al. (1999)",
        "validRange": {"tMin": 5, "tMax": 120, "TMin": 2, "TMax": 100},
    },
]


def calculate_idf_intensity(city_name: str, T: float, t: float) -> float:
    """
    Calculate rainfall intensity using IDF formula.

    Args:
        city_name: City name as stored in IDF_ARGENTINA
        T: Return period (years)
        t: Storm duration (minutes)

    Returns:
        Intensity in mm/hr

    Raises:
        ValueError: If city not found or parameters out of valid range
    """
    city = next((c for c in IDF_ARGENTINA if c["city"] == city_name), None)
    if city is None:
        raise ValueError(f"City '{city_name}' not found in IDF database")

    vr = city["validRange"]
    if not (vr["tMin"] <= t <= vr["tMax"]):
        raise ValueError(
            f"Duration {t} min is outside valid range [{vr['tMin']}, {vr['tMax']}] for {city_name}"
        )
    if not (vr["TMin"] <= T <= vr["TMax"]):
        raise ValueError(
            f"Return period {T} yr is outside valid range [{vr['TMin']}, {vr['TMax']}] for {city_name}"
        )

    a, b, c, d = city["a"], city["b"], city["c"], city["d"]
    return (a * (T ** b)) / ((t + c) ** d)
