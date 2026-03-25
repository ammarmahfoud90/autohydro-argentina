import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ChannelType = 'rectangular' | 'trapezoidal' | 'circular' | 'triangular';

interface ManningResult {
  flow_m3s: number;
  velocity_ms: number;
  area_m2: number;
  wetted_perimeter_m: number;
  hydraulic_radius_m: number;
  top_width_m: number | null;
  froude: number | null;
  flow_regime: string;
  flow_regime_label: string;
  warnings: string[];
  design_check: {
    design_flow_m3s: number;
    channel_capacity_m3s: number;
    sufficient: boolean;
    margin_pct: number;
    message: string;
  } | null;
  geometry: Record<string, unknown>;
}

// ── Manning n presets ─────────────────────────────────────────────────────────

const MANNING_PRESETS = [
  { label: 'Hormigón liso', n: 0.013, group: 'Revestidos' },
  { label: 'Hormigón rugoso', n: 0.017, group: 'Revestidos' },
  { label: 'Mampostería con mortero', n: 0.020, group: 'Revestidos' },
  { label: 'Piedra seca', n: 0.030, group: 'Revestidos' },
  { label: 'Tierra limpia', n: 0.025, group: 'Tierra' },
  { label: 'Tierra con grava', n: 0.028, group: 'Tierra' },
  { label: 'Tierra con vegetación', n: 0.040, group: 'Tierra' },
  { label: 'Alcantarilla hormigón', n: 0.013, group: 'Estructuras' },
  { label: 'Caño corrugado', n: 0.024, group: 'Estructuras' },
  { label: 'Cauce natural limpio', n: 0.035, group: 'Cauces' },
  { label: 'Cauce sinuoso', n: 0.045, group: 'Cauces' },
  { label: 'Cauce con vegetación', n: 0.075, group: 'Cauces' },
  { label: 'Personalizado', n: -1, group: '' },
];

// ── Cross-section SVG diagrams ────────────────────────────────────────────────

function RectDiagram({ width, depth, yFrac }: { width: number; depth: number; yFrac: number }) {
  const W = 200; const H = 120; const pad = 20;
  const bw = W - 2 * pad;
  const bh = H - pad;
  const wy = bh * Math.min(yFrac, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
      <rect x={pad} y={pad} width={bw} height={bh} fill="none" stroke="#6b7280" strokeWidth="2" />
      <rect x={pad} y={pad + bh - wy} width={bw} height={wy} fill="#93c5fd" fillOpacity="0.5" />
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#374151">b = {width.toFixed(2)} m</text>
      <text x={pad + bw + 4} y={pad + bh - wy / 2} fontSize="10" fill="#1d4ed8">y = {depth.toFixed(2)} m</text>
    </svg>
  );
}

function TrapDiagram({ b, y, z, yFrac }: { b: number; y: number; z: number; yFrac: number }) {
  const W = 220; const H = 130; const pad = 30;
  const scale = (W - 2 * pad) / (b + 2 * z * y + 20);
  const bPx = b * scale;
  const yPx = (H - pad - 10) * Math.min(yFrac, 1);
  const cx = W / 2;
  // Bottom corners
  const bx1 = cx - bPx / 2; const bx2 = cx + bPx / 2; const by_ = H - 20;
  // Full height top corners
  const tx1 = bx1 - z * (H - pad - 10) * scale / scale; // simplified
  const tx2 = bx2 + z * (H - pad - 10) * scale / scale;
  const ty = by_ - (H - pad - 10);
  // Water surface at yFrac
  const wy1 = bx1 - z * yPx; const wy2 = bx2 + z * yPx; const wy_ = by_ - yPx;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
      <polygon points={`${tx1},${ty} ${tx2},${ty} ${bx2},${by_} ${bx1},${by_}`} fill="none" stroke="#6b7280" strokeWidth="2" />
      <polygon points={`${wy1},${wy_} ${wy2},${wy_} ${bx2},${by_} ${bx1},${by_}`} fill="#93c5fd" fillOpacity="0.5" />
      <text x={cx} y={H - 4} textAnchor="middle" fontSize="10" fill="#374151">b = {b.toFixed(2)} m, z = {z.toFixed(1)}</text>
      <text x={W - 10} y={wy_ + yPx / 2} textAnchor="end" fontSize="10" fill="#1d4ed8">y = {y.toFixed(2)} m</text>
    </svg>
  );
}

function CircDiagram({ D, depth }: { D: number; depth: number }) {
  const W = 160; const H = 160; const r = 60; const cx = W / 2; const cy = H / 2;
  const yFrac = depth / D;
  const waterY = cy + r - 2 * r * yFrac;
  // Clip water fill to circle
  const clipId = 'circClip';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6b7280" strokeWidth="2" />
      <rect x={cx - r} y={waterY} width={2 * r} height={cy + r - waterY} fill="#93c5fd" fillOpacity="0.5" clipPath={`url(#${clipId})`} />
      <text x={cx} y={H - 4} textAnchor="middle" fontSize="10" fill="#374151">D = {D.toFixed(2)} m</text>
      <text x={cx + r + 4} y={waterY + (cy + r - waterY) / 2} fontSize="10" fill="#1d4ed8">y = {depth.toFixed(2)} m</text>
    </svg>
  );
}

function TrianDiagram({ z, depth, yFrac }: { z: number; depth: number; yFrac: number }) {
  const W = 200; const H = 130; const cx = W / 2; const baseY = H - 20; const tipY = 30;
  const halfBase = z * depth * ((W - 40) / (z * depth + 5));
  const wy = baseY - (baseY - tipY) * Math.min(yFrac, 1);
  const wx = halfBase * Math.min(yFrac, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
      <polygon points={`${cx - halfBase},${baseY} ${cx + halfBase},${baseY} ${cx},${tipY}`} fill="none" stroke="#6b7280" strokeWidth="2" />
      <polygon points={`${cx - wx},${wy} ${cx + wx},${wy} ${cx},${tipY}`} fill="#93c5fd" fillOpacity="0.5" />
      <text x={cx} y={H - 4} textAnchor="middle" fontSize="10" fill="#374151">z = {z.toFixed(1)}</text>
      <text x={cx + wx + 6} y={wy + (baseY - wy) / 2} fontSize="10" fill="#1d4ed8">y = {depth.toFixed(2)} m</text>
    </svg>
  );
}

// ── Regime badge ──────────────────────────────────────────────────────────────

function RegimeBadge({ regime, fr }: { regime: string; fr: number | null }) {
  const styles: Record<string, string> = {
    subcritical: 'bg-blue-100 text-blue-800 border-blue-300',
    critical: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    supercritical: 'bg-red-100 text-red-800 border-red-300',
    a_presion: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  const labels: Record<string, string> = {
    subcritical: 'Subcrítico (lento)',
    critical: 'Crítico',
    supercritical: 'Supercrítico (rápido)',
    a_presion: 'Flujo a presión',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${styles[regime] ?? styles.subcritical}`}>
      {labels[regime] ?? regime}
      {fr !== null && <span className="font-normal opacity-75">Fr = {fr.toFixed(2)}</span>}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? '';

export function Manning() {
  const [channelType, setChannelType] = useState<ChannelType>('rectangular');

  // Shared
  const [manningN, setManningN] = useState(0.013);
  const [customN, setCustomN] = useState('0.013');
  const [nPreset, setNPreset] = useState('Hormigón liso');
  const [slope, setSlope] = useState('0.001');
  const [liningType, setLiningType] = useState('');
  const [designFlow, setDesignFlow] = useState('');

  // Rectangular / shared depth
  const [width, setWidth] = useState('2.0');
  const [depth, setDepth] = useState('1.0');

  // Trapezoidal
  const [bottomWidth, setBottomWidth] = useState('2.0');
  const [sideSlope, setSideSlope] = useState('1.5');

  // Circular
  const [diameter, setDiameter] = useState('1.2');

  // Triangular
  const [triSideSlope, setTriSideSlope] = useState('2.0');

  const [result, setResult] = useState<ManningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectPreset(label: string) {
    setNPreset(label);
    const preset = MANNING_PRESETS.find((p) => p.label === label);
    if (preset && preset.n > 0) {
      setManningN(preset.n);
      setCustomN(String(preset.n));
    }
  }

  async function handleCalculate() {
    setLoading(true);
    setError(null);
    setResult(null);

    const body: Record<string, unknown> = {
      channel_type: channelType,
      manning_n: manningN,
      slope: parseFloat(slope),
      design_flow: designFlow ? parseFloat(designFlow) : null,
      lining_type: liningType || null,
    };

    if (channelType === 'rectangular') {
      body.width = parseFloat(width);
      body.depth = parseFloat(depth);
    } else if (channelType === 'trapezoidal') {
      body.bottom_width = parseFloat(bottomWidth);
      body.depth = parseFloat(depth);
      body.side_slope = parseFloat(sideSlope);
    } else if (channelType === 'circular') {
      body.diameter = parseFloat(diameter);
      body.depth = parseFloat(depth);
    } else if (channelType === 'triangular') {
      body.side_slope = parseFloat(triSideSlope);
      body.depth = parseFloat(depth);
    }

    try {
      const res = await fetch(`${BASE}/api/hydraulics/manning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en el cálculo.');
    } finally {
      setLoading(false);
    }
  }

  // Build diagram data
  const depthVal = parseFloat(depth) || 0;
  const diamVal = parseFloat(diameter) || 1;
  const widthVal = parseFloat(width) || 2;
  const bwVal = parseFloat(bottomWidth) || 2;
  const ssVal = parseFloat(sideSlope) || 1.5;
  const tssVal = parseFloat(triSideSlope) || 2;
  const yFrac = channelType === 'circular' ? depthVal / diamVal : 0.7;

  const channelTypeOptions: { type: ChannelType; label: string; icon: string }[] = [
    { type: 'rectangular', label: 'Rectangular', icon: '▬' },
    { type: 'trapezoidal', label: 'Trapezoidal', icon: '⏢' },
    { type: 'circular', label: 'Circular', icon: '⬤' },
    { type: 'triangular', label: 'Triangular', icon: '▽' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Cálculo Hidráulico — Ecuación de Manning</h1>
          <p className="text-gray-500 text-sm mt-1">
            Q = (1/n) × A × R<sup>2/3</sup> × S<sup>1/2</sup>
            &nbsp;·&nbsp; Capacidad de conducción en canales a superficie libre
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Inputs ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Channel type */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Tipo de canal</h2>
              <div className="grid grid-cols-2 gap-2">
                {channelTypeOptions.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setChannelType(type); setResult(null); }}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      channelType === type
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-xl mb-0.5">{icon}</div>
                    <div className={`text-xs font-semibold ${channelType === type ? 'text-blue-700' : 'text-gray-600'}`}>
                      {label}
                    </div>
                  </button>
                ))}
              </div>

              {/* SVG diagram */}
              <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-3">
                {channelType === 'rectangular' && <RectDiagram width={widthVal} depth={depthVal || 1} yFrac={yFrac} />}
                {channelType === 'trapezoidal' && <TrapDiagram b={bwVal} y={depthVal || 1} z={ssVal} yFrac={yFrac} />}
                {channelType === 'circular' && <CircDiagram D={diamVal} depth={depthVal || diamVal * 0.7} />}
                {channelType === 'triangular' && <TrianDiagram z={tssVal} depth={depthVal || 1} yFrac={yFrac} />}
              </div>
            </div>

            {/* Dimensions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Dimensiones de la sección</h2>
              <div className="space-y-3">
                {channelType === 'rectangular' && (
                  <>
                    <Field label="Ancho (b)" value={width} unit="m" onChange={setWidth} />
                    <Field label="Tirante (y)" value={depth} unit="m" onChange={setDepth} />
                  </>
                )}
                {channelType === 'trapezoidal' && (
                  <>
                    <Field label="Ancho de fondo (b)" value={bottomWidth} unit="m" onChange={setBottomWidth} />
                    <Field label="Tirante (y)" value={depth} unit="m" onChange={setDepth} />
                    <Field label="Talud lateral (z en z:1)" value={sideSlope} unit="" onChange={setSideSlope} step="0.1" />
                  </>
                )}
                {channelType === 'circular' && (
                  <>
                    <Field label="Diámetro (D)" value={diameter} unit="m" onChange={setDiameter} step="0.1" />
                    <Field label="Tirante (y)" value={depth} unit="m" onChange={setDepth} />
                  </>
                )}
                {channelType === 'triangular' && (
                  <>
                    <Field label="Talud lateral (z en z:1)" value={triSideSlope} unit="" onChange={setTriSideSlope} step="0.1" />
                    <Field label="Tirante (y)" value={depth} unit="m" onChange={setDepth} />
                  </>
                )}
                <Field label="Pendiente longitudinal (S)" value={slope} unit="m/m" onChange={setSlope} step="0.0001" />
              </div>
            </div>

            {/* Manning n */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Coeficiente de rugosidad (n)</h2>
              <select
                value={nPreset}
                onChange={(e) => selectPreset(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['Revestidos', 'Tierra', 'Estructuras', 'Cauces'].map((group) => (
                  <optgroup key={group} label={group}>
                    {MANNING_PRESETS.filter((p) => p.group === group).map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}{p.n > 0 ? ` — n = ${p.n}` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="Personalizado">Personalizado</option>
              </select>
              {nPreset === 'Personalizado' ? (
                <input
                  type="number"
                  min={0.005}
                  max={0.2}
                  step={0.001}
                  value={customN}
                  onChange={(e) => { setCustomN(e.target.value); setManningN(parseFloat(e.target.value)); }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresá n (ej: 0.025)"
                />
              ) : (
                <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm text-blue-800 font-semibold">
                  n = {manningN}
                </div>
              )}
            </div>

            {/* Lining type for velocity warnings */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                Material del canal <span className="text-gray-400 font-normal">(opcional)</span>
              </h2>
              <p className="text-xs text-gray-500 mb-2">Para verificar velocidades admisibles de erosión y sedimentación.</p>
              <select
                value={liningType}
                onChange={(e) => setLiningType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sin verificar —</option>
                <option value="hormigon">Hormigón</option>
                <option value="tierra_arcillosa">Tierra arcillosa</option>
                <option value="tierra_limosa">Tierra limosa</option>
                <option value="tierra_arenosa">Tierra arenosa</option>
                <option value="grava_fina">Grava fina</option>
                <option value="grava_gruesa">Grava gruesa / canto rodado</option>
                <option value="roca">Roca</option>
              </select>
            </div>

            {/* Design check (optional) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Verificar diseño <span className="text-gray-400 font-normal">(opcional)</span></h2>
              <p className="text-xs text-gray-500 mb-3">Ingresá el caudal de diseño del cálculo hidrológico para verificar si el canal tiene capacidad suficiente.</p>
              <Field label="Caudal de diseño (Q_diseño)" value={designFlow} unit="m³/s" onChange={setDesignFlow} step="0.01" required={false} />
            </div>

            {/* Calculate button */}
            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Calculando…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Calcular Manning
                </>
              )}
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* ── Right: Results ──────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {!result && !loading && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
                <div className="text-4xl mb-3">🌊</div>
                <p className="font-medium">Completá los parámetros y presioná "Calcular Manning"</p>
                <p className="text-sm mt-1">Los resultados aparecerán aquí</p>
              </div>
            )}

            {result && (
              <>
                {/* Main metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="Caudal (Q)" value={result.flow_m3s.toFixed(3)} unit="m³/s" color="blue" />
                  <MetricCard label="Velocidad (V)" value={result.velocity_ms.toFixed(3)} unit="m/s" color="teal" />
                  <MetricCard label="Área mojada (A)" value={result.area_m2.toFixed(4)} unit="m²" color="indigo" />
                  <MetricCard label="Radio hidráulico (R)" value={result.hydraulic_radius_m.toFixed(4)} unit="m" color="violet" />
                </div>

                {/* Secondary metrics */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Parámetros hidráulicos</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <ParamRow label="Perímetro mojado (P)" value={`${result.wetted_perimeter_m.toFixed(4)} m`} />
                    {result.top_width_m !== null && (
                      <ParamRow label="Espejo de agua (T)" value={`${result.top_width_m.toFixed(4)} m`} />
                    )}
                    <ParamRow label="Pendiente (S)" value={slope} />
                    <ParamRow label="Manning n" value={String(manningN)} />
                  </div>
                </div>

                {/* Flow regime */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Régimen de flujo</h3>
                  <RegimeBadge regime={result.flow_regime} fr={result.froude} />
                  <p className="text-xs text-gray-500 mt-2">
                    {result.flow_regime === 'subcritical' && 'El flujo es controlado aguas abajo. Adecuado para canales de riego y drenaje.'}
                    {result.flow_regime === 'critical' && 'Condición inestable — pequeñas perturbaciones producen grandes variaciones. Evitar en diseño.'}
                    {result.flow_regime === 'supercritical' && 'Flujo rápido controlado aguas arriba. Requiere estructuras de disipación al final del canal.'}
                    {result.flow_regime === 'a_presion' && 'El conducto trabaja bajo presión. Verificar estanqueidad y anclajes.'}
                  </p>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-amber-800">Avisos de velocidad</h3>
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-sm text-amber-700 flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">⚠️</span>
                        {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Design check */}
                {result.design_check && (
                  <div className={`rounded-xl border p-4 ${
                    result.design_check.sufficient
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <h3 className={`text-sm font-semibold mb-2 ${
                      result.design_check.sufficient ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.design_check.sufficient ? '✓' : '✗'} Verificación de diseño
                    </h3>
                    <div className={`grid grid-cols-2 gap-3 text-sm ${
                      result.design_check.sufficient ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <ParamRow label="Q diseño" value={`${result.design_check.design_flow_m3s.toFixed(3)} m³/s`} />
                      <ParamRow label="Capacidad canal" value={`${result.design_check.channel_capacity_m3s.toFixed(3)} m³/s`} />
                    </div>
                    <p className={`text-sm font-medium mt-2 ${
                      result.design_check.sufficient ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.design_check.message}
                    </p>
                  </div>
                )}

                {/* Reference table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Valores de referencia — Manning n (Argentina)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1.5 pr-3 text-gray-600 font-medium">Material / Cauce</th>
                          <th className="text-center py-1.5 px-2 text-gray-600 font-medium">Mín.</th>
                          <th className="text-center py-1.5 px-2 text-gray-600 font-medium">Típico</th>
                          <th className="text-center py-1.5 px-2 text-gray-600 font-medium">Máx.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[
                          { label: 'Hormigón liso', min: 0.012, typ: 0.013, max: 0.015 },
                          { label: 'Hormigón rugoso', min: 0.015, typ: 0.017, max: 0.020 },
                          { label: 'Mampostería con mortero', min: 0.017, typ: 0.020, max: 0.025 },
                          { label: 'Canal de tierra limpio', min: 0.022, typ: 0.025, max: 0.030 },
                          { label: 'Canal de tierra con vegetación', min: 0.030, typ: 0.040, max: 0.050 },
                          { label: 'Alcantarilla / caño hormigón', min: 0.012, typ: 0.013, max: 0.015 },
                          { label: 'Caño corrugado', min: 0.020, typ: 0.024, max: 0.030 },
                          { label: 'Cauce natural limpio', min: 0.030, typ: 0.035, max: 0.040 },
                          { label: 'Cauce natural con vegetación', min: 0.050, typ: 0.075, max: 0.100 },
                        ].map((row) => (
                          <tr key={row.label} className="hover:bg-gray-50">
                            <td className="py-1.5 pr-3 text-gray-700">{row.label}</td>
                            <td className="py-1.5 px-2 text-center text-gray-500">{row.min.toFixed(3)}</td>
                            <td className="py-1.5 px-2 text-center font-semibold text-blue-700">{row.typ.toFixed(3)}</td>
                            <td className="py-1.5 px-2 text-center text-gray-500">{row.max.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  unit,
  onChange,
  step = '0.001',
  required = true,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={step}
          min={0}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {unit && <span className="text-xs text-gray-500 shrink-0 w-10">{unit}</span>}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: 'blue' | 'teal' | 'indigo' | 'violet';
}) {
  const colors = {
    blue:   'bg-blue-600',
    teal:   'bg-teal-600',
    indigo: 'bg-indigo-600',
    violet: 'bg-violet-600',
  };
  return (
    <div className={`rounded-xl text-white p-3 shadow-sm ${colors[color]}`}>
      <div className="text-xs text-white/70 leading-tight">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-white/60">{unit}</div>
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
