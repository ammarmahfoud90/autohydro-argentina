export interface IDFSource {
  document: string;
  institution: string;
  date: string;
  stations?: string[];
  series_period?: string | null;
  series_length_years?: number | null;
}

export interface IDFLimitations {
  // APA Chaco fields
  max_reliable_return_period?: number;
  spatial_coverage?: string;
  series_note?: string;
  // Sherman / Santa Fe fields
  tr_confiable?: number;
  tr_note?: string;
  // DIT / Córdoba / Salta fields
  geographic_scope?: string;
  duration_note?: string;
  altitude_note?: string;
  // Entre Ríos fields
  normative_status?: string;
  cross_reference?: string;
  // Catamarca fields
  scaling_note?: string;
  // Balcarce fields
  model_note?: string;
  valid_duration_note?: string;
  // Tucumán fields
  station_selection_note?: string;
  source_note?: string;
}

export interface IDFLocality {
  id: string;
  name: string;
  short_name: string;
  province: string;
  coordinates: { lat: number; lon: number };
  source: IDFSource;
  limitations: IDFLimitations;
  municipalities: string[];
  return_periods: number[];
  durations_min: number[];
  idf_model?: string;
  valid_tr_min?: number;
  valid_tr_max?: number;
  valid_duration_min?: number;
  valid_duration_max?: number;
}
