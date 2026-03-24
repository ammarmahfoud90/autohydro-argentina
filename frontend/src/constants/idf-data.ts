/**
 * IDF (Intensity-Duration-Frequency) coefficients for major Argentine cities.
 *
 * Formula: i = (a * T^b) / (t + c)^d
 *   i = rainfall intensity (mm/hr)
 *   T = return period (years)
 *   t = duration (minutes)
 *   a, b, c, d = regional coefficients
 *
 * Sources: Caamaño Nelli et al. (1999), INA regional publications, SMN.
 * Extended dataset: Regionalización INA/SMN - Estimaciones para uso preliminar.
 *
 * DISCLAIMER: For preliminary estimates only. Verify with local studies for final designs.
 * NOTE: Cities added from the INA/SMN regionalization are estimates for preliminary stages
 * and have not been individually validated against local pluviographic records.
 */

export interface IDFCoefficients {
  city: string;
  province: string;
  a: number;
  b: number;
  c: number;
  d: number;
  source: string;
  validRange: { tMin: number; tMax: number; TMin: number; TMax: number };
}

export const IDF_ARGENTINA: IDFCoefficients[] = [
  {
    city: "Buenos Aires (Aeroparque)",
    province: "CABA",
    a: 1656.36,
    b: 0.197,
    c: 13.0,
    d: 0.846,
    source: "Caamaño Nelli et al. (1999) / INA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Buenos Aires (Ezeiza)",
    province: "Buenos Aires",
    a: 1490.0,
    b: 0.178,
    c: 12.0,
    d: 0.820,
    source: "Caamaño Nelli et al. (1999)",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Córdoba (Observatorio)",
    province: "Córdoba",
    a: 2850.0,
    b: 0.220,
    c: 15.0,
    d: 0.900,
    source: "Rühle (1966) / Actualización INA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Rosario",
    province: "Santa Fe",
    a: 1800.0,
    b: 0.185,
    c: 12.0,
    d: 0.850,
    source: "INA - Centro Regional Litoral",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Mendoza (Aeropuerto)",
    province: "Mendoza",
    a: 720.0,
    b: 0.250,
    c: 10.0,
    d: 0.750,
    source: "INA - Centro Regional Andino",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  {
    city: "Salta",
    province: "Salta",
    a: 2200.0,
    b: 0.210,
    c: 14.0,
    d: 0.880,
    source: "SMN / Estudios regionales NOA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Resistencia",
    province: "Chaco",
    a: 2400.0,
    b: 0.195,
    c: 12.0,
    d: 0.860,
    source: "INA - Centro Regional NEA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Santa Fe",
    province: "Santa Fe",
    a: 1950.0,
    b: 0.190,
    c: 12.0,
    d: 0.855,
    source: "INA - Centro Regional Litoral",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Neuquén",
    province: "Neuquén",
    a: 580.0,
    b: 0.240,
    c: 10.0,
    d: 0.720,
    source: "INA - Centro Regional Comahue",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  {
    city: "Bahía Blanca",
    province: "Buenos Aires",
    a: 1100.0,
    b: 0.200,
    c: 11.0,
    d: 0.800,
    source: "Caamaño Nelli et al. (1999)",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Tucumán",
    province: "Tucumán",
    a: 2600.0,
    b: 0.205,
    c: 14.0,
    d: 0.875,
    source: "SMN / Estudios regionales NOA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Posadas",
    province: "Misiones",
    a: 2800.0,
    b: 0.188,
    c: 13.0,
    d: 0.870,
    source: "INA - Centro Regional NEA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Comodoro Rivadavia",
    province: "Chubut",
    a: 380.0,
    b: 0.260,
    c: 8.0,
    d: 0.680,
    source: "INA - Centro Regional Patagonia",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  {
    city: "La Plata",
    province: "Buenos Aires",
    a: 1580.0,
    b: 0.192,
    c: 12.5,
    d: 0.840,
    source: "UNLP - Departamento de Hidráulica",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Mar del Plata",
    province: "Buenos Aires",
    a: 1320.0,
    b: 0.188,
    c: 11.5,
    d: 0.825,
    source: "Caamaño Nelli et al. (1999)",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  // NOA
  {
    city: "San Salvador de Jujuy",
    province: "Jujuy",
    a: 2100.0,
    b: 0.215,
    c: 14.0,
    d: 0.870,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Santiago del Estero",
    province: "Santiago del Estero",
    a: 1850.0,
    b: 0.210,
    c: 13.0,
    d: 0.855,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "San Fernando del Valle de Catamarca",
    province: "Catamarca",
    a: 1200.0,
    b: 0.230,
    c: 12.0,
    d: 0.820,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "La Rioja",
    province: "La Rioja",
    a: 950.0,
    b: 0.240,
    c: 11.0,
    d: 0.790,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  // NEA
  {
    city: "Corrientes",
    province: "Corrientes",
    a: 2500.0,
    b: 0.190,
    c: 13.0,
    d: 0.865,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Formosa",
    province: "Formosa",
    a: 2450.0,
    b: 0.192,
    c: 12.0,
    d: 0.860,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  // Cuyo
  {
    city: "San Juan",
    province: "San Juan",
    a: 650.0,
    b: 0.255,
    c: 10.0,
    d: 0.740,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  {
    city: "San Luis",
    province: "San Luis",
    a: 1100.0,
    b: 0.225,
    c: 11.0,
    d: 0.810,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  // Patagonia
  {
    city: "Rawson",
    province: "Chubut",
    a: 420.0,
    b: 0.265,
    c: 8.0,
    d: 0.690,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  {
    city: "Viedma",
    province: "Río Negro",
    a: 480.0,
    b: 0.260,
    c: 9.0,
    d: 0.700,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  {
    city: "Río Gallegos",
    province: "Santa Cruz",
    a: 320.0,
    b: 0.270,
    c: 7.0,
    d: 0.650,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  {
    city: "Ushuaia",
    province: "Tierra del Fuego",
    a: 380.0,
    b: 0.268,
    c: 8.0,
    d: 0.670,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 },
  },
  // Centro / Litoral
  {
    city: "Paraná",
    province: "Entre Ríos",
    a: 1900.0,
    b: 0.188,
    c: 12.0,
    d: 0.855,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Concordia",
    province: "Entre Ríos",
    a: 2050.0,
    b: 0.185,
    c: 12.0,
    d: 0.860,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  // Buenos Aires Interior
  {
    city: "Tandil",
    province: "Buenos Aires",
    a: 1400.0,
    b: 0.195,
    c: 12.0,
    d: 0.835,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Olavarría",
    province: "Buenos Aires",
    a: 1350.0,
    b: 0.198,
    c: 12.0,
    d: 0.830,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Junín",
    province: "Buenos Aires",
    a: 1500.0,
    b: 0.190,
    c: 12.0,
    d: 0.840,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
  {
    city: "Pergamino",
    province: "Buenos Aires",
    a: 1550.0,
    b: 0.188,
    c: 12.0,
    d: 0.845,
    source: "Regionalización INA/SMN - Estimaciones para uso preliminar",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
];

/**
 * Calculate IDF intensity for a given city, return period and duration.
 * Mirrors the backend formula for use in real-time UI previews.
 */
export function calculateIDFIntensity(
  city: IDFCoefficients,
  T: number,
  t: number,
): number {
  return (city.a * Math.pow(T, city.b)) / Math.pow(t + city.c, city.d);
}

export function getCityByName(name: string): IDFCoefficients | undefined {
  return IDF_ARGENTINA.find((c) => c.city === name);
}
