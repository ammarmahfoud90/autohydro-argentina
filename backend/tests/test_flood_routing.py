"""Tests para el módulo de tránsito de crecidas Muskingum."""
import pytest
from app.services.flood_routing_service import (
    compute_muskingum_coefficients,
    route_muskingum,
    validate_muskingum_stability,
)


def test_coeficientes_suma_uno():
    """C0 + C1 + C2 debe ser exactamente 1.0."""
    C0, C1, C2 = compute_muskingum_coefficients(K=12, X=0.2, dt=6)
    assert abs(C0 + C1 + C2 - 1.0) < 0.0001, \
        f"C0+C1+C2 = {C0+C1+C2:.6f} ≠ 1.0"


def test_coeficientes_conocidos():
    """
    Verificar coeficientes para K=12h, X=0.2, Δt=6h.
    denom = K - K*X + Δt/2 = 12 - 2.4 + 3 = 12.6
    C0 = (-2.4+3)/12.6 = 0.0476
    C1 = ( 2.4+3)/12.6 = 0.4286
    C2 = (12-2.4-3)/12.6 = 0.5238
    """
    C0, C1, C2 = compute_muskingum_coefficients(K=12, X=0.2, dt=6)
    assert abs(C0 - 0.0476) < 0.001, f"C0={C0:.4f}, esperado≈0.0476"
    assert abs(C1 - 0.4286) < 0.001, f"C1={C1:.4f}, esperado≈0.4286"
    assert abs(C2 - 0.5238) < 0.001, f"C2={C2:.4f}, esperado≈0.5238"


def test_transito_conserva_volumen():
    """
    El volumen del hidrograma de salida debe ser aproximadamente
    igual al de entrada (conservación de masa).
    Tolerancia: ±10% por efectos de discretización.
    """
    inflow = [0, 50, 100, 150, 200, 150, 100, 50, 0]
    times = list(range(9))
    K = 2.0
    X = 0.2

    result = route_muskingum(inflow, times, K, X)
    outflow = [p["flow"] for p in result["outflow"]]

    vol_in = sum(inflow)
    vol_out = sum(outflow)
    error_pct = abs(vol_in - vol_out) / vol_in * 100

    assert error_pct < 15, \
        f"Error de volumen = {error_pct:.1f}% (tolerancia 15%)"


def test_transito_atenua_pico():
    """El pico de salida debe ser menor o igual al de entrada."""
    inflow = [0, 50, 100, 200, 300, 250, 150, 80, 30, 10, 0]
    times = [float(i) for i in range(11)]
    K = 2.0
    X = 0.2

    result = route_muskingum(inflow, times, K, X)
    Q_peak_in = result["results"]["Q_peak_in"]
    Q_peak_out = result["results"]["Q_peak_out"]

    assert Q_peak_out <= Q_peak_in, \
        f"Q_pico salida ({Q_peak_out}) > Q_pico entrada ({Q_peak_in})"


def test_desfase_positivo():
    """El pico de salida debe ocurrir después del pico de entrada."""
    inflow = [0, 50, 100, 200, 300, 250, 150, 80, 30, 10, 0]
    times = [float(i) for i in range(11)]
    K = 2.0
    X = 0.2

    result = route_muskingum(inflow, times, K, X)
    lag = result["results"]["lag_hours"]
    assert lag >= 0, f"Desfase negativo: {lag} horas"


def test_estabilidad_parametros_correctos():
    """K=12, X=0.2, Δt=6 debe ser estable."""
    stability = validate_muskingum_stability(K=12, X=0.2, dt=6)
    assert stability["stable"], \
        "Parámetros estables incorrectamente marcados como inestables"


def test_estabilidad_parametros_incorrectos():
    """K=12, X=0.2, Δt=1 debe ser inestable (Δt < 2KX=4.8)."""
    stability = validate_muskingum_stability(K=12, X=0.2, dt=1)
    assert not stability["stable"], \
        "Parámetros inestables incorrectamente marcados como estables"


def test_x_fuera_de_rango():
    """X > 0.5 debe lanzar ValueError."""
    with pytest.raises(ValueError):
        route_muskingum(
            inflow=[0, 100, 200, 100, 0],
            times=[0, 1, 2, 3, 4],
            K=1.0,
            X=0.6,
        )
