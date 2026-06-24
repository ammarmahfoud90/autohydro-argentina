/**
 * Unit tests for hydrateFormFromParams (BUG 4c fix).
 *
 * BUG 4c: navigating to /calculator?method=scs_cn did not pre-select SCS-CN
 * because hydrateFormFromParams returned null when no ?localidad= was present.
 * The fix applies the method param to DEFAULT_FORM even without a locality.
 *
 * Hand-checked expected values: DEFAULT_FORM method is 'rational'; providing
 * ?method=scs_cn should return { ...DEFAULT_FORM, method: 'scs_cn' }.
 */

import { describe, it, expect } from 'vitest';
import { hydrateFormFromParams } from '../Calculator';
import { DEFAULT_FORM } from '../../types';

function makeParams(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

describe('hydrateFormFromParams – BUG 4c: method param without locality', () => {
  it('returns null when no params are present', () => {
    expect(hydrateFormFromParams(makeParams({}))).toBeNull();
  });

  it('returns null when only an invalid method is given', () => {
    expect(hydrateFormFromParams(makeParams({ method: 'unknown_method' }))).toBeNull();
  });

  it('returns null when method equals the default method (no meaningful change)', () => {
    // 'rational' is the DEFAULT_FORM.method — no need to override
    expect(hydrateFormFromParams(makeParams({ method: 'rational' }))).toBeNull();
  });

  it('applies ?method=scs_cn without a locality', () => {
    const result = hydrateFormFromParams(makeParams({ method: 'scs_cn' }));
    expect(result).not.toBeNull();
    expect(result?.method).toBe('scs_cn');
    // All other fields should stay at their defaults
    expect(result?.area_km2).toBe(DEFAULT_FORM.area_km2);
    expect(result?.locality_id).toBe(DEFAULT_FORM.locality_id);
  });

  it('applies ?method=modified_rational without a locality', () => {
    const result = hydrateFormFromParams(makeParams({ method: 'modified_rational' }));
    expect(result).not.toBeNull();
    expect(result?.method).toBe('modified_rational');
  });

  it('full URL params with locality still hydrate all fields', () => {
    const result = hydrateFormFromParams(
      makeParams({
        localidad: 'amgr',
        method: 'scs_cn',
        TR: '25',
        t: '60',
        area: '5.0',
        length: '3.0',
        slope: '0.01',
      }),
    );
    expect(result).not.toBeNull();
    expect(result?.locality_id).toBe('amgr');
    expect(result?.method).toBe('scs_cn');
    expect(result?.return_period).toBe(25);
    expect(result?.duration_min).toBe(60);
    expect(result?.area_km2).toBe(5.0);
    expect(result?.length_km).toBe(3.0);
    expect(result?.slope).toBe(0.01);
  });

  it('returns null when only localidad is absent and method is the default', () => {
    // No override needed — should remain null
    const result = hydrateFormFromParams(makeParams({ TR: '25', t: '60' }));
    expect(result).toBeNull();
  });
});
