from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.services.report_service import MemoriaCalculoGenerator
from app.services.docx_service import MemoriaCalculoDocxGenerator
from app.services.excel_service import ExcelReportGenerator
from app.services.ai_service import generate_report_sections
from app.services.hydraulic_report_service import ManningReportGenerator, CulvertReportGenerator
from app.services.proyecto_report_service import ProyectoReportGenerator

router = APIRouter()


class ReportRequest(BaseModel):
    calculationData: dict
    projectName: str = Field(default="Proyecto Hidrológico", max_length=100)
    location: Optional[str] = Field(default=None, max_length=200)
    clientName: Optional[str] = Field(default=None, max_length=100)
    language: str = Field(default="es", max_length=10)
    aiInterpretation: str = Field(default="", max_length=10000)
    fetchAISections: bool = True
    basinPolygon: Optional[list] = None
    comparisonData: Optional[dict] = None


@router.post("/report")
def generate_report(req: ReportRequest) -> StreamingResponse:
    """
    Generate PDF Memoria de Cálculo Hidrológico.
    """
    location = req.location or req.calculationData.get("city", "Argentina")

    # Optionally fetch AI-generated section text
    ai_sections: dict = {}
    if req.fetchAISections:
        try:
            ai_sections = generate_report_sections(
                {**req.calculationData, "language": req.language},
                language=req.language,
            )
        except Exception:
            # Non-fatal — report generates with placeholder text
            ai_sections = {}

    try:
        generator = MemoriaCalculoGenerator(
            project_name=req.projectName,
            location=location,
            client=req.clientName,
            language=req.language,
        )

        buffer = generator.generate(
            calculation_data=req.calculationData,
            ai_interpretation=req.aiInterpretation,
            ai_recommendations=ai_sections,
            basin_polygon=req.basinPolygon,
            comparison_data=req.comparisonData,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el PDF: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in req.projectName[:40]
    ).strip()
    filename = f"memoria_calculo_{safe_name}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class DocxReportRequest(BaseModel):
    calculationData: dict
    projectName: str = Field(default="Proyecto Hidrológico", max_length=100)
    location: Optional[str] = Field(default=None, max_length=200)
    clientName: Optional[str] = Field(default=None, max_length=100)
    language: str = Field(default="es", max_length=10)
    aiInterpretation: str = Field(default="", max_length=10000)
    fetchAISections: bool = True
    basinPolygon: Optional[list] = None


@router.post("/report/docx")
def generate_report_docx(req: DocxReportRequest) -> StreamingResponse:
    """
    Generate Word (.docx) Memoria de Cálculo Hidrológico.
    """
    location = req.location or req.calculationData.get("city", "Argentina")

    ai_sections: dict = {}
    if req.fetchAISections:
        try:
            ai_sections = generate_report_sections(
                {**req.calculationData, "language": req.language},
                language=req.language,
            )
        except Exception:
            ai_sections = {}

    try:
        generator = MemoriaCalculoDocxGenerator(
            project_name=req.projectName,
            location=location,
            client=req.clientName,
            language=req.language,
        )

        buffer = generator.generate(
            calculation_data=req.calculationData,
            ai_interpretation=req.aiInterpretation,
            ai_recommendations=ai_sections,
            basin_polygon=req.basinPolygon,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el Word: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in req.projectName[:40]
    ).strip()
    filename = f"memoria_calculo_{safe_name}.docx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class ExcelReportRequest(BaseModel):
    calculationData: dict
    projectName: str = Field(default="Proyecto Hidrológico", max_length=100)
    location: Optional[str] = Field(default=None, max_length=200)
    clientName: Optional[str] = Field(default=None, max_length=100)


@router.post("/report/excel")
def generate_report_excel(req: ExcelReportRequest) -> StreamingResponse:
    """
    Generate Excel (.xlsx) Memoria de Cálculo Hidrológico.
    """
    location = req.location or req.calculationData.get("city", "Argentina")

    try:
        generator = ExcelReportGenerator(
            project_name=req.projectName,
            location=location,
            client=req.clientName,
        )
        buffer = generator.generate(calculation_data=req.calculationData)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el Excel: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in req.projectName[:40]
    ).strip()
    filename = f"memoria_calculo_{safe_name}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class ManningReportRequest(BaseModel):
    params: dict = Field(default_factory=dict)
    result: dict
    projectName: str = Field(default="Proyecto Hidráulico", max_length=100)
    location: str = Field(default="Argentina", max_length=200)
    clientName: Optional[str] = Field(default=None, max_length=100)


@router.post("/report/manning-pdf")
def generate_manning_pdf(req: ManningReportRequest) -> StreamingResponse:
    """
    Generate PDF Memoria de Cálculo Hidráulico for a Manning channel calculation.
    """
    try:
        generator = ManningReportGenerator(
            project_name=req.projectName,
            location=req.location,
            client=req.clientName,
        )
        buffer = generator.generate(params=req.params, result=req.result)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el PDF: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in req.projectName[:40]
    ).strip()
    filename = f"memoria_hidraulica_manning_{safe_name}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class ProyectoReportRequest(BaseModel):
    proyectoData: dict
    projectName: str = Field(default="Proyecto Hidráulico", max_length=100)
    comitente: str = Field(default="", max_length=100)
    profesional: str = Field(default="", max_length=100)
    fecha: str = Field(default="", max_length=50)
    notas: str = Field(default="", max_length=2000)


@router.post("/report/proyecto-pdf")
def generate_proyecto_pdf(req: ProyectoReportRequest) -> StreamingResponse:
    """
    Generate consolidated PDF Memoria de Cálculo Hidrológico-Hidráulica.
    """
    try:
        generator = ProyectoReportGenerator(
            project_name=req.projectName,
            comitente=req.comitente,
            profesional=req.profesional,
            fecha=req.fecha,
            notas=req.notas,
        )
        buffer = generator.generate(req.proyectoData)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el PDF: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in req.projectName[:40]
    ).strip()
    filename = f"memoria_proyecto_{safe_name}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class CulvertReportRequest(BaseModel):
    result: dict
    projectName: str = Field(default="Proyecto Hidráulico", max_length=100)
    location: str = Field(default="Argentina", max_length=200)
    clientName: Optional[str] = Field(default=None, max_length=100)


@router.post("/report/culvert-pdf")
def generate_culvert_pdf(req: CulvertReportRequest) -> StreamingResponse:
    """
    Generate PDF Memoria de Cálculo Hidráulico for a culvert sizing calculation.
    """
    try:
        generator = CulvertReportGenerator(
            project_name=req.projectName,
            location=req.location,
            client=req.clientName,
        )
        buffer = generator.generate(result=req.result)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el PDF: {str(exc)}",
        ) from exc

    safe_name = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in req.projectName[:40]
    ).strip()
    filename = f"memoria_hidraulica_alcantarilla_{safe_name}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
