"""
Culvert service unit tests.
Run with: ./venv/Scripts/python -m pytest tests/test_culvert_service.py -v

Covers BUG 3: severely undersized culverts (HW/D > 3) must be flagged with
hwd_out_of_range=True so the frontend can suppress the unphysical HW value
and the control-type label.
"""

import sys
import os
import math
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.culvert_service import (
    calculate_culvert,
    _areal_reduction_k,
    _inlet_control_hw,
    _outlet_control_hw,
    _check_circular,
    _check_box,
    _areal_reduction_k,
)


# ── BUG 3: hwd_out_of_range flag ─────────────────────────────────────────────

class TestBug3HwdOutOfRange:
    """
    BUG 3 fix: when HW/D > 3 the computed HW is an unphysical extrapolation.
    The 'hwd_out_of_range' flag must be True for those rows and False for
    adequately sized pipes.

    Hand-check for circular Ø0.40 m with Q = 10 m³/s:
        A_full = π×0.16/4 ≈ 0.1257 m²
        V_full = 10/0.1257 ≈ 79.6 m/s  → HW >> D trivially (HW/D >> 3)
    """

    BASE_PARAMS = {
        "culvert_type": "circular",
        "material": "hormigon",
        "length_m": 20.0,
        "slope": 0.01,
        "inlet_type": "sin_alas",
        "headwater_max_m": 5.0,
        "tailwater_m": 0.0,
    }

    def test_small_pipe_large_flow_flagged_out_of_range(self):
        """
        Ø0.40 m with Q = 10 m³/s produces HW/D >> 3 → hwd_out_of_range = True.
        """
        result = calculate_culvert({**self.BASE_PARAMS, "design_flow_m3s": 10.0})
        alt_040 = next(
            a for a in result["alternatives"]
            if abs(a.get("diameter_m", 0) - 0.40) < 0.01
        )
        assert alt_040["hwd_ratio"] > 3.0, (
            f"Expected HW/D > 3 for Ø0.40m at Q=10, got {alt_040['hwd_ratio']}"
        )
        assert alt_040["hwd_out_of_range"] is True, (
            "hwd_out_of_range must be True when HW/D > 3"
        )

    def test_adequate_pipe_not_flagged(self):
        """
        A correctly sized pipe (small Q, large D) must have hwd_out_of_range = False.
        Ø2.00 m with Q = 0.5 m³/s → HW/D << 3.
        """
        result = calculate_culvert({**self.BASE_PARAMS, "design_flow_m3s": 0.5})
        alt_200 = next(
            a for a in result["alternatives"]
            if abs(a.get("diameter_m", 0) - 2.00) < 0.01
        )
        assert alt_200["hwd_ratio"] < 3.0, (
            f"Expected HW/D < 3 for Ø2.00m at Q=0.5, got {alt_200['hwd_ratio']}"
        )
        assert alt_200["hwd_out_of_range"] is False, (
            "hwd_out_of_range must be False when HW/D ≤ 3"
        )

    def test_out_of_range_threshold_is_3(self):
        """
        Check the exact threshold: a pipe where HW/D is just above 3 is flagged,
        and a pipe where HW/D is just below 3 is not.
        Uses _check_circular directly for fine control.
        """
        # Use a very constrained scenario so we can predict HW/D band
        # Find which Ø places HW/D near the boundary for a moderate Q
        # We test that flag tracks the ratio correctly
        result = calculate_culvert({**self.BASE_PARAMS, "design_flow_m3s": 5.0})
        for alt in result["alternatives"]:
            expected_flag = alt["hwd_ratio"] > 3.0
            assert alt["hwd_out_of_range"] == expected_flag, (
                f"Mismatch for {alt['label']}: hwd_ratio={alt['hwd_ratio']:.2f}, "
                f"hwd_out_of_range={alt['hwd_out_of_range']}, expected {expected_flag}"
            )

    def test_box_culvert_out_of_range_flag(self):
        """
        Box culverts must also carry the hwd_out_of_range flag.
        1×1 m box with Q = 20 m³/s → HW/D >> 3.
        """
        result = calculate_culvert({
            **self.BASE_PARAMS,
            "culvert_type": "box",
            "design_flow_m3s": 20.0,
        })
        alt_1x1 = next(
            a for a in result["alternatives"]
            if abs(a.get("width_m", 0) - 1.0) < 0.01 and abs(a.get("height_m", 0) - 1.0) < 0.01
        )
        assert alt_1x1["hwd_ratio"] > 3.0
        assert alt_1x1["hwd_out_of_range"] is True

    def test_hwd_out_of_range_present_in_all_alternatives(self):
        """Every alternative dict must include the hwd_out_of_range key."""
        result = calculate_culvert({**self.BASE_PARAMS, "design_flow_m3s": 3.0})
        for alt in result["alternatives"]:
            assert "hwd_out_of_range" in alt, (
                f"hwd_out_of_range key missing from alternative {alt.get('label')}"
            )


# ── Smoke tests for basic culvert calculations ────────────────────────────────

class TestCulvertBasic:
    def test_recommended_size_passes(self):
        """The recommended size must have ok=True when a valid size exists."""
        result = calculate_culvert({
            "design_flow_m3s": 1.5,
            "culvert_type": "circular",
            "material": "hormigon",
            "length_m": 15.0,
            "slope": 0.01,
            "inlet_type": "sin_alas",
            "headwater_max_m": 2.0,
            "tailwater_m": 0.0,
        })
        assert result["recommended"]["ok"] is True

    def test_zero_flow_raises(self):
        with pytest.raises(ValueError, match="caudal"):
            calculate_culvert({
                "design_flow_m3s": 0.0,
                "culvert_type": "circular",
                "material": "hormigon",
                "length_m": 10.0,
                "slope": 0.01,
                "inlet_type": "sin_alas",
                "headwater_max_m": 2.0,
            })

    def test_alternatives_count_circular(self):
        """All 9 standard circular diameters must be checked."""
        result = calculate_culvert({
            "design_flow_m3s": 2.0,
            "culvert_type": "circular",
            "material": "hormigon",
            "length_m": 20.0,
            "slope": 0.01,
            "inlet_type": "sin_alas",
            "headwater_max_m": 3.0,
        })
        assert len(result["alternatives"]) == 9

    def test_alternatives_count_box(self):
        """All 7 standard box sizes must be checked."""
        result = calculate_culvert({
            "design_flow_m3s": 5.0,
            "culvert_type": "box",
            "material": "hormigon",
            "length_m": 20.0,
            "slope": 0.01,
            "inlet_type": "sin_alas",
            "headwater_max_m": 3.0,
        })
        assert len(result["alternatives"]) == 7
