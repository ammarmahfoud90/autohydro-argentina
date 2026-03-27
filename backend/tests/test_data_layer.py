"""
Data layer unit tests — validate IDF, CN, and Tc calculations.
Run with: ./venv/Scripts/python -m pytest tests/test_data_layer.py -v
"""

import math
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.idf_service import get_localities, get_locality, calculate_intensity
from app.data.cn_argentina import CN_ARGENTINA, calculate_composite_cn, get_cn_value
from app.services.tc_service import (
    calculate_tc_kirpich,
    calculate_tc_california,
    calculate_tc_temez,
    calculate_tc_giandotti,
    calculate_tc_ventura_heras,
    calculate_tc_passini,
    calculate_all_tc,
)


# ── IDF Tests ────────────────────────────────────────────────────────────────

class TestIDFData:
    def test_three_localities_loaded(self):
        localities = get_localities()
        assert len(localities) == 3

    def test_locality_ids(self):
        ids = {loc["id"] for loc in get_localities()}
        assert ids == {"amgr", "el_colorado", "pr_saenz_pena"}

    def test_all_localities_have_required_fields(self):
        required = {"id", "name", "province", "return_periods", "durations_min", "source"}
        for loc in get_localities():
            assert required.issubset(loc.keys()), f"Missing fields in {loc['id']}"

    def test_amgr_intensity_decreases_with_duration(self):
        i30 = calculate_intensity("amgr", return_period=10, duration_min=30)["intensity_mm_hr"]
        i120 = calculate_intensity("amgr", return_period=10, duration_min=120)["intensity_mm_hr"]
        assert i30 > i120

    def test_amgr_intensity_increases_with_return_period(self):
        i10 = calculate_intensity("amgr", return_period=10, duration_min=60)["intensity_mm_hr"]
        i25 = calculate_intensity("amgr", return_period=25, duration_min=60)["intensity_mm_hr"]
        assert i25 > i10

    def test_calculate_intensity_returns_expected_keys(self):
        result = calculate_intensity("amgr", return_period=10, duration_min=60)
        assert "intensity_mm_hr" in result
        assert "return_period" in result
        assert "duration_min" in result
        assert "locality_id" in result
        assert result["locality_id"] == "amgr"

    def test_unknown_locality_raises(self):
        with pytest.raises(ValueError, match="not found"):
            get_locality("ciudad_inexistente")

    def test_out_of_range_return_period_raises(self):
        with pytest.raises(ValueError, match="outside the valid range"):
            calculate_intensity("amgr", return_period=100, duration_min=60)

    def test_out_of_range_duration_raises(self):
        with pytest.raises(ValueError, match="outside the valid range"):
            calculate_intensity("amgr", return_period=10, duration_min=5)


# ── CN Tests ─────────────────────────────────────────────────────────────────

class TestCNData:
    def test_get_cn_simple(self):
        cn = get_cn_value("calles_pavimentadas", "A")
        assert cn == 98

    def test_get_cn_condition_based(self):
        cn_poor = get_cn_value("pastizal_natural", "B", "poor")
        cn_good = get_cn_value("pastizal_natural", "B", "good")
        assert cn_poor > cn_good, "Poor condition should have higher CN"

    def test_composite_cn_single(self):
        cn = calculate_composite_cn(
            [{"land_use": "calles_pavimentadas", "area_percent": 100}],
            soil_group="A",
        )
        assert abs(cn - 98.0) < 0.1

    def test_composite_cn_weighted(self):
        cn = calculate_composite_cn(
            [
                {"land_use": "calles_pavimentadas", "area_percent": 50},
                {"land_use": "residencial_alta_densidad", "area_percent": 50},
            ],
            soil_group="B",
        )
        expected = 0.5 * 98 + 0.5 * 85
        assert abs(cn - expected) < 0.1

    def test_composite_cn_bad_percent_raises(self):
        with pytest.raises(ValueError, match="100%"):
            calculate_composite_cn(
                [{"land_use": "calles_pavimentadas", "area_percent": 60}],
                soil_group="A",
            )

    def test_unknown_land_use_raises(self):
        with pytest.raises(ValueError, match="not found"):
            get_cn_value("uso_inexistente", "A")


# ── Tc Tests ─────────────────────────────────────────────────────────────────

class TestTcFormulas:
    def test_kirpich_manual(self):
        """Kirpich: L=500m, S=0.02 → Tc = 0.0195 * 500^0.77 * 0.02^-0.385 [min]"""
        L, S = 500.0, 0.02
        expected_min = 0.0195 * (L ** 0.77) * (S ** -0.385)
        result = calculate_tc_kirpich(L, S)
        assert abs(result.tc_minutes - expected_min) < 0.01
        assert result.tc_hours == pytest.approx(expected_min / 60, rel=1e-3)

    def test_california_manual(self):
        """California: L=2km, H=50m."""
        L, H = 2.0, 50.0
        expected_min = 57 * ((L ** 3) / H) ** 0.385
        result = calculate_tc_california(L, H)
        assert abs(result.tc_minutes - expected_min) < 0.01

    def test_temez_manual(self):
        """Témez: L=5km, S=0.01 → Tc = 0.3 * (5/0.01^0.25)^0.76 [hr]"""
        L, S = 5.0, 0.01
        expected_hr = 0.3 * ((L / (S ** 0.25)) ** 0.76)
        result = calculate_tc_temez(L, S)
        assert abs(result.tc_hours - expected_hr) < 0.001

    def test_giandotti_manual(self):
        """Giandotti: A=20km², L=8km, Hm=200m."""
        A, L, Hm = 20.0, 8.0, 200.0
        expected_hr = (4 * math.sqrt(A) + 1.5 * L) / (0.8 * math.sqrt(Hm))
        result = calculate_tc_giandotti(A, L, Hm)
        assert abs(result.tc_hours - expected_hr) < 0.001

    def test_ventura_heras_manual(self):
        A, S = 10.0, 0.005
        expected_hr = 0.3 * math.sqrt(A / S)
        result = calculate_tc_ventura_heras(A, S)
        assert abs(result.tc_hours - expected_hr) < 0.001

    def test_passini_manual(self):
        A, L, S = 15.0, 6.0, 0.008
        expected_hr = 0.108 * ((A * L) ** (1 / 3)) / math.sqrt(S)
        result = calculate_tc_passini(A, L, S)
        assert abs(result.tc_hours - expected_hr) < 0.001

    def test_all_tc_returns_results(self):
        results = calculate_all_tc(
            L_m=3000, L_km=3.0, S=0.01, A_km2=8.0, H_m=80.0, Hm_m=150.0
        )
        assert len(results) == 6  # all formulas should compute

    def test_all_tc_missing_optional_skips_gracefully(self):
        # Without H_m and Hm_m, California and Giandotti should be skipped
        results = calculate_all_tc(L_m=3000, L_km=3.0, S=0.01, A_km2=8.0)
        formula_keys = {r["formula"] for r in results}
        assert "california" not in formula_keys
        assert "giandotti" not in formula_keys
        assert "temez" in formula_keys

    def test_kirpich_zero_inputs_raise(self):
        with pytest.raises(ValueError):
            calculate_tc_kirpich(0, 0.01)

    def test_tc_results_positive(self):
        results = calculate_all_tc(
            L_m=2000, L_km=2.0, S=0.005, A_km2=5.0, H_m=60.0, Hm_m=120.0
        )
        for r in results:
            assert r["tcHours"] > 0
            assert r["tcMinutes"] > 0
