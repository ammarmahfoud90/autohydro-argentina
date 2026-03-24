import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { HydrologyResult, HydrologyInput, CNSensitivityPoint } from '../../types';
import { interpretResults, generateReport, generateDocxReport } from '../../services/api';

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

export function ResultsPanel({ results, formData, basinPolygon, onBack, onNewCalculation }: Props) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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
