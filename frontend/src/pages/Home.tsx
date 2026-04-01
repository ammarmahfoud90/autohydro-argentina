import { Link } from 'react-router-dom';
import { LOCALITIES_SUMMARY } from '../constants/localities-summary';
import type { LocalitySummary } from '../constants/localities-summary';

const GITHUB_URL = 'https://github.com/ammarmahfoud90/autohydro-argentina';
const LINKEDIN_URL = 'https://www.linkedin.com/in/ammar-mahfoud-499212118';

const TOOLS = [
  {
    label: 'Hidrología',
    desc: 'Caudales de diseño con métodos Racional y SCS-CN. Análisis de Tc, CN y generación de memorias PDF.',
    href: '/calculator',
  },
  {
    label: 'Hidráulica (Manning)',
    desc: 'Capacidad de canales abiertos: trapecial, rectangular, circular y triangular.',
    href: '/calculadora/manning',
  },
  {
    label: 'Alcantarillas',
    desc: 'Dimensionamiento de alcantarillas según FHWA HDS-5: control por entrada y salida.',
    href: '/calculadora/alcantarilla',
  },
  {
    label: 'Hietogramas',
    desc: 'Tormenta de diseño con distribución temporal: Bloques Alternos, SCS Tipo II, Chicago, Uniforme.',
    href: '/calculadora/hietograma',
  },
];

function LocalityCard({ loc }: { loc: LocalitySummary }) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${loc.warning_badge ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{loc.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{loc.province}</p>
        </div>
        {loc.warning_badge && (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
            {loc.warning_badge}
          </span>
        )}
      </div>
      <dl className="space-y-1.5 text-xs text-gray-600">
        <div className="flex justify-between">
          <dt className="text-gray-400">Fuente</dt>
          <dd className="text-right max-w-[60%] leading-tight">{loc.source_document}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-400">Período</dt>
          <dd>{loc.series_period}</dd>
        </div>
        {loc.max_reliable_return_period != null && (
          <div className="flex justify-between">
            <dt className="text-gray-400">TR máximo confiable</dt>
            <dd>{loc.max_reliable_return_period} años</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function Home() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-[#0055A4] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[#74ACDF] text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#74ACDF]" />
            Datos IDF verificados — 5 localidades
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">
            AutoHydro Argentina
          </h1>
          <p className="text-[#74ACDF] text-lg sm:text-xl font-medium mb-4">
            Herramienta de cálculo hidrológico e hidráulico con datos IDF verificados
          </p>
          <p className="text-white/75 text-base max-w-2xl leading-relaxed mb-8">
            Calculá caudales de diseño usando datos de intensidad-duración-frecuencia de fuentes
            oficiales argentinas. Método Racional, SCS-CN, fórmulas de Tc, Manning y alcantarillas.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 bg-[#74ACDF] hover:bg-[#5a98d0] text-[#0055A4] font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
            >
              Iniciar Cálculo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/sources"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-5 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Ver Fuentes y Metodología
            </Link>
          </div>
        </div>
      </section>

      {/* ── Localities ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Localidades con datos IDF verificados
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Datos IDF de fuentes oficiales verificadas: Resolución APA 1334/21 (Chaco),
          INA-CRA 2008 (Mendoza) y SsRH Neuquén 2018.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {LOCALITIES_SUMMARY.map((loc) => (
            <LocalityCard key={loc.id} loc={loc} />
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Se incorporarán nuevas localidades a medida que se verifiquen fuentes oficiales.{' '}
          <Link to="/sources" className="text-[#0055A4] hover:underline">
            Ver detalles completos y tablas IDF →
          </Link>
        </p>
      </section>

      {/* ── Tools ─────────────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Calculadoras disponibles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                to={tool.href}
                className="group block bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                      {tool.label}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{tool.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology note ──────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-6">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">Metodología</h2>
          <p className="text-sm text-blue-800 leading-relaxed">
            AutoHydro implementa métodos estándar de ingeniería hidrológica: Método Racional,
            SCS-CN (USDA), 6 fórmulas de Tiempo de Concentración, ecuación de Manning y
            dimensionamiento de alcantarillas según FHWA HDS-5. Los datos IDF provienen
            exclusivamente de fuentes oficiales verificadas.
          </p>
        </div>
      </section>

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Aviso:</span> Esta herramienta genera estimaciones para
            etapas de anteproyecto. Para diseños definitivos, verificar siempre con los estudios
            hidrológicos locales más recientes y las normativas provinciales vigentes.
          </p>
        </div>
      </section>

      {/* ── Developer credit ──────────────────────────────────────────────── */}
      <section className="bg-[#0055A4] py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 ring-1 ring-white/25 font-bold text-lg text-white shrink-0">
            AM
          </div>
          <div className="text-center sm:text-left">
            <p className="text-white font-semibold text-sm">
              Ing. Ammar Mahfoud{' '}
              <span role="img" aria-label="Argentine flag">🇦🇷</span>
            </p>
            <p className="text-[#74ACDF] text-xs mt-0.5">
              Ingeniero Civil · Hidrología e Hidráulica · Buenos Aires, Argentina
            </p>
          </div>
          <div className="sm:ml-auto flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#74ACDF] hover:text-white text-xs font-medium transition-colors"
            >
              GitHub
            </a>
            <span className="text-white/20">·</span>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#74ACDF] hover:text-white text-xs font-medium transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-4 pt-4 border-t border-white/10 text-center">
          <p className="text-white/40 text-xs">
            AutoHydro Argentina · Código abierto bajo licencia MIT
          </p>
        </div>
      </section>

    </div>
  );
}
