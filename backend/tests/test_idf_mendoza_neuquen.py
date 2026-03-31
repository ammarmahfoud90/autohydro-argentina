"""
Tests for IDF models: INA-CRA Mendoza (mendoza_pedemonte) and SsRH Neuquén (neuquen_zona_aluvional).

All expected values are derived from the source formulas as documented in the task spec.
No values are invented or approximated — each assertion reproduces the hand-calculation
shown in the spec comments.
"""

import pytest
from app.services.idf_service import calculate_intensity


# ── Mendoza (INA-CRA 2008) ─────────────────────────────────────────────────────

def test_mendoza_tr2_60min():
    # D = 60 min = 1.0 h
    # I = 36.049 / (1.0 + 0.268)^0.883
    # (1.268)^0.883 = exp(0.883 * ln(1.268)) = exp(0.883 * 0.23715) = exp(0.20940) = 1.23277
    # I = 36.049 / 1.23277 = 29.24 mm/h
    result = calculate_intensity("mendoza_pedemonte", 2, 60)
    assert abs(result["intensity_mm_hr"] - 29.24) < 0.5


def test_mendoza_tr100_30min():
    # D = 30 min = 0.5 h
    # I = 100.498 / (0.5 + 0.268)^0.883
    # (0.768)^0.883 = exp(0.883 * ln(0.768)) = exp(0.883 * (-0.26399)) = exp(-0.23310) = 0.79193
    # I = 100.498 / 0.79193 = 126.90 mm/h
    result = calculate_intensity("mendoza_pedemonte", 100, 30)
    assert abs(result["intensity_mm_hr"] - 126.90) < 1.0


def test_mendoza_tr200_120min():
    # D = 120 min = 2.0 h
    # I = 111.088 / (2.0 + 0.268)^0.883
    # (2.268)^0.883 = exp(0.883 * ln(2.268)) = exp(0.883 * 0.81895) = exp(0.72313) = 2.06079
    # I = 111.088 / 2.06079 = 53.91 mm/h
    result = calculate_intensity("mendoza_pedemonte", 200, 120)
    assert abs(result["intensity_mm_hr"] - 53.91) < 0.5


def test_mendoza_invalid_tr():
    with pytest.raises(ValueError):
        calculate_intensity("mendoza_pedemonte", 500, 60)


# ── Neuquén (SsRH 2018) ────────────────────────────────────────────────────────

def test_neuquen_aero_tr10_30min():
    # P_24h Aero Neuquén TR=10 = 74 mm
    # P_1h = 0.59 * 74 = 43.66 mm
    # D = 30 min = 0.5 h
    # I = (1.041 * 0.5^0.49 * 43.66) / 0.5
    # 0.5^0.49 = exp(0.49 * ln(0.5)) = exp(0.49 * (-0.69315)) = exp(-0.33964) = 0.71177
    # I = (1.041 * 0.71177 * 43.66) / 0.5
    # I = (1.041 * 31.063) / 0.5 = 32.337 / 0.5 = 64.67 mm/h
    result = calculate_intensity("neuquen_zona_aluvional", 10, 30, station_name="Aero Neuquén")
    assert abs(result["intensity_mm_hr"] - 64.67) < 1.0


def test_neuquen_catriel_tr25_180min():
    # P_24h Catriel TR=25 = 82 mm
    # I_24 = 82 / 24 = 3.4167 mm/h
    # D = 180 min = 3.0 h (usar MIC)
    # I = 13.98 * 3.4167 * 3.0^(-0.83)
    # 3.0^(-0.83) = exp(-0.83 * ln(3.0)) = exp(-0.83 * 1.09861) = exp(-0.91184) = 0.40171
    # I = 13.98 * 3.4167 * 0.40171 = 19.17 mm/h
    result = calculate_intensity("neuquen_zona_aluvional", 25, 180, station_name="Catriel")
    assert abs(result["intensity_mm_hr"] - 19.17) < 0.5


def test_neuquen_invalid_station():
    with pytest.raises(ValueError):
        calculate_intensity("neuquen_zona_aluvional", 10, 60, station_name="Buenos Aires")


def test_neuquen_invalid_tr():
    with pytest.raises(ValueError):
        calculate_intensity("neuquen_zona_aluvional", 200, 60, station_name="Aero Neuquén")
