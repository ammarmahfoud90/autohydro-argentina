"""
PDF Memoria de Cálculo Hidrológico-Hidráulica Consolidada.

Generates a professional consolidated report covering all 6 steps
of the Modo Proyecto: IDF → Cuenca → Hietograma → Hidrograma → Canal → Informe.
"""

from io import BytesIO
from datetime import datetime
from typing import Any, Optional

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
    HRFlowable,
    KeepTogether,
)

# Brand colours (same palette as MemoriaCalculoGenerator)
_NAVY = colors.HexColor("#1a365d")
_BLUE = colors.HexColor("#2563eb")
_LIGHT_BLUE = colors.HexColor("#dbeafe")
_VIOLET = colors.HexColor("#7c3aed")
_LIGHT_VIOLET = colors.HexColor("#ede9fe")
_GRAY = colors.HexColor("#6b7280")
_LIGHT_GRAY = colors.HexColor("#f3f4f6")
_GREEN = colors.HexColor("#16a34a")
_RED = colors.HexColor("#dc2626")
_ORANGE = colors.HexColor("#d97706")
_YELLOW = colors.HexColor("#ca8a04")

_RISK_COLORS = {
    "muy_bajo": _GREEN,
    "bajo": colors.HexColor("#65a30d"),
    "moderado": _YELLOW,
    "alto": _ORANGE,
    "muy_alto": _RED,
}
_RISK_LABELS = {
    "muy_bajo": "Muy bajo", "bajo": "Bajo", "moderado": "Moderado",
    "alto": "Alto", "muy_alto": "Muy alto",
}
_METHOD_NAMES = {
    "rational": "Método Racional",
    "modified_rational": "Método Racional Modificado",
    "scs_cn": "Método SCS-CN",
}
_CHANNEL_NAMES = {
    "rectangular": "Sección Rectangular",
    "trapezoidal": "Sección Trapezoidal",
    "circular": "Sección Circular",
    "triangular": "Sección Triangular",
}


class ProyectoReportGenerator:
    """Generates a consolidated PDF for a complete hydraulic project."""

    def __init__(
        self,
        project_name: str = "Proyecto Hidráulico",
        comitente: str = "",
        profesional: str = "",
        fecha: str = "",
        notas: str = "",
    ):
        self.project_name = project_name
        self.comitente = comitente
        self.profesional = profesional
        self.fecha = fecha or datetime.now().strftime("%d/%m/%Y")
        self.notas = notas

        styles = getSampleStyleSheet()
        self.style_normal = ParagraphStyle(
            "NormalCustom", parent=styles["Normal"],
            fontName="Helvetica", fontSize=9, leading=13, spaceAfter=4,
        )
        self.style_h1 = ParagraphStyle(
            "H1Custom", parent=styles["Heading1"],
            fontName="Helvetica-Bold", fontSize=14, textColor=_NAVY,
            spaceAfter=6, spaceBefore=6,
        )
        self.style_h2 = ParagraphStyle(
            "H2Custom", parent=styles["Heading2"],
            fontName="Helvetica-Bold", fontSize=11, textColor=_NAVY,
            spaceAfter=4, spaceBefore=10,
        )
        self.style_h3 = ParagraphStyle(
            "H3Custom", parent=styles["Heading3"],
            fontName="Helvetica-Bold", fontSize=9.5, textColor=_BLUE,
            spaceAfter=3, spaceBefore=6,
        )
        self.style_caption = ParagraphStyle(
            "Caption", parent=styles["Normal"],
            fontName="Helvetica-Oblique", fontSize=8, textColor=_GRAY,
            leading=11,
        )
        self.style_bold = ParagraphStyle(
            "Bold", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=9,
        )
        self.style_center = ParagraphStyle(
            "Center", parent=styles["Normal"],
            fontName="Helvetica", fontSize=9, alignment=TA_CENTER,
        )

    # ── Public ────────────────────────────────────────────────────────────────

    def generate(self, proyecto_data: dict) -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=2.5 * cm,
            rightMargin=2.5 * cm,
            topMargin=2.5 * cm,
            bottomMargin=2.5 * cm,
            title=self.project_name,
            author="AutoHydro Argentina",
        )

        story = []
        story.extend(self._cover())
        story.extend(self._section_idf(proyecto_data.get("paso1") or {}))
        story.extend(self._section_cuenca(proyecto_data.get("paso2") or {}))
        story.extend(self._section_hietograma(proyecto_data.get("paso3") or {}))
        story.extend(self._section_hidrograma(proyecto_data.get("paso4") or {}))
        story.extend(self._section_canal(proyecto_data.get("paso5") or {}))
        story.extend(self._conclusions(proyecto_data))
        story.extend(self._footer_note())

        doc.build(story, onFirstPage=self._page_template, onLaterPages=self._page_template)
        buffer.seek(0)
        return buffer

    # ── Page template ─────────────────────────────────────────────────────────

    def _page_template(self, canvas, doc):
        canvas.saveState()
        w, h = A4
        # Top bar
        canvas.setFillColor(_NAVY)
        canvas.rect(0, h - 1.2 * cm, w, 1.2 * cm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(2.5 * cm, h - 0.8 * cm, "AutoHydro Argentina")
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(w - 2.5 * cm, h - 0.8 * cm, self.project_name[:60])
        # Bottom bar
        canvas.setFillColor(_LIGHT_GRAY)
        canvas.rect(0, 0, w, 1.0 * cm, fill=1, stroke=0)
        canvas.setFillColor(_GRAY)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(2.5 * cm, 0.35 * cm, "Generado con AutoHydro Argentina — autohydro-argentina.onrender.com")
        canvas.drawRightString(w - 2.5 * cm, 0.35 * cm, f"Página {doc.page}")
        canvas.restoreState()

    # ── Cover page ────────────────────────────────────────────────────────────

    def _cover(self) -> list:
        elems = []
        elems.append(Spacer(1, 1.5 * cm))

        # Title box
        title_data = [[Paragraph(
            f'<font color="#1a365d"><b>MEMORIA DE CÁLCULO<br/>HIDROLÓGICO-HIDRÁULICA</b></font>',
            ParagraphStyle("CoverTitle", fontName="Helvetica-Bold", fontSize=20,
                           alignment=TA_CENTER, leading=26, textColor=_NAVY),
        )]]
        title_table = Table(title_data, colWidths=[15 * cm])
        title_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), _LIGHT_VIOLET),
            ("BOX", (0, 0), (-1, -1), 1.5, _VIOLET),
            ("TOPPADDING", (0, 0), (-1, -1), 16),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ]))
        elems.append(title_table)
        elems.append(Spacer(1, 0.8 * cm))

        # Project metadata table
        rows = [
            ["Proyecto:", self.project_name],
            ["Comitente:", self.comitente or "—"],
            ["Profesional responsable:", self.profesional or "—"],
            ["Fecha:", self.fecha],
            ["Generado con:", "AutoHydro Argentina"],
        ]
        if self.notas:
            rows.append(["Notas:", self.notas])

        meta_table = Table(
            [[Paragraph(f"<b>{k}</b>", self.style_normal), Paragraph(v, self.style_normal)] for k, v in rows],
            colWidths=[5.5 * cm, 9.5 * cm],
        )
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), _LIGHT_GRAY),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elems.append(meta_table)
        elems.append(Spacer(1, 0.5 * cm))
        elems.append(HRFlowable(width="100%", thickness=2, color=_NAVY))
        elems.append(Spacer(1, 0.3 * cm))
        elems.append(Paragraph(
            "<i>Los datos IDF utilizados provienen de fuentes oficiales argentinas "
            "(INTA, SMN, organismos provinciales). Este informe es de carácter orientativo "
            "y no reemplaza el juicio profesional.</i>",
            self.style_caption,
        ))
        elems.append(Spacer(1, 1 * cm))
        return elems

    # ── Section helpers ───────────────────────────────────────────────────────

    def _kv_table(self, rows: list[tuple[str, str]], accent: Any = _LIGHT_BLUE) -> Table:
        data = [[
            Paragraph(f"<b>{k}</b>", self.style_normal),
            Paragraph(str(v), self.style_normal),
        ] for k, v in rows]
        t = Table(data, colWidths=[6 * cm, 9 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), accent),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ]))
        return t

    def _section_header(self, number: str, title: str) -> list:
        elems = [
            HRFlowable(width="100%", thickness=1.5, color=_NAVY),
            Paragraph(f"<b>{number}. {title.upper()}</b>", self.style_h2),
        ]
        return elems

    # ── Section 1: IDF ────────────────────────────────────────────────────────

    def _section_idf(self, paso1: dict) -> list:
        if not paso1:
            return []
        elems = self._section_header("1", "Datos de Diseño IDF")
        elems.append(self._kv_table([
            ("Localidad", paso1.get("localidad_nombre", "—")),
            ("Provincia", paso1.get("provincia", "—")),
            ("Período de retorno (TR)", f"{paso1.get('return_period', '—')} años"),
            ("Duración de la tormenta", f"{paso1.get('duration_min', '—')} min"),
            ("Intensidad de diseño", f"{paso1.get('intensidad_mm_hr', 0):.2f} mm/hr"),
            ("Fuente IDF", paso1.get("fuente_idf", "—")),
        ]))
        elems.append(Spacer(1, 0.4 * cm))
        return elems

    # ── Section 2: Cuenca ─────────────────────────────────────────────────────

    def _section_cuenca(self, paso2: dict) -> list:
        if not paso2:
            return []
        elems = self._section_header("2", "Caracterización de la Cuenca")
        tc_formula = paso2.get("tc_formula", "—")
        tc_h = paso2.get("tc_horas", 0)
        tc_min = round(tc_h * 60, 1)
        elems.append(self._kv_table([
            ("Área de la cuenca (A)", f"{paso2.get('area_km2', 0):.3f} km²"),
            ("Longitud del cauce (L)", f"{paso2.get('longitud_cauce_km', 0):.3f} km"),
            ("Pendiente media (S)", f"{paso2.get('pendiente_media', 0):.4f} m/m"),
            ("Coef. de escorrentía (C)", f"{paso2.get('coef_escorrentia_C', 0):.2f}"),
            ("Número de curva (CN)", f"{paso2.get('numero_curva_CN', 0):.0f}"),
            ("Fórmula de Tc adoptada", tc_formula.capitalize()),
            ("Tiempo de concentración (Tc)", f"{tc_h:.4f} h = {tc_min} min"),
        ]))
        elems.append(Spacer(1, 0.4 * cm))
        return elems

    # ── Section 3: Hietograma ─────────────────────────────────────────────────

    def _section_hietograma(self, paso3: dict) -> list:
        if not paso3:
            return []
        elems = self._section_header("3", "Tormenta de Diseño — Hietograma")
        result = paso3.get("result") or {}
        elems.append(self._kv_table([
            ("Método de distribución", result.get("method_label", paso3.get("metodo", "—"))),
            ("Intervalo de tiempo (Δt)", f"{paso3.get('delta_t_min', '—')} min"),
            ("Precipitación total", f"{paso3.get('precipitacion_total_mm', 0):.2f} mm"),
            ("Intensidad pico", f"{result.get('peak_intensity_mm_hr', 0):.2f} mm/hr"),
            ("Tiempo al pico", f"{result.get('peak_time_min', '—')} min"),
        ]))

        # Hyetograph data table (max 20 rows for readability)
        times = result.get("times_min", [])
        depths = result.get("depths_mm", [])
        intensities = result.get("intensities_mm_hr", [])
        if times:
            elems.append(Spacer(1, 0.3 * cm))
            elems.append(Paragraph("<b>Tabla del hietograma</b>", self.style_h3))
            table_data = [["Tiempo (min)", "Intensidad (mm/hr)", "Profundidad (mm)"]]
            step_size = max(1, len(times) // 20)
            for i in range(0, len(times), step_size):
                table_data.append([
                    str(times[i]),
                    f"{intensities[i]:.2f}" if i < len(intensities) else "—",
                    f"{depths[i]:.3f}" if i < len(depths) else "—",
                ])
            ht = Table(table_data, colWidths=[4 * cm, 5.5 * cm, 5.5 * cm])
            ht.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), _NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _LIGHT_GRAY]),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e5e7eb")),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            elems.append(ht)
        elems.append(Spacer(1, 0.4 * cm))
        return elems

    # ── Section 4: Hidrograma ─────────────────────────────────────────────────

    def _section_hidrograma(self, paso4: dict) -> list:
        if not paso4:
            return []
        elems = self._section_header("4", "Caudal de Diseño")
        result = paso4.get("result") or {}
        risk = paso4.get("nivel_riesgo", result.get("risk_level", "—"))
        risk_color = _RISK_COLORS.get(risk, _GRAY)

        rows = [
            ("Método de cálculo", _METHOD_NAMES.get(paso4.get("metodo_calculo", ""), paso4.get("metodo_calculo", "—"))),
            ("Caudal pico (Q)", f"<b>{paso4.get('q_pico_m3s', result.get('peak_flow_m3s', 0)):.3f} m³/s</b>"),
            ("Nivel de riesgo", f"<b><font color='#{_risk_hex(risk)}'>{_RISK_LABELS.get(risk, risk)}</font></b>"),
        ]
        if result.get("tc_min"):
            rows.append(("Tiempo de concentración (Tc)", f"{result.get('tc_min', 0):.1f} min"))
        if result.get("intensity_mm_hr"):
            rows.append(("Intensidad IDF adoptada", f"{result.get('intensity_mm_hr', 0):.2f} mm/hr"))

        elems.append(self._kv_table(rows))
        elems.append(Spacer(1, 0.4 * cm))
        return elems

    # ── Section 5: Canal ──────────────────────────────────────────────────────

    def _section_canal(self, paso5: dict) -> list:
        if not paso5:
            return []
        elems = self._section_header("5", "Dimensionamiento del Canal (Manning)")

        tipo = paso5.get("tipo_seccion", "—")
        verifica = paso5.get("verifica", False)

        rows = [
            ("Tipo de sección", _CHANNEL_NAMES.get(tipo, tipo.capitalize())),
            ("Coef. de rugosidad Manning (n)", f"{paso5.get('n_manning', '—')}"),
            ("Pendiente del canal (S)", f"{paso5.get('pendiente_canal', 0):.4f} m/m"),
        ]
        if paso5.get("b_m") is not None:
            rows.append(("Ancho de fondo (b)", f"{paso5['b_m']:.3f} m"))
        rows.append(("Tirante (y)", f"{paso5.get('y_m', 0):.3f} m"))
        if paso5.get("z") is not None:
            rows.append(("Talud lateral (z : 1)", f"{paso5['z']:.2f}"))
        if paso5.get("D_m") is not None:
            rows.append(("Diámetro (D)", f"{paso5['D_m']:.3f} m"))
        rows.extend([
            ("Q capacidad del canal", f"<b>{paso5.get('q_capacidad_m3s', 0):.3f} m³/s</b>"),
            ("Velocidad media (V)", f"{paso5.get('velocidad_ms', 0):.3f} m/s"),
            ("Verificación de diseño",
             "<b><font color='#16a34a'>✓ VERIFICA</font></b>" if verifica
             else "<b><font color='#dc2626'>✗ INSUFICIENTE</font></b>"),
        ])
        elems.append(self._kv_table(rows))
        elems.append(Spacer(1, 0.4 * cm))
        return elems

    # ── Conclusions ───────────────────────────────────────────────────────────

    def _conclusions(self, proyecto_data: dict) -> list:
        elems = self._section_header("6", "Conclusiones")
        p1 = proyecto_data.get("paso1") or {}
        p4 = proyecto_data.get("paso4") or {}
        p5 = proyecto_data.get("paso5") or {}

        lines = []
        if p1:
            lines.append(
                f"Los datos IDF corresponden a la localidad de <b>{p1.get('localidad_nombre', '—')}</b> "
                f"({p1.get('provincia', '—')}) para un período de retorno de "
                f"<b>TR = {p1.get('return_period', '—')} años</b> y duración de "
                f"<b>{p1.get('duration_min', '—')} min</b>, con una intensidad de diseño de "
                f"<b>{p1.get('intensidad_mm_hr', 0):.2f} mm/hr</b>."
            )
        if p4:
            q = p4.get("q_pico_m3s", (p4.get("result") or {}).get("peak_flow_m3s", 0))
            lines.append(
                f"El caudal de diseño calculado es <b>Q = {q:.3f} m³/s</b> mediante el "
                f"{_METHOD_NAMES.get(p4.get('metodo_calculo', ''), p4.get('metodo_calculo', 'método seleccionado'))}."
            )
        if p5:
            v = p5.get("verifica", False)
            q_cap = p5.get("q_capacidad_m3s", 0)
            lines.append(
                f"La sección de canal diseñada ({_CHANNEL_NAMES.get(p5.get('tipo_seccion', ''), '').lower()}) "
                f"{'verifica la capacidad hidráulica requerida' if v else 'NO verifica la capacidad requerida'} "
                f"con Q capacidad = <b>{q_cap:.3f} m³/s</b>."
            )
        if self.notas:
            lines.append(f"<b>Notas adicionales:</b> {self.notas}")

        for line in lines:
            elems.append(Paragraph(line, self.style_normal))
            elems.append(Spacer(1, 0.2 * cm))
        return elems

    # ── Footer note ───────────────────────────────────────────────────────────

    def _footer_note(self) -> list:
        elems = [
            Spacer(1, 0.8 * cm),
            HRFlowable(width="100%", thickness=0.5, color=_GRAY),
            Spacer(1, 0.2 * cm),
            Paragraph(
                "Memoria de cálculo generada con <b>AutoHydro Argentina</b> — "
                "autohydro-argentina.onrender.com<br/>"
                "Datos IDF de fuentes oficiales argentinas (INTA, SMN, organismos provinciales). "
                "Resultados de carácter orientativo — verificar con profesional habilitado.",
                self.style_caption,
            ),
        ]
        return elems


# ── Helpers ───────────────────────────────────────────────────────────────────

def _risk_hex(risk: str) -> str:
    mapping = {
        "muy_bajo": "16a34a", "bajo": "65a30d", "moderado": "ca8a04",
        "alto": "d97706", "muy_alto": "dc2626",
    }
    return mapping.get(risk, "6b7280")
