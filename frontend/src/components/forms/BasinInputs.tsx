import { useTranslation } from 'react-i18next';
import type { HydrologyInput } from '../../types';

interface Props {
  formData: HydrologyInput;
  onChange: (updates: Partial<HydrologyInput>) => void;
}

interface FieldProps {
  label: string;
  unit?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, unit, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {unit && <span className="ml-1 text-gray-400 font-normal">({unit})</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min,
  step = 'any',
  placeholder,
}: {
  value: number | null | '';
  onChange: (v: number | null) => void;
  min?: number;
  step?: string | number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value === null ? '' : value}
      min={min}
      step={step}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : Number(v));
      }}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  );
}

export function BasinInputs({ formData, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      {/* Location description */}
      <Field label={t('calculator.location')} hint={t('calculator.locationPlaceholder')}>
        <input
          type="text"
          value={formData.location_description}
          placeholder={t('calculator.locationPlaceholder')}
          onChange={(e) => onChange({ location_description: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Area */}
        <Field label={t('calculator.area')} unit={t('calculator.areaUnit')} required>
          <NumInput
            value={formData.area_km2 || ''}
            onChange={(v) => onChange({ area_km2: v ?? 0 })}
            min={0.001}
            step={0.01}
            placeholder="Ej: 2.5"
          />
        </Field>

        {/* Channel length */}
        <Field label={t('calculator.channelLength')} unit={t('calculator.channelLengthUnit')} required>
          <NumInput
            value={formData.length_km || ''}
            onChange={(v) => onChange({ length_km: v ?? 0 })}
            min={0.01}
            step={0.01}
            placeholder="Ej: 3.2"
          />
        </Field>

        {/* Slope */}
        <Field
          label={t('calculator.avgSlope')}
          unit={t('calculator.avgSlopeUnit')}
          required
          hint="Ej: 0.005 = 0.5%"
        >
          <NumInput
            value={formData.slope || ''}
            onChange={(v) => onChange({ slope: v ?? 0 })}
            min={0.0001}
            step="any"
            placeholder="Ej: 0.005"
          />
        </Field>

        {/* Elevation diff (optional — California formula) */}
        <Field
          label={t('calculator.elevationDiff')}
          unit={t('calculator.elevationDiffUnit')}
          hint={`${t('common.optional')} — fórmula California`}
        >
          <NumInput
            value={formData.elevation_diff_m}
            onChange={(v) => onChange({ elevation_diff_m: v })}
            min={0.1}
            step={0.1}
            placeholder="Ej: 45"
          />
        </Field>

        {/* Average elevation (optional — Giandotti formula) */}
        <Field
          label={t('calculator.avgElevation')}
          unit={t('calculator.avgElevationUnit')}
          hint={`${t('common.optional')} — fórmula Giandotti`}
        >
          <NumInput
            value={formData.avg_elevation_m}
            onChange={(v) => onChange({ avg_elevation_m: v })}
            min={0.1}
            step={0.1}
            placeholder="Ej: 120"
          />
        </Field>
      </div>

      {/* Basin size warning */}
      {formData.area_km2 > 0 && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            formData.area_km2 > 50
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : formData.area_km2 > 5
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          {formData.area_km2 <= 5 && (
            <span>Cuenca pequeña (&lt; 5 km²) — Método Racional apropiado.</span>
          )}
          {formData.area_km2 > 5 && formData.area_km2 <= 50 && (
            <span>Cuenca mediana (5–50 km²) — Racional Modificado o SCS-CN recomendado.</span>
          )}
          {formData.area_km2 > 50 && (
            <span>Cuenca grande (&gt; 50 km²) — SCS-CN recomendado. Verificar con modelos distribuidos.</span>
          )}
        </div>
      )}
    </div>
  );
}
