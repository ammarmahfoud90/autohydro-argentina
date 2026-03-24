// ── Input types ───────────────────────────────────────────────────────────────

export type HydroMethod = 'rational' | 'modified_rational' | 'scs_cn';
export type SoilGroup = 'A' | 'B' | 'C' | 'D';
export type HydroCondition = 'poor' | 'fair' | 'good';
export type TcFormulaKey =
  | 'kirpich'
  | 'california'
  | 'temez'
  | 'giandotti'
  | 'ventura_heras'
  | 'passini';
export type InfrastructureType =
  | 'alcantarilla_menor'
  | 'alcantarilla_mayor'
  | 'puente_menor'
  | 'puente_mayor'
  | 'canal_urbano'
  | 'canal_rural'
  | 'defensa_costera';
export type RiskLevel = 'muy_bajo' | 'bajo' | 'moderado' | 'alto' | 'muy_alto';

export interface LandUseCategory {
  land_use: string;
  area_percent: number;
  condition: HydroCondition;
}

export interface HydrologyInput {
  city: string;
  location_description: string;
  return_period: number;
  duration_min: number;
  area_km2: number;
  length_km: number;
  slope: number;
  elevation_diff_m: number | null;
  avg_elevation_m: number | null;
  method: HydroMethod;
  runoff_coeff: number | null;
  land_use_categories: LandUseCategory[];
  soil_group: SoilGroup;
  use_pampa_lambda: boolean;
  infrastructure_type: InfrastructureType;
  tc_formulas: TcFormulaKey[];
  project_name: string;
  client_name: string;
  language: string;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface TcFormulaResult {
  formula: string;
  formulaName: string;
  tcHours: number;
  tcMinutes: number;
  applicability: string;
  notes: string;
}

export interface MethodResult {
  method: string;
  methodName: string;
  peakFlow: number;
  tc: number;
  intensity: number;
  notes: string;
}

export interface RiskRecommendations {
  general: string;
  action: string;
  verification: string;
  period_note?: string;
}

export interface HydrologyResult {
  city: string;
  province: string;
  return_period: number;
  duration_min: number;
  area_km2: number;
  method: string;
  location_description?: string;
  intensity_mm_hr: number;
  idf_source: string;
  tc_results: TcFormulaResult[];
  tc_adopted_hours: number;
  tc_adopted_minutes: number;
  runoff_coeff?: number;
  cn?: number;
  s_mm?: number;
  ia_mm?: number;
  runoff_depth_mm?: number;
  areal_reduction_k?: number;
  peak_flow_m3s: number;
  specific_flow_m3s_km2: number;
  method_comparison: MethodResult[];
  risk_level: RiskLevel;
  risk_recommendations: RiskRecommendations;
  infrastructure_type: string;
  cn_sensitivity?: CNSensitivityPoint[];
}

export interface CNSensitivityPoint {
  label: string;        // "CN-5" | "CN" | "CN+5"
  cn: number;           // actual CN value used
  peak_flow_m3s: number;
  variation_pct: number; // 0 for base case
}

export interface InterpretationResponse {
  interpretation: string;
}

// ── Utility ───────────────────────────────────────────────────────────────────

export const DEFAULT_FORM: HydrologyInput = {
  city: '',
  location_description: '',
  return_period: 25,
  duration_min: 60,
  area_km2: 0,
  length_km: 0,
  slope: 0,
  elevation_diff_m: null,
  avg_elevation_m: null,
  method: 'rational',
  runoff_coeff: 0.6,
  land_use_categories: [],
  soil_group: 'B',
  use_pampa_lambda: false,
  infrastructure_type: 'canal_rural',
  tc_formulas: ['temez'],
  project_name: '',
  client_name: '',
  language: 'es',
};
