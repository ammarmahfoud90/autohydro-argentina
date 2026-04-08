/**
 * Unit tests for Time of Concentration (Tc) formulas.
 *
 * Expected values are hand-calculated from the published formulas,
 * not derived from the implementation (no circular testing).
 *
 * References:
 *   Kirpich (1940), California Culverts (1942), Témez (1978),
 *   Giandotti (1934), Ventura-Heras, Passini.
 */

import { describe, it, expect } from 'vitest';
import { calculateAllTc, TC_FORMULA_LIST } from '../tc-formulas';
import type { TcInputs, TcFormulaKey } from '../tc-formulas';

const STD_INPUTS: TcInputs = {
  L_m: 2500,
  L_km: 2.5,
  S: 0.006,
  A_km2: 5,
  H_m: 30,
  Hm_m: 100,
};

function get(results: ReturnType<typeof calculateAllTc>, key: TcFormulaKey) {
  return results.find((r) => r.formula === key);
}

describe('Kirpich formula: Tc = 0.0195·L^0.77·S^-0.385 [min]', () => {
  it('matches hand-calculated value for L=2500m, S=0.006', () => {
    // 0.0195 * 2500^0.77 * 0.006^-0.385 / 60  ≈ 0.9620 hr
    const r = get(calculateAllTc(STD_INPUTS, ['kirpich']), 'kirpich');
    expect(r).toBeDefined();
    expect(r!.tcHours).toBeCloseTo(0.9620, 2);
    expect(r!.tcMinutes).toBeGreaterThan(0);
    expect(r!.tcMinutes).toBeCloseTo(57.72, 0);
  });

  it('returns Tc in minutes via tcMinutes field', () => {
    const r = get(calculateAllTc(STD_INPUTS, ['kirpich']), 'kirpich');
    expect(r!.tcMinutes).toBeCloseTo(r!.tcHours * 60, 1);
  });

  it('is omitted when slope = 0 (guard, not Infinity)', () => {
    const r = get(calculateAllTc({ ...STD_INPUTS, S: 0 }, ['kirpich']), 'kirpich');
    expect(r).toBeUndefined();
  });
});

describe('Témez formula: Tc = 0.3·(L/S^0.25)^0.76 [hr]', () => {
  it('matches hand-calculated value for L=2.5 km, S=0.006', () => {
    // 0.3 * (2.5 / 0.006^0.25)^0.76  ≈ 1.591 hr
    const r = get(calculateAllTc(STD_INPUTS, ['temez']), 'temez');
    expect(r!.tcHours).toBeCloseTo(1.591, 2);
  });

  it('scales monotonically with length', () => {
    const a = get(calculateAllTc({ ...STD_INPUTS, L_km: 1 }, ['temez']), 'temez')!;
    const b = get(calculateAllTc({ ...STD_INPUTS, L_km: 5 }, ['temez']), 'temez')!;
    expect(b.tcHours).toBeGreaterThan(a.tcHours);
  });
});

describe('California Culverts formula: Tc = 57·(L^3/H)^0.385 [min]', () => {
  it('matches hand-calculated value for L=2.5 km, H=30 m', () => {
    // 57 * (2.5^3 / 30)^0.385  ≈ 44.34 min  →  0.739 hr
    const r = get(calculateAllTc(STD_INPUTS, ['california']), 'california');
    expect(r!.tcHours).toBeCloseTo(0.739, 2);
    expect(r!.tcMinutes).toBeCloseTo(44.3, 0);
  });

  it('is omitted without H_m', () => {
    const r = get(calculateAllTc({ ...STD_INPUTS, H_m: undefined }, ['california']), 'california');
    expect(r).toBeUndefined();
  });
});

describe('Giandotti formula: Tc = (4√A + 1.5L)/(0.8√Hm) [hr]', () => {
  it('matches hand-calculated value for A=5, L=2.5, Hm=100', () => {
    // (4*√5 + 1.5*2.5) / (0.8*√100) = 12.6944 / 8 ≈ 1.5868 hr
    const r = get(calculateAllTc(STD_INPUTS, ['giandotti']), 'giandotti');
    expect(r!.tcHours).toBeCloseTo(1.5868, 2);
  });

  it('is omitted without Hm_m', () => {
    const r = get(calculateAllTc({ ...STD_INPUTS, Hm_m: undefined }, ['giandotti']), 'giandotti');
    expect(r).toBeUndefined();
  });
});

// AUDIT-001 resuelto: α corregido de 0.3 (USCE) a 0.05 (Ventura-Heras).
// Referencia: Vélez & Gutiérrez (2011), Dyna 78(165):58–66.
// 0.05 × √(5/0.006) = 0.05 × 28.8675 ≈ 1.443 hr
describe('Ventura-Heras formula: Tc = 0.05·√(A/S) [hr]', () => {
  it('matches hand-calculated value for A=5, S=0.006', () => {
    // 0.05 * √(5/0.006) = 0.05 * 28.8675 = 1.4434 hr
    const r = get(calculateAllTc(STD_INPUTS, ['ventura_heras']), 'ventura_heras');
    expect(r!.tcHours).toBeCloseTo(1.443, 2);
  });
});

describe('Passini formula: Tc = 0.108·(A·L)^(1/3)/√S [hr]', () => {
  it('matches hand-calculated value for A=5, L=2.5, S=0.006', () => {
    // 0.108 * (12.5)^(1/3) / √0.006 = 0.108 * 2.3208 / 0.07746 ≈ 3.236 hr
    const r = get(calculateAllTc(STD_INPUTS, ['passini']), 'passini');
    expect(r!.tcHours).toBeCloseTo(3.236, 2);
  });
});

describe('calculateAllTc orchestrator', () => {
  it('returns all 6 formulas when inputs are sufficient', () => {
    const results = calculateAllTc(STD_INPUTS);
    expect(results).toHaveLength(TC_FORMULA_LIST.length);
    for (const r of results) {
      expect(r.tcMinutes).toBeGreaterThan(0);
      expect(Number.isFinite(r.tcMinutes)).toBe(true);
      expect(Number.isFinite(r.tcHours)).toBe(true);
    }
  });

  it('only returns requested subset when formulas arg is passed', () => {
    const results = calculateAllTc(STD_INPUTS, ['kirpich', 'temez']);
    expect(results.map((r) => r.formula).sort()).toEqual(['kirpich', 'temez']);
  });

  it('handles very small basin (0.01 km², L=50m) without NaN', () => {
    const r = calculateAllTc({
      L_m: 50, L_km: 0.05, S: 0.01, A_km2: 0.01, H_m: 2, Hm_m: 5,
    });
    expect(r.length).toBeGreaterThan(0);
    for (const x of r) {
      expect(Number.isFinite(x.tcMinutes)).toBe(true);
      expect(x.tcMinutes).toBeGreaterThan(0);
    }
  });

  it('handles very large basin (10000 km²) without Infinity', () => {
    const r = calculateAllTc({
      L_m: 100000, L_km: 100, S: 0.002, A_km2: 10000, H_m: 500, Hm_m: 300,
    });
    expect(r.length).toBeGreaterThan(0);
    for (const x of r) {
      expect(Number.isFinite(x.tcMinutes)).toBe(true);
      expect(x.tcMinutes).toBeGreaterThan(0);
      expect(x.tcMinutes).toBeLessThan(1e7);
    }
  });

  it('drops formulas with zero/negative S gracefully', () => {
    const r = calculateAllTc({ ...STD_INPUTS, S: 0 });
    // Ventura, Témez, Kirpich, Passini all need S > 0 — only Giandotti + California remain
    const keys = r.map((x) => x.formula).sort();
    expect(keys).toEqual(['california', 'giandotti']);
  });

  it('produces measurable dispersion across formulas', () => {
    const r = calculateAllTc(STD_INPUTS);
    const tcs = r.map((x) => x.tcMinutes);
    const min = Math.min(...tcs);
    const max = Math.max(...tcs);
    expect(max).toBeGreaterThan(min);
  });
});
