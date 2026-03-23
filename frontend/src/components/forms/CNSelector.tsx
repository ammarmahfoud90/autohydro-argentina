import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  CN_ENTRIES,
  CN_CATEGORY_GROUPS,
  SOIL_GROUP_INFO,
  calculateCompositeCN,
  type CNGroup,
} from '../../constants/cn-tables';
import type { SoilGroup, HydroCondition, LandUseCategory } from '../../types';

interface Props {
  categories: LandUseCategory[];
  soilGroup: SoilGroup;
  onChange: (categories: LandUseCategory[], soilGroup: SoilGroup) => void;
}

export function CNSelector({ categories, soilGroup, onChange }: Props) {
  const { t } = useTranslation();
  const [activeGroup, setActiveGroup] = useState<CNGroup>(CN_CATEGORY_GROUPS[0]);

  const totalPct = categories.reduce((s, c) => s + c.area_percent, 0);
  const compositeCN = categories.length > 0
    ? calculateCompositeCN(
        categories.map((c) => ({ entryId: c.land_use, areaPercent: c.area_percent, condition: c.condition })),
        soilGroup,
      )
    : null;

  function addCategory(landUseId: string) {
    const entry = CN_ENTRIES.find((e) => e.id === landUseId);
    if (!entry) return;
    const remaining = Math.max(0, 100 - totalPct);
    const newCat: LandUseCategory = {
      land_use: landUseId,
      area_percent: remaining > 0 ? Math.min(remaining, 100) : 10,
      condition: 'fair',
    };
    onChange([...categories, newCat], soilGroup);
  }

  function updateCategory(idx: number, updates: Partial<LandUseCategory>) {
    const updated = categories.map((c, i) => (i === idx ? { ...c, ...updates } : c));
    onChange(updated, soilGroup);
  }

  function removeCategory(idx: number) {
    onChange(categories.filter((_, i) => i !== idx), soilGroup);
  }

  const filteredEntries = CN_ENTRIES.filter((e) => e.group === activeGroup);

  return (
    <div className="space-y-5">
      {/* Soil group selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('calculator.soilGroup')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['A', 'B', 'C', 'D'] as SoilGroup[]).map((sg) => {
            const info = SOIL_GROUP_INFO[sg];
            return (
              <button
                key={sg}
                type="button"
                onClick={() => onChange(categories, sg)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  soilGroup === sg
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className={`font-bold text-sm ${soilGroup === sg ? 'text-blue-700' : 'text-gray-700'}`}>
                  Grupo {sg}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                  {info.infiltrationRate}
                </div>
                <div className="text-xs text-gray-400 mt-1 leading-tight hidden sm:block">
                  {info.typicalLocations}
                </div>
              </button>
            );
          })}
        </div>
        {soilGroup && (
          <p className="mt-1.5 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
            {SOIL_GROUP_INFO[soilGroup].description}
          </p>
        )}
      </div>

      {/* Category browser */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">
          {t('calculator.addCategory')}
        </div>

        {/* Group tabs */}
        <div className="flex flex-wrap gap-1 mb-3">
          {CN_CATEGORY_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGroup(g)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                activeGroup === g
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Entry list */}
        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {filteredEntries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => addCategory(entry.id)}
              disabled={categories.some((c) => c.land_use === entry.id)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-between gap-2"
            >
              <span className="text-gray-700 flex-1">{entry.description}</span>
              <span className="text-xs text-gray-400 shrink-0">
                {entry.conditionBased ? 'cond.' : `CN ${entry.values[soilGroup]['N/A'] ?? '—'}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected categories */}
      {categories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Categorías seleccionadas
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                Math.abs(totalPct - 100) < 0.5
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              Total: {totalPct.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-2">
            {categories.map((cat, idx) => {
              const entry = CN_ENTRIES.find((e) => e.id === cat.land_use);
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-gray-700 text-xs leading-snug flex-1">
                      {entry?.description ?? cat.land_use}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCategory(idx)}
                      className="text-red-400 hover:text-red-600 text-xs shrink-0"
                    >
                      {t('calculator.remove')}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Area percent */}
                    <div className="flex items-center gap-1.5 flex-1">
                      <label className="text-xs text-gray-500 shrink-0">% área:</label>
                      <input
                        type="number"
                        min={0.1}
                        max={100}
                        step={0.1}
                        value={cat.area_percent}
                        onChange={(e) =>
                          updateCategory(idx, { area_percent: Number(e.target.value) })
                        }
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Condition (only for condition-based entries) */}
                    {entry?.conditionBased && (
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-gray-500 shrink-0">{t('calculator.condition')}:</label>
                        <select
                          value={cat.condition}
                          onChange={(e) =>
                            updateCategory(idx, { condition: e.target.value as HydroCondition })
                          }
                          className="rounded border border-gray-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="poor">{t('calculator.condition_poor')}</option>
                          <option value="fair">{t('calculator.condition_fair')}</option>
                          <option value="good">{t('calculator.condition_good')}</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Composite CN result */}
      {compositeCN !== null && Math.abs(totalPct - 100) < 1 && (
        <div className="rounded-lg bg-blue-600 text-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-200">{t('calculator.cn')}</div>
            <div className="text-sm text-blue-100 mt-0.5">{t('calculator.cnHint')}</div>
          </div>
          <div className="text-4xl font-bold">{compositeCN.toFixed(1)}</div>
        </div>
      )}

      {categories.length > 0 && Math.abs(totalPct - 100) > 1 && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {t('validation.cnPercent')} — actual: {totalPct.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
