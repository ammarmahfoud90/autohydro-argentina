import { useTranslation } from 'react-i18next';
import { IDF_ARGENTINA } from '../../constants/idf-data';
import { calculateIDFIntensity, getCityByName } from '../../constants/idf-data';

interface Props {
  value: string;
  returnPeriod: number;
  duration: number;
  onChange: (city: string) => void;
}

// Group cities by province for a cleaner select
const CITIES_BY_PROVINCE = IDF_ARGENTINA.reduce<Record<string, typeof IDF_ARGENTINA>>(
  (acc, city) => {
    (acc[city.province] ??= []).push(city);
    return acc;
  },
  {},
);

export function CitySelector({ value, returnPeriod, duration, onChange }: Props) {
  const { t } = useTranslation();
  const selected = getCityByName(value);

  // Preview intensity for selected city
  const preview = selected
    ? calculateIDFIntensity(
        selected,
        Math.min(Math.max(returnPeriod, selected.validRange.TMin), selected.validRange.TMax),
        Math.min(Math.max(duration, selected.validRange.tMin), selected.validRange.tMax),
      )
    : null;

  return (
    <div className="space-y-4">
      {/* City select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('calculator.selectCity')} <span className="text-red-500">*</span>
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('calculator.selectCity')}</option>
          {Object.entries(CITIES_BY_PROVINCE).map(([province, cities]) => (
            <optgroup key={province} label={province}>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Selected city info card */}
      {selected && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-800">{selected.city}</span>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
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
            <span className="font-medium">{t('common.source')}:</span> {selected.source}
          </div>

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
