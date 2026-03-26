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
    cn_override: input.cn_override ?? undefined,
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
    basinPolygon?: [number, number][];
    comparisonData?: HydrologyResult | null;
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
      basinPolygon: options.basinPolygon ?? null,
      comparisonData: options.comparisonData ?? null,
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
    basinPolygon?: [number, number][];
    comparisonData?: HydrologyResult | null;
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
      basinPolygon: options.basinPolygon ?? null,
      comparisonData: options.comparisonData ?? null,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.blob();
}

export async function generateExcelReport(
  calculationData: HydrologyResult,
  options: {
    projectName: string;
    location: string;
    clientName?: string;
  },
): Promise<Blob> {
  const res = await fetch(`${BASE}/api/report/excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      calculationData,
      projectName: options.projectName,
      location: options.location,
      clientName: options.clientName,
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

export interface WatershedResult {
  geojson: object;
  area_km2: number;
  slope: number;
  length_km: number;
}

export async function delineateWatershed(
  latitude: number,
  longitude: number,
): Promise<WatershedResult> {
  return request<WatershedResult>('/api/watershed/delineate', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export interface LandUseItem {
  cn_key: string;
  description_es: string;
  area_percent: number;
  condition: string;
  cn_value: number | null;
}

export interface LandUseClassifyResult {
  land_uses: LandUseItem[];
  weighted_cn: number;
  confidence: 'alta' | 'media' | 'baja';
  notes: string;
}

export async function exportShapefile(
  polygon: [number, number][],
  attributes: Record<string, unknown>,
  name?: string,
): Promise<Blob> {
  const res = await fetch(`${BASE}/api/gis/export-shapefile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ polygon, attributes, name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.blob();
}

export interface ShapefileImportResult {
  polygon: [number, number][];
  area_km2: number;
  attributes: Record<string, unknown>;
}

export async function importShapefile(file: File): Promise<ShapefileImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/api/gis/import-shapefile`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface FloodSimulationRequest {
  design_flow_m3s: number;
  channel_geometry: {
    type: string;
    width: number;
    depth: number;
    slope: number;
    manning_n: number;
  };
  floodplain_width_m: number;
  simulation_length_m: number;
  center_coordinates: [number, number];
}

export interface DepthZone {
  level: string;
  area_ha: number;
  color: string;
}

export interface FloodSimulationResult {
  flooded_area_ha: number;
  max_depth_m: number;
  avg_depth_m: number;
  normal_depth_m: number;
  channel_capacity_m3s: number;
  flood_above_bank_m: number;
  total_flood_width_m: number;
  risk_level: string;
  risk_description: string;
  flood_polygon: object;
  depth_zones: DepthZone[];
  summary: string;
}

export async function simulateFlood(
  req: FloodSimulationRequest,
): Promise<FloodSimulationResult> {
  return request<FloodSimulationResult>('/api/flood/simulate', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function classifyLandUse(
  description: string,
  soilGroup: string,
): Promise<LandUseClassifyResult> {
  return request<LandUseClassifyResult>('/api/landuse/classify', {
    method: 'POST',
    body: JSON.stringify({ description, soil_group: soilGroup }),
  });
}
