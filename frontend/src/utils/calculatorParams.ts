import type { HydrologyInput } from '../types';
import { DEFAULT_FORM } from '../types';

/** Parse a numeric URL param safely, returning fallback when missing/NaN/Infinity. */
function parseNum(raw: string | null, fallback: number): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntParam(raw: string | null, fallback: number): number {
  const n = parseNum(raw, fallback);
  return Math.trunc(n);
}

/** Valid method values — used as a guard against malformed ?method= */
const VALID_METHODS = new Set<HydrologyInput['method']>([
  'rational',
  'modified_rational',
  'scs_cn',
]);

export function hydrateFormFromParams(params: URLSearchParams): HydrologyInput | null {
  const localidad = params.get('localidad');
  const methodRaw = params.get('method') as HydrologyInput['method'] | null;
  const method = methodRaw && VALID_METHODS.has(methodRaw) ? methodRaw : DEFAULT_FORM.method;

  if (!localidad) {
    // No locality: only hydrate if a valid method was explicitly provided via ?method=
    if (method !== DEFAULT_FORM.method) {
      return { ...DEFAULT_FORM, method };
    }
    return null;
  }

  return {
    ...DEFAULT_FORM,
    locality_id: localidad,
    station_id: params.get('station') ?? null,
    station_name: params.get('station_name') ?? null,
    return_period: parseIntParam(params.get('TR'), DEFAULT_FORM.return_period),
    duration_min: parseIntParam(params.get('t'), DEFAULT_FORM.duration_min),
    area_km2: Math.max(0, parseNum(params.get('area'), DEFAULT_FORM.area_km2)),
    length_km: Math.max(0, parseNum(params.get('length'), DEFAULT_FORM.length_km)),
    slope: Math.max(0, parseNum(params.get('slope'), DEFAULT_FORM.slope)),
    method,
  };
}
