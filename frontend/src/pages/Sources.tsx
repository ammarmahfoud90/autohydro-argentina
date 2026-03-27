import { useState, useEffect } from 'react';
import { getLocalities, getLocality } from '../services/api';
import type { IDFLocality } from '../types/idf';

// Extended type for full locality data (includes idf_table from backend)
interface IDFLocalityFull extends IDFLocality {
  idf_table: {
    durations_min: number[];
    return_periods_years: number[];
    intensities_mm_hr: number[][];
  };
}

const TC_FORMULAS = [
  { name: 'Kirpich (1940)', inputs: 'L (m), S (m/m)', applicability: 'Cuencas rurales pequeñas' },
  { name: 'California Culverts (1942)', inputs: 'L (km), H (m)', applicability: 'Alcantarillas rurales' },
  { name: 'Témez (1978)', inputs: 'L (km), S (m/m)', applicability: 'Cuencas rurales medianas, España/Argentina' },
  { name: 'Giandotti (1934)', inputs: 'A (km²), L (km), Hm (m)', applicability: 'Cuencas medianas a grandes' },
  { name: 'Ventura-Heras', inputs: 'A (km²), S (m/m)', applicability: 'Cuencas rurales' },
  { name: 'Passini', inputs: 'A (km²), L (km), S (m/m)', applicability: 'Cuencas rurales medianas' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-[#74ACDF] inline-block shrink-0" />
      {children}
    </h2>
  );
}

function LocalitySourceCard({ localityId }: { localityId: string }) {
  const [data, setData] = useState<IDFLocalityFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocality(localityId)
      .then((d) => setData(d as IDFLocalityFull))
      .catch(console.error)
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

  if (!data) return null;

  const isShortSeries = data.source.series_length_years < 15;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{data.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{data.province}</p>
          </div>
          {isShortSeries && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shrink-0">
              Serie corta — datos orientativos
            </span>
          )}
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
            <div className="flex gap-3">
              <dt className="text-gray-400 w-36 shrink-0">Período de datos</dt>
              <dd className="text-gray-700">{data.source.series_period} ({data.source.series_length_years} años)</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-gray-400 w-36 shrink-0">Estaciones</dt>
              <dd className="text-gray-700">{data.source.stations.join(', ')}</dd>
            </div>
          </dl>
        </div>

        {/* Municipalities */}
        {data.municipalities.length > 0 && (
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
          <div className={`rounded-lg px-4 py-3 text-sm border ${isShortSeries ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            <div className="flex justify-between mb-1">
              <span>TR máximo confiable:</span>
              <span className="font-semibold">{data.limitations.max_reliable_return_period} años</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Cobertura espacial:</span>
              <span className="font-medium">{data.limitations.spatial_coverage}</span>
            </div>
            <p className="text-xs leading-relaxed border-t border-current/20 pt-2 mt-2">
              {data.limitations.series_note}
            </p>
          </div>
        </div>

        {/* IDF Table */}
        {data.idf_table && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Tabla IDF publicada (mm/hr)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border border-gray-200">
                    <th className="text-left px-3 py-2 text-gray-600 font-semibold border-r border-gray-200">
                      Duración (min)
                    </th>
                    {data.idf_table.return_periods_years.map((tr) => (
                      <th key={tr} className="text-center px-3 py-2 text-gray-600 font-semibold border-r border-gray-200 last:border-r-0">
                        TR = {tr} años
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.idf_table.durations_min.map((dur, di) => (
                    <tr key={dur} className={`border border-gray-200 ${di % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200">
                        {dur}
                      </td>
                      {data.idf_table.return_periods_years.map((_, ti) => (
                        <td key={ti} className="px-3 py-1.5 text-center tabular-nums text-gray-700 border-r border-gray-200 last:border-r-0">
                          {data.idf_table.intensities_mm_hr[ti]?.[di]?.toFixed(1) ?? '—'}
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
      </div>
    </div>
  );
}

export function Sources() {
  const [localityIds, setLocalityIds] = useState<string[]>([]);

  useEffect(() => {
    getLocalities()
      .then((locs) => setLocalityIds(locs.map((l) => l.id)))
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuentes y Metodología</h1>
          <p className="text-gray-500 text-sm mt-1">
            Transparencia total sobre el origen de los datos y los métodos de cálculo implementados.
          </p>
        </div>

        {/* Locality cards */}
        <section>
          <SectionTitle>Datos IDF por localidad</SectionTitle>
          <div className="space-y-6">
            {localityIds.map((id) => (
              <LocalitySourceCard key={id} localityId={id} />
            ))}
          </div>
        </section>

        {/* IDF formula */}
        <section className="bg-white rounded-2xl border border-gray-200 p-7">
          <SectionTitle>Fórmula IDF (APA Resolución 1334/21)</SectionTitle>
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 mb-4 font-mono text-sm text-gray-800">
            Ip = A / (Td + B)^C
          </div>
          <dl className="text-sm space-y-2 text-gray-600">
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
              <dd>Parámetros ajustados individualmente para cada período de retorno (TR) mediante el software AFMULTI (Paoli et al., FICH-UNL, 1991)</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            A diferencia de la fórmula de Sherman (<em>i = a·T^b / (t+c)^d</em>), esta formulación usa parámetros
            independientes por TR, lo que mejora el ajuste para cada período de retorno pero no permite
            interpolación directa de parámetros — la interpolación entre TR se hace sobre las intensidades calculadas.
          </p>
        </section>

        {/* Calculation methods */}
        <section className="bg-white rounded-2xl border border-gray-200 p-7">
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
        </section>

        {/* Tc formulas */}
        <section className="bg-white rounded-2xl border border-gray-200 p-7">
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
                  <tr key={f.name}>
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{f.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">{f.inputs}</td>
                    <td className="py-2.5 text-gray-500">{f.applicability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CN note */}
        <section className="bg-white rounded-2xl border border-gray-200 p-7">
          <SectionTitle>Números de Curva (CN)</SectionTitle>
          <p className="text-sm text-gray-600 leading-relaxed">
            Las tablas CN incluyen categorías de uso del suelo adaptadas a la práctica argentina:
            calles pavimentadas, residencial baja/alta densidad, pastizales, zonas agrícolas,
            montes nativos, entre otras. Los valores siguen el NEH-4 (USDA, 1972) para grupos
            hidrológicos A, B, C y D. El CN compuesto se calcula como promedio ponderado por área.
          </p>
        </section>

        {/* Disclaimer */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
          <p className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">Aviso:</span> Esta herramienta genera estimaciones para
            etapas de anteproyecto. Para diseños definitivos, verificar siempre con los estudios
            hidrológicos locales más recientes y las normativas provinciales vigentes.
          </p>
        </div>

      </div>
    </div>
  );
}
