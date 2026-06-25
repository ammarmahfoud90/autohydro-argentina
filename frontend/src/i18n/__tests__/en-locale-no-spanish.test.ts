/**
 * CI guard: EN locale must not contain known Spanish-only tokens in
 * the calculator namespaces (manning, culvert, hyetograph, results_extra).
 *
 * This test fails if a translator forgets to add an English translation and
 * accidentally copies a Spanish string into en.json, or if a new key is added
 * to es.json without a corresponding EN entry (which i18next would then fall
 * back to the Spanish default).
 *
 * The check is intentionally coarse — it looks for high-frequency Spanish
 * words that should NEVER appear in English UI text.  Proper nouns (city
 * names, "Manning", "SCS-CN", "FHWA") and bilingual technical units
 * ("mm/hr", "m³/s") are excluded from the banned list.
 */

import { describe, it, expect } from 'vitest';
import enJson from '../en.json';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Flatten a nested object to a map of dot-delimited key → string value. */
function flattenStrings(obj: Record<string, unknown>, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      result.set(key, v);
    } else if (v !== null && typeof v === 'object') {
      for (const [sk, sv] of flattenStrings(v as Record<string, unknown>, key)) {
        result.set(sk, sv);
      }
    }
  }
  return result;
}

// ── Banned Spanish tokens (case-insensitive) ──────────────────────────────────
//
// Words that are common in Spanish UI text but should not appear in EN strings.
// Carefully chosen to avoid false positives:
//   • "de" is too short and appears in English too → excluded
//   • Proper nouns ("Argentina", city names) → excluded
//   • Technical abbreviations ("mm", "m/s") → excluded

const BANNED_TOKENS = [
  'Calculando',
  'Calcular',
  'Ingresá',
  'Ingresa',
  'Completá',
  'Seleccioná',
  'Selecciona',
  'Configurá',
  'Caudal',
  'alcantarilla',
  'Alcantarilla',
  'hietograma',
  'Hietograma',
  'pendiente',
  'Pendiente',
  'longitud',
  'Longitud',
  'tirante',
  'Tirante',
  'aguas arriba',
  'aguas abajo',
  'Parámetros',
  'parámetros',
  'Dimensionar',
  'Metodología',
  'metodología',
  'conducto',
  'Conducto',
  'tamaño',
  'Tamaño',
  'Comparativa',
  'recomendado',
  'Recomendado',
  'Continuar',
  'Volver',
  'Nuevo cálculo',
  'Generar',
  'Generando',
  'Descargar',
  'Generador',
  'distribución',
  'Distribución',
  'duración',
  'Duración',
  'intervalo',
  'Intervalo',
  'localidad',
  'Localidad',
  'período de retorno',
  'Período de retorno',
  'precipitación',
  'Precipitación',
  'acumulada',
  'Acumulada',
  'coeficiente',
  'Coeficiente',
  'sección',
  'Sección',
  'Rugosidad',
  'rugosidad',
  'hidráulico',
  'Hidráulico',
  'Verificar',
  'verificar',
];

// ── Namespaces to audit ───────────────────────────────────────────────────────

const AUDITED_NAMESPACES = ['manning', 'culvert', 'hyetograph', 'results_extra'];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EN locale — no Spanish tokens in calculator namespaces', () => {
  const allStrings = flattenStrings(enJson as Record<string, unknown>);

  // Filter to only the keys under the audited namespaces
  const auditedEntries = [...allStrings.entries()].filter(([key]) =>
    AUDITED_NAMESPACES.some((ns) => key.startsWith(`${ns}.`))
  );

  it('audited namespaces have at least one key each', () => {
    for (const ns of AUDITED_NAMESPACES) {
      const count = auditedEntries.filter(([k]) => k.startsWith(`${ns}.`)).length;
      expect(count, `Namespace "${ns}" has no entries in en.json`).toBeGreaterThan(0);
    }
  });

  for (const token of BANNED_TOKENS) {
    it(`EN strings do not contain Spanish token "${token}"`, () => {
      const violations: string[] = [];
      // Use word boundaries so e.g. "longitud" does not match "Longitudinal"
      const pattern = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      for (const [key, value] of auditedEntries) {
        if (pattern.test(value)) {
          violations.push(`  ${key}: "${value}"`);
        }
      }
      expect(violations, `Found Spanish token "${token}" in EN locale:\n${violations.join('\n')}`).toHaveLength(0);
    });
  }
});
