import { Link } from 'react-router-dom';
import { IDF_ARGENTINA } from '../constants/idf-data';

// ── Feature icons ──────────────────────────────────────────────────────────

function IconMap() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
    </svg>
  );
}

function IconCalculator() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="4" y="2" width="16" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h8M8 10h2m4 0h2M8 14h2m4 0h2M8 18h8" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20V10m5 10V4m5 16v-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18" />
    </svg>
  );
}

function IconSensitivity() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4 4 2 4-6 4-2" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPolygon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <polygon points="12,3 20,9 17,19 7,19 4,9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="3" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="9" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="7" cy="19" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="9" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

// ── Feature card ───────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}

function FeatureCard({ icon, title, desc, accent }: FeatureCardProps) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 ${accent}`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-800 mb-1.5 text-sm">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
      <p className="text-xs text-blue-300 mt-1">{label}</p>
    </div>
  );
}

// ── Home page ──────────────────────────────────────────────────────────────

export function Home() {
  const features: FeatureCardProps[] = [
    {
      icon: <IconMap />,
      title: 'Datos IDF Regionalizados',
      desc: 'Coeficientes IDF para 15 ciudades argentinas según Caamaño Nelli y fuentes INA/SMN.',
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      icon: <IconCalculator />,
      title: 'Múltiples Métodos',
      desc: 'Racional, Racional Modificado y SCS-CN con comparación automática de resultados.',
      accent: 'bg-indigo-50 text-indigo-600',
    },
    {
      icon: <IconChart />,
      title: 'Interpretación IA',
      desc: 'Claude API analiza tus resultados y genera explicaciones técnicas en español rioplatense.',
      accent: 'bg-violet-50 text-violet-600',
    },
    {
      icon: <IconSensitivity />,
      title: 'Análisis de Sensibilidad',
      desc: 'Evaluación automática del impacto de ±5 unidades en el Número de Curva sobre el caudal pico.',
      accent: 'bg-cyan-50 text-cyan-600',
    },
    {
      icon: <IconPolygon />,
      title: 'Dibujo de Cuenca en Mapa',
      desc: 'Delimitá tu cuenca dibujando un polígono directamente sobre el mapa con cálculo de área geodésico.',
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: <IconDocument />,
      title: 'Reportes PDF y Word',
      desc: 'Genera automáticamente memorias de cálculo en formato técnico argentino listas para entregar.',
      accent: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative bg-[#1a365d] text-white overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-800/60 border border-blue-600/50 text-blue-200 text-xs font-semibold px-3.5 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Ing. Ammar Mahfoud — AutoHydro Argentina v1.0
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            Hidrología profesional
            <br />
            <span className="text-blue-300">para Argentina</span>
          </h1>

          <p className="text-blue-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Calculá caudales de diseño con metodología argentina actualizada, interpretación por IA
            y generación automática de memorias de cálculo en PDF y Word.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-3 rounded-xl text-base transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
            >
              Comenzar cálculo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-blue-300 hover:text-white text-sm font-medium transition-colors"
            >
              Conocer más
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-blue-800/60 bg-blue-900/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-3 gap-4 sm:grid-cols-3 divide-x divide-blue-800/60">
            <StatItem value="15" label="Ciudades argentinas" />
            <StatItem value="3" label="Métodos de cálculo" />
            <StatItem value="6" label="Fórmulas de Tc" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">Todo lo que necesitás para tu estudio hidrológico</h2>
          <p className="text-gray-500 mt-2 text-sm">Una sola herramienta, metodología rigurosa y resultados exportables.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Cities */}
      <section className="bg-white border-y border-gray-200 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-base font-bold text-gray-800 mb-4">Ciudades disponibles</h2>
          <div className="flex flex-wrap gap-2">
            {IDF_ARGENTINA.map((c) => (
              <span
                key={c.city}
                className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {c.city}
                <span className="text-blue-400 text-[10px]">{c.province}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Aviso Importante
          </h3>
          <p className="text-sm text-amber-700 leading-relaxed">
            Esta herramienta genera estimaciones para etapas de anteproyecto. Los coeficientes IDF incluidos son
            de carácter indicativo. Para diseños finales, verificá siempre con los estudios hidrológicos locales
            más recientes.
          </p>
        </div>
      </section>

      {/* Developer credit */}
      <section className="bg-[#1a365d] py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-5">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 font-extrabold text-xl text-white shrink-0 shadow-lg">
            AM
          </div>
          <div className="text-center sm:text-left">
            <p className="text-white font-bold">Desarrollado por Ing. Ammar Mahfoud</p>
            <p className="text-blue-300 text-sm mt-0.5">
              Ingeniero civil especializado en hidrología e hidráulica · Argentina
            </p>
          </div>
          <div className="sm:ml-auto">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-white border border-blue-600 hover:border-blue-400 px-4 py-2 rounded-lg transition-colors"
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
