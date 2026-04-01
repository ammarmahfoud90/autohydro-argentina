import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const GITHUB_URL = 'https://github.com/ammarmahfoud90/autohydro-argentina';
const LINKEDIN_URL = 'https://www.linkedin.com/in/ammar-mahfoud-499212118';

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
  { label: 'React 19 + TypeScript', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Tailwind CSS v4', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { label: 'Framer Motion', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Vite', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { label: 'FastAPI (Python)', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'ReportLab PDF', color: 'bg-red-50 text-red-700 border-red-200' },
  { label: 'python-docx', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Recharts', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Leaflet', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const REFERENCES = [
  'Resolución APA 1334/21 — Administración Provincial del Agua, Chaco (2021)',
  'INA-CRA (2008). Relaciones IDF para el pedemonte del Gran Mendoza. Instituto Nacional del Agua — Centro Regional Andino.',
  'Dirección de Hidráulica, Mendoza (2019). Resolución DH 034/2019. Gobierno de Mendoza.',
  'SsRH Neuquén (2018). Instructivo para la Realización de Estudios de Riesgo Hídrico. Subsecretaría de Recursos Hídricos, Provincia del Neuquén.',
  'Fernández, P.C. y Fornero, L.A. (2000). Sistemas Hidrometeorológicos en Tiempo Real. INA-CRA, Mendoza.',
  'USDA-SCS (1972). National Engineering Handbook, Section 4: Hydrology',
  'Témez, J.R. (1978). Cálculo hidrometeorológico de caudales máximos',
  'FHWA (2012). Hydraulic Design of Highway Culverts, HDS-5',
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-blue-400 inline-block shrink-0" />
      {children}
    </h2>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function About() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header with gradient */}
      <section
        className="py-12 px-4 sm:px-6"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2a5e 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">Acerca de</h1>
            <p className="text-blue-300 text-sm">
              AutoHydro Argentina — herramienta open source de cálculo hidrológico.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-5">

        {/* ── Developer card ──────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="px-7 pt-6 pb-7">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="flex items-center justify-center w-14 h-14 rounded-xl text-white font-bold text-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)' }}
                >
                  AM
                </motion.div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Ing. Ammar Mahfoud</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Ingeniero Civil · Hidrología e Hidráulica
                  </p>
                  <p className="text-sm text-blue-600 font-medium mt-1">
                    <span role="img" aria-label="Argentine flag">🇦🇷</span>{' '}
                    Buenos Aires, Argentina
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <motion.a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0077b5] text-white text-xs font-semibold hover:bg-[#006399] transition-colors"
                >
                  <LinkedInIcon />
                  LinkedIn
                </motion.a>
                <motion.a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  <GitHubIcon />
                  GitHub
                </motion.a>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mt-5">
              Ingeniero civil con experiencia en hidrología e hidráulica. Trabajó en la Administración
              Provincial del Agua (APA) del Chaco en estudios hidrológicos y diseño de desagües
              pluviales urbanos.
            </p>
          </div>
        </motion.div>

        {/* ── About the project ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7"
        >
          <SectionTitle>Sobre AutoHydro Argentina</SectionTitle>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            AutoHydro Argentina es un proyecto <strong>open source</strong> de cálculo hidrológico
            para la práctica profesional en Argentina. Los datos IDF incluidos provienen de fuentes
            oficiales verificadas: Resolución APA 1334/21 (Chaco), INA-CRA 2008 (Mendoza) y SsRH Neuquén 2018 (Neuquén).
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            El proyecto se construye de forma incremental: se incorporan nuevas localidades
            únicamente cuando se dispone de datos IDF provenientes de publicaciones técnicas
            verificables (resoluciones oficiales, papers arbitrados, informes técnicos de organismos
            hídricos).
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
            >
              Ir a la calculadora
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <GitHubIcon />
              Ver código fuente
            </a>
          </div>
        </motion.div>

        {/* ── Tech stack ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7"
        >
          <SectionTitle>Stack Tecnológico</SectionTitle>
          <motion.div
            className="flex flex-wrap gap-2"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {TECH_STACK.map(({ label, color }) => (
              <motion.span
                key={label}
                variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1, transition: { duration: 0.3 } } }}
                whileHover={{ scale: 1.06 }}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-default ${color}`}
              >
                {label}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── References ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7"
        >
          <SectionTitle>Referencias</SectionTitle>
          <ul className="space-y-2">
            {REFERENCES.map((ref) => (
              <li key={ref} className="flex gap-2.5 text-sm text-gray-600">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {ref}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* ── Contact ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7"
        >
          <SectionTitle>Contacto y Feedback</SectionTitle>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            ¿Encontraste un error, tenés una sugerencia o querés colaborar?
            Podés abrir un issue en GitHub o contactarme directamente por LinkedIn.
          </p>
          <div className="flex gap-3 flex-wrap">
            <motion.a
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors"
            >
              <GitHubIcon />
              Abrir issue en GitHub
            </motion.a>
            <motion.a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077b5] text-white text-xs font-semibold hover:bg-[#006399] transition-colors"
            >
              <LinkedInIcon />
              Contactar por LinkedIn
            </motion.a>
          </div>
        </motion.div>

        <p className="text-center text-xs text-gray-400 pb-2">
          AutoHydro Argentina · © 2025 Ing. Ammar Mahfoud 🇦🇷 · MIT License
        </p>
      </div>
    </div>
  );
}
