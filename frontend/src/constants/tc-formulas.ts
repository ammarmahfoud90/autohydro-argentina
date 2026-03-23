/**
 * Time of Concentration (Tc) formula definitions and client-side calculations.
 * Mirrors backend tc_service.py for use in real-time UI previews.
 */

export type TcFormulaKey =
  | 'kirpich'
  | 'california'
  | 'temez'
  | 'giandotti'
  | 'ventura_heras'
  | 'passini';

export interface TcFormulaInfo {
  key: TcFormulaKey;
  /** Author and year — used as display name */
  name: string;
  formula: string;
  /** Parameters this formula requires */
  requiredParams: Array<'L_m' | 'L_km' | 'S' | 'A_km2' | 'H_m' | 'Hm_m'>;
  applicability: string;
  notes: string;
  /** Unit of the result before conversion */
  resultUnit: 'minutes' | 'hours';
}

export const TC_FORMULAS: Record<TcFormulaKey, TcFormulaInfo> = {
  kirpich: {
    key: 'kirpich',
    name: 'Kirpich (1940)',
    formula: 'Tc = 0.0195 × L⁰·⁷⁷ × S⁻⁰·³⁸⁵  [min]',
    requiredParams: ['L_m', 'S'],
    applicability: 'Cuencas rurales pequeñas (< 0.5 km²), pendientes 3–10%',
    notes: 'L en metros. Desarrollada para cuencas agrícolas de Tennessee.',
    resultUnit: 'minutes',
  },
  california: {
    key: 'california',
    name: 'California Culverts (1942)',
    formula: 'Tc = 57 × (L³/H)⁰·³⁸⁵  [min]',
    requiredParams: ['L_km', 'H_m'],
    applicability: 'Cuencas montañosas, pequeñas a medianas',
    notes: 'L en km, H desnivel total en metros.',
    resultUnit: 'minutes',
  },
  temez: {
    key: 'temez',
    name: 'Témez (1978)',
    formula: 'Tc = 0.3 × (L / S⁰·²⁵)⁰·⁷⁶  [hr]',
    requiredParams: ['L_km', 'S'],
    applicability: 'Cuencas naturales, amplio rango de tamaños. Recomendado para Argentina.',
    notes: 'L en km. Método preferido en práctica argentina y española.',
    resultUnit: 'hours',
  },
  giandotti: {
    key: 'giandotti',
    name: 'Giandotti (1934)',
    formula: 'Tc = (4√A + 1.5L) / (0.8√Hm)  [hr]',
    requiredParams: ['A_km2', 'L_km', 'Hm_m'],
    applicability: 'Cuencas grandes (> 10 km²), terreno montañoso',
    notes: 'A en km², L en km, Hm altura media sobre punto de cierre en metros.',
    resultUnit: 'hours',
  },
  ventura_heras: {
    key: 'ventura_heras',
    name: 'Ventura-Heras',
    formula: 'Tc = 0.3 × √(A/S)  [hr]',
    requiredParams: ['A_km2', 'S'],
    applicability: 'Cuencas pequeñas a medianas. Pampa Húmeda (pendientes bajas).',
    notes: 'A en km². Útil cuando solo se dispone de área y pendiente media.',
    resultUnit: 'hours',
  },
  passini: {
    key: 'passini',
    name: 'Passini',
    formula: 'Tc = 0.108 × (A·L)^(1/3) / √S  [hr]',
    requiredParams: ['A_km2', 'L_km', 'S'],
    applicability: 'Cuencas rurales con pendientes moderadas',
    notes: 'A en km², L en km.',
    resultUnit: 'hours',
  },
};

export const TC_FORMULA_LIST = Object.values(TC_FORMULAS);

export interface TcInputs {
  L_m: number;    // channel length in meters
  L_km: number;   // channel length in km
  S: number;      // average slope (m/m)
  A_km2: number;  // basin area (km²)
  H_m?: number;   // total elevation diff (m) — for California
  Hm_m?: number;  // avg elevation above outlet (m) — for Giandotti
}

export interface TcCalcResult {
  formula: TcFormulaKey;
  formulaName: string;
  tcHours: number;
  tcMinutes: number;
  applicability: string;
  notes: string;
}

/**
 * Calculate Tc using all formulas for which sufficient inputs are available.
 * Mirrors backend calculate_all_tc().
 */
export function calculateAllTc(
  inputs: TcInputs,
  formulas?: TcFormulaKey[],
): TcCalcResult[] {
  const { L_m, L_km, S, A_km2, H_m, Hm_m } = inputs;
  const requested = formulas ? new Set(formulas) : new Set(TC_FORMULA_LIST.map((f) => f.key));
  const results: TcCalcResult[] = [];

  const push = (key: TcFormulaKey, tcHours: number) => {
    if (!requested.has(key) || !isFinite(tcHours) || tcHours <= 0) return;
    const info = TC_FORMULAS[key];
    results.push({
      formula: key,
      formulaName: info.name,
      tcHours: Math.round(tcHours * 10000) / 10000,
      tcMinutes: Math.round(tcHours * 60 * 10) / 10,
      applicability: info.applicability,
      notes: info.notes,
    });
  };

  // Kirpich — L in metres, S m/m → result in minutes → convert to hours
  if (L_m > 0 && S > 0) {
    push('kirpich', (0.0195 * Math.pow(L_m, 0.77) * Math.pow(S, -0.385)) / 60);
  }

  // Témez — L in km, S m/m → result in hours
  if (L_km > 0 && S > 0) {
    push('temez', 0.3 * Math.pow(L_km / Math.pow(S, 0.25), 0.76));
  }

  // California — L in km, H in m → result in minutes → convert to hours
  if (L_km > 0 && H_m && H_m > 0) {
    push('california', (57 * Math.pow(Math.pow(L_km, 3) / H_m, 0.385)) / 60);
  }

  // Giandotti — A in km², L in km, Hm in m → result in hours
  if (A_km2 > 0 && L_km > 0 && Hm_m && Hm_m > 0) {
    push('giandotti', (4 * Math.sqrt(A_km2) + 1.5 * L_km) / (0.8 * Math.sqrt(Hm_m)));
  }

  // Ventura-Heras — A in km², S m/m → result in hours
  if (A_km2 > 0 && S > 0) {
    push('ventura_heras', 0.3 * Math.sqrt(A_km2 / S));
  }

  // Passini — A in km², L in km, S m/m → result in hours
  if (A_km2 > 0 && L_km > 0 && S > 0) {
    push('passini', (0.108 * Math.pow(A_km2 * L_km, 1 / 3)) / Math.sqrt(S));
  }

  return results;
}

/**
 * Compute average Tc (hours) from a set of results.
 */
export function averageTc(results: TcCalcResult[]): number {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + r.tcHours, 0) / results.length;
}
