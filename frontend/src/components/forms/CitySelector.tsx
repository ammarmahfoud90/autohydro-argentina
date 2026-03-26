import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IDF_ARGENTINA } from '../../constants/idf-data';
import { calculateIDFIntensity, getCityByName } from '../../constants/idf-data';

interface Props {
  value: string;
  returnPeriod: number;
  duration: number;
  onChange: (city: string) => void;
}

const VERIFIED_CITIES = IDF_ARGENTINA.filter((c) => c.verified);
const ESTIMATED_CITIES = IDF_ARGENTINA.filter((c) => !c.verified);

export function CitySelector({ value, returnPeriod, duration, onChange }: Props) {
  const { t } = useTranslation();
  const selected = getCityByName(value);
  const [pendingCity, setPendingCity] = useState<string | null>(null);

  const preview = selected
    ? calculateIDFIntensity(
        selected,
        Math.min(Math.max(returnPeriod, selected.validRange.TMin), selected.validRange.TMax),
        Math.min(Math.max(duration, selected.validRange.tMin), selected.validRange.tMax),
      )
    : null;

  function handleChange(cityName: string) {
    if (!cityName) { onChange(''); return; }
    const city = getCityByName(cityName);
    if (city && !city.verified) {
      setPendingCity(cityName);
    } else {
      onChange(cityName);
    }
  }

  function confirmEstimated() {
    if (pendingCity) { onChange(pendingCity); }
    setPendingCity(null);
  }

  function cancelEstimated() {
    setPendingCity(null);
  }

  return (
    <div className="space-y-4">
      {/* Warning modal for estimated cities */}
      {pendingCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Datos IDF Estimados</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Los coeficientes IDF para <strong>{pendingCity}</strong> son estimaciones basadas en
                  regionalización y <strong>NO han sido validados</strong> contra registros pluviográficos locales.
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Para proyectos definitivos:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Verificar con datos del SMN o autoridad hídrica provincial</li>
                <li>Consultar estudios hidrológicos locales</li>
                <li>Considerar un margen de seguridad adicional</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelEstimated}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmEstimated}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                Continuar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* City select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('calculator.selectCity')} <span className="text-red-500">*</span>
        </label>
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('calculator.selectCity')}</option>
          <optgroup label="── Datos Verificados (INA/Caamaño Nelli) ──">
            {VERIFIED_CITIES.map((c) => (
              <option key={c.city} value={c.city}>
                ✅ {c.city} · {c.province}
              </option>
            ))}
          </optgroup>
          <optgroup label="── Datos Estimados (requieren validación) ──">
            {ESTIMATED_CITIES.map((c) => (
              <option key={c.city} value={c.city}>
                ⚠️ {c.city} · {c.province}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Selected city info card */}
      {selected && (
        <div className={`rounded-lg border p-4 text-sm space-y-2 ${selected.verified ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${selected.verified ? 'text-blue-800' : 'text-amber-800'}`}>
              {selected.verified ? '✅' : '⚠️'} {selected.city}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${selected.verified ? 'text-blue-600 bg-blue-100' : 'text-amber-700 bg-amber-100'}`}>
              {selected.province}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <span className="font-medium text-gray-700">Coef. IDF:</span>{' '}
              a={selected.a}, b={selected.b}, c={selected.c}, d={selected.d}
            </div>
            <div>
              <span className="font-medium text-gray-700">Rango válido:</span>{' '}
              t={selected.validRange.tMin}–{selected.validRange.tMax} min,{' '}
              T={selected.validRange.TMin}–{selected.validRange.TMax} años
            </div>
          </div>

          <div className="text-xs text-gray-500">
            <span className="font-medium">{t('common.source')}:</span>{' '}
            {selected.verified ? selected.source : `${selected.source} — REQUIERE VALIDACIÓN LOCAL`}
          </div>

          {!selected.verified && (
            <div className="rounded bg-amber-100 border border-amber-300 px-3 py-2 text-xs text-amber-800 font-medium">
              ⚠️ Datos IDF estimados. Para diseños definitivos, verificar con registros locales del SMN/INA.
            </div>
          )}

          {preview !== null && (
            <div className="mt-1 rounded bg-white border border-blue-200 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Intensidad para T={returnPeriod}yr, t={duration}min:
              </span>
              <span className="font-bold text-blue-700 text-base">
                {preview.toFixed(1)} mm/hr
              </span>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 italic">
        {t('results.disclaimer')}
      </p>
    </div>
  );
}
