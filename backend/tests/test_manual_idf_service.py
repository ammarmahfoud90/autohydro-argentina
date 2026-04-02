"""
Tests for manual_idf_service.

Run with:
    cd backend && python -m pytest tests/test_manual_idf_service.py -v
"""

import sys
import os
import math
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.manual_idf_service import (
    calculate_intensity_from_table,
    calculate_intensity_from_formula,
    fit_talbot3_to_table,
    validate_idf_table,
)
from app.models.schemas import ManualIDFTable, ManualIDFFormula


# ── calculate_intensity_from_table ───────────────────────────────────────────

class TestInterpolationFromTable:
    def _make_table(self) -> ManualIDFTable:
        return ManualIDFTable(
            durations_min=[15.0, 60.0, 120.0],
            return_periods_years=[10, 25],
            intensities_mm_hr=[
                [80.0, 40.0, 25.0],   # TR=10
                [100.0, 50.0, 31.0],  # TR=25
            ],
            source="Fuente de prueba para tests",
        )

    def test_exact_tr_exact_duration(self):
        """At exact table nodes, result should match tabulated values."""
        table = self._make_table()

        result = calculate_intensity_from_table(table, return_period=10, duration_min=60)
        assert abs(result["intensity_mm_hr"] - 40.0) < 0.5

        result = calculate_intensity_from_table(table, return_period=25, duration_min=15)
        assert abs(result["intensity_mm_hr"] - 100.0) < 0.5

    def test_exact_tr_interpolated_duration(self):
        """Interpolated duration should lie between the surrounding values."""
        table = self._make_table()
        result = calculate_intensity_from_table(table, return_period=10, duration_min=30)
        # Between 80 and 40 (log-log interpolation)
        assert 40.0 < result["intensity_mm_hr"] < 80.0

    def test_interpolated_tr(self):
        """Interpolated TR should lie between the surrounding TR values."""
        table = self._make_table()
        result_low = calculate_intensity_from_table(table, return_period=10, duration_min=60)
        result_high = calculate_intensity_from_table(table, return_period=25, duration_min=60)
        result_mid = calculate_intensity_from_table(table, return_period=15, duration_min=60)
        assert result_low["intensity_mm_hr"] < result_mid["intensity_mm_hr"] < result_high["intensity_mm_hr"]

    def test_out_of_range_duration_gives_warning(self):
        """Requesting a duration outside the table range should yield a warning."""
        table = self._make_table()
        result = calculate_intensity_from_table(table, return_period=10, duration_min=240)
        assert len(result["warnings"]) > 0

    def test_out_of_range_tr_gives_warning(self):
        """Requesting a TR outside the table range should yield a warning."""
        table = self._make_table()
        result = calculate_intensity_from_table(table, return_period=100, duration_min=60)
        assert len(result["warnings"]) > 0

    def test_in_range_no_warnings(self):
        """Interpolating within the table range should produce no warnings."""
        table = self._make_table()
        result = calculate_intensity_from_table(table, return_period=15, duration_min=60)
        assert result["warnings"] == []


# ── calculate_intensity_from_formula ─────────────────────────────────────────

class TestFormulaIntensity:
    def test_talbot3_known_value(self):
        """
        I = A / (t + B)^C with A=2000, B=20, C=0.8, t=60 min.
        Expected: I = 2000 / (80)^0.8 ≈ 60.11 mm/h
        """
        formula = ManualIDFFormula(
            formula_type="talbot3",
            parameters_by_tr={"10": {"A": 2000.0, "B": 20.0, "C": 0.8}},
            source="Fuente de prueba para tests",
        )
        result = calculate_intensity_from_formula(formula, return_period=10, duration_min=60)
        expected = 2000.0 / (80.0 ** 0.8)  # ≈ 60.11
        assert abs(result["intensity_mm_hr"] - expected) < 0.1

    def test_talbot2_known_value(self):
        """I = A / (t + B) with A=1000, B=10, t=40 min → I = 1000/50 = 20 mm/h"""
        formula = ManualIDFFormula(
            formula_type="talbot2",
            parameters_by_tr={"10": {"A": 1000.0, "B": 10.0}},
            source="Fuente de prueba para tests",
        )
        result = calculate_intensity_from_formula(formula, return_period=10, duration_min=40)
        assert abs(result["intensity_mm_hr"] - 20.0) < 0.01

    def test_sherman_known_value(self):
        """I = a * t^(-n) with a=500, n=0.5, t=100 min → I = 500 / 10 = 50 mm/h"""
        formula = ManualIDFFormula(
            formula_type="sherman",
            parameters_by_tr={"10": {"a": 500.0, "n": 0.5}},
            source="Fuente de prueba para tests",
        )
        result = calculate_intensity_from_formula(formula, return_period=10, duration_min=100)
        assert abs(result["intensity_mm_hr"] - 50.0) < 0.01

    def test_bernard_known_value(self):
        """I = k / t^e with k=600, e=0.6, t=60 min"""
        formula = ManualIDFFormula(
            formula_type="bernard",
            parameters_by_tr={"10": {"k": 600.0, "e": 0.6}},
            source="Fuente de prueba para tests",
        )
        result = calculate_intensity_from_formula(formula, return_period=10, duration_min=60)
        expected = 600.0 / (60.0 ** 0.6)
        assert abs(result["intensity_mm_hr"] - expected) < 0.1

    def test_talbot3_tr_interpolation(self):
        """Interpolated TR should yield intensity between boundary values."""
        formula = ManualIDFFormula(
            formula_type="talbot3",
            parameters_by_tr={
                "10": {"A": 1500.0, "B": 15.0, "C": 0.8},
                "25": {"A": 2000.0, "B": 15.0, "C": 0.8},
            },
            source="Fuente de prueba para tests",
        )
        r10 = calculate_intensity_from_formula(formula, return_period=10, duration_min=60)
        r25 = calculate_intensity_from_formula(formula, return_period=25, duration_min=60)
        r15 = calculate_intensity_from_formula(formula, return_period=15, duration_min=60)
        assert r10["intensity_mm_hr"] < r15["intensity_mm_hr"] < r25["intensity_mm_hr"]


# ── validate_idf_table ────────────────────────────────────────────────────────

class TestValidateIDFTable:
    def test_consistent_table_no_warnings(self):
        warnings = validate_idf_table(
            durations_min=[15.0, 60.0, 120.0],
            return_periods_years=[10, 25],
            intensities_mm_hr=[
                [80.0, 40.0, 25.0],
                [100.0, 50.0, 31.0],
            ],
        )
        assert warnings == []

    def test_non_decreasing_intensity_with_duration(self):
        """Intensity that does NOT decrease with duration should produce a warning."""
        warnings = validate_idf_table(
            durations_min=[15.0, 60.0, 120.0],
            return_periods_years=[10],
            intensities_mm_hr=[[80.0, 90.0, 25.0]],  # 90 > 80: violation
        )
        assert any("NO decrece" in w for w in warnings)

    def test_non_increasing_intensity_with_tr(self):
        """Intensity that does NOT increase with TR should produce a warning."""
        warnings = validate_idf_table(
            durations_min=[60.0],
            return_periods_years=[10, 25],
            intensities_mm_hr=[
                [50.0],  # TR=10
                [40.0],  # TR=25: 40 < 50 → violation
            ],
        )
        assert any("NO crece" in w for w in warnings)

    def test_non_positive_value(self):
        """A zero or negative intensity should produce a warning."""
        warnings = validate_idf_table(
            durations_min=[60.0],
            return_periods_years=[10],
            intensities_mm_hr=[[0.0]],
        )
        assert any("no positivo" in w for w in warnings)

    def test_multiple_violations_all_reported(self):
        """All violations in the table should be reported, not just the first."""
        warnings = validate_idf_table(
            durations_min=[15.0, 60.0, 120.0],
            return_periods_years=[10, 25],
            intensities_mm_hr=[
                [80.0, 90.0, 25.0],   # duration violation at TR=10
                [70.0, 50.0, 31.0],   # TR violation at duration=15 (70<80)
            ],
        )
        assert len(warnings) >= 2


# ── fit_talbot3_to_table ──────────────────────────────────────────────────────

class TestFitTalbot3:
    def test_fit_reproduces_input(self):
        """Fitted parameters should reproduce the input data within 1%."""
        A_true, B_true, C_true = 1000.0, 15.0, 0.75
        durations = [15.0, 30.0, 60.0, 90.0, 120.0]
        intensities = [A_true / (t + B_true) ** C_true for t in durations]

        params = fit_talbot3_to_table(durations, intensities)

        for t, I_true in zip(durations, intensities):
            I_fit = params["A"] / (t + params["B"]) ** params["C"]
            assert abs(I_fit - I_true) / I_true < 0.01, (
                f"Fit error > 1% at t={t}: expected {I_true:.2f}, got {I_fit:.2f}"
            )

    def test_fit_returns_positive_params(self):
        """All fitted parameters should be positive."""
        durations = [15.0, 30.0, 60.0, 120.0]
        intensities = [100.0, 70.0, 45.0, 28.0]

        params = fit_talbot3_to_table(durations, intensities)
        assert params["A"] > 0
        assert params["B"] > 0
        assert params["C"] > 0
