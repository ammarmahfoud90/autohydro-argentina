"""
IDF data service for AutoHydro Argentina.

Supports nine IDF models:

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

  sherman_4p (Entre Ríos + Santa Fe — Zamanillo 2008 / Marcus et al. 2019)
    Formula: i = K · Tr^m / (d + c)^n
    i: intensity (mm/h), Tr: return period (years), d: duration (minutes)
    K, m, c, n: locality-specific constants (independent of TR).

  talbot_cef (Buenos Aires — Azul, Collazos & Cazenave 2015)
    Formula: i = c / (d^e + f)
    i: intensity (mm/h), d: duration (minutes)
    c, e, f: TR-dependent parameters (like apa_chaco).

  sherman_power (Buenos Aires — Balcarce, Puricelli & Marino 2014)
    Formula: i = tau · T^epsilon / d^eta
    i: intensity (mm/h), T: return period (years), d: duration (minutes)
    tau, epsilon, eta: global constants (independent of TR).

  dit_3p (Córdoba + Salta — INA-CIRSA / Rico et al. 2024-2025)
    Formula: ln(i) = A · φ_T − B · δ_d + C
    where:
      φ_T = 2.584458 · (ln T)^(3/8) − 2.252573  [T in years]
      δ_d = (ln d)^(5/3)  [d in minutes]
    Result: i = exp(A · φ_T − B · δ_d + C) in mm/h
    A, B, C: locality-specific parameters.

  dit_tucuman (Tucumán — Bazzano 2019, UNT-FACET)
    Formula: ln(i) = A' · Ø_T − B · δ_d + C'
    where:
      Ø_T = Factor de Frecuencia Normal de Chow (cuantil normal estándar)
      δ_d = (ln d)^(5/3)  [d in minutes]
      B = 0.1458 (constante fija para toda la provincia)
      A', C': parámetros estación-específicos
    Result: i = exp(A' · Ø_T − B · δ_d + C') in mm/h
    Requires station_id selection from available stations.

  simple_scaling_table (Catamarca — INA-CRA IT Nº 145, 2012)
    No analytical formula. Intensity is read directly from the published IDF
    table with log-linear interpolation in TR. Durations and TRs outside the
    table range raise ValueError.

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
        elif idf_model in ("sherman_4p", "sherman_power"):
            # Return periods from IDF table, durations from table or formula spec
            table = loc.get("idf_table", {})
            return_periods = table.get("return_periods", [])
            durations_min = table.get("durations_min", [])
        elif idf_model == "talbot_cef":
            # Parameters by TR - get TRs from parameters_by_tr
            params = loc["formula"]["parameters_by_tr"]
            return_periods = [int(k) for k in params.keys()]
            durations_min = []
        elif idf_model == "dit_3p":
            # Return periods and durations from IDF table
            table = loc.get("idf_table", {})
            return_periods = table.get("return_periods", [])
            durations_min = table.get("durations_min", [])
        elif idf_model == "dit_tucuman":
            # Return periods from phi_T_table, no fixed durations
            phi_T_table = loc.get("model_parameters", {}).get("phi_T_table", {})
            return_periods = [int(k) for k in phi_T_table.keys()]
            durations_min = []
        elif idf_model == "simple_scaling_table":
            table = loc.get("idf_table", {})
            return_periods = table.get("return_periods", [])
            durations_min = table.get("durations_min", [])
        else:
            return_periods = []
            durations_min = []

        # Compute valid TR and duration ranges from formula or table
        formula = loc.get("formula", {})
        valid_tr_max = formula.get("valid_tr_max", return_periods[-1] if return_periods else 100)
        valid_tr_min = formula.get("valid_tr_min", return_periods[0] if return_periods else 2)
        if idf_model == "simple_scaling_table":
            table_durs = loc.get("idf_table", {}).get("durations_min", [])
            valid_duration_min = table_durs[0] if table_durs else 5
            valid_duration_max = table_durs[-1] if table_durs else 1440
        else:
            valid_duration_min = formula.get("valid_duration_min", 5)
            valid_duration_max = formula.get("valid_duration_max", 1440)

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
            "valid_tr_min": valid_tr_min,
            "valid_tr_max": valid_tr_max,
            "valid_duration_min": valid_duration_min,
            "valid_duration_max": valid_duration_max,
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


def _calculate_intensity_sherman_4p(
    loc: dict,
    return_period: float,
    duration_min: float,
) -> dict:
    """
    Sherman 4-parameter model (Entre Ríos + Santa Fe).

    Formula: i = K · Tr^m / (d + c)^n

    where:
      i: intensity (mm/h)
      Tr: return period (years)
      d: duration (minutes)
      K, m, c, n: locality-specific constants

    Args:
        loc: Locality dict with "formula" containing K, m, c, n
        return_period: Return period in years
        duration_min: Storm duration in minutes

    Returns:
        dict with intensity and metadata
    """
    locality_id = loc["id"]
    formula = loc["formula"]
    vars = formula["variables"]

    K = vars["K"]
    m = vars["m"]
    c = vars["c"]
    n = vars["n"]

    # Validate duration range if specified
    valid_min = formula.get("valid_duration_min")
    valid_max = formula.get("valid_duration_max")
    if valid_min is not None and duration_min < valid_min:
        raise ValueError(
            f"Duration {duration_min} min is below the valid minimum "
            f"{valid_min} min for locality '{locality_id}'."
        )
    if valid_max is not None and duration_min > valid_max:
        raise ValueError(
            f"Duration {duration_min} min exceeds the valid maximum "
            f"{valid_max} min for locality '{locality_id}'."
        )

    # Validate TR range
    valid_tr_max = formula.get("valid_tr_max")
    if valid_tr_max is not None and return_period > valid_tr_max:
        raise ValueError(
            f"Return period {return_period} yr exceeds the maximum valid TR "
            f"{valid_tr_max} yr for locality '{locality_id}'."
        )

    intensity = K * (return_period ** m) / ((duration_min + c) ** n)

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "source": loc["source"]["document"],
    }


def _calculate_intensity_talbot_cef(
    loc: dict,
    return_period: float,
    duration_min: float,
) -> dict:
    """
    Talbot-CEF model (Buenos Aires - Azul).

    Formula: i = c / (d^e + f)

    where:
      i: intensity (mm/h)
      d: duration (minutes)
      c, e, f: TR-dependent parameters

    Args:
        loc: Locality dict with "parameters_by_tr" in formula
        return_period: Return period in years (must be 5, 10, 25, or 50)
        duration_min: Storm duration in minutes

    Returns:
        dict with intensity and metadata
    """
    locality_id = loc["id"]
    formula = loc["formula"]
    params_by_tr = formula["parameters_by_tr"]

    available_trs = sorted(int(k) for k in params_by_tr.keys())
    tr_min, tr_max = available_trs[0], available_trs[-1]

    if return_period < tr_min or return_period > tr_max:
        raise ValueError(
            f"Return period {return_period} yr is outside the valid range "
            f"[{tr_min}, {tr_max}] yr for locality '{locality_id}'. "
            f"Available TRs: {available_trs}"
        )

    # Validate duration range
    valid_min = formula.get("valid_duration_min")
    valid_max = formula.get("valid_duration_max")
    if valid_min is not None and duration_min < valid_min:
        raise ValueError(
            f"Duration {duration_min} min is below the valid minimum "
            f"{valid_min} min for locality '{locality_id}'."
        )
    if valid_max is not None and duration_min > valid_max:
        raise ValueError(
            f"Duration {duration_min} min exceeds the valid maximum "
            f"{valid_max} min for locality '{locality_id}'."
        )

    # Get parameters for the TR (exact match required for this model)
    if return_period not in available_trs:
        raise ValueError(
            f"Return period {return_period} yr is not available for locality '{locality_id}'. "
            f"Available TRs: {available_trs}. This model does not support interpolation."
        )

    params = params_by_tr[str(int(return_period))]
    c = params["c"]
    e = params["e"]
    f = params["f"]

    intensity = c / ((duration_min ** e) + f)

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "source": loc["source"]["document"],
    }


def _calculate_intensity_sherman_power(
    loc: dict,
    return_period: float,
    duration_min: float,
) -> dict:
    """
    Sherman Power model (Buenos Aires - Balcarce).

    Formula: i = tau · T^epsilon / d^eta

    where:
      i: intensity (mm/h)
      T: return period (years)
      d: duration (minutes)
      tau, epsilon, eta: global constants (independent of TR)

    Args:
        loc: Locality dict with "formula" containing tau, epsilon, eta
        return_period: Return period in years
        duration_min: Storm duration in minutes

    Returns:
        dict with intensity and metadata
    """
    locality_id = loc["id"]
    formula = loc["formula"]
    vars = formula["variables"]

    tau = vars["tau"]
    epsilon = vars["epsilon"]
    eta = vars["eta"]

    # Validate duration range
    valid_min = formula.get("valid_duration_min")
    valid_max = formula.get("valid_duration_max")
    if valid_min is not None and duration_min < valid_min:
        raise ValueError(
            f"Duration {duration_min} min is below the valid minimum "
            f"{valid_min} min for locality '{locality_id}'."
        )
    if valid_max is not None and duration_min > valid_max:
        raise ValueError(
            f"Duration {duration_min} min exceeds the valid maximum "
            f"{valid_max} min for locality '{locality_id}'."
        )

    # Validate TR range
    valid_tr_max = formula.get("valid_tr_max")
    if valid_tr_max is not None and return_period > valid_tr_max:
        raise ValueError(
            f"Return period {return_period} yr exceeds the maximum valid TR "
            f"{valid_tr_max} yr for locality '{locality_id}'."
        )

    intensity = tau * (return_period ** epsilon) / (duration_min ** eta)

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "source": loc["source"]["document"],
    }


import math


def _calculate_intensity_dit_3p(
    loc: dict,
    return_period: float,
    duration_min: float,
) -> dict:
    """
    DIT 3P model (Córdoba + Salta — INA-CIRSA).

    Formula: ln(i) = A · φ_T − B · δ_d + C

    where:
      φ_T = 2.584458 · (ln T)^(3/8) − 2.252573  [T in years]
      δ_d = (ln d)^(5/3)  [d in minutes]

    Result: i = exp(A · φ_T − B · δ_d + C) in mm/h

    Args:
        loc: Locality dict with "formula" containing A, B, C
        return_period: Return period in years
        duration_min: Storm duration in minutes

    Returns:
        dict with intensity and metadata
    """
    locality_id = loc["id"]
    formula = loc["formula"]

    A = formula["A"]
    B = formula["B"]
    C = formula["C"]

    # Calculate φ_T (phi_T)
    ln_T = math.log(return_period)
    phi_T = 2.584458 * (ln_T ** (3/8)) - 2.252573

    # Calculate δ_d (delta_d)
    ln_d = math.log(duration_min)
    delta_d = ln_d ** (5/3)

    # Calculate ln(i) and then i
    ln_i = A * phi_T - B * delta_d + C
    intensity = math.exp(ln_i)

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "source": loc["source"]["document"],
    }


def _calculate_intensity_dit_tucuman(
    loc: dict,
    return_period: float,
    duration_min: float,
    station_id: Optional[str] = None,
) -> dict:
    """
    DIT Tucumán model (Bazzano 2019, UNT-FACET).

    Formula: ln(i) = A' · Ø_T − B · δ_d + C'

    where:
      Ø_T = Factor de Frecuencia Normal de Chow (cuantil normal estándar)
      δ_d = (ln d)^(5/3)  [d in minutes]
      B = 0.1458 (constante fija para toda la provincia)
      A', C': parámetros estación-específicos

    Result: i = exp(A' · Ø_T − B · δ_d + C') in mm/h

    Args:
        loc: Locality dict with "model_parameters" and "stations"
        return_period: Return period in years
        duration_min: Storm duration in minutes
        station_id: Required - station identifier from stations dict

    Returns:
        dict with intensity and metadata

    Raises:
        ValueError: if station_id is not provided or not found
    """
    locality_id = loc["id"]

    if station_id is None:
        raise ValueError(
            f"station_id is required for locality '{locality_id}' (dit_tucuman model). "
            f"Available stations: {sorted(loc['stations'].keys())}"
        )

    stations = loc["stations"]
    if station_id not in stations:
        raise ValueError(
            f"Station '{station_id}' not found for locality '{locality_id}'. "
            f"Available stations: {sorted(stations.keys())}"
        )

    model_params = loc["model_parameters"]
    B_fixed = model_params["B_fixed"]
    phi_T_table = model_params["phi_T_table"]

    # Get station-specific parameters
    station_data = stations[station_id]
    A_prime = station_data["A_prime"]
    C_prime = station_data["C_prime"]
    station_name = station_data.get("name", station_id)

    # Get Ø_T (phi_T) from table - use linear interpolation if TR not exact
    available_trs = sorted(float(k) for k in phi_T_table.keys())
    tr_min, tr_max = available_trs[0], available_trs[-1]

    if return_period < tr_min or return_period > tr_max:
        raise ValueError(
            f"Return period {return_period} yr is outside the valid range "
            f"[{tr_min}, {tr_max}] yr for locality '{locality_id}'."
        )

    if return_period in available_trs:
        phi_T = phi_T_table[str(int(return_period)) if return_period == int(return_period) else str(return_period)]
    else:
        # Linear interpolation for phi_T
        lower_tr = max(t for t in available_trs if t <= return_period)
        upper_tr = min(t for t in available_trs if t >= return_period)
        lower_key = str(int(lower_tr)) if lower_tr == int(lower_tr) else str(lower_tr)
        upper_key = str(int(upper_tr)) if upper_tr == int(upper_tr) else str(upper_tr)
        phi_T = _linear_interp(
            return_period, lower_tr, upper_tr,
            phi_T_table[lower_key],
            phi_T_table[upper_key]
        )

    # Calculate δ_d (delta_d)
    ln_d = math.log(duration_min)
    delta_d = ln_d ** (5/3)

    # Calculate ln(i) and then i
    ln_i = A_prime * phi_T - B_fixed * delta_d + C_prime
    intensity = math.exp(ln_i)

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": True,
        "station_id": station_id,
        "station_name": station_name,
        "source": loc["source"]["document"],
    }


def _calculate_intensity_simple_scaling_table(
    loc: dict,
    return_period: float,
    duration_min: float,
) -> dict:
    """
    Simple Scaling Table model (Catamarca — INA-CRA).

    No analytical formula. Reads intensity directly from the published IDF
    table with log-linear interpolation in TR if needed. Durations and TRs
    outside the table range raise ValueError.

    Args:
        loc: Locality dict with "idf_table" containing durations_min,
             return_periods, and intensities (dict keyed by TR string).
        return_period: Return period in years.
        duration_min: Storm duration in minutes.

    Returns:
        dict with intensity and metadata

    Raises:
        ValueError: if duration or TR is outside the table range.
    """
    locality_id = loc["id"]
    table = loc["idf_table"]
    durations: list[int] = table["durations_min"]
    trs: list[int] = table["return_periods"]
    intensities: dict = table["intensities"]

    d_min, d_max = durations[0], durations[-1]
    if duration_min < d_min:
        raise ValueError(
            f"Duration {duration_min} min is below the minimum {d_min} min "
            f"for locality '{locality_id}'. This model has no sub-hourly data."
        )
    if duration_min > d_max:
        raise ValueError(
            f"Duration {duration_min} min exceeds the maximum {d_max} min "
            f"for locality '{locality_id}'."
        )

    tr_min, tr_max = trs[0], trs[-1]
    if return_period < tr_min or return_period > tr_max:
        raise ValueError(
            f"Return period {return_period} yr is outside the valid range "
            f"[{tr_min}, {tr_max}] yr for locality '{locality_id}'. "
            f"Available TRs: {trs}"
        )

    # Find surrounding durations for interpolation
    if duration_min in durations:
        d_lower_idx = d_upper_idx = durations.index(duration_min)
    else:
        d_lower_idx = max(i for i, d in enumerate(durations) if d <= duration_min)
        d_upper_idx = d_lower_idx + 1

    def _interp_at_tr(tr_key: int) -> float:
        row = intensities[str(tr_key)]
        if d_lower_idx == d_upper_idx:
            return float(row[d_lower_idx])
        d0, d1 = durations[d_lower_idx], durations[d_upper_idx]
        i0, i1 = float(row[d_lower_idx]), float(row[d_upper_idx])
        frac = (duration_min - d0) / (d1 - d0)
        return i0 + frac * (i1 - i0)

    # Exact TR match
    if return_period in trs:
        intensity = _interp_at_tr(int(return_period))
    else:
        # Log-linear interpolation in TR
        lower_tr = max(t for t in trs if t <= return_period)
        upper_tr = min(t for t in trs if t >= return_period)
        i_lower = _interp_at_tr(lower_tr)
        i_upper = _interp_at_tr(upper_tr)
        import math as _math
        log_frac = _math.log(return_period / lower_tr) / _math.log(upper_tr / lower_tr)
        intensity = i_lower * (i_upper / i_lower) ** log_frac

    return {
        "intensity_mm_hr": round(intensity, 3),
        "return_period": return_period,
        "duration_min": duration_min,
        "locality_id": locality_id,
        "formula_used": False,
        "source": loc["source"]["document"],
    }


# ── Main public entry point ────────────────────────────────────────────────────

def calculate_intensity(
    locality_id: str,
    return_period: float,
    duration_min: float,
    station_name: Optional[str] = None,
    station_id: Optional[str] = None,
) -> dict:
    """
    Calculate design rainfall intensity for a given locality.

    Dispatches to the appropriate model based on the locality's "idf_model" field:
      - "apa_chaco"             → Ip = A / (Td + B)^C  (Td in minutes)
      - "ina_cra_mendoza"       → I = omega(TR) / (D + 0.268)^0.883  (D in hours)
      - "neuquen_ssrh"          → Cartaya (D≤1h) or MIC (D>1h); requires station_name
      - "sherman_4p"            → i = K · Tr^m / (d + c)^n
      - "talbot_cef"            → i = c / (d^e + f)
      - "sherman_power"         → i = tau · T^epsilon / d^eta
      - "dit_3p"                → ln(i) = A · φ_T − B · δ_d + C
      - "dit_tucuman"           → ln(i) = A' · Ø_T − B · δ_d + C'; requires station_id
      - "simple_scaling_table"  → table lookup with log-linear interpolation in TR

    Args:
        locality_id:    Locality identifier string.
        return_period:  Design return period in years (float for interpolation).
        duration_min:   Storm duration in minutes.
        station_name:   Required for neuquen_ssrh model only.
        station_id:     Required for dit_tucuman model only.

    Returns:
        dict with keys:
            intensity_mm_hr (float)   — computed design intensity
            return_period   (float)   — as requested
            duration_min    (float)   — as requested
            locality_id     (str)
            formula_used    (bool)    — True for formula models, False for table lookup
            source          (str)     — source document reference string
            station_name    (str)     — only present for neuquen_ssrh model
            station_id      (str)     — only present for dit_tucuman model

    Raises:
        ValueError: locality not found, TR outside valid range, invalid station,
                    or duration outside valid range.
    """
    loc = get_locality(locality_id)
    idf_model = loc.get("idf_model", "apa_chaco")

    if idf_model == "apa_chaco":
        return _calculate_intensity_apa(loc, return_period, duration_min)
    elif idf_model == "ina_cra_mendoza":
        return _calculate_intensity_mendoza(loc, return_period, duration_min)
    elif idf_model == "neuquen_ssrh":
        return _calculate_intensity_neuquen(loc, return_period, duration_min, station_name)
    elif idf_model == "sherman_4p":
        return _calculate_intensity_sherman_4p(loc, return_period, duration_min)
    elif idf_model == "talbot_cef":
        return _calculate_intensity_talbot_cef(loc, return_period, duration_min)
    elif idf_model == "sherman_power":
        return _calculate_intensity_sherman_power(loc, return_period, duration_min)
    elif idf_model == "dit_3p":
        return _calculate_intensity_dit_3p(loc, return_period, duration_min)
    elif idf_model == "dit_tucuman":
        return _calculate_intensity_dit_tucuman(loc, return_period, duration_min, station_id)
    elif idf_model == "simple_scaling_table":
        return _calculate_intensity_simple_scaling_table(loc, return_period, duration_min)
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
