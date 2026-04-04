import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getLocality } from '../services/api';
import type { IDFLocality } from '../types/idf';

const TR_COLORS: Record<number, string> = {
  2:   '#93c5fd', // blue-300
  5:   '#60a5fa', // blue-400
  10:  '#3b82f6', // blue-500
  25:  '#2563eb', // blue-600
  50:  '#1d4ed8', // blue-700
  100: '#1e3a8a', // blue-900
};

interface IDFTable {
  durations_min: number[];
  return_periods_years?: number[];
  return_periods?: number[];
  intensities_mm_hr?: number[][];
  intensities?: Record<string, number[]>;
}

interface IDFLocalityFull extends IDFLocality {
  idf_table?: IDFTable;
}

interface Props {
  locality: IDFLocality;
}

export function IDFPreviewChart({ locality }: Props) {
  const { data, isLoading } = useQuery<IDFLocalityFull>({
    queryKey: ['locality', locality.id],
    queryFn: () => getLocality(locality.id) as Promise<IDFLocalityFull>,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="border border-gray-100 rounded-lg p-3 flex items-center justify-center gap-2 text-sm text-gray-400">
        <svg className="animate-spin w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Cargando curvas IDF…
      </div>
    );
  }

  const idfTable = data?.idf_table;

  if (!idfTable) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border border-gray-100 rounded-lg px-4 py-3 text-xs text-gray-500 italic bg-gray-50"
      >
        Vista previa IDF no disponible para este modelo.{' '}
        <Link to="/sources" className="text-blue-600 hover:underline">
          Ver tabla completa en Fuentes.
        </Link>
      </motion.div>
    );
  }

  const trs = idfTable.return_periods_years ?? idfTable.return_periods ?? [];
  const durations = idfTable.durations_min;

  // Build recharts data: one object per duration, one key per TR
  const chartData = durations.map((dur, di) => {
    const point: Record<string, number> = { duration: dur };
    trs.forEach((tr, ti) => {
      if (idfTable.intensities_mm_hr) {
        point[`tr${tr}`] = idfTable.intensities_mm_hr[ti]?.[di] ?? 0;
      } else if (idfTable.intensities) {
        point[`tr${tr}`] = idfTable.intensities[String(tr)]?.[di] ?? 0;
      }
    });
    return point;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="border border-gray-100 rounded-lg bg-white p-3"
    >
      <p className="text-xs font-semibold text-gray-600 mb-1">
        Curvas IDF — {locality.name}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="duration"
            scale="log"
            type="number"
            domain={[durations[0], durations[durations.length - 1]]}
            ticks={durations}
            tickFormatter={(v: number) => v >= 60 ? `${v / 60}h` : `${v}'`}
            tick={{ fontSize: 9 }}
            label={{ value: 'Duración', position: 'insideBottom', offset: -10, fontSize: 9, fill: '#9ca3af' }}
          />
          <YAxis
            tick={{ fontSize: 9 }}
            width={36}
            label={{ value: 'mm/h', angle: -90, position: 'insideLeft', offset: 12, fontSize: 9, fill: '#9ca3af' }}
          />
          <Tooltip
            formatter={(val: unknown) => [`${Number(val).toFixed(1)} mm/h`]}
            labelFormatter={(l: unknown) => `${l} min`}
            contentStyle={{ fontSize: 11 }}
          />
          <Legend
            iconType="line"
            formatter={(val: string) => `TR ${val.replace('tr', '')}`}
            wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
          />
          {trs.map((tr) => (
            <Line
              key={tr}
              type="monotone"
              dataKey={`tr${tr}`}
              name={`tr${tr}`}
              stroke={TR_COLORS[tr] ?? '#3b82f6'}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-400 mt-0.5">
        Fuente: {locality.source.document}
      </p>
    </motion.div>
  );
}
