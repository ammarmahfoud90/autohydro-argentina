import { Link } from 'react-router-dom';
import { IDF_ARGENTINA } from '../constants/idf-data';
import { ArgentinaMap } from '../components/ArgentinaMap';

// ── Feature card ────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
}

function FeatureCard({ icon, title, items }: FeatureCardProps) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="w-10 h-10 rounded-lg bg-[#EEF6FB] flex items-center justify-center mb-3 text-[#0055A4]">
        {icon}
      </div>
      <h3 className="font-bold text-gray-800 mb-2 text-sm leading-snug">{title}</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-xs text-gray-500">
            <span className="text-[#74ACDF] mt-0.5 shrink-0">›</span>
            {item}
          </li>
        ))}
      </ul>
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
    items: [
      `${IDF_ARGENTINA.length} ciudades con datos IDF`,
      'Métodos Racional, Racional Modificado, SCS-CN',
      'Análisis de sensibilidad CN (±5)',
      'Hidrograma Unitario SCS',
      'Comparación de escenarios (T o CN)',
    ],
  },
  {
    icon: <IconGIS />,
    title: 'Herramientas GIS',
    items: [
      'Mapa interactivo Leaflet',
      'Dibujar polígono de cuenca',
      'Importar cuenca desde Shapefile (.shp/.zip)',
      'Exportar polígono a Shapefile con atributos',
    ],
  },
  {
    icon: <IconHydro />,
    title: 'Cálculo Hidráulico',
    items: [
      'Ecuación de Manning',
      'Canales rectangulares, trapezoidales, circulares',
      'Dimensionamiento de alcantarillas (FHWA HDS-5)',
      'Verificación de velocidades',
    ],
  },
  {
    icon: <IconAI />,
    title: 'Inteligencia Artificial',
    items: [
      'Asistente IA para clasificar uso de suelo',
      'Cálculo automático de CN desde descripción',
      'Chat con Ingeniero IA (Claude Haiku)',
      'Interpretación técnica profesional',
    ],
  },
  {
    icon: <IconReport />,
    title: 'Reportes Profesionales',
    items: [
      'Memoria de Cálculo PDF (norma argentina)',
      'Exportar a Word (.docx)',
      'Exportar a Excel (.xlsx) — múltiples hojas',
      'Mapas e hidrogramas incluidos',
    ],
  },
  {
    icon: <IconOffline />,
    title: 'App Instalable (PWA)',
    items: [
      'Instalable como app en móvil y escritorio',
      'Assets cacheados para carga rápida',
      'Carga offline de la interfaz',
      'Banner de estado de conexión',
    ],
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
            Ing. Ammar Mahfoud — AutoHydro Argentina v1.3
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

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-[#004a91]/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-4 divide-x divide-white/10">
            <StatItem value={String(IDF_ARGENTINA.length)} label="Ciudades argentinas" />
            <StatItem value="6" label="Fórmulas de Tc" />
            <StatItem value="3" label="Formatos de exportación" />
            <StatItem value="100%" label="Gratuito y open source" />
          </div>
        </div>
      </section>

      {/* ── Changelog ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-violet-50 to-blue-50 border-y border-violet-100 py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {[
            {
              version: 'v1.3',
              label: 'Nuevo',
              color: 'text-violet-700 bg-violet-100',
              items: ['Chat con Ingeniero IA (Haiku)', 'App instalable (PWA)', 'Importar/Exportar Shapefile'],
            },
            {
              version: 'v1.2',
              label: '',
              color: 'text-blue-700 bg-blue-100',
              items: ['Hidrograma Unitario SCS', 'Comparación de escenarios', 'Exportar a Excel (.xlsx)', 'Dimensionamiento de alcantarillas'],
            },
            {
              version: 'v1.1',
              label: '',
              color: 'text-gray-600 bg-gray-100',
              items: ['Cálculo de Manning', 'Mapa de cuenca en reportes'],
            },
            {
              version: 'v1.0',
              label: '',
              color: 'text-gray-500 bg-gray-100',
              items: ['Lanzamiento inicial — Cálculo hidrológico, IDF 33 ciudades'],
            },
          ].map(({ version, label, color, items }) => (
            <div key={version} className="flex flex-wrap items-start gap-x-4 gap-y-1">
              <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${color}`}>
                {version}{label ? ` · ${label}` : ''}
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {items.map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <svg className="w-3 h-3 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
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
            <p className="text-white font-bold">
              Desarrollado por Ing. Ammar Mahfoud{' '}
              <span role="img" aria-label="Argentine flag">🇦🇷</span>
            </p>
            <p className="text-[#74ACDF] text-sm mt-0.5">
              Ingeniero Civil · Hidrología e Hidráulica · Buenos Aires, Argentina
            </p>
            <p className="text-white/40 text-xs mt-0.5">AutoHydro Argentina v1.3</p>
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
