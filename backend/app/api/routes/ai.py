from fastapi import APIRouter, HTTPException
from app.services.ai_service import generate_interpretation, generate_report_sections
from app.services.chat_service import chat_with_engineer

router = APIRouter()


@router.post("/interpret")
def interpret(payload: dict) -> dict:
    """
    Generate AI interpretation of hydrological calculation results.
    Requires ANTHROPIC_API_KEY to be configured.
    """
    language = payload.get("language", "es")
    try:
        interpretation = generate_interpretation(payload, language)
        return {"interpretation": interpretation}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar interpretación IA: {str(exc)}",
        ) from exc


@router.post("/interpret/report-sections")
def interpret_report_sections(payload: dict) -> dict:
    """
    Generate structured AI sections for the PDF report.
    Returns keys: objeto, descripcion_cuenca, metodologia, analisis_resultados, conclusiones.
    """
    language = payload.get("language", "es")
    try:
        sections = generate_report_sections(payload, language)
        return {"sections": sections}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar secciones del informe: {str(exc)}",
        ) from exc


@router.post("/chat")
def engineer_chat(payload: dict) -> dict:
    """
    Chat with the AI hydrology engineer (Claude Haiku).

    Request body:
        message: user's question (str)
        context: optional HydrologyResult dict for context-aware responses
        history: optional list of prior turns [{"role": "user"|"assistant", "content": "..."}]

    Response:
        { "response": "AI answer text" }
    """
    message = payload.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=422, detail="message is required")

    context = payload.get("context")
    history = payload.get("history", [])

    try:
        response_text = chat_with_engineer(
            message=message,
            context=context,
            history=history,
        )
        return {"response": response_text}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el chat IA: {str(exc)}",
        ) from exc
