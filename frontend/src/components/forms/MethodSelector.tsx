import { useTranslation } from 'react-i18next';
import type { HydroMethod, HydrologyInput, InfrastructureType } from '../../types';

interface Props {
  formData: HydrologyInput;
  onChange: (updates: Partial<HydrologyInput>) => void;
}

const METHODS: { key: HydroMethod; i18nKey: string; descKey: string }[] = [
  { key: 'rational', i18nKey: 'calculator.rational', descKey: 'calculator.rational_desc' },
  { key: 'modified_rational', i18nKey: 'calculator.modified_rational', descKey: 'calculator.modified_rational_desc' },
  { key: 'scs_cn', i18nKey: 'calculator.scs_cn', descKey: 'calculator.scs_cn_desc' },
];

const INFRA_TYPES: InfrastructureType[] = [
  'alcantarilla_menor',
  'alcantarilla_mayor',
  'puente_menor',
  'puente_mayor',
  'canal_urbano',
  'canal_rural',
  'defensa_costera',
];

export function MethodSelector({ formData, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      {/* Method cards */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('calculator.methodTitle')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {METHODS.map(({ key, i18nKey, descKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ method: key })}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                formData.method === key
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div
                className={`font-semibold text-sm mb-1 ${
                  formData.method === key ? 'text-blue-700' : 'text-gray-800'
                }`}
              >
                {formData.method === key && (
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1.5 mb-0.5" />
                )}
                {t(i18nKey)}
              </div>
              <p className="text-xs text-gray-500 leading-snug">{t(descKey)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Runoff coefficient — Rational methods */}
      {(formData.method === 'rational' || formData.method === 'modified_rational') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('calculator.runoffCoefficient')} (C) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.05}
              max={1.0}
              step={0.01}
              value={formData.runoff_coeff ?? 0.6}
              onChange={(e) => onChange({ runoff_coeff: Number(e.target.value) })}
              className="flex-1 accent-blue-600"
            />
            <input
              type="number"
              min={0.05}
              max={1.0}
              step={0.01}
              value={formData.runoff_coeff ?? 0.6}
              onChange={(e) => onChange({ runoff_coeff: Number(e.target.value) })}
              className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">{t('calculator.runoffCoefficientHint')}</p>

          {/* Quick C reference */}
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
            {[
              { label: 'Rural / pasturas', value: 0.25 },
              { label: 'Residencial', value: 0.50 },
              { label: 'Comercial/mixto', value: 0.70 },
              { label: 'Impermeable', value: 0.90 },
            ].map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ runoff_coeff: value })}
                className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {label}
                <span className="block font-semibold">C = {value}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pampa lambda option for SCS */}
      {formData.method === 'scs_cn' && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <input
            type="checkbox"
            id="pampa_lambda"
            checked={formData.use_pampa_lambda}
            onChange={(e) => onChange({ use_pampa_lambda: e.target.checked })}
            className="mt-0.5 accent-yellow-600"
          />
          <label htmlFor="pampa_lambda" className="text-sm text-yellow-800 cursor-pointer">
            <span className="font-semibold">Usar λ = 0.05 (Pampa Húmeda)</span>
            <p className="text-xs mt-0.5 font-normal">
              Reemplaza la abstracción inicial estándar λ=0.20 por λ=0.05, apropiado para
              suelos de baja pendiente con alta humedad antecedente (recomendado para región pampeana).
            </p>
          </label>
        </div>
      )}

      {/* Infrastructure type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('calculator.infrastructureType')} <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.infrastructure_type}
          onChange={(e) => onChange({ infrastructure_type: e.target.value as InfrastructureType })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {INFRA_TYPES.map((it) => (
            <option key={it} value={it}>
              {t(`infrastructure.${it}`)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Determina los umbrales de clasificación de riesgo hidrológico.
        </p>
      </div>
    </div>
  );
}
