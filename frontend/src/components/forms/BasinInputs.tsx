import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HydrologyInput } from '../../types';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-3 text-sm shadow-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

// Allow only characters that can appear in a positive decimal number.
const DECIMAL_RE = /^\d*\.?\d*$/;

interface Props {
  formData: HydrologyInput;
  onChange: (updates: Partial<HydrologyInput>) => void;
}

interface FieldProps {
  id?: string;
  label: string;
  unit?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ id, label, unit, required, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {unit && <span className="ml-1 text-gray-400 font-normal">({unit})</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/** Convert a number/null to a display string. 0 shows as empty so the placeholder is visible. */
function numToStr(v: number | null | undefined): string {
  if (v == null || v === 0) return '';
  return String(v);
}

function useNumberDraft(external: number | null, emptyValue: number | null) {
  const [draft, setDraft] = useState({ text: numToStr(external), applied: external });
  const text = draft.applied === external ? draft.text : numToStr(external);
  function setText(raw: string) {
    const n = parseFloat(raw);
    const applied = raw.endsWith('.') ? external : raw === '' || !Number.isFinite(n) ? emptyValue : n;
    setDraft({ text: raw, applied });
  }
  return [text, setText] as const;
}

export function BasinInputs({ formData, onChange }: Props) {
  const { t } = useTranslation();

  // Keep partially typed decimals while reflecting external form resets.
  const [area, setArea] = useNumberDraft(formData.area_km2, 0);
  const [length, setLength] = useNumberDraft(formData.length_km, 0);
  const [slope, setSlope] = useNumberDraft(formData.slope, 0);
  const [elevDiff, setElevDiff] = useNumberDraft(formData.elevation_diff_m, null);
  const [avgElev, setAvgElev] = useNumberDraft(formData.avg_elevation_m, null);

  // ── Generic handlers ───────────────────────────────────────────────────────

  /**
   * Build an onChange handler for a decimal text input.
   * - Rejects characters that can never form a valid decimal.
   * - Updates local string state immediately (so the user sees what they type).
   * - Pushes a numeric value to the parent only for complete numbers (not "0.", "").
   */
  function handleChange(
    setter: (s: string) => void,
    parentUpdate: (n: number | null) => void,
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Reject anything that isn't a valid partial decimal (letters, multiple dots…)
      if (raw !== '' && !DECIMAL_RE.test(raw)) return;

      setter(raw);

      if (raw === '') {
        parentUpdate(null);
      } else if (!raw.endsWith('.')) {
        // Only push complete numbers; "0.", "0.0" etc. are valid intermediate states.
        const n = parseFloat(raw);
        if (!isNaN(n)) {
            parentUpdate(n);
        }
      }
      // Intermediate states ("0.", "0.0", …) do NOT call parentUpdate —
      // there's nothing to report yet, and the display is controlled by local state.
    };
  }

  /**
   * Build an onBlur handler that normalises the displayed string and ensures the
   * parent has the final numeric value (handles the "0." → 0 case on blur).
   */
  function handleBlur(
    setter: (s: string) => void,
    parentUpdate: (n: number | null) => void,
  ) {
    return (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const n = parseFloat(raw);
      if (raw === '' || isNaN(n)) {
        setter('');
        parentUpdate(null);
      } else {
        setter(String(n));        // normalise e.g. "0.0035 " → "0.0035"
        parentUpdate(n);
      }
    };
  }

  return (
    <div className="space-y-5">
      {/* Location description */}
      <Field id="basin-location" label={t('calculator.location')} hint={t('calculator.locationPlaceholder')}>
        <input
          id="basin-location"
          type="text"
          value={formData.location_description}
          placeholder={t('calculator.locationPlaceholder')}
          onChange={(e) => onChange({ location_description: e.target.value })}
          className={INPUT_CLASS}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Area */}
        <Field id="basin-area" label={t('calculator.area')} unit={t('calculator.areaUnit')} required>
          <input
            id="basin-area"
            type="text"
            inputMode="decimal"
            value={area}
            placeholder="Ej: 2.5"
            onChange={handleChange(setArea, (n) => onChange({ area_km2: n ?? 0 }))}
            onBlur={handleBlur(setArea, (n) => onChange({ area_km2: n ?? 0 }))}
            className={INPUT_CLASS}
          />
        </Field>

        {/* Channel length */}
        <Field id="basin-length" label={t('calculator.channelLength')} unit={t('calculator.channelLengthUnit')} required>
          <input
            id="basin-length"
            type="text"
            inputMode="decimal"
            value={length}
            placeholder="Ej: 3.2"
            onChange={handleChange(setLength, (n) => onChange({ length_km: n ?? 0 }))}
            onBlur={handleBlur(setLength, (n) => onChange({ length_km: n ?? 0 }))}
            className={INPUT_CLASS}
          />
        </Field>

        {/* Slope — the field that triggered this rewrite */}
        <Field
          id="basin-slope"
          label={t('calculator.avgSlope')}
          unit={t('calculator.avgSlopeUnit')}
          required
          hint="Ej: 0.005 = 0.5%"
        >
          <input
            id="basin-slope"
            type="text"
            inputMode="decimal"
            value={slope}
            placeholder="Ej: 0.005"
            onChange={handleChange(setSlope, (n) => onChange({ slope: n ?? 0 }))}
            onBlur={handleBlur(setSlope, (n) => onChange({ slope: n ?? 0 }))}
            className={INPUT_CLASS}
          />
        </Field>

        {/* Elevation difference (optional — California formula) */}
        <Field
          id="basin-elev-diff"
          label={t('calculator.elevationDiff')}
          unit={t('calculator.elevationDiffUnit')}
          hint={`${t('common.optional')} — fórmula California`}
        >
          <input
            id="basin-elev-diff"
            type="text"
            inputMode="decimal"
            value={elevDiff}
            placeholder="Ej: 45"
            onChange={handleChange(setElevDiff, (n) => onChange({ elevation_diff_m: n }))}
            onBlur={handleBlur(setElevDiff, (n) => onChange({ elevation_diff_m: n }))}
            className={INPUT_CLASS}
          />
        </Field>

        {/* Average elevation (optional — Giandotti formula) */}
        <Field
          id="basin-avg-elev"
          label={t('calculator.avgElevation')}
          unit={t('calculator.avgElevationUnit')}
          hint={`${t('common.optional')} — fórmula Giandotti`}
        >
          <input
            id="basin-avg-elev"
            type="text"
            inputMode="decimal"
            value={avgElev}
            placeholder="Ej: 120"
            onChange={handleChange(setAvgElev, (n) => onChange({ avg_elevation_m: n }))}
            onBlur={handleBlur(setAvgElev, (n) => onChange({ avg_elevation_m: n }))}
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      {/* Basin size advisory */}
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
            <span>
              Cuenca grande (&gt; 50 km²) — SCS-CN recomendado. Verificar con modelos distribuidos.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
