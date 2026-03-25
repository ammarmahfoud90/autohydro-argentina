import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { HydrologyResult, HydrologyInput, CNSensitivityPoint } from '../../types';
import { interpretResults, generateReport, generateDocxReport, generateExcelReport, calculateHydrology } from '../../services/api';

const RISK_STYLES: Record<string, string> = {
  muy_bajo: 'bg-green-100 text-green-800 border-green-300',
  bajo: 'bg-lime-100 text-lime-800 border-lime-300',
  moderado: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  alto: 'bg-orange-100 text-orange-800 border-orange-300',
  muy_alto: 'bg-red-100 text-red-800 border-red-300',
};

interface Props {
  results: HydrologyResult;
  formData: HydrologyInput;
  basinPolygon?: [number, number][];
  onBack: () => void;
  onNewCalculation: () => void;
}

function Metric({
  label,
  value,
  highlight = false,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={`rounded-lg p-3 text-center ${
        highlight ? 'bg-blue-600 text-white' : 'bg-gray-50 border border-gray-200'
      }`}
    >
      <div className={`text-xs mb-1 ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>
        {label}
      </div>
      <div
        className={`font-bold text-lg leading-tight ${
          highlight ? 'text-white' : 'text-gray-800'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className={`text-xs mt-0.5 ${highlight ? 'text-blue-200' : 'text-gray-400'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

type CompareState = 'idle' | 'form' | 'loading' | 'done';

const RETURN_PERIODS = [2, 5, 10, 25, 50, 100, 200, 500, 1000];

export function ResultsPanel({ results, formData, basinPolygon, onBack, onNewCalculation }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Scenario comparison
  const [compareState, setCompareState] = useState<CompareState>('idle');
  const [returnPeriod2, setReturnPeriod2] = useState<number>(
    RETURN_PERIODS.find((t) => t > results.return_period) ?? results.return_period * 2,
  );
  const [cnOverride2, setCnOverride2] = useState<string>('');
  const [cOverride2, setCOverride2] = useState<string>(
    results.runoff_coeff != null ? String(results.runoff_coeff) : '',
  );
  const [results2, setResults2] = useState<HydrologyResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  // AI interpretation — fires automatically when the panel mounts
  const interpretQuery = useQuery({
    queryKey: ['interpret', results.peak_flow_m3s, results.city, results.return_period],
    queryFn: () => interpretResults(results, formData.language || 'es'),
    retry: false,
    staleTime: Infinity,
  });

  // CN sensitivity chart data
  const sensitivityChartData = (results.cn_sensitivity ?? []).map((s: CNSensitivityPoint) => ({
    label: `${s.label} (${s.cn.toFixed(0)})`,
    flow: s.peak_flow_m3s,
    isBase: s.label === 'CN',
  }));

  // Bar chart data
  const chartData = results.method_comparison.map((m) => ({
    name: m.methodName.replace(/^Método\s+/i, '').replace(/^Method\s+/i, ''),
    flow: parseFloat(m.peakFlow.toFixed(3)),
    isSelected: m.method === results.method,
  }));

  async function handleDownloadReport() {
    setIsDownloading(true);
    setReportError(null);
    try {
      const blob = await generateReport(results, {
        projectName: formData.project_name || 'Análisis Hidrológico',
        location: formData.location_description || results.city,
        clientName: formData.client_name || undefined,
        language: formData.language || 'es',
        aiInterpretation: interpretQuery.data?.interpretation,
        basinPolygon,
        comparisonData: results2,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autohydro_${results.city.replace(/\s+/g, '_')}_T${results.return_period}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setReportError(t('errors.reportFailed'));
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDownloadDocx() {
    setIsDownloadingDocx(true);
    setReportError(null);
    try {
      const blob = await generateDocxReport(results, {
        projectName: formData.project_name || 'Análisis Hidrológico',
        location: formData.location_description || results.city,
        clientName: formData.client_name || undefined,
        language: formData.language || 'es',
        aiInterpretation: interpretQuery.data?.interpretation,
        basinPolygon,
        comparisonData: results2,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autohydro_${results.city.replace(/\s+/g, '_')}_T${results.return_period}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setReportError('Error al generar el Word. Intente nuevamente.');
    } finally {
      setIsDownloadingDocx(false);
    }
  }

  async function handleDownloadExcel() {
    setIsDownloadingExcel(true);
    setReportError(null);
    try {
      const blob = await generateExcelReport(results, {
        projectName: formData.project_name || 'Análisis Hidrológico',
        location: formData.location_description || results.city,
        clientName: formData.client_name || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autohydro_${results.city.replace(/\s+/g, '_')}_T${results.return_period}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setReportError('Error al generar el Excel. Intente nuevamente.');
    } finally {
      setIsDownloadingExcel(false);
    }
  }

  async function handleRunComparison() {
    setCompareState('loading');
    setCompareError(null);
    try {
      const payload = {
        ...formData,
        return_period: returnPeriod2,
        cn_override:
          formData.method === 'scs_cn' && cnOverride2.trim() !== ''
            ? parseFloat(cnOverride2)
            : null,
        runoff_coeff:
          formData.method !== 'scs_cn' && cOverride2.trim() !== ''
            ? parseFloat(cOverride2)
            : formData.runoff_coeff,
      };
      const r2 = await calculateHydrology(payload);
      setResults2(r2);
      setCompareState('done');
      setTimeout(() => compareRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: unknown) {
      setCompareError(err instanceof Error ? err.message : 'Error al calcular el escenario 2.');
      setCompareState('form');
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Summary ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t('results.title')}</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Metric
            label={t('results.peakFlow')}
            value={`${results.peak_flow_m3s.toFixed(3)} m³/s`}
            highlight
          />
          <Metric
            label={t('results.intensity')}
            value={`${results.intensity_mm_hr.toFixed(1)} mm/hr`}
          />
          <Metric
            label={t('results.tcValue')}
            value={`${results.tc_adopted_minutes.toFixed(0)} min`}
          />
          <Metric
            label={t('results.specificFlow')}
            value={results.specific_flow_m3s_km2.toFixed(3)}
            sub="m³/s/km²"
          />
        </div>

        {/* Risk badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${
            RISK_STYLES[results.risk_level]
          }`}
        >
          {t('results.riskLevel')}: {t(`risk.${results.risk_level}`)}
        </div>

        {/* Info row */}
        <div className="mt-4 text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">{results.city}</span>
            {results.province ? `, ${results.province}` : ''} — T={results.return_period}{' '}
            {t('common.years')}, t={results.duration_min} {t('common.minutes')}
          </p>
          <p>
            {t('common.source')}: {results.idf_source}
          </p>
          {results.cn != null && (
            <p>
              CN = {results.cn.toFixed(1)}
              {results.s_mm != null ? ` | S = ${results.s_mm.toFixed(1)} mm` : ''}
              {results.ia_mm != null ? ` | Ia = ${results.ia_mm.toFixed(1)} mm` : ''}
            </p>
          )}
          {results.runoff_coeff != null && <p>C = {results.runoff_coeff.toFixed(2)}</p>}
          {results.areal_reduction_k != null && (
            <p>K (reducción areal) = {results.areal_reduction_k.toFixed(3)}</p>
          )}
        </div>
      </div>

      {/* ── Scenario Comparison trigger ──────────────────────────────────── */}
      {compareState === 'idle' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCompareState('form')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-400 text-violet-700 text-sm font-semibold hover:bg-violet-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Comparar con otro escenario
          </button>
        </div>
      )}

      {/* ── Scenario Comparison form ──────────────────────────────────────── */}
      {(compareState === 'form' || compareState === 'loading') && (
        <div className="bg-white rounded-xl shadow-sm border border-violet-200 p-6">
          <h3 className="font-semibold text-violet-800 mb-1">Escenario de Comparación</h3>
          <p className="text-xs text-gray-500 mb-4">
            Modificá los parámetros del segundo escenario. El resto de los datos de la cuenca se
            mantienen iguales.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Período de retorno (T)
              </label>
              <select
                value={returnPeriod2}
                onChange={(e) => setReturnPeriod2(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {RETURN_PERIODS.filter((tp) => tp !== results.return_period).map((tp) => (
                  <option key={tp} value={tp}>
                    T = {tp} años
                  </option>
                ))}
              </select>
            </div>

            {formData.method === 'scs_cn' ? (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  CN alternativo (opcional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={cnOverride2}
                  onChange={(e) => setCnOverride2(e.target.value)}
                  placeholder={`CN base = ${results.cn?.toFixed(1) ?? '—'}`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Dejar vacío para usar los mismos usos de suelo
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Coeficiente C alternativo
                </label>
                <input
                  type="number"
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  value={cOverride2}
                  onChange={(e) => setCOverride2(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            )}
          </div>

          {compareError && (
            <p className="text-sm text-red-600 mb-3">{compareError}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRunComparison}
              disabled={compareState === 'loading'}
              className="px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {compareState === 'loading' ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Calculando...
                </>
              ) : (
                'Calcular escenario 2'
              )}
            </button>
            <button
              type="button"
              onClick={() => { setCompareState('idle'); setResults2(null); }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Scenario Comparison results ───────────────────────────────────── */}
      {compareState === 'done' && results2 && (() => {
        const r1 = results;
        const r2 = results2;
        const pctDiff = (a: number, b: number) => {
          if (a === 0) return '—';
          const d = (b - a) / Math.abs(a) * 100;
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
        };
        const compRows: [string, string, string, string][] = [
          ['T (años)', String(r1.return_period), String(r2.return_period), '—'],
          ['Método', r1.method, r2.method, '—'],
          ['i (mm/hr)', r1.intensity_mm_hr.toFixed(1), r2.intensity_mm_hr.toFixed(1),
            pctDiff(r1.intensity_mm_hr, r2.intensity_mm_hr)],
          ['Tc (min)', r1.tc_adopted_minutes.toFixed(1), r2.tc_adopted_minutes.toFixed(1),
            pctDiff(r1.tc_adopted_minutes, r2.tc_adopted_minutes)],
          ['Q pico (m³/s)', r1.peak_flow_m3s.toFixed(3), r2.peak_flow_m3s.toFixed(3),
            pctDiff(r1.peak_flow_m3s, r2.peak_flow_m3s)],
          ['q (m³/s/km²)', r1.specific_flow_m3s_km2.toFixed(4), r2.specific_flow_m3s_km2.toFixed(4),
            pctDiff(r1.specific_flow_m3s_km2, r2.specific_flow_m3s_km2)],
          ['Riesgo', r1.risk_level.replace(/_/g, ' '), r2.risk_level.replace(/_/g, ' '), '—'],
        ];
        if (r1.cn != null) {
          compRows.splice(2, 0, [
            'CN',
            r1.cn.toFixed(1),
            (r2.cn ?? r1.cn).toFixed(1),
            pctDiff(r1.cn, r2.cn ?? r1.cn),
          ]);
        }
        if (r1.runoff_coeff != null) {
          compRows.splice(2, 0, [
            'C (escorrentía)',
            r1.runoff_coeff.toFixed(3),
            (r2.runoff_coeff ?? r1.runoff_coeff).toFixed(3),
            pctDiff(r1.runoff_coeff, r2.runoff_coeff ?? r1.runoff_coeff),
          ]);
        }

        const barData = [
          { name: `Esc. 1 (T=${r1.return_period})`, flow: r1.peak_flow_m3s },
          { name: `Esc. 2 (T=${r2.return_period})`, flow: r2.peak_flow_m3s },
        ];

        return (
          <div ref={compareRef} className="bg-white rounded-xl shadow-sm border border-violet-200 p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-violet-800">Comparación de Escenarios</h3>
              <button
                type="button"
                onClick={() => { setCompareState('form'); setResults2(null); }}
                className="text-xs text-violet-500 hover:text-violet-700 underline"
              >
                Modificar
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Escenario 1: T={r1.return_period} años (base) vs. Escenario 2: T={r2.return_period} años
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-gray-700">
                  <thead>
                    <tr className="bg-violet-50 border-b border-violet-200">
                      <th className="text-left py-2 px-2 font-semibold text-violet-700">Parámetro</th>
                      <th className="text-right py-2 px-2 font-semibold text-violet-700">Esc. 1</th>
                      <th className="text-right py-2 px-2 font-semibold text-violet-700">Esc. 2</th>
                      <th className="text-right py-2 px-2 font-semibold text-violet-700">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compRows.map(([param, v1, v2, diff], idx) => {
                      const isQRow = param.startsWith('Q pico');
                      const diffNum = parseFloat(diff);
                      const diffColor = isNaN(diffNum) ? 'text-gray-400'
                        : diffNum > 0 ? 'text-orange-600 font-semibold'
                        : diffNum < 0 ? 'text-blue-600 font-semibold'
                        : 'text-gray-400';
                      return (
                        <tr key={idx} className={`border-b border-gray-50 ${isQRow ? 'bg-violet-50 font-semibold' : ''}`}>
                          <td className="py-1.5 px-2">{param}</td>
                          <td className="text-right py-1.5 px-2">{v1}</td>
                          <td className="text-right py-1.5 px-2">{v2}</td>
                          <td className={`text-right py-1.5 px-2 ${diffColor}`}>{diff}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bar chart */}
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v: number) => v.toFixed(2)} tick={{ fontSize: 10 }}
                    label={{ value: 'm³/s', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} m³/s`, 'Q pico']} />
                  <Bar dataKey="flow" radius={[4, 4, 0, 0]}>
                    <Cell fill="#7c3aed" />
                    <Cell fill="#a78bfa" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* ── Method comparison ────────────────────────────────────────────── */}
      {results.method_comparison.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-1">{t('results.methodComparison')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('results.comparisonDisclaimer')}</p>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v: number) => v.toFixed(2)}
                tick={{ fontSize: 11 }}
                label={{
                  value: 'm³/s',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10 },
                }}
              />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} m³/s`, 'Caudal pico']} />
              <Bar dataKey="flow" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isSelected ? '#2563eb' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-700">
                    {t('common.method')}
                  </th>
                  <th className="text-right py-1.5 font-medium text-gray-700">Q (m³/s)</th>
                  <th className="text-right py-1.5 font-medium text-gray-700">Tc (min)</th>
                  <th className="text-right py-1.5 font-medium text-gray-700">i (mm/hr)</th>
                  <th className="text-left py-1.5 font-medium text-gray-700 pl-3">
                    {t('common.notes')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.method_comparison.map((m) => (
                  <tr
                    key={m.method}
                    className={`border-b border-gray-50 ${
                      m.method === results.method ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-1.5 pr-2">
                      {m.methodName}
                      {m.method === results.method && (
                        <span className="ml-1.5 text-blue-600 text-[10px]">★</span>
                      )}
                    </td>
                    <td className="text-right py-1.5">{m.peakFlow.toFixed(3)}</td>
                    <td className="text-right py-1.5">{(m.tc * 60).toFixed(0)}</td>
                    <td className="text-right py-1.5">{m.intensity.toFixed(1)}</td>
                    <td className="pl-3 py-1.5 text-gray-400 text-[10px]">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tc comparison table ──────────────────────────────────────────── */}
      {results.tc_results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-3">{t('results.tcComparison')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-700">Fórmula</th>
                  <th className="text-right py-2 font-medium text-gray-700">Tc (hr)</th>
                  <th className="text-right py-2 font-medium text-gray-700">Tc (min)</th>
                  <th className="text-left py-2 font-medium text-gray-700 pl-3">
                    Aplicabilidad
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.tc_results.map((tc) => (
                  <tr key={tc.formula} className="border-b border-gray-50">
                    <td className="py-2 pr-2 font-medium">{tc.formulaName}</td>
                    <td className="text-right py-2">{tc.tcHours.toFixed(3)}</td>
                    <td className="text-right py-2">{tc.tcMinutes.toFixed(1)}</td>
                    <td className="pl-3 py-2 text-gray-400">{tc.applicability}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold text-blue-700">
                  <td className="py-2 pr-2">{t('results.tcAdopted')} (promedio)</td>
                  <td className="text-right py-2">{results.tc_adopted_hours.toFixed(3)}</td>
                  <td className="text-right py-2">{results.tc_adopted_minutes.toFixed(1)}</td>
                  <td className="pl-3 py-2" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CN Sensitivity Analysis ──────────────────────────────────────────── */}
      {results.method === 'scs_cn' && results.cn_sensitivity && results.cn_sensitivity.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-1">Análisis de Sensibilidad — CN</h3>
          <p className="text-xs text-gray-500 mb-4">
            Este análisis muestra cómo varía el caudal pico ante cambios de ±5 unidades en el
            Número de Curva. Esto refleja la incertidumbre inherente en la estimación del CN.
          </p>

          <ResponsiveContainer width="100%" height={150}>
            <BarChart
              data={sensitivityChartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v: number) => v.toFixed(2)}
                tick={{ fontSize: 11 }}
                label={{
                  value: 'm³/s',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10 },
                }}
              />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} m³/s`, 'Caudal pico']} />
              <Bar dataKey="flow" radius={[4, 4, 0, 0]}>
                {sensitivityChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isBase ? '#2563eb' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-700">CN</th>
                  <th className="text-right py-1.5 font-medium text-gray-700">Q (m³/s)</th>
                  <th className="text-right py-1.5 font-medium text-gray-700">Variación</th>
                </tr>
              </thead>
              <tbody>
                {results.cn_sensitivity.map((s) => (
                  <tr
                    key={s.label}
                    className={`border-b border-gray-50 ${
                      s.label === 'CN' ? 'bg-blue-50 font-semibold text-blue-800' : ''
                    }`}
                  >
                    <td className="py-1.5 pr-2">
                      {s.label} ({s.cn.toFixed(0)})
                    </td>
                    <td className="text-right py-1.5">{s.peak_flow_m3s.toFixed(3)}</td>
                    <td
                      className={`text-right py-1.5 font-medium ${
                        s.label === 'CN'
                          ? 'text-gray-400'
                          : s.variation_pct < 0
                          ? 'text-blue-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {s.label === 'CN'
                        ? 'Base'
                        : `${s.variation_pct > 0 ? '+' : ''}${s.variation_pct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SCS Unit Hydrograph ──────────────────────────────────────────── */}
      {results.method === 'scs_cn' &&
        results.hydrograph_times &&
        results.hydrograph_flows &&
        results.hydrograph_times.length > 0 && (() => {
          const Tp = results.time_to_peak_hr ?? 0;
          const hyData = results.hydrograph_times!.map((t, i) => ({
            t: parseFloat(t.toFixed(3)),
            q: parseFloat(results.hydrograph_flows![i].toFixed(4)),
          }));
          const peakIdx = results.hydrograph_flows!.indexOf(
            Math.max(...results.hydrograph_flows!)
          );
          const peakT = results.hydrograph_times![peakIdx];
          const peakQ = results.hydrograph_flows![peakIdx];

          return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 mb-1">Hidrograma de Escorrentía</h3>
              <p className="text-xs text-gray-500 mb-4">
                El hidrograma muestra la variación temporal del caudal durante el evento de
                tormenta. El volumen total de escorrentía es el área bajo la curva.
                Basado en el Hidrograma Unitario Adimensional SCS (USDA-SCS, 1986).
              </p>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Caudal pico (Qp)', value: `${peakQ.toFixed(3)} m³/s` },
                  { label: 'Tiempo al pico (Tp)', value: `${Tp.toFixed(2)} hr` },
                  {
                    label: 'Tiempo base (Tb)',
                    value: `${(results.base_time_hr ?? 0).toFixed(2)} hr`,
                  },
                  {
                    label: 'Volumen de escorrentía',
                    value:
                      (results.runoff_volume_m3 ?? 0) >= 1000
                        ? `${((results.runoff_volume_m3 ?? 0) / 1000).toFixed(1)} × 10³ m³`
                        : `${(results.runoff_volume_m3 ?? 0).toFixed(0)} m³`,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg p-3 text-center bg-blue-50 border border-blue-100"
                  >
                    <div className="text-xs text-blue-500 mb-1">{label}</div>
                    <div className="font-bold text-sm text-blue-800">{value}</div>
                  </div>
                ))}
              </div>

              {/* Area chart */}
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hyData} margin={{ top: 10, right: 20, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="hyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={[0, 'dataMax']}
                    tickFormatter={(v: number) => v.toFixed(1)}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Tiempo (hr)', position: 'insideBottom', offset: -2, style: { fontSize: 11 } }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => v.toFixed(2)}
                    tick={{ fontSize: 11 }}
                    label={{
                      value: 'Q (m³/s)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 10 },
                    }}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(4)} m³/s`, 'Caudal']}
                    labelFormatter={(l) => `t = ${Number(l).toFixed(3)} hr`}
                  />
                  <ReferenceLine
                    x={peakT}
                    stroke="#2563eb"
                    strokeDasharray="4 2"
                    label={{
                      value: `Tp = ${Tp.toFixed(2)} hr`,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#2563eb',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="q"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#hyGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#1d4ed8' }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Time-flow table (sampled every ~0.5 Tp) */}
              <details className="mt-4">
                <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                  Ver tabla de valores (t vs Q)
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs text-gray-600">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-1.5 font-medium text-gray-700 pr-4">t (hr)</th>
                        <th className="text-right py-1.5 font-medium text-gray-700 pr-4">t/Tp</th>
                        <th className="text-right py-1.5 font-medium text-gray-700">Q (m³/s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hyData.map(({ t, q }, i) => (
                        <tr
                          key={i}
                          className={`border-b border-gray-50 ${
                            i === peakIdx ? 'bg-blue-50 font-semibold text-blue-800' : ''
                          }`}
                        >
                          <td className="text-right py-1 pr-4">{t.toFixed(3)}</td>
                          <td className="text-right py-1 pr-4">
                            {Tp > 0 ? (t / Tp).toFixed(2) : '—'}
                          </td>
                          <td className="text-right py-1">{q.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          );
        })()}

      {/* ── Recommendations ──────────────────────────────────────────────── */}
      {results.risk_recommendations && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-3">{t('results.recommendations')}</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-700">Situación: </span>
              {results.risk_recommendations.general}
            </p>
            <p>
              <span className="font-medium text-gray-700">Acción: </span>
              {results.risk_recommendations.action}
            </p>
            <p>
              <span className="font-medium text-gray-700">Verificaciones: </span>
              {results.risk_recommendations.verification}
            </p>
            {results.risk_recommendations.period_note && (
              <p className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5">
                {results.risk_recommendations.period_note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── AI Interpretation ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-3">{t('results.aiInterpretation')}</h3>

        {interpretQuery.isPending && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            {t('results.aiLoading')}
          </div>
        )}

        {interpretQuery.isError && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {t('errors.interpretationFailed')}
          </p>
        )}

        {interpretQuery.data && (
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {interpretQuery.data.interpretation}
          </div>
        )}
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-xs text-yellow-700">
        {t('results.disclaimer')}
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        {reportError && <p className="text-sm text-red-600 mb-3">{reportError}</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t('common.back')}
          </button>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="px-5 py-2 rounded-lg border border-blue-500 text-blue-600 text-sm font-semibold hover:bg-blue-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  {t('results.generatingReport')}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                  {t('results.generateReport')}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isDownloadingDocx}
              className="px-5 py-2 rounded-lg border border-indigo-500 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isDownloadingDocx ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Generando Word...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Descargar en Word (.docx)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isDownloadingExcel}
              className="px-5 py-2 rounded-lg border border-green-500 text-green-700 text-sm font-semibold hover:bg-green-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isDownloadingExcel ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generando Excel...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 10h18M3 14h18M10 3v18M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
                  </svg>
                  Descargar Excel (.xlsx)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/calculadora/alcantarilla', {
                  state: { flow: results.peak_flow_m3s },
                })
              }
              className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Dimensionar alcantarilla
            </button>

            <button
              type="button"
              onClick={onNewCalculation}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('results.newCalculation')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
