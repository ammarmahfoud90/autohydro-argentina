import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import type { FloodSimulationResult } from '../../services/api';

// ── Risk badge ────────────────────────────────────────────────────────────────

function riskStyle(level: string): string {
  switch (level) {
    case 'Sin riesgo': return 'bg-green-100 text-green-800 border-green-300';
    case 'Bajo':       return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Medio':      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Alto':       return 'bg-red-100 text-red-800 border-red-300';
    case 'Muy Alto':   return 'bg-purple-100 text-purple-800 border-purple-300';
    default:           return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function riskRecommendation(level: string): string {
  switch (level) {
    case 'Sin riesgo':
      return 'El cauce puede conducir el caudal de diseño sin desbordamiento. No se requieren medidas de emergencia.';
    case 'Bajo':
      return 'Agua transitable con precaución. Señalizar la zona. Monitorear en tiempo real durante eventos.';
    case 'Medio':
      return 'Peligroso para peatones. Cortar el tránsito peatonal. Alertar a la población del sector.';
    case 'Alto':
      return 'Peligroso para vehículos. Cortar la circulación vehicular. Evacuar estructuras bajas. Activar plan de emergencia.';
    case 'Muy Alto':
      return 'Situación crítica. Evacuación inmediata necesaria. Activar protocolo de emergencia hídrica y Defensa Civil.';
    default:
      return '';
  }
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function Stat({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 leading-tight">
        {value}
        {unit && <span className="text-sm font-medium text-gray-400 ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FloodResultsProps {
  result: FloodSimulationResult;
}

export function FloodResults({ result }: FloodResultsProps) {
  const rec = riskRecommendation(result.risk_level);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Área inundada"
          value={result.flooded_area_ha > 0 ? result.flooded_area_ha.toFixed(2) : '0'}
          unit="ha"
        />
        <Stat
          label="Profundidad máxima"
          value={result.max_depth_m.toFixed(2)}
          unit="m"
          sub={`sobre la banca`}
        />
        <Stat
          label="Profundidad media"
          value={result.avg_depth_m.toFixed(2)}
          unit="m"
        />
        <Stat
          label="Cap. del cauce"
          value={result.channel_capacity_m3s.toFixed(2)}
          unit="m³/s"
          sub={`yn = ${result.normal_depth_m.toFixed(2)} m`}
        />
      </div>

      {/* Risk badge + recommendation */}
      <div className={`rounded-xl border px-4 py-3 ${riskStyle(result.risk_level)}`}>
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="font-bold text-sm">Nivel de riesgo: {result.risk_level}</span>
        </div>
        <p className="text-sm leading-relaxed">{rec}</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-700 leading-relaxed">{result.summary}</p>
      </div>

      {/* Depth zone chart */}
      {result.depth_zones.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Distribución por zonas de profundidad</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={result.depth_zones} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="level" tick={{ fontSize: 11 }} />
              <YAxis unit=" ha" tick={{ fontSize: 11 }} width={52} />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(4)} ha`, 'Área']}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="area_ha" radius={[4, 4, 0, 0]}>
                {result.depth_zones.map((z, i) => (
                  <Cell key={i} fill={z.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hydraulic details */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Detalle hidráulico</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-gray-600">
          <div className="flex justify-between gap-2">
            <span>Tirante normal (yn)</span>
            <span className="font-semibold">{result.normal_depth_m.toFixed(3)} m</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Desborde s/banca</span>
            <span className="font-semibold">{result.flood_above_bank_m.toFixed(3)} m</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Ancho inundado total</span>
            <span className="font-semibold">{result.total_flood_width_m.toFixed(1)} m</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Modelo 1D simplificado — para estudios definitivos usar HEC-RAS u otro modelo bidimensional.
      </p>
    </div>
  );
}
