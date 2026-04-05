"""
Servicio de estimación IDF desde PMD (Precipitación Máxima Diaria).
Fuente: Atlas PMD/PMP INA-CIRSA + UNC (2020).
Método: Modelo DIT de desagregación temporal.

ADVERTENCIA: Estos resultados son ESTIMACIONES derivadas del Atlas PMD.
No reemplazan los datos pluviográficos directos.
"""
import math
from typing import Dict, List, Optional

# Tabla PMD para capitales provinciales (Atlas INA-CIRSA 2020, aproximaciones)
PMD_CAPITALES: Dict[str, Dict[int, float]] = {
    "Buenos Aires": {2: 62, 5: 82, 10: 96, 25: 114, 50: 128, 100: 142},
    "Córdoba": {2: 58, 5: 77, 10: 90, 25: 107, 50: 120, 100: 134},
    "Rosario": {2: 65, 5: 86, 10: 101, 25: 120, 50: 135, 100: 150},
    "Mendoza": {2: 21, 5: 29, 10: 35, 25: 43, 50: 49, 100: 55},
    "San Miguel de Tucumán": {2: 68, 5: 91, 10: 107, 25: 128, 50: 144, 100: 161},
    "La Plata": {2: 64, 5: 85, 10: 100, 25: 119, 50: 133, 100: 148},
    "Mar del Plata": {2: 52, 5: 69, 10: 81, 25: 97, 50: 109, 100: 121},
    "Salta": {2: 55, 5: 74, 10: 87, 25: 104, 50: 117, 100: 130},
    "Santa Fe": {2: 63, 5: 83, 10: 98, 25: 117, 50: 131, 100: 146},
    "San Juan": {2: 18, 5: 25, 10: 30, 25: 37, 50: 42, 100: 47},
    "Resistencia": {2: 78, 5: 104, 10: 122, 25: 146, 50: 164, 100: 182},
    "Neuquén": {2: 18, 5: 25, 10: 30, 25: 37, 50: 42, 100: 47},
    "Formosa": {2: 72, 5: 96, 10: 113, 25: 135, 50: 152, 100: 169},
    "Posadas": {2: 82, 5: 109, 10: 128, 25: 153, 50: 172, 100: 191},
    "Corrientes": {2: 74, 5: 99, 10: 116, 25: 139, 50: 156, 100: 174},
    "Paraná": {2: 65, 5: 87, 10: 102, 25: 122, 50: 137, 100: 152},
    "San Luis": {2: 38, 5: 51, 10: 60, 25: 72, 50: 81, 100: 90},
    "Catamarca": {2: 32, 5: 43, 10: 51, 25: 61, 50: 69, 100: 77},
    "La Rioja": {2: 28, 5: 38, 10: 45, 25: 54, 50: 61, 100: 68},
    "Jujuy": {2: 58, 5: 78, 10: 92, 25: 110, 50: 123, 100: 137},
    "Santiago del Estero": {2: 45, 5: 60, 10: 71, 25: 85, 50: 95, 100: 106},
    "Rawson": {2: 14, 5: 19, 10: 23, 25: 28, 50: 31, 100: 35},
    "Ushuaia": {2: 22, 5: 29, 10: 34, 25: 41, 50: 46, 100: 51},
    "Viedma": {2: 20, 5: 27, 10: 32, 25: 38, 50: 43, 100: 48},
    "Santa Rosa": {2: 42, 5: 56, 10: 66, 25: 79, 50: 89, 100: 99},
}

# Parámetros B regionales del Modelo DIT (INA-CIRSA)
B_REGIONAL = {
    "humeda": 0.154,
    "semiarida": 0.148,
    "arida": 0.141,
    "noa": 0.150,
}

# Clasificación de ciudades por zona climática
ZONA_CLIMATICA: Dict[str, str] = {
    "Buenos Aires": "humeda",
    "La Plata": "humeda",
    "Mar del Plata": "humeda",
    "Rosario": "humeda",
    "Santa Fe": "humeda",
    "Paraná": "semiarida",
    "Corrientes": "humeda",
    "Resistencia": "humeda",
    "Formosa": "humeda",
    "Posadas": "humeda",
    "Córdoba": "semiarida",
    "San Luis": "semiarida",
    "Santa Rosa": "semiarida",
    "Mendoza": "arida",
    "San Juan": "arida",
    "Neuquén": "arida",
    "Rawson": "arida",
    "Viedma": "arida",
    "Ushuaia": "arida",
    "Salta": "noa",
    "Jujuy": "noa",
    "San Miguel de Tucumán": "noa",
    "Catamarca": "noa",
    "La Rioja": "noa",
    "Santiago del Estero": "semiarida",
}


def get_pmd(city: str, return_period: int) -> Optional[float]:
    """Obtener PMD para una ciudad y TR dado."""
    city_data = PMD_CAPITALES.get(city)
    if not city_data:
        return None
    return city_data.get(return_period)


def compute_dit_intensity(
    pmd_mm: float,
    duration_min: int,
    return_period: int,
    B: float = 0.154,
    A: float = 0.370,
) -> float:
    """
    Calcula intensidad IDF usando Modelo DIT con PMD como referencia.

    pmd_mm: precipitación máxima diaria (mm) para el TR dado
    duration_min: duración en minutos
    return_period: período de retorno en años
    B: parámetro regional del Modelo DIT
    A: parámetro de frecuencia (default 0.370)
    """
    delta_1440 = (math.log(1440)) ** (5 / 3)
    i_24h = pmd_mm / 24
    C = math.log(i_24h) + B * delta_1440

    phi_T = 2.584458 * (math.log(return_period)) ** (3 / 8) - 2.252573
    delta_d = (math.log(duration_min)) ** (5 / 3)

    ln_i = A * phi_T - B * delta_d + C
    return round(math.exp(ln_i), 2)


def estimate_idf_from_pmd(
    city: str,
    return_periods: List[int] = [2, 5, 10, 25, 50, 100],
    durations_min: List[int] = [10, 20, 30, 60, 120, 240, 360, 720, 1440],
) -> Dict:
    """
    Estima curvas IDF completas para una ciudad usando PMD + Modelo DIT.
    """
    if city not in PMD_CAPITALES:
        raise ValueError(
            f"Ciudad '{city}' no encontrada. "
            f"Ciudades disponibles: {sorted(list(PMD_CAPITALES.keys()))}"
        )

    zona = ZONA_CLIMATICA.get(city, "semiarida")
    B = B_REGIONAL[zona]

    idf_table: Dict[str, List[float]] = {}
    for tr in return_periods:
        pmd = PMD_CAPITALES[city].get(tr)
        if pmd is None:
            continue
        idf_table[str(tr)] = [
            compute_dit_intensity(pmd, d, tr, B)
            for d in durations_min
        ]

    return {
        "city": city,
        "zona_climatica": zona,
        "source": "Atlas PMD/PMP INA-CIRSA + UNC (2020) + Modelo DIT",
        "method": "Desagregación temporal mediante Modelo DIT (Caamaño Nelli et al.)",
        "B_parameter": B,
        "durations_min": durations_min,
        "return_periods": return_periods,
        "idf_table": idf_table,
        "pmd_data": {
            str(tr): PMD_CAPITALES[city].get(tr)
            for tr in return_periods
        },
        "warnings": [
            "ESTIMACIÓN DERIVADA DEL ATLAS PMD — No es un dato pluviográfico directo.",
            "Basado en precipitaciones máximas diarias del Atlas INA-CIRSA/UNC (2020).",
            "Desagregación temporal mediante Modelo DIT (INA-CIRSA).",
            "Para proyectos críticos, verificar con datos pluviográficos locales.",
            f"Parámetro B regional usado: {B} (zona {zona}).",
        ],
    }
