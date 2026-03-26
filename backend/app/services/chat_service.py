"""
Engineer AI Chat service for AutoHydro Argentina.
Uses Claude Haiku for cost-efficient interactive technical chat.
"""

from typing import Any, Optional
import anthropic
from app.core.config import settings

_MODEL = "claude-haiku-4-5-20251001"

_SYSTEM_PROMPT = (
    "Sos un ingeniero hidrólogo argentino experto. Respondés consultas técnicas "
    "sobre hidrología e hidráulica de forma clara y concisa. Usás terminología "
    "técnica argentina (INA, CIRSOC, SMN). Si te dan contexto de un cálculo, "
    "basás tu respuesta en esos datos específicos. Respondés en español rioplatense "
    "profesional. Máximo 200 palabras por respuesta."
)

_METHOD_NAMES = {
    "rational": "Racional",
    "modified_rational": "Racional Modificado",
    "scs_cn": "SCS-CN",
}
_RISK_LABELS = {
    "muy_bajo": "Muy Bajo", "bajo": "Bajo", "moderado": "Moderado",
    "alto": "Alto", "muy_alto": "Muy Alto",
}


def _build_context_block(context: dict[str, Any]) -> str:
    """Build a text block summarising the current calculation for the AI."""
    lines = ["[CONTEXTO DEL CÁLCULO ACTUAL]"]
    if context.get("city"):
        lines.append(f"Ciudad: {context['city']}, {context.get('province', '')}")
    if context.get("return_period"):
        lines.append(f"Período de retorno: T = {context['return_period']} años")
    if context.get("area_km2") is not None:
        lines.append(f"Área de cuenca: {context['area_km2']:.2f} km²")
    if context.get("length_km") is not None:
        lines.append(f"Longitud cauce: L = {context['length_km']:.2f} km")
    if context.get("slope") is not None:
        lines.append(f"Pendiente: S = {context['slope']:.4f} m/m")
    if context.get("intensity_mm_hr") is not None:
        lines.append(f"Intensidad IDF: i = {context['intensity_mm_hr']:.1f} mm/hr")
    if context.get("tc_adopted_minutes") is not None:
        lines.append(f"Tiempo de concentración: Tc = {context['tc_adopted_minutes']:.0f} min")
    if context.get("cn") is not None:
        lines.append(f"Número de Curva: CN = {context['cn']:.1f}")
    if context.get("runoff_coeff") is not None:
        lines.append(f"Coeficiente de escorrentía: C = {context['runoff_coeff']:.2f}")
    if context.get("method"):
        lines.append(f"Método: {_METHOD_NAMES.get(context['method'], context['method'])}")
    if context.get("peak_flow_m3s") is not None:
        lines.append(f"Caudal pico: Q = {context['peak_flow_m3s']:.3f} m³/s")
    if context.get("specific_flow_m3s_km2") is not None:
        lines.append(f"Caudal específico: q = {context['specific_flow_m3s_km2']:.4f} m³/s/km²")
    if context.get("risk_level"):
        lines.append(f"Nivel de riesgo: {_RISK_LABELS.get(context['risk_level'], context['risk_level'])}")
    if context.get("infrastructure_type"):
        lines.append(f"Infraestructura: {context['infrastructure_type'].replace('_', ' ')}")
    return "\n".join(lines)


def chat_with_engineer(
    message: str,
    context: Optional[dict[str, Any]] = None,
    history: Optional[list[dict[str, str]]] = None,
) -> str:
    """
    Generate a response from the AI hydrology engineer (Claude Haiku).

    Args:
        message: User's question
        context: Optional HydrologyResult dict providing calculation context
        history: Previous chat turns [{"role": "user"|"assistant", "content": "..."}]

    Returns:
        AI response string (max ~200 words)
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY no configurada.")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Build messages list from history
    messages: list[dict[str, str]] = list(history or [])

    # Embed context inside the user message when provided
    if context:
        context_block = _build_context_block(context)
        user_content = f"{message}\n\n{context_block}"
    else:
        user_content = message

    messages.append({"role": "user", "content": user_content})

    response = client.messages.create(
        model=_MODEL,
        max_tokens=400,
        system=_SYSTEM_PROMPT,
        messages=messages,
    )

    return response.content[0].text
