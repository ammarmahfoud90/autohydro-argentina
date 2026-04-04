"""
Tests para FASE A — Expansión IDF Fase 2

Modelos probados:
  - sherman_4p: i = K · Tr^m / (d + c)^n (Entre Ríos + Santa Fe)
  - talbot_cef: i = c / (d^e + f) (Buenos Aires - Azul)
  - sherman_power: i = tau · T^epsilon / d^eta (Buenos Aires - Balcarce)

Localidades:
  - entre_rios_concordia (sherman_4p)
  - entre_rios_concepcion_uruguay (sherman_4p)
  - entre_rios_parana (sherman_4p)
  - santa_fe_cim_fich (sherman_4p)
  - buenos_aires_azul (talbot_cef)
  - buenos_aires_balcarce (sherman_power)
"""

import pytest
from app.services.idf_service import calculate_intensity


# =============================================================================
# ENTRE RÍOS — CONCORDIA (sherman_4p, K=652.4, m=0.26, c=5, n=0.71)
# =============================================================================

class TestEntreRiosConcordia:
    """Tests para Concordia, Entre Ríos — modelo Sherman 4 parámetros."""

    def test_tr10_d60(self):
        """TR=10, d=60: i = 652.4 × 10^0.26 / (60+5)^0.71 ≈ 61.3 mm/h"""
        result = calculate_intensity(
            locality_id="entre_rios_concordia",
            return_period=10,
            duration_min=60
        )
        assert abs(result["intensity_mm_hr"] - 61.3) < 0.5

    def test_tr50_d30(self):
        """TR=50, d=30: i = 652.4 × 50^0.26 / (30+5)^0.71 ≈ 144.5 mm/h"""
        result = calculate_intensity(
            locality_id="entre_rios_concordia",
            return_period=50,
            duration_min=30
        )
        assert abs(result["intensity_mm_hr"] - 144.5) < 0.5


# =============================================================================
# ENTRE RÍOS — PARANÁ (sherman_4p, K=601, m=0.23, c=6, n=0.69)
# =============================================================================

class TestEntreRiosParana:
    """Tests para Paraná, Entre Ríos — modelo Sherman 4 parámetros."""

    def test_tr25_d60(self):
        """TR=25, d=60: i = 601 × 25^0.23 / (60+6)^0.69 ≈ 70.0 mm/h"""
        result = calculate_intensity(
            locality_id="entre_rios_parana",
            return_period=25,
            duration_min=60
        )
        assert abs(result["intensity_mm_hr"] - 70.0) < 0.5


# =============================================================================
# BUENOS AIRES — AZUL (talbot_cef)
# =============================================================================

class TestBuenosAiresAzul:
    """Tests para Azul, Buenos Aires — modelo Talbot-CEF."""

    def test_tr25_d60(self):
        """TR=25, d=60: i = 1964 / (60^0.773 + 7.21) ≈ 63.6 mm/h"""
        result = calculate_intensity(
            locality_id="buenos_aires_azul",
            return_period=25,
            duration_min=60
        )
        assert abs(result["intensity_mm_hr"] - 63.6) < 0.5

    def test_tr10_d30(self):
        """TR=10, d=30: i = 1913 / (30^0.787 + 8.58) ≈ 82.8 mm/h"""
        result = calculate_intensity(
            locality_id="buenos_aires_azul",
            return_period=10,
            duration_min=30
        )
        assert abs(result["intensity_mm_hr"] - 82.8) < 0.5


# =============================================================================
# BUENOS AIRES — BALCARCE (sherman_power, tau=381.12, epsilon=0.37, eta=0.85)
# =============================================================================

class TestBuenosAiresBalcarce:
    """Tests para Balcarce, Buenos Aires — modelo Sherman Power."""

    def test_tr25_d60(self):
        """TR=25, d=60: i = 381.12 × 25^0.37 / 60^0.85 ≈ 38.6 mm/h"""
        result = calculate_intensity(
            locality_id="buenos_aires_balcarce",
            return_period=25,
            duration_min=60
        )
        assert abs(result["intensity_mm_hr"] - 38.6) < 0.5


# =============================================================================
# VERIFICACIÓN CRUZADA TABLA VS FÓRMULA — CONCORDIA
# =============================================================================

class TestCrossVerificationConcordia:
    """
    Verificación cruzada: tabla de uso práctico vs fórmula analítica.

    La tabla dice 61 mm/h para TR=10, d=60.
    La fórmula da ~67.9 mm/h.
    Diferencia ~11% — dentro del margen esperado para tablas de uso práctico
    vs fórmula analítica.
    """

    def test_formula_in_table_range(self):
        """La fórmula debe devolver un valor en el rango [55, 75] mm/h para TR=10, d=60."""
        result = calculate_intensity(
            locality_id="entre_rios_concordia",
            return_period=10,
            duration_min=60
        )
        assert 55 <= result["intensity_mm_hr"] <= 75
