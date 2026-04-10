import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const BASE = import.meta.env.VITE_API_URL ?? '';

interface RoutingResult {
  method: string;
  parameters: { K: number; X: number; dt: number };
  coefficients: { C0: number; C1: number; C2: number };
  stability: {
    stable: boolean;
    condition: string;
    lower_bound: number;
    upper_bound: number;
    recommendation: string;
  };
  inflow: { time: number; flow: number }[];
  outflow: { time: number; flow: number }[];
  results: {
    Q_peak_in: number;
    Q_peak_out: number;
    attenuation_pct: number;
    lag_hours: number;
    t_peak_in: number;
    t_peak_out: number;
  };
}

interface CungeParams {
  K_hours: number;
  X: number;
  celerity_ms: number;
  velocity_ms: number;
  depth_m: number;
  note: string;
}

type InputMode = 'paste' | 'manual';
type ParamTab = 'direct' | 'cunge';

interface Row {
  time: string;
  flow: string;
}

function parseHydrograph(text: string): { times: number[]; flows: number[] } | null {
  const lines = text.trim().split(/\n/);
  const times: number[] = [];
  const flows: number[] = [];
  for (const line of lines) {
    const cols = line.trim().split(/[\t;,]+/);
    if (cols.length < 2) return null;
    const t = parseFloat(cols[0].replace(',', '.'));
    const q = parseFloat(cols[1].replace(',', '.'));
    if (isNaN(t) || isNaN(q)) return null;
    times.push(t);
    flows.push(q);
  }
  if (times.length < 3) return null;
  return { times, flows };
}

export function FloodRouting() {
  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [pasteText, setPasteText] = useState('');
  const [rows, setRows] = useState<Row[]>([
    { time: '0', flow: '0' },
    { time: '1', flow: '' },
    { time: '2', flow: '' },
  ]);
  const [parseError, setParseError] = useState('');
  const [pointCount, setPointCount] = useState(0);

  // Parameters
  const [paramTab, setParamTab] = useState<ParamTab>('direct');
  const [K, setK] = useState('');
  const [X, setX] = useState('0.2');
  const [Qinitial, setQinitial] = useState('0');

  // Muskingum-Cunge
  const [mcQref, setMcQref] = useState('');
  const [mcB, setMcB] = useState('');
  const [mcS, setMcS] = useState('');
  const [mcN, setMcN] = useState('0.04');
  const [mcDx, setMcDx] = useState('');
  const [cungeResult, setCungeResult] = useState<CungeParams | null>(null);
  const [cungeLoading, setCungeLoading] = useState(false);
  const [cungeError, setCungeError] = useState('');

  // Results
  const [result, setResult] = useState<RoutingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Copy
  const [copyToast, setCopyToast] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const copyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (copyDropdownRef.current && !copyDropdownRef.current.contains(e.target as Node)) {
        setCopyOpen(false);
      }
    }
    if (copyOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [copyOpen]);

  // Re-validate paste text
  useEffect(() => {
    if (inputMode === 'paste') {
      if (!pasteText.trim()) {
        setParseError('');
        setPointCount(0);
        return;
      }
      const parsed = parseHydrograph(pasteText);
      if (!parsed) {
        setParseError('Formato inválido. Use dos columnas: tiempo (h) y caudal (m³/s), separadas por tab o punto y coma.');
        setPointCount(0);
      } else {
        setParseError('');
        setPointCount(parsed.times.length);
      }
    }
  }, [pasteText, inputMode]);

  // Re-validate manual rows
  useEffect(() => {
    if (inputMode === 'manual') {
      const valid = rows.filter(r => r.time !== '' && r.flow !== '' && !isNaN(parseFloat(r.time)) && !isNaN(parseFloat(r.flow)));
      setPointCount(valid.length);
      setParseError(valid.length < 3 ? 'Se necesitan al menos 3 puntos válidos.' : '');
    }
  }, [rows, inputMode]);

  function getHydrograph(): { times: number[]; flows: number[] } | null {
    if (inputMode === 'paste') {
      return parseHydrograph(pasteText);
    }
    const times: number[] = [];
    const flows: number[] = [];
    for (const r of rows) {
      if (r.time === '' || r.flow === '') continue;
      const t = parseFloat(r.time);
      const q = parseFloat(r.flow);
      if (!isNaN(t) && !isNaN(q)) { times.push(t); flows.push(q); }
    }
    if (times.length < 3) return null;
    return { times, flows };
  }

  function updateRow(i: number, field: keyof Row, val: string) {
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      // Auto-add row when editing last
      if (i === prev.length - 1 && val !== '') next.push({ time: '', flow: '' });
      return next;
    });
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  async function calcCunge() {
    setCungeLoading(true);
    setCungeError('');
    try {
      const res = await fetch(`${BASE}/api/routing/muskingum-cunge-params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Q_ref: parseFloat(mcQref),
          B: parseFloat(mcB),
          S: parseFloat(mcS),
          n: parseFloat(mcN),
          dx: parseFloat(mcDx),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data: CungeParams = await res.json();
      setCungeResult(data);
      setK(String(data.K_hours));
      setX(String(data.X));
      setParamTab('direct');
    } catch (e: unknown) {
      setCungeError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setCungeLoading(false);
    }
  }

  async function calculate() {
    setError('');
    const hydro = getHydrograph();
    if (!hydro) { setError('Ingrese un hidrograma válido con al menos 3 puntos.'); return; }
    const Kval = parseFloat(K);
    const Xval = parseFloat(X);
    if (isNaN(Kval) || Kval <= 0) { setError('K debe ser un número positivo.'); return; }
    if (isNaN(Xval) || Xval < 0 || Xval > 0.5) { setError('X debe estar entre 0 y 0.5.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/routing/muskingum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inflow: hydro.flows,
          times: hydro.times,
          K: Kval,
          X: Xval,
          Q_initial: parseFloat(Qinitial) || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data: RoutingResult = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError('');
    setPasteText('');
    setRows([{ time: '0', flow: '0' }, { time: '1', flow: '' }, { time: '2', flow: '' }]);
    setK('');
    setX('0.2');
    setQinitial('0');
    setCungeResult(null);
    setParseError('');
    setPointCount(0);
  }

  function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2500);
      });
    } else {
      window.prompt('Copiar:', text);
    }
    setCopyOpen(false);
  }

  function generateCSV(): string {
    if (!result) return '';
    const header = 'Tiempo (h),Q entrada (m³/s),Q salida (m³/s)';
    const rows = result.inflow.map((p, i) =>
      `${p.time},${p.flow.toFixed(3)},${result.outflow[i].flow.toFixed(3)}`
    );
    return [header, ...rows].join('\n');
  }

  function generateMarkdown(): string {
    if (!result) return '';
    const header = '| Tiempo (h) | Q entrada (m³/s) | Q salida (m³/s) |';
    const sep = '|---|---|---|';
    const rows = result.inflow.map((p, i) =>
      `| ${p.time} | ${p.flow.toFixed(3)} | ${result.outflow[i].flow.toFixed(3)} |`
    );
    return [header, sep, ...rows].join('\n');
  }

  // Chart data
  const chartData = result
    ? result.inflow.map((p, i) => ({
        time: p.time,
        entrada: p.flow,
        salida: result.outflow[i].flow,
      }))
    : [];

  const xVal = parseFloat(X) || 0.2;
  const kVal = parseFloat(K) || 0;
  const dtVal = result?.parameters.dt ?? 1;
  const stability = kVal > 0
    ? {
        lower: 2 * kVal * xVal,
        upper: 2 * kVal * (1 - xVal),
        dt: dtVal,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-10 px-4">
      <Helmet>
        <title>Tránsito de Crecidas Muskingum — AutoHydro Argentina</title>
        <meta name="description" content="Propagación de hidrogramas mediante método Muskingum y Muskingum-Cunge." />
      </Helmet>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Tránsito de Crecidas
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Método Muskingum y Muskingum-Cunge — propagación de hidrogramas en canal
          </p>
        </div>

        {!result ? (
          <>
            {/* ── Sección 1: Hidrograma de entrada ── */}
            <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              <h2 className="font-semibold text-slate-700 dark:text-slate-200">
                1. Hidrograma de entrada
              </h2>

              <div className="flex gap-2">
                {(['paste', 'manual'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInputMode(m)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      inputMode === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {m === 'paste' ? 'Pegar desde Excel' : 'Ingresar manualmente'}
                  </button>
                ))}
              </div>

              {inputMode === 'paste' ? (
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Pegue dos columnas: <strong>tiempo (h)</strong> y <strong>caudal (m³/s)</strong>, separadas por tab o punto y coma.
                  </p>
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={"0\t0\n1\t45.3\n2\t123.7\n3\t200.0"}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-slate-700 dark:text-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
                    <span className="text-xs font-medium text-slate-500">Tiempo (h)</span>
                    <span className="text-xs font-medium text-slate-500">Caudal (m³/s)</span>
                    <span />
                  </div>
                  {rows.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <input
                        type="number"
                        value={row.time}
                        onChange={e => updateRow(i, 'time', e.target.value)}
                        placeholder="0"
                        className="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={row.flow}
                        onChange={e => updateRow(i, 'flow', e.target.value)}
                        placeholder="0.0"
                        className="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {rows.length > 3 ? (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : <span />}
                    </div>
                  ))}
                </div>
              )}

              {parseError && (
                <p className="text-sm text-red-500">{parseError}</p>
              )}
              {pointCount > 0 && !parseError && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✓ {pointCount} puntos válidos
                </p>
              )}

              {/* Preview chart */}
              {pointCount >= 3 && !parseError && (() => {
                const h = getHydrograph();
                if (!h) return null;
                const previewData = h.times.map((t, i) => ({ time: t, flow: h.flows[i] }));
                return (
                  <div className="h-36" role="img" aria-label="Vista previa del hidrograma de entrada">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={previewData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} label={{ value: 'h', position: 'insideRight', offset: 0, fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="flow" stroke="#3b82f6" strokeWidth={2} dot={false} name="Q entrada" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </section>

            {/* ── Sección 2: Parámetros ── */}
            <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
              <h2 className="font-semibold text-slate-700 dark:text-slate-200">
                2. Parámetros del tramo
              </h2>

              <div className="flex gap-2">
                {(['direct', 'cunge'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setParamTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      paramTab === t
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {t === 'direct' ? 'Ingresar K y X' : 'Muskingum-Cunge'}
                  </button>
                ))}
              </div>

              {paramTab === 'direct' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      K — tiempo de tránsito (horas)
                    </label>
                    <input
                      type="number"
                      value={K}
                      onChange={e => setK(e.target.value)}
                      placeholder="ej. 12"
                      step="0.1"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      X — ponderación ({parseFloat(X) === 0 ? 'máx. atenuación' : parseFloat(X) === 0.5 ? 'sin atenuación' : `= ${X}`})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={X}
                      onChange={e => setX(e.target.value)}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                      <span>0 (embalse)</span><span className="font-medium text-indigo-600">{X}</span><span>0.5 (canal)</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Q inicial salida (m³/s)
                    </label>
                    <input
                      type="number"
                      value={Qinitial}
                      onChange={e => setQinitial(e.target.value)}
                      placeholder="0"
                      step="0.1"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Longitud Δx (m)', val: mcDx, set: setMcDx, ph: 'ej. 5000' },
                      { label: 'Pendiente S (m/m)', val: mcS, set: setMcS, ph: 'ej. 0.001' },
                      { label: 'Ancho B (m)', val: mcB, set: setMcB, ph: 'ej. 20' },
                      { label: 'Q referencia (m³/s)', val: mcQref, set: setMcQref, ph: 'ej. 100' },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                        <input
                          type="number"
                          value={f.val}
                          onChange={e => f.set(e.target.value)}
                          placeholder={f.ph}
                          step="any"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Manning n</label>
                      <select
                        value={mcN}
                        onChange={e => setMcN(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="0.025">0.025 — Hormigón liso</option>
                        <option value="0.030">0.030 — Canal excavado</option>
                        <option value="0.035">0.035 — Canal natural limpio</option>
                        <option value="0.040">0.040 — Canal natural típico</option>
                        <option value="0.050">0.050 — Canal con vegetación</option>
                        <option value="0.060">0.060 — Canal con obstáculos</option>
                        <option value="0.080">0.080 — Río con llanura</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={calcCunge}
                    disabled={cungeLoading || !mcQref || !mcB || !mcS || !mcDx}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                  >
                    {cungeLoading && (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    Calcular K y X automáticamente
                  </button>
                  {cungeError && <p className="text-sm text-red-500">{cungeError}</p>}
                  {cungeResult && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      {[
                        { label: 'K', val: `${cungeResult.K_hours} h` },
                        { label: 'X', val: cungeResult.X },
                        { label: 'Celeridad', val: `${cungeResult.celerity_ms} m/s` },
                        { label: 'Velocidad', val: `${cungeResult.velocity_ms} m/s` },
                        { label: 'Tirante', val: `${cungeResult.depth_m} m` },
                      ].map(item => (
                        <div key={item.label}>
                          <span className="text-slate-500 dark:text-slate-400">{item.label}: </span>
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300">{item.val}</span>
                        </div>
                      ))}
                      <p className="col-span-full text-xs text-slate-400">{cungeResult.note} → Transferido a Tab K/X.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Stability check */}
              {stability && stability.upper > 0 && pointCount >= 3 && !parseError && (() => {
                const hydro = getHydrograph();
                const dt = hydro && hydro.times.length >= 2 ? hydro.times[1] - hydro.times[0] : null;
                if (!dt) return null;
                const isStable = stability.lower < dt && dt < stability.upper;
                return (
                  <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                    isStable
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    <span>{isStable ? '✓' : '✗'}</span>
                    <span>
                      {isStable
                        ? `Estable: 2KX = ${stability.lower.toFixed(2)} < Δt = ${dt.toFixed(2)} < 2K(1-X) = ${stability.upper.toFixed(2)}`
                        : `Inestable: Δt = ${dt.toFixed(2)} no está en (${stability.lower.toFixed(2)}, ${stability.upper.toFixed(2)})`}
                    </span>
                  </div>
                );
              })()}
            </section>

            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={calculate}
              disabled={loading || pointCount < 3 || !!parseError || !K}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-base transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              Calcular tránsito Muskingum
            </button>
          </>
        ) : (
          /* ── Resultados ── */
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Q pico entrada', val: `${result.results.Q_peak_in.toFixed(2)} m³/s`, sub: `t = ${result.results.t_peak_in} h`, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Q pico salida', val: `${result.results.Q_peak_out.toFixed(2)} m³/s`, sub: `t = ${result.results.t_peak_out} h`, color: 'text-red-600 dark:text-red-400' },
                { label: 'Atenuación', val: `${result.results.attenuation_pct.toFixed(1)} %`, sub: 'reducción del pico', color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Desfase temporal', val: `${result.results.lag_hours.toFixed(2)} h`, sub: 'retardo del pico', color: 'text-indigo-600 dark:text-indigo-400' },
              ].map(k => (
                <div key={k.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Parameters info */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-slate-400">K = </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{result.parameters.K} h</span>
              </div>
              <div>
                <span className="text-slate-400">X = </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{result.parameters.X}</span>
              </div>
              <div>
                <span className="text-slate-400">Δt = </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{result.parameters.dt} h</span>
              </div>
              <div>
                <span className="text-slate-400">C0 = </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{result.coefficients.C0.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-slate-400">C1 = </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{result.coefficients.C1.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-slate-400">C2 = </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{result.coefficients.C2.toFixed(4)}</span>
              </div>
              <div className={result.stability.stable
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'}>
                {result.stability.stable ? '✓ Estable' : '✗ Inestable'}
                <span className="text-xs text-slate-400 ml-1">({result.stability.condition})</span>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">
                Hidrogramas de entrada y salida
              </h3>
              <div className="h-72" role="img" aria-label="Gráfico de hidrogramas de entrada y salida">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="time"
                      label={{ value: 'Tiempo (h)', position: 'insideBottom', offset: -2, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      label={{ value: 'Q (m³/s)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        typeof value === 'number' ? `${value.toFixed(3)} m³/s` : '—',
                        name === 'entrada' ? 'Q entrada' : 'Q salida',
                      ]}
                      labelFormatter={(l) => `t = ${l} h`}
                    />
                    <Legend />
                    <ReferenceLine
                      x={result.results.t_peak_in}
                      stroke="#3b82f6"
                      strokeDasharray="4 4"
                      label={{ value: 'pico in', fontSize: 10, fill: '#3b82f6' }}
                    />
                    <ReferenceLine
                      x={result.results.t_peak_out}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: 'pico out', fontSize: 10, fill: '#ef4444' }}
                    />
                    <Line type="monotone" dataKey="entrada" stroke="#3b82f6" strokeWidth={2} dot={false} name="entrada" />
                    <Line type="monotone" dataKey="salida" stroke="#ef4444" strokeWidth={2} dot={false} name="salida" strokeDasharray="5 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Tabla de tránsito
                </h3>

                <div className="relative" ref={copyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCopyOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {copyOpen && (
                    <div className="absolute right-0 mt-1 w-36 rounded-xl shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => copyText(generateCSV())}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        Copiar como CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(generateMarkdown())}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        Copiar como Markdown
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <th className="pb-2 pr-4">Tiempo (h)</th>
                      <th className="pb-2 pr-4">Q entrada (m³/s)</th>
                      <th className="pb-2">Q salida (m³/s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {result.inflow.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-1.5 pr-4 text-slate-600 dark:text-slate-300">{p.time}</td>
                        <td className="py-1.5 pr-4 font-medium text-blue-700 dark:text-blue-400">{p.flow.toFixed(3)}</td>
                        <td className="py-1.5 font-medium text-red-700 dark:text-red-400">{result.outflow[i].flow.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={reset}
                className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Nuevo análisis
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          ¡Copiado al portapapeles!
        </div>
      )}
    </div>
  );
}
