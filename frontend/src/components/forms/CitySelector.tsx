import { useState, useEffect, useRef } from 'react';
import { getLocalities } from '../../services/api';
import type { IDFLocality } from '../../types/idf';

interface Props {
  value: string;
  onChange: (localityId: string, locality?: IDFLocality) => void;
}

export function CitySelector({ value, onChange }: Props) {
  const [localities, setLocalities] = useState<IDFLocality[]>([]);
  const [status, setStatus] = useState<'loading' | 'slowStart' | 'ready' | 'error'>('loading');
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function loadLocalities() {
    setStatus('loading');
    setLocalities([]);

    // After 3 seconds of waiting, switch to "server waking up" message
    slowTimer.current = setTimeout(() => {
      setStatus('slowStart');
    }, 3000);

    getLocalities()
      .then((locs) => {
        clearTimeout(slowTimer.current ?? undefined);
        setLocalities(locs);
        setStatus('ready');
      })
      .catch(() => {
        clearTimeout(slowTimer.current ?? undefined);
        setStatus('error');
      });
  }

  useEffect(() => {
    loadLocalities();
    return () => { clearTimeout(slowTimer.current ?? undefined); };
  }, []);

  const isManual = value === 'manual';
  const selected = isManual ? null : (localities.find((l) => l.id === value) ?? null);
  const isShortSeries = selected
    ? selected.source.series_length_years != null && selected.source.series_length_years < 15
    : false;

  return (
    <div className="space-y-4">
      {/* Locality select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Seleccionar localidad <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <select
            value={value}
            onChange={(e) => {
              const id = e.target.value;
              const loc = id === 'manual' ? undefined : localities.find((l) => l.id === id);
              onChange(id, loc);
            }}
            disabled={status === 'loading' || status === 'slowStart'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            {status === 'loading' || status === 'slowStart' ? (
              <option value="">Cargando localidades…</option>
            ) : (
              <>
                <option value="">Seleccionar localidad</option>
                {(() => {
                  const byProvince = localities.reduce<Record<string, IDFLocality[]>>((acc, loc) => {
                    (acc[loc.province] ??= []).push(loc);
                    return acc;
                  }, {});
                  const provinces = Object.keys(byProvince).sort((a, b) => a.localeCompare(b, 'es'));
                  return provinces.map((province) => (
                    <optgroup key={province} label={province}>
                      {byProvince[province]
                        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                        .map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                    </optgroup>
                  ));
                })()}
                <optgroup label="── Datos propios ──">
                  <option value="manual">Ingresar datos IDF manualmente</option>
                </optgroup>
              </>
            )}
          </select>

          {/* Spinner overlay while loading */}
          {(status === 'loading' || status === 'slowStart') && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          )}
        </div>

        {/* Server waking up message */}
        {status === 'slowStart' && (
          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-medium">
                  El servidor está iniciando…
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Esto puede tardar hasta 60 segundos la primera vez. Por favor esperá.
                </p>
                {/* Indeterminate progress bar */}
                <div className="mt-2 h-1 w-full bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-[slideIndeterminate_1.5s_ease-in-out_infinite]"
                    style={{ width: '40%', animation: 'slideIndeterminate 1.5s ease-in-out infinite' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error state with retry */}
        {status === 'error' && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-700">No se pudo conectar al servidor. Intentá de nuevo.</p>
            </div>
            <button
              type="button"
              onClick={loadLocalities}
              className="shrink-0 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}
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
            <span className="font-medium text-gray-700">Fuente:</span>{' '}
            {selected.source.document}
          </div>

          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">Período:</span>{' '}
            {selected.source.series_period != null
              ? `${selected.source.series_period}${selected.source.series_length_years != null ? ` (${selected.source.series_length_years} años)` : ''}`
              : selected.source.series_length_years != null
                ? `${selected.source.series_length_years} años`
                : 'Múltiples estaciones'}
            {selected.limitations.max_reliable_return_period != null && (
              <>{' · '}<span className="font-medium text-gray-700">TR máximo confiable:</span>{' '}
              {selected.limitations.max_reliable_return_period} años</>
            )}
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
        Aviso: Estos resultados son estimaciones para etapas preliminares. Verifique con estudios locales actualizados para diseños finales.
      </p>
    </div>
  );
}
