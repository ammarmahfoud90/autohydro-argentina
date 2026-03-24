import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { HydrologyInput } from '../../types';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

// Allow only characters that can appear in a positive decimal number.
const DECIMAL_RE = /^\d*\.?\d*$/;

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

/** Convert a number/null to a display string. 0 shows as empty so the placeholder is visible. */
function numToStr(v: number | null | undefined): string {
  if (v == null || v === 0) return '';
  return String(v);
}

export function BasinInputs({ formData, onChange }: Props) {
  const { t } = useTranslation();

  // ── Local string state (source of truth for what the user sees) ───────────
  // These are NEVER overwritten by re-renders from the parent — the parent's
  // numeric values are only used to initialise on mount and to handle external
  // resets (e.g. "New Calculation").
  const [area, setArea] = useState(() => numToStr(formData.area_km2));
  const [length, setLength] = useState(() => numToStr(formData.length_km));
  const [slope, setSlope] = useState(() => numToStr(formData.slope));
  const [elevDiff, setElevDiff] = useState(() => numToStr(formData.elevation_diff_m));
  const [avgElev, setAvgElev] = useState(() => numToStr(formData.avg_elevation_m));

  // Flag: did the LAST formData change come from our own onChange call?
  // If yes, skip syncing local strings from the parent (the user is typing).
  // If no (external reset), sync so the form shows the reset values.
  const isOwnChange = useRef(false);

  useEffect(() => {
    if (!isOwnChange.current) {
      // External change — resync display strings from parent (e.g. form reset).
      setArea(numToStr(formData.area_km2));
      setLength(numToStr(formData.length_km));
      setSlope(numToStr(formData.slope));
      setElevDiff(numToStr(formData.elevation_diff_m));
      setAvgElev(numToStr(formData.avg_elevation_m));
    }
    isOwnChange.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.area_km2, formData.length_km, formData.slope, formData.elevation_diff_m, formData.avg_elevation_m]);

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
        isOwnChange.current = true;
        parentUpdate(null);
      } else if (!raw.endsWith('.')) {
        // Only push complete numbers; "0.", "0.0" etc. are valid intermediate states.
        const n = parseFloat(raw);
        if (!isNaN(n)) {
          isOwnChange.current = true;
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
        isOwnChange.current = true;
        parentUpdate(null);
      } else {
        setter(String(n));        // normalise e.g. "0.0035 " → "0.0035"
        isOwnChange.current = true;
        parentUpdate(n);
      }
    };
  }

  return (
    <div className="space-y-5">
      {/* Location description */}
      <Field label={t('calculator.location')} hint={t('calculator.locationPlaceholder')}>
        <input
          type="text"
          value={formData.location_description}
          placeholder={t('calculator.locationPlaceholder')}
          onChange={(e) => onChange({ location_description: e.target.value })}
          className={INPUT_CLASS}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Area */}
        <Field label={t('calculator.area')} unit={t('calculator.areaUnit')} required>
          <input
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
        <Field label={t('calculator.channelLength')} unit={t('calculator.channelLengthUnit')} required>
          <input
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
          label={t('calculator.avgSlope')}
          unit={t('calculator.avgSlopeUnit')}
          required
          hint="Ej: 0.005 = 0.5%"
        >
          <input
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
          label={t('calculator.elevationDiff')}
          unit={t('calculator.elevationDiffUnit')}
          hint={`${t('common.optional')} — fórmula California`}
        >
          <input
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
          label={t('calculator.avgElevation')}
          unit={t('calculator.avgElevationUnit')}
          hint={`${t('common.optional')} — fórmula Giandotti`}
        >
          <input
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
