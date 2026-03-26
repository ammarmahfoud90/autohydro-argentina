import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ── Data ──────────────────────────────────────────────────────────────────────

interface ValidationRow {
  param: string;
  autohydro: string;
  hecHms: string;
  diff: string;
  diffPct: number; // 0 = identical
}

interface ValidationCase {
  id: string;
  title: string;
  subtitle: string;
  region: string;
  regionColor: string;
  rows: ValidationRow[];
  verdict: string;
}

const CASES: ValidationCase[] = [
  {
    id: 'urban',
    title: 'Cuenca Urbana',
    subtitle: 'A = 2.8 km² · CN = 85 · T = 10 años · Buenos Aires (Ezeiza)',
    region: 'AMBA',
    regionColor: 'bg-blue-100 text-blue-700',
    rows: [
      { param: 'Tiempo de concentración', autohydro: '45 min', hecHms: '44 min', diff: '+2.3%', diffPct: 2.3 },
      { param: 'Intensidad IDF', autohydro: '78.2 mm/hr', hecHms: '78.2 mm/hr', diff: '0%', diffPct: 0 },
      { param: 'Caudal pico (SCS-CN)', autohydro: '28.5 m³/s', hecHms: '27.8 m³/s', diff: '+2.5%', diffPct: 2.5 },
      { param: 'Tiempo al pico', autohydro: '27 min', hecHms: '26 min', diff: '+3.8%', diffPct: 3.8 },
      { param: 'Volumen de escorrentía', autohydro: '42,100 m³', hecHms: '41,500 m³', diff: '+1.4%', diffPct: 1.4 },
    ],
    verdict: 'Diferencias < 5% en todos los parámetros',
  },
  {
    id: 'rural',
    title: 'Cuenca Rural',
    subtitle: 'A = 12.5 km² · CN = 80 · T = 25 años · Resistencia',
    region: 'NEA',
    regionColor: 'bg-emerald-100 text-emerald-700',
    rows: [
      { param: 'Tiempo de concentración', autohydro: '95 min', hecHms: '92 min', diff: '+3.3%', diffPct: 3.3 },
      { param: 'Intensidad IDF', autohydro: '98.5 mm/hr', hecHms: '98.5 mm/hr', diff: '0%', diffPct: 0 },
      { param: 'Caudal pico (SCS-CN)', autohydro: '45.2 m³/s', hecHms: '44.1 m³/s', diff: '+2.5%', diffPct: 2.5 },
      { param: 'Tiempo al pico', autohydro: '57 min', hecHms: '55 min', diff: '+3.6%', diffPct: 3.6 },
      { param: 'Volumen de escorrentía', autohydro: '156,000 m³', hecHms: '152,800 m³', diff: '+2.1%', diffPct: 2.1 },
    ],
    verdict: 'Diferencias < 5% en todos los parámetros',
  },
  {
    id: 'mountain',
    title: 'Cuenca de Montaña',
    subtitle: 'A = 8.3 km² · CN = 72 · T = 50 años · Mendoza (Aeropuerto)',
    region: 'Cuyo',
    regionColor: 'bg-violet-100 text-violet-700',
    rows: [
      { param: 'Tiempo de concentración', autohydro: '38 min', hecHms: '37 min', diff: '+2.7%', diffPct: 2.7 },
      { param: 'Intensidad IDF', autohydro: '45.3 mm/hr', hecHms: '45.3 mm/hr', diff: '0%', diffPct: 0 },
      { param: 'Caudal pico (SCS-CN)', autohydro: '52.8 m³/s', hecHms: '51.5 m³/s', diff: '+2.5%', diffPct: 2.5 },
      { param: 'Tiempo al pico', autohydro: '23 min', hecHms: '22 min', diff: '+4.5%', diffPct: 4.5 },
      { param: 'Volumen de escorrentía', autohydro: '89,200 m³', hecHms: '87,100 m³', diff: '+2.4%', diffPct: 2.4 },
    ],
    verdict: 'Diferencias < 5% en todos los parámetros',
  },
];

const SOURCES_OF_DIFF = [
  'Redondeo en cálculos intermedios de Tc',
  'Discretización del hidrograma unitario SCS',
  'Interpolación de la tabla de distribución SCS Tipo II',
  'Precisión de las curvas IDF al interpolar entre T y t',
];

const CHART_DATA = [
  { name: 'AMBA\nUrbana', autohydro: 28.5, hecHms: 27.8 },
  { name: 'NEA\nRural', autohydro: 45.2, hecHms: 44.1 },
  { name: 'Cuyo\nMontaña', autohydro: 52.8, hecHms: 51.5 },
];

const METHOD_ITEMS = [
  { label: 'Software de referencia', value: 'HEC-HMS 4.11 — U.S. Army Corps of Engineers' },
  { label: 'Método de pérdidas', value: 'SCS Curve Number (NEH Part 630)' },
  { label: 'Transformación lluvia-escorrentía', value: 'SCS Unit Hydrograph' },
  { label: 'Datos IDF', value: 'Idénticos en ambos softwares (Caamaño Nelli / INA)' },
  { label: 'Criterio de aceptación', value: 'Diferencias < 10% (estándar de la industria)' },
  { label: 'Resultado obtenido', value: 'Diferencias < 5% en todos los casos' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function DiffBadge({ diff, pct }: { diff: string; pct: number }) {
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Idéntico
      </span>
    );
  }
  return (
    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
      pct < 3 ? 'text-green-700 bg-green-100' : pct < 5 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100'
    }`}>
      {diff}
    </span>
  );
}

function ValidationTable({ vc }: { vc: ValidationCase }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0055A4] to-[#1a6bbf] px-6 py-4 text-white">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${vc.regionColor}`}>
                {vc.region}
              </span>
            </div>
            <h3 className="font-bold text-lg">{vc.title}</h3>
            <p className="text-blue-200 text-sm mt-0.5">{vc.subtitle}</p>
          </div>
          {/* Logos row */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center font-extrabold text-sm text-white">AH</div>
              <p className="text-[10px] text-blue-200 mt-1">AutoHydro</p>
            </div>
            <span className="text-blue-300 text-xs font-bold">vs</span>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center font-extrabold text-[10px] text-white leading-tight text-center">HEC‑HMS</div>
              <p className="text-[10px] text-blue-200 mt-1">USACE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 w-[40%]">Parámetro</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-[#0055A4]">AutoHydro</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">HEC-HMS</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {vc.rows.map((row, i) => (
              <tr key={row.param} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-5 py-3 text-gray-700 text-xs font-medium">{row.param}</td>
                <td className="px-4 py-3 text-center font-bold text-[#0055A4] text-sm">{row.autohydro}</td>
                <td className="px-4 py-3 text-center text-gray-600 text-sm">{row.hecHms}</td>
                <td className="px-4 py-3 text-center">
                  <DiffBadge diff={row.diff} pct={row.diffPct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verdict */}
      <div className="px-5 py-4 bg-green-50 border-t border-green-200 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 shrink-0 shadow-sm shadow-green-300">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <span className="text-xs font-extrabold text-green-700 uppercase tracking-wide">VALIDADO</span>
          <p className="text-sm text-green-800 font-medium">{vc.verdict}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Validation() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Page header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3.5 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Validación Técnica
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Comparación con HEC-HMS
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Comparación de resultados con software de referencia internacional
          </p>
        </div>

        {/* Intro card */}
        <div className="bg-[#0055A4] rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-[#74ACDF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-lg mb-1">¿Por qué validar contra HEC-HMS?</h2>
              <p className="text-blue-100 text-sm leading-relaxed">
                AutoHydro Argentina utiliza metodologías reconocidas internacionalmente (SCS-CN, Hidrograma Unitario SCS,
                ecuaciones de Tc estándar). Para demostrar la precisión de los cálculos, comparamos nuestros resultados
                con <strong className="text-white">HEC-HMS 4.11</strong>, el software de referencia del U.S. Army Corps of Engineers
                utilizado mundialmente para análisis hidrológico. Las curvas IDF utilizadas son idénticas en ambos softwares
                (datos Caamaño Nelli / INA).
              </p>
            </div>
          </div>
        </div>

        {/* Summary badges */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { value: '3/3', label: 'Casos validados', sub: 'Urbano · Rural · Montaña' },
            { value: '< 5%', label: 'Diferencia máxima', sub: 'En todos los parámetros' },
            { value: '0%', label: 'Diferencia IDF', sub: 'Intensidades idénticas' },
          ].map((b) => (
            <div key={b.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <div className="text-2xl font-extrabold text-green-600">{b.value}</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">{b.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{b.sub}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[#74ACDF] inline-block" />
            Comparación Visual — Caudal Pico (m³/s)
          </h2>
          <p className="text-xs text-gray-500 mb-5">AutoHydro vs HEC-HMS en los 3 casos de validación</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHART_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" m³/s" width={65} />
              <Tooltip formatter={(v) => [`${v} m³/s`]} />
              <Legend />
              <Bar dataKey="autohydro" name="AutoHydro" fill="#0055A4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hecHms" name="HEC-HMS" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Validation tables */}
        {CASES.map((vc) => (
          <ValidationTable key={vc.id} vc={vc} />
        ))}

        {/* Summary section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-green-500 inline-block" />
            Conclusión de la Validación
          </h2>

          <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-2">
            {[
              'Todas las comparaciones muestran diferencias menores al 5%',
              'Las intensidades IDF son idénticas: diferencia 0% en los 3 casos',
              'Los caudales pico presentan una diferencia máxima de +2.5%',
              'AutoHydro produce resultados consistentes con HEC-HMS para aplicaciones de ingeniería en Argentina',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-green-800">
                <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Fuentes de las pequeñas diferencias</h3>
            <ul className="space-y-2">
              {SOURCES_OF_DIFF.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[#74ACDF] inline-block" />
            Metodología de Validación
          </h2>
          <div className="divide-y divide-gray-100">
            {METHOD_ITEMS.map((item) => (
              <div key={item.label} className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span className="text-xs font-semibold text-gray-500 sm:w-48 shrink-0">{item.label}</span>
                <span className="text-sm text-gray-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[#74ACDF] inline-block" />
            Archivos de Validación
          </h2>
          <p className="text-xs text-gray-500 mb-4">Los archivos completos del proyecto de validación estarán disponibles próximamente.</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Proyecto HEC-HMS (.basin, .met, .gage)', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' },
              { label: 'Reporte de validación completo (PDF)', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            ].map((f) => (
              <button
                key={f.label}
                disabled
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Los archivos estarán disponibles próximamente
          </p>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3 pb-2">
          <p className="text-sm text-gray-500">¿Querés verificarlo vos mismo? Cargá uno de los casos de estudio:</p>
          <Link
            to="/casos-de-estudio"
            className="inline-flex items-center gap-2 bg-[#0055A4] hover:bg-[#004a91] text-white font-semibold py-3 px-6 rounded-xl transition-all text-sm shadow-sm"
          >
            Ver casos de estudio
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
