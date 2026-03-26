"""
Hydraulic calculation PDF report generator for AutoHydro Argentina.

Generates professional PDF memorias de cálculo for:
  - Manning channel calculations
  - Culvert (alcantarilla) sizing calculations

Uses ReportLab (same dependency as report_service.py).
"""

from io import BytesIO
from datetime import datetime
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas as rl_canvas

# ── Brand colours ─────────────────────────────────────────────────────────────
_NAVY = colors.HexColor("#1a365d")
_BLUE = colors.HexColor("#2563eb")
_LIGHT_BLUE = colors.HexColor("#dbeafe")
_GRAY = colors.HexColor("#6b7280")
_LIGHT_GRAY = colors.HexColor("#f3f4f6")
_GREEN = colors.HexColor("#16a34a")
_RED = colors.HexColor("#dc2626")
_ORANGE = colors.HexColor("#d97706")

PAGE_W, PAGE_H = A4


# ── Shared page callback ──────────────────────────────────────────────────────

def _make_page_callback(project_name: str, report_type: str):
    def on_page(canv: rl_canvas.Canvas, doc):
        canv.saveState()
        # Footer bar
        canv.setFillColor(_NAVY)
        canv.rect(0, 0, PAGE_W, 1.2 * cm, fill=1, stroke=0)
        canv.setFillColor(colors.white)
        canv.setFont("Helvetica", 7)
        canv.drawString(1.5 * cm, 0.4 * cm, f"AutoHydro Argentina — {report_type}")
        canv.drawRightString(
            PAGE_W - 1.5 * cm, 0.4 * cm,
            f"{project_name}  |  Pág. {doc.page}  |  {datetime.now().strftime('%d/%m/%Y')}",
        )
        canv.restoreState()
    return on_page


# ── Style factory ─────────────────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=22,
            textColor=colors.white, alignment=TA_CENTER, spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"],
            fontName="Helvetica", fontSize=12,
            textColor=colors.HexColor("#bfdbfe"), alignment=TA_CENTER, spaceAfter=4,
        ),
        "section": ParagraphStyle(
            "section", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=11,
            textColor=_NAVY, spaceBefore=14, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"],
            fontName="Helvetica", fontSize=9,
            textColor=colors.HexColor("#374151"), leading=14, spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "small", parent=base["Normal"],
            fontName="Helvetica", fontSize=7.5,
            textColor=_GRAY, spaceAfter=2,
        ),
        "formula": ParagraphStyle(
            "formula", parent=base["Normal"],
            fontName="Helvetica-Oblique", fontSize=9,
            textColor=_BLUE, leftIndent=12, spaceAfter=4,
        ),
    }


# ── Shared table style ────────────────────────────────────────────────────────

def _param_table(data: list[list], col_widths=None) -> Table:
    if col_widths is None:
        col_widths = [10 * cm, 6 * cm]
    tbl = Table(data, colWidths=col_widths)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ]))
    return tbl


def _result_table(data: list[list], highlight_row: int = -1) -> Table:
    col_widths = [10 * cm, 6 * cm]
    tbl = Table(data, colWidths=col_widths)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), _BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _LIGHT_BLUE]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ]
    if highlight_row > 0:
        style += [
            ("BACKGROUND", (0, highlight_row), (-1, highlight_row), colors.HexColor("#bbf7d0")),
            ("FONTNAME", (0, highlight_row), (-1, highlight_row), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, highlight_row), (-1, highlight_row), _GREEN),
        ]
    tbl.setStyle(TableStyle(style))
    return tbl


# ── Cover page helpers ────────────────────────────────────────────────────────

def _cover_block(canv: rl_canvas.Canvas, project_name: str, subtitle: str,
                 location: str, client: str | None, date_str: str):
    """Draw a cover page using direct canvas operations."""
    # Navy header band
    canv.setFillColor(_NAVY)
    canv.rect(0, PAGE_H - 8 * cm, PAGE_W, 8 * cm, fill=1, stroke=0)

    # Blue accent stripe
    canv.setFillColor(_BLUE)
    canv.rect(0, PAGE_H - 8 * cm - 0.4 * cm, PAGE_W, 0.4 * cm, fill=1, stroke=0)

    # AutoHydro brand
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 11)
    canv.drawCentredString(PAGE_W / 2, PAGE_H - 2.5 * cm, "AutoHydro Argentina")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(colors.HexColor("#93c5fd"))
    canv.drawCentredString(PAGE_W / 2, PAGE_H - 3.3 * cm, "Plataforma Integral de Hidrología e Hidráulica")

    # Report title
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 18)
    # Wrap long project name
    max_w = PAGE_W - 4 * cm
    title = "MEMORIA DE CÁLCULO HIDRÁULICO"
    canv.drawCentredString(PAGE_W / 2, PAGE_H - 5.0 * cm, title)
    canv.setFont("Helvetica", 13)
    canv.setFillColor(colors.HexColor("#bfdbfe"))
    canv.drawCentredString(PAGE_W / 2, PAGE_H - 6.2 * cm, subtitle)

    # Info box
    box_y = PAGE_H - 13.5 * cm
    canv.setFillColor(_LIGHT_GRAY)
    canv.roundRect(2 * cm, box_y, PAGE_W - 4 * cm, 4.5 * cm, 6, fill=1, stroke=0)

    canv.setFont("Helvetica-Bold", 9)
    canv.setFillColor(_NAVY)
    canv.drawString(3 * cm, box_y + 3.6 * cm, "Proyecto:")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(colors.HexColor("#374151"))
    canv.drawString(6 * cm, box_y + 3.6 * cm, project_name[:60])

    canv.setFont("Helvetica-Bold", 9)
    canv.setFillColor(_NAVY)
    canv.drawString(3 * cm, box_y + 2.8 * cm, "Ubicación:")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(colors.HexColor("#374151"))
    canv.drawString(6 * cm, box_y + 2.8 * cm, location[:60])

    if client:
        canv.setFont("Helvetica-Bold", 9)
        canv.setFillColor(_NAVY)
        canv.drawString(3 * cm, box_y + 2.0 * cm, "Cliente:")
        canv.setFont("Helvetica", 9)
        canv.setFillColor(colors.HexColor("#374151"))
        canv.drawString(6 * cm, box_y + 2.0 * cm, client[:60])

    canv.setFont("Helvetica-Bold", 9)
    canv.setFillColor(_NAVY)
    canv.drawString(3 * cm, box_y + 1.2 * cm, "Fecha:")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(colors.HexColor("#374151"))
    canv.drawString(6 * cm, box_y + 1.2 * cm, date_str)

    # Disclaimer
    canv.setFont("Helvetica-Oblique", 7.5)
    canv.setFillColor(_GRAY)
    canv.drawCentredString(
        PAGE_W / 2, 3.5 * cm,
        "Generado con AutoHydro Argentina — Para proyectos definitivos verificar con estudios hidrológicos locales."
    )
    # Navy footer
    canv.setFillColor(_NAVY)
    canv.rect(0, 0, PAGE_W, 1.5 * cm, fill=1, stroke=0)
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica", 7)
    canv.drawCentredString(PAGE_W / 2, 0.5 * cm, "AutoHydro Argentina | autohydro.com.ar | Ing. Ammar Mahfoud")


# ══════════════════════════════════════════════════════════════════════════════
# Manning PDF Generator
# ══════════════════════════════════════════════════════════════════════════════

class ManningReportGenerator:
    def __init__(self, project_name: str, location: str, client: str | None = None):
        self.project_name = project_name
        self.location = location
        self.client = client

    def generate(self, params: dict[str, Any], result: dict[str, Any]) -> BytesIO:
        buffer = BytesIO()
        S = _styles()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=2 * cm,
            rightMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2.5 * cm,
        )

        on_page = _make_page_callback(
            self.project_name, "Cálculo Hidráulico — Manning"
        )

        story = []
        date_str = datetime.now().strftime("%d de %B de %Y")

        # ── Cover page (canvas-drawn, separate first page) ───────────────────
        # We use a FirstPage callback trick: embed cover data in the story as
        # a custom flowable by doing it inline.

        # Build cover inline via an initial KeepTogether block that fills page
        story.append(Spacer(1, 0.5 * cm))

        # ── Section 1: Object ─────────────────────────────────────────────
        story.append(Paragraph("1. Objeto del Estudio", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))
        story.append(Paragraph(
            f"El presente documento constituye la memoria de cálculo hidráulico correspondiente "
            f"al dimensionamiento o verificación de un canal mediante la ecuación de Manning. "
            f"El proyecto denominado <b>{self.project_name}</b> se localiza en <b>{self.location}</b>.",
            S["body"]
        ))

        # ── Section 2: Input data ─────────────────────────────────────────
        story.append(Paragraph("2. Datos de Entrada", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))

        ch = params.get("channel_type", "rectangular")
        ch_labels = {
            "rectangular": "Rectangular",
            "trapezoidal": "Trapezoidal",
            "circular": "Circular",
            "triangular": "Triangular",
        }

        input_data = [["Parámetro", "Valor"]]
        input_data.append(["Tipo de sección", ch_labels.get(ch, ch)])
        input_data.append(["Coeficiente de Manning (n)", str(params.get("manning_n", "—"))])
        input_data.append(["Pendiente longitudinal (S)", f"{params.get('slope', 0):.5f} m/m"])

        if ch == "rectangular":
            input_data.append(["Ancho de base (b)", f"{params.get('width', 0):.3f} m"])
            input_data.append(["Tirante normal (y)", f"{params.get('depth', 0):.3f} m"])
        elif ch == "trapezoidal":
            input_data.append(["Ancho de fondo (b)", f"{params.get('bottom_width', 0):.3f} m"])
            input_data.append(["Tirante normal (y)", f"{params.get('depth', 0):.3f} m"])
            input_data.append(["Talud lateral (z)", f"{params.get('side_slope', 0):.2f} (z:1)"])
        elif ch == "circular":
            input_data.append(["Diámetro (D)", f"{params.get('diameter', 0):.3f} m"])
            input_data.append(["Tirante (y)", f"{params.get('depth', 0):.3f} m"])
        elif ch == "triangular":
            input_data.append(["Talud lateral (z)", f"{params.get('side_slope', 0):.2f} (z:1)"])
            input_data.append(["Tirante (y)", f"{params.get('depth', 0):.3f} m"])

        if params.get("design_flow"):
            input_data.append(["Caudal de diseño (Q_diseño)", f"{params['design_flow']:.3f} m³/s"])
        if params.get("lining_type"):
            input_data.append(["Material de revestimiento", params["lining_type"]])

        story.append(_param_table(input_data))

        # ── Section 3: Methodology ─────────────────────────────────────────
        story.append(Paragraph("3. Metodología", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))
        story.append(Paragraph(
            "Se aplica la <b>ecuación de Manning</b> para flujo uniforme en canales a superficie libre:",
            S["body"]
        ))
        story.append(Paragraph("Q = (1/n) × A × R<sup>2/3</sup> × S<sup>1/2</sup>", S["formula"]))
        story.append(Paragraph(
            "Donde: Q = caudal [m³/s], n = coeficiente de rugosidad de Manning [adimensional], "
            "A = área mojada [m²], R = radio hidráulico = A/P [m], P = perímetro mojado [m], "
            "S = pendiente longitudinal [m/m].",
            S["body"]
        ))
        story.append(Paragraph(
            "El número de Froude se calcula como: Fr = V / √(g × D<sub>h</sub>), "
            "donde D<sub>h</sub> = A/T es la profundidad hidráulica y T es el ancho superficial.",
            S["body"]
        ))

        # ── Section 4: Calculated results ─────────────────────────────────
        story.append(Paragraph("4. Resultados del Cálculo", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))

        res_data = [["Parámetro hidráulico", "Resultado"]]
        res_data.append(["Caudal (Q)", f"{result.get('flow_m3s', 0):.4f} m³/s"])
        res_data.append(["Velocidad media (V)", f"{result.get('velocity_ms', 0):.3f} m/s"])
        res_data.append(["Área mojada (A)", f"{result.get('area_m2', 0):.4f} m²"])
        res_data.append(["Perímetro mojado (P)", f"{result.get('wetted_perimeter_m', 0):.4f} m"])
        res_data.append(["Radio hidráulico (R)", f"{result.get('hydraulic_radius_m', 0):.4f} m"])
        if result.get("top_width_m") is not None:
            res_data.append(["Espejo de agua (T)", f"{result['top_width_m']:.4f} m"])
        if result.get("froude") is not None:
            res_data.append(["Número de Froude (Fr)", f"{result['froude']:.3f}"])
        res_data.append(["Régimen de flujo", result.get("flow_regime_label", "—")])

        story.append(_result_table(res_data))

        # Design check
        dc = result.get("design_check")
        if dc:
            story.append(Spacer(1, 0.3 * cm))
            ok = dc.get("sufficient", False)
            color = _GREEN if ok else _RED
            story.append(Paragraph(
                f"<b>Verificación de diseño:</b> Q<sub>diseño</sub> = {dc['design_flow_m3s']:.3f} m³/s — "
                f"Capacidad canal = {dc['channel_capacity_m3s']:.3f} m³/s — "
                f"<font color='{'green' if ok else 'red'}'><b>{'✓ CUMPLE' if ok else '✗ INSUFICIENTE'}</b></font> "
                f"({dc.get('margin_pct', 0):+.1f}%)",
                S["body"]
            ))

        # ── Section 5: Velocity checks ─────────────────────────────────────
        warnings = result.get("warnings", [])
        if warnings:
            story.append(Paragraph("5. Verificaciones de Velocidad", S["section"]))
            story.append(HRFlowable(width="100%", thickness=1, color=_ORANGE, spaceAfter=6))
            for w in warnings:
                story.append(Paragraph(f"⚠ {w}", S["body"]))
        else:
            story.append(Paragraph("5. Verificaciones", S["section"]))
            story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))
            story.append(Paragraph(
                "La velocidad calculada se encuentra dentro de los rangos admisibles. "
                "No se detectaron condiciones de erosión ni sedimentación.",
                S["body"]
            ))

        # ── Section 6: Conclusions ─────────────────────────────────────────
        story.append(Paragraph("6. Conclusiones y Recomendaciones", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))

        regime = result.get("flow_regime", "")
        regime_notes = {
            "subcritical": "El flujo subcrítico (lento) es adecuado para canales de riego y drenaje. "
                           "El control hidráulico se ejerce aguas abajo.",
            "critical": "El flujo crítico es inestable — se recomienda modificar la pendiente o sección para alejarse de esta condición.",
            "supercritical": "El flujo supercrítico (rápido) requiere estructuras de disipación de energía al final del canal.",
            "a_presion": "El conducto trabaja bajo presión. Verificar estanqueidad, anclajes y resistencia estructural.",
        }
        story.append(Paragraph(
            f"La sección calculada conduce un caudal de <b>Q = {result.get('flow_m3s', 0):.4f} m³/s</b> "
            f"con una velocidad media de <b>V = {result.get('velocity_ms', 0):.3f} m/s</b>. "
            f"{regime_notes.get(regime, '')}",
            S["body"]
        ))
        story.append(Paragraph(
            "Para diseños definitivos se recomienda verificar contra datos hidrológicos locales y normativa provincial vigente.",
            S["small"]
        ))

        # ── Build PDF ─────────────────────────────────────────────────────
        # First draw cover manually, then the story content

        def first_page(canv, doc):
            on_page(canv, doc)

        def later_pages(canv, doc):
            on_page(canv, doc)

        # Insert a cover page using canvas at build time via a frame override
        # We use a simpler approach: draw cover before building story

        buffer2 = BytesIO()
        from reportlab.pdfgen.canvas import Canvas as RLCanvas

        cover_buf = BytesIO()
        c = RLCanvas(cover_buf, pagesize=A4)
        _cover_block(
            c, self.project_name,
            f"Canal {ch_labels.get(ch, ch)} — Ecuación de Manning",
            self.location, self.client, date_str
        )
        c.showPage()
        c.save()

        # Build content pages
        content_buf = BytesIO()
        content_doc = SimpleDocTemplate(
            content_buf, pagesize=A4,
            leftMargin=2 * cm, rightMargin=2 * cm,
            topMargin=2 * cm, bottomMargin=2.5 * cm,
        )
        content_doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)

        # Merge cover + content
        from reportlab.lib.utils import ImageReader
        try:
            import pypdf
            cover_buf.seek(0)
            content_buf.seek(0)
            writer = pypdf.PdfWriter()
            for reader_buf in [cover_buf, content_buf]:
                reader = pypdf.PdfReader(reader_buf)
                for page in reader.pages:
                    writer.add_page(page)
            writer.write(buffer)
        except ImportError:
            # pypdf not available — return content only
            content_buf.seek(0)
            buffer.write(content_buf.read())

        buffer.seek(0)
        return buffer


# ══════════════════════════════════════════════════════════════════════════════
# Culvert PDF Generator
# ══════════════════════════════════════════════════════════════════════════════

class CulvertReportGenerator:
    def __init__(self, project_name: str, location: str, client: str | None = None):
        self.project_name = project_name
        self.location = location
        self.client = client

    def generate(self, result: dict[str, Any]) -> BytesIO:
        buffer = BytesIO()
        S = _styles()
        date_str = datetime.now().strftime("%d de %B de %Y")

        on_page = _make_page_callback(
            self.project_name, "Dimensionamiento de Alcantarilla"
        )

        story = []
        story.append(Spacer(1, 0.5 * cm))

        rec: dict = result.get("recommended", {})
        culvert_type = result.get("culvert_type", "circular")
        material = result.get("material_label", "Hormigón")
        inlet_label = result.get("inlet_label", "—")

        # ── Section 1: Object ─────────────────────────────────────────────
        story.append(Paragraph("1. Objeto del Estudio", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))
        story.append(Paragraph(
            f"El presente documento es la memoria de cálculo hidráulico para el dimensionamiento de "
            f"una alcantarilla tipo <b>{'conducto circular' if culvert_type == 'circular' else 'cajón rectangular'}</b> "
            f"en el proyecto <b>{self.project_name}</b>, ubicado en <b>{self.location}</b>.",
            S["body"]
        ))

        # ── Section 2: Input data ─────────────────────────────────────────
        story.append(Paragraph("2. Datos de Entrada", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))

        input_data = [["Parámetro", "Valor"]]
        input_data.append(["Caudal de diseño (Q)", f"{result.get('design_flow_m3s', 0):.3f} m³/s"])
        input_data.append(["Tipo de estructura", "Circular" if culvert_type == "circular" else "Cajón rectangular"])
        input_data.append(["Material", material])
        input_data.append(["Coeficiente de Manning (n)", str(result.get("manning_n", "—"))])
        input_data.append(["Longitud de alcantarilla (L)", f"{result.get('length_m', 0):.1f} m"])
        input_data.append(["Pendiente longitudinal (S)", f"{result.get('slope', 0):.5f} m/m"])
        input_data.append(["Tipo de entrada", inlet_label])
        input_data.append(["Tirante máximo admisible (HW máx.)", f"{result.get('headwater_max_m', 0):.2f} m"])

        story.append(_param_table(input_data))

        # ── Section 3: Methodology ─────────────────────────────────────────
        story.append(Paragraph("3. Metodología", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))
        story.append(Paragraph(
            "El cálculo se basa en la metodología <b>FHWA HDS-5</b> "
            "(Hydraulic Design of Highway Culverts, 3ª edición). "
            "Se evalúan dos condiciones de control:",
            S["body"]
        ))
        story.append(Paragraph(
            "• <b>Control de entrada (IC):</b> la capacidad está limitada por la boca de ingreso. "
            "HW se determina mediante los nomogramas FHWA (aproximación polinomial).",
            S["body"]
        ))
        story.append(Paragraph(
            "• <b>Control de salida (OC):</b> la capacidad está limitada por las condiciones aguas abajo. "
            "HW se calcula mediante la ecuación de energía: "
            "HW = H<sub>f</sub> + H<sub>e</sub> + H<sub>v</sub> − S·L",
            S["body"]
        ))
        story.append(Paragraph(
            "Se adopta el mayor valor de HW entre ambos controles (condición gobernante).",
            S["body"]
        ))

        # ── Section 4: Governing control ─────────────────────────────────
        story.append(Paragraph("4. Análisis de Control Gobernante", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))

        ctrl_data = [["Tamaño", "HW — IC (m)", "HW — OC (m)", "HW Gobernante (m)", "HW/D", "Control", "Estado"]]
        for alt in result.get("alternatives", []):
            is_rec = alt.get("label") == rec.get("label")
            ctrl_data.append([
                f"{'→ ' if is_rec else ''}{alt.get('label', '—')}",
                f"{alt.get('hw_ic_m', 0):.3f}",
                f"{alt.get('hw_oc_m', 0):.3f}",
                f"{alt.get('hw_m', 0):.3f}",
                f"{alt.get('hwd_ratio', 0):.2f}",
                "Entrada" if alt.get("control") == "inlet" else "Salida",
                "✓" if alt.get("ok") else "✗",
            ])

        tbl = Table(ctrl_data, colWidths=[3.5*cm, 2*cm, 2*cm, 2.5*cm, 1.5*cm, 2*cm, 1.5*cm])
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), _NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _LIGHT_GRAY]),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
        tbl.setStyle(TableStyle(style))
        story.append(tbl)

        # ── Section 5: Adopted design ─────────────────────────────────────
        story.append(Paragraph("5. Dimensión Adoptada", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))

        adopted_data = [["Parámetro de diseño", "Valor adoptado"]]
        adopted_data.append(["Tamaño recomendado", rec.get("label", "—")])
        adopted_data.append(["Tirante aguas arriba (HW)", f"{rec.get('hw_m', 0):.3f} m"])
        adopted_data.append(["Relación HW/D", f"{rec.get('hwd_ratio', 0):.2f}"])
        adopted_data.append(["Velocidad de salida", f"{rec.get('outlet_velocity_ms', 0):.2f} m/s"])
        adopted_data.append(["Control gobernante", "Entrada" if rec.get("control") == "inlet" else "Salida"])
        adopted_data.append(["Área de sección", f"{rec.get('area_m2', 0):.3f} m²"])
        adopted_data.append(["Cumple HW ≤ HW máx.", "Sí ✓" if rec.get("ok") else "No ✗"])

        story.append(_result_table(adopted_data, highlight_row=1))

        # ── Section 6: Conclusions ─────────────────────────────────────────
        story.append(Paragraph("6. Conclusiones", S["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=_BLUE, spaceAfter=6))
        ok = rec.get("ok", False)
        story.append(Paragraph(
            f"Para el caudal de diseño Q = <b>{result.get('design_flow_m3s', 0):.3f} m³/s</b> "
            f"se adopta una alcantarilla <b>{rec.get('label', '—')}</b> de {material} "
            f"con Ke = {result.get('ke', '—')} (entrada tipo: {inlet_label}). "
            f"El tirante de aguas arriba calculado es <b>HW = {rec.get('hw_m', 0):.3f} m</b> "
            f"({'✓ cumple' if ok else '✗ supera'} el límite admisible de {result.get('headwater_max_m', 0):.2f} m).",
            S["body"]
        ))
        story.append(Paragraph(
            "Para proyectos definitivos, validar contra normativa provincial y planos de obra. "
            "Verificar estabilidad de cabeceras y aletas ante acciones sísmicas y de crecida.",
            S["small"]
        ))

        # ── Build ─────────────────────────────────────────────────────────
        cover_buf = BytesIO()
        from reportlab.pdfgen.canvas import Canvas as RLCanvas
        c = RLCanvas(cover_buf, pagesize=A4)
        _cover_block(
            c, self.project_name,
            "Dimensionamiento de Alcantarilla — FHWA HDS-5",
            self.location, self.client, date_str
        )
        c.showPage()
        c.save()

        content_buf = BytesIO()
        content_doc = SimpleDocTemplate(
            content_buf, pagesize=A4,
            leftMargin=2 * cm, rightMargin=2 * cm,
            topMargin=2 * cm, bottomMargin=2.5 * cm,
        )
        content_doc.build(
            story,
            onFirstPage=on_page,
            onLaterPages=on_page,
        )

        try:
            import pypdf
            cover_buf.seek(0)
            content_buf.seek(0)
            writer = pypdf.PdfWriter()
            for reader_buf in [cover_buf, content_buf]:
                reader = pypdf.PdfReader(reader_buf)
                for page in reader.pages:
                    writer.add_page(page)
            writer.write(buffer)
        except ImportError:
            content_buf.seek(0)
            buffer.write(content_buf.read())

        buffer.seek(0)
        return buffer
