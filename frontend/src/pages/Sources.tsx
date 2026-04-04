import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getLocality } from '../services/api';
import type { IDFLocality } from '../types/idf';
import { LOCALITIES_SUMMARY } from '../constants/localities-summary';

// Extended type for full locality data returned by /api/localities/:id
interface IDFLocalityFull extends IDFLocality {
  idf_table?: {
    durations_min: number[];
    return_periods_years: number[];
    intensities_mm_hr: number[][];
  };
  idf_formula?: {
    omega_by_return_period?: Record<string, number>;
    [key: string]: unknown;
  };
  p24h_by_station_mm?: {
    return_periods_years: number[];
    stations: Record<string, {
      coordinates_approx: { lat: number; lon: number };
      p24h_mm: number[];
    }>;
  };
}

// Group localities by province using the summary constants
const LOCALITIES_BY_PROVINCE = LOCALITIES_SUMMARY.reduce<Record<string, typeof LOCALITIES_SUMMARY>>((acc, loc) => {
  (acc[loc.province] ??= []).push(loc);
  return acc;
}, {});

const PROVINCE_ORDER = [
  'Chaco', 'Formosa', 'Entre Ríos', 'Santa Fe',
  'Buenos Aires', 'Córdoba', 'Mendoza', 'Neuquén', 'Salta', 'Tucumán', 'Catamarca',
];

const TC_FORMULAS = [
  { name: 'Kirpich (1940)', inputs: 'L (m), S (m/m)', applicability: 'Cuencas rurales pequeñas' },
  { name: 'California Culverts (1942)', inputs: 'L (km), H (m)', applicability: 'Alcantarillas rurales' },
  { name: 'Témez (1978)', inputs: 'L (km), S (m/m)', applicability: 'Cuencas rurales medianas, España/Argentina' },
  { name: 'Giandotti (1934)', inputs: 'A (km²), L (km), Hm (m)', applicability: 'Cuencas medianas a grandes' },
  { name: 'Ventura-Heras', inputs: 'A (km²), S (m/m)', applicability: 'Cuencas rurales' },
  { name: 'Passini', inputs: 'A (km²), L (km), S (m/m)', applicability: 'Cuencas rurales medianas' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-blue-400 inline-block shrink-0" />
      {children}
    </h2>
  );
}

function ReliabilityBadge({ years }: { years: number | null | undefined }) {
  if (years == null) return null;
  if (years > 30) {
    return (
      <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full shrink-0">
        Serie larga ({years} años)
      </span>
    );
  }
  if (years >= 15) {
    return (
      <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-full shrink-0">
        Serie media ({years} años)
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full shrink-0">
      Serie corta ({years} años)
    </span>
  );
}

function LocalitySourceCard({ localityId }: { localityId: string }) {
  const [data, setData] = useState<IDFLocalityFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getLocality(localityId)
      .then((d) => setData(d as IDFLocalityFull))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [localityId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/2 mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
          <div className="h-3 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <p className="text-sm text-red-600">No se pudo cargar la información de esta localidad.</p>
      </div>
    );
  }

  const years = data.source.series_length_years;
  const isShortSeries = years != null && years < 15;

  const seriesSummary =
    data.source.series_period != null
      ? `${data.source.series_period}${years != null ? ` (${years} años)` : ''}`
      : years != null
        ? `${years} años`
        : null;

  const idfModel = data.idf_model ?? 'apa_chaco';

  const MODEL_LABELS: Record<string, string> = {
    apa_chaco: 'APA Chaco',
    ina_cra_mendoza: 'INA-CRA Mendoza',
    neuquen_ssrh: 'SsRH Neuquén',
    sherman_4p: 'Sherman 4P',
    talbot_cef: 'Talbot-CEF',
    sherman_power: 'Sherman Power',
    dit_3p: 'DIT 3P',
    dit_tucuman: 'DIT Tucumán',
    simple_scaling_table: 'Simple Scaling (tabla)',
  };

  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Card header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{data.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                {MODEL_LABELS[idfModel] ?? idfModel}
              </span>
            </div>
          </div>
          <ReliabilityBadge years={years} />
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Source metadata */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Fuente oficial
          </p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-3">
              <dt className="text-gray-400 w-36 shrink-0">Documento</dt>
              <dd className="text-gray-700 font-medium">{data.source.document}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-gray-400 w-36 shrink-0">Institución</dt>
              <dd className="text-gray-700">{data.source.institution}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-gray-400 w-36 shrink-0">Fecha</dt>
              <dd className="text-gray-700">{data.source.date}</dd>
            </div>
            {seriesSummary != null && (
              <div className="flex gap-3">
                <dt className="text-gray-400 w-36 shrink-0">Período de datos</dt>
                <dd className="text-gray-700">{seriesSummary}</dd>
              </div>
            )}
            {data.source.stations != null && data.source.stations.length > 0 && (
              <div className="flex gap-3">
                <dt className="text-gray-400 w-36 shrink-0">Estaciones</dt>
                <dd className="text-gray-700">{data.source.stations.join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Municipalities */}
        {(data.municipalities?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Municipios cubiertos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.municipalities.map((m) => (
                <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Limitations */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Limitaciones
          </p>
          <div className={`rounded-xl px-4 py-3 text-sm border ${isShortSeries ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            {data.limitations.max_reliable_return_period != null && (
              <div className="flex justify-between mb-1">
                <span>TR máximo confiable:</span>
                <span className="font-semibold">{data.limitations.max_reliable_return_period} años</span>
              </div>
            )}
            {data.limitations.spatial_coverage != null && (
              <div className="flex justify-between mb-2">
                <span>Cobertura espacial:</span>
                <span className="font-medium">{data.limitations.spatial_coverage}</span>
              </div>
            )}
            {data.limitations.series_note != null && (
              <p className="text-xs leading-relaxed border-t border-current/20 pt-2 mt-2">
                {data.limitations.series_note}
              </p>
            )}
          </div>
        </div>

        {/* APA Chaco: IDF Table */}
        {idfModel === 'apa_chaco' && data.idf_table && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Tabla IDF publicada (mm/hr)
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold border-b border-r border-gray-200">
                      Duración (min)
                    </th>
                    {data.idf_table.return_periods_years.map((tr) => (
                      <th key={tr} className="text-center px-3 py-2 text-gray-600 font-semibold border-b border-r border-gray-200 last:border-r-0">
                        TR = {tr} años
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.idf_table.durations_min.map((dur, di) => (
                    <tr key={dur} className={`${di % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200">
                        {dur}
                      </td>
                      {data.idf_table!.return_periods_years.map((_, ti) => (
                        <td key={ti} className="px-3 py-1.5 text-center tabular-nums text-gray-700 border-r border-gray-200 last:border-r-0">
                          {data.idf_table!.intensities_mm_hr[ti]?.[di]?.toFixed(1) ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Fuente: {data.source.document}. Las fórmulas analíticas se usan para interpolación entre TR.
            </p>
          </div>
        )}

        {/* INA-CRA Mendoza: formula + omega table */}
        {idfModel === 'ina_cra_mendoza' && data.idf_formula?.omega_by_return_period && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Modelo IDF — INA-CRA 2008
            </p>
            <div className="bg-gray-900 rounded-xl border border-gray-700 px-4 py-3 font-mono text-sm text-green-400 mb-3">
              I = ω(TR) / (D + 0.268)^0.883
            </div>
            <dl className="text-xs text-gray-500 space-y-0.5 mb-3">
              <div><span className="font-medium text-gray-700">I</span> — Intensidad (mm/h)</div>
              <div><span className="font-medium text-gray-700">D</span> — Duración en horas</div>
              <div><span className="font-medium text-gray-700">ω</span> — Parámetro dependiente del TR (tabla abajo)</div>
            </dl>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold border-b border-r border-gray-200">
                      TR (años)
                    </th>
                    <th className="text-center px-3 py-2 text-gray-600 font-semibold border-b border-gray-200">
                      ω (omega)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.idf_formula.omega_by_return_period).map(([tr, omega], i) => (
                    <tr key={tr} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200">{tr}</td>
                      <td className="px-3 py-1.5 text-center tabular-nums text-gray-700">{omega}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Fuente: {data.source.document}. Normativa vigente: Resolución DH 034/2019, Dirección de Hidráulica, Mendoza.
            </p>
          </div>
        )}

        {/* SsRH Neuquén: two formulas + P24h table */}
        {idfModel === 'neuquen_ssrh' && data.p24h_by_station_mm && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Modelo IDF — SsRH Neuquén 2018
            </p>
            <div className="space-y-2">
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-4 py-3 text-xs">
                <p className="font-semibold text-blue-300 mb-1">D ≤ 1 h — Fórmula de Cartaya</p>
                <p className="font-mono text-green-400">I = (1.041 · D^0.49 · P₁ₕ) / D</p>
                <p className="text-gray-400 mt-1">P₁ₕ = 0.59 · P₂₄ₕ (constante regional)</p>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-4 py-3 text-xs">
                <p className="font-semibold text-blue-300 mb-1">D &gt; 1 h — MIC (Método de Intensidad Contigua)</p>
                <p className="font-mono text-green-400">I = 13.98 · I₂₄ · D^(-0.83)</p>
                <p className="text-gray-400 mt-1">I₂₄ = P₂₄ₕ / 24 — D en horas</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                P₂₄ₕ por estación (mm) — seleccionar según polígonos de Thiessen de la SsRH
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-gray-600 font-semibold border-b border-r border-gray-200">
                        Estación
                      </th>
                      {data.p24h_by_station_mm.return_periods_years.map((tr) => (
                        <th key={tr} className="text-center px-2 py-2 text-gray-600 font-semibold border-b border-r border-gray-200 last:border-r-0">
                          TR={tr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.p24h_by_station_mm.stations).map(([station, stData], i) => (
                      <tr key={station} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/50 transition-colors`}>
                        <td className="px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {station}
                        </td>
                        {stData.p24h_mm.map((val, ti) => (
                          <td key={ti} className="px-2 py-1.5 text-center tabular-nums text-gray-700 border-r border-gray-200 last:border-r-0">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Fuente: {data.source.document}. Unidades: mm.
              </p>
            </div>
          </div>
        )}

        {/* Simple Scaling Table: show IDF table */}
        {idfModel === 'simple_scaling_table' && data.idf_table && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Tabla IDF publicada (mm/hr)
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold border-b border-r border-gray-200">
                      Duración (min)
                    </th>
                    {data.idf_table.return_periods_years.map((tr) => (
                      <th key={tr} className="text-center px-3 py-2 text-gray-600 font-semibold border-b border-r border-gray-200 last:border-r-0">
                        TR = {tr} años
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.idf_table.durations_min.map((dur, di) => (
                    <tr key={dur} className={`${di % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200">
                        {dur}
                      </td>
                      {data.idf_table!.return_periods_years.map((_, ti) => (
                        <td key={ti} className="px-3 py-1.5 text-center tabular-nums text-gray-700 border-r border-gray-200 last:border-r-0">
                          {data.idf_table!.intensities_mm_hr[ti]?.[di]?.toFixed(1) ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Interpolación log-lineal en TR. Fuente: {data.source.document}.
            </p>
          </div>
        )}

      </div>
    </motion.div>
  );
}

export function Sources() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header with gradient */}
      <section
        className="py-12 px-4 sm:px-6"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2a5e 100%)' }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">Fuentes y Metodología</h1>
            <p className="text-blue-300 text-sm">
              Transparencia total sobre el origen de los datos y los métodos de cálculo implementados.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="text-xs font-medium text-green-300 bg-green-900/40 border border-green-700/50 px-2.5 py-1 rounded-full">
                Serie larga &gt;30 años
              </span>
              <span className="text-xs font-medium text-yellow-300 bg-yellow-900/40 border border-yellow-700/50 px-2.5 py-1 rounded-full">
                Serie media 15–30 años
              </span>
              <span className="text-xs font-medium text-orange-300 bg-orange-900/40 border border-orange-700/50 px-2.5 py-1 rounded-full">
                Serie corta &lt;15 años — datos orientativos
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Locality cards grouped by province */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <SectionTitle>Datos IDF por localidad</SectionTitle>

          <div className="space-y-10">
            {PROVINCE_ORDER.filter((prov) => LOCALITIES_BY_PROVINCE[prov]).map((province) => (
              <div key={province}>
                {/* Province header */}
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    {province}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    {LOCALITIES_BY_PROVINCE[province].length}{' '}
                    {LOCALITIES_BY_PROVINCE[province].length === 1 ? 'localidad' : 'localidades'}
                  </span>
                </div>

                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                  className="space-y-5"
                >
                  {LOCALITIES_BY_PROVINCE[province].map((loc) => (
                    <LocalitySourceCard key={loc.id} localityId={loc.id} />
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* IDF models */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm"
        >
          <SectionTitle>Modelos IDF implementados</SectionTitle>

          <div className="space-y-6">

            {/* APA Chaco */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">APA Chaco — Resolución 1334/21</p>
              <p className="text-xs text-gray-500 mb-2">Chaco (Gran Resistencia, P.R. Sáenz Peña) · Formosa (El Colorado)</p>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-4 mb-3 font-mono text-sm text-green-400">
                Ip = A / (Td + B)^C
              </div>
              <dl className="text-sm space-y-1.5 text-gray-600">
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">Ip</dt>
                  <dd>Intensidad de precipitación de diseño (mm/hr)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">Td</dt>
                  <dd>Duración de la tormenta (minutos)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">A, B, C</dt>
                  <dd>Parámetros ajustados individualmente para cada TR mediante AFMULTI (Paoli et al., FICH-UNL, 1991)</dd>
                </div>
              </dl>
            </div>

            <hr className="border-gray-100" />

            {/* Sherman 4P */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Sherman 4P — Modelo potencial cuádruple</p>
              <p className="text-xs text-gray-500 mb-2">Entre Ríos (Concordia, Concepción del Uruguay, Paraná) · Santa Fe (CIM-FICH)</p>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-4 mb-3 font-mono text-sm text-green-400">
                i = K · Tr^m / (d + c)^n
              </div>
              <dl className="text-sm space-y-1.5 text-gray-600">
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">i</dt>
                  <dd>Intensidad (mm/hr)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">Tr</dt>
                  <dd>Período de retorno (años)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">d</dt>
                  <dd>Duración (minutos)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">K, m, c, n</dt>
                  <dd>Parámetros calibrados por regresión múltiple (Zamanillo et al. 2008 para ER; Marcus et al. 2019 para SF)</dd>
                </div>
              </dl>
            </div>

            <hr className="border-gray-100" />

            {/* Talbot-CEF */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Talbot-CEF — Parámetros dependientes del TR</p>
              <p className="text-xs text-gray-500 mb-2">Buenos Aires — Azul y aledaños (Collazos & Cazenave 2015)</p>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-4 mb-3 font-mono text-sm text-green-400">
                i = c(TR) / (d^e(TR) + f(TR))
              </div>
              <dl className="text-sm space-y-1.5 text-gray-600">
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">i</dt>
                  <dd>Intensidad (mm/hr)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">d</dt>
                  <dd>Duración (minutos)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">c, e, f</dt>
                  <dd>Parámetros ajustados para cada TR por separado — se interpola entre TRs tabulados</dd>
                </div>
              </dl>
            </div>

            <hr className="border-gray-100" />

            {/* Sherman Power */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Sherman Power — Ley potencial simple</p>
              <p className="text-xs text-gray-500 mb-2">Buenos Aires — Balcarce (Puricelli & Marino 2014, INTA Balcarce)</p>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-4 mb-3 font-mono text-sm text-green-400">
                i = τ · T^ε / d^η
              </div>
              <dl className="text-sm space-y-1.5 text-gray-600">
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">i</dt>
                  <dd>Intensidad (mm/hr)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">T</dt>
                  <dd>Período de retorno (años)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">d</dt>
                  <dd>Duración (minutos)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">τ, ε, η</dt>
                  <dd>Parámetros calibrados con análisis de frecuencia Gumbel sobre 23 años de datos pluviográficos</dd>
                </div>
              </dl>
            </div>

            <hr className="border-gray-100" />

            {/* DIT 3P */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">DIT 3P — Desagregación Infra-Temporal (3 parámetros)</p>
              <p className="text-xs text-gray-500 mb-2">Córdoba (Observatorio, La Suela, Pampa de Olaen, Altas Cumbres) · Salta Capital (Rico et al. 2024–2025, INA-CIRSA)</p>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-4 mb-3 text-sm space-y-1">
                <p className="font-mono text-green-400">ln(i) = A · φ_T − B · δ_d + C</p>
                <p className="font-mono text-blue-300 text-xs">φ_T = 2.584458 · (ln T)^(3/8) − 2.252573</p>
                <p className="font-mono text-blue-300 text-xs">δ_d = (ln d)^(5/3)    [d en minutos]</p>
              </div>
              <dl className="text-sm space-y-1.5 text-gray-600">
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">A</dt>
                  <dd>Parámetro de frecuencia (sensibilidad al TR)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">B</dt>
                  <dd>Parámetro de escala temporal (sensibilidad a la duración)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">C</dt>
                  <dd>Constante de ajuste de la intensidad base</dd>
                </div>
              </dl>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Basado en la teoría de escalado simple de la precipitación subdiaría.
                φ_T es el cuantil de una distribución de valores extremos normalizada según Koutsoyiannis (1994).
              </p>
            </div>

            <hr className="border-gray-100" />

            {/* DIT Tucumán */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">DIT Tucumán — Desagregación con cuantil Normal</p>
              <p className="text-xs text-gray-500 mb-2">Tucumán — Red provincial 28 estaciones (Bazzano 2019, UNT-FACET)</p>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-4 mb-3 text-sm space-y-1">
                <p className="font-mono text-green-400">ln(i) = A' · Ø_T − B · δ_d + C'</p>
                <p className="font-mono text-blue-300 text-xs">Ø_T = cuantil Normal estándar para prob. 1−1/T</p>
                <p className="font-mono text-blue-300 text-xs">B = 0.1458 (constante regional fija)</p>
                <p className="font-mono text-blue-300 text-xs">δ_d = (ln d)^(5/3)    [d en minutos]</p>
              </div>
              <dl className="text-sm space-y-1.5 text-gray-600">
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">A'</dt>
                  <dd>Parámetro de frecuencia — calibrado por estación</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">C'</dt>
                  <dd>Constante — calibrada por estación</dd>
                </div>
              </dl>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Variante del DIT 3P donde el cuantil de frecuencia sigue una distribución Normal en lugar de
                la distribución de Koutsoyiannis. Calibrado sobre 28 estaciones de la red provincial de Tucumán.
              </p>
            </div>

            <hr className="border-gray-100" />

            {/* INA-CRA Mendoza */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">INA-CRA Mendoza — 2008 (Res. DH 034/2019)</p>
              <p className="text-xs text-gray-500 mb-2">Mendoza — Pedemonte del Gran Mendoza</p>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-4 mb-3 font-mono text-sm text-green-400">
                I = ω(TR) / (D + 0.268)^0.883
              </div>
              <dl className="text-sm space-y-1.5 text-gray-600">
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">I</dt>
                  <dd>Intensidad (mm/h)</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">D</dt>
                  <dd>Duración en horas</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-medium text-gray-700 w-8">ω</dt>
                  <dd>Parámetro dependiente del TR. Derivado de análisis Log-Normal sobre 101 tormentas convectivas (1982–1995)</dd>
                </div>
              </dl>
            </div>

            <hr className="border-gray-100" />

            {/* SsRH Neuquén */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">SsRH Neuquén — Instructivo ERH 2018</p>
              <p className="text-xs text-gray-500 mb-2">Neuquén — Zona Aluvional (centro-norte, Vaca Muerta)</p>
              <div className="space-y-2 mb-3">
                <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-3 text-sm">
                  <p className="text-xs font-medium text-blue-300 mb-1">D ≤ 1 h — Cartaya</p>
                  <p className="font-mono text-green-400">I = (1.041 · D^0.49 · P₁ₕ) / D</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-3 text-sm">
                  <p className="text-xs font-medium text-blue-300 mb-1">D &gt; 1 h — MIC</p>
                  <p className="font-mono text-green-400">I = 13.98 · I₂₄ · D^(-0.83)</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                P₁ₕ = 0.59 · P₂₄ₕ (relación constante para la zona aluvional). P₂₄ₕ se obtiene de la tabla por estación
                según polígonos de Thiessen de la SsRH Neuquén.
              </p>
            </div>

            <hr className="border-gray-100" />

            {/* Simple Scaling Table */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Simple Scaling — Consulta de tabla con interpolación</p>
              <p className="text-xs text-gray-500 mb-2">Catamarca — El Rodeo (INA-CRA IT Nº 145, 2012)</p>
              <div className="bg-gray-900 rounded-xl border border-gray-700 px-5 py-4 mb-3 text-sm space-y-1">
                <p className="font-mono text-green-400">i(d, TR) ← tabla publicada</p>
                <p className="font-mono text-blue-300 text-xs">Interpolación log-lineal en TR entre valores tabulados</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                No utiliza una fórmula analítica continua. Los valores de intensidad provienen directamente
                de la tabla IDF calibrada. Para TR intermedios se aplica interpolación log-lineal
                (lineal en ln TR). Duraciones y TR deben estar dentro del rango tabulado.
              </p>
            </div>

          </div>
        </motion.section>

        {/* Calculation methods */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm"
        >
          <SectionTitle>Métodos de cálculo hidrológico</SectionTitle>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-gray-800">Método Racional</p>
              <p className="mt-1 leading-relaxed">
                Q = C · i · A / 3.6 — Para cuencas pequeñas (&lt; 2–5 km²). La intensidad i corresponde
                al período de retorno de diseño para una duración igual al Tc.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Método SCS-CN (USDA)</p>
              <p className="mt-1 leading-relaxed">
                Basado en el Número de Curva (CN), tablas del Manual de Ingeniería (NEH-4, 1972)
                adaptadas para usos de suelo argentinos. Calcula lluvia neta (Pe) y luego caudal
                pico mediante el Hidrograma Unitario SCS.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Tc formulas */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm"
        >
          <SectionTitle>Fórmulas de Tiempo de Concentración (Tc)</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-600 font-semibold">Fórmula</th>
                  <th className="text-left py-2 pr-4 text-gray-600 font-semibold">Variables</th>
                  <th className="text-left py-2 text-gray-600 font-semibold">Aplicabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TC_FORMULAS.map((f) => (
                  <tr key={f.name} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{f.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">{f.inputs}</td>
                    <td className="py-2.5 text-gray-500">{f.applicability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* CN note */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm"
        >
          <SectionTitle>Números de Curva (CN)</SectionTitle>
          <p className="text-sm text-gray-600 leading-relaxed">
            Las tablas CN incluyen categorías de uso del suelo adaptadas a la práctica argentina:
            calles pavimentadas, residencial baja/alta densidad, pastizales, zonas agrícolas,
            montes nativos, entre otras. Los valores siguen el NEH-4 (USDA, 1972) para grupos
            hidrológicos A, B, C y D. El CN compuesto se calcula como promedio ponderado por área.
          </p>
        </motion.section>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-xl bg-amber-50 border border-amber-200 p-5"
        >
          <p className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">Aviso:</span> Esta herramienta genera estimaciones para
            etapas de anteproyecto. Para diseños definitivos, verificar siempre con los estudios
            hidrológicos locales más recientes y las normativas provinciales vigentes.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
