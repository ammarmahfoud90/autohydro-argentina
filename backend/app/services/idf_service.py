"""
IDF data service for AutoHydro Argentina.

Supports three IDF models:

  apa_chaco (Chaco — Resolución APA 1334/21)
    Formula: Ip = A / (Td + B)^C   (Td in minutes)
    A, B, C are independently fitted for each TR.

  ina_cra_mendoza (Mendoza — INA-CRA 2008 / Res. DH 034/2019)
    Formula: I = omega(TR) / (D + 0.268)^0.883   (D in hours)
    omega is a TR-dependent parameter; interpolated linearly between TRs.

  neuquen_ssrh (Neuquén — Instructivo ERH SsRH Neuquén 2018)
    Two formulas selected by duration:
      D <= 1 h  →  Cartaya:  I = (1.041 * D^0.49 * P_1h) / D
      D >  1 h  →  MIC:      I = 13.98 * I_24 * D^(-0.83)
    P_24h comes from a station table; P_1h / P_24h = 0.59 (regional constant).
    Requires an explicit station_name argument.

The model for each locality is stored in the JSON field "idf_model".
"""

import json
from pathlib import Path
from typing import Optional

_DATA_DIR = Path(__file__).parent.parent / "data" / "idf"
_LOCALITIES: dict[str, dict] = {}


def _load_localities() -> None:
    """Load all JSON locality files from the data/idf/ directory at startup."""
    for json_file in sorted(_DATA_DIR.glob("*.json")):
        with open(json_file, encoding="utf-8") as f:
            data = json.load(f)
        _LOCALITIES[data["id"]] = data


_load_localities()


# ── Public API ─────────────────────────────────────────────────────────────────

def get_localities() -> list[dict]:
    """
    Return summary info for all available IDF localities.

    Returns:
        List of dicts, one per locality, containing:
            id, name, short_name, province, country, coordinates,
            idf_model, municipalities, return_periods (list[int]),
            durations_min (list[int]), limitations,
            source (summary with document/institution/date/series info).
    """
    result = []
    for loc in _LOCALITIES.values():
        idf_model = loc.get("idf_model", "apa_chaco")

        if idf_model == "apa_chaco":
            params = loc["idf_formula"]["parameters_by_return_period"]
            return_periods = [int(k) for k in params.keys()]
            durations_min = loc["idf_table"]["durations_min"]
        elif idf_model == "ina_cra_mendoza":
            omega = loc["idf_formula"]["omega_by_return_period"]
            return_periods = [int(k) for k in omega.keys()]
            durations_min = []
        elif idf_model == "neuquen_ssrh":
            return_periods = loc["p24h_by_station_mm"]["return_periods_years"]
            durations_min = []
        else:
            return_periods = []
            durations_min = []

        result.append({
            "id": loc["id"],
            "name": loc["name"],
            "short_name": loc["short_name"],
            "province": loc["province"],
            "country": loc["country"],
            "coordinates": loc["coordinates"],
            "idf_model": idf_model,
            "municipalities": loc.get("municipalities", []),
            "return_periods": return_periods,
            "durations_min": durations_min,
            "limitations": loc["limitations"],
            "source": {
                "document": loc["source"]["document"],
                "institution": loc["source"]["institution"],
                "date": loc["source"]["date"],
                "series_period": loc["source"].get("series_period"),
                "series_length_years": loc["source"].get("series_length_years"),
            },
        })
    return result


def get_locality(locality_id: str) -> dict:
    """
    Return full locality data including IDF formula parameters,
    complete source metadata, and usage limitations.

    Args:
        locality_id: Locality identifier string.

    Returns:
        Full locality dict as loaded from the JSON file.

    Raises:
        ValueError: If locality_id is not found.
    """
    if locality_id not in _LOCALITIES:
        available = sorted(_LOCALITIES.keys())
        raise ValueError(
            f"Locality '{locality_id}' not found. Available localities: {available}"
        )
    return _LOCALITIES[locality_id]


# ── Formula helpers ────────────────────────────────────────────────────────────

def _formula_intensity(params: dict, duration_min: float) -> float:
    """Compute Ip = A / (Td + B)^C for the APA model (Td in minutes)."""
    return params["A"] / (duration_min + params["B"]) ** params["C"]


def _linear_interp(x: float, x0: float, x1: float, y0: float, y1: float) -> float:
    """Linear interpolation between (x0, y0) and (x1, y1) at x."""
    return y0 + (x - x0) / (x1 - x0) * (y1 - y0)


# ── Model-specific calculators ─────────────────────────────────────────────────

def _calculate_intensity_apa(loc: dict, return_period: float, duration_min: float) -> dict:
    """
    APA Chaco model: Ip = A / (Td + B)^C

    Duration is validated against the published IDF table range.
    Interpolation between TRs is done on computed intensity values.
    """
    locality_id = loc["id"]

    params_by_tr = loc["idf_formula"]["parameters_by_return_period"]
    available_trs = sorted(int(k) for k in params_by_tr.keys())
    tr_min, tr_max = available_trs[0], available_trs[-1]

    if return_period < tr_min or return_period > tr_max:
        raise ValueError(
            f"Return period {return_period} yr is outside the valid range "
            f"[{tr_min}, {tr_max}] yr for locality '{locality_id}'. "
            f"Available TRs: {available_trs}"
        )

    if return_period in available_trs:
        params = params_by_tr[str(int(return_period))]
        intensity = _formula_intensity(params, duration_min)
    else:
        lower_tr = max(t for t in available_trs if t <= return_period)
        upper_tr = min(t for t in available_trs if t >= return_period)
        i_lower = _formula_intensity(params_by_tr[str(lower_tr)], duration_min)
        i_upper = _formula_intensity(params_by_tr[str(upper_tr)], duration_min)
        intensity = _linear_interp(return_period, lower_tr, upper_tr, i_lower, i_upper)

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "source": loc["source"]["document"],
    }


def _calculate_intensity_mendoza(loc: dict, return_period: float, duration_min: float) -> dict:
    """
    INA-CRA Mendoza model: I = omega(TR) / (D + 0.268)^0.883

    D is in hours. omega is interpolated linearly between neighbouring TRs.
    """
    locality_id = loc["id"]
    omega_by_tr = loc["idf_formula"]["omega_by_return_period"]
    available_trs = sorted(int(k) for k in omega_by_tr.keys())
    tr_min, tr_max = available_trs[0], available_trs[-1]

    if return_period < tr_min or return_period > tr_max:
        raise ValueError(
            f"Return period {return_period} yr is outside the valid range "
            f"[{tr_min}, {tr_max}] yr for locality '{locality_id}'. "
            f"Available TRs: {available_trs}"
        )

    D = duration_min / 60.0

    if return_period in available_trs:
        omega = omega_by_tr[str(int(return_period))]
    else:
        lower_tr = max(t for t in available_trs if t <= return_period)
        upper_tr = min(t for t in available_trs if t >= return_period)
        omega = _linear_interp(
            return_period,
            lower_tr, upper_tr,
            omega_by_tr[str(lower_tr)],
            omega_by_tr[str(upper_tr)],
        )

    intensity = omega / (D + 0.268) ** 0.883

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "source": loc["source"]["document"],
    }


def _calculate_intensity_neuquen(
    loc: dict,
    return_period: float,
    duration_min: float,
    station_name: Optional[str],
) -> dict:
    """
    SsRH Neuquén model.

    D <= 60 min → Cartaya: I = (1.041 * D^0.49 * P_1h) / D
    D >  60 min → MIC:     I = 13.98 * I_24 * D^(-0.83)

    P_1h = 0.59 * P_24h  (regional constant).
    P_24h is interpolated linearly between available TRs if needed.
    """
    locality_id = loc["id"]
    stations_data = loc["p24h_by_station_mm"]["stations"]

    if station_name is None:
        raise ValueError(
            f"station_name is required for locality '{locality_id}'. "
            f"Available stations: {sorted(stations_data.keys())}"
        )
    if station_name not in stations_data:
        raise ValueError(
            f"Station '{station_name}' not found for locality '{locality_id}'. "
            f"Available stations: {sorted(stations_data.keys())}"
        )

    available_trs = loc["p24h_by_station_mm"]["return_periods_years"]
    tr_min, tr_max = available_trs[0], available_trs[-1]

    if return_period < tr_min or return_period > tr_max:
        raise ValueError(
            f"Return period {return_period} yr is outside the valid range "
            f"[{tr_min}, {tr_max}] yr for locality '{locality_id}'. "
            f"Available TRs: {available_trs}"
        )

    p24h_values = stations_data[station_name]["p24h_mm"]

    if return_period in available_trs:
        p24h = float(p24h_values[available_trs.index(return_period)])
    else:
        lower_tr = max(t for t in available_trs if t <= return_period)
        upper_tr = min(t for t in available_trs if t >= return_period)
        p24h = _linear_interp(
            return_period,
            lower_tr, upper_tr,
            float(p24h_values[available_trs.index(lower_tr)]),
            float(p24h_values[available_trs.index(upper_tr)]),
        )

    D = duration_min / 60.0

    if duration_min <= 60:
        p1h = 0.59 * p24h
        intensity = (1.041 * D ** 0.49 * p1h) / D
    else:
        i24 = p24h / 24.0
        intensity = 13.98 * i24 * D ** (-0.83)

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "station_name": station_name,
        "source": loc["source"]["document"],
    }


# ── Main public entry point ────────────────────────────────────────────────────

def calculate_intensity(
    locality_id: str,
    return_period: float,
    duration_min: float,
    station_name: Optional[str] = None,
) -> dict:
    """
    Calculate design rainfall intensity for a given locality.

    Dispatches to the appropriate model based on the locality's "idf_model" field:
      - "apa_chaco"      → Ip = A / (Td + B)^C  (Td in minutes)
      - "ina_cra_mendoza"→ I = omega(TR) / (D + 0.268)^0.883  (D in hours)
      - "neuquen_ssrh"   → Cartaya (D≤1h) or MIC (D>1h); requires station_name

    Args:
        locality_id:    Locality identifier string.
        return_period:  Design return period in years (float for interpolation).
        duration_min:   Storm duration in minutes.
        station_name:   Required for neuquen_ssrh model only.

    Returns:
        dict with keys:
            intensity_mm_hr (float)   — computed design intensity
            return_period   (float)   — as requested
            duration_min    (float)   — as requested
            locality_id     (str)
            formula_used    (bool)    — always True
            source          (str)     — source document reference string
            station_name    (str)     — only present for neuquen_ssrh model

    Raises:
        ValueError: locality not found, TR outside valid range, invalid station,
                    or duration outside valid range (apa_chaco only).
    """
    loc = get_locality(locality_id)
    idf_model = loc.get("idf_model", "apa_chaco")

    if idf_model == "apa_chaco":
        return _calculate_intensity_apa(loc, return_period, duration_min)
    elif idf_model == "ina_cra_mendoza":
        return _calculate_intensity_mendoza(loc, return_period, duration_min)
    elif idf_model == "neuquen_ssrh":
        return _calculate_intensity_neuquen(loc, return_period, duration_min, station_name)
    else:
        raise ValueError(
            f"Unknown idf_model '{idf_model}' for locality '{locality_id}'"
        )


# ── APA-only: table lookup (cross-verification) ───────────────────────────────

def get_table_intensity(
    locality_id: str,
    return_period: int,
    duration_min: float,
) -> float:
    """
    Return intensity directly from the published IDF table (APA localities only).

    Used for cross-verification against the formula. Linearly interpolates
    between tabulated durations if needed.

    Args:
        locality_id:    Locality identifier string (must be an apa_chaco locality)
        return_period:  Must exactly match a tabulated TR (2, 5, 10, 25, or 50)
        duration_min:   Storm duration in minutes (interpolated if between values)

    Returns:
        Intensity in mm/hr

    Raises:
        ValueError: locality not found, TR not in table, duration out of range,
                    or locality is not an apa_chaco model.
    """
    loc = get_locality(locality_id)
    idf_model = loc.get("idf_model", "apa_chaco")
    if idf_model != "apa_chaco":
        raise ValueError(
            f"get_table_intensity() is only available for apa_chaco localities. "
            f"Locality '{locality_id}' uses model '{idf_model}'."
        )

    table = loc["idf_table"]
    durations: list[int] = table["durations_min"]
    trs: list[int] = table["return_periods_years"]
    intensities: list[list[float]] = table["intensities_mm_hr"]

    if return_period not in trs:
        raise ValueError(
            f"Return period {return_period} yr is not in the published IDF table "
            f"for '{locality_id}'. Tabulated TRs: {trs}"
        )

    if duration_min < durations[0] or duration_min > durations[-1]:
        raise ValueError(
            f"Duration {duration_min} min is outside the tabulated range "
            f"[{durations[0]}, {durations[-1]}] min for locality '{locality_id}'"
        )

    tr_idx = trs.index(return_period)
    row = intensities[tr_idx]

    if duration_min in durations:
        return float(row[durations.index(duration_min)])

    for i in range(len(durations) - 1):
        if durations[i] <= duration_min <= durations[i + 1]:
            frac = (duration_min - durations[i]) / (durations[i + 1] - durations[i])
            return row[i] + frac * (row[i + 1] - row[i])

    raise ValueError(
        f"Duration interpolation failed unexpectedly for {duration_min} min"
    )
