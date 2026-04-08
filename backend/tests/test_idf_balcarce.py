"""
IDF tests for Balcarce (Buenos Aires) — Sherman Power model with table interpolation.

Expected values are taken directly from the published IDF table in
buenos_aires_balcarce.json (Puricelli & Marino 2014, INTA Balcarce).
Tolerance is ±5 % of the table value to allow for bilinear interpolation
rounding at exact table nodes.

AUDIT-003: Verified that table interpolation is used (formula_used == False)
and that interpolated intensities match published values at table nodes.
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.idf_service import calculate_intensity

LOC = "buenos_aires_balcarce"
TOL = 0.05  # 5 % relative tolerance


def _pct(got, expected):
    return abs(got - expected) / expected


class TestBalcarceIDFTable:
    """Values at exact table nodes — interpolation should match within 5 %."""

    def test_tr25_d30(self):
        """TR=25, d=30 min → 95.8 mm/hr (table)."""
        r = calculate_intensity(LOC, return_period=25, duration_min=30)
        assert _pct(r["intensity_mm_hr"], 95.8) < TOL, (
            f"TR=25 d=30: {r['intensity_mm_hr']:.2f} mm/hr, expected ~95.8"
        )

    def test_tr25_d60(self):
        """TR=25, d=60 min → 59.0 mm/hr (table)."""
        r = calculate_intensity(LOC, return_period=25, duration_min=60)
        assert _pct(r["intensity_mm_hr"], 59.0) < TOL, (
            f"TR=25 d=60: {r['intensity_mm_hr']:.2f} mm/hr, expected ~59.0"
        )

    def test_tr25_d120(self):
        """TR=25, d=120 min → 36.2 mm/hr (table)."""
        r = calculate_intensity(LOC, return_period=25, duration_min=120)
        assert _pct(r["intensity_mm_hr"], 36.2) < TOL, (
            f"TR=25 d=120: {r['intensity_mm_hr']:.2f} mm/hr, expected ~36.2"
        )

    def test_tr10_d60(self):
        """TR=10, d=60 min → 50.5 mm/hr (table)."""
        r = calculate_intensity(LOC, return_period=10, duration_min=60)
        assert _pct(r["intensity_mm_hr"], 50.5) < TOL, (
            f"TR=10 d=60: {r['intensity_mm_hr']:.2f} mm/hr, expected ~50.5"
        )

    def test_tr2_d180(self):
        """TR=2, d=180 min → 16.5 mm/hr (table)."""
        r = calculate_intensity(LOC, return_period=2, duration_min=180)
        assert _pct(r["intensity_mm_hr"], 16.5) < TOL, (
            f"TR=2 d=180: {r['intensity_mm_hr']:.2f} mm/hr, expected ~16.5"
        )

    def test_tr100_d360(self):
        """TR=100, d=360 min → 20.6 mm/hr (table)."""
        r = calculate_intensity(LOC, return_period=100, duration_min=360)
        assert _pct(r["intensity_mm_hr"], 20.6) < TOL, (
            f"TR=100 d=360: {r['intensity_mm_hr']:.2f} mm/hr, expected ~20.6"
        )


class TestBalcarceIDFInterpolated:
    """Values at off-table points — monotonicity and plausibility checks."""

    def test_tr25_d148_plausible(self):
        """TR=25, d=148 min — the original bug point; must be between 36.2 and 27.2 mm/hr."""
        r = calculate_intensity(LOC, return_period=25, duration_min=148)
        i = r["intensity_mm_hr"]
        # d=148 is between d=120 (36.2) and d=180 (27.2) for TR=25
        assert 27.2 < i < 36.2, f"TR=25 d=148: {i:.2f} mm/hr out of expected range (27.2–36.2)"

    def test_intensity_decreases_with_duration(self):
        """Intensity must decrease as duration increases (monotonicity)."""
        durations = [30, 60, 120, 180, 300, 360]
        intensities = [
            calculate_intensity(LOC, return_period=10, duration_min=d)["intensity_mm_hr"]
            for d in durations
        ]
        for i in range(len(intensities) - 1):
            assert intensities[i] > intensities[i + 1], (
                f"Non-monotonic at d={durations[i]}→{durations[i+1]}: "
                f"{intensities[i]:.2f} → {intensities[i+1]:.2f}"
            )

    def test_intensity_increases_with_return_period(self):
        """Intensity must increase with TR (monotonicity)."""
        trs = [2, 5, 10, 25, 50, 100]
        intensities = [
            calculate_intensity(LOC, return_period=tr, duration_min=60)["intensity_mm_hr"]
            for tr in trs
        ]
        for i in range(len(intensities) - 1):
            assert intensities[i] < intensities[i + 1], (
                f"Non-monotonic at TR={trs[i]}→{trs[i+1]}: "
                f"{intensities[i]:.2f} → {intensities[i+1]:.2f}"
            )

    def test_formula_used_false_when_table_present(self):
        """Table interpolation path must be used (formula_used == False)."""
        r = calculate_intensity(LOC, return_period=10, duration_min=60)
        assert r.get("formula_used") is False, (
            "Expected formula_used=False (table interpolation), got formula path"
        )
