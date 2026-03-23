"""
Claude API integration for AutoHydro Argentina.

Generates professional technical interpretations of hydrological calculation results
in Spanish (rioplatense) or English, following Argentine engineering practice.
"""

from typing import Any
import anthropic
from app.core.config import settings

# Model to use — claude-sonnet-4-6 is the latest capable model
_MODEL = "claude-sonnet-4-6"

_SYSTEM_ES = """Eres un ingeniero civil especializado en hidrología e hidráulica, \
con amplia experiencia en proyectos en Argentina.

Tu rol es interpretar resultados de cálculos hidrológicos y proporcionar explicaciones \
técnicas claras y profesionales.

Directrices:
- Usa terminología técnica apropiada en español rioplatense
- Sé preciso y conciso
- Relaciona los resultados con la práctica argentina
- Menciona normativas o referencias locales cuando sea pertinente
- Evita lenguaje vago; usa valores numéricos específicos
- Estructura tus respuestas de forma clara
- Cuando haya incertidumbre, indícala explícitamente
- No inventes datos; basa tus interpretaciones en los valores proporcionados"""

_SYSTEM_EN = """You are a civil engineer specialized in hydrology and hydraulics, \
with extensive experience in projects in Argentina.

Your role is to interpret hydrological calculation results and provide clear, \
professional technical explanations.

Guidelines:
- Use appropriate technical terminology
- Be precise and concise
- Relate results to Argentine practice where relevant
- Reference local standards when pertinent
- Avoid vague language; use specific numerical values
- Structure your responses clearly
- When uncertain, indicate it explicitly
- Do not fabricate data; base interpretations on provided values"""


def _build_interpretation_prompt(data: dict[str, Any], language: str) -> str:
    """Build the user prompt for interpretation."""
    method_names = {
        "rational": "Método Racional" if language == "es" else "Rational Method",
        "modified_rational": "Método Racional Modificado" if language == "es" else "Modified Rational Method",
        "scs_cn": "Método SCS-CN",
    }
    method_display = method_names.get(data.get("method", ""), data.get("method", ""))

    risk_labels_es = {
        "muy_bajo": "Muy Bajo", "bajo": "Bajo", "moderado": "Moderado",
        "alto": "Alto", "muy_alto": "Muy Alto",
    }
    risk_labels_en = {
        "muy_bajo": "Very Low", "bajo": "Low", "moderado": "Moderate",
        "alto": "High", "muy_alto": "Very High",
    }
    risk_labels = risk_labels_es if language == "es" else risk_labels_en
    risk_display = risk_labels.get(data.get("risk_level", ""), data.get("risk_level", ""))

    cn_line = f"- Número de Curva (CN): {data['cn']:.1f}\n" if data.get("cn") else ""
    c_line = f"- Coeficiente de escorrentía (C): {data['runoff_coeff']:.2f}\n" if data.get("runoff_coeff") else ""
    location_line = f"- Ubicación: {data['location_description']}\n" if data.get("location_description") else ""
    k_line = f"- Factor de reducción areal K: {data['areal_reduction_k']:.3f}\n" if data.get("areal_reduction_k") else ""

    if language == "es":
        return f"""Analiza los siguientes resultados de un estudio hidrológico:

**Datos de la Cuenca:**
{location_line}- Ciudad de referencia: {data.get('city', 'N/A')} ({data.get('province', '')})
- Área: {data['area_km2']:.2f} km²
- Período de retorno: {data['return_period']} años
- Duración de tormenta: {data['duration_min']} minutos
- Intensidad de lluvia (IDF): {data['intensity_mm_hr']:.1f} mm/hr
- Fuente IDF: {data.get('idf_source', 'N/A')}

**Tiempo de Concentración:**
- Tc adoptado: {data['tc_adopted_hours']:.2f} horas ({data['tc_adopted_minutes']:.0f} minutos)

**Método y Parámetros:**
- Método utilizado: {method_display}
{c_line}{cn_line}{k_line}
**Resultados:**
- Caudal pico calculado: {data['peak_flow_m3s']:.3f} m³/s
- Caudal específico: {data['specific_flow_m3s_km2']:.3f} m³/s/km²
- Nivel de riesgo: {risk_display}
- Tipo de infraestructura: {data.get('infrastructure_type', 'N/A')}

Proporciona una respuesta estructurada con:
1. **Interpretación del resultado**: ¿Qué significa este caudal en términos prácticos?
2. **Evaluación del riesgo**: Justificación de la clasificación
3. **Consideraciones de diseño**: Aspectos clave para el dimensionamiento hidráulico
4. **Recomendaciones**: Acciones específicas sugeridas
5. **Limitaciones**: Advertencias sobre la aplicabilidad del método y los datos utilizados

Sé conciso y directo. Máximo 400 palabras."""

    else:
        return f"""Analyze the following hydrological study results:

**Basin Data:**
{location_line}- Reference city: {data.get('city', 'N/A')} ({data.get('province', '')})
- Area: {data['area_km2']:.2f} km²
- Return period: {data['return_period']} years
- Storm duration: {data['duration_min']} minutes
- Rainfall intensity (IDF): {data['intensity_mm_hr']:.1f} mm/hr
- IDF source: {data.get('idf_source', 'N/A')}

**Time of Concentration:**
- Adopted Tc: {data['tc_adopted_hours']:.2f} hours ({data['tc_adopted_minutes']:.0f} minutes)

**Method and Parameters:**
- Method used: {method_display}
{c_line}{cn_line}{k_line}
**Results:**
- Calculated peak discharge: {data['peak_flow_m3s']:.3f} m³/s
- Specific discharge: {data['specific_flow_m3s_km2']:.3f} m³/s/km²
- Risk level: {risk_display}
- Infrastructure type: {data.get('infrastructure_type', 'N/A')}

Provide a structured response with:
1. **Result interpretation**: What does this discharge mean in practical terms?
2. **Risk assessment**: Justification for the risk classification
3. **Design considerations**: Key aspects for hydraulic dimensioning
4. **Recommendations**: Specific suggested actions
5. **Limitations**: Warnings about method applicability and data used

Be concise and direct. Maximum 400 words."""


def _build_report_sections_prompt(data: dict[str, Any], language: str) -> str:
    """Build prompt for structured report section generation."""
    method_names = {
        "rational": "Método Racional",
        "modified_rational": "Método Racional Modificado",
        "scs_cn": "Método SCS-CN",
    }
    method_display = method_names.get(data.get("method", ""), data.get("method", ""))

    if language == "es":
        return f"""Genera el contenido para una Memoria de Cálculo Hidrológico profesional con los siguientes datos:

Ciudad: {data.get('city')}, Área: {data.get('area_km2')} km², Método: {method_display}
Período de retorno: {data.get('return_period')} años, Caudal pico: {data.get('peak_flow_m3s')} m³/s
Nivel de riesgo: {data.get('risk_level')}, Infraestructura: {data.get('infrastructure_type')}

Genera exactamente estas 5 secciones con el formato indicado:

###OBJETO###
[2-3 oraciones describiendo el objeto del estudio hidrológico. Mencionar el tipo de infraestructura y la necesidad del análisis.]

###DESCRIPCION_CUENCA###
[3-4 oraciones describiendo las características de la cuenca con los datos proporcionados. Incluir área, longitud del cauce, pendiente y ubicación.]

###METODOLOGIA###
[3-4 oraciones justificando la selección del método {method_display} para las características de la cuenca. Mencionar las fórmulas aplicadas.]

###ANALISIS_RESULTADOS###
[4-5 oraciones interpretando los resultados: caudal, nivel de riesgo, implicancias para el diseño. Relacionar con la práctica argentina.]

###CONCLUSIONES###
[3-4 oraciones con las conclusiones y el caudal de diseño adoptado. Incluir recomendaciones específicas.]"""

    else:
        return f"""Generate content for a professional Hydrological Calculation Report with the following data:

City: {data.get('city')}, Area: {data.get('area_km2')} km², Method: {method_display}
Return period: {data.get('return_period')} years, Peak discharge: {data.get('peak_flow_m3s')} m³/s
Risk level: {data.get('risk_level')}, Infrastructure: {data.get('infrastructure_type')}

Generate exactly these 5 sections with the indicated format:

###OBJECT###
[2-3 sentences describing the object of the hydrological study. Mention the infrastructure type and need for analysis.]

###BASIN_DESCRIPTION###
[3-4 sentences describing basin characteristics with the provided data. Include area, channel length, slope, and location.]

###METHODOLOGY###
[3-4 sentences justifying the selection of {method_display} for the basin characteristics. Mention the applied formulas.]

###RESULTS_ANALYSIS###
[4-5 sentences interpreting the results: discharge, risk level, design implications. Relate to Argentine practice.]

###CONCLUSIONS###
[3-4 sentences with conclusions and the adopted design discharge. Include specific recommendations.]"""


def _parse_report_sections(text: str, language: str) -> dict[str, str]:
    """Parse structured sections from AI response."""
    if language == "es":
        section_keys = {
            "###OBJETO###": "objeto",
            "###DESCRIPCION_CUENCA###": "descripcion_cuenca",
            "###METODOLOGIA###": "metodologia",
            "###ANALISIS_RESULTADOS###": "analisis_resultados",
            "###CONCLUSIONES###": "conclusiones",
        }
    else:
        section_keys = {
            "###OBJECT###": "objeto",
            "###BASIN_DESCRIPTION###": "descripcion_cuenca",
            "###METHODOLOGY###": "metodologia",
            "###RESULTS_ANALYSIS###": "analisis_resultados",
            "###CONCLUSIONS###": "conclusiones",
        }

    sections: dict[str, str] = {v: "" for v in section_keys.values()}
    current_key: str | None = None

    for line in text.splitlines():
        stripped = line.strip()
        if stripped in section_keys:
            current_key = section_keys[stripped]
        elif current_key and stripped:
            sections[current_key] += stripped + " "

    # Clean up trailing spaces
    return {k: v.strip() for k, v in sections.items()}


def generate_interpretation(
    calculation_data: dict[str, Any],
    language: str = "es",
) -> str:
    """
    Generate AI interpretation of hydrological calculation results.

    Args:
        calculation_data: Full calculation response dict
        language: "es" (Spanish) or "en" (English)

    Returns:
        Formatted interpretation text

    Raises:
        RuntimeError: If API key not configured or API call fails
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY no está configurada. "
            "Configure la variable de entorno para usar la interpretación IA."
        )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    system = _SYSTEM_ES if language == "es" else _SYSTEM_EN
    prompt = _build_interpretation_prompt(calculation_data, language)

    message = client.messages.create(
        model=_MODEL,
        max_tokens=1500,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def generate_report_sections(
    calculation_data: dict[str, Any],
    language: str = "es",
) -> dict[str, str]:
    """
    Generate structured sections for the Memoria de Cálculo PDF.

    Returns dict with keys:
        objeto, descripcion_cuenca, metodologia, analisis_resultados, conclusiones
    """
    if not settings.ANTHROPIC_API_KEY:
        # Return placeholder text if no API key
        if language == "es":
            return {
                "objeto": "Determinación del caudal de diseño para la infraestructura propuesta.",
                "descripcion_cuenca": f"Cuenca de {calculation_data.get('area_km2', 0):.2f} km² ubicada en {calculation_data.get('city', '')}.",
                "metodologia": f"Se aplicó el método seleccionado para las características de la cuenca.",
                "analisis_resultados": f"El caudal pico calculado es de {calculation_data.get('peak_flow_m3s', 0):.3f} m³/s.",
                "conclusiones": "Se adopta el caudal calculado como caudal de diseño.",
            }
        else:
            return {
                "objeto": "Determination of design discharge for the proposed infrastructure.",
                "descripcion_cuenca": f"Basin of {calculation_data.get('area_km2', 0):.2f} km² located near {calculation_data.get('city', '')}.",
                "metodologia": "The selected method was applied for the basin characteristics.",
                "analisis_resultados": f"The calculated peak discharge is {calculation_data.get('peak_flow_m3s', 0):.3f} m³/s.",
                "conclusiones": "The calculated discharge is adopted as the design discharge.",
            }

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    system = _SYSTEM_ES if language == "es" else _SYSTEM_EN
    prompt = _build_report_sections_prompt(calculation_data, language)

    message = client.messages.create(
        model=_MODEL,
        max_tokens=2000,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_report_sections(message.content[0].text, language)
