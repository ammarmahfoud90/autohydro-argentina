import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const BASE = import.meta.env.VITE_API_URL ?? '';

const CITIES = [
  'Buenos Aires', 'Catamarca', 'Córdoba', 'Corrientes', 'Formosa',
  'Jujuy', 'La Plata', 'La Rioja', 'Mar del Plata', 'Mendoza',
  'Neuquén', 'Paraná', 'Posadas', 'Rawson', 'Resistencia',
  'Rosario', 'Salta', 'San Juan', 'San Luis', 'San Miguel de Tucumán',
  'Santa Fe', 'Santa Rosa', 'Santiago del Estero', 'Ushuaia', 'Viedma',
];

const RETURN_PERIODS = [2, 5, 10, 25, 50, 100];
const LINE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface IDFResult {
  city: string;
  zona_climatica: string;
  source: string;
  method: string;
  B_parameter: number;
  durations_min: number[];
  return_periods: number[];
  idf_table: Record<string, number[]>;
  pmd_data: Record<string, number | null>;
  warnings: string[];
}

function formatDuration(d: number): string {
  if (d < 60) return `${d} min`;
  if (d < 1440) return `${d / 60} h`;
  return '24 h';
}

export function PMDEstimator() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [result, setResult] = useState<IDFResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function estimate() {
    if (!city) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${BASE}/api/pmd/estimate/${encodeURIComponent(city)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data: IDFResult = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  function useInCalculator() {
    if (!result) return;
    navigate('/calculadora', {
      state: {
        manualIDF: {
          source: `Atlas PMD INA-CIRSA — ${result.city}`,
          table: result.idf_table,
          durations: result.durations_min,
          returnPeriods: result.return_periods,
          isEstimate: true,
        },
      },
    });
  }

  // Build chart data: one point per duration, series per TR
  const chartData = result
    ? result.durations_min.map((d, i) => {
        const point: Record<string, number | string> = { duration: d, label: formatDuration(d) };
        for (const tr of result.return_periods) {
          const vals = result.idf_table[String(tr)];
          if (vals) point[`TR${tr}`] = vals[i];
        }
        return point;
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Estimación IDF Nacional — Atlas PMD
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Cobertura para 25 ciudades argentinas · INA-CIRSA/UNC (2020) + Modelo DIT
          </p>
        </div>

        {/* Warning — always visible */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-2xl shrink-0">⚠️</span>
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-lg">
                Estimación basada en datos diarios — No datos pluviográficos
              </h3>
              <p className="text-amber-700 dark:text-amber-400 mt-1 text-sm">
                Estos resultados se derivan del{' '}
                <strong>Atlas de Precipitaciones Máximas Diarias (PMD)</strong>{' '}
                del INA-CIRSA/UNC (2020) mediante el Modelo DIT de desagregación temporal.
                Son estimaciones orientativas para zonas sin datos pluviográficos verificados.
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-1 text-sm font-medium">
                Para diseños definitivos: verificar con estudios pluviométricos
                locales y normativas provinciales vigentes.
              </p>
            </div>
          </div>
        </div>

        {/* City selector */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">
            Seleccionar ciudad
          </h2>
          <div className="flex gap-3">
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">— Seleccionar ciudad —</option>
              {CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={estimate}
              disabled={!city || loading}
              className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              Estimar curvas IDF
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {result && (
          <>
            {/* Info strip */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 px-5 py-3 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-slate-400">Ciudad: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{result.city}</span>
              </div>
              <div>
                <span className="text-slate-400">Zona: </span>
                <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{result.zona_climatica}</span>
              </div>
              <div>
                <span className="text-slate-400">B regional: </span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{result.B_parameter}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-600">
                  Estimación PMD
                </span>
              </div>
            </div>

            {/* PMD table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
                Precipitación Máxima Diaria (PMD) por período de retorno
              </h3>
              <div className="overflow-x-auto">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {RETURN_PERIODS.map(tr => (
                        <th key={tr} className="pb-2 px-3 text-center font-medium text-slate-500 dark:text-slate-400">
                          TR {tr} años
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {RETURN_PERIODS.map(tr => (
                        <td key={tr} className="py-2 px-3 text-center font-semibold text-amber-700 dark:text-amber-300">
                          {result.pmd_data[String(tr)] ?? '—'} mm
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* IDF Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
                Curvas IDF estimadas (mm/h)
              </h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="pb-2 pr-4 text-left font-medium">Duración</th>
                      {RETURN_PERIODS.map(tr => (
                        <th key={tr} className="pb-2 px-2 text-center font-medium">TR {tr}a</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {result.durations_min.map((d, i) => (
                      <tr key={d} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-1.5 pr-4 text-slate-600 dark:text-slate-300 font-medium">
                          {formatDuration(d)}
                        </td>
                        {RETURN_PERIODS.map(tr => {
                          const vals = result.idf_table[String(tr)];
                          return (
                            <td key={tr} className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-300">
                              {vals ? vals[i].toFixed(1) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* IDF Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">
                Curvas IDF — {result.city}
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Duración', position: 'insideBottom', offset: -2, fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{ value: 'i (mm/h)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        typeof value === 'number' ? `${value.toFixed(1)} mm/h` : '—',
                        name,
                      ]}
                    />
                    <Legend />
                    {result.return_periods.map((tr, idx) => (
                      <Line
                        key={tr}
                        type="monotone"
                        dataKey={`TR${tr}`}
                        name={`TR ${tr} años`}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Warnings */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Advertencias metodológicas
              </p>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={useInCalculator}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Usar estos datos en la calculadora
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
