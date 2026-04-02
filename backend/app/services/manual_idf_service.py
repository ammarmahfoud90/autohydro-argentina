"""
Manual IDF data service for AutoHydro Argentina.

Handles user-provided IDF data via:
  - Table of intensities (mm/h) keyed by return period and storm duration
  - Formula parameters (Talbot 2/3, Sherman, Bernard)

Interpolation strategy:
  - Between return periods: log-linear (linear in log(TR) space)
  - Between durations: log-log (linear in log(t) / log(I) space)
"""

import math
import numpy as np
from scipy.optimize import curve_fit

from app.models.schemas import ManualIDFTable, ManualIDFFormula


# ── Public API ─────────────────────────────────────────────────────────────────

def calculate_intensity_from_table(
    table: ManualIDFTable,
    return_period: float,
    duration_min: float,
) -> dict:
    """
    Interpolate rainfall intensity from a manually entered IDF table.

    Two-stage interpolation:
      1. For each TR in the table, interpolate intensity at duration_min (log-log).
      2. Interpolate across TRs at the target return_period (log-linear).

    Returns:
        {"intensity_mm_hr": float, "warnings": list[str]}
    """
    warnings: list[str] = []

    sorted_trs = sorted(table.return_periods_years)
    sorted_durs = table.durations_min  # assumed in ascending order from user

    # Out-of-range warnings
    if duration_min < min(sorted_durs):
        warnings.append(
            f"La duración solicitada ({duration_min:.0f} min) es menor al mínimo de la tabla "
            f"({min(sorted_durs):.0f} min). Se extrapola fuera del rango."
        )
    elif duration_min > max(sorted_durs):
        warnings.append(
            f"La duración solicitada ({duration_min:.0f} min) es mayor al máximo de la tabla "
            f"({max(sorted_durs):.0f} min). Se extrapola fuera del rango."
        )

    if return_period < min(sorted_trs):
        warnings.append(
            f"El TR solicitado ({return_period:.0f} años) es menor al mínimo de la tabla "
            f"({min(sorted_trs):.0f} años). Se extrapola."
        )
    elif return_period > max(sorted_trs):
        warnings.append(
            f"El TR solicitado ({return_period:.0f} años) es mayor al máximo de la tabla "
            f"({max(sorted_trs):.0f} años). Se extrapola."
        )

    # Step 1: for each TR, interpolate intensity at the requested duration (log-log)
    intensities_at_trs: list[float] = []
    for i, tr in enumerate(sorted_trs):
        row_intensities = table.intensities_mm_hr[i]
        intensity = _loglog_interp(duration_min, list(sorted_durs), list(row_intensities))
        intensities_at_trs.append(intensity)

    # Step 2: interpolate across TRs (log-linear)
    final_intensity = _log_tr_interp(return_period, [float(t) for t in sorted_trs], intensities_at_trs)

    return {
        "intensity_mm_hr": round(final_intensity, 3),
        "warnings": warnings,
    }


def calculate_intensity_from_formula(
    formula: ManualIDFFormula,
    return_period: float,
    duration_min: float,
) -> dict:
    """
    Compute rainfall intensity from user-provided formula parameters.

    For return periods not directly in the table, compute I at adjacent TRs
    and interpolate log-linearly.

    Returns:
        {"intensity_mm_hr": float, "warnings": list[str]}
    """
    warnings: list[str] = []

    # Build sorted list of available TRs
    available_trs = sorted(float(k) for k in formula.parameters_by_tr.keys())

    if return_period < min(available_trs):
        warnings.append(
            f"El TR ({return_period:.0f} años) es menor al mínimo disponible "
            f"({min(available_trs):.0f} años). Se extrapola."
        )
    elif return_period > max(available_trs):
        warnings.append(
            f"El TR ({return_period:.0f} años) es mayor al máximo disponible "
            f"({max(available_trs):.0f} años). Se extrapola."
        )

    # Compute intensity at each available TR
    intensities_at_trs: list[float] = []
    for tr in available_trs:
        params = _get_tr_params(formula.parameters_by_tr, tr)
        intensity = _apply_formula(formula.formula_type, params, duration_min)
        intensities_at_trs.append(intensity)

    # Interpolate across TRs
    final_intensity = _log_tr_interp(return_period, available_trs, intensities_at_trs)

    return {
        "intensity_mm_hr": round(final_intensity, 3),
        "warnings": warnings,
    }


def fit_talbot3_to_table(
    durations_min: list[float],
    intensities_mm_hr: list[float],
) -> dict:
    """
    Fit Talbot 3-parameter formula  I = A / (t + B)^C  to the given (t, I) data
    using nonlinear least squares (scipy.optimize.curve_fit).

    Returns:
        {"A": float, "B": float, "C": float}

    Raises:
        ValueError if the fit fails.
    """
    t_data = np.array(durations_min, dtype=float)
    I_data = np.array(intensities_mm_hr, dtype=float)

    def talbot3(t: np.ndarray, A: float, B: float, C: float) -> np.ndarray:
        return A / (t + B) ** C

    try:
        popt, _ = curve_fit(
            talbot3,
            t_data,
            I_data,
            p0=[500.0, 10.0, 0.7],
            bounds=([0.01, 0.01, 0.01], [1e6, 1000.0, 3.0]),
            maxfev=10_000,
        )
        A, B, C = popt
        return {"A": round(float(A), 4), "B": round(float(B), 4), "C": round(float(C), 4)}
    except Exception as exc:
        raise ValueError(f"No se pudo ajustar la fórmula Talbot 3 parámetros: {exc}") from exc


def validate_idf_table(
    durations_min: list[float],
    return_periods_years: list[int],
    intensities_mm_hr: list[list[float]],
) -> list[str]:
    """
    Check an IDF table for physical consistency.

    Rules:
    - All intensity values must be positive.
    - For each TR, intensity must strictly decrease as duration increases.
    - For each duration, intensity must strictly increase as TR increases.

    Returns:
        List of warning strings (empty list = table is consistent).
    """
    warnings: list[str] = []
    n_trs = len(return_periods_years)
    n_durs = len(durations_min)

    # Positive values
    for i in range(n_trs):
        for j in range(n_durs):
            val = intensities_mm_hr[i][j]
            if val <= 0:
                warnings.append(
                    f"TR={return_periods_years[i]} años, duración={durations_min[j]} min: "
                    f"valor no positivo ({val})"
                )

    # Decreasing intensity with duration (for each TR)
    for i in range(n_trs):
        for j in range(n_durs - 1):
            if intensities_mm_hr[i][j] <= intensities_mm_hr[i][j + 1]:
                warnings.append(
                    f"TR={return_periods_years[i]} años: la intensidad NO decrece entre "
                    f"{durations_min[j]:.0f} min ({intensities_mm_hr[i][j]:.1f} mm/h) y "
                    f"{durations_min[j + 1]:.0f} min ({intensities_mm_hr[i][j + 1]:.1f} mm/h)"
                )

    # Increasing intensity with TR (for each duration)
    for j in range(n_durs):
        for i in range(n_trs - 1):
            if intensities_mm_hr[i][j] >= intensities_mm_hr[i + 1][j]:
                warnings.append(
                    f"Duración={durations_min[j]:.0f} min: la intensidad NO crece entre "
                    f"TR={return_periods_years[i]} años ({intensities_mm_hr[i][j]:.1f} mm/h) y "
                    f"TR={return_periods_years[i + 1]} años ({intensities_mm_hr[i + 1][j]:.1f} mm/h)"
                )

    return warnings


# ── Internal helpers ──────────────────────────────────────────────────────────

def _loglog_interp(x: float, xs: list[float], ys: list[float]) -> float:
    """Log-log interpolation (linear in log(x) / log(y) space).

    Clamps to the nearest boundary value if x is outside the range.
    """
    log_xs = [math.log(max(v, 1e-9)) for v in xs]
    log_ys = [math.log(max(v, 1e-9)) for v in ys]
    log_x = math.log(max(x, 1e-9))

    if log_x <= log_xs[0]:
        return math.exp(log_ys[0])
    if log_x >= log_xs[-1]:
        return math.exp(log_ys[-1])

    for i in range(len(log_xs) - 1):
        if log_xs[i] <= log_x <= log_xs[i + 1]:
            t = (log_x - log_xs[i]) / (log_xs[i + 1] - log_xs[i])
            log_y = log_ys[i] + t * (log_ys[i + 1] - log_ys[i])
            return math.exp(log_y)

    return math.exp(log_ys[-1])


def _log_tr_interp(tr: float, trs: list[float], intensities: list[float]) -> float:
    """Log-linear TR interpolation (linear in log(TR) space, linear in I).

    Clamps to the nearest boundary value if tr is outside the range.
    """
    log_trs = [math.log(max(t, 1e-9)) for t in trs]
    log_tr = math.log(max(tr, 1e-9))

    if log_tr <= log_trs[0]:
        return intensities[0]
    if log_tr >= log_trs[-1]:
        return intensities[-1]

    for i in range(len(log_trs) - 1):
        if log_trs[i] <= log_tr <= log_trs[i + 1]:
            t = (log_tr - log_trs[i]) / (log_trs[i + 1] - log_trs[i])
            return intensities[i] + t * (intensities[i + 1] - intensities[i])

    return intensities[-1]


def _apply_formula(formula_type: str, params: dict[str, float], duration_min: float) -> float:
    """Evaluate an IDF formula for a given duration."""
    t = duration_min
    if formula_type == "talbot3":
        return params["A"] / (t + params["B"]) ** params["C"]
    if formula_type == "talbot2":
        return params["A"] / (t + params["B"])
    if formula_type == "sherman":
        return params["a"] * t ** (-params["n"])
    if formula_type == "bernard":
        return params["k"] / t ** params["e"]
    raise ValueError(f"Tipo de fórmula desconocido: {formula_type!r}")


def _get_tr_params(parameters_by_tr: dict[str, dict[str, float]], tr: float) -> dict[str, float]:
    """Look up formula parameters for a given TR value, tolerating int/float key formats."""
    for key in (str(int(tr)), str(tr), str(round(tr, 1))):
        if key in parameters_by_tr:
            return parameters_by_tr[key]
    raise ValueError(
        f"No se encontraron parámetros para TR={tr} en parameters_by_tr "
        f"(claves disponibles: {list(parameters_by_tr.keys())})"
    )
