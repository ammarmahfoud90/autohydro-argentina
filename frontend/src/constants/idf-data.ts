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
  verified: boolean;
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
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
    verified: true,
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 },
  },
];

/**
 * CIUDADES PENDIENTES DE DATOS IDF REALES
 * Los coeficientes IDF para las siguientes ciudades fueron generados por IA
 * sin fuente bibliográfica verificable. Se eliminaron del dataset hasta que
 * se obtengan datos de fuentes primarias (INA, SMN, universidades, DPV provincial).
 *
 * NOA:       San Salvador de Jujuy, Santiago del Estero, Catamarca, La Rioja
 * NEA:       Corrientes, Formosa
 * Cuyo:      San Juan, San Luis
 * Patagonia: Rawson, Viedma, Río Gallegos, Ushuaia
 * Litoral:   Paraná, Concordia
 * Bs. As. Interior: Tandil, Olavarría, Junín, Pergamino
 *
 * Para contribuir datos IDF verificados, abrí un issue en el repositorio de GitHub.
 */

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
