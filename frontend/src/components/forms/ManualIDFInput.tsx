/**
 * ManualIDFInput — Form for entering local IDF data.
 *
 * Two modes:
 *   A) Table of intensities (mm/h) per duration × TR
 *   B) Formula parameters (Talbot 2/3, Sherman, Bernard)
 */

import { useState, useMemo } from 'react';
import type { ManualIDFTable, ManualIDFFormula, IDFFormulaType } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_TR_OPTIONS = [2, 5, 10, 25, 50, 100];
const ALL_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360];
const PREVIEW_DURATIONS = [15, 30, 60, 120];

const FORMULA_OPTIONS: { value: IDFFormulaType; label: string; params: string[] }[] = [
  { value: 'talbot3', label: 'Talbot 3 parámetros:  I = A / (t + B)^C', params: ['A', 'B', 'C'] },
  { value: 'talbot2', label: 'Talbot 2 parámetros:  I = A / (t + B)', params: ['A', 'B'] },
  { value: 'sherman', label: 'Sherman:  I = a · t^(−n)', params: ['a', 'n'] },
  { value: 'bernard', label: 'Bernard:  I = k / t^e', params: ['k', 'e'] },
];

// ── Formula evaluation ────────────────────────────────────────────────────────

function applyFormula(
  type: IDFFormulaType,
  params: Record<string, number>,
  t: number,
): number | null {
  try {
    if (type === 'talbot3') return params.A / Math.pow(t + params.B, params.C);
    if (type === 'talbot2') return params.A / (t + params.B);
    if (type === 'sherman') return params.a * Math.pow(t, -params.n);
    if (type === 'bernard') return params.k / Math.pow(t, params.e);
  } catch {
    // fall through
  }
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onConfirm: (table: ManualIDFTable | null, formula: ManualIDFFormula | null) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ManualIDFInput({ onConfirm }: Props) {
  const [tab, setTab] = useState<'table' | 'formula'>('table');

  // ── Table tab state ──────────────────────────────────────────────────────
  const [selectedTRs, setSelectedTRs] = useState<number[]>([10, 25]);
  const [selectedDurations, setSelectedDurations] = useState<number[]>([15, 30, 60, 120]);
  // cellValues[trIndex][durIndex] = string value entered
  const [cellValues, setCellValues] = useState<Record<string, Record<string, string>>>({});
  const [tableSource, setTableSource] = useState('');
  const [tableErrors, setTableErrors] = useState<string[]>([]);
  const [tableWarnings, setTableWarnings] = useState<string[]>([]);

  // ── Formula tab state ────────────────────────────────────────────────────
  const [formulaType, setFormulaType] = useState<IDFFormulaType>('talbot3');
  const [formulaTRs, setFormulaTRs] = useState<number[]>([10, 25]);
  // paramValues[trIndex][paramName] = string value
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({});
  const [formulaSource, setFormulaSource] = useState('');
  const [formulaErrors, setFormulaErrors] = useState<string[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function toggleTR(list: number[], setList: (v: number[]) => void, tr: number) {
    if (list.includes(tr)) {
      if (list.length > 2) setList(list.filter((t) => t !== tr));
    } else {
      setList([...list, tr].sort((a, b) => a - b));
    }
  }

  function toggleDuration(dur: number) {
    if (selectedDurations.includes(dur)) {
      if (selectedDurations.length > 3) {
        setSelectedDurations(selectedDurations.filter((d) => d !== dur));
      }
    } else {
      setSelectedDurations([...selectedDurations, dur].sort((a, b) => a - b));
    }
  }

  function setCellValue(trIdx: string, durIdx: string, value: string) {
    setCellValues((prev) => ({
      ...prev,
      [trIdx]: { ...(prev[trIdx] ?? {}), [durIdx]: value },
    }));
  }

  function setParamValue(trIdx: string, param: string, value: string) {
    setParamValues((prev) => ({
      ...prev,
      [trIdx]: { ...(prev[trIdx] ?? {}), [param]: value },
    }));
  }

  // ── Client-side validation (table) ────────────────────────────────────────

  function validateTableLocally(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!tableSource.trim()) errors.push('La fuente de los datos es obligatoria.');

    // Collect numeric values
    const grid: number[][] = [];
    for (let i = 0; i < selectedTRs.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < selectedDurations.length; j++) {
        const raw = cellValues[String(i)]?.[String(j)] ?? '';
        const num = parseFloat(raw);
        if (isNaN(num) || num <= 0) {
          errors.push(
            `TR=${selectedTRs[i]} años, ${selectedDurations[j]} min: valor inválido o vacío.`,
          );
          row.push(NaN);
        } else {
          row.push(num);
        }
      }
      grid.push(row);
    }

    if (errors.length > 0) return { errors, warnings };

    // Monotonicity checks
    for (let i = 0; i < selectedTRs.length; i++) {
      for (let j = 0; j < selectedDurations.length - 1; j++) {
        if (grid[i][j] <= grid[i][j + 1]) {
          warnings.push(
            `TR=${selectedTRs[i]} años: la intensidad debe decrecer al aumentar la duración ` +
              `(${selectedDurations[j]} min → ${selectedDurations[j + 1]} min).`,
          );
        }
      }
    }
    for (let j = 0; j < selectedDurations.length; j++) {
      for (let i = 0; i < selectedTRs.length - 1; i++) {
        if (grid[i][j] >= grid[i + 1][j]) {
          warnings.push(
            `${selectedDurations[j]} min: la intensidad debe crecer al aumentar el TR ` +
              `(${selectedTRs[i]} → ${selectedTRs[i + 1]} años).`,
          );
        }
      }
    }

    return { errors, warnings };
  }

  function handleConfirmTable() {
    const { errors, warnings } = validateTableLocally();
    setTableErrors(errors);
    setTableWarnings(warnings);
    if (errors.length > 0) return;

    const intensities: number[][] = selectedTRs.map((_, i) =>
      selectedDurations.map((_, j) => parseFloat(cellValues[String(i)]?.[String(j)] ?? '0')),
    );

    const table: ManualIDFTable = {
      durations_min: selectedDurations.map(Number),
      return_periods_years: selectedTRs,
      intensities_mm_hr: intensities,
      source: tableSource.trim(),
    };
    onConfirm(table, null);
  }

  // ── Client-side validation (formula) ──────────────────────────────────────

  function validateFormulaLocally(): string[] {
    const errors: string[] = [];
    if (!formulaSource.trim()) errors.push('La fuente de los datos es obligatoria.');

    const fDef = FORMULA_OPTIONS.find((f) => f.value === formulaType)!;
    for (const tr of formulaTRs) {
      for (const param of fDef.params) {
        const raw = paramValues[String(tr)]?.[param] ?? '';
        const num = parseFloat(raw);
        if (isNaN(num)) {
          errors.push(`TR=${tr} años — parámetro "${param}" inválido o vacío.`);
        }
      }
    }
    return errors;
  }

  function handleConfirmFormula() {
    const errors = validateFormulaLocally();
    setFormulaErrors(errors);
    if (errors.length > 0) return;

    const fDef = FORMULA_OPTIONS.find((f) => f.value === formulaType)!;
    const byTR: ManualIDFFormula['parameters_by_tr'] = {};
    for (const tr of formulaTRs) {
      byTR[String(tr)] = Object.fromEntries(
        fDef.params.map((p) => [p, parseFloat(paramValues[String(tr)]?.[p] ?? '0')]),
      );
    }

    const formula: ManualIDFFormula = {
      formula_type: formulaType,
      parameters_by_tr: byTR,
      source: formulaSource.trim(),
    };
    onConfirm(null, formula);
  }

  // ── Formula preview data ──────────────────────────────────────────────────

  const fDef = FORMULA_OPTIONS.find((f) => f.value === formulaType)!;
  const previewData = useMemo(() => {
    return PREVIEW_DURATIONS.map((dur) => {
      const row: Record<string, string> = { dur: String(dur) };
      for (const tr of formulaTRs) {
        const rawParams = paramValues[String(tr)] ?? {};
        const numericParams: Record<string, number> = {};
        let allFilled = true;
        for (const p of fDef.params) {
          const v = parseFloat(rawParams[p] ?? '');
          if (isNaN(v)) { allFilled = false; break; }
          numericParams[p] = v;
        }
        if (allFilled) {
          const I = applyFormula(formulaType, numericParams, dur);
          row[String(tr)] = I != null && I > 0 ? I.toFixed(1) : '—';
        } else {
          row[String(tr)] = '—';
        }
      }
      return row;
    });
  }, [formulaType, formulaTRs, paramValues, fDef.params]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 mt-5">

      {/* ── Responsibility disclaimer (non-dismissable) ── */}
      <div className="rounded-lg border border-amber-400 bg-amber-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm">
            <p className="font-bold text-amber-900">
              Datos IDF propios — Responsabilidad del usuario
            </p>
            <p className="mt-1 text-amber-800">
              Los datos IDF que ingrese a continuación <strong>NO han sido verificados por AutoHydro</strong>.
              La validez, precisión y aplicabilidad de estos datos es responsabilidad exclusiva del
              profesional a cargo del estudio.
            </p>
            <p className="mt-2 text-amber-800">Se recomienda ingresar datos provenientes de:</p>
            <ul className="mt-1 ml-4 list-disc text-amber-800 space-y-0.5">
              <li>Resoluciones oficiales de organismos provinciales de recursos hídricos</li>
              <li>Estudios del INA (Instituto Nacional del Agua)</li>
              <li>Papers arbitrados publicados en revistas científicas</li>
              <li>Informes técnicos de universidades nacionales</li>
            </ul>
            <p className="mt-2 text-amber-700 text-xs italic">
              AutoHydro no se hace responsable por resultados obtenidos con datos no verificados.
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab selector ── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('table')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'table' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Opción A: Tabla IDF
        </button>
        <button
          type="button"
          onClick={() => setTab('formula')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'formula' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Opción B: Parámetros de fórmula
        </button>
      </div>

      {/* ────────────────── TAB A: TABLE ────────────────── */}
      {tab === 'table' && (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">
            Ingresá las intensidades (mm/h) para las combinaciones de duración y período de retorno que tenés disponibles.
          </p>

          {/* TR checkboxes */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Períodos de retorno disponibles{' '}
              <span className="font-normal text-gray-500">(mínimo 2)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_TR_OPTIONS.map((tr) => (
                <label key={tr} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTRs.includes(tr)}
                    onChange={() => toggleTR(selectedTRs, setSelectedTRs, tr)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{tr} años</span>
                </label>
              ))}
            </div>
          </div>

          {/* Duration checkboxes */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Duraciones disponibles{' '}
              <span className="font-normal text-gray-500">(mínimo 3)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_DURATION_OPTIONS.map((d) => (
                <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDurations.includes(d)}
                    onChange={() => toggleDuration(d)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{d} min</span>
                </label>
              ))}
            </div>
          </div>

          {/* Intensity grid */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Intensidades (mm/h)
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse min-w-full">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-left font-medium text-gray-700">
                      Duración (min)
                    </th>
                    {selectedTRs.map((tr) => (
                      <th key={tr} className="border border-gray-300 bg-blue-50 px-2 py-1.5 text-center font-medium text-blue-800 min-w-[80px]">
                        TR={tr} años
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedDurations.map((dur, j) => (
                    <tr key={dur} className={j % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-2 py-1 font-medium text-gray-700">
                        {dur}
                      </td>
                      {selectedTRs.map((_, i) => (
                        <td key={i} className="border border-gray-300 p-0">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={cellValues[String(i)]?.[String(j)] ?? ''}
                            onChange={(e) => setCellValue(String(i), String(j), e.target.value)}
                            placeholder="mm/h"
                            className="w-full px-2 py-1 text-center focus:outline-none focus:bg-blue-50 bg-transparent"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fuente de los datos <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tableSource}
              onChange={(e) => setTableSource(e.target.value)}
              placeholder='Ej: "Resolución DH-034/2019, Dirección de Hidráulica de Mendoza"'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Errors */}
          {tableErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
              {tableErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {/* Warnings */}
          {tableWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
              <p className="font-medium">Advertencias (los datos se aceptan, pero verifique):</p>
              {tableWarnings.map((w, i) => <p key={i} className="text-xs">• {w}</p>)}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmTable}
            className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Confirmar tabla IDF
          </button>
        </div>
      )}

      {/* ────────────────── TAB B: FORMULA ────────────────── */}
      {tab === 'formula' && (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">
            Ingresá los parámetros de la fórmula IDF ajustada para tu zona de estudio.
          </p>

          {/* Formula type selector */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Tipo de fórmula</p>
            <div className="space-y-2">
              {FORMULA_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="formulaType"
                    value={opt.value}
                    checked={formulaType === opt.value}
                    onChange={() => setFormulaType(opt.value)}
                    className="border-gray-300"
                  />
                  <span className="text-sm font-mono text-gray-800">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* TR checkboxes */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Períodos de retorno disponibles{' '}
              <span className="font-normal text-gray-500">(mínimo 2)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_TR_OPTIONS.map((tr) => (
                <label key={tr} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formulaTRs.includes(tr)}
                    onChange={() => toggleTR(formulaTRs, setFormulaTRs, tr)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{tr} años</span>
                </label>
              ))}
            </div>
          </div>

          {/* Parameter table */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Parámetros por período de retorno
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse min-w-full">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 px-3 py-1.5 text-left font-medium text-gray-700">
                      TR (años)
                    </th>
                    {fDef.params.map((p) => (
                      <th key={p} className="border border-gray-300 bg-blue-50 px-3 py-1.5 text-center font-medium text-blue-800 min-w-[90px]">
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formulaTRs.map((tr, i) => (
                    <tr key={tr} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-1 font-medium text-gray-700">
                        {tr}
                      </td>
                      {fDef.params.map((p) => (
                        <td key={p} className="border border-gray-300 p-0">
                          <input
                            type="number"
                            step="any"
                            value={paramValues[String(tr)]?.[p] ?? ''}
                            onChange={(e) => setParamValue(String(tr), p, e.target.value)}
                            placeholder={p}
                            className="w-full px-2 py-1 text-center focus:outline-none focus:bg-blue-50 bg-transparent"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview table */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Vista previa de intensidades calculadas (mm/h)
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse min-w-full">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 px-3 py-1.5 text-left font-medium text-gray-700">
                      Duración (min)
                    </th>
                    {formulaTRs.map((tr) => (
                      <th key={tr} className="border border-gray-300 bg-green-50 px-3 py-1.5 text-center font-medium text-green-800 min-w-[80px]">
                        TR={tr} años
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, j) => (
                    <tr key={j} className={j % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-1 font-medium text-gray-700">
                        {row.dur}
                      </td>
                      {formulaTRs.map((tr) => (
                        <td key={tr} className={`border border-gray-300 px-3 py-1 text-center ${row[String(tr)] === '—' ? 'text-gray-400' : 'text-gray-800'}`}>
                          {row[String(tr)]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Verificá que los valores tengan sentido antes de continuar.
            </p>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fuente de los datos <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formulaSource}
              onChange={(e) => setFormulaSource(e.target.value)}
              placeholder='Ej: "Tabla 3.2, Estudio INA-CRA 2009, provincia de Córdoba"'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Errors */}
          {formulaErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-1">
              {formulaErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmFormula}
            className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Confirmar parámetros IDF
          </button>
        </div>
      )}
    </div>
  );
}
