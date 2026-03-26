import { useState } from 'react';
import { simulateFlood } from '../services/api';
import type { FloodSimulationResult } from '../services/api';
import { FloodMap } from '../components/flood/FloodMap';
import { FloodResults } from '../components/flood/FloodResults';

// ── Manning n presets ─────────────────────────────────────────────────────────

const MANNING_PRESETS = [
  { label: 'Hormigón liso',            n: 0.013 },
  { label: 'Hormigón rugoso',          n: 0.015 },
  { label: 'Mampostería',              n: 0.020 },
  { label: 'Tierra sin vegetación',    n: 0.025 },
  { label: 'Tierra con vegetación',    n: 0.030 },
  { label: 'Cauce natural (limpio)',   n: 0.035 },
  { label: 'Cauce natural (vegetado)', n: 0.045 },
  { label: 'Cauce natural (denso)',    n: 0.060 },
];

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ['Caudal', 'Geometría', 'Planicie', 'Resultados'];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 select-none">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done   ? 'bg-[#0055A4] border-[#0055A4] text-white' :
                active ? 'bg-white border-[#0055A4] text-[#0055A4]' :
                         'bg-white border-gray-300 text-gray-400'
              }`}>
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-[11px] mt-1 font-medium ${active ? 'text-[#0055A4]' : done ? 'text-gray-500' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 sm:w-16 mx-1 mb-4 rounded ${i < current ? 'bg-[#0055A4]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Form field helpers ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-gray-700 mb-1">{children}</label>;
}

function NumInput({ value, onChange, min, step, placeholder }: {
  value: string; onChange: (v: string) => void;
  min?: number; step?: number; placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      min={min}
      step={step ?? 'any'}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FloodSimulator() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FloodSimulationResult | null>(null);

  // Step 1 – Caudal
  const [flow, setFlow] = useState('');

  // Step 2 – Channel geometry
  const [channelType, setChannelType] = useState('rectangular');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [slope, setSlope] = useState('');
  const [manningN, setManningN] = useState('0.035');

  // Step 3 – Floodplain + center
  const [fpWidth, setFpWidth] = useState('');
  const [simLength, setSimLength] = useState('');
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [picking, setPicking] = useState(false);

  // ── Validation helpers ────────────────────────────────────────────────────

  function step1Valid() { return parseFloat(flow) > 0; }
  function step2Valid() {
    return parseFloat(width) > 0 && parseFloat(depth) > 0
        && parseFloat(slope) > 0 && parseFloat(manningN) > 0;
  }
  function step3Valid() {
    return parseFloat(fpWidth) > 0 && parseFloat(simLength) > 0 && center !== null;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSimulate() {
    if (!center) return;
    setLoading(true);
    setError(null);
    try {
      const res = await simulateFlood({
        design_flow_m3s: parseFloat(flow),
        channel_geometry: {
          type: channelType,
          width: parseFloat(width),
          depth: parseFloat(depth),
          slope: parseFloat(slope),
          manning_n: parseFloat(manningN),
        },
        floodplain_width_m: parseFloat(fpWidth),
        simulation_length_m: parseFloat(simLength),
        center_coordinates: center,
      });
      setResult(res);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en la simulación');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0055A4] text-white py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Simulador de Inundaciones</h1>
              <p className="text-blue-200 text-xs">Modelo 1D simplificado · Manning + extensión de planicie</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <StepBar current={step} />

        {/* ── Step 0: Caudal de diseño ────────────────────────────────────── */}
        {step === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-gray-800 text-lg">Caudal de diseño</h2>
            <p className="text-sm text-gray-500">
              Ingresá el caudal pico de diseño Q para el período de retorno seleccionado.
              Podés obtenerlo del módulo de Hidrología.
            </p>
            <div className="max-w-xs">
              <Label>Caudal de diseño Q (m³/s)</Label>
              <NumInput value={flow} onChange={setFlow} min={0} step={0.01} placeholder="ej. 45.5" />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!step1Valid()}
                onClick={() => setStep(1)}
                className="px-6 py-2.5 bg-[#0055A4] text-white font-semibold rounded-lg text-sm hover:bg-[#004a91] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Geometría del cauce ─────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-gray-800 text-lg">Geometría del cauce</h2>

            <div>
              <Label>Tipo de sección</Label>
              <select
                value={channelType}
                onChange={e => setChannelType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rectangular">Rectangular</option>
                <option value="trapezoidal">Trapezoidal</option>
                <option value="natural">Cauce natural</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Nota: el cálculo interno usa sección rectangular equivalente en todos los casos (modelo simplificado).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ancho del cauce (m)</Label>
                <NumInput value={width} onChange={setWidth} min={0} step={0.5} placeholder="ej. 12" />
              </div>
              <div>
                <Label>Profundidad bancaria (m)</Label>
                <NumInput value={depth} onChange={setDepth} min={0} step={0.1} placeholder="ej. 2.0" />
              </div>
              <div>
                <Label>Pendiente del cauce (m/m)</Label>
                <NumInput value={slope} onChange={setSlope} min={0} step={0.0001} placeholder="ej. 0.005" />
              </div>
              <div>
                <Label>Coeficiente de Manning (n)</Label>
                <NumInput value={manningN} onChange={setManningN} min={0} step={0.001} placeholder="ej. 0.035" />
                <select
                  onChange={e => { if (e.target.value) setManningN(e.target.value); }}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="" disabled>— presets —</option>
                  {MANNING_PRESETS.map(p => (
                    <option key={p.label} value={p.n}>{p.label} (n={p.n})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep(0)}
                className="px-5 py-2.5 border border-gray-300 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Atrás
              </button>
              <button type="button" disabled={!step2Valid()} onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-[#0055A4] text-white font-semibold rounded-lg text-sm hover:bg-[#004a91] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Planicie inundable + mapa ───────────────────────────── */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-gray-800 text-lg">Planicie inundable</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ancho planicie c/lado (m)</Label>
                <NumInput value={fpWidth} onChange={setFpWidth} min={0} step={10} placeholder="ej. 200" />
                <p className="text-xs text-gray-400 mt-1">Distancia máx. desde el borde del cauce</p>
              </div>
              <div>
                <Label>Longitud del tramo (m)</Label>
                <NumInput value={simLength} onChange={setSimLength} min={0} step={100} placeholder="ej. 1000" />
              </div>
            </div>

            {/* Center point picker */}
            <div>
              <Label>Punto central del tramo</Label>
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => setPicking(p => !p)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    picking
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-blue-500 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {picking ? 'Cancelar selección' : 'Seleccionar en el mapa'}
                </button>
                {center && (
                  <span className="text-xs text-gray-500">
                    {center[0].toFixed(5)}, {center[1].toFixed(5)}
                  </span>
                )}
                {!center && !picking && (
                  <span className="text-xs text-gray-400">Hacé clic en el botón y luego en el mapa</span>
                )}
              </div>
              <FloodMap
                floodPolygon={null}
                maxDepth={0}
                center={center}
                picking={picking}
                onPickCenter={(ll) => { setCenter(ll); setPicking(false); }}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-gray-300 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Atrás
              </button>
              <button
                type="button"
                disabled={!step3Valid() || loading}
                onClick={handleSimulate}
                className="px-6 py-2.5 bg-[#0055A4] text-white font-semibold rounded-lg text-sm hover:bg-[#004a91] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Simulando...
                  </>
                ) : 'Simular inundación'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Resultados ──────────────────────────────────────────── */}
        {step === 3 && result && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-bold text-gray-800 text-lg">Resultados de la simulación</h2>
                <button
                  type="button"
                  onClick={() => { setStep(0); setResult(null); setCenter(null); setFlow(''); setWidth(''); setDepth(''); setSlope(''); setFpWidth(''); setSimLength(''); }}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Nueva simulación
                </button>
              </div>
              <FloodResults result={result} />
            </div>

            {/* Map showing flood polygon */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="font-bold text-gray-700 mb-3 text-sm">Área inundada estimada</h3>
              <FloodMap
                floodPolygon={result.flood_polygon}
                maxDepth={result.max_depth_m}
                center={center}
                picking={false}
                onPickCenter={() => {}}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
