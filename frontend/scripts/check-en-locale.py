#!/usr/bin/env python3
"""
CI check: EN locale must not contain known Spanish-only tokens
in the calculator namespaces (manning, culvert, hyetograph, results_extra).

Usage:  python scripts/check-en-locale.py
Exit:   0 = OK, 1 = violations found
"""

import json
import re
import sys
from pathlib import Path

EN_JSON = Path(__file__).parent.parent / "src" / "i18n" / "en.json"

AUDITED_NAMESPACES = {"manning", "culvert", "hyetograph", "results_extra"}

# Spanish words/phrases that must NEVER appear in EN strings.
# Chosen to avoid false positives (no "de", no city names, no technical units).
BANNED_TOKENS = [
    "Calculando", "Calcular",
    "Ingresá", "Ingresa", "Completá",
    "Seleccioná", "Selecciona", "Configurá",
    "Caudal", "alcantarilla", "Alcantarilla",
    "hietograma", "Hietograma",
    "pendiente", "Pendiente",
    "longitud", "Longitud",
    "tirante", "Tirante",
    "aguas arriba", "aguas abajo",
    "Parámetros", "parámetros",
    "Dimensionar",
    "Metodología", "metodología",
    "conducto", "Conducto",
    "tamaño", "Tamaño",
    "Comparativa",
    "recomendado", "Recomendado",
    "Continuar", "Volver",
    "Nuevo cálculo",
    "Generar", "Generando",
    "Descargar", "Generador",
    "distribución", "Distribución",
    "duración", "Duración",
    "intervalo", "Intervalo",
    "localidad", "Localidad",
    "período de retorno", "Período de retorno",
    "precipitación", "Precipitación",
    "acumulada", "Acumulada",
    "coeficiente", "Coeficiente",
    "sección", "Sección",
    "Rugosidad", "rugosidad",
    "hidráulico", "Hidráulico",
    "Verificar", "verificar",
]


def flatten(obj, prefix=""):
    """Yield (key, value) pairs for all string leaves in a nested dict."""
    for k, v in obj.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, str):
            yield full_key, v
        elif isinstance(v, dict):
            yield from flatten(v, full_key)


def main():
    en = json.loads(EN_JSON.read_text(encoding="utf-8"))
    all_entries = list(flatten(en))

    audited = [
        (k, v) for k, v in all_entries
        if any(k.startswith(f"{ns}.") for ns in AUDITED_NAMESPACES)
    ]

    violations = []
    for token in BANNED_TOKENS:
        # Use word boundaries so e.g. "longitud" doesn't match "Longitudinal"
        pattern = re.compile(r'\b' + re.escape(token) + r'\b', re.IGNORECASE)
        for key, value in audited:
            if pattern.search(value):
                violations.append(f'  [{key}] contains "{token}": "{value}"')

    if violations:
        print(f"FAIL: {len(violations)} Spanish token(s) found in EN locale:")
        for v in violations:
            print(v)
        sys.exit(1)
    else:
        print(f"OK: EN locale is clean ({len(audited)} keys audited in "
              f"{', '.join(sorted(AUDITED_NAMESPACES))})")
        sys.exit(0)


if __name__ == "__main__":
    main()
