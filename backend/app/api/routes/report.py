from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services.report_service import MemoriaCalculoGenerator
from app.services.docx_service import MemoriaCalculoDocxGenerator
from app.services.ai_service import generate_report_sections

router = APIRouter()


@router.post("/report")
def generate_report(payload: dict) -> StreamingResponse:
    """
    Generate PDF Memoria de Cálculo Hidrológico.

    Request body:
        calculationData: full CalculationResponse dict
        projectName: project name for cover page
        location: location description
        clientName: optional client name
        language: "es" | "en"
        aiInterpretation: optional pre-generated AI interpretation text
        fetchAISections: if true, calls Claude to generate report text sections
    """
    calculation_data = payload.get("calculationData", {})
    project_name = payload.get("projectName", "Proyecto Hidrológico")
    location = payload.get("location", calculation_data.get("city", "Argentina"))
    client_name = payload.get("clientName")
    language = payload.get("language", "es")
    ai_interpretation = payload.get("aiInterpretation", "")
    fetch_ai = payload.get("fetchAISections", True)

    if not calculation_data:
        raise HTTPException(
            status_code=422, detail="calculationData is required"
        )

    # Optionally fetch AI-generated section text
    ai_sections: dict = {}
    if fetch_ai:
        try:
            ai_sections = generate_report_sections(
                {**calculation_data, "language": language},
                language=language,
            )
        except Exception:
            # Non-fatal — report generates with placeholder text
            ai_sections = {}

    try:
        generator = MemoriaCalculoGenerator(
            project_name=project_name,
            location=location,
            client=client_name,
            language=language,
        )

        buffer = generator.generate(
            calculation_data=calculation_data,
            ai_interpretation=ai_interpretation,
            ai_recommendations=ai_sections,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el PDF: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in project_name[:40]
    ).strip()
    filename = f"memoria_calculo_{safe_name}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/report/docx")
def generate_report_docx(payload: dict) -> StreamingResponse:
    """
    Generate Word (.docx) Memoria de Cálculo Hidrológico.

    Accepts the same request body as POST /report (PDF).
    """
    calculation_data = payload.get("calculationData", {})
    project_name = payload.get("projectName", "Proyecto Hidrológico")
    location = payload.get("location", calculation_data.get("city", "Argentina"))
    client_name = payload.get("clientName")
    language = payload.get("language", "es")
    ai_interpretation = payload.get("aiInterpretation", "")
    fetch_ai = payload.get("fetchAISections", True)

    if not calculation_data:
        raise HTTPException(status_code=422, detail="calculationData is required")

    ai_sections: dict = {}
    if fetch_ai:
        try:
            ai_sections = generate_report_sections(
                {**calculation_data, "language": language},
                language=language,
            )
        except Exception:
            ai_sections = {}

    try:
        generator = MemoriaCalculoDocxGenerator(
            project_name=project_name,
            location=location,
            client=client_name,
            language=language,
        )

        buffer = generator.generate(
            calculation_data=calculation_data,
            ai_interpretation=ai_interpretation,
            ai_recommendations=ai_sections,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el Word: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in project_name[:40]
    ).strip()
    filename = f"memoria_calculo_{safe_name}.docx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
