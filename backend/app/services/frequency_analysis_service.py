"""
Análisis de frecuencia de caudales máximos anuales.
Distribuciones implementadas: Gumbel (EV1), Log-Pearson III, GEV.
"""
import numpy as np
from scipy import stats
from typing import List, Dict, Any


def compute_statistics(data: List[float]) -> Dict[str, float]:
    """Estadísticas descriptivas de la serie."""
    arr = np.array(data)
    return {
        "n": len(arr),
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr, ddof=1)),
        "cv": float(np.std(arr, ddof=1) / np.mean(arr)),
        "skewness": float(stats.skew(arr)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "median": float(np.median(arr)),
    }


def fit_gumbel(data: List[float]) -> Dict[str, Any]:
    """
    Ajuste distribución Gumbel (EV1).
    Método de momentos: α = std×√6/π, u = mean - 0.5772×α
    """
    arr = np.array(data)
    mean = np.mean(arr)
    std = np.std(arr, ddof=1)

    alpha = std * np.sqrt(6) / np.pi
    u = mean - 0.5772156649 * alpha

    return {
        "distribution": "Gumbel (EV1)",
        "parameters": {"alpha": float(alpha), "u": float(u)},
        "method": "Método de momentos"
    }


def gumbel_quantile(alpha: float, u: float, tr: float) -> float:
    """Q para período de retorno TR usando distribución Gumbel."""
    p = 1 - 1 / tr
    return float(u - alpha * np.log(-np.log(p)))


def fit_log_pearson_iii(data: List[float]) -> Dict[str, Any]:
    """
    Ajuste Log-Pearson III.
    Parámetros: media, desvío y asimetría de log(Q).
    """
    arr = np.array(data)
    log_arr = np.log10(arr)

    mean_log = float(np.mean(log_arr))
    std_log = float(np.std(log_arr, ddof=1))
    skew_log = float(stats.skew(log_arr))

    return {
        "distribution": "Log-Pearson III",
        "parameters": {
            "mean_log": mean_log,
            "std_log": std_log,
            "skew_log": skew_log
        },
        "method": "Método de momentos (escala logarítmica)"
    }


def log_pearson_iii_quantile(
    mean_log: float, std_log: float, skew_log: float, tr: float
) -> float:
    """
    Q para TR usando Log-Pearson III.
    Usa el factor de frecuencia K de Wilson-Hilferty.
    """
    p = 1 - 1 / tr
    Cs = skew_log
    if abs(Cs) < 1e-6:
        K = stats.norm.ppf(p)
    else:
        k = 2 / Cs
        z = stats.norm.ppf(p)
        K = k * ((z - k / 6) * Cs / 6 + 1) ** 3 - k

    log_q = mean_log + K * std_log
    return float(10 ** log_q)


def fit_gev(data: List[float]) -> Dict[str, Any]:
    """
    Ajuste GEV (Valores Extremos Generalizados).
    Usa scipy para el ajuste por máxima verosimilitud.
    """
    arr = np.array(data)
    try:
        shape, loc, scale = stats.genextreme.fit(arr)
        return {
            "distribution": "GEV",
            "parameters": {
                "shape": float(shape),
                "loc": float(loc),
                "scale": float(scale)
            },
            "method": "Máxima verosimilitud"
        }
    except Exception as e:
        return {
            "distribution": "GEV",
            "error": str(e),
            "parameters": None
        }


def gev_quantile(shape: float, loc: float, scale: float, tr: float) -> float:
    """Q para TR usando GEV."""
    p = 1 - 1 / tr
    return float(stats.genextreme.ppf(p, shape, loc, scale))


def compute_plotting_positions(data: List[float]) -> List[Dict[str, float]]:
    """
    Posiciones de graficación (Gringorten para Gumbel).
    Formula: p_i = (i - 0.44) / (n + 0.12)
    """
    arr = np.sort(np.array(data))
    n = len(arr)
    positions = []
    for i, q in enumerate(arr, 1):
        p = (i - 0.44) / (n + 0.12)
        tr = 1 / (1 - p)
        positions.append({
            "rank": i,
            "flow": float(q),
            "probability": float(p),
            "return_period": float(tr)
        })
    return positions


def run_frequency_analysis(
    data: List[float],
    return_periods: List[float] = None
) -> Dict[str, Any]:
    """
    Análisis completo de frecuencia.
    Retorna estadísticas, parámetros y tabla Q(TR) para las 3 distribuciones.
    """
    if return_periods is None:
        return_periods = [2, 5, 10, 25, 50, 100, 200]

    if len(data) < 5:
        raise ValueError("Se necesitan al menos 5 años de datos.")
    if any(q <= 0 for q in data):
        raise ValueError("Todos los caudales deben ser positivos.")

    stats_desc = compute_statistics(data)

    # Ajuste Gumbel
    gumbel_params = fit_gumbel(data)
    gumbel_table = {
        str(int(tr)): round(gumbel_quantile(
            gumbel_params["parameters"]["alpha"],
            gumbel_params["parameters"]["u"],
            tr
        ), 3)
        for tr in return_periods
    }

    # Ajuste Log-Pearson III
    lp3_params = fit_log_pearson_iii(data)
    lp3_table = {
        str(int(tr)): round(log_pearson_iii_quantile(
            lp3_params["parameters"]["mean_log"],
            lp3_params["parameters"]["std_log"],
            lp3_params["parameters"]["skew_log"],
            tr
        ), 3)
        for tr in return_periods
    }

    # Ajuste GEV
    gev_params = fit_gev(data)
    if gev_params.get("parameters"):
        gev_table = {
            str(int(tr)): round(gev_quantile(
                gev_params["parameters"]["shape"],
                gev_params["parameters"]["loc"],
                gev_params["parameters"]["scale"],
                tr
            ), 3)
            for tr in return_periods
        }
    else:
        gev_table = {str(int(tr)): None for tr in return_periods}

    plotting_positions = compute_plotting_positions(data)

    return {
        "statistics": stats_desc,
        "distributions": {
            "gumbel": {
                **gumbel_params,
                "quantiles": gumbel_table
            },
            "log_pearson_iii": {
                **lp3_params,
                "quantiles": lp3_table
            },
            "gev": {
                **gev_params,
                "quantiles": gev_table
            }
        },
        "plotting_positions": plotting_positions,
        "return_periods": return_periods
    }
