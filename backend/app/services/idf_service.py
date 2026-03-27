"""
IDF data service for AutoHydro Argentina.

Loads verified IDF data from Resolución APA 1334/21 (Administración Provincial
del Agua, Provincia del Chaco) stored as JSON files in backend/app/data/idf/.

Formula (per APA): Ip = A / (Td + B)^C
  - Ip:  design rainfall intensity (mm/hr)
  - Td:  storm duration (minutes)
  - A, B, C: fitting parameters, SPECIFIC to each return period TR

This is NOT the Sherman formula `i = a*T^b / (t+c)^d`.  Key difference:
APA's formula has independent A, B, C parameter sets for each TR (2, 5, 10,
25, 50 yr), fitted using AFMULTI (Paoli et al., FICH-UNL, 1991) against
60 years of pluviographic records (AMGR), 7 years (El Colorado), and
31 years (P.R. Sáenz Peña).

Interpolation between TRs is done on the *computed intensity values*, not on
the parameters themselves, to preserve the physical meaning of each fit.

Source: Resolución APA 1334/21, Administración Provincial del Agua, Chaco.
        Ing. Eliana Cóceres, Ing. Ezequiel Silva. Dirección de Estudios Básicos.
"""

import json
from pathlib import Path

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
            municipalities, return_periods (list[int]), durations_min (list[int]),
            limitations, source (summary with document/institution/date/series info).
    """
    result = []
    for loc in _LOCALITIES.values():
        params = loc["idf_formula"]["parameters_by_return_period"]
        result.append({
            "id": loc["id"],
            "name": loc["name"],
            "short_name": loc["short_name"],
            "province": loc["province"],
            "country": loc["country"],
            "coordinates": loc["coordinates"],
            "municipalities": loc["municipalities"],
            "return_periods": [int(k) for k in params.keys()],
            "durations_min": loc["idf_table"]["durations_min"],
            "limitations": loc["limitations"],
            "source": {
                "document": loc["source"]["document"],
                "institution": loc["source"]["institution"],
                "date": loc["source"]["date"],
                "series_period": loc["source"]["series_period"],
                "series_length_years": loc["source"]["series_length_years"],
            },
        })
    return result


def get_locality(locality_id: str) -> dict:
    """
    Return full locality data including IDF table, formula parameters,
    complete source metadata, and usage limitations.

    Args:
        locality_id: Locality identifier string.
                     Available: 'amgr', 'el_colorado', 'pr_saenz_pena'

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


def _formula_intensity(params: dict, duration_min: float) -> float:
    """
    Compute Ip = A / (Td + B)^C for a single TR's parameters.

    Args:
        params:       dict with keys A, B, C (specific to one return period)
        duration_min: storm duration in minutes

    Returns:
        Intensity in mm/hr
    """
    return params["A"] / (duration_min + params["B"]) ** params["C"]


def calculate_intensity(
    locality_id: str,
    return_period: float,
    duration_min: float,
) -> dict:
    """
    Calculate design rainfall intensity using the APA IDF formula.

    Formula: Ip = A / (Td + B)^C
    A, B, C are fitted independently for each return period.

    Behavior by return period:
        Exact TR match (2, 5, 10, 25, or 50 yr):
            Applies the formula directly for that TR.
        TR between two available values:
            Calculates intensity at both neighboring TRs, then linearly
            interpolates on TR. (Interpolation is on intensities, not params.)
        TR outside [TRmin, TRmax]:
            Raises ValueError.

    Args:
        locality_id:    Locality identifier (e.g. 'amgr')
        return_period:  Design return period in years (float for interpolation)
        duration_min:   Storm duration in minutes

    Returns:
        dict with keys:
            intensity_mm_hr (float)   — computed design intensity
            return_period   (float)   — as requested
            duration_min    (float)   — as requested
            locality_id     (str)
            formula_used    (bool)    — always True (formula, not table lookup)
            source          (str)     — source document reference string

    Raises:
        ValueError: locality not found, TR outside valid range, or duration
                    outside the locality's tabulated range.
    """
    loc = get_locality(locality_id)

    # Validate duration against the IDF table's published range
    durations = loc["idf_table"]["durations_min"]
    if duration_min < durations[0] or duration_min > durations[-1]:
        raise ValueError(
            f"Duration {duration_min} min is outside the valid range "
            f"[{durations[0]}, {durations[-1]}] min for locality '{locality_id}'"
        )

    # Resolve available return periods
    params_by_tr = loc["idf_formula"]["parameters_by_return_period"]
    available_trs = sorted(int(k) for k in params_by_tr.keys())
    tr_min, tr_max = available_trs[0], available_trs[-1]

    if return_period < tr_min or return_period > tr_max:
        raise ValueError(
            f"Return period {return_period} yr is outside the valid range "
            f"[{tr_min}, {tr_max}] yr for locality '{locality_id}'. "
            f"Available TRs: {available_trs}"
        )

    # Exact match
    if return_period in available_trs:
        params = params_by_tr[str(int(return_period))]
        intensity = _formula_intensity(params, duration_min)
    else:
        # Linear interpolation on intensity between the two nearest TRs
        lower_tr = max(t for t in available_trs if t <= return_period)
        upper_tr = min(t for t in available_trs if t >= return_period)
        i_lower = _formula_intensity(params_by_tr[str(lower_tr)], duration_min)
        i_upper = _formula_intensity(params_by_tr[str(upper_tr)], duration_min)
        frac = (return_period - lower_tr) / (upper_tr - lower_tr)
        intensity = i_lower + frac * (i_upper - i_lower)

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "source": loc["source"]["document"],
    }


def get_table_intensity(
    locality_id: str,
    return_period: int,
    duration_min: float,
) -> float:
    """
    Return intensity directly from the published IDF table.

    Used for cross-verification against the formula. Linearly interpolates
    between tabulated durations if needed.

    Args:
        locality_id:    Locality identifier string
        return_period:  Must exactly match a tabulated TR (2, 5, 10, 25, or 50)
        duration_min:   Storm duration in minutes (interpolated if between values)

    Returns:
        Intensity in mm/hr

    Raises:
        ValueError: locality not found, TR not in table, duration out of range.
    """
    loc = get_locality(locality_id)
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

    # Exact duration match
    if duration_min in durations:
        return float(row[durations.index(duration_min)])

    # Linear interpolation between adjacent tabulated durations
    for i in range(len(durations) - 1):
        if durations[i] <= duration_min <= durations[i + 1]:
            frac = (duration_min - durations[i]) / (durations[i + 1] - durations[i])
            return row[i] + frac * (row[i + 1] - row[i])

    raise ValueError(
        f"Duration interpolation failed unexpectedly for {duration_min} min"
    )
