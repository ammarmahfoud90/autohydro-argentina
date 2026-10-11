"""
Tránsito de crecidas — Muskingum y Muskingum-Cunge.
"""
import numpy as np
from typing import List, Dict, Any, Tuple


def compute_muskingum_coefficients(
    K: float, X: float, dt: float
) -> Tuple[float, float, float]:
    """
    Calcula coeficientes C0, C1, C2 del método Muskingum.
    K: tiempo de tránsito (horas)
    X: coeficiente de ponderación (0-0.5)
    dt: intervalo de tiempo (horas)
    """
    if not all(np.isfinite(v) for v in (K, X, dt)) or K <= 0 or dt <= 0 or not 0 <= X <= 0.5:
        raise ValueError("Muskingum requiere K y Δt positivos y finitos, y 0 ≤ X ≤ 0.5.")
    lower, upper = 2 * K * X, 2 * K * (1 - X)
    if dt < lower - 1e-12 or dt > upper + 1e-12:
        raise ValueError(f"Δt={dt:g} h fuera del rango de coeficientes no negativos [{lower:g}, {upper:g}] h. Ajustar Δt, K o X.")
    denom = K - K * X + dt / 2
    if abs(denom) < 1e-10:
        raise ValueError("Denominador cero — verificar K, X y Δt.")

    C0 = (-K * X + dt / 2) / denom
    C1 = (K * X + dt / 2) / denom
    C2 = (K - K * X - dt / 2) / denom

    suma = C0 + C1 + C2
    if abs(suma - 1.0) > 0.001:
        raise ValueError(f"C0+C1+C2 = {suma:.4f} ≠ 1.0 — revisar parámetros.")

    return float(C0), float(C1), float(C2)


def validate_muskingum_stability(
    K: float, X: float, dt: float
) -> Dict[str, Any]:
    """
    Verifica condición de estabilidad: 2KX < Δt < 2K(1-X)
    """
    lower = 2 * K * X
    upper = 2 * K * (1 - X)
    stable = bool(all(np.isfinite(v) for v in (K, X, dt)) and K > 0 and dt > 0
                  and 0 <= X <= 0.5 and lower - 1e-12 <= dt <= upper + 1e-12)
    return {
        "stable": stable,
        "condition": f"2KX = {lower:.2f} ≤ Δt = {dt:.2f} ≤ 2K(1-X) = {upper:.2f}",
        "lower_bound": lower,
        "upper_bound": upper,
        "recommendation": (
            "Parámetros estables." if stable
            else f"Ajustar Δt al rango [{lower:.2f}, {upper:.2f}] horas."
        )
    }


def route_muskingum(
    inflow: List[float],
    times: List[float],
    K: float,
    X: float,
    Q_initial: float = 0.0
) -> Dict[str, Any]:
    """
    Tránsito Muskingum.
    inflow: hidrograma de entrada [m³/s]
    times: tiempos [horas]
    K: tiempo de tránsito (horas)
    X: coeficiente de ponderación
    Q_initial: caudal inicial de salida (m³/s)
    """
    if len(inflow) != len(times):
        raise ValueError("inflow y times deben tener la misma longitud.")
    if len(inflow) < 3:
        raise ValueError("Se necesitan al menos 3 puntos en el hidrograma.")
    if not (0 <= X <= 0.5):
        raise ValueError("X debe estar entre 0 y 0.5.")
    if K <= 0:
        raise ValueError("K debe ser positivo.")

    if not all(np.isfinite(v) for v in [*times, *inflow, K, X, Q_initial]):
        raise ValueError("El hidrograma y los parámetros deben contener valores finitos.")
    if any(q < 0 for q in inflow) or Q_initial < 0:
        raise ValueError("Los caudales de entrada y el caudal inicial no pueden ser negativos.")
    intervals = np.diff(times)
    dt = float(intervals[0])
    if dt <= 0 or not np.allclose(intervals, dt, rtol=1e-9, atol=1e-12):
        raise ValueError("Los tiempos deben ser crecientes y tener un intervalo uniforme Δt.")

    stability = validate_muskingum_stability(K, X, dt)

    C0, C1, C2 = compute_muskingum_coefficients(K, X, dt)

    outflow = [Q_initial]
    for i in range(1, len(inflow)):
        Q_out = C0 * inflow[i] + C1 * inflow[i - 1] + C2 * outflow[i - 1]
        if Q_out < -1e-10:
            raise ValueError("El tránsito produjo un caudal negativo; revisar parámetros.")
        outflow.append(max(0.0, float(Q_out)))  # roundoff only; unstable inputs are rejected

    Q_peak_in = max(inflow)
    Q_peak_out = max(outflow)
    t_peak_in = times[inflow.index(Q_peak_in)]
    t_peak_out = times[outflow.index(Q_peak_out)]

    attenuation = (Q_peak_in - Q_peak_out) / Q_peak_in * 100 if Q_peak_in > 0 else 0.0
    lag = t_peak_out - t_peak_in
    volume_in = sum((inflow[i] + inflow[i - 1]) * dt * 1800 for i in range(1, len(inflow)))
    volume_out = sum((outflow[i] + outflow[i - 1]) * dt * 1800 for i in range(1, len(outflow)))
    storage_initial = K * 3600 * (X * inflow[0] + (1 - X) * outflow[0])
    storage_final = K * 3600 * (X * inflow[-1] + (1 - X) * outflow[-1])
    balance_error = volume_in - volume_out - (storage_final - storage_initial)

    return {
        "method": "Muskingum",
        "parameters": {"K": K, "X": X, "dt": dt},
        "coefficients": {"C0": C0, "C1": C1, "C2": C2},
        "stability": stability,
        "inflow": [{"time": t, "flow": q} for t, q in zip(times, inflow)],
        "outflow": [{"time": t, "flow": q} for t, q in zip(times, outflow)],
        "results": {
            "Q_peak_in": Q_peak_in,
            "Q_peak_out": Q_peak_out,
            "attenuation_pct": round(attenuation, 2),
            "lag_hours": round(lag, 2),
            "t_peak_in": t_peak_in,
            "t_peak_out": t_peak_out,
            "volume_in_m3": volume_in,
            "volume_out_m3": volume_out,
            "storage_initial_m3": storage_initial,
            "storage_final_m3": storage_final,
            "mass_balance_error_m3": balance_error,
            "mass_balance_error_pct": 100 * balance_error / volume_in if volume_in else 0.0,
        }
    }


def compute_muskingum_cunge_parameters(
    Q_ref: float,
    B: float,
    S: float,
    n: float,
    dx: float
) -> Dict[str, Any]:
    """
    Calcula K y X para Muskingum-Cunge a partir de parámetros hidráulicos.
    Q_ref: caudal de referencia (m³/s)
    B: ancho superficial (m)
    S: pendiente (m/m)
    n: Manning n
    dx: longitud del tramo (m)
    """
    if Q_ref <= 0:
        raise ValueError("Q_ref debe ser positivo.")
    if B <= 0:
        raise ValueError("B debe ser positivo.")
    if S <= 0:
        raise ValueError("S debe ser positivo.")
    if n <= 0:
        raise ValueError("n debe ser positivo.")
    if dx <= 0:
        raise ValueError("dx debe ser positivo.")

    y = (Q_ref * n / (B * S ** 0.5)) ** (3 / 5)
    V = Q_ref / (B * y)

    c = (5 / 3) * V

    K = dx / (c * 3600)
    X_num = Q_ref / (B * S * c * dx)
    X = max(0.0, min(0.5, 0.5 * (1 - X_num)))

    return {
        "K_hours": round(K, 4),
        "X": round(X, 4),
        "celerity_ms": round(c, 4),
        "velocity_ms": round(V, 4),
        "depth_m": round(y, 4),
        "note": "Parámetros calculados para sección rectangular ancha."
    }
