export interface CalculationHistoryEntry {
  id: string;
  timestamp: string;
  locality_id: string;
  locality_name: string;
  province: string;
  return_period: number;
  duration_min: number;
  area_km2: number;
  peak_flow_m3s: number;
  intensity_mm_hr: number;
  method: string;
  tc_min: number;
  risk_level: string;
  input_params?: Record<string, unknown>;
}

const STORAGE_KEY = 'autohydro-calculation-history';
const MAX_ENTRIES = 10;

export function useCalculationHistory() {
  const getHistory = (): CalculationHistoryEntry[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CalculationHistoryEntry[]) : [];
    } catch {
      return [];
    }
  };

  const saveCalculation = (data: Omit<CalculationHistoryEntry, 'id' | 'timestamp'>) => {
    try {
      const entry: CalculationHistoryEntry = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      const updated = [entry, ...getHistory()].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // silent fail — storage may be full or unavailable
    }
  };

  const deleteEntry = (id: string) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(getHistory().filter((e) => e.id !== id))
      );
    } catch {
      // silent fail
    }
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silent fail
    }
  };

  return { getHistory, saveCalculation, deleteEntry, clearHistory };
}
