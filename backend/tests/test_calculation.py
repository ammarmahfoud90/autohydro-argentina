"""
Calculation engine unit tests.
Run with: ./venv/Scripts/python -m pytest tests/test_calculation.py -v
"""

import math
import pytest
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.calculation import (
    rational_method,
    modified_rational_method,
    scs_cn_method,
    classify_risk,
    intensity_to_precipitation,
    run_calculation,
    _areal_reduction_k,
)
from app.models.schemas import CalculationRequest
from app.services.idf_service import calculate_intensity as idf_intensity


# ── Rational Method ───────────────────────────────────────────────────────────

class TestRationalMethod:
    def test_basic_formula(self):
        """Q = C * i * A / 3.6"""
        Q = rational_method(C=0.5, i_mm_hr=60.0, A_km2=1.0)
        expected = 0.5 * 60.0 * 1.0 / 3.6
        assert abs(Q - expected) < 1e-6

    def test_known_values(self):
        """C=0.7, i=80mm/hr, A=2km² → Q = 0.7*80*2/3.6 = 31.11 m³/s"""
        Q = rational_method(C=0.7, i_mm_hr=80.0, A_km2=2.0)
        assert abs(Q - 31.111) < 0.001

    def test_impervious_surface(self):
        """C=1.0 (fully impervious) → Q = i*A/3.6"""
        Q = rational_method(C=1.0, i_mm_hr=36.0, A_km2=1.0)
        assert abs(Q - 10.0) < 1e-6

    def test_scales_linearly_with_area(self):
        Q1 = rational_method(C=0.5, i_mm_hr=50.0, A_km2=1.0)
        Q2 = rational_method(C=0.5, i_mm_hr=50.0, A_km2=2.0)
        assert abs(Q2 / Q1 - 2.0) < 1e-6


# ── Modified Rational Method ──────────────────────────────────────────────────

class TestModifiedRationalMethod:
    def test_areal_reduction_k_formula(self):
        """K = 1 - (A^0.1 - 1)/7"""
        A = 10.0
        expected_K = 1.0 - (A ** 0.1 - 1.0) / 7.0
        assert abs(_areal_reduction_k(A) - expected_K) < 1e-6

    def test_small_basin_k_close_to_one(self):
        """For very small basins, K ≈ 1 (negligible areal reduction)."""
        K = _areal_reduction_k(0.01)
        assert K > 0.99

    def test_large_basin_k_less_than_rational(self):
        """Modified Rational should give lower Q than Rational for same parameters."""
        Q_rat = rational_method(C=0.5, i_mm_hr=60.0, A_km2=20.0)
        Q_mod, K = modified_rational_method(C=0.5, i_mm_hr=60.0, A_km2=20.0)
        assert K < 1.0
        assert Q_mod < Q_rat

    def test_k_clipped_min(self):
        """K should not go below 0.1 for unrealistically large areas."""
        K = _areal_reduction_k(1e10)
        assert K >= 0.1

    def test_returns_tuple(self):
        result = modified_rational_method(C=0.6, i_mm_hr=50.0, A_km2=5.0)
        assert len(result) == 2
        Q, K = result
        assert Q > 0
        assert 0 < K <= 1.0


# ── SCS-CN Method ─────────────────────────────────────────────────────────────

class TestSCSCNMethod:
    def test_standard_lambda(self):
        """Standard λ=0.2: Ia = 0.2 * S, S = 25400/CN - 254."""
        CN, P, A, tc = 75.0, 100.0, 5.0, 1.0
        S = 25400.0 / CN - 254.0
        Ia = 0.2 * S
        Q_mm_expected = (P - Ia) ** 2 / (P - Ia + S) if P > Ia else 0.0
        result = scs_cn_method(CN=CN, P_mm=P, A_km2=A, tc_hours=tc, use_pampa_lambda=False)
        assert abs(result["Q_mm"] - Q_mm_expected) < 0.01

    def test_pampa_lambda(self):
        """Pampa Húmeda λ=0.05 produces more runoff than standard λ=0.2."""
        CN, P, A, tc = 75.0, 60.0, 5.0, 1.0
        r_std = scs_cn_method(CN=CN, P_mm=P, A_km2=A, tc_hours=tc, use_pampa_lambda=False)
        r_pam = scs_cn_method(CN=CN, P_mm=P, A_km2=A, tc_hours=tc, use_pampa_lambda=True)
        # Lower Ia → more runoff
        assert r_pam["Q_mm"] > r_std["Q_mm"]

    def test_no_runoff_below_Ia(self):
        """If P < Ia, runoff = 0."""
        CN = 60.0
        S = 25400.0 / CN - 254.0
        Ia = 0.2 * S
        P = Ia * 0.5  # well below Ia
        result = scs_cn_method(CN=CN, P_mm=P, A_km2=1.0, tc_hours=1.0)
        assert result["Q_mm"] == 0.0
        assert result["Qp_m3s"] == 0.0

    def test_peak_discharge_formula(self):
        """Qp = 0.208 * A * Q_mm / Tp;  Tp = D/2 + 0.6*tc (SCS triangular UH)."""
        CN, P, A, tc, D = 85.0, 120.0, 3.0, 0.5, 60.0
        result = scs_cn_method(CN=CN, P_mm=P, A_km2=A, tc_hours=tc, duration_min=D)
        Tp_expected = (D / 60.0) / 2.0 + 0.6 * tc
        Qp_expected = 0.208 * A * result["Q_mm"] / Tp_expected
        assert abs(result["Qp_m3s"] - Qp_expected) < 0.001

    def test_cn100_returns_all_runoff(self):
        """CN=100 means S=0, so all precipitation becomes runoff."""
        result = scs_cn_method(CN=100.0, P_mm=50.0, A_km2=1.0, tc_hours=0.5)
        # With S=0, Q = P (all runoff)
        assert abs(result["Q_mm"] - 50.0) < 0.01

    def test_higher_cn_more_runoff(self):
        P, A, tc = 80.0, 2.0, 1.0
        r70 = scs_cn_method(CN=70.0, P_mm=P, A_km2=A, tc_hours=tc)
        r90 = scs_cn_method(CN=90.0, P_mm=P, A_km2=A, tc_hours=tc)
        assert r90["Q_mm"] > r70["Q_mm"]

    def test_s_ia_values(self):
        CN = 80.0
        result = scs_cn_method(CN=CN, P_mm=100.0, A_km2=1.0, tc_hours=1.0)
        expected_S = 25400.0 / CN - 254.0
        expected_Ia = 0.2 * expected_S
        assert abs(result["S_mm"] - expected_S) < 0.01
        assert abs(result["Ia_mm"] - expected_Ia) < 0.01


# ── Risk Classification ───────────────────────────────────────────────────────

class TestRiskClassification:
    def test_muy_bajo(self):
        level, _ = classify_risk(Q=0.3, infrastructure="alcantarilla_menor", return_period=25)
        assert level == "muy_bajo"

    def test_bajo(self):
        level, _ = classify_risk(Q=1.0, infrastructure="alcantarilla_menor", return_period=25)
        assert level == "bajo"

    def test_moderado(self):
        level, _ = classify_risk(Q=2.0, infrastructure="alcantarilla_menor", return_period=25)
        assert level == "moderado"

    def test_alto(self):
        level, _ = classify_risk(Q=4.0, infrastructure="alcantarilla_menor", return_period=25)
        assert level == "alto"

    def test_muy_alto(self):
        level, _ = classify_risk(Q=10.0, infrastructure="alcantarilla_menor", return_period=25)
        assert level == "muy_alto"

    def test_low_return_period_note(self):
        _, recs = classify_risk(Q=1.0, infrastructure="canal_rural", return_period=5)
        assert recs.period_note is not None
        assert "5" in recs.period_note

    def test_high_return_period_note(self):
        _, recs = classify_risk(Q=1.0, infrastructure="canal_rural", return_period=100)
        assert recs.period_note is not None
        assert "100" in recs.period_note

    def test_mid_return_period_no_note(self):
        _, recs = classify_risk(Q=1.0, infrastructure="canal_rural", return_period=25)
        assert recs.period_note is None

    def test_all_infrastructure_types(self):
        infra_types = [
            "alcantarilla_menor", "alcantarilla_mayor", "puente_menor",
            "puente_mayor", "canal_urbano", "canal_rural", "defensa_costera"
        ]
        for infra in infra_types:
            level, recs = classify_risk(Q=100.0, infrastructure=infra, return_period=25)
            assert level in {"muy_bajo", "bajo", "moderado", "alto", "muy_alto"}
            assert recs.general


# ── Full Calculation Integration ──────────────────────────────────────────────

class TestRunCalculation:
    BASE_RATIONAL = {
        "locality_id": "amgr",
        "return_period": 25,
        "duration_min": 60,
        "area_km2": 2.0,
        "length_km": 3.0,
        "slope": 0.005,
        "method": "rational",
        "runoff_coeff": 0.6,
        "infrastructure_type": "canal_urbano",
        "tc_formulas": ["temez", "ventura_heras"],
        "tc_adopted_formula": "temez",
    }

    BASE_SCS = {
        "locality_id": "amgr",
        "return_period": 25,
        "duration_min": 60,
        "area_km2": 10.0,
        "length_km": 8.0,
        "slope": 0.008,
        "method": "scs_cn",
        "soil_group": "B",
        "land_use_categories": [
            {"land_use": "soja_siembra_directa", "area_percent": 60.0, "condition": "fair"},
            {"land_use": "pastizal_natural", "area_percent": 40.0, "condition": "good"},
        ],
        "infrastructure_type": "canal_rural",
        "tc_formulas": ["temez"],
        "tc_adopted_formula": "temez",
    }

    def test_rational_returns_all_fields(self):
        result = run_calculation(self.BASE_RATIONAL)
        for field in [
            "peak_flow_m3s", "tc_adopted_hours", "intensity_mm_hr",
            "risk_level", "method_comparison", "tc_results",
        ]:
            assert field in result, f"Missing field: {field}"

    def test_rational_flow_positive(self):
        result = run_calculation(self.BASE_RATIONAL)
        assert result["peak_flow_m3s"] > 0

    def test_rational_matches_formula(self):
        """Verify result matches Q = C*i*A/3.6 manually."""
        result = run_calculation(self.BASE_RATIONAL)
        i = result["intensity_mm_hr"]
        C = self.BASE_RATIONAL["runoff_coeff"]
        A = self.BASE_RATIONAL["area_km2"]
        expected = C * i * A / 3.6
        assert abs(result["peak_flow_m3s"] - expected) < 0.001

    def test_modified_rational(self):
        payload = {**self.BASE_RATIONAL, "method": "modified_rational"}
        result = run_calculation(payload)
        assert "areal_reduction_k" in result
        assert 0 < result["areal_reduction_k"] <= 1.0
        assert result["peak_flow_m3s"] > 0

    def test_scs_cn_returns_cn_fields(self):
        result = run_calculation(self.BASE_SCS)
        assert result["cn"] is not None
        assert result["s_mm"] is not None
        assert result["ia_mm"] is not None
        assert result["runoff_depth_mm"] is not None

    def test_scs_cn_flow_positive(self):
        result = run_calculation(self.BASE_SCS)
        assert result["peak_flow_m3s"] > 0

    def test_tc_comparison_has_multiple_results(self):
        result = run_calculation(self.BASE_RATIONAL)
        assert len(result["tc_results"]) == 2  # temez + ventura_heras

    def test_method_comparison_included(self):
        result = run_calculation(self.BASE_RATIONAL)
        methods = {r["method"] for r in result["method_comparison"]}
        assert "rational" in methods
        assert "modified_rational" in methods

    def test_specific_flow_correct(self):
        result = run_calculation(self.BASE_RATIONAL)
        expected = result["peak_flow_m3s"] / self.BASE_RATIONAL["area_km2"]
        assert abs(result["specific_flow_m3s_km2"] - expected) < 1e-4

    def test_invalid_city_raises(self):
        payload = {**self.BASE_RATIONAL, "locality_id": "localidad_inexistente"}
        with pytest.raises((ValueError, Exception)):
            run_calculation(payload)

    def test_rational_without_runoff_coeff_raises(self):
        payload = {**self.BASE_RATIONAL}
        payload.pop("runoff_coeff", None)
        payload["runoff_coeff"] = None
        with pytest.raises(Exception):
            run_calculation(payload)

    def test_risk_level_in_response(self):
        result = run_calculation(self.BASE_RATIONAL)
        assert result["risk_level"] in {"muy_bajo", "bajo", "moderado", "alto", "muy_alto"}


# ── BUG 1: Comparison table intensity at Tc ───────────────────────────────────

class TestBug1ComparisonIntensityAtTc:
    """
    BUG 1 fix: when the primary method is SCS-CN, the Rational and Modified Rational
    rows in method_comparison must use intensity evaluated at Tc (their storm duration),
    NOT the intensity cached from the SCS-CN storm duration.

    Hand-check: Témez Tc for L=2km, S=0.02, A=2km²:
        Tc = 0.3 * (L_m / S^0.5)^0.76  [hr] (Témez formula)
        L_m = 2000 m, S^0.5 = 0.1414
        Tc ≈ 0.3 * (2000/0.1414)^0.76 ≈ 0.3 * 14142^0.76
    This gives Tc around 35–45 min, well below the 240-min SCS storm duration.
    IDF intensity at ~40 min >> intensity at 240 min for any locality,
    so the two intensities differ substantially.
    """

    _BASE_SCS_LONG_DURATION = {
        "locality_id": "amgr",
        "return_period": 25,
        "duration_min": 240,          # long SCS storm duration
        "area_km2": 2.0,
        "length_km": 2.0,
        "slope": 0.02,
        "method": "scs_cn",
        "soil_group": "B",
        "land_use_categories": [
            {"land_use": "soja_siembra_directa", "area_percent": 100.0, "condition": "fair"},
        ],
        "infrastructure_type": "canal_rural",
        "tc_formulas": ["temez"],
        "tc_adopted_formula": "temez",
        "runoff_coeff": 0.6,          # C needed so Rational row appears
    }

    def test_rational_row_uses_intensity_at_tc(self):
        """Rational row intensity == IDF(Tc), not IDF(240 min)."""
        result = run_calculation(self._BASE_SCS_LONG_DURATION)
        tc_min = result["tc_adopted_minutes"]

        rat_row = next(r for r in result["method_comparison"] if r["method"] == "rational")

        i_at_tc = idf_intensity("amgr", return_period=25.0, duration_min=tc_min)["intensity_mm_hr"]
        i_at_240 = idf_intensity("amgr", return_period=25.0, duration_min=240.0)["intensity_mm_hr"]

        # The two intensities must differ significantly (Tc << 240 min)
        assert abs(i_at_tc - i_at_240) > 1.0, (
            f"Test precondition failed: i(Tc={tc_min:.0f}min)={i_at_tc:.2f} ≈ i(240min)={i_at_240:.2f}"
        )

        # Rational row must match i_at_tc, not i_at_240
        assert abs(rat_row["intensity"] - i_at_tc) < 0.5, (
            f"Rational row intensity {rat_row['intensity']:.2f} should equal IDF at "
            f"Tc={tc_min:.0f}min ({i_at_tc:.2f}), not at 240min ({i_at_240:.2f})"
        )

    def test_modified_rational_row_uses_intensity_at_tc(self):
        """Modified Rational row intensity == IDF(Tc), not IDF(240 min)."""
        result = run_calculation(self._BASE_SCS_LONG_DURATION)
        tc_min = result["tc_adopted_minutes"]

        mod_row = next(r for r in result["method_comparison"] if r["method"] == "modified_rational")
        i_at_tc = idf_intensity("amgr", return_period=25.0, duration_min=tc_min)["intensity_mm_hr"]

        assert abs(mod_row["intensity"] - i_at_tc) < 0.5, (
            f"ModRational row intensity {mod_row['intensity']:.2f} should equal IDF at Tc={tc_min:.0f}min ({i_at_tc:.2f})"
        )

    def test_rational_row_intensity_when_primary_is_rational(self):
        """When primary method IS Rational, comparison row reuses the same intensity (no re-lookup)."""
        payload = {
            "locality_id": "amgr",
            "return_period": 25,
            "duration_min": 60,
            "area_km2": 2.0,
            "length_km": 3.0,
            "slope": 0.005,
            "method": "rational",
            "runoff_coeff": 0.6,
            "infrastructure_type": "canal_urbano",
            "tc_formulas": ["temez"],
            "tc_adopted_formula": "temez",
        }
        result = run_calculation(payload)
        tc_min = result["tc_adopted_minutes"]
        rat_row = next(r for r in result["method_comparison"] if r["method"] == "rational")
        i_at_tc = idf_intensity("amgr", return_period=25.0, duration_min=tc_min)["intensity_mm_hr"]
        # Should still match intensity at Tc (Rational auto-locks duration to Tc)
        assert abs(rat_row["intensity"] - i_at_tc) < 0.5


# ── BUG 2: K coefficient label ─────────────────────────────────────────────────

class TestBug2KCoefficientLabel:
    """
    BUG 2 fix: Modified Rational notes must say 'Factor de reducción areal', not 'Témez'.

    Hand-check: K_ARF for A=2 km²:
        K = 1 - (2^0.1 - 1)/7 = 1 - (1.0718 - 1)/7 = 1 - 0.01025 = 0.9897
    So the notes should read "K_ARF=0.990 (Factor de reducción areal)" approximately.
    """

    _PAYLOAD = {
        "locality_id": "amgr",
        "return_period": 25,
        "duration_min": 60,
        "area_km2": 2.0,
        "length_km": 3.0,
        "slope": 0.005,
        "method": "rational",
        "runoff_coeff": 0.6,
        "infrastructure_type": "canal_urbano",
        "tc_formulas": ["temez"],
        "tc_adopted_formula": "temez",
    }

    def test_mod_rational_notes_contain_arf_label(self):
        result = run_calculation(self._PAYLOAD)
        mod_row = next(r for r in result["method_comparison"] if r["method"] == "modified_rational")
        assert "Factor de reducción areal" in mod_row["notes"], (
            f"Expected 'Factor de reducción areal' in notes, got: {mod_row['notes']!r}"
        )

    def test_mod_rational_notes_contain_k_arf(self):
        result = run_calculation(self._PAYLOAD)
        mod_row = next(r for r in result["method_comparison"] if r["method"] == "modified_rational")
        assert "K_ARF" in mod_row["notes"], (
            f"Expected 'K_ARF' in notes, got: {mod_row['notes']!r}"
        )

    def test_mod_rational_notes_not_attributed_to_temez(self):
        """The <1 ARF factor must no longer be labelled as a Témez coefficient."""
        result = run_calculation(self._PAYLOAD)
        mod_row = next(r for r in result["method_comparison"] if r["method"] == "modified_rational")
        assert "Témez" not in mod_row["notes"], (
            f"'Témez' should not appear in ARF notes, got: {mod_row['notes']!r}"
        )

    def test_k_arf_value_for_2km2(self):
        """
        Hand-checked: K_ARF(A=2 km²) = 1 - (2^0.1 - 1)/7 ≈ 0.9897.
        The formula must remain unchanged (only the label changed).
        """
        import math
        k = _areal_reduction_k(2.0)
        expected = 1.0 - (2.0 ** 0.1 - 1.0) / 7.0
        assert abs(k - expected) < 1e-6
        assert abs(k - 0.9897) < 0.001, f"K_ARF(2km²)={k:.4f}, expected ≈0.9897"
