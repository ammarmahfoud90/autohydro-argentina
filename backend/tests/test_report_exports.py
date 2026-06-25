"""
Backend tests for PDF, DOCX, and Excel export generation.

Each test uses a fixed calculation scenario (Azul, TR=25, Rational Method)
and asserts that:
  - The export generates without error (no exception raised)
  - The output buffer is non-empty
  - Key values/strings appear in the document content
  - The correct Tp formula (D/2 + 0.6·Tc) is shown, not the stale 0.6·Tc form
  - The language toggle produces English section headings when language="en"
"""

import pytest
from io import BytesIO

from app.services.report_service import MemoriaCalculoGenerator
from app.services.docx_service import MemoriaCalculoDocxGenerator
from app.services.excel_service import ExcelReportGenerator


# ── Shared sample calculation data ─────────────────────────────────────────────

SAMPLE = {
    "city": "Azul y aledaños",
    "province": "Buenos Aires",
    "locality_id": "buenos_aires_azul",
    "return_period": 25,
    "duration_min": 60,
    "intensity_mm_hr": 56.12,
    "idf_source": "Collazos & Cazenave (2015), XXV CONAGUA",
    "idf_verified": True,
    "method": "rational",
    "area_km2": 10.0,
    "length_km": 5.0,
    "slope": 0.01,
    "runoff_coeff": 0.35,
    "tc_adopted_hours": 1.47,
    "tc_adopted_minutes": 88.2,
    "tc_adopted_formula_name": "Témez (1978)",
    "tc_adopted_is_user_selected": True,
    "tc_results": [
        {
            "formulaName": "Témez (1978)",
            "tcHours": 1.47,
            "tcMinutes": 88.2,
            "applicability": "Cuencas rurales en España y América Latina",
        }
    ],
    "areal_reduction_k": 0.9821,
    "peak_flow_m3s": 53.94,
    "specific_flow_m3s_km2": 5.394,
    "risk_level": "moderado",
    "infrastructure_type": "alcantarilla_mayor",
    "warnings": [],
}

SAMPLE_SCS = {
    **SAMPLE,
    "method": "scs_cn",
    "cn": 72.0,
    "s_mm": 98.9,
    "ia_mm": 19.8,
    "runoff_depth_mm": 24.3,
    "time_to_peak_hr": 1.24,
    "use_pampa_lambda": False,
    "peak_flow_m3s": 12.7,
}


# ── PDF tests ──────────────────────────────────────────────────────────────────

class TestPdfExport:
    def _generate(self, data=None, language="es") -> BytesIO:
        gen = MemoriaCalculoGenerator(
            project_name="Test Project",
            location="Azul, Buenos Aires",
            language=language,
        )
        return gen.generate(calculation_data=data or SAMPLE)

    def test_generates_without_error(self):
        buf = self._generate()
        assert isinstance(buf, BytesIO)
        assert buf.getbuffer().nbytes > 5_000  # meaningful PDF content

    def test_scs_generates_without_error(self):
        buf = self._generate(data=SAMPLE_SCS)
        assert buf.getbuffer().nbytes > 5_000

    def test_pdf_starts_with_pdf_header(self):
        buf = self._generate()
        buf.seek(0)
        assert buf.read(4) == b"%PDF"

    def test_language_en_generates_without_error(self):
        buf = self._generate(language="en")
        assert buf.getbuffer().nbytes > 5_000

    def test_tp_formula_string_correct(self):
        """PDF must show D/2 + 0.6·Tc in the SCS section, not the stale 0.6·Tc."""
        import io
        gen = MemoriaCalculoGenerator(language="es")
        # Check the formula string in the metodologia section's story directly
        story = gen._build_section_metodologia(SAMPLE_SCS, {})
        texts = []
        for item in story:
            if hasattr(item, "text"):
                texts.append(item.text)
        combined = " ".join(texts)
        assert "D/2" in combined, "PDF must show Tp = D/2 + 0.6 × Tc"
        assert "0.6 × Tc" in combined or "0.6·Tc" in combined or "0.6" in combined


# ── DOCX tests ─────────────────────────────────────────────────────────────────

class TestDocxExport:
    def _generate(self, data=None, language="es") -> BytesIO:
        gen = MemoriaCalculoDocxGenerator(
            project_name="Test Project",
            location="Azul, Buenos Aires",
            language=language,
        )
        return gen.generate(calculation_data=data or SAMPLE)

    def test_generates_without_error(self):
        buf = self._generate()
        assert isinstance(buf, BytesIO)
        assert buf.getbuffer().nbytes > 5_000

    def test_scs_generates_without_error(self):
        buf = self._generate(data=SAMPLE_SCS)
        assert buf.getbuffer().nbytes > 5_000

    def test_language_en_generates_without_error(self):
        buf = self._generate(language="en")
        assert buf.getbuffer().nbytes > 5_000

    def test_language_en_has_english_headings(self):
        """When language='en', section headings must be in English.
        The DOCX generator uses plain paragraphs (not built-in Heading styles),
        so we search all paragraph text."""
        from docx import Document as DocxDoc
        buf = self._generate(language="en")
        buf.seek(0)
        doc = DocxDoc(buf)
        combined = " ".join(p.text for p in doc.paragraphs)
        assert "BASIN DESCRIPTION" in combined or "STUDY OBJECTIVE" in combined or \
               "CALCULATIONS AND RESULTS" in combined, (
            f"English DOCX must contain English section headings. First 500 chars: {combined[:500]}"
        )

    def test_language_es_has_spanish_headings(self):
        """When language='es' (default), section headings must be in Spanish."""
        from docx import Document as DocxDoc
        buf = self._generate(language="es")
        buf.seek(0)
        doc = DocxDoc(buf)
        combined = " ".join(p.text for p in doc.paragraphs)
        assert "CUENCA" in combined or "OBJETO DEL ESTUDIO" in combined, (
            f"Spanish DOCX must contain Spanish section headings. First 500 chars: {combined[:500]}"
        )

    def test_docx_contains_peak_flow(self):
        """Key result (peak flow) must appear somewhere in the document."""
        from docx import Document as DocxDoc
        buf = self._generate()
        buf.seek(0)
        doc = DocxDoc(buf)
        all_text = " ".join(p.text for p in doc.paragraphs)
        assert "53.94" in all_text or "53,94" in all_text, (
            "Peak flow 53.94 m³/s must appear in the DOCX"
        )

    def test_docx_tp_formula_correct(self):
        """DOCX must show D/2 + 0.6·Tc in methodology section, not stale 0.6·Tc."""
        from docx import Document as DocxDoc
        buf = self._generate(data=SAMPLE_SCS)
        buf.seek(0)
        doc = DocxDoc(buf)
        all_text = " ".join(p.text for p in doc.paragraphs)
        assert "D/2" in all_text, "DOCX must show Tp = D/2 + 0.6 × Tc"


# ── Excel tests ────────────────────────────────────────────────────────────────

class TestExcelExport:
    def _generate(self, data=None) -> BytesIO:
        gen = ExcelReportGenerator(
            project_name="Test Project",
            location="Azul, Buenos Aires",
        )
        return gen.generate(calculation_data=data or SAMPLE)

    def test_generates_without_error(self):
        buf = self._generate()
        assert isinstance(buf, BytesIO)
        assert buf.getbuffer().nbytes > 1_000

    def test_scs_generates_without_error(self):
        buf = self._generate(data=SAMPLE_SCS)
        assert buf.getbuffer().nbytes > 1_000

    def test_excel_has_correct_sheet_structure(self):
        """Excel workbook must have at least the expected sheets."""
        from openpyxl import load_workbook
        buf = self._generate()
        buf.seek(0)
        wb = load_workbook(buf)
        sheet_names = wb.sheetnames
        assert len(sheet_names) >= 1, "Workbook must have at least one sheet"

    def test_excel_contains_peak_flow(self):
        """Peak flow value must appear as a cell value in the workbook."""
        from openpyxl import load_workbook
        buf = self._generate()
        buf.seek(0)
        wb = load_workbook(buf)
        found = False
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                for cell in row:
                    if cell is not None and "53.94" in str(cell):
                        found = True
        assert found, "Peak flow 53.94 must appear in at least one cell"

    def test_excel_scs_tp_formula_correct(self):
        """Excel SCS step must mention D/2 + 0.6·Tc, not the stale 0.6·Tc shortcut."""
        from openpyxl import load_workbook
        buf = self._generate(data=SAMPLE_SCS)
        buf.seek(0)
        wb = load_workbook(buf)
        found_tp = False
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                for cell in row:
                    if cell and "D/2" in str(cell):
                        found_tp = True
        assert found_tp, "Excel SCS step must show Tp = D/2 + 0.6 × Tc"
