from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from app.core.limiter import limiter
from app.services.ai_service import generate_interpretation, generate_report_sections
from app.services.chat_service import chat_with_engineer

router = APIRouter()


class InterpretRequest(BaseModel):
    results: dict
    language: str = Field(default="es", max_length=10)
    locality_name: str = Field(default="", max_length=100)


class ReportSectionsRequest(BaseModel):
    results: dict
    language: str = Field(default="es", max_length=10)


class ChatMessage(BaseModel):
    role: str = Field(..., max_length=20)
    content: str = Field(..., max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    context: Optional[dict] = None
    history: list[ChatMessage] = Field(default=[], max_length=20)
    language: str = Field(default="es", max_length=10)


@router.post("/interpret")
@limiter.limit("5/minute")
async def interpret(request: Request, req: InterpretRequest) -> dict:
    """
    Generate AI interpretation of hydrological calculation results.
    Requires ANTHROPIC_API_KEY to be configured.
    """
    payload = {**req.results, "language": req.language, "locality_name": req.locality_name}
    try:
        interpretation = generate_interpretation(payload, req.language)
        return {"interpretation": interpretation}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar interpretación IA: {str(exc)}",
        ) from exc


@router.post("/interpret/report-sections")
@limiter.limit("5/minute")
async def interpret_report_sections(request: Request, req: ReportSectionsRequest) -> dict:
    """
    Generate structured AI sections for the PDF report.
    Returns keys: objeto, descripcion_cuenca, metodologia, analisis_resultados, conclusiones.
    """
    payload = {**req.results, "language": req.language}
    try:
        sections = generate_report_sections(payload, req.language)
        return {"sections": sections}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar secciones del informe: {str(exc)}",
        ) from exc


@router.post("/chat")
@limiter.limit("20/minute")
async def engineer_chat(request: Request, req: ChatRequest) -> dict:
    """
    Chat with the AI hydrology engineer (Claude Haiku).

    Request body:
        message: user's question (str, max 2000 chars)
        context: optional HydrologyResult dict for context-aware responses
        history: optional list of prior turns (max 20 entries)
        language: "es" | "en"

    Response:
        { "response": "AI answer text" }
    """
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="message is required")

    history = [{"role": m.role, "content": m.content} for m in req.history]

    try:
        response_text = chat_with_engineer(
            message=message,
            context=req.context,
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
