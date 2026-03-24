import { Link } from 'react-router-dom';
import { IDF_ARGENTINA } from '../constants/idf-data';
import { ArgentinaMap } from '../components/ArgentinaMap';

// ── Feature card ───────────────────────────────────────────────────────────

interface FeatureCardProps {
  emoji: string;
  title: string;
  desc: string;
}

function FeatureCard({ emoji, title, desc }: FeatureCardProps) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="text-2xl mb-3">{emoji}</div>
      <h3 className="font-bold text-gray-800 mb-1.5 text-sm leading-snug">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Stat item ──────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-2">
      <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none">{value}</p>
      <p className="text-xs text-[#74ACDF] mt-1 leading-tight">{label}</p>
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────

const FEATURES: FeatureCardProps[] = [
  {
    emoji: '🗺️',
    title: `${IDF_ARGENTINA.length} ciudades con datos IDF`,
    desc: 'Coeficientes IDF regionalizados según Caamaño Nelli et al. e información del INA/SMN.',
  },
  {
    emoji: '📊',
    title: '3 métodos hidrológicos',
    desc: 'Racional, Racional Modificado y SCS-CN con comparación automática de resultados.',
  },
  {
    emoji: '📈',
    title: 'Análisis de sensibilidad CN',
    desc: 'Evaluá el impacto de ±5 unidades en el Número de Curva sobre el caudal pico de diseño.',
  },
  {
    emoji: '🖍️',
    title: 'Mapa interactivo para dibujar cuencas',
    desc: 'Delimitá tu cuenca dibujando un polígono sobre el mapa con cálculo de área geodésico.',
  },
  {
    emoji: '📄',
    title: 'Reportes PDF y Word profesionales',
    desc: 'Generá memorias de cálculo listas para entregar en formato técnico argentino.',
  },
  {
    emoji: '🤖',
    title: 'Interpretación con IA',
    desc: 'Claude AI analiza tus resultados y genera explicaciones técnicas en español rioplatense.',
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#0055A4] text-white overflow-hidden">

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Argentina map watermark */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none select-none">
          <ArgentinaMap
            fill="white"
            className="h-full max-h-[340px] w-auto opacity-[0.07] translate-x-8"
          />
        </div>

        {/* Content */}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-22 text-center space-y-6">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[#74ACDF] text-xs font-semibold px-3.5 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#74ACDF] animate-pulse" />
            Ing. Ammar Mahfoud — AutoHydro Argentina v1.0
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            Hidrología Inteligente
            <br />
            <span className="text-[#74ACDF]">para Ingenieros Argentinos</span>
          </h1>

          {/* Subheadline */}
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Calculá caudales de diseño con datos IDF de{' '}
            <span className="text-white font-semibold">{IDF_ARGENTINA.length} ciudades argentinas</span>,
            interpretación por IA y memorias de cálculo listas para entregar.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 bg-[#74ACDF] hover:bg-[#5a98d0] text-[#0055A4] font-extrabold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg hover:shadow-[#74ACDF]/30 hover:-translate-y-0.5"
            >
              Comenzar cálculo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              Conocer más
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-[#004a91]/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-3 divide-x divide-white/10">
            <StatItem value={String(IDF_ARGENTINA.length)} label="Ciudades argentinas" />
            <StatItem value="3" label="Métodos de cálculo" />
            <StatItem value="6" label="Fórmulas de Tc" />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Todo lo que necesitás para tu estudio hidrológico
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Una sola herramienta — metodología rigurosa, resultados exportables.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── Cities ───────────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-200 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-base font-bold text-gray-800 mb-4">
            Ciudades disponibles{' '}
            <span className="text-[#0055A4] font-extrabold">({IDF_ARGENTINA.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {IDF_ARGENTINA.map((c) => (
              <span
                key={c.city}
                className="inline-flex items-center gap-1.5 bg-[#EEF6FB] border border-[#74ACDF]/40 text-[#0055A4] text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {c.city}
                <span className="text-[#74ACDF] text-[10px]">{c.province}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Aviso Importante
          </h3>
          <p className="text-sm text-amber-700 leading-relaxed">
            Esta herramienta genera estimaciones para etapas de anteproyecto. Los coeficientes IDF
            incluidos son de carácter indicativo. Para diseños finales, verificá siempre con los
            estudios hidrológicos locales más recientes.
          </p>
        </div>
      </section>

      {/* ── Developer credit ─────────────────────────────────────────────── */}
      <section className="bg-[#0055A4] py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar */}
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 font-extrabold text-xl text-white shrink-0 shadow-lg">
            AM
          </div>
          <div className="text-center sm:text-left">
            <p className="text-white font-bold">
              Desarrollado por Ing. Ammar Mahfoud{' '}
              <span role="img" aria-label="Argentine flag">🇦🇷</span>
            </p>
            <p className="text-[#74ACDF] text-sm mt-0.5">
              Ingeniero Civil · Hidrología e Hidráulica · Buenos Aires, Argentina
            </p>
          </div>
          <div className="sm:ml-auto">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-sm text-[#74ACDF] hover:text-white border border-[#74ACDF]/40 hover:border-white/40 px-4 py-2 rounded-lg transition-colors"
            >
              Ver perfil completo
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
