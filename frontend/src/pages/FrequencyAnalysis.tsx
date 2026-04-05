import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyzeFrequency, type FrequencyAnalysisResult } from '../services/api';

const RETURN_PERIODS = [2, 5, 10, 25, 50, 100, 200];

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseFlows(text: string): number[] | string {
  const tokens = text
    .split(/[\n\r,;\t]+/)
    .map((t) => t.trim().replace(',', '.'))
    .filter((t) => t.length > 0);
  const nums: number[] = [];
  for (const t of tokens) {
    const n = parseFloat(t);
    if (isNaN(n)) return `"${t}" no es un número válido`;
    nums.push(n);
  }
  return nums;
}

function generateMarkdownTable(result: FrequencyAnalysisResult, station: string): string {
  const { gumbel, log_pearson_iii, gev } = result.distributions;
  const header = `# Análisis de Frecuencia de Caudales${station ? ` — ${station}` : ''}\n\n`;
  const stats = result.statistics;
  const statLines = [
    `**N:** ${stats.n}  |  **Media:** ${stats.mean.toFixed(1)} m³/s  |  **Desvío:** ${stats.std.toFixed(1)} m³/s  |  **Cv:** ${stats.cv.toFixed(3)}  |  **Asimetría:** ${stats.skewness.toFixed(3)}`,
    '',
    '## Tabla Q(TR)',
    '',
    '| TR (años) | Gumbel EV1 | Log-Pearson III | GEV |',
    '|-----------|-----------|-----------------|-----|',
  ];
  for (const tr of RETURN_PERIODS) {
    const key = String(tr);
    statLines.push(
      `| ${tr} | ${gumbel.quantiles[key]?.toFixed(3) ?? '-'} | ${log_pearson_iii.quantiles[key]?.toFixed(3) ?? '-'} | ${gev.quantiles[key]?.toFixed(3) ?? '-'} |`
    );
  }
  return header + statLines.join('\n');
}

function generateCSVTable(result: FrequencyAnalysisResult, station: string): string {
  const { gumbel, log_pearson_iii, gev } = result.distributions;
  const rows = [
    station ? [`Estación: ${station}`] : [],
    ['"TR (años)"', '"Gumbel EV1 (m³/s)"', '"Log-Pearson III (m³/s)"', '"GEV (m³/s)"'],
    ...RETURN_PERIODS.map((tr) => {
      const key = String(tr);
      return [
        `"${tr}"`,
        `"${gumbel.quantiles[key]?.toFixed(3) ?? ''}"`,
        `"${log_pearson_iii.quantiles[key]?.toFixed(3) ?? ''}"`,
        `"${gev.quantiles[key]?.toFixed(3) ?? ''}"`,
      ];
    }),
  ].filter((r) => r.length > 0);
  return rows.map((r) => r.join(',')).join('\n');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="font-bold text-gray-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FrequencyAnalysis() {
  const [inputMode, setInputMode] = useState<'paste' | 'manual'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [manualRows, setManualRows] = useState<Array<{ year: string; flow: string }>>([
    { year: '', flow: '' },
  ]);
  const [stationName, setStationName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedFlows, setParsedFlows] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<FrequencyAnalysisResult | null>(null);

  const [copyOpen, setCopyOpen] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (copyRef.current && !copyRef.current.contains(e.target as Node)) setCopyOpen(false);
    }
    if (copyOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [copyOpen]);

  // Parse flows when paste text or manual rows change
  useEffect(() => {
    if (inputMode === 'paste') {
      if (!pasteText.trim()) { setParsedFlows([]); setParseError(null); return; }
      const res = parseFlows(pasteText);
      if (typeof res === 'string') { setParseError(res); setParsedFlows([]); }
      else { setParseError(null); setParsedFlows(res); }
    } else {
      const filled = manualRows.filter((r) => r.flow.trim());
      if (!filled.length) { setParsedFlows([]); setParseError(null); return; }
      const nums: number[] = [];
      for (const r of filled) {
        const n = parseFloat(r.flow.replace(',', '.'));
        if (isNaN(n)) { setParseError(`"${r.flow}" no es un número válido`); setParsedFlows([]); return; }
        nums.push(n);
      }
      setParseError(null);
      setParsedFlows(nums);
    }
  }, [inputMode, pasteText, manualRows]);

  async function handleCalculate() {
    if (parsedFlows.length < 5) {
      setApiError('Se necesitan al menos 5 valores.');
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const res = await analyzeFrequency({ flows: parsedFlows, station_name: stationName || undefined });
      setResult(res);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string) {
    setCopyOpen(false);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2500);
      }).catch(() => window.prompt('Copiar:', text));
    } else {
      window.prompt('Copiar:', text);
    }
  }

  // Build chart data: lines for each distribution + scatter for observed
  const chartData = result
    ? RETURN_PERIODS.map((tr) => {
        const key = String(tr);
        return {
          tr,
          gumbel: result.distributions.gumbel.quantiles[key] ?? null,
          lp3: result.distributions.log_pearson_iii.quantiles[key] ?? null,
          gev: result.distributions.gev.quantiles[key] ?? null,
        };
      })
    : [];

  const scatterData = result
    ? result.plotting_positions.map((p) => ({ tr: p.return_period, flow: p.flow }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Helmet>
        <title>Análisis de Frecuencia de Caudales — AutoHydro Argentina</title>
        <meta name="description" content="Ajuste de distribuciones Gumbel EV1, Log-Pearson III y GEV a series históricas de caudales máximos anuales." />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Análisis de Frecuencia de Caudales
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Ajuste de distribuciones Gumbel EV1, Log-Pearson III y GEV a series históricas de caudales máximos anuales.
          </p>
        </div>

        {/* ── Input section ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm mb-6"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Ingreso de datos
          </h2>

          {/* Station name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Estación de aforo (opcional)
            </label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="Ej: Río Paraná en Corrientes"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1 w-fit mb-4">
            <button
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                inputMode === 'paste'
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
              }`}
            >
              Pegar desde Excel
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                inputMode === 'manual'
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
              }`}
            >
              Ingresar manualmente
            </button>
          </div>

          {inputMode === 'paste' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Caudales máximos anuales (m³/s)
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                placeholder={"Pegá los caudales máximos anuales (uno por línea)\nEjemplo:\n245.3\n189.7\n312.4\n..."}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Separar por salto de línea, coma, punto y coma o tab.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 px-1">
                <span className="w-24">Año</span>
                <span>Caudal (m³/s)</span>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {manualRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.year}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i] = { ...updated[i], year: e.target.value };
                        setManualRows(updated);
                      }}
                      placeholder={String(1990 + i)}
                      className="w-24 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={row.flow}
                      onChange={(e) => {
                        const updated = [...manualRows];
                        updated[i] = { ...updated[i], flow: e.target.value };
                        // Auto-add row at end
                        if (i === manualRows.length - 1 && e.target.value) {
                          updated.push({ year: '', flow: '' });
                        }
                        setManualRows(updated);
                      }}
                      placeholder="0.0"
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {manualRows.length > 1 && (
                      <button
                        onClick={() => setManualRows((prev) => prev.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setManualRows((prev) => [...prev, { year: '', flow: '' }])}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Agregar fila
              </button>
            </div>
          )}

          {/* Parse status */}
          {parseError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{parseError}</p>
          )}
          {!parseError && parsedFlows.length > 0 && (
            <p className="mt-2 text-xs text-green-700 dark:text-green-400 font-medium">
              ✓ {parsedFlows.length} valor{parsedFlows.length !== 1 ? 'es' : ''} ingresado{parsedFlows.length !== 1 ? 's' : ''}
            </p>
          )}

          {apiError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{apiError}</p>
          )}

          <button
            onClick={handleCalculate}
            disabled={loading || parsedFlows.length < 5 || !!parseError}
            className="mt-5 w-full sm:w-auto px-8 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Calculando...
              </>
            ) : (
              'Calcular distribuciones'
            )}
          </button>
        </motion.div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Statistics */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">
                Estadísticas descriptivas
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBadge label="N (años)" value={String(result.statistics.n)} />
                <StatBadge label="Media (m³/s)" value={result.statistics.mean.toFixed(2)} />
                <StatBadge label="Desvío estándar" value={result.statistics.std.toFixed(2)} />
                <StatBadge label="Cv" value={result.statistics.cv.toFixed(3)} />
                <StatBadge label="Asimetría" value={result.statistics.skewness.toFixed(3)} />
                <StatBadge label="Mínimo (m³/s)" value={result.statistics.min.toFixed(2)} />
                <StatBadge label="Máximo (m³/s)" value={result.statistics.max.toFixed(2)} />
                <StatBadge label="Mediana (m³/s)" value={result.statistics.median.toFixed(2)} />
              </div>
            </div>

            {/* Q(TR) table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                    Caudales de diseño Q(TR)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Gumbel EV1 recomendado para llanura · Log-Pearson III para ríos de montaña
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">TR (años)</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400">Gumbel EV1</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-green-600 dark:text-green-400">Log-Pearson III</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-orange-600 dark:text-orange-400">GEV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RETURN_PERIODS.map((tr) => {
                      const key = String(tr);
                      const g = result.distributions.gumbel.quantiles[key];
                      const l = result.distributions.log_pearson_iii.quantiles[key];
                      const v = result.distributions.gev.quantiles[key];
                      return (
                        <tr key={tr} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="py-2 px-3 font-semibold text-gray-700 dark:text-slate-300">{tr}</td>
                          <td className="py-2 px-3 text-right font-mono text-blue-700 dark:text-blue-300">
                            {g != null ? g.toFixed(3) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-green-700 dark:text-green-300">
                            {l != null ? l.toFixed(3) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-orange-700 dark:text-orange-300">
                            {v != null ? (v as number).toFixed(3) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="pt-2 px-3 text-xs text-gray-400 dark:text-slate-500">
                        Unidades: m³/s
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Distribution parameters */}
              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Gumbel EV1 — parámetros</p>
                  <p className="text-blue-600 dark:text-blue-400">
                    α = {result.distributions.gumbel.parameters.alpha.toFixed(3)} · u = {result.distributions.gumbel.parameters.u.toFixed(3)}
                  </p>
                  <p className="text-blue-500/70 dark:text-blue-500/60 mt-0.5">{result.distributions.gumbel.method}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-green-700 dark:text-green-300 mb-1">Log-Pearson III — parámetros</p>
                  <p className="text-green-600 dark:text-green-400">
                    μ_log = {result.distributions.log_pearson_iii.parameters.mean_log.toFixed(4)} ·
                    σ_log = {result.distributions.log_pearson_iii.parameters.std_log.toFixed(4)} ·
                    Cs_log = {result.distributions.log_pearson_iii.parameters.skew_log.toFixed(4)}
                  </p>
                  <p className="text-green-500/70 dark:text-green-500/60 mt-0.5">{result.distributions.log_pearson_iii.method}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-orange-700 dark:text-orange-300 mb-1">GEV — parámetros</p>
                  {result.distributions.gev.parameters ? (
                    <p className="text-orange-600 dark:text-orange-400">
                      ξ = {result.distributions.gev.parameters.shape.toFixed(4)} ·
                      μ = {result.distributions.gev.parameters.loc.toFixed(3)} ·
                      σ = {result.distributions.gev.parameters.scale.toFixed(3)}
                    </p>
                  ) : (
                    <p className="text-orange-500/70">No se pudo ajustar</p>
                  )}
                  {result.distributions.gev.parameters && (
                    <p className="text-orange-500/70 dark:text-orange-500/60 mt-0.5">{result.distributions.gev.method}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">
                Gráfico de ajuste
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                Puntos negros: datos observados (posiciones de graficación Gringorten) · Eje X en escala logarítmica
              </p>
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="tr"
                    type="number"
                    scale="log"
                    domain={[1, 300]}
                    tickFormatter={(v) => String(v)}
                    ticks={[2, 5, 10, 25, 50, 100, 200]}
                    label={{ value: 'TR (años)', position: 'insideBottom', offset: -10, fontSize: 12 }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    label={{ value: 'Q (m³/s)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => v.toFixed(0)}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      typeof value === 'number' ? `${value.toFixed(3)} m³/s` : '—',
                      name === 'gumbel' ? 'Gumbel EV1' : name === 'lp3' ? 'Log-Pearson III' : name === 'gev' ? 'GEV' : 'Observado',
                    ]}
                    labelFormatter={(label) => `TR = ${Number(label).toFixed(1)} años`}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'gumbel' ? 'Gumbel EV1' : value === 'lp3' ? 'Log-Pearson III' : value === 'gev' ? 'GEV' : 'Observado'
                    }
                  />
                  <Line
                    data={chartData}
                    dataKey="gumbel"
                    type="monotone"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    name="gumbel"
                  />
                  <Line
                    data={chartData}
                    dataKey="lp3"
                    type="monotone"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    name="lp3"
                  />
                  {result.distributions.gev.parameters && (
                    <Line
                      data={chartData}
                      dataKey="gev"
                      type="monotone"
                      stroke="#ea580c"
                      strokeWidth={2}
                      dot={false}
                      name="gev"
                    />
                  )}
                  <Scatter
                    data={scatterData}
                    dataKey="flow"
                    fill="#111827"
                    name="Observado"
                    line={false}
                    shape="circle"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex flex-wrap gap-3 justify-end">
                {/* Copy dropdown */}
                <div ref={copyRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setCopyOpen((o) => !o)}
                    className="px-5 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar tabla
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {copyOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1.5 z-30">
                      <button
                        type="button"
                        onClick={() => copyText(generateMarkdownTable(result, stationName))}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Copiar como Markdown
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(generateCSVTable(result, stationName))}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
                        </svg>
                        Copiar como CSV
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setResult(null); setPasteText(''); setManualRows([{ year: '', flow: '' }]); setStationName(''); }}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Nuevo análisis
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Copy toast */}
        {copyToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            ¡Copiado al portapapeles!
          </div>
        )}
      </div>
    </div>
  );
}
