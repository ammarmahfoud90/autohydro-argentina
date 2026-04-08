import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { HydrologyResult, CNSensitivityPoint } from '../../types';

export function CNSensitivityPanel({ results }: { results: HydrologyResult }) {
  if (results.method !== 'scs_cn' || !results.cn_sensitivity || results.cn_sensitivity.length === 0) return null;
  const sensitivityChartData = results.cn_sensitivity.map((s: CNSensitivityPoint) => ({
    label: `${s.label} (${s.cn.toFixed(0)})`,
    flow: s.peak_flow_m3s,
    isBase: s.label === 'CN',
  }));
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold text-gray-700 dark:text-slate-200 mb-1">Análisis de Sensibilidad — CN</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        Este análisis muestra cómo varía el caudal pico ante cambios de ±5 unidades en el
        Número de Curva. Esto refleja la incertidumbre inherente en la estimación del CN.
      </p>
      <div role="img" aria-label="Análisis de sensibilidad — variación del caudal pico ante cambios en el Número de Curva">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={sensitivityChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(v: number) => v.toFixed(2)}
              tick={{ fontSize: 11 }}
              label={{ value: 'm³/s', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
            />
            <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} m³/s`, 'Caudal pico']} />
            <Bar dataKey="flow" radius={[4, 4, 0, 0]}>
              {sensitivityChartData.map((entry, i) => (
                <Cell key={i} fill={entry.isBase ? '#2563eb' : '#93c5fd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs text-gray-600">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1.5 font-medium text-gray-700">CN</th>
              <th className="text-right py-1.5 font-medium text-gray-700">Q (m³/s)</th>
              <th className="text-right py-1.5 font-medium text-gray-700">Variación</th>
            </tr>
          </thead>
          <tbody>
            {results.cn_sensitivity.map((s) => (
              <tr
                key={s.label}
                className={`border-b border-gray-50 ${s.label === 'CN' ? 'bg-blue-50 font-semibold text-blue-800' : ''}`}
              >
                <td className="py-1.5 pr-2">{s.label} ({s.cn.toFixed(0)})</td>
                <td className="text-right py-1.5">{s.peak_flow_m3s.toFixed(3)}</td>
                <td
                  className={`text-right py-1.5 font-medium ${
                    s.label === 'CN' ? 'text-gray-400' : s.variation_pct < 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}
                >
                  {s.label === 'CN' ? 'Base' : `${s.variation_pct > 0 ? '+' : ''}${s.variation_pct.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
