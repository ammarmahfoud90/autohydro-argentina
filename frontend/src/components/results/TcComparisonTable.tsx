import { useTranslation } from 'react-i18next';
import type { HydrologyResult } from '../../types';

export function TcComparisonTable({ results }: { results: HydrologyResult }) {
  const { t } = useTranslation();
  if (!results.tc_results || results.tc_results.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold text-gray-700 dark:text-slate-200 mb-3">{t('results.tcComparison')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-600 dark:text-slate-300">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-600">
              <th className="text-left py-2 font-medium text-gray-700 dark:text-slate-200">Fórmula</th>
              <th className="text-right py-2 font-medium text-gray-700 dark:text-slate-200">Tc (hr)</th>
              <th className="text-right py-2 font-medium text-gray-700 dark:text-slate-200">Tc (min)</th>
              <th className="text-left py-2 font-medium text-gray-700 dark:text-slate-200 pl-3">Aplicabilidad</th>
            </tr>
          </thead>
          <tbody>
            {results.tc_results.map((tc) => (
              <tr key={tc.formula} className="border-b border-gray-50 dark:border-slate-700">
                <td className="py-2 pr-2 font-medium">{tc.formulaName}</td>
                <td className="text-right py-2">{tc.tcHours.toFixed(3)}</td>
                <td className="text-right py-2">{tc.tcMinutes.toFixed(1)}</td>
                <td className="pl-3 py-2 text-gray-400 dark:text-slate-500">{tc.applicability}</td>
              </tr>
            ))}
            <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold text-blue-700 dark:text-blue-300">
              <td className="py-2 pr-2">{t('results.tcAdopted')} (promedio)</td>
              <td className="text-right py-2">{results.tc_adopted_hours.toFixed(3)}</td>
              <td className="text-right py-2">{results.tc_adopted_minutes.toFixed(1)}</td>
              <td className="pl-3 py-2" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
