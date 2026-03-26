import { Link } from 'react-router-dom';
import { IDF_ARGENTINA } from '../constants/idf-data';
import { ArgentinaMap } from '../components/ArgentinaMap';
import { ChangelogTimeline } from '../components/ChangelogTimeline';

const CASE_PREVIEWS = [
  { region: 'AMBA', regionColor: 'bg-blue-100 text-blue-700', title: 'Drenaje Pluvial — La Matanza', city: 'Buenos Aires (Ezeiza)', q: '28.5 m³/s', t: 'T=10 años, A=2.8 km²' },
  { region: 'NEA', regionColor: 'bg-emerald-100 text-emerald-700', title: 'Alcantarilla Vial — Chaco', city: 'Resistencia', q: '45.2 m³/s', t: 'T=25 años, A=12.5 km²' },
  { region: 'Cuyo', regionColor: 'bg-violet-100 text-violet-700', title: 'Canal de Riego — Valle de Uco', city: 'Mendoza (Aeropuerto)', q: '52.8 m³/s', t: 'T=50 años, A=8.3 km²' },
];


const IconHieto = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconClimate = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// ── Feature card ────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  highlights: string[];
  iconBg: string;
  iconColor: string;
  tagBg: string;
  tagText: string;
}

function FeatureCard({ icon, title, highlights, iconBg, iconColor, tagBg, tagText }: FeatureCardProps) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-5 hover:shadow-md hover:border-slate-300 transition-all">
      <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-800 mb-2.5 text-sm leading-snug">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {highlights.map((h) => (
          <span key={h} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tagBg} ${tagText}`}>
            {h}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Stat item ────────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-2">
      <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none">{value}</p>
      <p className="text-xs text-[#74ACDF] mt-1 leading-tight">{label}</p>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────

const IconCalc = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const IconGIS = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const IconHydro = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const IconAI = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const IconReport = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ── Home ────────────────────────────────────────────────────────────────────

const IconOffline = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 18h.01M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
  </svg>
);

const FEATURES: FeatureCardProps[] = [
  {
    icon: <IconCalc />,
    title: 'Cálculo Hidrológico',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-700',
    tagBg: 'bg-blue-50',
    tagText: 'text-blue-800',
    highlights: ['Racional', 'SCS-CN', 'HU SCS', 'Sensibilidad CN', 'Comparación escenarios', 'Ajuste climático RCP'],
  },
  {
    icon: <IconHieto />,
    title: 'Hietogramas de Diseño',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-700',
    tagBg: 'bg-purple-50',
    tagText: 'text-purple-800',
    highlights: ['Bloques alternos', 'SCS Tipo II', 'Chicago', 'Distribución uniforme', 'Exportar CSV'],
  },
  {
    icon: <IconClimate />,
    title: 'Cambio Climático',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-700',
    tagBg: 'bg-orange-50',
    tagText: 'text-orange-800',
    highlights: ['IPCC AR6', 'RCP 4.5/8.5', 'Horizontes 2030–2100', 'Corrección regional', 'Factor visible en reportes'],
  },
  {
    icon: <IconGIS />,
    title: 'Herramientas GIS',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    tagBg: 'bg-emerald-50',
    tagText: 'text-emerald-800',
    highlights: ['Mapa Leaflet', 'Dibujar cuenca', 'Importar Shapefile', 'Exportar Shapefile'],
  },
  {
    icon: <IconHydro />,
    title: 'Cálculo Hidráulico',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-700',
    tagBg: 'bg-amber-50',
    tagText: 'text-amber-800',
    highlights: ['Manning (4 secciones)', 'Alcantarillas FHWA HDS-5', 'Verificación régimen', 'Memoria PDF'],
  },
  {
    icon: <IconAI />,
    title: 'Inteligencia Artificial',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-700',
    tagBg: 'bg-pink-50',
    tagText: 'text-pink-800',
    highlights: ['Claude Haiku', 'Clasificar uso de suelo', 'CN automático', 'Interpretación técnica'],
  },
  {
    icon: <IconReport />,
    title: 'Reportes Profesionales',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    tagBg: 'bg-slate-100',
    tagText: 'text-slate-700',
    highlights: ['Memoria PDF/Word/Excel', 'Memoria hidráulica', 'Mapas e hidrogramas', 'Normas argentinas'],
  },
  {
    icon: <IconOffline />,
    title: 'App Instalable (PWA)',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-700',
    tagBg: 'bg-cyan-50',
    tagText: 'text-cyan-800',
    highlights: ['Móvil y escritorio', 'Assets cacheados', 'Carga offline', 'Banner de conexión'],
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
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
            Ing. Ammar Mahfoud — AutoHydro Argentina v1.6.1
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            AutoHydro Argentina
            <br />
            <span className="text-[#74ACDF]">Plataforma Integral de Hidrología e Hidráulica</span>
          </h1>

          {/* Subheadline */}
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Calculá caudales de diseño con datos IDF de{' '}
            <span className="text-white font-semibold">{IDF_ARGENTINA.length} ciudades argentinas</span>,
            exportá reportes profesionales y dimensioná estructuras hidráulicas.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 bg-[#74ACDF] hover:bg-[#5a98d0] text-[#0055A4] font-extrabold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg hover:shadow-[#74ACDF]/30 hover:-translate-y-0.5"
            >
              Iniciar Cálculo Hidrológico
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/manning"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
            >
              Cálculo Hidráulico
            </Link>
            <Link
              to="/calculadora/alcantarilla"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
            >
              Dimensionar Alcantarilla
            </Link>
          </div>
        </div>

        {/* HEC-HMS credibility badge */}
        <div className="relative border-t border-white/10 bg-green-900/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-green-300 text-xs font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Validado contra HEC-HMS (USACE) — Diferencias &lt; 5% en todos los casos
            </div>
            <Link to="/validacion" className="text-xs text-green-200 underline underline-offset-2 hover:text-white transition-colors">
              Ver validación completa
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-[#004a91]/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-4 divide-x divide-white/10">
            <StatItem value={String(IDF_ARGENTINA.length)} label="Ciudades argentinas" />
            <StatItem value="6" label="Fórmulas de Tc" />
            <StatItem value="4" label="Formatos de exportación" />
            <StatItem value="100%" label="Gratuito y open source" />
          </div>
        </div>
      </section>

      {/* ── Changelog ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-violet-50 to-blue-50 border-y border-violet-100">
        <ChangelogTimeline />
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Todo lo que necesitás para tu estudio hidrológico e hidráulico
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Una sola herramienta — metodología rigurosa, resultados exportables, normas argentinas.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── Case Studies Preview ────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-[#0055A4]/5 to-blue-50 border-y border-blue-100 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Casos de Estudio Reales</h2>
              <p className="text-gray-500 text-sm mt-0.5">AutoHydro en acción — ejemplos documentados con datos IDF verificados</p>
            </div>
            <Link
              to="/casos-de-estudio"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0055A4] hover:text-[#004a91] transition-colors"
            >
              Ver todos los casos
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {CASE_PREVIEWS.map((c) => (
              <Link
                key={c.title}
                to="/casos-de-estudio"
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all block"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.regionColor}`}>{c.region}</span>
                  <span className="text-xs text-gray-400">✅ IDF verificado</span>
                </div>
                <h3 className="text-sm font-bold text-gray-800 leading-snug mb-1">{c.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{c.city} · {c.t}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Caudal pico</span>
                  <span className="font-extrabold text-[#0055A4] text-base">{c.q}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cities ────────────────────────────────────────────────────────── */}
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

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
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

      {/* ── Developer credit ──────────────────────────────────────────────── */}
      <section className="bg-[#0055A4] py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-5">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 font-extrabold text-xl text-white shrink-0 shadow-lg">
            AM
          </div>
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              <p className="text-white font-bold">
                Desarrollado por Ing. Ammar Mahfoud{' '}
                <span role="img" aria-label="Argentine flag">🇦🇷</span>
              </p>
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/ammar-mahfoud-499212118"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#74ACDF] hover:text-white transition-colors"
                title="LinkedIn"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              {/* GitHub */}
              <a
                href="https://github.com/ammarmahfoud90/autohydro-argentina"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#74ACDF] hover:text-white transition-colors"
                title="GitHub"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
            <p className="text-[#74ACDF] text-sm mt-0.5">
              Ingeniero Civil · Hidrología e Hidráulica · Buenos Aires, Argentina
            </p>
            <p className="text-white/40 text-xs mt-1">
              AutoHydro Argentina v1.6.1 · © 2026 | Código abierto bajo licencia MIT
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
