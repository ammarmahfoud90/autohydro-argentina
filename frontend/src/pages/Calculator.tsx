import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { calculateHydrology } from '../services/api';
import { CitySelector } from '../components/forms/CitySelector';
import { BasinInputs } from '../components/forms/BasinInputs';
import { MethodSelector } from '../components/forms/MethodSelector';
import { CNSelector } from '../components/forms/CNSelector';
import { LandUseAssistant } from '../components/forms/LandUseAssistant';
import { TcCalculator } from '../components/forms/TcCalculator';
import { ReportOptions } from '../components/forms/ReportOptions';
import { ResultsPanel } from '../components/results/ResultsPanel';
import { BasinMap } from '../components/map/BasinMap';
import { EngineerChat } from '../components/chat/EngineerChat';
import type { HydrologyInput, HydrologyResult, SoilGroup, LandUseCategory, TcFormulaKey } from '../types';
import { DEFAULT_FORM } from '../types';

const RETURN_PERIODS = [2, 5, 10, 25, 50, 100];
const DURATIONS = [15, 30, 45, 60, 90, 120];
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
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
  const [step, setStep] = useState(1);
  const [basinMode, setBasinMode] = useState<'manual' | 'map'>('manual');
  const [formData, setFormData] = useState<HydrologyInput>(DEFAULT_FORM);
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

  // ── Validation ──────────────────────────────────────────────────────────────

  const step1Valid = !!formData.city;

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

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* ── Step 1: Location ─────────────────────────────────────────── */}
        {step === 1 && (
          <Card title={t('calculator.selectLocation')}>
            <CitySelector
              value={formData.city}
              returnPeriod={formData.return_period}
              duration={formData.duration_min}
              onChange={(city) => update({ city })}
            />

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
                  {RETURN_PERIODS.map((T) => (
                    <option key={T} value={T}>
                      {T} {t('common.years')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('calculator.stormDuration')}
                </label>
                <select
                  value={formData.duration_min}
                  onChange={(e) => update({ duration_min: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} {t('common.minutes')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <NavButtons
              onNext={() => setStep(2)}
              nextDisabled={!step1Valid}
              validationHint={t('validation.cityRequired')}
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
                basinData={{
                  area_km2: formData.area_km2,
                  length_km: formData.length_km,
                  slope: formData.slope,
                  elevation_diff_m: formData.elevation_diff_m,
                  avg_elevation_m: formData.avg_elevation_m,
                }}
                onChange={(formulas: TcFormulaKey[]) => update({ tc_formulas: formulas })}
              />
            </Card>

            <ReportOptions formData={formData} onChange={update} />

            {/* Climate Change Adjustment */}
            <Card title="Ajuste por Cambio Climático (opcional)">
              <p className="text-xs text-gray-500 mb-3">
                Factores basados en proyecciones del <strong>IPCC AR6</strong> y estudios del <strong>CIMA</strong> para Argentina.
                Se aplica sobre la intensidad IDF antes del cálculo de caudal.
              </p>
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => update({
                    climate_scenario: formData.climate_scenario && formData.climate_scenario !== 'none'
                      ? 'none'
                      : 'rcp45',
                    climate_horizon: formData.climate_horizon ?? 2050,
                  })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    formData.climate_scenario && formData.climate_scenario !== 'none'
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    formData.climate_scenario && formData.climate_scenario !== 'none'
                      ? 'translate-x-5'
                      : 'translate-x-0'
                  }`} />
                </button>
                <span className="text-sm font-medium text-gray-700">Considerar cambio climático</span>
              </div>

              {formData.climate_scenario && formData.climate_scenario !== 'none' && (
                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Escenario</label>
                      <select
                        value={formData.climate_scenario}
                        onChange={(e) => update({ climate_scenario: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="rcp45">RCP 4.5 — Escenario moderado</option>
                        <option value="rcp85">RCP 8.5 — Escenario alto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Horizonte temporal</label>
                      <select
                        value={formData.climate_horizon ?? 2050}
                        onChange={(e) => update({ climate_horizon: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={2030}>2030 (corto plazo)</option>
                        <option value={2050}>2050 (mediano plazo)</option>
                        <option value={2100}>2100 (largo plazo)</option>
                      </select>
                    </div>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                    <strong>Factor de ajuste estimado: </strong>
                    {formData.climate_scenario === 'rcp85'
                      ? formData.climate_horizon === 2030 ? '+10–15%'
                        : formData.climate_horizon === 2100 ? '+35–40%'
                        : '+20–25%'
                      : formData.climate_horizon === 2030 ? '+5–10%'
                        : formData.climate_horizon === 2100 ? '+15–20%'
                        : '+10–15%'
                    } sobre la intensidad IDF (varía por región).
                  </div>
                </div>
              )}
            </Card>

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

      {/* Floating AI Engineer Chat — only shown when results are available */}
      {step === 4 && results && <EngineerChat results={results} />}
    </div>
  );
}
