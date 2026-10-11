"""
Design storm hyetograph generator for AutoHydro Argentina.

Methods implemented:
  - Bloques Alternos (Alternating Blocks) — most common in Argentina
  - SCS Tipo II (24-hour dimensionless distribution)
  - Chicago — asymmetric, peak position adjustable (r = 0.4 default)
  - Uniforme (constant intensity)

IDF formula used: Ip = A / (Td + B)^C  (APA Resolución 1334/21)
  Parameters A, B, C are fitted independently for each return period.
"""

from __future__ import annotations

import math

from app.services.idf_service import get_locality, calculate_intensity


# ── IDF helpers ───────────────────────────────────────────────────────────────

def _idf_intensity(locality_id: str, T: float, t_min: float, **station) -> float:
    """Return rainfall intensity [mm/hr] for given duration t_min [min]."""
    return calculate_intensity(locality_id, T, t_min, **station)["intensity_mm_hr"]


def _idf_depth(locality_id: str, T: float, t_min: float, **station) -> float:
    """Return cumulative rainfall depth [mm] for duration t_min."""
    if t_min <= 0:
        return 0.0
    return _idf_intensity(locality_id, T, t_min, **station) * t_min / 60.0


# ── SCS Type II dimensionless distribution ────────────────────────────────────
# Hourly cumulative ratios from USDA-NRCS NEH 630, Chapter 4, Fig. 4-36
# (2019). They describe the standard US 24-hour Type II storm. Rescaling
# the time axis to another duration is an explicit uncalibrated assumption.

_SCS_TYPE_II: list[tuple[float, float]] = [
    (hour / 24.0, fraction) for hour, fraction in enumerate([
        0.000, 0.011, 0.022, 0.035, 0.048, 0.063, 0.080, 0.099,
        0.120, 0.147, 0.181, 0.235, 0.663, 0.772, 0.820, 0.854,
        0.880, 0.902, 0.921, 0.938, 0.952, 0.965, 0.977, 0.989, 1.000,
    ])
]


def _scs_cumulative_fraction(t_frac: float) -> float:
    """Interpolate cumulative depth fraction for SCS Type II at t/D = t_frac."""
    if t_frac <= 0:
        return 0.0
    if t_frac >= 1:
        return 1.0
    for i in range(1, len(_SCS_TYPE_II)):
        t0, f0 = _SCS_TYPE_II[i - 1]
        t1, f1 = _SCS_TYPE_II[i]
        if t0 <= t_frac <= t1:
            frac = (t_frac - t0) / (t1 - t0)
            return f0 + frac * (f1 - f0)
    return 1.0


# ── Method implementations ────────────────────────────────────────────────────

def _alternating_blocks(
    locality_id: str, T: float, duration_min: int, time_step_min: int, **station
) -> tuple[list[float], list[float], list[float]]:
    """
    Alternating Blocks method.

    Returns:
        (times_min, depths_mm, intensities_mm_hr)
        times_min: start time of each interval [0, dt, 2*dt, ...]
    """
    n = duration_min // time_step_min
    dt = time_step_min

    # Incremental depths for each block (cumulative depth at j*dt minus (j-1)*dt)
    increments: list[float] = []
    for j in range(1, n + 1):
        d_now = _idf_depth(locality_id, T, j * dt, **station)
        d_prev = _idf_depth(locality_id, T, (j - 1) * dt, **station)
        if d_now < d_prev - 1e-9:
            raise ValueError("La curva IDF produce láminas acumuladas decrecientes; revisar sus datos antes de generar bloques.")
        increments.append(max(0.0, d_now - d_prev))

    # Sort descending by magnitude
    sorted_blocks = sorted(increments, reverse=True)

    # Distribute: largest at center, then alternate right/left
    blocks: list[float] = [0.0] * n
    center = n // 2
    blocks[center] = sorted_blocks[0]
    right = center + 1
    left = center - 1
    i = 1
    while i < len(sorted_blocks):
        if right < n and i < len(sorted_blocks):
            blocks[right] = sorted_blocks[i]
            right += 1
            i += 1
        if left >= 0 and i < len(sorted_blocks):
            blocks[left] = sorted_blocks[i]
            left -= 1
            i += 1

    times = [j * dt for j in range(n)]
    intensities = [d / (dt / 60.0) for d in blocks]  # mm/hr
    return times, blocks, intensities


def _scs_type_ii(
    locality_id: str, T: float, duration_min: int, time_step_min: int, **station
) -> tuple[list[float], list[float], list[float]]:
    """
    SCS Type II synthetic storm.

    The total storm depth equals the IDF depth for the specified duration.
    The temporal distribution follows the SCS Type II dimensionless pattern.
    """
    n = duration_min // time_step_min
    dt = time_step_min
    total_depth = _idf_depth(locality_id, T, duration_min, **station)

    depths: list[float] = []
    times: list[float] = []
    for j in range(n):
        t_start = j * dt / duration_min
        t_end = (j + 1) * dt / duration_min
        f_start = _scs_cumulative_fraction(t_start)
        f_end = _scs_cumulative_fraction(t_end)
        depths.append(max(0.0, (f_end - f_start) * total_depth))
        times.append(j * dt)

    intensities = [d / (dt / 60.0) for d in depths]
    return times, depths, intensities


def _chicago(
    locality_id: str, T: float, duration_min: int, time_step_min: int,
    r: float = 0.4, **station,
) -> tuple[list[float], list[float], list[float]]:
    """Integrate continuous Chicago depth over each interval, including the peak.

    Keeping the peak at r*D (rather than rounding it to a whole block)
    preserves total rainfall for every time step and peak position.
    """
    n = duration_min // time_step_min
    peak_time = r * duration_min
    total = _idf_depth(locality_id, T, duration_min, **station)

    def cumulative(t):
        if t <= peak_time:
            return r * (total - _idf_depth(locality_id, T, (peak_time - t) / r, **station))
        return r * total + (1 - r) * _idf_depth(locality_id, T, (t - peak_time) / (1 - r), **station)

    times = [j * time_step_min for j in range(n)]
    depths = [cumulative(t + time_step_min) - cumulative(t) for t in times]
    if any(d < -1e-9 for d in depths):
        raise ValueError("La curva IDF produce bloques Chicago negativos; revisar sus datos.")
    depths = [max(0.0, d) for d in depths]
    return times, depths, [d * 60 / time_step_min for d in depths]


def _uniform(
    locality_id: str, T: float, duration_min: int, time_step_min: int, **station
) -> tuple[list[float], list[float], list[float]]:
    """Uniform (constant intensity) distribution."""
    n = duration_min // time_step_min
    dt = time_step_min
    intensity = _idf_intensity(locality_id, T, duration_min, **station)
    depth_per_step = intensity * dt / 60.0

    times = [j * dt for j in range(n)]
    depths = [depth_per_step] * n
    intensities = [intensity] * n
    return times, depths, intensities


# ── Main public function ──────────────────────────────────────────────────────

def generate_hyetograph(
    locality_id: str,
    return_period: int,
    duration_min: int,
    time_step_min: int,
    method: str,
    r: float = 0.4,
    station_name: str | None = None,
    station_id: str | None = None,
) -> dict:
    """
    Generate a design storm hyetograph.

    Args:
        locality_id:  Locality identifier (e.g. 'amgr', 'el_colorado', 'pr_saenz_pena')
        return_period: Return period T [years]
        duration_min: Total storm duration [minutes]
        time_step_min: Time interval [minutes]
        method:       "alternating_blocks" | "scs_type_ii" | "chicago" | "uniform"
        r:            Peak position ratio for Chicago method (0 < r < 1)

    Returns:
        dict with keys:
            times_min, depths_mm, intensities_mm_hr, cumulative_mm,
            total_depth_mm, peak_intensity_mm_hr, peak_time_min,
            method, city, return_period, duration_min, time_step_min
    """
    if not all(math.isfinite(v) for v in (return_period, duration_min, time_step_min, r)):
        raise ValueError("Los parámetros deben ser finitos.")
    if return_period <= 1 or duration_min <= 0 or time_step_min <= 0 or duration_min % time_step_min:
        raise ValueError("La duración debe ser positiva y múltiplo exacto del intervalo; T debe ser mayor que 1.")
    if not 0 < r < 1:
        raise ValueError("Chicago requiere 0 < r < 1.")
    station = {"station_name": station_name, "station_id": station_id}
    loc = get_locality(locality_id)
    idf = calculate_intensity(locality_id, return_period, duration_min, **station)
    warnings = list(idf.get("warnings", []))
    if idf.get("duration_extrapolation_warning"):
        warnings.append("Duración fuera del rango IDF publicado; lluvia extrapolada.")
    if method == "scs_type_ii":
        warnings.append("SCS Tipo II usa la distribución estadounidense de 24 h, interpolada desde valores horarios; su aplicación local requiere validación.")
        if duration_min != 1440:
            warnings.append("La distribución SCS Tipo II fue reescalada a otra duración; no representa una tormenta de 24 h validada.")

    T = float(return_period)

    if method == "alternating_blocks":
        times, depths, intensities = _alternating_blocks(
            locality_id, T, duration_min, time_step_min, **station
        )
    elif method == "scs_type_ii":
        times, depths, intensities = _scs_type_ii(
            locality_id, T, duration_min, time_step_min, **station
        )
    elif method == "chicago":
        times, depths, intensities = _chicago(
            locality_id, T, duration_min, time_step_min, r, **station
        )
    elif method == "uniform":
        times, depths, intensities = _uniform(
            locality_id, T, duration_min, time_step_min, **station
        )
    else:
        raise ValueError(f"Método '{method}' no reconocido")

    # Cumulative depths
    cumulative = []
    acc = 0.0
    for d in depths:
        acc += d
        cumulative.append(round(acc, 4))

    total_depth = round(acc, 3)
    peak_intensity = round(max(intensities), 2) if intensities else 0.0
    peak_idx = intensities.index(max(intensities)) if intensities else 0
    peak_time = times[peak_idx] if times else 0

    method_labels = {
        "alternating_blocks": "Bloques Alternos",
        "scs_type_ii": "SCS Tipo II",
        "chicago": f"Chicago (r = {r})",
        "uniform": "Uniforme",
    }

    return {
        "times_min": [round(t, 1) for t in times],
        "depths_mm": [round(d, 4) for d in depths],
        "intensities_mm_hr": [round(i, 2) for i in intensities],
        "cumulative_mm": cumulative,
        "total_depth_mm": total_depth,
        "peak_intensity_mm_hr": peak_intensity,
        "peak_time_min": peak_time,
        "method": method,
        "method_label": method_labels.get(method, method),
        "city": loc["name"],
        "province": loc["province"],
        "return_period": return_period,
        "duration_min": duration_min,
        "time_step_min": time_step_min,
        "idf_source": loc["source"]["document"],
        "station_name": station_name,
        "station_id": station_id,
        "warnings": warnings,
        "validation_status": "synthetic_design_storm",
    }
