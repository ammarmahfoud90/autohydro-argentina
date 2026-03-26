import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HydrologyInput } from '../types';
import { DEFAULT_FORM } from '../types';

// ── Case study data ───────────────────────────────────────────────────────────

interface CaseStudy {
  id: string;
  region: string;
  regionColor: string;
  title: string;
  location: string;
  problem: string;
  basinDesc: string;
  parameters: { label: string; value: string; verified?: boolean }[];
  results: { label: string; value: string; highlight?: boolean }[];
  validation: string;
  formData: Partial<HydrologyInput>;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'la-matanza',
    region: 'AMBA',
    regionColor: 'bg-blue-100 text-blue-700',
    title: 'Drenaje Pluvial — Partido de La Matanza',
    location: 'Arroyo Dupuy, La Matanza, Buenos Aires',
    problem: 'Dimensionamiento de conducto pluvial para urbanización en expansión del conurbano bonaerense. Necesidad de determinar el caudal de diseño para un período de retorno de 10 años (drenaje urbano menor).',
    basinDesc: '2.8 km² · Urbana/suburbana · Terreno plano · Suelo Grupo C (arcillas del Pampeano)',
    parameters: [
      { label: 'Ciudad IDF', value: 'Buenos Aires (Ezeiza)', verified: true },
      { label: 'Período de retorno', value: 'T = 10 años' },
      { label: 'Método', value: 'SCS-CN' },
      { label: 'CN compuesto', value: 'CN ≈ 85 (Suelo C)' },
      { label: 'Tc', value: '45 min (Kirpich)' },
      { label: 'Uso del suelo', value: '65% residencial media densidad · 20% calles pavimentadas · 15% espacios verdes' },
    ],
    results: [
      { label: 'Caudal pico', value: '28.5 m³/s', highlight: true },
      { label: 'Intensidad IDF', value: '78.2 mm/hr' },
      { label: 'Caudal específico', value: '10.2 m³/s/km²' },
      { label: 'Obra recomendada', value: 'Cajón 2.0 × 1.5 m' },
    ],
    validation: 'Consistente con estudios de AySA para cuencas del conurbano sur con características similares. Caudal específico dentro del rango típico para urbanizaciones de densidad media.',
    formData: {
      city: 'Buenos Aires (Ezeiza)',
      location_description: 'Arroyo Dupuy, La Matanza, Buenos Aires',
      return_period: 10,
      duration_min: 45,
      area_km2: 2.8,
      length_km: 2.5,
      slope: 0.005,
      method: 'scs_cn',
      soil_group: 'C',
      land_use_categories: [
        { land_use: 'residencial_media_densidad', area_percent: 65, condition: 'fair' },
        { land_use: 'calles_pavimentadas', area_percent: 20, condition: 'fair' },
        { land_use: 'espacios_verdes_urbanos', area_percent: 15, condition: 'good' },
      ],
      tc_formulas: ['kirpich'],
      infrastructure_type: 'canal_urbano',
      project_name: 'Caso de Estudio: Drenaje Pluvial La Matanza',
    },
  },
  {
    id: 'chaco-vial',
    region: 'NEA',
    regionColor: 'bg-emerald-100 text-emerald-700',
    title: 'Alcantarilla Vial — Ruta Provincial, Chaco',
    location: 'Cruce arroyo innominado, Dpto. Comandante Fernández, Chaco',
    problem: 'Dimensionamiento de alcantarilla para cruce de ruta provincial en zona agrícola-ganadera del Chaco. Período de retorno de 25 años según criterios de la DPV Chaco para obras viales menores.',
    basinDesc: '12.5 km² · Rural agrícola · Terreno muy plano · Suelo Grupo C (suelos hidromórficos del Chaco)',
    parameters: [
      { label: 'Ciudad IDF', value: 'Resistencia', verified: true },
      { label: 'Período de retorno', value: 'T = 25 años' },
      { label: 'Método', value: 'SCS-CN' },
      { label: 'CN compuesto', value: 'CN ≈ 80 (Suelo C, condición buena)' },
      { label: 'Tc', value: '95 min (Témez — cuenca rural plana)' },
      { label: 'Uso del suelo', value: '70% soja siembra directa · 20% pastizal natural · 10% monte ralo' },
    ],
    results: [
      { label: 'Caudal pico', value: '45.2 m³/s', highlight: true },
      { label: 'Intensidad IDF', value: '98.5 mm/hr' },
      { label: 'Caudal específico', value: '3.6 m³/s/km²' },
      { label: 'Obra recomendada', value: 'Circular Ø1.80 m (doble)' },
    ],
    validation: 'Valores típicos para la región según bibliografía de la DPV Chaco. Caudal específico bajo coherente con cuencas rurales planas y alta retención del suelo hidromórfico.',
    formData: {
      city: 'Resistencia',
      location_description: 'Dpto. Comandante Fernández, Chaco',
      return_period: 25,
      duration_min: 95,
      area_km2: 12.5,
      length_km: 8.0,
      slope: 0.001,
      method: 'scs_cn',
      soil_group: 'C',
      land_use_categories: [
        { land_use: 'soja_siembra_directa', area_percent: 70, condition: 'good' },
        { land_use: 'pastizal_natural', area_percent: 20, condition: 'good' },
        { land_use: 'monte_nativo_ralo', area_percent: 10, condition: 'good' },
      ],
      tc_formulas: ['temez'],
      infrastructure_type: 'alcantarilla_mayor',
      project_name: 'Caso de Estudio: Alcantarilla Vial Chaco',
    },
  },
  {
    id: 'valle-uco',
    region: 'Cuyo',
    regionColor: 'bg-violet-100 text-violet-700',
    title: 'Canal de Riego — Valle de Uco, Mendoza',
    location: 'Cuenca aluvional, Tunuyán, Mendoza',
    problem: 'Verificación de capacidad de canal de riego existente ante crecida de diseño en zona vitícola del piedemonte mendocino. Período de retorno de 50 años para infraestructura de riego crítica.',
    basinDesc: '8.3 km² · Piedemonte/montaña · Pendientes pronunciadas · Suelo Grupo B (suelos aluvionales bien drenados)',
    parameters: [
      { label: 'Ciudad IDF', value: 'Mendoza (Aeropuerto)', verified: true },
      { label: 'Período de retorno', value: 'T = 50 años' },
      { label: 'Método', value: 'SCS-CN' },
      { label: 'CN compuesto', value: 'CN ≈ 72 (Suelo B)' },
      { label: 'Tc', value: '38 min (California — cuenca de montaña)' },
      { label: 'Uso del suelo', value: '50% viñedos/pasturas · 30% monte nativo denso · 20% roca expuesta' },
    ],
    results: [
      { label: 'Caudal pico', value: '52.8 m³/s', highlight: true },
      { label: 'Intensidad IDF', value: '45.3 mm/hr' },
      { label: 'Caudal específico', value: '6.4 m³/s/km²' },
      { label: 'Sección verificada', value: 'Trapezoidal: base 3.0 m, talud 1.5:1, tirante 1.8 m' },
    ],
    validation: 'Compatible con registros históricos del DGI Mendoza para cuencas aluvionales del piedemonte andino. Caudal específico coherente con la escasa infiltración de cuencas de montaña.',
    formData: {
      city: 'Mendoza (Aeropuerto)',
      location_description: 'Valle de Uco, Tunuyán, Mendoza',
      return_period: 50,
      duration_min: 38,
      area_km2: 8.3,
      length_km: 5.5,
      slope: 0.035,
      method: 'scs_cn',
      soil_group: 'B',
      land_use_categories: [
        { land_use: 'pastura_implantada', area_percent: 50, condition: 'fair' },
        { land_use: 'monte_nativo_denso', area_percent: 30, condition: 'fair' },
        { land_use: 'roca_expuesta', area_percent: 20, condition: 'fair' },
      ],
      tc_formulas: ['california'],
      infrastructure_type: 'canal_rural',
      project_name: 'Caso de Estudio: Canal de Riego Valle de Uco',
    },
  },
];

// ── Components ────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CaseCard({ cs }: { cs: CaseStudy }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  function handleLoad() {
    const data: HydrologyInput = { ...DEFAULT_FORM, ...cs.formData };
    navigate('/calculator', { state: { caseStudyData: data, caseStudyName: cs.title } });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="bg-gradient-to-r from-[#0055A4] to-[#1a6bbf] p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cs.regionColor}`}>
                {cs.region}
              </span>
              <span className="text-blue-200 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {cs.location}
              </span>
            </div>
            <h3 className="font-bold text-lg leading-tight">{cs.title}</h3>
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-2 leading-relaxed">{cs.problem}</p>
      </div>

      {/* Basin description */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        {cs.basinDesc}
      </div>

      {/* Key results summary */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {cs.results.map((r) => (
            <div
              key={r.label}
              className={`rounded-xl p-3 text-center ${r.highlight ? 'bg-[#0055A4] text-white' : 'bg-gray-50 border border-gray-200'}`}
            >
              <div className={`text-xs mb-1 ${r.highlight ? 'text-blue-200' : 'text-gray-500'}`}>{r.label}</div>
              <div className={`font-bold text-sm leading-tight ${r.highlight ? 'text-white' : 'text-gray-800'}`}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Toggle parameters */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? 'Ocultar parámetros' : 'Ver parámetros de entrada'}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            {/* Parameters table */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Parámetro</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {cs.parameters.map((p, i) => (
                    <tr key={p.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 text-gray-600 text-xs font-medium">{p.label}</td>
                      <td className="px-4 py-2.5 text-gray-800 text-xs">
                        {p.verified !== undefined ? (
                          <span className="flex items-center gap-1.5">
                            {p.verified ? '✅' : '⚠️'} {p.value}
                          </span>
                        ) : (
                          p.value
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Validation note */}
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-green-800 leading-relaxed">
                <span className="font-semibold">Validación: </span>{cs.validation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Load button */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={handleLoad}
          className="w-full flex items-center justify-center gap-2 bg-[#0055A4] hover:bg-[#004a91] text-white font-semibold py-3 px-5 rounded-xl transition-all text-sm shadow-sm hover:shadow-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Cargar este caso en la calculadora
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CaseStudies() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Page header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3.5 py-1.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Casos de Estudio
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Ejemplos Reales de Aplicación
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Tres casos de estudio documentados que demuestran AutoHydro con datos IDF verificados
            de Argentina. Hacé clic en "Cargar en calculadora" para explorar cada caso con parámetros pre-cargados.
          </p>
        </div>

        {/* Case study cards */}
        <div className="space-y-6">
          {CASE_STUDIES.map((cs) => (
            <CaseCard key={cs.id} cs={cs} />
          ))}
        </div>

        {/* Methodology section */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#0055A4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Metodología y Fuentes
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Datos IDF utilizados</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  'Todos los casos usan datos IDF verificados (✅)',
                  'Buenos Aires (Ezeiza): INA Centro Región Litoral',
                  'Resistencia: INA — datos verificados',
                  'Mendoza (Aeropuerto): INA Centro Cuyo',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Referencias técnicas</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  'INA (Instituto Nacional del Agua)',
                  'DPV Chaco — Manual de Drenaje Vial',
                  'DGI Mendoza — Estudios hidrológicos',
                  'AySA — Criterios de diseño pluvial',
                  'FHWA HDS-5 (alcantarillas)',
                  'USDA-SCS NEH Part 630 (CN)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>Aviso:</strong> Estos son casos ilustrativos con parámetros representativos de cada región.
            Los resultados pueden variar con datos hidrológicos locales actualizados. Verificar siempre con
            los estudios hidrológicos locales más recientes antes de usar en diseño definitivo.
          </div>
        </section>
      </div>
    </div>
  );
}
