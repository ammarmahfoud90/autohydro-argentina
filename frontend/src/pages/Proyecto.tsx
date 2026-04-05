import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CitySelector } from '../components/forms/CitySelector';
import { ChannelCrossSectionSVG } from '../components/manning/ChannelCrossSectionSVG';
import {
  calculateHydrology,
  generateHyetograph,
  generateProyectoPdf,
  generateDocxReport,
} from '../services/api';
import { calculateAllTc } from '../constants/tc-formulas';
import type { IDFLocality } from '../types/idf';
import type { HydrologyResult } from '../types';
import type { HyetographResult } from '../services/api';
import {
  useProyecto,
  saveProjectToStorage,
  type Paso5Data,
} from '../hooks/useProyecto';

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
const HYETO_METHODS = [
  { id: 'alternating_blocks', label: 'Bloques Alternos', desc: 'Más usado en Argentina. Pico central simétrico.' },
  { id: 'scs_type_ii', label: 'SCS Tipo II', desc: 'USDA-NRCS. Pico al 70% de la duración.' },
  { id: 'chicago', label: 'Chicago (r = 0.4)', desc: 'Pico al 40%. Común en estudios urbanos.' },
  { id: 'uniform', label: 'Uniforme', desc: 'Intensidad constante. Conservador.' },
];
const TIME_STEPS = [5, 10, 15, 30, 60];
const HYDRO_METHODS = [
  { id: 'rational', label: 'Racional' },
  { id: 'modified_rational', label: 'Racional Mod.' },
  { id: 'scs_cn', label: 'SCS-CN' },
];
const TC_FORMULAS = [
  { key: 'temez', label: 'Témez (1978) — Recomendado AR' },
  { key: 'kirpich', label: 'Kirpich (1940)' },
  { key: 'california', label: 'California Culverts (1942)' },
  { key: 'giandotti', label: 'Giandotti (1934)' },
  { key: 'ventura_heras', label: 'Ventura-Heras' },
  { key: 'passini', label: 'Passini' },
];
const MANNING_PRESETS = [
  { label: 'Hormigón liso', n: 0.013 },
  { label: 'Hormigón rugoso', n: 0.017 },
  { label: 'Mampostería con mortero', n: 0.020 },
  { label: 'Piedra seca', n: 0.030 },
  { label: 'Tierra limpia', n: 0.025 },
  { label: 'Tierra con vegetación', n: 0.040 },
  { label: 'Cauce natural limpio', n: 0.035 },
  { label: 'Personalizado', n: -1 },
];

const RISK_BADGE: Record<string, string> = {
  muy_bajo: 'bg-green-100 text-green-800 border-green-300',
  bajo:     'bg-lime-100 text-lime-800 border-lime-300',
  moderado: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  alto:     'bg-orange-100 text-orange-800 border-orange-300',
  muy_alto: 'bg-red-100 text-red-800 border-red-300',
};
const RISK_LABEL: Record<string, string> = {
  muy_bajo: 'Muy bajo', bajo: 'Bajo', moderado: 'Moderado', alto: 'Alto', muy_alto: 'Muy alto',
};

type ChannelType = 'rectangular' | 'trapezoidal' | 'circular' | 'triangular';

interface ManningResult {
  flow_m3s: number;
  velocity_ms: number;
  area_m2: number;
  hydraulic_radius_m: number;
  top_width_m: number | null;
  flow_regime: string;
  warnings: string[];
  design_check: {
    sufficient: boolean;
    margin_pct: number;
    message: string;
    channel_capacity_m3s: number;
    design_flow_m3s: number;
  } | null;
}

const BASE = import.meta.env.VITE_API_URL ?? '';

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'IDF' },
    { n: 2, label: 'Cuenca' },
    { n: 3, label: 'Hietograma' },
    { n: 4, label: 'Hidrograma' },
    { n: 5, label: 'Canal' },
    { n: 6, label: 'Informe' },
  ];
  return (
    <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-16 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-0">
          {steps.map(({ n, label }, i) => {
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                  }`}>
                    {done ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : n}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block truncate ${
                    active ? 'text-blue-700 dark:text-blue-400' : done ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'
                  }`}>{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-slate-600'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
      {title && <h2 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-4">{title}</h2>}
      {children}
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Continuar →',
  nextDisabled = false,
  loading = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={`flex pt-4 mt-4 border-t border-gray-100 dark:border-slate-700 ${onBack ? 'justify-between' : 'justify-end'}`}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          ← Volver
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {loading && (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {nextLabel}
      </button>
    </div>
  );
}

function PillButtons<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-blue-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function InputField({
  label, value, unit, onChange, step = '0.001', min = '0',
}: {
  label: string; value: string; unit?: string;
  onChange: (v: string) => void; step?: string; min?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={step}
          min={min}
          className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {unit && <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0 w-12">{unit}</span>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Proyecto() {
  const { proyecto, step, setStep, updateStep, saveProject } = useProyecto();

  // ── Step 1 state ─────────────────────────────────────────────────────────
  const [localityId, setLocalityId] = useState('');
  const [locality, setLocality] = useState<IDFLocality | null>(null);
  const [returnPeriod, setReturnPeriod] = useState(25);
  const [durationMin, setDurationMin] = useState(60);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // ── Step 2 state ─────────────────────────────────────────────────────────
  const [area, setArea] = useState('5.0');
  const [length, setLength] = useState('3.0');
  const [slope, setSlope] = useState('0.010');
  const [elevDiff, setElevDiff] = useState('');
  const [avgElev, setAvgElev] = useState('');
  const [coefC, setCoefC] = useState(0.60);
  const [cn, setCn] = useState('75');
  const [tcFormula, setTcFormula] = useState('temez');

  // ── Step 3 state ─────────────────────────────────────────────────────────
  const [hyetoMethod, setHyetoMethod] = useState('alternating_blocks');
  const [deltaT, setDeltaT] = useState(10);
  const [hyetoResult, setHyetoResult] = useState<HyetographResult | null>(null);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState<string | null>(null);

  // ── Step 4 state ─────────────────────────────────────────────────────────
  const [hydroMethod, setHydroMethod] = useState<'rational' | 'modified_rational' | 'scs_cn'>('rational');
  const [hydroResult, setHydroResult] = useState<HydrologyResult | null>(null);
  const [step4Loading, setStep4Loading] = useState(false);
  const [step4Error, setStep4Error] = useState<string | null>(null);

  // ── Step 5 state ─────────────────────────────────────────────────────────
  const [channelType, setChannelType] = useState<ChannelType>('rectangular');
  const [chWidth, setChWidth] = useState('2.0');
  const [chDepth, setChDepth] = useState('1.0');
  const [chBottom, setChBottom] = useState('2.0');
  const [chSideSlope, setChSideSlope] = useState('1.5');
  const [chDiameter, setChDiameter] = useState('1.2');
  const [chTriSlope, setChTriSlope] = useState('2.0');
  const [chSlope, setChSlope] = useState('0.001');
  const [nPreset, setNPreset] = useState('Hormigón liso');
  const [manningN, setManningN] = useState(0.013);
  const [customN, setCustomN] = useState('0.013');
  const [manningResult, setManningResult] = useState<ManningResult | null>(null);
  const [step5Loading, setStep5Loading] = useState(false);
  const [step5Error, setStep5Error] = useState<string | null>(null);

  // ── Step 6 state ─────────────────────────────────────────────────────────
  const [projName, setProjName] = useState('');
  const [comitente, setComitente] = useState('');
  const [profesional, setProfesional] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Set default project name when locality is selected
  useEffect(() => {
    if (locality && !projName) {
      setProjName(`Proyecto hidráulico — ${locality.name}`);
    }
  }, [locality, projName]);

  // ── Computed Tc ───────────────────────────────────────────────────────────

  const areaVal = parseFloat(area) || 0;
  const lengthVal = parseFloat(length) || 0;
  const slopeVal = parseFloat(slope) || 0;
  const elevDiffVal = parseFloat(elevDiff) || 0;
  const avgElevVal = parseFloat(avgElev) || 0;

  const tcResults = areaVal > 0 && lengthVal > 0 && slopeVal > 0
    ? calculateAllTc({
        L_m: lengthVal * 1000,
        L_km: lengthVal,
        S: slopeVal,
        A_km2: areaVal,
        H_m: elevDiffVal || undefined,
        Hm_m: avgElevVal || undefined,
      })
    : [];
  const selectedTc = tcResults.find((r) => r.formula === tcFormula);

  // ── Step handlers ─────────────────────────────────────────────────────────

  async function handleStep1Continue() {
    if (!localityId || !locality) return;
    setStep1Loading(true);
    setStep1Error(null);
    try {
      // Fetch intensity via uniform hyetograph — use fixed Δt=5 min (always valid, min duration is 30 min)
      const res = await generateHyetograph({
        locality_id: localityId,
        return_period: returnPeriod,
        duration_min: durationMin,
        time_step_min: 5,
        method: 'uniform',
      });
      updateStep('paso1', {
        localidad_id: localityId,
        localidad_nombre: locality.name,
        provincia: locality.province,
        return_period: returnPeriod,
        duration_min: durationMin,
        intensidad_mm_hr: res.peak_intensity_mm_hr,
        fuente_idf: locality.source.document,
      });
      setStep(2);
    } catch (err) {
      setStep1Error(err instanceof Error ? err.message : 'Error al verificar datos IDF.');
    } finally {
      setStep1Loading(false);
    }
  }

  async function handleStep3Continue() {
    if (!proyecto.paso1) return;
    setStep3Loading(true);
    setStep3Error(null);
    try {
      const res = await generateHyetograph({
        locality_id: proyecto.paso1.localidad_id,
        return_period: proyecto.paso1.return_period,
        duration_min: proyecto.paso1.duration_min,
        time_step_min: deltaT,
        method: hyetoMethod,
        r: 0.4,
      });
      setHyetoResult(res);
      updateStep('paso3', {
        metodo: hyetoMethod,
        delta_t_min: deltaT,
        precipitacion_total_mm: res.total_depth_mm,
        result: res,
      });
      setStep(4);
    } catch (err) {
      setStep3Error(err instanceof Error ? err.message : 'Error al generar el hietograma.');
    } finally {
      setStep3Loading(false);
    }
  }

  async function handleStep4Calculate() {
    if (!proyecto.paso1 || !proyecto.paso2) return;
    const p1 = proyecto.paso1;
    const p2 = proyecto.paso2;
    setStep4Loading(true);
    setStep4Error(null);
    try {
      const res = await calculateHydrology({
        locality_id: p1.localidad_id,
        location_description: '',
        return_period: p1.return_period,
        duration_min: p1.duration_min,
        area_km2: p2.area_km2,
        length_km: p2.longitud_cauce_km,
        slope: p2.pendiente_media,
        elevation_diff_m: p2.elevation_diff_m,
        avg_elevation_m: p2.avg_elevation_m,
        method: hydroMethod,
        runoff_coeff: p2.coef_escorrentia_C,
        land_use_categories: [],
        soil_group: 'B',
        use_pampa_lambda: false,
        infrastructure_type: 'canal_rural',
        tc_formulas: [p2.tc_formula as 'kirpich' | 'california' | 'temez' | 'giandotti' | 'ventura_heras' | 'passini'],
        tc_adopted_formula: p2.tc_formula as 'kirpich' | 'california' | 'temez' | 'giandotti' | 'ventura_heras' | 'passini',
        cn_override: hydroMethod === 'scs_cn' ? p2.numero_curva_CN : undefined,
        project_name: '',
        client_name: '',
        language: 'es',
        manual_idf_table: null,
        manual_idf_formula: null,
        station_id: null,
      });
      setHydroResult(res);
      updateStep('paso4', {
        metodo_calculo: hydroMethod,
        q_pico_m3s: res.peak_flow_m3s,
        nivel_riesgo: res.risk_level,
        result: res,
      });
    } catch (err) {
      setStep4Error(err instanceof Error ? err.message : 'Error en el cálculo hidrológico.');
    } finally {
      setStep4Loading(false);
    }
  }

  async function handleStep5Calculate() {
    const qDiseno = proyecto.paso4?.q_pico_m3s ?? 0;
    setStep5Loading(true);
    setStep5Error(null);
    setManningResult(null);
    const body: Record<string, unknown> = {
      channel_type: channelType,
      manning_n: manningN,
      slope: parseFloat(chSlope),
      design_flow: qDiseno,
    };
    if (channelType === 'rectangular') { body.width = parseFloat(chWidth); body.depth = parseFloat(chDepth); }
    else if (channelType === 'trapezoidal') { body.bottom_width = parseFloat(chBottom); body.depth = parseFloat(chDepth); body.side_slope = parseFloat(chSideSlope); }
    else if (channelType === 'circular') { body.diameter = parseFloat(chDiameter); body.depth = parseFloat(chDepth); }
    else if (channelType === 'triangular') { body.side_slope = parseFloat(chTriSlope); body.depth = parseFloat(chDepth); }
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
      const data: ManningResult = await res.json();
      setManningResult(data);

      const paso5: Paso5Data = {
        tipo_seccion: channelType,
        b_m: channelType === 'rectangular' ? parseFloat(chWidth) : channelType === 'trapezoidal' ? parseFloat(chBottom) : null,
        y_m: parseFloat(chDepth),
        z: channelType === 'trapezoidal' ? parseFloat(chSideSlope) : channelType === 'triangular' ? parseFloat(chTriSlope) : null,
        D_m: channelType === 'circular' ? parseFloat(chDiameter) : null,
        n_manning: manningN,
        pendiente_canal: parseFloat(chSlope),
        q_capacidad_m3s: data.flow_m3s,
        velocidad_ms: data.velocity_ms,
        verifica: data.design_check?.sufficient ?? false,
      };
      updateStep('paso5', paso5);
    } catch (err) {
      setStep5Error(err instanceof Error ? err.message : 'Error en el cálculo Manning.');
    } finally {
      setStep5Loading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!proyecto.paso4 || !proyecto.paso5) return;
    setPdfLoading(true);
    try {
      const blob = await generateProyectoPdf({
        proyectoData: proyecto as unknown as Record<string, unknown>,
        projectName: projName || 'Proyecto Hidráulico',
        comitente,
        profesional,
        fecha,
        notas,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoria_proyecto_${(projName || 'proyecto').replace(/\s+/g, '_').slice(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar el PDF.');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadDocx() {
    if (!proyecto.paso4) return;
    setDocxLoading(true);
    try {
      const blob = await generateDocxReport(proyecto.paso4.result, {
        projectName: projName || 'Proyecto Hidráulico',
        location: proyecto.paso1?.localidad_nombre ?? 'Argentina',
        clientName: comitente,
        language: 'es',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoria_proyecto_${(projName || 'proyecto').replace(/\s+/g, '_').slice(0, 40)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar el Word.');
    } finally {
      setDocxLoading(false);
    }
  }

  function handleSaveProject() {
    const p = saveProject({
      nombre_proyecto: projName,
      comitente,
      profesional,
      fecha,
      notas,
    });
    saveProjectToStorage(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleStep2Continue() {
    if (!selectedTc) return;
    updateStep('paso2', {
      area_km2: areaVal,
      longitud_cauce_km: lengthVal,
      pendiente_media: slopeVal,
      elevation_diff_m: elevDiffVal || null,
      avg_elevation_m: avgElevVal || null,
      coef_escorrentia_C: coefC,
      numero_curva_CN: parseFloat(cn) || 75,
      tc_formula: tcFormula,
      tc_horas: selectedTc.tcHours,
    });
    setStep(3);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <ProgressBar step={step} />

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Page title */}
        {step === 1 && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Modo Proyecto Hidráulico</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
              Diseño integral guiado — de los datos IDF al dimensionamiento del canal
            </p>
          </div>
        )}

        {/* ── Step 1: IDF ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <Card title="Paso 1 — Datos IDF">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Localidad <span className="text-red-400">*</span>
                </label>
                <CitySelector
                  value={localityId}
                  onChange={(id, loc) => {
                    setLocalityId(id);
                    if (loc) setLocality(loc);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Período de retorno (TR)
                </label>
                <PillButtons
                  options={RETURN_PERIODS.map((v) => ({ label: `${v} años`, value: v }))}
                  value={returnPeriod}
                  onChange={setReturnPeriod}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Duración de la tormenta
                </label>
                <PillButtons
                  options={DURATIONS}
                  value={durationMin}
                  onChange={setDurationMin}
                />
              </div>
              {step1Error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {step1Error}
                </div>
              )}
              <NavButtons
                onNext={handleStep1Continue}
                nextDisabled={!localityId}
                loading={step1Loading}
                nextLabel="Verificar IDF y continuar →"
              />
            </div>
          </Card>
        )}

        {/* ── Step 2: Cuenca ──────────────────────────────────────────────── */}
        {step === 2 && (
          <Card title="Paso 2 — Parámetros de cuenca">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Área de la cuenca (A) *" value={area} unit="km²" onChange={setArea} step="0.01" />
                <InputField label="Longitud del cauce (L) *" value={length} unit="km" onChange={setLength} step="0.01" />
                <InputField label="Pendiente media (S) *" value={slope} unit="m/m" onChange={setSlope} step="0.001" />
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Desnivel total (H) <span className="text-gray-400">— para California</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={elevDiff}
                      onChange={(e) => setElevDiff(e.target.value)}
                      placeholder="opcional"
                      min="0"
                      className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0 w-12">m</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Elevación media sobre salida (Hm) <span className="text-gray-400">— para Giandotti</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={avgElev}
                      onChange={(e) => setAvgElev(e.target.value)}
                      placeholder="opcional"
                      min="0"
                      className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0 w-12">m</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Coeficiente de escorrentía (C): <strong>{coefC.toFixed(2)}</strong>
                  </label>
                  <input
                    type="range" min="0.05" max="0.95" step="0.01"
                    value={coefC}
                    onChange={(e) => setCoefC(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                    <span>Permeable 0.05</span><span>Impermeable 0.95</span>
                  </div>
                </div>
                <InputField label="Número de curva (CN)" value={cn} onChange={setCn} step="1" min="40" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Fórmula de Tc adoptada
                </label>
                <select
                  value={tcFormula}
                  onChange={(e) => setTcFormula(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TC_FORMULAS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Tc result preview */}
              {selectedTc ? (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-800 dark:text-blue-300 font-medium">Tc calculado ({selectedTc.formulaName})</span>
                    <span className="font-bold text-blue-900 dark:text-blue-200 text-base">
                      {selectedTc.tcHours.toFixed(3)} h = {selectedTc.tcMinutes.toFixed(1)} min
                    </span>
                  </div>
                </div>
              ) : (
                areaVal > 0 && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                    La fórmula seleccionada requiere datos adicionales (desnivel / elevación media).
                  </div>
                )
              )}

              <NavButtons
                onBack={() => setStep(1)}
                onNext={handleStep2Continue}
                nextDisabled={!selectedTc || areaVal <= 0 || lengthVal <= 0 || slopeVal <= 0}
              />
            </div>
          </Card>
        )}

        {/* ── Step 3: Hietograma ──────────────────────────────────────────── */}
        {step === 3 && (
          <Card title="Paso 3 — Tormenta de diseño (Hietograma)">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Método de distribución temporal</p>
                <div className="space-y-2">
                  {HYETO_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setHyetoMethod(m.id)}
                      className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-all ${
                        hyetoMethod === m.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-slate-600 hover:border-blue-300'
                      }`}
                    >
                      <span className={`font-semibold ${hyetoMethod === m.id ? 'text-blue-800 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                        {m.label}
                        {m.id === 'alternating_blocks' && (
                          <span className="ml-2 text-[10px] font-normal bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Recomendado</span>
                        )}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-slate-400 mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Intervalo de tiempo (Δt)</p>
                <PillButtons
                  options={TIME_STEPS.filter((ts) => ts <= (proyecto.paso1?.duration_min ?? 60) / 4).map((v) => ({ label: `${v} min`, value: v }))}
                  value={deltaT}
                  onChange={setDeltaT}
                />
              </div>

              {/* Mini chart if already generated */}
              {hyetoResult && (
                <div className="rounded-lg border border-gray-200 dark:border-slate-600 p-3 bg-gray-50 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                    Precipitación total: <strong>{hyetoResult.total_depth_mm.toFixed(1)} mm</strong>
                    {' · '}Pico: <strong>{hyetoResult.peak_intensity_mm_hr.toFixed(1)} mm/hr</strong>
                  </p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart
                      data={hyetoResult.times_min.map((t, i) => ({ t, i: hyetoResult.intensities_mm_hr[i] }))}
                      margin={{ top: 2, right: 4, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="t" tick={{ fontSize: 8 }} />
                      <YAxis tick={{ fontSize: 8 }} width={36} />
                      <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} mm/hr`]} labelFormatter={(l) => `t=${l} min`} />
                      <Bar dataKey="i" fill="#2563eb" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {step3Error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {step3Error}
                </div>
              )}

              <NavButtons
                onBack={() => setStep(2)}
                onNext={handleStep3Continue}
                loading={step3Loading}
                nextLabel="Generar hietograma y continuar →"
              />
            </div>
          </Card>
        )}

        {/* ── Step 4: Hidrograma ──────────────────────────────────────────── */}
        {step === 4 && (
          <Card title="Paso 4 — Caudal de diseño (Hidrograma)">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Método de cálculo</p>
                <div className="flex flex-wrap gap-2">
                  {HYDRO_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setHydroMethod(m.id as typeof hydroMethod)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        hydroMethod === m.id
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-blue-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStep4Calculate}
                disabled={step4Loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {step4Loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Calculando…
                  </>
                ) : 'Calcular caudal de diseño'}
              </button>

              {step4Error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {step4Error}
                </div>
              )}

              {hydroResult && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-600 text-white rounded-xl p-4 shadow-sm">
                      <div className="text-xs text-white/70">Q pico (m³/s)</div>
                      <div className="text-3xl font-extrabold mt-1">{hydroResult.peak_flow_m3s.toFixed(3)}</div>
                    </div>
                    <div className={`rounded-xl p-4 shadow-sm border ${RISK_BADGE[hydroResult.risk_level] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                      <div className="text-xs opacity-70">Nivel de riesgo</div>
                      <div className="text-xl font-bold mt-1">{RISK_LABEL[hydroResult.risk_level] ?? hydroResult.risk_level}</div>
                    </div>
                  </div>

                  {/* Transfer banner */}
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 px-4 py-3 flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                        Q de diseño = {hydroResult.peak_flow_m3s.toFixed(3)} m³/s
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                        Se usará automáticamente en el dimensionamiento del canal (paso 5)
                      </p>
                    </div>
                  </div>
                </>
              )}

              <NavButtons
                onBack={() => setStep(3)}
                onNext={() => setStep(5)}
                nextDisabled={!hydroResult}
              />
            </div>
          </Card>
        )}

        {/* ── Step 5: Canal Manning ────────────────────────────────────────── */}
        {step === 5 && (
          <Card title="Paso 5 — Dimensionamiento del canal (Manning)">
            <div className="space-y-4">
              {/* Q design banner */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                Q de diseño pre-cargado: <strong>{proyecto.paso4?.q_pico_m3s.toFixed(3)} m³/s</strong>
              </div>

              {/* Channel type */}
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Tipo de sección</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { type: 'rectangular' as ChannelType, label: 'Rectangular', icon: '▬' },
                    { type: 'trapezoidal' as ChannelType, label: 'Trapezoidal', icon: '⏢' },
                    { type: 'circular' as ChannelType, label: 'Circular', icon: '⬤' },
                    { type: 'triangular' as ChannelType, label: 'Triangular', icon: '▽' },
                  ] as const).map(({ type, label, icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setChannelType(type); setManningResult(null); }}
                      className={`rounded-lg border-2 p-2 text-center transition-all ${
                        channelType === type ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-lg">{icon}</div>
                      <div className={`text-[10px] font-semibold mt-0.5 ${channelType === type ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-slate-400'}`}>
                        {label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cross-section SVG preview */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 border border-gray-200 dark:border-slate-600">
                <ChannelCrossSectionSVG
                  channelType={channelType}
                  depth={parseFloat(chDepth) || 1}
                  width={parseFloat(chWidth) || 2}
                  bottomWidth={parseFloat(chBottom) || 2}
                  sideSlope={parseFloat(chSideSlope) || 1.5}
                  diameter={parseFloat(chDiameter) || 1.2}
                  triSideSlope={parseFloat(chTriSlope) || 2}
                  topWidth={manningResult?.top_width_m}
                  flow={manningResult?.flow_m3s}
                  n={manningN}
                  slope={parseFloat(chSlope) || 0.001}
                />
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                {channelType === 'rectangular' && (
                  <>
                    <InputField label="Ancho (b)" value={chWidth} unit="m" onChange={setChWidth} />
                    <InputField label="Tirante (y)" value={chDepth} unit="m" onChange={setChDepth} />
                  </>
                )}
                {channelType === 'trapezoidal' && (
                  <>
                    <InputField label="Ancho de fondo (b)" value={chBottom} unit="m" onChange={setChBottom} />
                    <InputField label="Tirante (y)" value={chDepth} unit="m" onChange={setChDepth} />
                    <InputField label="Talud (z : 1)" value={chSideSlope} unit="" onChange={setChSideSlope} step="0.1" />
                  </>
                )}
                {channelType === 'circular' && (
                  <>
                    <InputField label="Diámetro (D)" value={chDiameter} unit="m" onChange={setChDiameter} step="0.1" />
                    <InputField label="Tirante (y)" value={chDepth} unit="m" onChange={setChDepth} />
                  </>
                )}
                {channelType === 'triangular' && (
                  <>
                    <InputField label="Talud (z : 1)" value={chTriSlope} unit="" onChange={setChTriSlope} step="0.1" />
                    <InputField label="Tirante (y)" value={chDepth} unit="m" onChange={setChDepth} />
                  </>
                )}
                <InputField label="Pendiente (S)" value={chSlope} unit="m/m" onChange={setChSlope} step="0.0001" />
              </div>

              {/* Manning n */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Rugosidad Manning (n)</label>
                <select
                  value={nPreset}
                  onChange={(e) => {
                    setNPreset(e.target.value);
                    const p = MANNING_PRESETS.find((x) => x.label === e.target.value);
                    if (p && p.n > 0) { setManningN(p.n); setCustomN(String(p.n)); }
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
                >
                  {MANNING_PRESETS.map((p) => (
                    <option key={p.label} value={p.label}>{p.label}{p.n > 0 ? ` — n = ${p.n}` : ''}</option>
                  ))}
                </select>
                {nPreset === 'Personalizado' ? (
                  <input
                    type="number" min={0.005} max={0.2} step={0.001}
                    value={customN}
                    onChange={(e) => { setCustomN(e.target.value); setManningN(parseFloat(e.target.value)); }}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-sm text-blue-800 dark:text-blue-300 font-semibold">
                    n = {manningN}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleStep5Calculate}
                disabled={step5Loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {step5Loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Calculando…
                  </>
                ) : 'Calcular Manning'}
              </button>

              {step5Error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {step5Error}
                </div>
              )}

              {manningResult && (
                <div className={`rounded-xl border p-4 ${manningResult.design_check?.sufficient ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'}`}>
                  <div className={`text-sm font-bold mb-2 ${manningResult.design_check?.sufficient ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    {manningResult.design_check?.sufficient ? '✓ El canal verifica' : '✗ Canal insuficiente'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Q capacidad</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{manningResult.flow_m3s.toFixed(3)} m³/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Q diseño</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{proyecto.paso4?.q_pico_m3s.toFixed(3)} m³/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Velocidad</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{manningResult.velocity_ms.toFixed(3)} m/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Área mojada</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{manningResult.area_m2.toFixed(4)} m²</span>
                    </div>
                  </div>
                  {!manningResult.design_check?.sufficient && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-medium">
                      Ajustá las dimensiones hasta que el canal sea suficiente para continuar.
                    </p>
                  )}
                </div>
              )}

              {manningResult?.warnings && manningResult.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-300 dark:border-amber-700 p-3 space-y-1">
                  {manningResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-300 flex gap-1.5">
                      <span>⚠</span>{w}
                    </p>
                  ))}
                </div>
              )}

              <NavButtons
                onBack={() => setStep(4)}
                onNext={() => setStep(6)}
                nextDisabled={!manningResult?.design_check?.sufficient}
                nextLabel="Continuar al informe →"
              />
            </div>
          </Card>
        )}

        {/* ── Step 6: Informe ──────────────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-4">
            <Card title="Paso 6 — Datos del informe">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nombre del proyecto</label>
                    <input
                      type="text"
                      value={projName}
                      onChange={(e) => setProjName(e.target.value)}
                      placeholder="Ej: Canal pluvial Av. San Martín"
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Comitente / Empresa</label>
                    <input
                      type="text"
                      value={comitente}
                      onChange={(e) => setComitente(e.target.value)}
                      placeholder="Municipalidad de..."
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Profesional responsable</label>
                    <input
                      type="text"
                      value={profesional}
                      onChange={(e) => setProfesional(e.target.value)}
                      placeholder="Ing. ..."
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Notas adicionales</label>
                  <textarea
                    rows={3}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observaciones del proyecto..."
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </Card>

            {/* Project summary */}
            <Card title="Resumen del proyecto">
              <div className="space-y-2 text-sm">
                {proyecto.paso1 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-gray-500 dark:text-slate-400">IDF</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">{proyecto.paso1.localidad_nombre} · TR={proyecto.paso1.return_period} años · {proyecto.paso1.duration_min} min · {proyecto.paso1.intensidad_mm_hr.toFixed(1)} mm/hr</span>
                  </div>
                )}
                {proyecto.paso2 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-gray-500 dark:text-slate-400">Cuenca</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">A={proyecto.paso2.area_km2} km² · S={proyecto.paso2.pendiente_media} · Tc={proyecto.paso2.tc_horas.toFixed(3)} h</span>
                  </div>
                )}
                {proyecto.paso3 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-gray-500 dark:text-slate-400">Hietograma</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">{proyecto.paso3.result.method_label} · P={proyecto.paso3.precipitacion_total_mm.toFixed(1)} mm</span>
                  </div>
                )}
                {proyecto.paso4 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-gray-500 dark:text-slate-400">Caudal de diseño</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">Q = {proyecto.paso4.q_pico_m3s.toFixed(3)} m³/s · {RISK_LABEL[proyecto.paso4.nivel_riesgo] ?? proyecto.paso4.nivel_riesgo}</span>
                  </div>
                )}
                {proyecto.paso5 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 dark:text-slate-400">Canal</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">{proyecto.paso5.tipo_seccion} · Q_cap={proyecto.paso5.q_capacidad_m3s.toFixed(3)} m³/s · V={proyecto.paso5.velocidad_ms.toFixed(2)} m/s ✓</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Download / Save */}
            <Card>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Generar memoria de cálculo consolidada</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0055A4] text-white text-sm font-semibold hover:bg-[#004a91] disabled:opacity-50 transition-colors"
                  >
                    {pdfLoading ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    Descargar PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDocx}
                    disabled={docxLoading || !proyecto.paso4}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {docxLoading ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    Descargar Word
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveProject}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {saved ? '✓ Guardado' : 'Guardar proyecto'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Los proyectos se guardan localmente en este navegador (máximo 5).
                </p>
              </div>
            </Card>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="px-5 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                ← Volver al canal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
