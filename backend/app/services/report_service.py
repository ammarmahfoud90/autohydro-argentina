"""
PDF Memoria de Cálculo Hidrológico generator using ReportLab.

Produces a professional Argentine-standard hydrological calculation report.
"""

from io import BytesIO
from datetime import datetime
from typing import Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
    Image as RLImage,
)
from reportlab.pdfgen import canvas as rl_canvas
from app.services.map_image_service import generate_basin_map_image

# Brand colours
_NAVY = colors.HexColor("#1a365d")
_BLUE = colors.HexColor("#2563eb")
_LIGHT_BLUE = colors.HexColor("#dbeafe")
_GRAY = colors.HexColor("#6b7280")
_LIGHT_GRAY = colors.HexColor("#f3f4f6")
_RED = colors.HexColor("#dc2626")
_ORANGE = colors.HexColor("#d97706")
_GREEN = colors.HexColor("#16a34a")
_YELLOW = colors.HexColor("#ca8a04")

_RISK_COLORS = {
    "muy_bajo": _GREEN,
    "bajo": colors.HexColor("#65a30d"),
    "moderado": _YELLOW,
    "alto": _ORANGE,
    "muy_alto": _RED,
}

_RISK_LABELS_ES = {
    "muy_bajo": "MUY BAJO",
    "bajo": "BAJO",
    "moderado": "MODERADO",
    "alto": "ALTO",
    "muy_alto": "MUY ALTO",
}

_RISK_LABELS_EN = {
    "muy_bajo": "VERY LOW",
    "bajo": "LOW",
    "moderado": "MODERATE",
    "alto": "HIGH",
    "muy_alto": "VERY HIGH",
}

_METHOD_NAMES = {
    "rational": "Método Racional",
    "modified_rational": "Método Racional Modificado",
    "scs_cn": "Método SCS-CN (Soil Conservation Service)",
}

_INFRASTRUCTURE_NAMES = {
    "alcantarilla_menor": "Alcantarilla menor (< 1 m)",
    "alcantarilla_mayor": "Alcantarilla mayor (1–3 m)",
    "puente_menor": "Puente menor (3–10 m luz)",
    "puente_mayor": "Puente mayor (> 10 m luz)",
    "canal_urbano": "Canal urbano",
    "canal_rural": "Canal rural",
    "defensa_costera": "Defensa costera",
}


class MemoriaCalculoGenerator:
    """Generate professional hydrological calculation report PDF."""

    PAGE_W, PAGE_H = A4
    MARGIN = 2.5 * cm

    def __init__(
        self,
        project_name: str = "Proyecto Hidrológico",
        location: str = "Argentina",
        engineer_name: str = "Ing. Ammar Mahfoud",
        client: Optional[str] = None,
        language: str = "es",
    ):
        self.project_name = project_name
        self.location = location
        self.engineer_name = engineer_name
        self.client = client
        self.language = language
        self.styles = self._create_styles()

    # ── Styles ────────────────────────────────────────────────────────────

    def _create_styles(self) -> dict[str, ParagraphStyle]:
        base = getSampleStyleSheet()
        return {
            "cover_title": ParagraphStyle(
                "CoverTitle",
                fontSize=22,
                fontName="Helvetica-Bold",
                textColor=_NAVY,
                alignment=TA_CENTER,
                spaceAfter=6,
                leading=28,
            ),
            "cover_subtitle": ParagraphStyle(
                "CoverSubtitle",
                fontSize=13,
                fontName="Helvetica",
                textColor=_GRAY,
                alignment=TA_CENTER,
                spaceAfter=4,
            ),
            "h1": ParagraphStyle(
                "H1",
                fontSize=13,
                fontName="Helvetica-Bold",
                textColor=_NAVY,
                spaceBefore=18,
                spaceAfter=8,
                borderPad=4,
            ),
            "h2": ParagraphStyle(
                "H2",
                fontSize=11,
                fontName="Helvetica-Bold",
                textColor=_BLUE,
                spaceBefore=12,
                spaceAfter=6,
            ),
            "body": ParagraphStyle(
                "Body",
                fontSize=10,
                fontName="Helvetica",
                alignment=TA_JUSTIFY,
                spaceAfter=6,
                leading=15,
            ),
            "body_left": ParagraphStyle(
                "BodyLeft",
                fontSize=10,
                fontName="Helvetica",
                alignment=TA_LEFT,
                spaceAfter=4,
                leading=14,
            ),
            "table_header": ParagraphStyle(
                "TH",
                fontSize=9,
                fontName="Helvetica-Bold",
                textColor=colors.white,
                alignment=TA_CENTER,
            ),
            "table_cell": ParagraphStyle(
                "TC",
                fontSize=9,
                fontName="Helvetica",
                alignment=TA_CENTER,
                leading=12,
            ),
            "table_cell_left": ParagraphStyle(
                "TCL",
                fontSize=9,
                fontName="Helvetica",
                alignment=TA_LEFT,
                leading=12,
            ),
            "disclaimer": ParagraphStyle(
                "Disclaimer",
                fontSize=8,
                fontName="Helvetica-Oblique",
                textColor=_GRAY,
                alignment=TA_JUSTIFY,
                borderPad=6,
                leading=12,
            ),
            "footer": ParagraphStyle(
                "Footer",
                fontSize=8,
                fontName="Helvetica",
                textColor=_GRAY,
                alignment=TA_CENTER,
            ),
        }

    # ── Page template ──────────────────────────────────────────────────────

    def _add_page_decorations(self, c: rl_canvas.Canvas, doc: Any) -> None:
        """Add header bar, footer line, footer text and page number."""
        c.saveState()

        # Top accent bar
        c.setFillColor(_NAVY)
        c.rect(0, self.PAGE_H - 0.6 * cm, self.PAGE_W, 0.6 * cm, fill=1, stroke=0)

        # Footer line
        c.setStrokeColor(_NAVY)
        c.setLineWidth(0.5)
        c.line(self.MARGIN, 1.6 * cm, self.PAGE_W - self.MARGIN, 1.6 * cm)

        # Footer text — left
        c.setFont("Helvetica", 7.5)
        c.setFillColor(_GRAY)
        c.drawString(
            self.MARGIN,
            1.1 * cm,
            "Generado con AutoHydro Argentina — Desarrollado por Ing. Ammar Mahfoud",
        )

        # Page number — right
        c.drawRightString(
            self.PAGE_W - self.MARGIN,
            1.1 * cm,
            f"Página {doc.page}",
        )

        c.restoreState()

    # ── Cover page ─────────────────────────────────────────────────────────

    def _build_cover(self) -> list:
        S = self.styles
        story = []

        story.append(Spacer(1, 3 * cm))

        # Top rule
        story.append(
            HRFlowable(width="100%", thickness=3, color=_NAVY, spaceAfter=20)
        )

        story.append(
            Paragraph("MEMORIA DE CÁLCULO HIDROLÓGICO", S["cover_title"])
        )
        story.append(
            Paragraph("Análisis de Caudales de Diseño", S["cover_subtitle"])
        )

        story.append(Spacer(1, 0.5 * cm))
        story.append(
            HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=30)
        )

        story.append(Spacer(1, 1 * cm))
        story.append(
            Paragraph(f"<b>Proyecto:</b> {self.project_name}", S["cover_subtitle"])
        )
        story.append(Spacer(1, 0.3 * cm))
        story.append(
            Paragraph(f"<b>Ubicación:</b> {self.location}", S["cover_subtitle"])
        )

        story.append(Spacer(1, 3 * cm))

        # Info table
        rows = []
        if self.client:
            rows.append(["Comitente:", self.client])
        rows.append(["Profesional Responsable:", self.engineer_name])
        rows.append(["Fecha de emisión:", datetime.now().strftime("%d/%m/%Y")])
        rows.append(["Herramienta:", "AutoHydro Argentina v1.0"])

        tbl = Table(rows, colWidths=[6 * cm, 9 * cm])
        tbl.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                    ("ALIGN", (1, 0), (1, -1), "LEFT"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("TEXTCOLOR", (0, 0), (0, -1), _NAVY),
                ]
            )
        )
        story.append(tbl)

        story.append(Spacer(1, 2 * cm))
        story.append(
            HRFlowable(width="100%", thickness=3, color=_NAVY, spaceAfter=20)
        )

        # Disclaimer box
        disclaimer = (
            "AVISO: Esta memoria de cálculo ha sido generada con AutoHydro Argentina. "
            "Los coeficientes IDF utilizados son de carácter indicativo basados en la regionalización "
            "de Caamaño Nelli et al. (1999) e INA. Para diseños definitivos, verifique con los "
            "estudios hidrológicos locales más recientes y la normativa vigente aplicable."
        )
        story.append(Paragraph(disclaimer, S["disclaimer"]))

        return story

    # ── Table of contents ──────────────────────────────────────────────────

    def _build_toc(self) -> list:
        S = self.styles
        story = [Paragraph("ÍNDICE", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=12))

        toc_items = [
            ("1.", "Objeto del Estudio"),
            ("2.", "Descripción de la Cuenca"),
            ("3.", "Ubicación de la Cuenca"),
            ("4.", "Análisis Pluviométrico — Curvas IDF"),
            ("5.", "Tiempo de Concentración"),
            ("6.", "Metodología de Cálculo"),
            ("7.", "Cálculos y Resultados"),
            ("8.", "Análisis e Interpretación"),
            ("9.", "Conclusiones y Recomendaciones"),
            ("Anexo A.", "Planilla de Cálculo Detallada"),
        ]

        for num, title in toc_items:
            row = f"<b>{num}</b> {title}"
            story.append(Paragraph(row, S["body_left"]))

        return story

    # ── Section 1: Objeto ──────────────────────────────────────────────────

    def _build_section_objeto(self, ai_sections: dict[str, str]) -> list:
        S = self.styles
        story = [Paragraph("1. OBJETO DEL ESTUDIO", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        text = ai_sections.get("objeto") or (
            "El presente estudio tiene por objeto determinar el caudal máximo de diseño "
            "para la infraestructura hidrológica propuesta, mediante la aplicación de metodología "
            "hidrológica apropiada para las características de la cuenca de aporte."
        )
        story.append(Paragraph(text, S["body"]))
        return story

    # ── Section 2: Descripción de la cuenca ───────────────────────────────

    def _build_section_cuenca(
        self, data: dict[str, Any], ai_sections: dict[str, str]
    ) -> list:
        S = self.styles
        story = [Paragraph("2. DESCRIPCIÓN DE LA CUENCA", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        text = ai_sections.get("descripcion_cuenca") or ""
        if text:
            story.append(Paragraph(text, S["body"]))

        story.append(Paragraph("Parámetros morfométricos:", S["h2"]))

        morph_data = [
            ["Parámetro", "Valor", "Unidad"],
            ["Área de la cuenca (A)", f"{data['area_km2']:.3f}", "km²"],
            ["Longitud del cauce principal (L)", f"{data.get('length_km', '—')}", "km"],
            ["Pendiente media del cauce (S)", f"{data.get('slope', '—')}", "m/m"],
        ]
        if data.get("elevation_diff_m"):
            morph_data.append(["Desnivel total (H)", f"{data['elevation_diff_m']:.1f}", "m"])
        if data.get("avg_elevation_m"):
            morph_data.append(["Altura media sobre cierre (Hm)", f"{data['avg_elevation_m']:.1f}", "m"])

        tbl = self._make_table(morph_data)
        story.append(tbl)
        return story

    # ── Section 3: Ubicación de la cuenca ─────────────────────────────────

    def _build_section_ubicacion(
        self, basin_polygon: Optional[list[list[float]]]
    ) -> list:
        S = self.styles
        story = [Paragraph("3. UBICACIÓN DE LA CUENCA", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        if basin_polygon and len(basin_polygon) >= 3:
            img_bytes = generate_basin_map_image(basin_polygon, width=800, height=500)
            if img_bytes:
                img_buf = BytesIO(img_bytes)
                img = RLImage(img_buf, width=14 * cm, height=8.75 * cm)
                story.append(img)
                story.append(Spacer(1, 4))
                story.append(
                    Paragraph(
                        "Figura 1: Delimitación de la cuenca de estudio",
                        ParagraphStyle(
                            "Caption",
                            fontSize=9,
                            fontName="Helvetica-Oblique",
                            textColor=_GRAY,
                            alignment=TA_CENTER,
                            spaceAfter=6,
                        ),
                    )
                )
            else:
                story.append(
                    Paragraph(
                        "No fue posible generar la imagen del mapa. "
                        "Verificar la conexión a internet para cargar las teselas base.",
                        S["body"],
                    )
                )
        else:
            story.append(
                Paragraph(
                    "No se proporcionó delimitación cartográfica de la cuenca. "
                    "La ubicación fue definida mediante parámetros morfométricos ingresados manualmente.",
                    S["body"],
                )
            )
        return story

    # ── Section 4: IDF ────────────────────────────────────────────────────

    def _build_section_idf(self, data: dict[str, Any]) -> list:
        S = self.styles
        story = [Paragraph("4. ANÁLISIS PLUVIOMÉTRICO — CURVAS IDF", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        intro = (
            f"Los datos pluviométricos se obtuvieron de la estación de referencia "
            f"<b>{data['city']}</b> (provincia de {data.get('province', '')})."
        )
        story.append(Paragraph(intro, S["body"]))

        idf_verified = data.get("idf_verified", True)
        idf_source = data.get("idf_source", "—") if idf_verified else "Estimación regional (requiere validación local)"

        idf_data = [
            ["Parámetro", "Valor"],
            ["Estación de referencia", data["city"]],
            ["Fuente / Bibliografía", idf_source],
            ["Período de retorno (T)", f"{data['return_period']} años"],
            ["Duración de tormenta (t)", f"{data['duration_min']} minutos"],
            ["Intensidad de diseño (i)", f"{data['intensity_mm_hr']:.2f} mm/hr"],
        ]

        tbl = self._make_table(idf_data)
        story.append(tbl)

        if not idf_verified:
            story.append(Spacer(1, 0.3 * cm))
            story.append(
                Paragraph(
                    "<b>⚠ AVISO:</b> Los datos IDF para esta localidad son estimaciones regionales "
                    "interpoladas y no han sido validados contra registros pluviográficos locales. "
                    "Para diseños definitivos, verificar con registros locales del SMN/INA.",
                    S["body"],
                )
            )

        story.append(Spacer(1, 0.5 * cm))
        story.append(
            Paragraph(
                "<b>Fórmula IDF aplicada:</b>  i = (a × T<sup>b</sup>) / (t + c)<sup>d</sup>",
                S["body_left"],
            )
        )
        story.append(
            Paragraph(
                "donde i [mm/hr], T [años], t [minutos] y a, b, c, d son coeficientes regionales.",
                S["body"],
            )
        )
        return story

    # ── Section 4: Tc ─────────────────────────────────────────────────────

    def _build_section_tc(self, data: dict[str, Any]) -> list:
        S = self.styles
        story = [Paragraph("5. TIEMPO DE CONCENTRACIÓN (Tc)", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        intro = (
            f"Se calculó el tiempo de concentración mediante {len(data.get('tc_results', []))} "
            f"fórmula(s). El valor adoptado corresponde al promedio de los resultados obtenidos."
        )
        story.append(Paragraph(intro, S["body"]))

        tc_table_data = [["Fórmula", "Tc (hr)", "Tc (min)", "Aplicabilidad"]]
        for r in data.get("tc_results", []):
            tc_table_data.append([
                r["formulaName"],
                f"{r['tcHours']:.3f}",
                f"{r['tcMinutes']:.1f}",
                r["applicability"][:55] + "…" if len(r["applicability"]) > 55 else r["applicability"],
            ])

        # Adopted row
        tc_table_data.append([
            "TC ADOPTADO (promedio)",
            f"{data['tc_adopted_hours']:.3f}",
            f"{data['tc_adopted_minutes']:.1f}",
            "Valor de diseño",
        ])

        col_w = [4.5 * cm, 2 * cm, 2 * cm, 7.5 * cm]
        tbl = Table(tc_table_data, colWidths=col_w, repeatRows=1)
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), _NAVY),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                    ("ALIGN", (1, 0), (2, -1), "CENTER"),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("ALIGN", (3, 0), (3, -1), "LEFT"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, _LIGHT_GRAY]),
                    # Last row — adopted value highlight
                    ("BACKGROUND", (0, -1), (-1, -1), _LIGHT_BLUE),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.3, _GRAY),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(tbl)
        return story

    # ── Section 5: Metodología ─────────────────────────────────────────────

    def _build_section_metodologia(
        self, data: dict[str, Any], ai_sections: dict[str, str]
    ) -> list:
        S = self.styles
        story = [Paragraph("6. METODOLOGÍA DE CÁLCULO", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        method_name = _METHOD_NAMES.get(data.get("method", ""), data.get("method", ""))
        story.append(Paragraph(f"<b>Método seleccionado:</b> {method_name}", S["body_left"]))

        text = ai_sections.get("metodologia") or ""
        if text:
            story.append(Paragraph(text, S["body"]))

        # Formula display
        story.append(Paragraph("Fórmula aplicada:", S["h2"]))
        if data.get("method") == "rational":
            story.append(Paragraph("Q = C × i × A / 3.6", S["body_left"]))
            story.append(Paragraph("donde Q [m³/s], C [-], i [mm/hr], A [km²]", S["body"]))
        elif data.get("method") == "modified_rational":
            story.append(Paragraph("Q = C × i × A × K / 3.6", S["body_left"]))
            story.append(Paragraph("K = 1 − (A<sup>0.1</sup> − 1) / 7  (Témez)", S["body_left"]))
        elif data.get("method") == "scs_cn":
            story.append(Paragraph("S = 25400/CN − 254  |  Ia = λ × S  |  Q = (P−Ia)² / (P−Ia+S)", S["body_left"]))
            story.append(Paragraph("Qp = 0.208 × A × Q / Tp  |  Tp = 0.6 × Tc", S["body_left"]))
            lam = "0.05 (Pampa Húmeda)" if data.get("use_pampa_lambda") else "0.20 (estándar)"
            story.append(Paragraph(f"Abstracción inicial: λ = {lam}", S["body"]))

        return story

    # ── Section 6: Cálculos ────────────────────────────────────────────────

    def _build_section_calculos(self, data: dict[str, Any]) -> list:
        S = self.styles
        story = [Paragraph("7. CÁLCULOS Y RESULTADOS", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        story.append(Paragraph("7.1 Parámetros de cálculo", S["h2"]))

        param_rows = [["Parámetro", "Valor", "Unidad"]]

        if data.get("runoff_coeff") is not None:
            param_rows.append(["Coeficiente de escorrentía (C)", f"{data['runoff_coeff']:.2f}", "—"])
        if data.get("cn") is not None:
            param_rows.append(["Número de Curva compuesto (CN)", f"{data['cn']:.1f}", "—"])
            param_rows.append(["Retención máxima potencial (S)", f"{data['s_mm']:.1f}", "mm"])
            param_rows.append(["Abstracción inicial (Ia)", f"{data['ia_mm']:.1f}", "mm"])
            param_rows.append(["Lámina de escorrentía directa (Q)", f"{data['runoff_depth_mm']:.1f}", "mm"])
        if data.get("areal_reduction_k") is not None:
            param_rows.append(["Factor de reducción areal (K)", f"{data['areal_reduction_k']:.4f}", "—"])

        param_rows.append(["Intensidad de diseño (i)", f"{data['intensity_mm_hr']:.2f}", "mm/hr"])
        param_rows.append(["Tiempo de concentración adoptado (Tc)", f"{data['tc_adopted_hours']:.3f}", "hr"])
        param_rows.append(["Área de la cuenca (A)", f"{data['area_km2']:.3f}", "km²"])

        story.append(self._make_table(param_rows))

        story.append(Paragraph("7.2 Caudal de diseño", S["h2"]))

        result_rows = [["Parámetro", "Valor", "Unidad"]]
        result_rows.append(["Caudal pico de diseño (Q)", f"{data['peak_flow_m3s']:.3f}", "m³/s"])
        result_rows.append(["Caudal específico (q)", f"{data['specific_flow_m3s_km2']:.3f}", "m³/s/km²"])

        story.append(self._make_table(result_rows, highlight_last=True))

        # Method comparison if available
        if data.get("method_comparison"):
            story.append(Paragraph("7.3 Comparación de métodos", S["h2"]))
            comp_rows = [["Método", "Q (m³/s)", "Tc (hr)", "Observaciones"]]
            for r in data["method_comparison"]:
                comp_rows.append([
                    r["methodName"],
                    f"{r['peakFlow']:.3f}",
                    f"{r['tc']:.3f}",
                    r["notes"][:50] + "…" if len(r["notes"]) > 50 else r["notes"],
                ])
            col_w = [5 * cm, 2.5 * cm, 2.5 * cm, 6 * cm]
            story.append(self._make_table(comp_rows, col_widths=col_w))

        return story

    # ── Section 6b: CN Sensitivity ────────────────────────────────────────

    def _build_section_sensibilidad(self, data: dict[str, Any]) -> list:
        S = self.styles
        story = [Paragraph("7.4 ANÁLISIS DE SENSIBILIDAD DEL CN", S["h2"])]

        story.append(
            Paragraph(
                "Este análisis muestra cómo varía el caudal pico ante cambios de ±5 unidades "
                "en el Número de Curva. El CN es el parámetro con mayor incertidumbre en el "
                "método SCS-CN; variaciones de ±5 unidades son habituales en la práctica y "
                "pueden producir diferencias significativas en el caudal de diseño.",
                S["body"],
            )
        )

        sensitivity = data.get("cn_sensitivity", [])
        if not sensitivity:
            return story

        rows = [["Número de Curva", "Q pico (m³/s)", "Variación"]]
        for s in sensitivity:
            label_cn = f"{s['label']} ({s['cn']:.0f})"
            q_str = f"{s['peak_flow_m3s']:.3f}"
            if s["label"] == "CN":
                var_str = "Base"
            else:
                sign = "+" if s["variation_pct"] > 0 else ""
                var_str = f"{sign}{s['variation_pct']:.1f}%"
            rows.append([label_cn, q_str, var_str])

        col_w = [6 * cm, 4 * cm, 4 * cm]
        tbl = Table(rows, colWidths=col_w, repeatRows=1)
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), _NAVY),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ALIGN", (1, 0), (2, -1), "CENTER"),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    # Base row (row index 2 = "CN")
                    ("BACKGROUND", (0, 2), (-1, 2), _LIGHT_BLUE),
                    ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _LIGHT_GRAY]),
                    ("BACKGROUND", (0, 2), (-1, 2), _LIGHT_BLUE),
                    ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.3, _GRAY),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(tbl)

        story.append(Spacer(1, 0.3 * cm))
        story.append(
            Paragraph(
                "NOTA: Se recomienda adoptar el CN base como valor de diseño y usar CN+5 "
                "como escenario conservador de verificación.",
                S["disclaimer"],
            )
        )
        return story

    # ── Section 7b: Hidrograma Unitario SCS ──────────────────────────────────

    def _build_section_hidrograma(self, data: dict[str, Any]) -> list:
        S = self.styles
        story = [Paragraph("7.5 HIDROGRAMA UNITARIO SCS", S["h2"])]

        Tp = data.get("time_to_peak_hr", 0)
        Tb = data.get("base_time_hr", 0)
        vol = data.get("runoff_volume_m3", 0)
        Qp = data.get("peak_flow_m3s", 0)

        story.append(
            Paragraph(
                "El hidrograma de escorrentía directa se generó aplicando el Hidrograma Unitario "
                "Adimensional SCS (USDA-SCS, National Engineering Handbook, Section 4, 1986). "
                "El hidrograma muestra la variación temporal del caudal durante el evento de "
                "tormenta; el volumen total de escorrentía corresponde al área bajo la curva.",
                S["body"],
            )
        )

        # Summary table
        summary_rows = [
            ["Parámetro", "Valor", "Unidad"],
            ["Caudal pico (Qp)", f"{Qp:.3f}", "m³/s"],
            ["Tiempo al pico (Tp)", f"{Tp:.3f}", "hr"],
            ["Tiempo base (Tb)", f"{Tb:.3f}", "hr"],
            ["Volumen de escorrentía", f"{vol:,.0f}", "m³"],
        ]
        story.append(self._make_table(summary_rows, highlight_last=False))
        story.append(Spacer(1, 0.3 * cm))

        # Time–flow table
        times = data.get("hydrograph_times", [])
        flows = data.get("hydrograph_flows", [])
        if times and flows:
            story.append(Paragraph("Ordenadas del hidrograma:", S["h2"]))
            rows = [["t (hr)", "t/Tp", "Q (m³/s)"]]
            for t, q in zip(times, flows):
                t_ratio = f"{t / Tp:.2f}" if Tp > 0 else "—"
                rows.append([f"{t:.3f}", t_ratio, f"{q:.5f}"])

            col_w = [4 * cm, 4 * cm, 4 * cm]
            tbl = Table(rows, colWidths=col_w, repeatRows=1)
            tbl.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), _NAVY),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _LIGHT_GRAY]),
                        ("GRID", (0, 0), (-1, -1), 0.3, _GRAY),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ]
                )
            )
            story.append(tbl)

        story.append(Spacer(1, 0.3 * cm))
        story.append(
            Paragraph(
                "NOTA: El volumen de escorrentía calculado representa la respuesta del sistema "
                "ante la lluvia de diseño adoptada. Para diseño de obras de retención o "
                "laminación, verificar con hidrograma de período de retorno de proyecto.",
                S["disclaimer"],
            )
        )
        return story

    # ── Section 7: Análisis ────────────────────────────────────────────────

    def _build_section_analisis(
        self, data: dict[str, Any], ai_interpretation: str, ai_sections: dict[str, str]
    ) -> list:
        S = self.styles
        story = [Paragraph("8. ANÁLISIS E INTERPRETACIÓN", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        # Risk badge
        risk = data.get("risk_level", "moderado")
        risk_color = _RISK_COLORS.get(risk, _GRAY)
        risk_label = _RISK_LABELS_ES.get(risk, risk.upper())

        infra = _INFRASTRUCTURE_NAMES.get(data.get("infrastructure_type", ""), "—")
        story.append(
            Paragraph(
                f"<b>Nivel de riesgo hidrológico:</b> "
                f'<font color="{risk_color.hexval() if hasattr(risk_color, "hexval") else "#000000"}"><b>{risk_label}</b></font> '
                f"— {infra}",
                S["body_left"],
            )
        )
        story.append(Spacer(1, 0.3 * cm))

        rec = data.get("risk_recommendations", {})
        if rec:
            rec_rows = [["Aspecto", "Descripción"]]
            if rec.get("general"):
                rec_rows.append(["Situación general", rec["general"]])
            if rec.get("action"):
                rec_rows.append(["Acción recomendada", rec["action"]])
            if rec.get("verification"):
                rec_rows.append(["Verificaciones requeridas", rec["verification"]])
            if rec.get("period_note"):
                rec_rows.append(["Nota sobre período de retorno", rec["period_note"]])
            story.append(self._make_table(rec_rows, col_widths=[5 * cm, 11 * cm]))

        if ai_sections.get("analisis_resultados"):
            story.append(Spacer(1, 0.5 * cm))
            story.append(Paragraph(ai_sections["analisis_resultados"], S["body"]))

        # AI interpretation
        if ai_interpretation:
            story.append(Paragraph("Interpretación técnica asistida por IA:", S["h2"]))
            # Split AI text into paragraphs
            for para in ai_interpretation.split("\n"):
                para = para.strip()
                if para:
                    story.append(Paragraph(para, S["body"]))

        return story

    # ── Section 8: Conclusiones ────────────────────────────────────────────

    def _build_section_conclusiones(
        self, data: dict[str, Any], ai_sections: dict[str, str]
    ) -> list:
        S = self.styles
        story = [Paragraph("9. CONCLUSIONES Y RECOMENDACIONES", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        text = ai_sections.get("conclusiones") or (
            f"Se determinó un caudal pico de diseño de {data.get('peak_flow_m3s', 0):.3f} m³/s "
            f"para un período de retorno de {data.get('return_period', '—')} años."
        )
        story.append(Paragraph(text, S["body"]))

        # Summary table
        story.append(Spacer(1, 0.4 * cm))
        summary_rows = [
            ["Parámetro", "Valor adoptado"],
            ["Caudal de diseño", f"Q = {data.get('peak_flow_m3s', 0):.3f} m³/s"],
            ["Período de retorno", f"T = {data.get('return_period', '—')} años"],
            ["Método de cálculo", _METHOD_NAMES.get(data.get("method", ""), "—")],
            ["Nivel de riesgo", _RISK_LABELS_ES.get(data.get("risk_level", ""), "—")],
        ]
        story.append(self._make_table(summary_rows, highlight_last=False))

        # Disclaimer
        story.append(Spacer(1, 0.8 * cm))
        story.append(
            Paragraph(
                "LIMITACIONES: Los resultados de esta memoria son estimaciones para etapas de "
                "anteproyecto basadas en la regionalización de Caamaño Nelli et al. (1999). "
                "Para proyectos definitivos se recomienda verificar con pluviografía local actualizada, "
                "estudios de campo y la normativa municipal o provincial vigente.",
                S["disclaimer"],
            )
        )
        return story

    # ── Annex: Detailed calculation sheet ─────────────────────────────────

    def _build_annex(self, data: dict[str, Any]) -> list:
        S = self.styles
        story = [Paragraph("ANEXO A — PLANILLA DE CÁLCULO DETALLADA", S["h1"])]
        story.append(HRFlowable(width="100%", thickness=1, color=_LIGHT_BLUE, spaceAfter=8))

        all_rows = [["Campo", "Valor"]]

        flat_fields = [
            ("Ciudad de referencia", data.get("city", "—")),
            ("Provincia", data.get("province", "—")),
            ("Período de retorno (T)", f"{data.get('return_period', '—')} años"),
            ("Duración de tormenta (t)", f"{data.get('duration_min', '—')} min"),
            ("Área de la cuenca (A)", f"{data.get('area_km2', '—')} km²"),
            ("Longitud del cauce (L)", f"{data.get('length_km', '—')} km"),
            ("Pendiente media (S)", f"{data.get('slope', '—')} m/m"),
            ("Intensidad IDF (i)", f"{data.get('intensity_mm_hr', '—')} mm/hr"),
            ("Fuente IDF", data.get("idf_source", "—")),
            ("Tc adoptado", f"{data.get('tc_adopted_hours', '—')} hr  /  {data.get('tc_adopted_minutes', '—')} min"),
            ("Método", _METHOD_NAMES.get(data.get("method", ""), "—")),
        ]

        if data.get("runoff_coeff") is not None:
            flat_fields.append(("Coeficiente C", f"{data['runoff_coeff']:.3f}"))
        if data.get("cn") is not None:
            flat_fields.extend([
                ("Número de Curva (CN)", f"{data['cn']:.1f}"),
                ("Retención máx. (S)", f"{data['s_mm']:.2f} mm"),
                ("Abstracción inicial (Ia)", f"{data['ia_mm']:.2f} mm"),
                ("Lámina escorrentía (Q)", f"{data['runoff_depth_mm']:.2f} mm"),
            ])
        if data.get("areal_reduction_k") is not None:
            flat_fields.append(("Factor areal (K)", f"{data['areal_reduction_k']:.4f}"))

        flat_fields.extend([
            ("Caudal pico (Q)", f"{data.get('peak_flow_m3s', '—')} m³/s"),
            ("Caudal específico (q)", f"{data.get('specific_flow_m3s_km2', '—')} m³/s/km²"),
            ("Nivel de riesgo", _RISK_LABELS_ES.get(data.get("risk_level", ""), "—")),
            ("Infraestructura", _INFRASTRUCTURE_NAMES.get(data.get("infrastructure_type", ""), "—")),
            ("Fecha de cálculo", datetime.now().strftime("%d/%m/%Y %H:%M")),
        ])

        all_rows.extend([[k, str(v)] for k, v in flat_fields])
        story.append(self._make_table(all_rows))
        return story

    # ── Table helper ───────────────────────────────────────────────────────

    def _make_table(
        self,
        data: list[list],
        col_widths: Optional[list] = None,
        highlight_last: bool = False,
    ) -> Table:
        if col_widths is None:
            col_widths = [7 * cm, 4 * cm, 5 * cm][: len(data[0])]
            if len(data[0]) == 2:
                col_widths = [7 * cm, 9 * cm]

        tbl = Table(data, colWidths=col_widths, repeatRows=1)

        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), _NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _LIGHT_GRAY]),
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 1), (0, -1), _NAVY),
            ("GRID", (0, 0), (-1, -1), 0.3, _GRAY),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]

        if highlight_last and len(data) > 1:
            style_cmds += [
                ("BACKGROUND", (0, -1), (-1, -1), _LIGHT_BLUE),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]

        tbl.setStyle(TableStyle(style_cmds))
        return tbl

    # ── Main generate ──────────────────────────────────────────────────────

    def generate(
        self,
        calculation_data: dict[str, Any],
        ai_interpretation: str = "",
        ai_recommendations: str = "",
        basin_polygon: Optional[list[list[float]]] = None,
    ) -> BytesIO:
        """
        Generate the complete PDF report.

        Args:
            calculation_data: Full CalculationResponse dict
            ai_interpretation: AI-generated interpretation text
            ai_recommendations: AI-generated report sections dict (or empty string)

        Returns:
            BytesIO buffer containing the PDF
        """
        # ai_recommendations may be a dict of sections or plain string
        if isinstance(ai_recommendations, dict):
            ai_sections = ai_recommendations
        else:
            ai_sections: dict[str, str] = {}

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=self.MARGIN,
            rightMargin=self.MARGIN,
            topMargin=self.MARGIN + 0.6 * cm,   # leave room for top bar
            bottomMargin=2.2 * cm,              # leave room for footer
        )

        story = []

        # Cover
        story.extend(self._build_cover())
        story.append(PageBreak())

        # TOC
        story.extend(self._build_toc())
        story.append(PageBreak())

        # Main sections
        story.extend(self._build_section_objeto(ai_sections))
        story.extend(self._build_section_cuenca(calculation_data, ai_sections))
        story.extend(self._build_section_ubicacion(basin_polygon))
        story.extend(self._build_section_idf(calculation_data))
        story.extend(self._build_section_tc(calculation_data))
        story.extend(self._build_section_metodologia(calculation_data, ai_sections))
        story.append(PageBreak())
        story.extend(self._build_section_calculos(calculation_data))
        if calculation_data.get("cn_sensitivity"):
            story.extend(self._build_section_sensibilidad(calculation_data))
        if calculation_data.get("hydrograph_times"):
            story.extend(self._build_section_hidrograma(calculation_data))
        story.append(PageBreak())
        story.extend(self._build_section_analisis(calculation_data, ai_interpretation, ai_sections))
        story.extend(self._build_section_conclusiones(calculation_data, ai_sections))
        story.append(PageBreak())
        story.extend(self._build_annex(calculation_data))

        doc.build(
            story,
            onFirstPage=self._add_page_decorations,
            onLaterPages=self._add_page_decorations,
        )

        buffer.seek(0)
        return buffer
