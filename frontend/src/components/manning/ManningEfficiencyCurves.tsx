import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts';

type ChannelType = 'rectangular' | 'trapezoidal' | 'circular' | 'triangular';

interface Props {
  channelType: ChannelType;
  n: number;
  S: number;
  depth: number;
  width?: number;
  bottomWidth?: number;
  sideSlope?: number;
  diameter?: number;
  triSideSlope?: number;
}

interface CurvePoint {
  y: number;
  Q: number;
  V: number;
  tau: number;
  Fr: number;
}

const G = 9.81;
const GAMMA = 9810; // N/m³

function computePoint(
  channelType: ChannelType,
  y: number,
  n: number,
  S: number,
  width: number,
  bottomWidth: number,
  sideSlope: number,
  diameter: number,
  triSideSlope: number,
): CurvePoint | null {
  if (y <= 0) return null;
  let A = 0, P = 0, T = 0;

  if (channelType === 'rectangular') {
    A = width * y;
    P = width + 2 * y;
    T = width;
  } else if (channelType === 'trapezoidal') {
    A = (bottomWidth + sideSlope * y) * y;
    P = bottomWidth + 2 * y * Math.sqrt(1 + sideSlope ** 2);
    T = bottomWidth + 2 * sideSlope * y;
  } else if (channelType === 'circular') {
    if (y > diameter) return null;
    const theta = 2 * Math.acos(1 - 2 * y / diameter);
    A = (diameter ** 2 / 8) * (theta - Math.sin(theta));
    P = diameter * theta / 2;
    T = diameter * Math.sin(theta / 2);
  } else if (channelType === 'triangular') {
    A = triSideSlope * y ** 2;
    P = 2 * y * Math.sqrt(1 + triSideSlope ** 2);
    T = 2 * triSideSlope * y;
  }

  if (A <= 0 || P <= 0 || T <= 0) return null;
  const R = A / P;
  const Q = (1 / n) * A * Math.pow(R, 2 / 3) * Math.sqrt(S);
  const V = Q / A;
  const tau = GAMMA * R * S;
  const Fr = V / Math.sqrt(G * (A / T));
  return { y, Q, V, tau, Fr };
}

function findCriticalDepth(
  channelType: ChannelType,
  n: number,
  S: number,
  width: number,
  bottomWidth: number,
  sideSlope: number,
  diameter: number,
  triSideSlope: number,
  yMax: number,
): number | null {
  // Binary search for Fr=1
  let lo = 0.001 * yMax, hi = yMax;
  const ptLo = computePoint(channelType, lo, n, S, width, bottomWidth, sideSlope, diameter, triSideSlope);
  const ptHi = computePoint(channelType, hi, n, S, width, bottomWidth, sideSlope, diameter, triSideSlope);
  if (!ptLo || !ptHi) return null;
  if (ptLo.Fr < 1 && ptHi.Fr < 1) return null; // always subcritical
  if (ptLo.Fr > 1 && ptHi.Fr > 1) return null; // always supercritical

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const pt = computePoint(channelType, mid, n, S, width, bottomWidth, sideSlope, diameter, triSideSlope);
    if (!pt) break;
    if (pt.Fr > 1) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const TABS = ['Q vs tirante', 'V vs tirante', 'τ vs tirante'] as const;
type Tab = typeof TABS[number];

export function ManningEfficiencyCurves({
  channelType, n, S, depth,
  width = 2, bottomWidth = 2, sideSlope = 1.5,
  diameter = 1.2, triSideSlope = 2,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('Q vs tirante');

  const { points, criticalDepth, designPoint } = useMemo(() => {
    const yMax = channelType === 'circular' ? diameter : Math.max(depth * 1.5, 0.1);
    const nPts = 50;
    const pts: CurvePoint[] = [];
    for (let i = 1; i <= nPts; i++) {
      const y = (i / nPts) * yMax;
      const pt = computePoint(channelType, y, n, S, width, bottomWidth, sideSlope, diameter, triSideSlope);
      if (pt) pts.push(pt);
    }

    const yc = findCriticalDepth(channelType, n, S, width, bottomWidth, sideSlope, diameter, triSideSlope, yMax);
    const dp = computePoint(channelType, depth, n, S, width, bottomWidth, sideSlope, diameter, triSideSlope);

    return { points: pts, criticalDepth: yc, designPoint: dp };
  }, [channelType, n, S, depth, width, bottomWidth, sideSlope, diameter, triSideSlope]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-sm font-medium text-blue-700 flex items-center justify-between"
      >
        <span>Ver curvas de eficiencia hidráulica</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  const dataKey = tab === 'Q vs tirante' ? 'Q' : tab === 'V vs tirante' ? 'V' : 'tau';
  const lineColor = tab === 'Q vs tirante' ? '#2563eb' : tab === 'V vs tirante' ? '#059669' : '#d97706';
  const yLabel = tab === 'Q vs tirante' ? 'Q (m³/s)' : tab === 'V vs tirante' ? 'V (m/s)' : 'τ (N/m²)';

  const designVal = designPoint
    ? (tab === 'Q vs tirante' ? designPoint.Q : tab === 'V vs tirante' ? designPoint.V : designPoint.tau)
    : null;

  const frLabel = designPoint
    ? (designPoint.Fr >= 1 ? `Supercrítico (Fr = ${designPoint.Fr.toFixed(2)})` : `Subcrítico (Fr = ${designPoint.Fr.toFixed(2)})`)
    : '';

  const freeboard = (() => {
    if (channelType === 'circular') return diameter - depth;
    if (channelType === 'rectangular' || channelType === 'trapezoidal') return depth * 0.25;
    return depth * 0.2;
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Curvas de eficiencia hidráulica</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ▲ Ocultar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="y"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => v.toFixed(2)}
            label={{ value: 'Tirante y (m)', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#6b7280' }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            dataKey={dataKey}
            tickFormatter={(v: number) => v.toFixed(2)}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#6b7280' }}
            tick={{ fontSize: 10 }}
            width={55}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) => {
              const val = typeof v === 'number' ? v : 0;
              const n = String(name);
              return [
                `${val.toFixed(3)} ${n === 'Q' ? 'm³/s' : n === 'V' ? 'm/s' : 'N/m²'}`,
                n === 'Q' ? 'Caudal' : n === 'V' ? 'Velocidad' : 'Tensión arrastre',
              ] as [string, string];
            }}
            labelFormatter={(y: unknown) => `y = ${typeof y === 'number' ? y.toFixed(3) : y} m`}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Design depth vertical line */}
          <ReferenceLine
            x={depth}
            stroke="#ef4444"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: `y = ${depth.toFixed(2)} m`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
          />

          {/* Critical depth vertical line */}
          {criticalDepth != null && (
            <ReferenceLine
              x={criticalDepth}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: `yc = ${criticalDepth.toFixed(2)} m`, position: 'insideTopLeft', fontSize: 10, fill: '#b45309' }}
            />
          )}

          {/* Design point dot */}
          {designPoint && designVal != null && (
            <Line
              data={[{ y: depth, [dataKey]: designVal }]}
              type="monotone"
              dataKey={dataKey}
              stroke="none"
              dot={<Dot cx={0} cy={0} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />}
              activeDot={false}
              legendType="none"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Info row */}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
        {criticalDepth != null && (
          <div><span className="text-gray-400">Tirante crítico:</span> <span className="font-medium text-amber-700">yc = {criticalDepth.toFixed(3)} m</span></div>
        )}
        <div><span className="text-gray-400">Tirante diseño:</span> <span className="font-medium text-red-600">y = {depth.toFixed(3)} m</span></div>
        {designPoint && (
          <div><span className="text-gray-400">Régimen:</span> <span className="font-medium">{frLabel}</span></div>
        )}
        <div>
          <span className="text-gray-400">Borde libre:</span>{' '}
          <span className="font-medium">{freeboard.toFixed(3)} m</span>
        </div>
      </div>
    </div>
  );
}
