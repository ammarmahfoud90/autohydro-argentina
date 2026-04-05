"""Tests para el análisis de frecuencia de caudales."""
import pytest
from app.services.frequency_analysis_service import (
    run_frequency_analysis,
    gumbel_quantile,
    fit_gumbel,
    compute_statistics
)

# Serie de prueba verificada manualmente
SERIE_PRUEBA = [
    245.3, 189.7, 312.4, 156.8, 423.1,
    298.6, 187.4, 334.2, 267.9, 445.8,
    198.3, 389.4, 223.7, 301.5, 278.6,
    167.4, 356.8, 289.3, 412.7, 234.5
]


def test_estadisticas_basicas():
    """Verificar estadísticas descriptivas correctas."""
    stats = compute_statistics(SERIE_PRUEBA)
    assert stats["n"] == 20
    assert abs(stats["mean"] - 285.67) < 1.0
    assert stats["min"] == 156.8
    assert stats["max"] == 445.8


def test_gumbel_tr2():
    """
    Para una distribución Gumbel, Q(TR=2) debe ser cercano a la mediana.
    Q(TR=2) ≈ media - 0.367×alpha
    """
    params = fit_gumbel(SERIE_PRUEBA)
    q_tr2 = gumbel_quantile(
        params["parameters"]["alpha"],
        params["parameters"]["u"],
        2
    )
    mean = sum(SERIE_PRUEBA) / len(SERIE_PRUEBA)
    assert 0.7 * mean < q_tr2 < 1.3 * mean, \
        f"Q(TR=2) Gumbel = {q_tr2:.1f}, media = {mean:.1f}"


def test_gumbel_monotonia():
    """Q debe crecer con TR."""
    params = fit_gumbel(SERIE_PRUEBA)
    trs = [2, 5, 10, 25, 50, 100, 200]
    caudales = [
        gumbel_quantile(
            params["parameters"]["alpha"],
            params["parameters"]["u"],
            tr
        )
        for tr in trs
    ]
    for i in range(len(caudales) - 1):
        assert caudales[i] < caudales[i + 1], \
            f"Q no crece con TR: Q({trs[i]})={caudales[i]:.1f} >= Q({trs[i+1]})={caudales[i+1]:.1f}"


def test_serie_muy_corta():
    """Menos de 5 datos debe lanzar ValueError."""
    with pytest.raises(ValueError, match="al menos 5"):
        run_frequency_analysis([100, 200, 300])


def test_caudal_negativo():
    """Caudales negativos deben lanzar ValueError."""
    with pytest.raises(ValueError, match="positivos"):
        run_frequency_analysis([100, -50, 200, 150, 300])


def test_analisis_completo():
    """El análisis completo retorna las 3 distribuciones."""
    result = run_frequency_analysis(SERIE_PRUEBA)
    assert "gumbel" in result["distributions"]
    assert "log_pearson_iii" in result["distributions"]
    assert "gev" in result["distributions"]
    assert len(result["plotting_positions"]) == 20
    for dist_name, dist in result["distributions"].items():
        if dist.get("quantiles"):
            assert "100" in dist["quantiles"], \
                f"TR=100 no encontrado en {dist_name}"
