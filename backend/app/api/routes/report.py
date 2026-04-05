from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services.report_service import MemoriaCalculoGenerator
from app.services.docx_service import MemoriaCalculoDocxGenerator
from app.services.excel_service import ExcelReportGenerator
from app.services.ai_service import generate_report_sections
from app.services.hydraulic_report_service import ManningReportGenerator, CulvertReportGenerator
from app.services.proyecto_report_service import ProyectoReportGenerator

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
    basin_polygon = payload.get("basinPolygon")  # list of [lat, lng] or None
    comparison_data = payload.get("comparisonData")  # optional second scenario

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
            basin_polygon=basin_polygon,
            comparison_data=comparison_data,
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
    basin_polygon = payload.get("basinPolygon")  # list of [lat, lng] or None

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
            basin_polygon=basin_polygon,
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


@router.post("/report/excel")
def generate_report_excel(payload: dict) -> StreamingResponse:
    """
    Generate Excel (.xlsx) Memoria de Cálculo Hidrológico.

    Accepts the same request body as POST /report (PDF).
    Returns a professional multi-sheet workbook.
    """
    calculation_data = payload.get("calculationData", {})
    project_name = payload.get("projectName", "Proyecto Hidrológico")
    location = payload.get("location", calculation_data.get("city", "Argentina"))
    client_name = payload.get("clientName")

    if not calculation_data:
        raise HTTPException(status_code=422, detail="calculationData is required")

    try:
        generator = ExcelReportGenerator(
            project_name=project_name,
            location=location,
            client=client_name,
        )
        buffer = generator.generate(calculation_data=calculation_data)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el Excel: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in project_name[:40]
    ).strip()
    filename = f"memoria_calculo_{safe_name}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/report/manning-pdf")
def generate_manning_pdf(payload: dict) -> StreamingResponse:
    """
    Generate PDF Memoria de Cálculo Hidráulico for a Manning channel calculation.

    Request body:
        params: channel input parameters (channel_type, manning_n, slope, dimensions, etc.)
        result: calculation result (flow_m3s, velocity_ms, area_m2, etc.)
        projectName: project name
        location: location description
        clientName: optional client name
    """
    params = payload.get("params", {})
    result = payload.get("result", {})
    project_name = payload.get("projectName", "Proyecto Hidráulico")
    location = payload.get("location", "Argentina")
    client_name = payload.get("clientName")

    if not result:
        raise HTTPException(status_code=422, detail="result is required")

    try:
        generator = ManningReportGenerator(
            project_name=project_name,
            location=location,
            client=client_name,
        )
        buffer = generator.generate(params=params, result=result)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el PDF: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in project_name[:40]
    ).strip()
    filename = f"memoria_hidraulica_manning_{safe_name}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/report/proyecto-pdf")
def generate_proyecto_pdf(payload: dict) -> StreamingResponse:
    """
    Generate consolidated PDF Memoria de Cálculo Hidrológico-Hidráulica.

    Request body:
        proyectoData: full ProyectoHidraulico object (paso1..paso6)
        projectName: project name for cover page
        comitente: client/company name
        profesional: responsible engineer
        fecha: date string
        notas: optional notes
    """
    proyecto_data = payload.get("proyectoData", {})
    project_name = payload.get("projectName", "Proyecto Hidráulico")
    comitente = payload.get("comitente", "")
    profesional = payload.get("profesional", "")
    fecha = payload.get("fecha", "")
    notas = payload.get("notas", "")

    try:
        generator = ProyectoReportGenerator(
            project_name=project_name,
            comitente=comitente,
            profesional=profesional,
            fecha=fecha,
            notas=notas,
        )
        buffer = generator.generate(proyecto_data)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el PDF: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in project_name[:40]
    ).strip()
    filename = f"memoria_proyecto_{safe_name}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/report/culvert-pdf")
def generate_culvert_pdf(payload: dict) -> StreamingResponse:
    """
    Generate PDF Memoria de Cálculo Hidráulico for a culvert sizing calculation.

    Request body:
        result: culvert calculation result (design_flow_m3s, recommended, alternatives, etc.)
        projectName: project name
        location: location description
        clientName: optional client name
    """
    result = payload.get("result", {})
    project_name = payload.get("projectName", "Proyecto Hidráulico")
    location = payload.get("location", "Argentina")
    client_name = payload.get("clientName")

    if not result:
        raise HTTPException(status_code=422, detail="result is required")

    try:
        generator = CulvertReportGenerator(
            project_name=project_name,
            location=location,
            client=client_name,
        )
        buffer = generator.generate(result=result)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el PDF: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in project_name[:40]
    ).strip()
    filename = f"memoria_hidraulica_alcantarilla_{safe_name}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
