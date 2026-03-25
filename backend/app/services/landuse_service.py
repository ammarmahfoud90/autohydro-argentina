"""
Land use classification service for AutoHydro Argentina.

Uses Claude AI to parse a free-text description of basin land use and map it
to CN table entries, then computes the weighted composite CN.
"""

from __future__ import annotations

import json
from typing import Any

import anthropic
from app.core.config import settings
from app.data.cn_argentina import CN_ARGENTINA

_MODEL = "claude-sonnet-4-6"

# All valid CN land use keys with their descriptions and whether they are
# condition-based, so Claude can pick the best match.
_CN_CATALOG = {
    key: {
        "description": val["description"],
        "condition_based": val.get("condition_based", False),
    }
    for key, val in CN_ARGENTINA.items()
}

_SYSTEM_PROMPT = """\
Sos un ingeniero hidrólogo especializado en Argentina. Tu tarea es clasificar \
la descripción de uso del suelo de una cuenca hidrográfica y mapear cada \
categoría al catálogo de Números de Curva (CN) que se te provee.

Reglas:
1. Identificá todos los usos del suelo mencionados (explícita o implícitamente).
2. Estimá el porcentaje de cada uno. Si el usuario da porcentajes, usá esos. \
   Si no, distribuí razonablemente hasta sumar 100%.
3. Para cada uso, elegí la clave más apropiada del catálogo CN provisto.
4. Para usos con condition_based=true, elegí la condición hidrológica \
   ('poor', 'fair' o 'good') según el contexto:
   - 'poor': suelo degradado, sobrepastoreo, sin cobertura residual, labranza convencional
   - 'fair': condiciones típicas, manejo normal
   - 'good': suelo bien manejado, siembra directa, buena cobertura
5. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, \
   con esta estructura exacta:

{
  "land_uses": [
    {
      "cn_key": "clave_del_catalogo",
      "description_es": "descripción legible en español",
      "area_percent": 60.0,
      "condition": "fair"
    }
  ],
  "confidence": "alta | media | baja",
  "notes": "observación breve si aplica, o cadena vacía"
}

El campo "condition" debe ser "N/A" para usos sin condition_based, \
o 'poor'/'fair'/'good' para los que sí lo tienen.
Los area_percent deben sumar exactamente 100.
"""

_ALIASES: dict[str, str] = {
    # agriculture
    "agricultura": "soja_siembra_directa",
    "cultivos": "soja_siembra_directa",
    "soja": "soja_siembra_directa",
    "maiz": "maiz_siembra_directa",
    "maíz": "maiz_siembra_directa",
    "trigo": "trigo",
    "girasol": "girasol",
    "cereal": "trigo",
    # pastures
    "pastizal": "pastizal_natural",
    "pastura": "pastura_implantada",
    "ganaderia": "pastizal_natural",
    "ganadería": "pastizal_natural",
    "feedlot": "feedlot",
    # urban
    "urbano": "residencial_media_densidad",
    "residencial": "residencial_media_densidad",
    "ciudad": "residencial_alta_densidad",
    "industrial": "zona_comercial_industrial",
    "comercial": "zona_comercial_industrial",
    "caminos": "calles_pavimentadas",
    "ruta": "calles_pavimentadas",
    # natural
    "monte": "monte_nativo_ralo",
    "monte nativo": "monte_nativo_denso",
    "bosque": "monte_nativo_denso",
    "humedal": "humedal_bañado",
    "bañado": "humedal_bañado",
    "wetland": "humedal_bañado",
    # other
    "parque solar": "parque_solar",
    "solar": "parque_solar",
    "suelo desnudo": "desmonte_reciente",
    "desmonte": "desmonte_reciente",
}


def _get_cn_value(key: str, soil_group: str, condition: str) -> int | None:
    """Return CN value for a given key, soil group and condition."""
    entry = CN_ARGENTINA.get(key)
    if not entry:
        return None
    sg_data = entry.get(soil_group, {})
    if condition in sg_data:
        return sg_data[condition]
    if "N/A" in sg_data:
        return sg_data["N/A"]
    # Fallback: condition-based entry — use fair if available
    return sg_data.get("fair")


def classify_land_use(description: str, soil_group: str) -> dict[str, Any]:
    """
    Parse a free-text basin description and return land use classification
    with CN values and weighted composite CN.

    Args:
        description: Free-text description (Spanish or English).
        soil_group: "A", "B", "C", or "D".

    Returns:
        {
            "land_uses": [{"cn_key", "description_es", "area_percent",
                           "condition", "cn_value"}],
            "weighted_cn": float,
            "confidence": str,
            "notes": str,
        }
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    catalog_json = json.dumps(_CN_CATALOG, ensure_ascii=False, indent=2)
    user_message = (
        f"Catálogo CN disponible:\n{catalog_json}\n\n"
        f"Descripción de la cuenca:\n{description}\n\n"
        f"Grupo de suelo predominante: {soil_group}"
    )

    message = client.messages.create(
        model=_MODEL,
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = message.content[0].text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    parsed: dict[str, Any] = json.loads(raw)
    land_uses: list[dict] = parsed.get("land_uses", [])

    # Normalise percentages to exactly 100
    total_pct = sum(lu["area_percent"] for lu in land_uses)
    if total_pct > 0 and abs(total_pct - 100.0) > 0.5:
        factor = 100.0 / total_pct
        for lu in land_uses:
            lu["area_percent"] = round(lu["area_percent"] * factor, 1)
        # Fix rounding residual on last item
        diff = 100.0 - sum(lu["area_percent"] for lu in land_uses)
        if land_uses:
            land_uses[-1]["area_percent"] = round(land_uses[-1]["area_percent"] + diff, 1)

    # Enrich each land use with CN value
    weighted_cn = 0.0
    for lu in land_uses:
        key = lu.get("cn_key", "")
        # Fall back via alias lookup if key not in catalog
        if key not in CN_ARGENTINA:
            key = _ALIASES.get(key.lower(), key)
            lu["cn_key"] = key
        condition = lu.get("condition", "N/A")
        cn_val = _get_cn_value(key, soil_group, condition)
        lu["cn_value"] = cn_val
        if cn_val is not None:
            weighted_cn += (lu["area_percent"] / 100.0) * cn_val

    return {
        "land_uses": land_uses,
        "weighted_cn": round(weighted_cn, 1),
        "confidence": parsed.get("confidence", "media"),
        "notes": parsed.get("notes", ""),
    }
