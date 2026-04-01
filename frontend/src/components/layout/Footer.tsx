import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

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

export function Footer() {
  return (
    <motion.footer
      className="text-white mt-auto"
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #071224 100%)' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid sm:grid-cols-3 gap-8">

          {/* Column 1: Identity */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)' }}
              >
                AH
              </div>
              <p className="font-semibold text-sm text-white">AutoHydro Argentina</p>
            </div>
            <p className="text-blue-300/80 text-xs leading-relaxed mb-4">
              Herramienta de cálculo hidrológico con datos IDF verificados.
              Open source, libre uso profesional.
            </p>
            <p className="text-white/30 text-xs">
              © 2025 Ing. Ammar Mahfoud · MIT License
            </p>
          </div>

          {/* Column 2: Links */}
          <div>
            <p className="text-xs font-semibold text-blue-400/70 uppercase tracking-wider mb-3">
              Herramientas
            </p>
            <div className="space-y-2">
              {[
                { to: '/calculator', label: 'Calculadora hidrológica' },
                { to: '/calculadora/manning', label: 'Cálculo Manning' },
                { to: '/calculadora/alcantarilla', label: 'Dimensionar alcantarilla' },
                { to: '/calculadora/hietograma', label: 'Hietogramas' },
                { to: '/sources', label: 'Fuentes y Metodología' },
                { to: '/about', label: 'Acerca de' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="block text-xs text-white/50 hover:text-blue-300 transition-colors duration-200"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3: Contact */}
          <div>
            <p className="text-xs font-semibold text-blue-400/70 uppercase tracking-wider mb-3">
              Contacto
            </p>
            <p className="text-xs text-white/50 mb-4 leading-relaxed">
              Ing. Ammar Mahfoud — Ingeniero Civil, Hidrología e Hidráulica.
              Errores y sugerencias a través de GitHub o LinkedIn.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors duration-200"
              >
                <GitHubIcon />
                GitHub
              </a>
              <span className="text-white/15">|</span>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors duration-200"
              >
                <LinkedInIcon />
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
    </motion.footer>
  );
}
