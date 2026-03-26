import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { generateCulvertPdf } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CulvertResult {
  design_flow_m3s: number;
  culvert_type: string;
  material: string;
  material_label: string;
  manning_n: number;
  length_m: number;
  slope: number;
  inlet_type: string;
  inlet_label: string;
  headwater_max_m: number;
  recommended: SizeResult;
  alternatives: SizeResult[];
  warnings: string[];
}

interface SizeResult {
  type: string;
  label: string;
  diameter_m?: number;
  width_m?: number;
  height_m?: number;
  hw_m: number;
  hw_ic_m: number;
  hw_oc_m: number;
  hwd_ratio: number;
  outlet_velocity_ms: number;
  control: string;
  control_label: string;
  ok: boolean;
  area_m2: number;
}

// ── SVG Diagrams ──────────────────────────────────────────────────────────────

function CircularDiagram({ D, hw }: { D: number; hw: number }) {
  const cx = 80, cy = 80, r = 44;
  const fillRatio = Math.min(hw / D, 1);
  const fillY = cy + r - fillRatio * 2 * r;
  const capY = Math.max(fillY, cy - r);
  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px]">
      {/* pipe walls */}
      <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" stroke="#6b7280" strokeWidth={3} />
      {/* water fill */}
      <clipPath id="circ-clip">
        <circle cx={cx} cy={cy} r={r - 1} />
      </clipPath>
      <rect x={cx - r} y={capY} width={2 * r} height={cy + r - capY} fill="#60a5fa" opacity={0.6} clipPath="url(#circ-clip)" />
      {/* dimension label */}
      <text x={cx} y={cy + r + 16} textAnchor="middle" fontSize="11" fill="#374151">Ø {D.toFixed(2)} m</text>
      <text x={cx} y={14} textAnchor="middle" fontSize="10" fill="#1d4ed8">HW = {hw.toFixed(2)} m</text>
      {/* HW arrow */}
      <line x1={cx + r + 8} y1={cy - r} x2={cx + r + 8} y2={capY} stroke="#1d4ed8" strokeWidth={1.5} markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#1d4ed8" />
        </marker>
      </defs>
    </svg>
  );
}

function BoxDiagram({ W, H, hw }: { W: number; H: number; hw: number }) {
  const aspect = W / H;
  const boxW = Math.min(110, Math.max(60, 90 * aspect));
  const boxH = Math.min(90, Math.max(40, 90 / aspect));
  const ox = (160 - boxW) / 2;
  const oy = (140 - boxH) / 2;
  const fillRatio = Math.min(hw / H, 1);
  const fillH = fillRatio * boxH;
  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px]">
      {/* box walls */}
      <rect x={ox} y={oy} width={boxW} height={boxH} fill="#e5e7eb" stroke="#6b7280" strokeWidth={3} />
      {/* water fill */}
      <rect x={ox + 1.5} y={oy + boxH - fillH} width={boxW - 3} height={fillH} fill="#60a5fa" opacity={0.6} />
      {/* dimension labels */}
      <text x={ox + boxW / 2} y={oy + boxH + 16} textAnchor="middle" fontSize="10" fill="#374151">{W.toFixed(1)}×{H.toFixed(1)} m</text>
      <text x={ox + boxW / 2} y={14} textAnchor="middle" fontSize="10" fill="#1d4ed8">HW = {hw.toFixed(2)} m</text>
    </svg>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {title && <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>}
      {children}
    </div>
  );
}

function ControlBadge({ control }: { control: string }) {
  const inlet = control === 'inlet';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
      inlet ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
    }`}>
      {inlet ? 'Control de entrada' : 'Control de salida'}
    </span>
  );
}

function MetricCard({ label, value, unit, highlight = false }: {
  label: string; value: string; unit?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-blue-600 text-white' : 'bg-gray-50 border border-gray-200'}`}>
      <div className={`text-xs mb-1 ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>{label}</div>
      <div className={`font-bold text-xl leading-tight ${highlight ? 'text-white' : 'text-gray-800'}`}>{value}</div>
      {unit && <div className={`text-xs mt-0.5 ${highlight ? 'text-blue-200' : 'text-gray-400'}`}>{unit}</div>}
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MATERIALS = [
  { id: 'hormigon', label: 'Hormigón', n: 0.013 },
  { id: 'pead', label: 'PEAD', n: 0.011 },
  { id: 'chapa_corrugada', label: 'Chapa corrugada', n: 0.024 },
];

const INLET_TYPES = [
  { id: 'proyectante', label: 'Proyectante' },
  { id: 'sin_alas', label: 'Con alero, sin alas' },
  { id: 'con_alas_30_75', label: 'Con alas 30–75°' },
  { id: 'con_alas_90', label: 'Con alas 90°' },
  { id: 'biselado', label: 'Biselado' },
  { id: 'redondeado', label: 'Redondeado' },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export function Culvert() {
  const location = useLocation();
  const passedFlow = (location.state as { flow?: number } | null)?.flow;

  // Inputs
  const [flow, setFlow] = useState(passedFlow?.toString() ?? '');
  const [culvertType, setCulvertType] = useState<'circular' | 'box'>('circular');
  const [material, setMaterial] = useState('hormigon');
  const [length, setLength] = useState('');
  const [slope, setSlope] = useState('');
  const [inletType, setInletType] = useState('sin_alas');
  const [hwMax, setHwMax] = useState('');
  const [tailwater, setTailwater] = useState('0');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CulvertResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // When Q comes from hydrology calculator via router state, highlight the field
  const [flowFromCalc] = useState(!!passedFlow);

  useEffect(() => {
    if (passedFlow) setFlow(passedFlow.toFixed(3));
  }, [passedFlow]);

  const canCalculate =
    flow !== '' && parseFloat(flow) > 0 &&
    length !== '' && parseFloat(length) > 0 &&
    slope !== '' && parseFloat(slope) > 0 &&
    hwMax !== '' && parseFloat(hwMax) > 0;

  async function handleDownloadPdf() {
    if (!result) return;
    setPdfLoading(true);
    try {
      const blob = await generateCulvertPdf({
        result: result as unknown as Record<string, unknown>,
        projectName: 'Dimensionamiento de Alcantarilla',
        location: 'Argentina',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoria_hidraulica_alcantarilla_T${parseFloat(flow).toFixed(0)}m3s.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar el PDF.');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleCalculate() {
    if (!canCalculate) return;
    setLoading(true);
    setError('');
    setResult(null);

    const BASE = import.meta.env.VITE_API_URL ?? '';
    try {
      const res = await fetch(`${BASE}/api/hydraulics/culvert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design_flow_m3s: parseFloat(flow),
          culvert_type: culvertType,
          material,
          length_m: parseFloat(length),
          slope: parseFloat(slope),
          inlet_type: inletType,
          headwater_max_m: parseFloat(hwMax),
          tailwater_m: parseFloat(tailwater) || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data: CulvertResult = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  const rec = result?.recommended;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header banner */}
      <div className="bg-[#0055A4] text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Dimensionamiento de Alcantarillas</h1>
              <p className="text-sm text-blue-200">Control de entrada y salida · Tamaños comerciales argentinos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── Step 1: Design flow ─────────────────────────────────────────── */}
        <Card title="Caudal de diseño">
          {flowFromCalc && (
            <div className="mb-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Caudal importado desde el calculador hidrológico.
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <input
                type="number"
                min="0"
                step="0.001"
                value={flow}
                onChange={(e) => setFlow(e.target.value)}
                placeholder="ej. 2.50"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  flowFromCalc ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400">m³/s</span>
            </div>
            <span className="text-sm text-gray-500">Caudal de diseño (Q)</span>
          </div>
        </Card>

        {/* ── Step 2: Culvert type ────────────────────────────────────────── */}
        <Card title="Tipo de alcantarilla">
          <div className="grid grid-cols-2 gap-3">
            {/* Circular */}
            <button
              type="button"
              onClick={() => setCulvertType('circular')}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                culvertType === 'circular'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <svg viewBox="0 0 60 60" className="w-14 h-14">
                <circle cx="30" cy="30" r="26" fill="#e5e7eb" stroke={culvertType === 'circular' ? '#2563eb' : '#9ca3af'} strokeWidth="3" />
                <ellipse cx="30" cy="30" rx="15" ry="15" fill="#bfdbfe" stroke={culvertType === 'circular' ? '#3b82f6' : '#d1d5db'} strokeWidth="1.5" />
                <text x="30" y="55" textAnchor="middle" fontSize="8" fill={culvertType === 'circular' ? '#1d4ed8' : '#6b7280'}>Circular</text>
              </svg>
              <div>
                <div className={`text-sm font-semibold ${culvertType === 'circular' ? 'text-blue-700' : 'text-gray-700'}`}>
                  Caño circular
                </div>
                <div className="text-xs text-gray-500">Hormigón · PEAD · Chapa</div>
              </div>
            </button>

            {/* Box */}
            <button
              type="button"
              onClick={() => setCulvertType('box')}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                culvertType === 'box'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <svg viewBox="0 0 60 60" className="w-14 h-14">
                <rect x="8" y="16" width="44" height="30" fill="#e5e7eb" stroke={culvertType === 'box' ? '#2563eb' : '#9ca3af'} strokeWidth="3" rx="2" />
                <rect x="12" y="20" width="36" height="22" fill="#bfdbfe" stroke={culvertType === 'box' ? '#3b82f6' : '#d1d5db'} strokeWidth="1.5" />
                <text x="30" y="55" textAnchor="middle" fontSize="8" fill={culvertType === 'box' ? '#1d4ed8' : '#6b7280'}>Box Culvert</text>
              </svg>
              <div>
                <div className={`text-sm font-semibold ${culvertType === 'box' ? 'text-blue-700' : 'text-gray-700'}`}>
                  Alcantarilla cajón
                </div>
                <div className="text-xs text-gray-500">Box culvert rectangular</div>
              </div>
            </button>
          </div>
        </Card>

        {/* ── Step 3: Design parameters ───────────────────────────────────── */}
        <Card title="Parámetros de diseño">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Length */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Longitud de la alcantarilla
              </label>
              <div className="relative">
                <input
                  type="number" min="0" step="0.5"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="ej. 12"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">m</span>
              </div>
            </div>

            {/* Slope */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Pendiente del conducto
              </label>
              <div className="relative">
                <input
                  type="number" min="0" step="0.001"
                  value={slope}
                  onChange={(e) => setSlope(e.target.value)}
                  placeholder="ej. 0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">m/m</span>
              </div>
            </div>

            {/* Headwater max */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tirante aguas arriba admisible (HW máx.)
              </label>
              <div className="relative">
                <input
                  type="number" min="0" step="0.1"
                  value={hwMax}
                  onChange={(e) => setHwMax(e.target.value)}
                  placeholder="ej. 1.5"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">m</span>
              </div>
            </div>

            {/* Tailwater */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nivel aguas abajo (cola)
              </label>
              <div className="relative">
                <input
                  type="number" min="0" step="0.1"
                  value={tailwater}
                  onChange={(e) => setTailwater(e.target.value)}
                  placeholder="0 = descarga libre"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">m</span>
              </div>
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Material
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} (n = {m.n})</option>
                ))}
              </select>
            </div>

            {/* Inlet type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de entrada
              </label>
              <select
                value={inletType}
                onChange={(e) => setInletType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {INLET_TYPES.map((it) => (
                  <option key={it.id} value={it.id}>{it.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={!canCalculate || loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Calculando…
                </span>
              ) : 'Dimensionar alcantarilla'}
            </button>
          </div>
        </Card>

        {/* ── Step 4: Results ──────────────────────────────────────────────── */}
        {result && rec && (
          <>
            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended size */}
            <Card>
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Diagram */}
                <div className="flex items-center justify-center w-full sm:w-40 shrink-0">
                  {rec.type === 'circular' && rec.diameter_m ? (
                    <CircularDiagram D={rec.diameter_m} hw={rec.hw_m} />
                  ) : rec.width_m && rec.height_m ? (
                    <BoxDiagram W={rec.width_m} H={rec.height_m} hw={rec.hw_m} />
                  ) : null}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      rec.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {rec.ok ? '✓ Cumple' : '✗ No cumple'}
                    </span>
                    <ControlBadge control={rec.control} />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mt-1 mb-3">
                    {rec.label}
                    <span className="ml-2 text-sm font-normal text-gray-500">(tamaño recomendado)</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricCard label="Tirante aguas arriba (HW)" value={`${rec.hw_m.toFixed(2)}`} unit="m" highlight />
                    <MetricCard label="Relación HW/D" value={rec.hwd_ratio.toFixed(2)} />
                    <MetricCard label="Vel. de salida" value={`${rec.outlet_velocity_ms.toFixed(2)}`} unit="m/s" />
                    <MetricCard label="Área de conducto" value={`${rec.area_m2.toFixed(3)}`} unit="m²" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div><span className="text-gray-400">HW control entrada:</span> {rec.hw_ic_m.toFixed(3)} m</div>
                    <div><span className="text-gray-400">HW control salida:</span> {rec.hw_oc_m.toFixed(3)} m</div>
                    <div><span className="text-gray-400">Material:</span> {result.material_label}</div>
                    <div><span className="text-gray-400">Tipo de entrada:</span> {result.inlet_label}</div>
                    <div><span className="text-gray-400">Manning n:</span> {result.manning_n}</div>
                    <div><span className="text-gray-400">Longitud:</span> {result.length_m} m</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* All alternatives */}
            <Card title="Comparativa de tamaños comerciales">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tamaño</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">HW (m)</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">HW/D</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">V sal. (m/s)</th>
                      <th className="text-center py-2 pl-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Control</th>
                      <th className="text-center py-2 pl-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.alternatives.map((alt, i) => {
                      const isRec = alt.label === rec.label;
                      return (
                        <tr key={i} className={`border-b border-gray-100 ${isRec ? 'bg-blue-50' : ''}`}>
                          <td className="py-2 pr-3 font-medium text-gray-800">
                            {alt.label}
                            {isRec && <span className="ml-2 text-xs text-blue-600 font-semibold">← recomendado</span>}
                          </td>
                          <td className="text-right py-2 px-3 tabular-nums">{alt.hw_m.toFixed(3)}</td>
                          <td className="text-right py-2 px-3 tabular-nums">{alt.hwd_ratio.toFixed(2)}</td>
                          <td className="text-right py-2 px-3 tabular-nums">{alt.outlet_velocity_ms.toFixed(2)}</td>
                          <td className="text-center py-2 pl-3">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              alt.control === 'inlet'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {alt.control === 'inlet' ? 'Entrada' : 'Salida'}
                            </span>
                          </td>
                          <td className="text-center py-2 pl-3">
                            <span className={`text-xs font-semibold ${alt.ok ? 'text-green-600' : 'text-red-500'}`}>
                              {alt.ok ? '✓' : '✗'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                ✓ = HW calculado ≤ HW máx. admisible ({result.headwater_max_m} m)
              </p>
            </Card>

            {/* Methodology note */}
            <Card>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Metodología</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  Cálculo basado en <strong>FHWA HDS-5</strong> (Hydraulic Design of Highway Culverts).
                  Se calcula el tirante aguas arriba (HW) bajo control de entrada y salida,
                  y se adopta el mayor valor (condición gobernante).
                </p>
                <p>
                  <strong>Control de entrada:</strong> limitado por la capacidad de la boca de ingreso
                  (nomograma FHWA, aproximación polinomial).
                </p>
                <p>
                  <strong>Control de salida:</strong> ecuación de energía con pérdidas por entrada (Ke),
                  fricción (Manning–Darcy) y velocidad de salida.
                </p>
                <p className="text-gray-400 mt-1">
                  Tamaños comerciales según práctica argentina (IRAM/CIRSOC). Para proyectos definitivos,
                  validar con normativa provincial y planos de obra.
                </p>
              </div>
            </Card>

            {/* PDF + New calculation buttons */}
            <div className="flex flex-wrap gap-3 justify-between">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setFlow(passedFlow?.toString() ?? '');
                  setLength('');
                  setSlope('');
                  setHwMax('');
                  setTailwater('0');
                }}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Nuevo cálculo
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="px-4 py-2 rounded-lg bg-[#0055A4] text-white text-sm font-semibold hover:bg-[#004a91] disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {pdfLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generando PDF…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generar Memoria de Cálculo (PDF)
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
