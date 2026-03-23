"""
Data layer unit tests — validate IDF, CN, and Tc calculations.
Run with: ./venv/Scripts/python -m pytest tests/test_data_layer.py -v
"""

import math
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.data.idf_argentina import IDF_ARGENTINA, calculate_idf_intensity
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
    def test_fifteen_cities_loaded(self):
        assert len(IDF_ARGENTINA) == 15

    def test_buenos_aires_aeroparque_manual(self):
        """Manual check: T=10yr, t=60min for Buenos Aires Aeroparque."""
        # i = (1656.36 * 10^0.197) / (60 + 13)^0.846
        a, b, c, d = 1656.36, 0.197, 13.0, 0.846
        expected = (a * (10 ** b)) / ((60 + c) ** d)
        result = calculate_idf_intensity("Buenos Aires (Aeroparque)", T=10, t=60)
        assert abs(result - expected) / expected < 0.001, f"Expected {expected:.3f}, got {result:.3f}"

    def test_cordoba_manual(self):
        """Manual check for Córdoba T=25yr, t=30min."""
        a, b, c, d = 2850.0, 0.220, 15.0, 0.900
        expected = (a * (25 ** b)) / ((30 + c) ** d)
        result = calculate_idf_intensity("Córdoba (Observatorio)", T=25, t=30)
        assert abs(result - expected) / expected < 0.001

    def test_out_of_range_duration_raises(self):
        with pytest.raises(ValueError, match="Duration"):
            calculate_idf_intensity("Buenos Aires (Aeroparque)", T=10, t=3)

    def test_out_of_range_return_period_raises(self):
        with pytest.raises(ValueError, match="Return period"):
            calculate_idf_intensity("Mendoza (Aeropuerto)", T=100, t=30)

    def test_unknown_city_raises(self):
        with pytest.raises(ValueError, match="not found"):
            calculate_idf_intensity("Ciudad Inexistente", T=10, t=60)

    def test_intensity_increases_with_return_period(self):
        i10 = calculate_idf_intensity("Rosario", T=10, t=60)
        i50 = calculate_idf_intensity("Rosario", T=50, t=60)
        assert i50 > i10

    def test_intensity_decreases_with_duration(self):
        i30 = calculate_idf_intensity("Rosario", T=10, t=30)
        i120 = calculate_idf_intensity("Rosario", T=10, t=120)
        assert i30 > i120

    def test_all_cities_have_required_fields(self):
        required = {"city", "province", "a", "b", "c", "d", "source", "validRange"}
        for city in IDF_ARGENTINA:
            assert required.issubset(city.keys()), f"Missing fields in {city['city']}"


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
