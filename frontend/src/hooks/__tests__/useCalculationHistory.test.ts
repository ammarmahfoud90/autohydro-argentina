/**
 * Unit tests for useCalculationHistory — pure localStorage I/O,
 * no React rendering needed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCalculationHistory, type CalculationHistoryEntry } from '../useCalculationHistory';

// Minimal localStorage polyfill (node env doesn't have one)
function installLocalStorage() {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
  // crypto.randomUUID is in Node 18+, but vitest node env may not expose it
  if (!(globalThis as any).crypto?.randomUUID) {
    (globalThis as any).crypto = {
      ...(globalThis as any).crypto,
      randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2),
    };
  }
}

const STORAGE_KEY = 'autohydro-calculation-history';

const SAMPLE: Omit<CalculationHistoryEntry, 'id' | 'timestamp'> = {
  locality_id: 'amgr',
  locality_name: 'AMGR',
  province: 'Chaco',
  return_period: 25,
  duration_min: 60,
  area_km2: 5,
  peak_flow_m3s: 12.3,
  intensity_mm_hr: 80,
  method: 'rational',
  tc_min: 55,
  risk_level: 'moderado',
};

describe('useCalculationHistory', () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
  });

  it('returns empty array when storage is empty', () => {
    const { getHistory } = useCalculationHistory();
    expect(getHistory()).toEqual([]);
  });

  it('saveCalculation adds an entry with id and timestamp', () => {
    const { saveCalculation, getHistory } = useCalculationHistory();
    saveCalculation(SAMPLE);
    const h = getHistory();
    expect(h).toHaveLength(1);
    expect(h[0].id).toBeTruthy();
    expect(h[0].timestamp).toBeTruthy();
    expect(h[0].locality_id).toBe('amgr');
  });

  it('most recent entries go to the front (LIFO display order)', () => {
    const { saveCalculation, getHistory } = useCalculationHistory();
    saveCalculation({ ...SAMPLE, locality_name: 'first' });
    saveCalculation({ ...SAMPLE, locality_name: 'second' });
    const h = getHistory();
    expect(h[0].locality_name).toBe('second');
    expect(h[1].locality_name).toBe('first');
  });

  it('caps storage at 10 entries (FIFO drop of oldest)', () => {
    const { saveCalculation, getHistory } = useCalculationHistory();
    for (let i = 0; i < 12; i++) {
      saveCalculation({ ...SAMPLE, locality_name: `entry-${i}` });
    }
    const h = getHistory();
    expect(h).toHaveLength(10);
    // Newest first; entries 0 and 1 should have been evicted
    expect(h[0].locality_name).toBe('entry-11');
    expect(h.find((e) => e.locality_name === 'entry-0')).toBeUndefined();
    expect(h.find((e) => e.locality_name === 'entry-1')).toBeUndefined();
  });

  it('deleteEntry removes by id', () => {
    const { saveCalculation, getHistory, deleteEntry } = useCalculationHistory();
    saveCalculation(SAMPLE);
    saveCalculation({ ...SAMPLE, locality_name: 'other' });
    const [first] = getHistory();
    deleteEntry(first.id);
    const after = getHistory();
    expect(after).toHaveLength(1);
    expect(after.find((e) => e.id === first.id)).toBeUndefined();
  });

  it('clearHistory empties storage', () => {
    const { saveCalculation, clearHistory, getHistory } = useCalculationHistory();
    saveCalculation(SAMPLE);
    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it('corrupted JSON in storage does not crash', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const { getHistory } = useCalculationHistory();
    expect(getHistory()).toEqual([]);
  });

  it('saveCalculation is a no-op when localStorage throws', () => {
    const { saveCalculation, getHistory } = useCalculationHistory();
    const spy = vi
      .spyOn(localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });
    expect(() => saveCalculation(SAMPLE)).not.toThrow();
    spy.mockRestore();
    expect(getHistory()).toEqual([]);
  });
});
