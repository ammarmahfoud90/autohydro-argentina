import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalities } from '../../services/api';
import type { IDFLocality } from '../../types/idf';

interface Props {
  value: string;
  returnPeriod: number;
  duration: number;
  onChange: (localityId: string) => void;
}

export function CitySelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [localities, setLocalities] = useState<IDFLocality[]>([]);

  useEffect(() => {
    getLocalities().then(setLocalities).catch(console.error);
  }, []);

  const selected = localities.find((l) => l.id === value) ?? null;
  const isShortSeries = selected ? selected.source.series_length_years < 15 : false;

  return (
    <div className="space-y-4">
      {/* Locality select */}
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
          {localities.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} · {loc.province}
            </option>
          ))}
        </select>
      </div>

      {/* Selected locality info card */}
      {selected && (
        <div className={`rounded-lg border p-4 text-sm space-y-2 ${isShortSeries ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${isShortSeries ? 'text-amber-800' : 'text-blue-800'}`}>
              {selected.name}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isShortSeries ? 'text-amber-700 bg-amber-100' : 'text-blue-600 bg-blue-100'}`}>
              {selected.province}
            </span>
          </div>

          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">{t('common.source')}:</span>{' '}
            {selected.source.document}
          </div>

          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">Período:</span>{' '}
            {selected.source.series_period} ({selected.source.series_length_years} años) ·{' '}
            <span className="font-medium text-gray-700">TR máximo confiable:</span>{' '}
            {selected.limitations.max_reliable_return_period} años
          </div>

          {isShortSeries && (
            <div className="rounded bg-amber-100 border border-amber-300 px-3 py-2 text-xs text-amber-800 font-medium">
              Serie corta ({selected.source.series_length_years} años) — datos orientativos.
              Verificar con la autoridad hídrica provincial para diseños definitivos.
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
