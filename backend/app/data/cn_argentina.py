"""
Curve Number (CN) tables adapted for Argentine land use categories.

Values based on USDA-SCS methodology adapted to Argentine conditions.
Soil groups follow the USDA classification (A, B, C, D).

Sources:
- USDA-SCS (1972). National Engineering Handbook, Section 4.
- Adaptations for Argentine land use from INA and regional practice.
"""

from typing import TypedDict


class SoilGroupDescription(TypedDict):
    name: str
    description: str
    typical_locations: str
    infiltration_rate: str


# CN values indexed by: land_use_key -> soil_group -> condition/N/A -> CN value
CN_ARGENTINA: dict = {
    # === ZONAS URBANAS ===
    "zona_comercial_industrial": {
        "description": "Zonas comerciales e industriales",
        "A": {"N/A": 89}, "B": {"N/A": 92}, "C": {"N/A": 94}, "D": {"N/A": 95},
    },
    "residencial_alta_densidad": {
        "description": "Residencial alta densidad (lote < 500 m²)",
        "A": {"N/A": 77}, "B": {"N/A": 85}, "C": {"N/A": 90}, "D": {"N/A": 92},
    },
    "residencial_media_densidad": {
        "description": "Residencial media densidad (lote 500-1000 m²)",
        "A": {"N/A": 61}, "B": {"N/A": 75}, "C": {"N/A": 83}, "D": {"N/A": 87},
    },
    "residencial_baja_densidad": {
        "description": "Residencial baja densidad (lote > 1000 m²)",
        "A": {"N/A": 54}, "B": {"N/A": 70}, "C": {"N/A": 80}, "D": {"N/A": 85},
    },
    "urbanizacion_informal": {
        "description": "Urbanización informal / asentamientos",
        "A": {"N/A": 72}, "B": {"N/A": 82}, "C": {"N/A": 88}, "D": {"N/A": 91},
    },
    "espacios_verdes_urbanos": {
        "description": "Plazas, parques urbanos",
        "condition_based": True,
        "A": {"poor": 68, "fair": 49, "good": 39},
        "B": {"poor": 79, "fair": 69, "good": 61},
        "C": {"poor": 86, "fair": 79, "good": 74},
        "D": {"poor": 89, "fair": 84, "good": 80},
    },
    "calles_pavimentadas": {
        "description": "Calles y veredas pavimentadas",
        "A": {"N/A": 98}, "B": {"N/A": 98}, "C": {"N/A": 98}, "D": {"N/A": 98},
    },
    "calles_ripio": {
        "description": "Calles de ripio o tierra compactada",
        "A": {"N/A": 76}, "B": {"N/A": 85}, "C": {"N/A": 89}, "D": {"N/A": 91},
    },

    # === AGRICULTURA - REGIÓN PAMPEANA ===
    "soja_siembra_directa": {
        "description": "Soja en siembra directa (práctica predominante)",
        "condition_based": True,
        "A": {"poor": 72, "fair": 67, "good": 62},
        "B": {"poor": 81, "fair": 78, "good": 74},
        "C": {"poor": 88, "fair": 85, "good": 82},
        "D": {"poor": 91, "fair": 89, "good": 86},
    },
    "soja_labranza_convencional": {
        "description": "Soja con labranza convencional",
        "condition_based": True,
        "A": {"poor": 77, "fair": 72, "good": 67},
        "B": {"poor": 85, "fair": 81, "good": 78},
        "C": {"poor": 91, "fair": 88, "good": 85},
        "D": {"poor": 94, "fair": 91, "good": 89},
    },
    "maiz_siembra_directa": {
        "description": "Maíz en siembra directa",
        "condition_based": True,
        "A": {"poor": 70, "fair": 65, "good": 60},
        "B": {"poor": 79, "fair": 75, "good": 71},
        "C": {"poor": 86, "fair": 82, "good": 78},
        "D": {"poor": 89, "fair": 86, "good": 83},
    },
    "trigo": {
        "description": "Trigo / Cereales de invierno",
        "condition_based": True,
        "A": {"poor": 65, "fair": 60, "good": 55},
        "B": {"poor": 76, "fair": 72, "good": 68},
        "C": {"poor": 84, "fair": 80, "good": 76},
        "D": {"poor": 88, "fair": 85, "good": 82},
    },
    "girasol": {
        "description": "Girasol",
        "condition_based": True,
        "A": {"poor": 74, "fair": 69, "good": 64},
        "B": {"poor": 82, "fair": 78, "good": 74},
        "C": {"poor": 88, "fair": 85, "good": 82},
        "D": {"poor": 91, "fair": 88, "good": 86},
    },

    # === PASTURAS Y GANADERÍA ===
    "pastizal_natural": {
        "description": "Pastizal natural pampeano",
        "condition_based": True,
        "A": {"poor": 68, "fair": 49, "good": 39},
        "B": {"poor": 79, "fair": 69, "good": 61},
        "C": {"poor": 86, "fair": 79, "good": 74},
        "D": {"poor": 89, "fair": 84, "good": 80},
    },
    "pastizal_degradado": {
        "description": "Pastizal degradado / sobrepastoreo",
        "A": {"N/A": 75}, "B": {"N/A": 83}, "C": {"N/A": 89}, "D": {"N/A": 92},
    },
    "pastura_implantada": {
        "description": "Pastura implantada (alfalfa, festuca, etc.)",
        "condition_based": True,
        "A": {"poor": 66, "fair": 55, "good": 45},
        "B": {"poor": 77, "fair": 70, "good": 63},
        "C": {"poor": 85, "fair": 80, "good": 75},
        "D": {"poor": 88, "fair": 84, "good": 80},
    },
    "feedlot": {
        "description": "Feedlot / Corrales de engorde",
        "A": {"N/A": 88}, "B": {"N/A": 92}, "C": {"N/A": 94}, "D": {"N/A": 95},
    },

    # === MONTES Y FORESTACIÓN ===
    "monte_nativo_denso": {
        "description": "Monte nativo denso (Chaco, Yungas)",
        "condition_based": True,
        "A": {"poor": 45, "fair": 36, "good": 30},
        "B": {"poor": 66, "fair": 60, "good": 55},
        "C": {"poor": 77, "fair": 73, "good": 70},
        "D": {"poor": 83, "fair": 79, "good": 77},
    },
    "monte_nativo_ralo": {
        "description": "Monte nativo ralo / arbustal",
        "condition_based": True,
        "A": {"poor": 57, "fair": 48, "good": 41},
        "B": {"poor": 73, "fair": 67, "good": 62},
        "C": {"poor": 82, "fair": 78, "good": 74},
        "D": {"poor": 86, "fair": 83, "good": 80},
    },
    "forestacion_pinos": {
        "description": "Forestación de pinos (NEA, Patagonia)",
        "condition_based": True,
        "A": {"poor": 45, "fair": 36, "good": 30},
        "B": {"poor": 66, "fair": 60, "good": 55},
        "C": {"poor": 77, "fair": 73, "good": 70},
        "D": {"poor": 83, "fair": 79, "good": 77},
    },
    "forestacion_eucaliptus": {
        "description": "Forestación de eucaliptus",
        "condition_based": True,
        "A": {"poor": 48, "fair": 40, "good": 34},
        "B": {"poor": 68, "fair": 62, "good": 57},
        "C": {"poor": 78, "fair": 74, "good": 71},
        "D": {"poor": 84, "fair": 80, "good": 78},
    },
    "desmonte_reciente": {
        "description": "Desmonte reciente / suelo expuesto",
        "A": {"N/A": 77}, "B": {"N/A": 86}, "C": {"N/A": 91}, "D": {"N/A": 94},
    },

    # === ZONAS ESPECIALES ===
    "humedal_bañado": {
        "description": "Humedales / Bañados",
        "A": {"N/A": 85}, "B": {"N/A": 90}, "C": {"N/A": 93}, "D": {"N/A": 95},
    },
    "salinas_salitrales": {
        "description": "Salinas y salitrales",
        "A": {"N/A": 92}, "B": {"N/A": 94}, "C": {"N/A": 96}, "D": {"N/A": 97},
    },
    "medanos_dunas": {
        "description": "Médanos / Dunas (sin vegetación)",
        "A": {"N/A": 63}, "B": {"N/A": 77}, "C": {"N/A": 85}, "D": {"N/A": 88},
    },
    "roca_expuesta": {
        "description": "Roca expuesta / afloramientos",
        "A": {"N/A": 96}, "B": {"N/A": 96}, "C": {"N/A": 96}, "D": {"N/A": 96},
    },

    # === INFRAESTRUCTURA ===
    "parque_solar": {
        "description": "Parque solar fotovoltaico",
        "A": {"N/A": 70}, "B": {"N/A": 80}, "C": {"N/A": 86}, "D": {"N/A": 89},
    },
    "parque_eolico": {
        "description": "Parque eólico (área de servidumbre)",
        "condition_based": True,
        "notes": "Usar CN del uso del suelo subyacente",
        "A": {"poor": 68, "fair": 49, "good": 39},
        "B": {"poor": 79, "fair": 69, "good": 61},
        "C": {"poor": 86, "fair": 79, "good": 74},
        "D": {"poor": 89, "fair": 84, "good": 80},
    },
    "cantera_mineria": {
        "description": "Cantera / Minería a cielo abierto",
        "A": {"N/A": 91}, "B": {"N/A": 93}, "C": {"N/A": 95}, "D": {"N/A": 96},
    },
}

SOIL_GROUP_DESCRIPTIONS: dict[str, SoilGroupDescription] = {
    "A": {
        "name": "Grupo A - Alta infiltración",
        "description": "Arenas profundas, loess profundo, limos agregados",
        "typical_locations": "Médanos fijados, suelos arenosos de Entre Ríos",
        "infiltration_rate": "> 7.6 mm/hr",
    },
    "B": {
        "name": "Grupo B - Infiltración moderada",
        "description": "Limos, suelos franco-arenosos, loess poco profundo",
        "typical_locations": "Pampa Ondulada, gran parte de la región pampeana",
        "infiltration_rate": "3.8 - 7.6 mm/hr",
    },
    "C": {
        "name": "Grupo C - Infiltración lenta",
        "description": "Arcillas, suelos con horizonte impermeable",
        "typical_locations": "Bajos submeridionales, depresión del Salado",
        "infiltration_rate": "1.3 - 3.8 mm/hr",
    },
    "D": {
        "name": "Grupo D - Infiltración muy lenta",
        "description": "Arcillas pesadas, suelos con napa freática alta, suelos salino-sódicos",
        "typical_locations": "Zonas deprimidas, áreas con napa < 1m",
        "infiltration_rate": "< 1.3 mm/hr",
    },
}


def get_cn_value(land_use_key: str, soil_group: str, condition: str = "fair") -> int:
    """
    Retrieve CN value for a given land use, soil group, and hydrological condition.

    Args:
        land_use_key: Key from CN_ARGENTINA dict
        soil_group: "A", "B", "C", or "D"
        condition: "poor", "fair", or "good" (used only if condition_based=True)

    Returns:
        CN value (integer)

    Raises:
        ValueError: If land use or soil group not found
    """
    entry = CN_ARGENTINA.get(land_use_key)
    if entry is None:
        raise ValueError(f"Land use '{land_use_key}' not found in CN database")

    soil_data = entry.get(soil_group)
    if soil_data is None:
        raise ValueError(f"Soil group '{soil_group}' not found for '{land_use_key}'")

    if entry.get("condition_based"):
        cn = soil_data.get(condition)
        if cn is None:
            raise ValueError(f"Condition '{condition}' not valid for '{land_use_key}'")
        return cn
    else:
        return soil_data["N/A"]


def calculate_composite_cn(
    categories: list[dict],
    soil_group: str,
) -> float:
    """
    Calculate composite CN from multiple land use categories weighted by area.

    Args:
        categories: List of dicts with keys:
            - land_use: land use key
            - area_percent: percentage of total area (0-100)
            - condition: "poor", "fair", or "good" (optional, defaults to "fair")
        soil_group: "A", "B", "C", or "D"

    Returns:
        Composite CN (float)

    Raises:
        ValueError: If percentages don't sum to ~100%
    """
    total_pct = sum(cat["area_percent"] for cat in categories)
    if not (99.0 <= total_pct <= 101.0):
        raise ValueError(
            f"Area percentages must sum to 100% (currently {total_pct:.1f}%)"
        )

    cn_composite = 0.0
    for cat in categories:
        cn = get_cn_value(
            land_use_key=cat["land_use"],
            soil_group=soil_group,
            condition=cat.get("condition", "fair"),
        )
        cn_composite += cn * (cat["area_percent"] / 100.0)

    return round(cn_composite, 1)
