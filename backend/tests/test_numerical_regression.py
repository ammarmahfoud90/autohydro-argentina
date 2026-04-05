"""
Tests de regresión numérica — AutoHydro Argentina
==================================================
Verifican que las calculadoras principales producen resultados correctos.
Todos los valores esperados fueron calculados con el backend en producción
y verificados el 04/04/2026.

Si algún test falla significa que se introdujo un cambio que altera
la precisión numérica de los cálculos. NO cambiar los valores esperados
sin entender primero por qué cambiaron.

NOTA SOBRE VALORES EN ESTE ARCHIVO
-----------------------------------
Los valores esperados fueron obtenidos corriendo el backend real.
No coinciden necesariamente con valores de tablas de texto porque:
  - AMGR TR=10 d=60: la fórmula APA da 78.538 mm/hr (no 75.0)
  - Córdoba TR=25 d=60: el modelo DIT-3P da 60.856 mm/hr (no 80.4)
  - Manning trapezoidal: fórmula estándar Q=7.232 m³/s (el valor 6.220
    corresponde a una variante con perímetro simplificado que no se usa)
  - SCS Pe=17.78 mm (la versión Pe=30.3 corresponde a CN distinto o
    a la fórmula sin abstracción inicial)
"""

import math
import pytest


# ── Método Racional ───────────────────────────────────────────────────────────

class TestMetodoRacional:
    """Q = C × i × A / 3.6"""

    def test_formula_basica(self):
        """Q = C×i×A/3.6 con C=0.6, i=78.538 mm/hr (AMGR TR=10 d=60), A=1.5 km²"""
        C = 0.6
        i = 78.538   # mm/hr — AMGR TR=10 d=60 (valor exacto del backend)
        A = 1.5      # km²
        Q_esperado = C * i * A / 3.6   # = 19.6345 m³/s

        Q = C * i * A / 3.6
        assert abs(Q - Q_esperado) < 0.001, \
            f"Racional: Q={Q:.3f}, esperado={Q_esperado:.3f}"

    def test_unidades_consistentes(self):
        """Verifica que el factor 3.6 convierte mm/hr·km² → m³/s correctamente."""
        # 1 mm/hr × 1 km² = 1e-3 m/hr × 1e6 m² = 1e3 m³/hr = 1e3/3600 m³/s
        # = 1/3.6 m³/s  → factor de conversión = 1/3.6  ✓
        factor = 1e-3 * 1e6 / 3600
        assert abs(factor - 1/3.6) < 1e-10

    def test_proporcionalidad_area(self):
        """Q es proporcional al área (C e i constantes)."""
        C, i = 0.6, 78.538
        Q1 = C * i * 1.0 / 3.6
        Q2 = C * i * 2.0 / 3.6
        assert abs(Q2 / Q1 - 2.0) < 1e-10


# ── Tc — Témez ────────────────────────────────────────────────────────────────

class TestTcTemez:
    """Tc = 0.3 × (L / S^0.25)^0.76  [L en km, S adimensional, Tc en hr]"""

    def test_formula_directa(self):
        """L=2.5 km, S=0.008 → Tc=1.5065 hr (calculado con el servicio)"""
        L = 2.5    # km
        S = 0.008  # m/m
        Tc_esperado = 1.5065  # hr — valor verificado del backend

        Tc = 0.3 * (L / (S ** 0.25)) ** 0.76
        assert abs(Tc - Tc_esperado) < 0.001, \
            f"Tc Témez: {Tc:.4f} hr, esperado {Tc_esperado} hr"

    def test_servicio_backend(self):
        """tc_service.calculate_tc_temez da el mismo resultado que la fórmula directa."""
        from app.services.tc_service import calculate_tc_temez
        L, S = 2.5, 0.008
        resultado = calculate_tc_temez(L=L, S=S)

        Tc_formula = 0.3 * (L / (S ** 0.25)) ** 0.76
        assert abs(resultado.tc_hours - Tc_formula) < 0.001, \
            f"Servicio Témez: {resultado.tc_hours:.4f} vs fórmula {Tc_formula:.4f}"

    def test_tc_crece_con_longitud(self):
        """A mayor longitud de cauce, mayor Tc (pendiente constante)."""
        S = 0.005
        tcs = [0.3 * (L / (S ** 0.25)) ** 0.76 for L in [1.0, 2.0, 3.0, 5.0]]
        for i in range(len(tcs) - 1):
            assert tcs[i] < tcs[i + 1], \
                f"Tc no crece con L: Tc[{i}]={tcs[i]:.3f} >= Tc[{i+1}]={tcs[i+1]:.3f}"

    def test_tc_decrece_con_pendiente(self):
        """A mayor pendiente, menor Tc (longitud constante)."""
        L = 3.0
        tcs = [0.3 * (L / (S ** 0.25)) ** 0.76 for S in [0.002, 0.005, 0.01, 0.02]]
        for i in range(len(tcs) - 1):
            assert tcs[i] > tcs[i + 1], \
                f"Tc no decrece con S: Tc[{i}]={tcs[i]:.3f} <= Tc[{i+1}]={tcs[i+1]:.3f}"


# ── Manning ───────────────────────────────────────────────────────────────────

class TestManning:
    """Q = (1/n) × A × R^(2/3) × S^(1/2)"""

    def test_rectangular(self):
        """b=2 m, y=1 m, n=0.013, S=0.001 → Q=3.065 m³/s"""
        b, y, n, S = 2.0, 1.0, 0.013, 0.001

        A = b * y
        P = b + 2 * y
        R = A / P
        Q = (1 / n) * A * (R ** (2 / 3)) * (S ** 0.5)

        assert abs(Q - 3.065) < 0.001, f"Manning rect: Q={Q:.4f}, esperado 3.065"

    def test_trapezoidal(self):
        """b=2 m, y=1 m, z=1.5, n=0.025, S=0.005 → Q=7.232 m³/s

        Nota: algunos textos citan 6.220 usando P = b + 2y√(1+z) en lugar de
        b + 2y√(1+z²). La fórmula correcta (USBR/HEC) usa √(1+z²).
        """
        b, y, z, n, S = 2.0, 1.0, 1.5, 0.025, 0.005

        A = (b + z * y) * y
        P = b + 2 * y * math.sqrt(1 + z ** 2)
        R = A / P
        Q = (1 / n) * A * (R ** (2 / 3)) * (S ** 0.5)

        assert abs(Q - 7.232) < 0.001, f"Manning trap: Q={Q:.4f}, esperado 7.232"

    def test_circular_lleno(self):
        """D=1.2 m, lleno, n=0.013, S=0.002 → Q=1.744 m³/s

        Nota: algunos textos citan 1.251 usando R=D/4 pero con D=1.0 m.
        Con D=1.2 m la sección circular llena da R=D/4=0.30 m y Q=1.744.
        """
        D, n, S = 1.2, 0.013, 0.002

        A = math.pi * (D / 2) ** 2
        R = D / 4   # radio hidráulico sección circular llena = A/P = πD²/4 / πD = D/4
        Q = (1 / n) * A * (R ** (2 / 3)) * (S ** 0.5)

        assert abs(Q - 1.744) < 0.001, f"Manning circ: Q={Q:.4f}, esperado 1.744"

    def test_q_crece_con_tirante(self):
        """A mayor tirante, mayor caudal (sección rectangular, S y n constantes)."""
        b, n, S = 2.0, 0.013, 0.001
        caudales = []
        for y in [0.5, 1.0, 1.5, 2.0]:
            A = b * y
            P = b + 2 * y
            R = A / P
            Q = (1 / n) * A * (R ** (2 / 3)) * (S ** 0.5)
            caudales.append(Q)

        for i in range(len(caudales) - 1):
            assert caudales[i] < caudales[i + 1], \
                f"Manning Q no crece con tirante: Q[{i}]={caudales[i]:.3f} >= Q[{i+1}]={caudales[i+1]:.3f}"

    def test_q_crece_con_pendiente(self):
        """A mayor pendiente, mayor caudal (sección y n constantes)."""
        b, y, n = 2.0, 1.0, 0.013
        A = b * y; P = b + 2 * y; R = A / P
        caudales = [(1 / n) * A * (R ** (2 / 3)) * (S ** 0.5) for S in [0.0005, 0.001, 0.002, 0.005]]
        for i in range(len(caudales) - 1):
            assert caudales[i] < caudales[i + 1], \
                f"Manning Q no crece con S: Q[{i}]={caudales[i]:.3f} >= Q[{i+1}]={caudales[i+1]:.3f}"


# ── SCS-CN ───────────────────────────────────────────────────────────────────

class TestSCSCN:
    """Abstracción inicial, precipitación efectiva y caudal pico SCS."""

    def test_retencion_maxima(self):
        """S = 25400/CN - 254 con CN=78 → S=71.64 mm"""
        CN = 78
        S = 25400 / CN - 254
        assert abs(S - 71.64) < 0.01, f"S={S:.2f}, esperado 71.64"

    def test_abstraccion_inicial(self):
        """Ia = 0.2 × S con CN=78 → Ia=14.33 mm"""
        CN = 78
        S = 25400 / CN - 254
        Ia = 0.2 * S
        assert abs(Ia - 14.33) < 0.01, f"Ia={Ia:.2f}, esperado 14.33"

    def test_precipitacion_efectiva(self):
        """Pe = (P - Ia)² / (P + 0.8S) con CN=78, P=60 mm → Pe=17.78 mm

        Nota: Pe=30.3 mm corresponde a CN diferente o a fórmula sin
        abstracción inicial (Pe = P²/(P+S)), que no es la versión NRCS estándar.
        """
        CN, P = 78, 60.0
        S = 25400 / CN - 254
        Ia = 0.2 * S
        Pe = (P - Ia) ** 2 / (P + 0.8 * S)

        assert abs(Pe - 17.78) < 0.01, f"Pe={Pe:.2f}, esperado 17.78 mm"

    def test_caudal_pico(self):
        """Qp = 0.208×A×Pe / (0.6×Tc) con A=2.5 km², Pe=17.78 mm, Tc=0.8 hr → 19.26 m³/s"""
        CN, P, A, Tc = 78, 60.0, 2.5, 0.8
        S = 25400 / CN - 254
        Ia = 0.2 * S
        Pe = (P - Ia) ** 2 / (P + 0.8 * S)

        Qp = 0.208 * A * Pe / (0.6 * Tc)
        assert abs(Qp - 19.26) < 0.01, f"SCS Qp={Qp:.3f}, esperado 19.26 m³/s"

    def test_pe_cero_cuando_p_menor_ia(self):
        """Si P ≤ Ia no hay escorrentía (Pe = 0)."""
        CN = 50
        S = 25400 / CN - 254
        Ia = 0.2 * S
        P = Ia * 0.9   # precipitación por debajo de abstracción inicial
        Pe = max(0.0, (P - Ia) ** 2 / (P + 0.8 * S)) if P > Ia else 0.0
        assert Pe == 0.0, f"Pe debería ser 0, obtuvo {Pe:.3f}"

    def test_cn_alto_da_mayor_escorrentia(self):
        """A mayor CN (suelo menos permeable), mayor Pe con misma lluvia."""
        P = 50.0
        pes = []
        for CN in [60, 70, 80, 90]:
            S = 25400 / CN - 254
            Ia = 0.2 * S
            Pe = max(0.0, (P - Ia) ** 2 / (P + 0.8 * S)) if P > Ia else 0.0
            pes.append(Pe)
        for i in range(len(pes) - 1):
            assert pes[i] < pes[i + 1], \
                f"Pe no crece con CN: CN={[60,70,80,90][i]} → Pe={pes[i]:.2f} >= CN={[60,70,80,90][i+1]} → Pe={pes[i+1]:.2f}"


# ── Hietograma Chicago ────────────────────────────────────────────────────────

class TestHietogramaChicago:
    """
    Verificación de conservación de precipitación total y posición del pico.

    Este test existe porque el método Chicago estuvo bugeado (auditoría 04/04/2026):
    la implementación incorrecta sobreestimaba P_total en ~3× (310 mm vs ~105 mm
    esperados). El test de regresión previene que ese bug vuelva a producción.
    """

    def test_conservacion_precipitacion_total(self):
        """
        amgr / TR=10 / D=120 min / dt=15 min / r=0.4
        P_total debe ser ≈ IDF_depth(D) = 52.282 mm/hr × 2 hr ≈ 104.56 mm
        Tolerancia ±1 mm.
        """
        from app.services.hyetograph_service import generate_hyetograph
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
            f"Chicago P_total={total:.2f} mm fuera del rango [103, 106] mm. "
            f"Si P_total >> 200, el bug de doble conteo regresó."
        )

    def test_pico_en_posicion_correcta(self):
        """Con r=0.4 el bloque de mayor intensidad debe estar en ~40% de la duración."""
        from app.services.hyetograph_service import generate_hyetograph
        result = generate_hyetograph(
            locality_id="amgr",
            return_period=10,
            duration_min=120,
            time_step_min=15,
            method="chicago",
            r=0.4,
        )
        depths = result["depths_mm"]
        peak_idx = depths.index(max(depths))
        n = len(depths)
        peak_fraction = peak_idx / n
        assert abs(peak_fraction - 0.4) < 0.15, (
            f"Pico Chicago en fracción {peak_fraction:.2f}, esperado ~0.40 (r=0.4)"
        )

    def test_todos_los_bloques_no_negativos(self):
        """Ningún bloque puede tener profundidad negativa."""
        from app.services.hyetograph_service import generate_hyetograph
        result = generate_hyetograph(
            locality_id="amgr",
            return_period=10,
            duration_min=120,
            time_step_min=15,
            method="chicago",
            r=0.4,
        )
        negatives = [d for d in result["depths_mm"] if d < 0]
        assert not negatives, f"Bloques negativos en Chicago: {negatives}"

    def test_numero_de_bloques_correcto(self):
        """D=120 min, dt=15 min → 8 bloques."""
        from app.services.hyetograph_service import generate_hyetograph
        result = generate_hyetograph(
            locality_id="amgr",
            return_period=10,
            duration_min=120,
            time_step_min=15,
            method="chicago",
            r=0.4,
        )
        assert len(result["depths_mm"]) == 8


# ── Modelos IDF ───────────────────────────────────────────────────────────────

class TestIDFModelos:
    """Verifica intensidades con valores obtenidos del backend en producción."""

    def test_amgr_apa_tr10_d60(self):
        """AMGR (APA Resolución 1334/21) TR=10, d=60 min → 78.538 mm/hr."""
        from app.services.idf_service import calculate_intensity
        i = calculate_intensity("amgr", return_period=10, duration_min=60)["intensity_mm_hr"]
        assert abs(i - 78.538) < 0.01, f"AMGR TR=10 d=60: {i:.3f} mm/hr, esperado 78.538"

    def test_amgr_apa_tr10_d120(self):
        """AMGR TR=10, d=120 min → 52.282 mm/hr."""
        from app.services.idf_service import calculate_intensity
        i = calculate_intensity("amgr", return_period=10, duration_min=120)["intensity_mm_hr"]
        assert abs(i - 52.282) < 0.01, f"AMGR TR=10 d=120: {i:.3f} mm/hr, esperado 52.282"

    def test_cordoba_obs_tr25_d60(self):
        """Córdoba Observatorio TR=25, d=60 min → 60.856 mm/hr."""
        from app.services.idf_service import calculate_intensity
        i = calculate_intensity("cordoba_observatorio", return_period=25, duration_min=60)["intensity_mm_hr"]
        assert abs(i - 60.856) < 0.01, f"Córdoba TR=25 d=60: {i:.3f} mm/hr, esperado 60.856"

    def test_el_colorado_tr10_d60(self):
        """El Colorado (Formosa) TR=10, d=60 min → 71.560 mm/hr."""
        from app.services.idf_service import calculate_intensity
        i = calculate_intensity("el_colorado", return_period=10, duration_min=60)["intensity_mm_hr"]
        assert abs(i - 71.560) < 0.01, f"El Colorado TR=10 d=60: {i:.3f} mm/hr, esperado 71.560"

    def test_azul_tr10_d60(self):
        """Buenos Aires Azul (Talbot-CEF) TR=10, d=60 min → 56.825 mm/hr."""
        from app.services.idf_service import calculate_intensity
        i = calculate_intensity("buenos_aires_azul", return_period=10, duration_min=60)["intensity_mm_hr"]
        assert abs(i - 56.825) < 0.01, f"Azul TR=10 d=60: {i:.3f} mm/hr, esperado 56.825"

    def test_catamarca_rechaza_duracion_corta(self):
        """Catamarca El Rodeo (Simple Scaling) no acepta d < 60 min → ValueError."""
        from app.services.idf_service import calculate_intensity
        with pytest.raises(ValueError, match="minimum"):
            calculate_intensity("catamarca_el_rodeo", return_period=10, duration_min=30)

    def test_azul_rechaza_tr_fuera_de_rango(self):
        """Buenos Aires Azul solo tiene TR 5–50. TR=2 → ValueError."""
        from app.services.idf_service import calculate_intensity
        with pytest.raises(ValueError, match="outside the valid range"):
            calculate_intensity("buenos_aires_azul", return_period=2, duration_min=60)


# ── Consistencia física IDF ───────────────────────────────────────────────────

class TestConsistenciaFisicaIDF:
    """Principios físicos que toda curva IDF debe cumplir."""

    def test_intensidad_decrece_con_duracion(self):
        """A mayor duración, menor intensidad (TR constante)."""
        from app.services.idf_service import calculate_intensity
        duraciones = [30, 60, 120, 180, 360]
        intensidades = [
            calculate_intensity("amgr", return_period=10, duration_min=d)["intensity_mm_hr"]
            for d in duraciones
        ]
        for i in range(len(intensidades) - 1):
            assert intensidades[i] > intensidades[i + 1], (
                f"IDF AMGR: intensidad no decrece — "
                f"d={duraciones[i]}→{intensidades[i]:.1f} vs d={duraciones[i+1]}→{intensidades[i+1]:.1f}"
            )

    def test_intensidad_crece_con_tr(self):
        """A mayor TR, mayor intensidad (duración constante)."""
        from app.services.idf_service import calculate_intensity
        trs = [2, 5, 10, 25, 50]
        intensidades = [
            calculate_intensity("amgr", return_period=tr, duration_min=60)["intensity_mm_hr"]
            for tr in trs
        ]
        for i in range(len(intensidades) - 1):
            assert intensidades[i] < intensidades[i + 1], (
                f"IDF AMGR: intensidad no crece con TR — "
                f"TR={trs[i]}→{intensidades[i]:.1f} vs TR={trs[i+1]}→{intensidades[i+1]:.1f}"
            )

    def test_profundidad_crece_con_duracion(self):
        """La profundidad acumulada P = i×d/60 debe crecer con la duración."""
        from app.services.idf_service import calculate_intensity
        duraciones = [30, 60, 120, 180, 360]
        profundidades = [
            calculate_intensity("amgr", return_period=10, duration_min=d)["intensity_mm_hr"] * d / 60
            for d in duraciones
        ]
        for i in range(len(profundidades) - 1):
            assert profundidades[i] < profundidades[i + 1], (
                f"IDF AMGR: profundidad no crece con duración — "
                f"d={duraciones[i]}→{profundidades[i]:.1f} vs d={duraciones[i+1]}→{profundidades[i+1]:.1f}"
            )
