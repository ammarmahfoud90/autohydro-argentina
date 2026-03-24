import { Link } from 'react-router-dom';

const GITHUB_URL = 'https://github.com/ammarmahfoud90/autohydro-argentina';
// Update LINKEDIN_URL to your actual LinkedIn profile
const LINKEDIN_URL = 'https://www.linkedin.com/in/ammarmahfoud';

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const TECH_STACK = [
  { label: 'React 18 + TypeScript', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Tailwind CSS v4', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { label: 'FastAPI (Python)', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Anthropic Claude API', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { label: 'ReportLab PDF', color: 'bg-red-50 text-red-700 border-red-200' },
  { label: 'python-docx Word', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Recharts', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Leaflet Maps', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Vite', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
];

const REFERENCES = [
  'Caamaño Nelli, G. M. et al. (1999). Fórmulas para curvas IDF. Ingeniería del Agua.',
  'INA — Instituto Nacional del Agua. Publicaciones técnicas regionales.',
  'USDA-SCS (1972). National Engineering Handbook, Section 4: Hydrology.',
  'Témez, J.R. (1978). Cálculo hidrometeorológico de caudales máximos.',
];

export function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Developer card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header band */}
          <div className="h-20 bg-gradient-to-r from-[#1a365d] to-[#2a5298]" />
          <div className="px-7 pb-7">
            {/* Avatar */}
            <div className="-mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg ring-4 ring-white">
                AM
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ing. Ammar Mahfoud</h1>
                <p className="text-sm text-gray-500 mt-0.5">Ingeniero Civil · Hidrología e Hidráulica · Argentina</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  <LinkedInIcon />
                  LinkedIn
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <GitHubIcon />
                  GitHub
                </a>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mt-4">
              Ingeniero civil con especialización en hidrología e hidráulica. AutoHydro Argentina fue desarrollado
              para optimizar los flujos de trabajo de los ingenieros civiles argentinos en estudios hidrológicos,
              combinando metodología técnica rigurosa con inteligencia artificial generativa para producir
              resultados interpretables y memorias de cálculo listas para entregar.
            </p>
          </div>
        </div>

        {/* About the app */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
          <h2 className="text-base font-bold text-gray-900 mb-3">Acerca de AutoHydro Argentina</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            AutoHydro Argentina es una herramienta web de cálculo hidrológico orientada a la práctica profesional
            en Argentina. Implementa los métodos Racional, Racional Modificado y SCS-CN con datos IDF
            regionalizados para 15 ciudades según la metodología de Caamaño Nelli et al. (1999) e información
            del INA. Los resultados incluyen comparación multi-método, análisis de sensibilidad del Número de
            Curva, y generación automática de memorias de cálculo en PDF y Word.
          </p>
          <div className="mt-4 flex">
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 bg-[#1a365d] hover:bg-[#22406f] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Ir a la calculadora
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
          <h2 className="text-base font-bold text-gray-900 mb-3">Metodología y Referencias</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Las curvas IDF están basadas en la regionalización de Caamaño Nelli et al. (1999) y publicaciones
            del INA. Los métodos de cálculo siguen la práctica establecida en Argentina.
          </p>
          <ul className="space-y-2">
            {REFERENCES.map((ref) => (
              <li key={ref} className="flex gap-2 text-sm text-gray-600">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {ref}
              </li>
            ))}
          </ul>
        </div>

        {/* Tech stack */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
          <h2 className="text-base font-bold text-gray-900 mb-3">Stack Tecnológico</h2>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map(({ label, color }) => (
              <span
                key={label}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${color}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Contact / Feedback */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
          <h2 className="text-base font-bold text-gray-900 mb-2">Contacto y Feedback</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            ¿Encontraste un error, tenés una sugerencia o querés colaborar? Podés abrir un issue en el
            repositorio de GitHub o contactarme directamente por LinkedIn.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
            >
              <GitHubIcon />
              Abrir issue en GitHub
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077b5] text-white text-xs font-semibold hover:bg-[#006399] transition-colors"
            >
              <LinkedInIcon />
              Contactar por LinkedIn
            </a>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-gray-400 pb-2">
          AutoHydro Argentina v1.0.0 — MVP · © 2026 Ing. Ammar Mahfoud
        </p>
      </div>
    </div>
  );
}
