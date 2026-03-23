from fastapi import APIRouter, HTTPException
from app.services.ai_service import generate_interpretation, generate_report_sections

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
