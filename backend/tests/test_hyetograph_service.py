"""Tests for hyetograph_service.py — verifies Chicago method precipitation total."""

import pytest
from app.services.hyetograph_service import generate_hyetograph


def test_chicago_precipitation_total():
    """Chicago method: total depth must equal IDF depth for the given duration.

    Reference: amgr / TR=10 / D=120 min / dt=15 min / r=0.4
    Expected total ≈ 104.56 mm (tolerance ±1 mm).
    """
    result = generate_hyetograph(
        locality_id="amgr",
        return_period=10,
        duration_min=120,
        time_step_min=15,
        method="chicago",
        r=0.4,
    )
    total = result["total_depth_mm"]
    assert 103.0 <= total <= 106.0, (
        f"Chicago total depth {total:.2f} mm is outside expected range [103, 106] mm"
    )


def test_chicago_block_count():
    """Chicago method produces the expected number of time steps."""
    result = generate_hyetograph(
        locality_id="amgr",
        return_period=10,
        duration_min=120,
        time_step_min=15,
        method="chicago",
        r=0.4,
    )
    assert len(result["depths_mm"]) == 120 // 15  # 8 blocks


def test_chicago_all_depths_nonnegative():
    """No negative incremental depths."""
    result = generate_hyetograph(
        locality_id="amgr",
        return_period=10,
        duration_min=120,
        time_step_min=15,
        method="chicago",
        r=0.4,
    )
    assert all(d >= 0 for d in result["depths_mm"]), "Negative depth found in Chicago output"


def test_alternating_blocks_total_matches_idf():
    """Alternating Blocks: total depth must match IDF depth for the duration."""
    result = generate_hyetograph(
        locality_id="amgr",
        return_period=10,
        duration_min=120,
        time_step_min=15,
        method="alternating_blocks",
    )
    total = result["total_depth_mm"]
    assert 103.0 <= total <= 106.0, (
        f"Alternating Blocks total {total:.2f} mm outside expected range"
    )
