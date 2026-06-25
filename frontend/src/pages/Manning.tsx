import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { generateManningPdf } from '../services/api';
import { ManningEfficiencyCurves } from '../components/manning/ManningEfficiencyCurves';
import { ChannelCrossSectionSVG } from '../components/manning/ChannelCrossSectionSVG';

interface HydroSourceInfo {
  locality: string;
  return_period: number;
  duration_min: number;
  method: string;
}

// METHOD_LABEL is used only for the pre-filled flow info badge (proper names, not translated)
const METHOD_LABEL_EN: Record<string, string> = {
  rational:          'Rational',
  modified_rational: 'Modified Rational',
  scs_cn:            'SCS-CN',
};
const METHOD_LABEL_ES: Record<string, string> = {
  rational:          'Racional',
  modified_rational: 'Racional Mod.',
  scs_cn:            'SCS-CN',
};

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


// ── Regime badge ──────────────────────────────────────────────────────────────

function RegimeBadge({ regime, fr, t }: { regime: string; fr: number | null; t: (key: string) => string }) {
  const styles: Record<string, string> = {
    subcritical: 'bg-blue-100 text-blue-800 border-blue-300',
    critical: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    supercritical: 'bg-red-100 text-red-800 border-red-300',
    a_presion: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  const labelKey: Record<string, string> = {
    subcritical: 'manning.regimeBadges.subcritical',
    critical: 'manning.regimeBadges.critical',
    supercritical: 'manning.regimeBadges.supercritical',
    a_presion: 'manning.regimeBadges.pressure',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${styles[regime] ?? styles.subcritical}`}>
      {labelKey[regime] ? t(labelKey[regime]) : regime}
      {fr !== null && <span className="font-normal opacity-75">Fr = {fr.toFixed(2)}</span>}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? '';

export function Manning() {
  const location = useLocation();
  const routeState = location.state as { prefilledFlow?: number; sourceInfo?: HydroSourceInfo } | null;
  const prefilledFlow = routeState?.prefilledFlow;
  const sourceInfo = routeState?.sourceInfo;

  const [channelType, setChannelType] = useState<ChannelType>('rectangular');

  // Shared
  const [manningN, setManningN] = useState(0.013);
  const [customN, setCustomN] = useState('0.013');
  const [nPreset, setNPreset] = useState('Hormigón liso');
  const [slope, setSlope] = useState('0.001');
  const [liningType, setLiningType] = useState('');
  const [designFlow, setDesignFlow] = useState(() => prefilledFlow != null ? prefilledFlow.toFixed(3) : '');
  const [flowFromCalc, setFlowFromCalc] = useState(!!prefilledFlow);

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

  const { t, i18n } = useTranslation();
  const METHOD_LABEL = i18n.language === 'en' ? METHOD_LABEL_EN : METHOD_LABEL_ES;

  const [result, setResult] = useState<ManningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── Validation: compute missing-fields message for the Calcular button ───
  const slopeNum = parseFloat(slope);
  const hasValidSlope = Number.isFinite(slopeNum) && slopeNum > 0;
  const hasValidN = Number.isFinite(manningN) && manningN > 0;
  const depthNum = parseFloat(depth);
  const diamNum = parseFloat(diameter);
  const validationMessage: string | null = (() => {
    if (!hasValidN) return t('manning.validation.nRequired');
    if (!hasValidSlope) return t('manning.validation.slopeRequired');
    if (channelType === 'rectangular') {
      if (!(parseFloat(width) > 0)) return t('manning.validation.widthRequired');
      if (!(depthNum > 0)) return t('manning.validation.depthRequired');
    } else if (channelType === 'trapezoidal') {
      if (!(parseFloat(bottomWidth) > 0)) return t('manning.validation.bottomWidthRequired');
      if (!(depthNum > 0)) return t('manning.validation.depthRequired');
      if (!(parseFloat(sideSlope) > 0)) return t('manning.validation.sideSlopeRequired');
    } else if (channelType === 'circular') {
      if (!(diamNum > 0)) return t('manning.validation.diameterRequired');
      if (!(depthNum > 0)) return t('manning.validation.depthRequired');
      if (depthNum > diamNum) return t('manning.validation.depthExceedsDiameter');
    } else if (channelType === 'triangular') {
      if (!(parseFloat(triSideSlope) > 0)) return t('manning.validation.trSlopeRequired');
      if (!(depthNum > 0)) return t('manning.validation.depthRequired');
    }
    return null;
  })();
  const calcDisabled = validationMessage !== null;

  function selectPreset(label: string) {
    setNPreset(label);
    const preset = MANNING_PRESETS.find((p) => p.label === label);
    if (preset && preset.n > 0) {
      setManningN(preset.n);
      setCustomN(String(preset.n));
    }
  }

  async function handleDownloadPdf() {
    if (!result) return;
    setPdfLoading(true);
    try {
      const params: Record<string, unknown> = {
        channel_type: channelType,
        manning_n: manningN,
        slope: parseFloat(slope),
        design_flow: designFlow ? parseFloat(designFlow) : null,
        lining_type: liningType || null,
      };
      if (channelType === 'rectangular') { params.width = parseFloat(width); params.depth = parseFloat(depth); }
      else if (channelType === 'trapezoidal') { params.bottom_width = parseFloat(bottomWidth); params.depth = parseFloat(depth); params.side_slope = parseFloat(sideSlope); }
      else if (channelType === 'circular') { params.diameter = parseFloat(diameter); params.depth = parseFloat(depth); }
      else if (channelType === 'triangular') { params.side_slope = parseFloat(triSideSlope); params.depth = parseFloat(depth); }

      const blob = await generateManningPdf({
        params,
        result: result as unknown as Record<string, unknown>,
        projectName: 'Cálculo Hidráulico Manning',
        location: 'Argentina',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoria_hidraulica_manning_${channelType}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar el PDF.');
    } finally {
      setPdfLoading(false);
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
  const channelTypeOptions: { type: ChannelType; label: string; icon: string }[] = [
    { type: 'rectangular', label: t('manning.channels.rectangular'), icon: '▬' },
    { type: 'trapezoidal', label: t('manning.channels.trapezoidal'), icon: '⏢' },
    { type: 'circular', label: t('manning.channels.circular'), icon: '⬤' },
    { type: 'triangular', label: t('manning.channels.triangular'), icon: '▽' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('manning.pageTitle')} — AutoHydro Argentina</title>
        <meta name="description" content={t('manning.subtitle')} />
      </Helmet>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('manning.pageTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Q = (1/n) × A × R<sup>2/3</sup> × S<sup>1/2</sup>
            &nbsp;·&nbsp; {t('manning.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Inputs ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Channel type */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('manning.channelType')}</h2>
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

              {/* Technical cross-section SVG */}
              <div className="mt-4">
                <ChannelCrossSectionSVG
                  channelType={channelType}
                  depth={depthVal || 1}
                  width={widthVal}
                  bottomWidth={bwVal}
                  sideSlope={ssVal}
                  diameter={diamVal}
                  triSideSlope={tssVal}
                  topWidth={result?.top_width_m}
                  flow={result?.flow_m3s}
                  n={manningN}
                  slope={parseFloat(slope) || 0.001}
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('manning.sectionDimensions')}</h2>
              <div className="space-y-3">
                {channelType === 'rectangular' && (
                  <>
                    <Field label={t('manning.fields.width')} value={width} unit="m" onChange={setWidth} />
                    <Field label={t('manning.fields.depth')} value={depth} unit="m" onChange={setDepth} />
                  </>
                )}
                {channelType === 'trapezoidal' && (
                  <>
                    <Field label={t('manning.fields.bottomWidth')} value={bottomWidth} unit="m" onChange={setBottomWidth} />
                    <Field label={t('manning.fields.depth')} value={depth} unit="m" onChange={setDepth} />
                    <Field label={t('manning.fields.sideSlope')} value={sideSlope} unit="" onChange={setSideSlope} step="0.1" />
                  </>
                )}
                {channelType === 'circular' && (
                  <>
                    <Field label={t('manning.fields.diameter')} value={diameter} unit="m" onChange={setDiameter} step="0.1" />
                    <Field label={t('manning.fields.depth')} value={depth} unit="m" onChange={setDepth} />
                  </>
                )}
                {channelType === 'triangular' && (
                  <>
                    <Field label={t('manning.fields.sideSlope')} value={triSideSlope} unit="" onChange={setTriSideSlope} step="0.1" />
                    <Field label={t('manning.fields.depth')} value={depth} unit="m" onChange={setDepth} />
                  </>
                )}
                <Field label={t('manning.fields.slope')} value={slope} unit="m/m" onChange={setSlope} step="0.0001" />
              </div>
            </div>

            {/* Manning n */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('manning.roughness')}</h2>
              <select
                value={nPreset}
                onChange={(e) => selectPreset(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {/* Manning n presets use proper material names — not translated */}
                {['Revestidos', 'Tierra', 'Estructuras', 'Cauces'].map((group) => (
                  <optgroup key={group} label={group}>
                    {MANNING_PRESETS.filter((p) => p.group === group).map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}{p.n > 0 ? ` — n = ${p.n}` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="Personalizado">{t('manning.custom')}</option>
              </select>
              {nPreset === 'Personalizado' ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={customN}
                  onChange={(e) => setCustomN(e.target.value)}
                  onBlur={(e) => {
                    const n = parseFloat(e.target.value);
                    const clamped = Number.isFinite(n) ? Math.min(Math.max(n, 0.005), 0.2) : manningN;
                    setCustomN(String(clamped));
                    setManningN(clamped);
                  }}
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
                {t('manning.materialCard')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
              </h2>
              <p className="text-xs text-gray-500 mb-2">{t('manning.materialHint')}</p>
              <select
                value={liningType}
                onChange={(e) => setLiningType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('manning.lining.none')}</option>
                <option value="hormigon">{t('manning.lining.hormigon')}</option>
                <option value="tierra_arcillosa">{t('manning.lining.tierra_arcillosa')}</option>
                <option value="tierra_limosa">{t('manning.lining.tierra_limosa')}</option>
                <option value="tierra_arenosa">{t('manning.lining.tierra_arenosa')}</option>
                <option value="grava_fina">{t('manning.lining.grava_fina')}</option>
                <option value="grava_gruesa">{t('manning.lining.grava_gruesa')}</option>
                <option value="roca">{t('manning.lining.roca')}</option>
              </select>
            </div>

            {/* Design check (optional) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                {t('manning.designCheck')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
              </h2>
              <p className="text-xs text-gray-500 mb-3">{t('manning.designCheckHint')}</p>

              {flowFromCalc && (
                <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-blue-900 text-xs mb-0.5">
                      {t('manning.flowFromCalcBadge')}
                    </p>
                    {sourceInfo && (
                      <p className="text-xs text-blue-700">
                        Q = {designFlow} m³/s · TR = {sourceInfo.return_period} {t('common.years')} · {sourceInfo.locality}
                        {' · '}{METHOD_LABEL[sourceInfo.method] ?? sourceInfo.method} · {sourceInfo.duration_min} min
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDesignFlow(''); setFlowFromCalc(false); }}
                    className="shrink-0 text-xs font-semibold text-blue-400 hover:text-blue-700 transition-colors whitespace-nowrap"
                  >
                    {t('manning.clearFlow')}
                  </button>
                </div>
              )}

              <Field label={t('manning.designFlow')} value={designFlow} unit="m³/s" onChange={setDesignFlow} step="0.01" required={false} />
            </div>

            {/* Calculate button */}
            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading || calcDisabled}
              aria-disabled={loading || calcDisabled}
              className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm ${
                calcDisabled && !loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  {t('common.calculating')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('manning.calculateBtn')}
                </>
              )}
            </button>
            {calcDisabled && !loading && (
              <p className="text-sm text-amber-600 mt-2 text-center">{validationMessage}</p>
            )}

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
                <p className="font-medium">{t('manning.emptyState')}</p>
                <p className="text-sm mt-1">{t('manning.emptyStateSub')}</p>
              </div>
            )}

            {result && (
              <>
                {/* Main metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label={t('manning.metrics.flow')} value={result.flow_m3s.toFixed(3)} unit="m³/s" color="blue" />
                  <MetricCard label={t('manning.metrics.velocity')} value={result.velocity_ms.toFixed(3)} unit="m/s" color="teal" />
                  <MetricCard label={t('manning.metrics.wetArea')} value={result.area_m2.toFixed(4)} unit="m²" color="indigo" />
                  <MetricCard label={t('manning.metrics.hydraulicRadius')} value={result.hydraulic_radius_m.toFixed(4)} unit="m" color="violet" />
                </div>

                {/* Secondary metrics */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('manning.hydraulicParams')}</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <ParamRow label={t('manning.metrics.wettedPerimeter')} value={`${result.wetted_perimeter_m.toFixed(4)} m`} />
                    {result.top_width_m !== null && (
                      <ParamRow label={t('manning.metrics.waterSurface')} value={`${result.top_width_m.toFixed(4)} m`} />
                    )}
                    <ParamRow label={t('manning.metrics.slope')} value={slope} />
                    <ParamRow label={t('manning.metrics.manningN')} value={String(manningN)} />
                  </div>
                </div>

                {/* Flow regime */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('manning.flowRegime')}</h3>
                  <RegimeBadge regime={result.flow_regime} fr={result.froude} t={t} />
                  <p className="text-xs text-gray-500 mt-2">
                    {result.flow_regime === 'subcritical' && t('manning.regimeSubcritical')}
                    {result.flow_regime === 'critical' && t('manning.regimeCritical')}
                    {result.flow_regime === 'supercritical' && t('manning.regimeSupercritical')}
                    {result.flow_regime === 'a_presion' && t('manning.regimePressure')}
                  </p>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-amber-800">{t('manning.velocityWarnings')}</h3>
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
                      {result.design_check.sufficient ? '✓' : '✗'} {t('manning.designVerification')}
                    </h3>
                    <div className={`grid grid-cols-2 gap-3 text-sm ${
                      result.design_check.sufficient ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <ParamRow label={t('manning.metrics.designQ')} value={`${result.design_check.design_flow_m3s.toFixed(3)} m³/s`} />
                      <ParamRow label={t('manning.metrics.channelCapacity')} value={`${result.design_check.channel_capacity_m3s.toFixed(3)} m³/s`} />
                    </div>
                    <p className={`text-sm font-medium mt-2 ${
                      result.design_check.sufficient ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.design_check.message}
                    </p>
                  </div>
                )}

                {/* Efficiency curves */}
                <ManningEfficiencyCurves
                  channelType={channelType}
                  n={manningN}
                  S={parseFloat(slope) || 0.001}
                  depth={depthVal}
                  width={widthVal}
                  bottomWidth={bwVal}
                  sideSlope={ssVal}
                  diameter={diamVal}
                  triSideSlope={tssVal}
                />

                {/* PDF report button */}
                <div className="flex justify-end">
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
                        {t('manning.generatingPdf')}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('manning.generatePdf')}
                      </>
                    )}
                  </button>
                </div>

                {/* Reference table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('manning.refTable')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1.5 pr-3 text-gray-600 font-medium">{t('manning.refTableHeader.material')}</th>
                          <th className="text-center py-1.5 px-2 text-gray-600 font-medium">{t('manning.refTableHeader.min')}</th>
                          <th className="text-center py-1.5 px-2 text-gray-600 font-medium">{t('manning.refTableHeader.typical')}</th>
                          <th className="text-center py-1.5 px-2 text-gray-600 font-medium">{t('manning.refTableHeader.max')}</th>
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
