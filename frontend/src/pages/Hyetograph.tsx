import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { generateHyetograph } from '../services/api';
import type { HyetographResult } from '../services/api';
import { IDF_ARGENTINA } from '../constants/idf-data';

// ── Constants ─────────────────────────────────────────────────────────────────

const RETURN_PERIODS = [2, 5, 10, 25, 50, 100];

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '2 horas', value: 120 },
  { label: '3 horas', value: 180 },
  { label: '6 horas', value: 360 },
  { label: '12 horas', value: 720 },
  { label: '24 horas', value: 1440 },
];

const TIME_STEPS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
];

const METHODS = [
  {
    id: 'alternating_blocks',
    label: 'Bloques Alternos',
    desc: 'Método más utilizado en Argentina. Distribuye los bloques de lluvia simétricamente alrededor del pico central.',
    icon: '📊',
  },
  {
    id: 'scs_type_ii',
    label: 'SCS Tipo II',
    desc: 'Distribución adimensional USDA-NRCS para regiones húmedas (NEA, Pampa Húmeda). Pico al 70% de la duración.',
    icon: '🌧',
  },
  {
    id: 'chicago',
    label: 'Chicago (r = 0.4)',
    desc: 'Tormenta asimétrica con pico a 40% de la duración total. Común en estudios urbanos argentinos.',
    icon: '📈',
  },
  {
    id: 'uniform',
    label: 'Uniforme',
    desc: 'Intensidad constante igual al valor IDF para la duración total. Conservador y simple.',
    icon: '➡',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(min: number): string {
  if (min < 60) return `${min}′`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}′`;
}

function downloadCsv(result: HyetographResult) {
  const rows = [
    ['Tiempo (min)', 'Intensidad (mm/hr)', 'Profundidad (mm)', 'Acumulado (mm)'],
    ...result.times_min.map((t, i) => [
      t,
      result.intensities_mm_hr[i].toFixed(2),
      result.depths_mm[i].toFixed(4),
      result.cumulative_mm[i].toFixed(4),
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hietograma_${result.city.replace(/\s+/g, '_')}_T${result.return_period}_${result.method}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {title && <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>}
      {children}
    </div>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
      done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
    }`}>
      {done ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : n}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Hyetograph() {
  const [step, setStep] = useState(0);

  // Step 0: IDF source
  const [city, setCity] = useState('');
  const [returnPeriod, setReturnPeriod] = useState(25);

  // Step 1: Storm parameters
  const [duration, setDuration] = useState(60);
  const [timeStep, setTimeStep] = useState(10);

  // Step 2: Method
  const [method, setMethod] = useState('alternating_blocks');

  // Results
  const [result, setResult] = useState<HyetographResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const data = await generateHyetograph({
        city,
        return_period: returnPeriod,
        duration_min: duration,
        time_step_min: timeStep,
        method,
        r: 0.4,
      });
      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el hietograma.');
    } finally {
      setLoading(false);
    }
  }

  const steps = ['Datos IDF', 'Parámetros', 'Método', 'Resultados'];

  // Chart data
  const chartData = result
    ? result.times_min.map((t, i) => ({
        time: t,
        timeLabel: formatTime(t),
        intensity: result.intensities_mm_hr[i],
        depth: result.depths_mm[i],
        cumulative: result.cumulative_mm[i],
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Generador de Hietogramas</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tormenta de diseño — Distribución temporal de la precipitación
          </p>
        </div>

        {/* Step indicator */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 mb-6 flex items-center gap-0">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <StepDot n={i + 1} active={step === i} done={step > i} />
                <span className={`text-xs font-medium hidden sm:block truncate ${
                  step === i ? 'text-blue-700' : step > i ? 'text-green-600' : 'text-gray-400'
                }`}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > i ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 0: IDF source ──────────────────────────────────────────── */}
        {step === 0 && (
          <Card title="Fuente IDF — Ciudad y período de retorno">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad <span className="text-red-400">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccioná una ciudad —</option>
                  {IDF_ARGENTINA.map((c) => (
                    <option key={c.city} value={c.city}>
                      {c.city} ({c.province})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período de retorno (T)
                </label>
                <div className="flex flex-wrap gap-2">
                  {RETURN_PERIODS.map((T) => (
                    <button
                      key={T}
                      type="button"
                      onClick={() => setReturnPeriod(T)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        returnPeriod === T
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {T} años
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!city}
                  onClick={() => setStep(1)}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar →
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Step 1: Storm parameters ────────────────────────────────────── */}
        {step === 1 && (
          <Card title="Parámetros de la tormenta de diseño">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración total de la tormenta
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDuration(d.value)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        duration === d.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intervalo de tiempo (Δt)
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIME_STEPS.filter((ts) => ts.value <= duration / 4).map((ts) => (
                    <button
                      key={ts.value}
                      type="button"
                      onClick={() => setTimeStep(ts.value)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        timeStep === ts.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {ts.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  n = {Math.floor(duration / timeStep)} intervalos de {timeStep} min
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continuar →
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Step 2: Method ──────────────────────────────────────────────── */}
        {step === 2 && (
          <Card title="Método de distribución temporal">
            <div className="space-y-3">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    method === m.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <div className={`font-semibold text-sm ${method === m.id ? 'text-blue-800' : 'text-gray-800'}`}>
                        {m.label}
                        {m.id === 'alternating_blocks' && (
                          <span className="ml-2 text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                    </div>
                  </div>
                </button>
              ))}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  ← Volver
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generando…
                    </>
                  ) : 'Generar Hietograma →'}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Step 3: Results ─────────────────────────────────────────────── */}
        {step === 3 && result && (
          <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Precipitación total', value: `${result.total_depth_mm.toFixed(1)} mm` },
                { label: 'Intensidad pico', value: `${result.peak_intensity_mm_hr.toFixed(1)} mm/hr` },
                { label: 'Tiempo al pico', value: formatTime(result.peak_time_min) },
                { label: 'Intervalo Δt', value: `${result.time_step_min} min` },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Info badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
              <strong>{result.city}</strong> · T = {result.return_period} años · D = {result.duration_min} min ·
              Método: <strong>{result.method_label}</strong> · Fuente IDF: {result.idf_source}
            </div>

            {/* Hyetograph bar chart */}
            <Card title="Hietograma — Intensidad por intervalo">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fontSize: 9 }}
                    interval="preserveStartEnd"
                    label={{ value: 'Tiempo', position: 'insideBottom', offset: -2, fontSize: 9 }}
                  />
                  <YAxis
                    unit=" mm/hr"
                    tick={{ fontSize: 9 }}
                    width={58}
                    label={{ value: 'i (mm/hr)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 9 }}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(2)} mm/hr`, 'Intensidad']}
                    labelFormatter={(l) => `t = ${l}`}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="intensity" fill="#2563eb" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Cumulative rainfall line chart */}
            <Card title="Precipitación acumulada">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fontSize: 9 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    unit=" mm"
                    tick={{ fontSize: 9 }}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(2)} mm`, 'Acumulado']}
                    labelFormatter={(l) => `t = ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Data table */}
            <Card title="Tabla de datos">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 pr-3 text-gray-600 font-semibold">Tiempo (min)</th>
                      <th className="text-right py-1.5 px-3 text-gray-600 font-semibold">Intensidad (mm/hr)</th>
                      <th className="text-right py-1.5 px-3 text-gray-600 font-semibold">Prof. (mm)</th>
                      <th className="text-right py-1.5 pl-3 text-gray-600 font-semibold">Acum. (mm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.times_min.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-1 pr-3 text-gray-700">{t}</td>
                        <td className="py-1 px-3 text-right tabular-nums font-semibold text-blue-700">
                          {result.intensities_mm_hr[i].toFixed(2)}
                        </td>
                        <td className="py-1 px-3 text-right tabular-nums text-gray-600">
                          {result.depths_mm[i].toFixed(3)}
                        </td>
                        <td className="py-1 pl-3 text-right tabular-nums text-green-700">
                          {result.cumulative_mm[i].toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-between">
              <button
                type="button"
                onClick={() => { setStep(0); setResult(null); }}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Nuevo cálculo
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadCsv(result)}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar CSV
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Hietograma de diseño generado con datos IDF de {result.city} ({result.province}) ·
              Método: {result.method_label}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
