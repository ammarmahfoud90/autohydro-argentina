import { useState } from 'react';
import { classifyLandUse, type LandUseClassifyResult, type LandUseItem } from '../../services/api';
import type { SoilGroup, LandUseCategory, HydroCondition } from '../../types';

interface Props {
  soilGroup: SoilGroup;
  onApply: (categories: LandUseCategory[], soilGroup: SoilGroup) => void;
}

const EXAMPLES = [
  '60% cultivos de soja siembra directa, 25% pastizal natural, 10% monte nativo ralo, 5% caminos',
  '45% maíz, 30% pasturas implantadas, 15% residencial baja densidad, 10% humedal',
  '70% pastizal natural (buenas condiciones), 20% monte nativo, 10% zona comercial',
  '50% soja convencional, 20% feedlot, 15% desmonte reciente, 15% trigo',
];

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  alta:  { label: 'Alta confianza',   color: 'text-green-700 bg-green-50 border-green-200' },
  media: { label: 'Confianza media',  color: 'text-amber-700 bg-amber-50 border-amber-200' },
  baja:  { label: 'Baja confianza',   color: 'text-red-700 bg-red-50 border-red-200' },
};

const CONDITION_LABELS: Record<string, string> = {
  poor: 'Deficiente',
  fair: 'Normal',
  good: 'Buena',
  'N/A': '—',
};

export function LandUseAssistant({ soilGroup, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [localSoilGroup, setLocalSoilGroup] = useState<SoilGroup>(soilGroup);
  const [result, setResult] = useState<LandUseClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClassify() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await classifyLandUse(description.trim(), localSoilGroup);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al clasificar. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    const categories: LandUseCategory[] = result.land_uses
      .filter((lu: LandUseItem) => lu.cn_value !== null)
      .map((lu: LandUseItem) => ({
        land_use: lu.cn_key,
        area_percent: lu.area_percent,
        condition: (lu.condition === 'N/A' ? 'fair' : lu.condition) as HydroCondition,
      }));
    onApply(categories, localSoilGroup);
    setOpen(false);
  }

  const confidenceInfo = result ? (CONFIDENCE_LABELS[result.confidence] ?? CONFIDENCE_LABELS.media) : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 px-4 py-3 text-left hover:border-purple-400 hover:bg-purple-100 transition-colors"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center text-lg">
          🤖
        </div>
        <div>
          <div className="text-sm font-semibold text-purple-800">Asistente de Uso de Suelo (IA)</div>
          <div className="text-xs text-purple-600 mt-0.5">
            Describí tu cuenca en texto y calculamos el CN automáticamente
          </div>
        </div>
        <svg className="ml-auto w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-purple-300 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <span className="text-lg">🤖</span>
          <span className="font-semibold text-sm">Asistente de Uso de Suelo (IA)</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-purple-200 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Description input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción de los usos de suelo de la cuenca
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Ej: 60% agricultura soja, 25% pastizal, 10% urbano, 5% monte"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
          />
          {/* Example prompts */}
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1.5">Ejemplos:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDescription(ex)}
                  className="text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-2.5 py-0.5 hover:bg-purple-100 transition-colors text-left"
                >
                  {ex.length > 50 ? ex.slice(0, 50) + '…' : ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Soil group selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Grupo de suelo predominante
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['A', 'B', 'C', 'D'] as SoilGroup[]).map((sg) => (
              <button
                key={sg}
                type="button"
                onClick={() => setLocalSoilGroup(sg)}
                className={`rounded-lg border-2 py-2 text-sm font-bold transition-all ${
                  localSoilGroup === sg
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
              >
                {sg}
              </button>
            ))}
          </div>
        </div>

        {/* Classify button */}
        <button
          type="button"
          onClick={handleClassify}
          disabled={loading || !description.trim()}
          className="w-full py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analizando con IA…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Calcular CN con IA
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Confidence badge */}
            {confidenceInfo && (
              <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${confidenceInfo.color}`}>
                {confidenceInfo.label}
                {result.notes ? ` — ${result.notes}` : ''}
              </div>
            )}

            {/* Land use table */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Uso del suelo</th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600">%</th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600">Condición</th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600">CN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.land_uses.map((lu: LandUseItem, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700 leading-snug">
                        {lu.description_es}
                        <div className="text-gray-400 text-[10px]">{lu.cn_key}</div>
                      </td>
                      <td className="px-2 py-2 text-center font-medium text-gray-700">
                        {lu.area_percent.toFixed(1)}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-500">
                        {CONDITION_LABELS[lu.condition] ?? lu.condition}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-blue-700">
                        {lu.cn_value ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Weighted CN result */}
            <div className="rounded-lg bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-purple-200">CN Ponderado (Grupo {localSoilGroup})</div>
                <div className="text-xs text-purple-300 mt-0.5">Calculado con IA a partir de tu descripción</div>
              </div>
              <div className="text-4xl font-bold">{result.weighted_cn.toFixed(1)}</div>
            </div>

            {/* Apply button */}
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Usar este CN en el cálculo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
