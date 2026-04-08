/**
 * Unit tests for SCS Curve Number lookup and composite calculation.
 * Expected values taken from CN_ENTRIES table in cn-tables.ts
 * (which itself derives from USDA NEH-4 / TR-55).
 */

import { describe, it, expect } from 'vitest';
import { calculateCompositeCN, getCNValue, CN_ENTRIES } from '../cn-tables';

describe('getCNValue', () => {
  it('returns N/A value for conditionless entries', () => {
    const entry = CN_ENTRIES.find((e) => e.id === 'zona_comercial_industrial')!;
    expect(getCNValue(entry, 'B')).toBe(92);
    expect(getCNValue(entry, 'D')).toBe(95);
  });
});

describe('calculateCompositeCN', () => {
  it('single category at 100% equals its table value', () => {
    const cn = calculateCompositeCN(
      [{ entryId: 'zona_comercial_industrial', areaPercent: 100 }],
      'B',
    );
    expect(cn).toBe(92);
  });

  it('computes area-weighted average across categories', () => {
    // 50% comercial (B=92) + 50% residencial_alta (B=85) → 88.5
    const cn = calculateCompositeCN(
      [
        { entryId: 'zona_comercial_industrial', areaPercent: 50 },
        { entryId: 'residencial_alta_densidad', areaPercent: 50 },
      ],
      'B',
    );
    expect(cn).toBeCloseTo(88.5, 1);
  });

  it('soil group D generally yields higher CN than A for same category', () => {
    const a = calculateCompositeCN(
      [{ entryId: 'zona_comercial_industrial', areaPercent: 100 }],
      'A',
    );
    const d = calculateCompositeCN(
      [{ entryId: 'zona_comercial_industrial', areaPercent: 100 }],
      'D',
    );
    expect(d).toBeGreaterThan(a);
  });

  it('empty input returns 0 without crashing', () => {
    expect(calculateCompositeCN([], 'B')).toBe(0);
  });

  it('unknown entryId is skipped, remaining weighting is honoured', () => {
    const cn = calculateCompositeCN(
      [
        { entryId: '__does_not_exist__', areaPercent: 50 },
        { entryId: 'zona_comercial_industrial', areaPercent: 50 },
      ],
      'B',
    );
    // Only the valid entry contributes: 92 * 0.5 = 46
    expect(cn).toBeCloseTo(46, 1);
  });
});

describe('SCS runoff S = 25400/CN - 254 (SI units, mm)', () => {
  // These are derived formulas, not in cn-tables.ts, but confirm
  // the relationships make physical sense for the CN values we produce.
  it('CN = 100 ⇒ S = 0 ⇒ all rainfall becomes runoff', () => {
    const CN = 100;
    const S = 25400 / CN - 254;
    expect(S).toBe(0);
  });

  it('CN = 50 ⇒ S ≈ 254 mm', () => {
    const CN = 50;
    const S = 25400 / CN - 254;
    expect(S).toBeCloseTo(254, 0);
  });
});
