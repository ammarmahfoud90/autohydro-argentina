import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { calculateHydrology, getLocality } from '../services/api';
import { CitySelector } from '../components/forms/CitySelector';
import { ManualIDFInput } from '../components/forms/ManualIDFInput';
import { BasinInputs } from '../components/forms/BasinInputs';
import { MethodSelector } from '../components/forms/MethodSelector';
import { CNSelector } from '../components/forms/CNSelector';
import { LandUseAssistant } from '../components/forms/LandUseAssistant';
import { TcCalculator } from '../components/forms/TcCalculator';
import { ReportOptions } from '../components/forms/ReportOptions';
import { ResultsPanel } from '../components/results/ResultsPanel';
import { BasinMap } from '../components/map/BasinMap';
import type { HydrologyInput, HydrologyResult, SoilGroup, LandUseCategory, TcFormulaKey, ManualIDFTable, ManualIDFFormula } from '../types';
import type { IDFLocality } from '../types/idf';
import { DEFAULT_FORM } from '../types';
import { calculateAllTc } from '../constants/tc-formulas';

const RETURN_PERIODS = [2, 5, 10, 25, 50, 100];
const TOTAL_STEPS = 4;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && err.message.toLowerCase().includes('fetch');
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  current: number;
}

function StepIndicator({ current }: StepIndicatorProps) {
  const { t } = useTranslation();
  const steps = [
    t('steps.location'),
    t('steps.basin'),
    t('steps.parameters'),
    t('steps.results'),
  ];
  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-0">
          {steps.map((label, idx) => {
            const num = idx + 1;
            const done = current > num;
            const active = current === num;
            return (
              <div key={num} className="flex items-center flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      done
                        ? 'bg-green-500 text-white'
                        : active
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {done ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block truncate ${
                      active ? 'text-blue-700' : done ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {num < TOTAL_STEPS && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      done ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {title && <h2 className="text-lg font-bold text-gray-800 mb-5">{title}</h2>}
      {children}
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  loading,
  validationHint,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  validationHint?: string;
}) {
  const { t } = useTranslation();
  const [triedNext, setTriedNext] = useState(false);

  function handleNext() {
    if (nextDisabled) {
      setTriedNext(true);
      return;
    }
    setTriedNext(false);
    onNext?.();
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-100">
      {triedNext && nextDisabled && validationHint && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
          {validationHint}
        </p>
      )}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:invisible transition-colors"
        >
          {t('common.back')}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            nextDisabled && !loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
          }`}
        >
          {loading && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {nextLabel ?? t('common.continue')}
        </button>
      </div>
    </div>
  );
}

// Fullscreen overlay while calculation is running
function CalculatingOverlay() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
        <svg className="animate-spin w-10 h-10 text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <div className="text-center">
          <p className="font-semibold text-gray-800">{t('common.calculating')}</p>
          <p className="text-sm text-gray-500 mt-1">Procesando cálculo hidrológico…</p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Calculator() {
  const { t } = useTranslation();
  const location = useLocation();
  const caseStudyData = location.state?.caseStudyData as HydrologyInput | undefined;
  const caseStudyName = location.state?.caseStudyName as string | undefined;
  const [step, setStep] = useState(1);
  const [basinMode, setBasinMode] = useState<'manual' | 'map'>('manual');
  const [formData, setFormData] = useState<HydrologyInput>(caseStudyData ?? DEFAULT_FORM);
  const [selectedLocality, setSelectedLocality] = useState<IDFLocality | null>(null);
  const [results, setResults] = useState<HydrologyResult | null>(null);
  const [basinPolygon, setBasinPolygon] = useState<[number, number][] | undefined>(undefined);

  // Scroll to top whenever the step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const update = (updates: Partial<HydrologyInput>) =>
    setFormData((prev) => ({ ...prev, ...updates }));

  const mutation = useMutation({
    mutationFn: calculateHydrology,
    onSuccess: (data) => {
      setResults(data);
      setStep(4);
    },
  });

  const handleCalculate = () => {
    mutation.mutate(formData);
  };

  // Fetch full locality detail to get stations (used for dit_tucuman)
  const isTucuman = formData.locality_id === 'tucuman_estaciones';
  const { data: tucumanLocality } = useQuery({
    queryKey: ['locality', 'tucuman_estaciones'],
    queryFn: () => getLocality('tucuman_estaciones'),
    enabled: isTucuman,
    staleTime: Infinity,
  });
  const tucumanStations: Record<string, { name: string }> =
    (tucumanLocality as any)?.stations ?? {};

  // ── Locality-derived constraints ────────────────────────────────────────────

  const isManualLocality = formData.locality_id === 'manual';
  const validTrMax = selectedLocality?.valid_tr_max ?? 100;
  const validTrMin = selectedLocality?.valid_tr_min ?? 2;
  const availableTRs = selectedLocality
    ? RETURN_PERIODS.filter((tr) => tr >= validTrMin && tr <= validTrMax)
    : RETURN_PERIODS;
  const durationMin = selectedLocality?.valid_duration_min ?? 5;
  const durationMax = selectedLocality?.valid_duration_max ?? 1440;

  // ── Validation ──────────────────────────────────────────────────────────────
  const step1Valid =
    !!formData.locality_id &&
    (!isManualLocality || (!!formData.manual_idf_table || !!formData.manual_idf_formula)) &&
    (!isTucuman || !!formData.station_id);

  const step2Valid =
    formData.area_km2 > 0 && formData.length_km > 0 && formData.slope > 0;

  const step2Hint = (() => {
    const missing: string[] = [];
    if (!(formData.area_km2 > 0)) missing.push('área de cuenca');
    if (!(formData.length_km > 0)) missing.push('longitud del cauce');
    if (!(formData.slope > 0)) missing.push('pendiente media');
    return missing.length ? `Completá: ${missing.join(', ')}.` : '';
  })();

  const step3Valid = (() => {
    if (!formData.tc_adopted_formula) return false;
    if (formData.method === 'rational' || formData.method === 'modified_rational') {
      return (formData.runoff_coeff ?? 0) > 0;
    }
    if (formData.method === 'scs_cn') {
      const pct = formData.land_use_categories.reduce((s, c) => s + c.area_percent, 0);
      return formData.land_use_categories.length > 0 && Math.abs(pct - 100) < 1;
    }
    return true;
  })();

  const step3Hint = (() => {
    if (!formData.tc_adopted_formula)
      return 'Seleccioná una fórmula de Tc adoptada para el diseño.';
    if (formData.method === 'rational' || formData.method === 'modified_rational') {
      return 'Ingresá un coeficiente de escorrentía C > 0.';
    }
    if (formData.method === 'scs_cn') {
      const pct = formData.land_use_categories.reduce((s, c) => s + c.area_percent, 0);
      if (formData.land_use_categories.length === 0)
        return t('validation.cnCategoriesRequired');
      if (Math.abs(pct - 100) >= 1)
        return `${t('validation.cnPercent')} — actual: ${pct.toFixed(1)}%`;
    }
    return '';
  })();

  // ── Error message ───────────────────────────────────────────────────────────

  const errorMessage = mutation.isError
    ? isNetworkError(mutation.error)
      ? t('errors.networkError')
      : `${t('errors.calculationFailed')}: ${
          mutation.error instanceof Error ? mutation.error.message : String(mutation.error)
        }`
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {mutation.isPending && <CalculatingOverlay />}

      <StepIndicator current={step} />

      {caseStudyName && (
        <div className="bg-[#0055A4] text-white px-4 py-2.5 flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0 text-[#74ACDF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm">
            <span className="font-semibold">Caso de estudio cargado:</span>{' '}
            <span className="text-blue-200">{caseStudyName}</span>
            {' — '}
            <span className="text-blue-200 text-xs">Modificá los parámetros según tu proyecto</span>
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* ── Step 1: Location ─────────────────────────────────────────── */}
        {step === 1 && (
          <Card title={t('calculator.selectLocation')}>
            <CitySelector
              value={formData.locality_id}
              onChange={(localityId, locality) => {
                setSelectedLocality(locality ?? null);
                const maxTR = locality?.valid_tr_max ?? 100;
                const minTR = locality?.valid_tr_min ?? 2;
                const validTRs = RETURN_PERIODS.filter((tr) => tr >= minTR && tr <= maxTR);
                const newReturnPeriod =
                  validTRs.includes(formData.return_period)
                    ? formData.return_period
                    : validTRs[validTRs.length - 1] ?? formData.return_period;
                update({
                  locality_id: localityId,
                  manual_idf_table: null,
                  manual_idf_formula: null,
                  station_id: null,
                  return_period: newReturnPeriod,
                });
              }}
            />

            {/* Manual IDF input — shown when "manual" is selected */}
            {isManualLocality && (
              <>
                <ManualIDFInput
                  onConfirm={(table: ManualIDFTable | null, formula: ManualIDFFormula | null) =>
                    update({ manual_idf_table: table, manual_idf_formula: formula })
                  }
                />
                {(formData.manual_idf_table || formData.manual_idf_formula) && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                      Datos IDF confirmados. Fuente:{' '}
                      <em>
                        {formData.manual_idf_table?.source ?? formData.manual_idf_formula?.source}
                      </em>
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Tucumán station selector — required for dit_tucuman model */}
            {isTucuman && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Estación pluviográfica <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.station_id ?? ''}
                  onChange={(e) => update({ station_id: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar estación más cercana a la cuenca</option>
                  {Object.entries(tucumanStations).map(([id, s]) => (
                    <option key={id} value={id}>{s.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Seleccioná la estación geográficamente más próxima a tu área de estudio.
                  Red EEAOC + DRH + SMN — Tesis doctoral Bazzano 2019 (UNT-FACET).
                </p>
              </div>
            )}

            {formData.locality_id === 'el_colorado' && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800">
                <strong>Datos orientativos — serie de 7 años.</strong> El Colorado (Formosa) tiene
                el período de registro más corto de las tres localidades. Los valores IDF son
                orientativos y deben verificarse con la autoridad hídrica provincial antes de
                usarse en diseños definitivos.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('calculator.returnPeriod')}
                </label>
                <select
                  value={formData.return_period}
                  onChange={(e) => update({ return_period: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableTRs.map((T) => (
                    <option key={T} value={T}>
                      {T} {t('common.years')}
                    </option>
                  ))}
                </select>
              </div>
              {selectedLocality && formData.return_period > validTrMax && (
                <div className="col-span-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <strong>TR = {formData.return_period} años — fuera del rango confiable.</strong>{' '}
                  Este modelo tiene resultados confiables solo hasta TR = {validTrMax} años.
                  Seleccioná un TR ≤ {validTrMax} para diseños definitivos.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('calculator.stormDuration')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.duration_min}
                    onChange={(e) => {
                      const val = Math.round(Number(e.target.value));
                      if (val >= durationMin && val <= durationMax) update({ duration_min: val });
                    }}
                    min={durationMin}
                    max={durationMax}
                    step={1}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">{t('common.minutes')}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Rango válido: {durationMin} – {durationMax} min
                </p>
                {durationMin >= 60 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                    Este modelo no tiene datos para duraciones menores a {durationMin} min.
                  </p>
                )}
              </div>
            </div>

            <NavButtons
              onNext={() => setStep(2)}
              nextDisabled={!step1Valid}
              validationHint={
                !formData.locality_id
                  ? t('validation.cityRequired')
                  : isManualLocality && !formData.manual_idf_table && !formData.manual_idf_formula
                    ? 'Confirmá los datos IDF antes de continuar.'
                    : ''
              }
            />
          </Card>
        )}

        {/* ── Step 2: Basin ────────────────────────────────────────────── */}
        {step === 2 && (
          <Card title={t('calculator.basinTitle')}>
            {/* Input mode toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setBasinMode('manual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  basinMode === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Ingresar manualmente
              </button>
              <button
                type="button"
                onClick={() => setBasinMode('map')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  basinMode === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Dibujar en mapa
              </button>
            </div>

            {/* Map mode: polygon drawing with area calculation */}
            {basinMode === 'map' && (
              <div className="mb-5">
                <BasinMap
                  onUseData={(d) => {
                    update({
                      area_km2: d.area_km2,
                      ...(d.slope != null ? { slope: d.slope } : {}),
                      ...(d.length_km != null ? { length_km: d.length_km } : {}),
                    });
                    if (d.polygon) setBasinPolygon(d.polygon);
                  }}
                />
              </div>
            )}

            <BasinInputs formData={formData} onChange={update} />
            <NavButtons
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextDisabled={!step2Valid}
              validationHint={step2Hint}
            />
          </Card>
        )}

        {/* ── Step 3: Parameters ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <Card title={t('calculator.methodTitle')}>
              <MethodSelector formData={formData} onChange={update} />
            </Card>

            {formData.method === 'scs_cn' && (
              <Card title="Número de Curva (CN)">
                <div className="space-y-5">
                  <LandUseAssistant
                    soilGroup={formData.soil_group}
                    onApply={(cats: LandUseCategory[], sg: SoilGroup) =>
                      update({ land_use_categories: cats, soil_group: sg })
                    }
                  />
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span>o ingresá manualmente</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <CNSelector
                    categories={formData.land_use_categories}
                    soilGroup={formData.soil_group}
                    onChange={(cats: LandUseCategory[], sg: SoilGroup) =>
                      update({ land_use_categories: cats, soil_group: sg })
                    }
                  />
                </div>
              </Card>
            )}

            <Card title={t('calculator.tcFormulas')}>
              <TcCalculator
                selectedFormulas={formData.tc_formulas}
                adoptedFormula={formData.tc_adopted_formula}
                basinData={{
                  area_km2: formData.area_km2,
                  length_km: formData.length_km,
                  slope: formData.slope,
                  elevation_diff_m: formData.elevation_diff_m,
                  avg_elevation_m: formData.avg_elevation_m,
                }}
                onChange={(formulas: TcFormulaKey[]) => update({ tc_formulas: formulas })}
                onAdoptedChange={(f: TcFormulaKey) => update({ tc_adopted_formula: f })}
              />

              {/* Fix 3 — Duration vs Tc warning */}
              {(() => {
                if (!(formData.area_km2 > 0 && formData.length_km > 0 && formData.slope > 0)) return null;
                if (!formData.tc_adopted_formula) return null;
                const tcResults = calculateAllTc({
                  L_m: formData.length_km * 1000,
                  L_km: formData.length_km,
                  S: formData.slope,
                  A_km2: formData.area_km2,
                  H_m: formData.elevation_diff_m ?? undefined,
                  Hm_m: formData.avg_elevation_m ?? undefined,
                }, formData.tc_formulas);
                const adopted = tcResults.find(r => r.formula === formData.tc_adopted_formula);
                if (!adopted) return null;
                const tcMin = adopted.tcMinutes;
                if (formData.duration_min >= tcMin * 0.9) return null;
                return (
                  <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-semibold">Duración de tormenta menor al Tc</p>
                        <p className="text-xs mt-1">
                          La duración seleccionada (<strong>{formData.duration_min} min</strong>) es menor al tiempo de concentración calculado (<strong>Tc = {tcMin.toFixed(0)} min</strong>). En el Método Racional, la duración de diseño debe ser igual al Tc para obtener el caudal pico máximo. Con t &lt; Tc se sobreestima el caudal. Se recomienda usar t = Tc como duración de diseño.
                        </p>
                        <button
                          type="button"
                          onClick={() => update({ duration_min: Math.round(tcMin) })}
                          className="mt-2 px-3 py-1 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                        >
                          Usar Tc como duración ({Math.round(tcMin)} min)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Fix 6 — CN tables origin note */}
            {formData.method === 'scs_cn' && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                <strong>Nota sobre tablas CN:</strong> Las tablas de CN provienen del manual USDA-SCS (NEH-4, 1972), desarrolladas para suelos de EE.UU. No existe actualmente un estándar nacional de CN para Argentina. Se recomienda al proyectista verificar con datos locales cuando estén disponibles y aplicar criterio profesional en la selección.
              </div>
            )}

            <ReportOptions formData={formData} onChange={update} />

            {errorMessage && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <NavButtons
              onBack={() => setStep(2)}
              onNext={handleCalculate}
              nextLabel={mutation.isPending ? t('common.calculating') : t('common.calculate')}
              nextDisabled={!step3Valid}
              loading={mutation.isPending}
              validationHint={step3Hint}
            />
          </div>
        )}

        {/* ── Step 4: Results ──────────────────────────────────────────── */}
        {step === 4 && results && (
          <ResultsPanel
            results={results}
            formData={formData}
            basinPolygon={basinPolygon}
            onBack={() => setStep(3)}
            onNewCalculation={() => {
              setStep(1);
              setResults(null);
              setFormData(DEFAULT_FORM);
              setBasinPolygon(undefined);
            }}
          />
        )}
      </div>

    </div>
  );
}
