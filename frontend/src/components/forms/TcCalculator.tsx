import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import {
  TC_FORMULA_LIST,
  calculateAllTc,
} from '../../constants/tc-formulas';
import type { TcFormulaKey } from '../../types';

interface Props {
  selectedFormulas: TcFormulaKey[];
  adoptedFormula?: TcFormulaKey | null;
  basinData: {
    area_km2: number;
    length_km: number;
    slope: number;
    elevation_diff_m: number | null;
    avg_elevation_m: number | null;
  };
  onChange: (formulas: TcFormulaKey[]) => void;
  onAdoptedChange?: (formula: TcFormulaKey) => void;
}

export function TcCalculator({ selectedFormulas, adoptedFormula, basinData, onChange, onAdoptedChange }: Props) {
  const { t } = useTranslation();

  const { area_km2, length_km, slope, elevation_diff_m, avg_elevation_m } = basinData;
  const hasBasin = area_km2 > 0 && length_km > 0 && slope > 0;

  // Real-time Tc preview
  const tcResults = useMemo(() => {
    if (!hasBasin) return [];
    return calculateAllTc(
      {
        L_m: length_km * 1000,
        L_km: length_km,
        S: slope,
        A_km2: area_km2,
        H_m: elevation_diff_m ?? undefined,
        Hm_m: avg_elevation_m ?? undefined,
      },
      selectedFormulas,
    );
  }, [area_km2, length_km, slope, elevation_diff_m, avg_elevation_m, selectedFormulas]);

  function toggleFormula(key: TcFormulaKey) {
    if (selectedFormulas.includes(key)) {
      if (selectedFormulas.length === 1) return; // keep at least one
      if (key === adoptedFormula) return; // can't remove the adopted formula
      onChange(selectedFormulas.filter((f) => f !== key));
    } else {
      onChange([...selectedFormulas, key]);
    }
  }

  // Determine which formulas can be computed with current inputs
  const canCompute = (key: TcFormulaKey): boolean => {
    if (!hasBasin) return false;
    if (key === 'california') return !!elevation_diff_m && elevation_diff_m > 0;
    if (key === 'giandotti') return !!avg_elevation_m && avg_elevation_m > 0;
    return true;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('calculator.tcFormulas')} <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">{t('calculator.tcInfo')}</p>
      </div>

      {/* Formula checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TC_FORMULA_LIST.map((f) => {
          const computable = canCompute(f.key);
          const selected = selectedFormulas.includes(f.key);

          return (
            <button
              key={f.key}
              type="button"
              onClick={() => computable && toggleFormula(f.key)}
              disabled={!computable}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                selected && computable
                  ? 'border-blue-600 bg-blue-50'
                  : computable
                  ? 'border-gray-200 hover:border-blue-300'
                  : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    selected && computable
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selected && computable && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${selected ? 'text-blue-700' : 'text-gray-700'}`}>
                    {f.name}
                  </div>
                  <div className="font-mono text-xs text-gray-500 mt-0.5">{f.formula}</div>
                  <div className="text-xs text-gray-400 mt-1 leading-tight truncate">
                    {f.applicability}
                  </div>
                  {!computable && (
                    <div className="text-xs text-orange-500 mt-1">
                      {f.key === 'california' && 'Requiere desnivel total (H)'}
                      {f.key === 'giandotti' && 'Requiere altura media (Hm)'}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Tc results preview */}
      {hasBasin && tcResults.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="px-3 py-2 text-left font-medium">Fórmula</th>
                <th className="px-3 py-2 text-right font-medium">Tc (hr)</th>
                <th className="px-3 py-2 text-right font-medium">Tc (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tcResults.map((r, i) => {
                const isAdopted = r.formula === adoptedFormula;
                return (
                  <tr
                    key={r.formula}
                    className={isAdopted ? 'bg-blue-600 text-white font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {onAdoptedChange && (
                          <input
                            type="radio"
                            name="adopted_tc"
                            checked={isAdopted}
                            onChange={() => onAdoptedChange(r.formula as TcFormulaKey)}
                            className="accent-white cursor-pointer"
                          />
                        )}
                        <span className={isAdopted ? 'text-white' : 'text-gray-700'}>{r.formulaName}</span>
                        {isAdopted && <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded">ADOPTADO</span>}
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${isAdopted ? 'text-white' : 'text-blue-700'}`}>
                      {r.tcHours.toFixed(3)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${isAdopted ? 'text-white' : 'text-blue-700'}`}>
                      {r.tcMinutes.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasBasin && tcResults.length > 0 && onAdoptedChange && (
        <p className="text-xs text-gray-500 mt-1">
          Seleccioná la fórmula adoptada para el diseño usando el selector en la tabla. El Tc adoptado es el que se usa para el cálculo del caudal.
        </p>
      )}

      {!hasBasin && (
        <p className="text-xs text-gray-400 italic text-center py-2">
          Complete los datos de la cuenca para ver una previsualización del Tc.
        </p>
      )}
    </div>
  );
}
