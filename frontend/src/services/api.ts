import type { HydrologyInput, HydrologyResult, InterpretationResponse } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function calculateHydrology(
  input: HydrologyInput,
): Promise<HydrologyResult> {
  // Map camelCase form state to snake_case API payload
  const payload = {
    city: input.city,
    location_description: input.location_description || undefined,
    return_period: input.return_period,
    duration_min: input.duration_min,
    area_km2: input.area_km2,
    length_km: input.length_km,
    slope: input.slope,
    elevation_diff_m: input.elevation_diff_m ?? undefined,
    avg_elevation_m: input.avg_elevation_m ?? undefined,
    method: input.method,
    runoff_coeff: input.runoff_coeff ?? undefined,
    land_use_categories: input.land_use_categories,
    soil_group: input.soil_group,
    use_pampa_lambda: input.use_pampa_lambda,
    infrastructure_type: input.infrastructure_type,
    tc_formulas: input.tc_formulas,
  };
  return request<HydrologyResult>('/api/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function interpretResults(
  result: HydrologyResult,
  language: string,
): Promise<InterpretationResponse> {
  return request<InterpretationResponse>('/api/interpret', {
    method: 'POST',
    body: JSON.stringify({ ...result, language }),
  });
}

export async function generateReport(
  calculationData: HydrologyResult,
  options: {
    projectName: string;
    location: string;
    clientName?: string;
    language: string;
    aiInterpretation?: string;
  },
): Promise<Blob> {
  const res = await fetch(`${BASE}/api/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      calculationData,
      projectName: options.projectName,
      location: options.location,
      clientName: options.clientName,
      language: options.language,
      aiInterpretation: options.aiInterpretation ?? '',
      fetchAISections: true,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.blob();
}

export async function generateDocxReport(
  calculationData: HydrologyResult,
  options: {
    projectName: string;
    location: string;
    clientName?: string;
    language: string;
    aiInterpretation?: string;
  },
): Promise<Blob> {
  const res = await fetch(`${BASE}/api/report/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      calculationData,
      projectName: options.projectName,
      location: options.location,
      clientName: options.clientName,
      language: options.language,
      aiInterpretation: options.aiInterpretation ?? '',
      fetchAISections: true,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.blob();
}

export async function getCities(): Promise<
  Array<{ city: string; province: string; source: string }>
> {
  return request('/api/cities');
}
