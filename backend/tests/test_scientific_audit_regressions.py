"""Independent reference cases from the scientific audit (2026-10-11).

Sources and applicability are documented in docs/scientific-validation.md.
Golden values are fixed here: the tests do not call the implementation to
construct their expected results.
"""

import math

import pytest

from app.services.calculation import run_calculation
from app.services.culvert_service import (
    _critical_depth_circular,
    _inlet_control_hw,
    _outlet_control_hw,
)
from app.services.frequency_analysis_service import log_pearson_iii_quantile
from app.services.hyetograph_service import _scs_cumulative_fraction
from app.services.hyetograph_service import generate_hyetograph
from app.services.idf_service import calculate_intensity
from app.services.idf_service import get_locality
from app.services.pmd_idf_service import PMD_CAPITALES, compute_dit_intensity
from app.services.flood_routing_service import route_muskingum


@pytest.mark.parametrize("skew,expected", [
    (0.1, 301.9404363169),
    (-0.1, 282.1729825990),
    (0.01, 292.9137034010),
    (0.0, 291.9238478340),
])
def test_log_pearson_quantiles(skew, expected):
    assert log_pearson_iii_quantile(2.0, 0.2, skew, 100) == pytest.approx(expected, rel=1e-10)


@pytest.mark.parametrize("skew", [2.0, -2.0])
def test_log_pearson_exponential_special_cases(skew):
    # Pearson III with skew +/-2 is a translated +/- exponential variable.
    p = 0.99
    k = -1.0 - math.log1p(-p) if skew > 0 else 1.0 + math.log(p)
    expected = 10 ** (2.0 + 0.2 * k)
    assert log_pearson_iii_quantile(2.0, 0.2, skew, 100) == pytest.approx(expected, rel=1e-12)


@pytest.mark.parametrize("diameter,flow,expected", [
    (1.0, 0.1, 0.1743149618027),
    (1.0, 0.5, 0.3988412681459),
    (1.0, 1.0, 0.5730221473028),
    (2.0, 1.0, 0.4663524937706),
])
def test_circular_critical_depth(diameter, flow, expected):
    assert _critical_depth_circular(diameter, flow) == pytest.approx(expected, abs=1e-5)


def test_fhwa_circular_unsubmerged_headwater_si():
    # HDS-5 A.1, chart 1 scale 1: square-edge concrete pipe with headwall.
    assert _inlet_control_hw(0.5, "circular", 1.0, 0.005, "sin_alas") == pytest.approx(
        0.558570530414334, abs=1e-5
    )


def test_fhwa_box_outlet_full_perimeter_and_effective_outlet_depth():
    # Independent full-flow energy balance: A=2, P=6, R=1/3, yc=(1/9.81)^1/3.
    q, width, height, n, length, slope = 2.0, 2.0, 1.0, 0.013, 10.0, 0.005
    velocity = q / (width * height)
    yc = (q * q / (9.81 * width * width)) ** (1 / 3)
    friction = n * n * length * velocity * velocity / ((1 / 3) ** (4 / 3))
    expected = (yc + height) / 2 + 1.5 * velocity ** 2 / (2 * 9.81) + friction - slope * length
    hw, _ = _outlet_control_hw(q, "box", (width, height), slope, length, n, 0, "sin_alas")
    assert hw == pytest.approx(expected, abs=1e-8)


@pytest.mark.parametrize("tr", [2, 5, 10, 25, 50, 100])
def test_pmd_anchor_is_preserved_for_every_return_period(tr):
    pmd = PMD_CAPITALES["Buenos Aires"][tr]
    # Intensity is displayed to 0.01 mm/h, so depth rounding is at most 0.12 mm.
    assert compute_dit_intensity(pmd, 1440, tr) * 24 == pytest.approx(pmd, abs=0.120001)


@pytest.mark.parametrize("hour,fraction", [(6, 0.080), (11, 0.235), (12, 0.663), (13, 0.772), (18, 0.921)])
def test_scs_type_ii_matches_nrcs_hourly_distribution(hour, fraction):
    assert _scs_cumulative_fraction(hour / 24) == pytest.approx(fraction, abs=1e-12)


@pytest.mark.parametrize("duration,expected", [(120, 31.7), (180, 23.6), (360, 13.7)])
def test_salta_matches_published_ina_cells(duration, expected):
    # The published table is rounded to 0.1 mm/h; the fitted DIT equation
    # legitimately returns more precision and is not forced to this rounding.
    table = get_locality("salta_capital")["idf_table"]
    index = table["durations_min"].index(duration)
    assert table["intensities"]["5"][index] == expected


@pytest.mark.parametrize("times", [[0, 0, 1], [0, 1, 0.5], [0, 1, 3]])
def test_muskingum_rejects_invalid_time_grid(times):
    with pytest.raises(ValueError):
        route_muskingum([0, 10, 0], times, K=2, X=0.2)


def test_muskingum_rejects_negative_coefficients():
    with pytest.raises(ValueError):
        route_muskingum([0, 10, 0], [0, 0.1, 0.2], K=2, X=0.2)


def _rational_payload():
    return dict(locality_id="amgr", return_period=25, duration_min=60,
                area_km2=1.0, length_km=1.0, slope=0.01, method="rational",
                runoff_coeff=0.6, tc_formulas=["temez"])


def test_calculation_echoes_reproducible_inputs():
    payload = _rational_payload()
    result = run_calculation(payload)
    assert result["calculation_inputs"]["length_km"] == 1.0
    assert result["calculation_inputs"]["slope"] == 0.01
    assert result["calculation_inputs"]["duration_min"] == 60
    assert result["duration_min"] == result["effective_duration_min"]


def test_idf_extrapolation_is_preserved_in_calculation_warnings():
    payload = {**_rational_payload(), "length_km": 0.01}
    result = run_calculation(payload)
    assert result["idf_extrapolated"] is True
    assert any("duraci" in w.lower() and ("rango" in w.lower() or "extrapol" in w.lower()) for w in result["warnings"])


@pytest.mark.parametrize("cn", [75, 100])
def test_scs_hydrograph_conserves_direct_runoff_volume(cn):
    payload = {**_rational_payload(), "method": "scs_cn", "cn_override": cn}
    result = run_calculation(payload)
    expected_volume = result["runoff_depth_mm"] * payload["area_km2"] * 1000
    times = result["hydrograph_times"]
    flows = result["hydrograph_flows"]
    actual_volume = sum((times[i] - times[i - 1]) * 3600 * (flows[i] + flows[i - 1]) / 2 for i in range(1, len(times)))
    assert actual_volume == pytest.approx(expected_volume, rel=5e-4, abs=0.1)
    assert result["runoff_volume_m3"] == pytest.approx(expected_volume, abs=0.1)
    baseline = next(point for point in result["cn_sensitivity"] if point["label"] == "CN")
    assert baseline["cn"] == cn
    assert baseline["peak_flow_m3s"] == result["peak_flow_m3s"]


@pytest.mark.parametrize("method", ["alternating_blocks", "scs_type_ii", "chicago", "uniform"])
@pytest.mark.parametrize("peak_fraction", [0.43, 0.67])
def test_design_storm_conserves_rainfall_with_peak_between_steps(method, peak_fraction):
    result = generate_hyetograph("amgr", 25, 90, 15, method, r=peak_fraction)
    expected = calculate_intensity("amgr", 25, 90)["intensity_mm_hr"] * 1.5
    assert sum(result["depths_mm"]) == pytest.approx(expected, abs=0.001)
    assert result["total_depth_mm"] == pytest.approx(expected, abs=0.001)
    assert all(depth >= 0 for depth in result["depths_mm"])


def test_hyetograph_uses_selected_neuquen_station():
    result = generate_hyetograph("neuquen_zona_aluvional", 25, 60, 10, "uniform",
                                station_name="Aero Neuquén")
    expected = calculate_intensity("neuquen_zona_aluvional", 25, 60,
                                   station_name="Aero Neuquén")["intensity_mm_hr"]
    assert result["total_depth_mm"] == pytest.approx(expected, abs=0.001)
    assert result["station_name"] == "Aero Neuquén"


def test_hyetograph_does_not_silently_shorten_duration():
    with pytest.raises(ValueError, match="múltiplo"):
        generate_hyetograph("amgr", 25, 61, 10, "uniform")


@pytest.mark.parametrize("dt", [0.8, 1.0, 3.2])
def test_muskingum_balance_accounts_for_remaining_storage(dt):
    result = route_muskingum([5, 30, 20, 10], [i * dt for i in range(4)],
                             K=2, X=0.2, Q_initial=5)["results"]
    assert result["mass_balance_error_m3"] == pytest.approx(0, abs=1e-8)
    assert result["volume_in_m3"] - result["volume_out_m3"] == pytest.approx(
        result["storage_final_m3"] - result["storage_initial_m3"], abs=1e-8)
