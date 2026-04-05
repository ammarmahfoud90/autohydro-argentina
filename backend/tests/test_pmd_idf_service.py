"""Tests para el servicio de estimación IDF desde PMD."""
import pytest
from app.services.pmd_idf_service import (
    get_pmd,
    compute_dit_intensity,
    estimate_idf_from_pmd,
    PMD_CAPITALES,
)


def test_pmd_datos_disponibles():
    """Verificar que las 25 ciudades tienen datos para todos los TR."""
    trs = [2, 5, 10, 25, 50, 100]
    for city, data in PMD_CAPITALES.items():
        for tr in trs:
            assert tr in data, f"Ciudad {city} no tiene PMD para TR={tr}"
            assert data[tr] > 0, f"Ciudad {city} TR={tr}: PMD={data[tr]} ≤ 0"


def test_pmd_crece_con_tr():
    """PMD debe crecer con TR para todas las ciudades."""
    trs = [2, 5, 10, 25, 50, 100]
    for city, data in PMD_CAPITALES.items():
        valores = [data[tr] for tr in trs]
        for i in range(len(valores) - 1):
            assert valores[i] < valores[i + 1], (
                f"{city}: PMD({trs[i]})={valores[i]} >= PMD({trs[i+1]})={valores[i+1]}"
            )


def test_dit_intensidad_decrece_con_duracion():
    """Para el mismo TR, intensidad debe decrecer al aumentar duración."""
    pmd = 100
    tr = 25
    duraciones = [10, 30, 60, 120, 360, 1440]
    intensidades = [compute_dit_intensity(pmd, d, tr) for d in duraciones]
    for i in range(len(intensidades) - 1):
        assert intensidades[i] > intensidades[i + 1], (
            f"DIT: i({duraciones[i]})={intensidades[i]:.1f} <= i({duraciones[i+1]})={intensidades[i+1]:.1f}"
        )


def test_dit_intensidad_crece_con_tr():
    """Para la misma duración, intensidad debe crecer con TR."""
    pmd_by_tr = {2: 62, 5: 82, 10: 96, 25: 114, 50: 128, 100: 142}
    trs = [2, 5, 10, 25, 50, 100]
    intensidades = [
        compute_dit_intensity(pmd_by_tr[tr], 60, tr)
        for tr in trs
    ]
    for i in range(len(intensidades) - 1):
        assert intensidades[i] < intensidades[i + 1], (
            f"DIT: i(TR={trs[i]})={intensidades[i]:.1f} >= i(TR={trs[i+1]})={intensidades[i+1]:.1f}"
        )


def test_estimacion_completa_buenos_aires():
    """Verificar que la estimación completa retorna estructura correcta."""
    result = estimate_idf_from_pmd("Buenos Aires")
    assert result["city"] == "Buenos Aires"
    assert "idf_table" in result
    assert "warnings" in result
    assert len(result["warnings"]) >= 3
    for tr in [2, 5, 10, 25, 50, 100]:
        assert str(tr) in result["idf_table"]


def test_ciudad_invalida():
    """Ciudad no encontrada debe lanzar ValueError."""
    with pytest.raises(ValueError, match="no encontrada"):
        estimate_idf_from_pmd("Ciudad Inventada")


def test_intensidad_24h_consistente_con_pmd():
    """
    Para TR=2, phi_T ≈ 0, por lo que el Modelo DIT debe reproducir
    exactamente PMD_2/24 a d=1440 min.
    """
    pmd_2 = 100
    tr = 2
    i_24h = compute_dit_intensity(pmd_2, 1440, tr)
    i_esperada = pmd_2 / 24

    error_pct = abs(i_24h - i_esperada) / i_esperada * 100
    assert error_pct < 1.0, (
        f"i(24h, TR=2)={i_24h:.4f} mm/h, esperado {i_esperada:.4f} mm/h (error={error_pct:.2f}%)"
    )
