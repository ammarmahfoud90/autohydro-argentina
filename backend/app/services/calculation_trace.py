"""Reproducible report data shared by PDF, Word and Excel exports."""

import json

from app.services.calculation import run_calculation, classify_risk


def prepare_report_data(data: dict) -> dict:
    inputs = data.get("calculation_inputs")
    if inputs:
        # Recompute with the current engine; never certify client-edited results.
        result = run_calculation(inputs)
        result.update({key: inputs.get(key) for key in (
            "length_km", "slope", "elevation_diff_m", "avg_elevation_m",
            "station_id", "station_name", "land_use_categories", "soil_group",
        )})
        return result
    result = {**data, "warnings": list(data.get("warnings", []))}
    result["warnings"] = list(dict.fromkeys([*result["warnings"], "Resultado histórico sin entradas completas: no se pudo reproducir con el motor actual. Recalcular antes de usarlo para diseño."]))
    result["validation_status"] = "legacy_not_reproducible"
    level, recs = classify_risk(result.get("peak_flow_m3s", 0), result.get("infrastructure_type", ""), result.get("return_period", 0))
    result["risk_level"], result["risk_recommendations"] = level, recs.model_dump()
    return result


def trace_rows(data: dict) -> list[tuple[str, str]]:
    rows = [
        ("Versión del cálculo", data.get("calculation_version", "histórico sin versión")),
        ("Validación", "Casos de referencia; pendiente de validación con datos locales" if data.get("validation_status") == "reference_cases_only" else data.get("validation_status", "sin constancia")),
        ("Duración solicitada (min)", str(data.get("requested_duration_min", "—"))),
        ("Duración utilizada en IDF (min)", str(data.get("effective_duration_min", data.get("duration_min", "—")))),
        ("Fórmula Tc adoptada", data.get("tc_adopted_formula_name") or "—"),
        ("Fuente IDF", data.get("idf_source", "—")),
        ("Modelo IDF", data.get("idf_model", "—")),
        ("Huella de datos IDF (SHA-256)", data.get("idf_data_sha256", "—")),
    ]
    for key, value in data.get("calculation_inputs", {}).items():
        if value is not None:
            rows.append((f"Entrada: {key}", json.dumps(value, ensure_ascii=False, sort_keys=True)))
    rows.extend(("Advertencia", warning) for warning in data.get("warnings", []))
    return rows
