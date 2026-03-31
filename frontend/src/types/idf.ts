export interface IDFSource {
  document: string;
  institution: string;
  date: string;
  stations?: string[];
  series_period?: string | null;
  series_length_years?: number | null;
}

export interface IDFLimitations {
  max_reliable_return_period?: number;
  spatial_coverage?: string;
  series_note?: string;
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
}
