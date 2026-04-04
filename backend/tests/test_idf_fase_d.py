"""
Tests para FASE D — Expansión IDF Fase 2

Modelo probado:
  - simple_scaling_table: tabla IDF directa con interpolación log-lineal en TR

Este modelo no tiene fórmula analítica. Usa los valores de la tabla publicada
en el informe INA-CRA IT Nº 145 (Catamarca, El Rodeo, 2012).

Duración mínima: 60 minutos (no hay datos sub-horarios).
Duración máxima: 720 minutos (12 horas).
TRs disponibles: 2, 5, 10, 25, 50, 100, 200 años.

Localidades:
  - catamarca_el_rodeo (simple_scaling_table)
"""

import pytest
from app.services.idf_service import calculate_intensity


# =============================================================================
# EL RODEO — LECTURA DIRECTA DE TABLA (sin interpolación)
# =============================================================================

class TestCatamarcaElRodeoTablaDirecta:
    """Tests de lectura directa de valores tabulados — sin interpolación."""

    def test_tr10_d60(self):
        """TR=10, d=60 min → tabla dice 64.5 mm/h exacto."""
        result = calculate_intensity(
            locality_id="catamarca_el_rodeo",
            return_period=10,
            duration_min=60
        )
        assert abs(result["intensity_mm_hr"] - 64.5) < 0.01

    def test_tr25_d120(self):
        """TR=25, d=120 min → tabla dice 42.3 mm/h exacto."""
        result = calculate_intensity(
            locality_id="catamarca_el_rodeo",
            return_period=25,
            duration_min=120
        )
        assert abs(result["intensity_mm_hr"] - 42.3) < 0.01

    def test_tr100_d360(self):
        """TR=100, d=360 min → tabla dice 20.2 mm/h exacto."""
        result = calculate_intensity(
            locality_id="catamarca_el_rodeo",
            return_period=100,
            duration_min=360
        )
        assert abs(result["intensity_mm_hr"] - 20.2) < 0.01


# =============================================================================
# EL RODEO — INTERPOLACIÓN EN TR
# =============================================================================

class TestCatamarcaElRodeoInterpolacion:
    """Tests de interpolación log-lineal en TR."""

    def test_tr15_d60_between_tr10_tr25(self):
        """
        TR=15 entre TR=10 (64.5) y TR=25 (77.5), d=60 min.
        Con interpolación log-lineal, el resultado debe estar entre 64.5 y 77.5.
        """
        result = calculate_intensity(
            locality_id="catamarca_el_rodeo",
            return_period=15,
            duration_min=60
        )
        assert 64.5 < result["intensity_mm_hr"] < 77.5


# =============================================================================
# EL RODEO — VALIDACIONES DE ERROR
# =============================================================================

class TestCatamarcaElRodeoErrores:
    """Tests de rechazo para duraciones y TRs fuera de rango."""

    def test_duration_below_minimum_raises(self):
        """d=30 min < mínimo (60 min) → debe lanzar ValueError."""
        with pytest.raises(ValueError, match="60"):
            calculate_intensity(
                locality_id="catamarca_el_rodeo",
                return_period=10,
                duration_min=30
            )

    def test_duration_above_maximum_raises(self):
        """d=1440 min > máximo (720 min) → debe lanzar ValueError."""
        with pytest.raises(ValueError, match="720"):
            calculate_intensity(
                locality_id="catamarca_el_rodeo",
                return_period=10,
                duration_min=1440
            )

    def test_tr_above_maximum_raises(self):
        """TR=500 > máximo (200) → debe lanzar ValueError."""
        with pytest.raises(ValueError):
            calculate_intensity(
                locality_id="catamarca_el_rodeo",
                return_period=500,
                duration_min=60
            )

    def test_tr_below_minimum_raises(self):
        """TR=1 < mínimo (2) → debe lanzar ValueError."""
        with pytest.raises(ValueError):
            calculate_intensity(
                locality_id="catamarca_el_rodeo",
                return_period=1,
                duration_min=60
            )
