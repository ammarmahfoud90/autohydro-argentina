import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { HydrologyResult } from '../../types';

export function HydrographChart({ results }: { results: HydrologyResult }) {
  if (
    results.method !== 'scs_cn' ||
    !results.hydrograph_times ||
    !results.hydrograph_flows ||
    results.hydrograph_times.length === 0
  ) {
    return null;
  }
  const Tp = results.time_to_peak_hr ?? 0;
  const hyData = results.hydrograph_times.map((t, i) => ({
    t: parseFloat(t.toFixed(3)),
    q: parseFloat(results.hydrograph_flows![i].toFixed(4)),
  }));
  const peakIdx = results.hydrograph_flows.indexOf(Math.max(...results.hydrograph_flows));
  const peakT = results.hydrograph_times[peakIdx];
  const peakQ = results.hydrograph_flows[peakIdx];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold text-gray-700 dark:text-slate-200 mb-1">Hidrograma de Escorrentía</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        El hidrograma muestra la variación temporal del caudal durante el evento de
        tormenta. El volumen total de escorrentía es el área bajo la curva.
        Basado en el Hidrograma Unitario Adimensional SCS (USDA-SCS, 1986).
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Caudal pico (Qp)', value: `${peakQ.toFixed(3)} m³/s` },
          { label: 'Tiempo al pico (Tp)', value: `${Tp.toFixed(2)} hr` },
          { label: 'Tiempo base (Tb)', value: `${(results.base_time_hr ?? 0).toFixed(2)} hr` },
          {
            label: 'Volumen de escorrentía',
            value:
              (results.runoff_volume_m3 ?? 0) >= 1000
                ? `${((results.runoff_volume_m3 ?? 0) / 1000).toFixed(1)} × 10³ m³`
                : `${(results.runoff_volume_m3 ?? 0).toFixed(0)} m³`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg p-3 text-center bg-blue-50 border border-blue-100">
            <div className="text-xs text-blue-500 mb-1">{label}</div>
            <div className="font-bold text-sm text-blue-800">{value}</div>
          </div>
        ))}
      </div>
      <div role="img" aria-label="Hidrograma SCS — caudal de escorrentía directa vs tiempo">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={hyData} margin={{ top: 10, right: 20, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="hyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 'dataMax']}
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={{ fontSize: 11 }}
              label={{ value: 'Tiempo (hr)', position: 'insideBottom', offset: -2, style: { fontSize: 11 } }}
            />
            <YAxis
              tickFormatter={(v: number) => v.toFixed(2)}
              tick={{ fontSize: 11 }}
              label={{ value: 'Q (m³/s)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
            />
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(4)} m³/s`, 'Caudal']}
              labelFormatter={(l) => `t = ${Number(l).toFixed(3)} hr`}
            />
            <ReferenceLine
              x={peakT}
              stroke="#2563eb"
              strokeDasharray="4 2"
              label={{
                value: `Tp = ${Tp.toFixed(2)} hr`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#2563eb',
              }}
            />
            <Area
              type="monotone"
              dataKey="q"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#hyGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#1d4ed8' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-4">
        <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
          Ver tabla de valores (t vs Q)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs text-gray-600">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-1.5 font-medium text-gray-700 pr-4">t (hr)</th>
                <th className="text-right py-1.5 font-medium text-gray-700 pr-4">t/Tp</th>
                <th className="text-right py-1.5 font-medium text-gray-700">Q (m³/s)</th>
              </tr>
            </thead>
            <tbody>
              {hyData.map(({ t, q }, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-50 ${i === peakIdx ? 'bg-blue-50 font-semibold text-blue-800' : ''}`}
                >
                  <td className="text-right py-1 pr-4">{t.toFixed(3)}</td>
                  <td className="text-right py-1 pr-4">{Tp > 0 ? (t / Tp).toFixed(2) : '—'}</td>
                  <td className="text-right py-1">{q.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
