import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useDarkMode } from '../../hooks/useDarkMode';

const CALC_ITEMS = [
  {
    to: '/calculator',
    label: 'Hidrología',
    desc: 'Caudales de diseño, CN, Tc',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  {
    to: '/calculadora/manning',
    label: 'Hidráulica (Manning)',
    desc: 'Capacidad de canales abiertos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/calculadora/alcantarilla',
    label: 'Alcantarillas',
    desc: 'Dimensionamiento, control entrada/salida',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  {
    to: '/calculadora/hietograma',
    label: 'Hietogramas',
    desc: 'Tormenta de diseño, distribución temporal',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/historial',
    label: 'Historial',
    desc: 'Últimos 10 cálculos guardados localmente',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

export function Header() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const calcRef = useRef<HTMLDivElement>(null);
  const isOnline = useOnlineStatus();

  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleInstall() {
    if (!installPrompt) return;
    (installPrompt as BeforeInstallPromptEvent).prompt();
    setShowInstall(false);
  }

  const { isDark, toggle: toggleDark } = useDarkMode();

  const toggleLang = () =>
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calcRef.current && !calcRef.current.contains(e.target as Node)) {
        setCalcOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isCalcActive =
    pathname.startsWith('/calculator') ||
    pathname.startsWith('/calculadora') ||
    pathname === '/manning' ||
    pathname === '/alcantarilla' ||
    pathname === '/historial';

  const navLinkBase =
    'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 relative group';

  const navLinkClass = (to: string) =>
    `${navLinkBase} ${
      pathname === to
        ? 'bg-white/15 text-white'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#071224] shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
          : 'bg-[#0a1628]'
      }`}
    >
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-1.5 px-4 flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 010-7.07M9.172 9.172a5 5 0 000 7.07m-2.829-2.829A9 9 0 015.636 5.636M3 3l18 18" />
          </svg>
          Sin conexión — Las calculaciones requieren internet
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setMenuOpen(false)}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl ring-1 ring-white/20 font-bold text-base leading-none select-none shadow-lg group-hover:ring-white/40 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)' }}>
            <span className="text-white tracking-tight text-sm">AH</span>
          </div>
          <div>
            <div className="font-bold text-[15px] leading-tight tracking-tight text-white">
              AutoHydro Argentina
            </div>
            <div className="text-[11px] text-blue-300 leading-tight hidden sm:block">
              {t('app.subtitle')}
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link to="/" className={navLinkClass('/')}>
            {t('nav.home')}
            {pathname === '/' && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-400 rounded-full" />
            )}
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-4 h-0.5 bg-blue-400/50 rounded-full transition-all duration-200" />
          </Link>

          {/* Calculadoras dropdown */}
          <div ref={calcRef} className="relative">
            <button
              type="button"
              onClick={() => setCalcOpen((o) => !o)}
              className={`${navLinkBase} flex items-center gap-1 ${
                isCalcActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t('nav.calculators')}
              <motion.span
                animate={{ rotate: calcOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </motion.span>
              {isCalcActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-400 rounded-full" />
              )}
            </button>

            <AnimatePresence>
              {calcOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 py-1.5 z-30 origin-top-right"
                >
                  {CALC_ITEMS.map(({ to, label, desc, icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setCalcOpen(false)}
                      className={`flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors ${
                        pathname === to ? 'bg-blue-50 dark:bg-slate-700' : ''
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${pathname === to ? 'text-blue-600' : 'text-gray-400'}`}>
                        {icon}
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${pathname === to ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                          {label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</div>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/sources" className={navLinkClass('/sources')}>
            {t('nav.sources')}
            {pathname === '/sources' && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-400 rounded-full" />
            )}
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-4 h-0.5 bg-blue-400/50 rounded-full transition-all duration-200" />
          </Link>

          <Link to="/about" className={navLinkClass('/about')}>
            {t('nav.about')}
            {pathname === '/about' && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-400 rounded-full" />
            )}
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-4 h-0.5 bg-blue-400/50 rounded-full transition-all duration-200" />
          </Link>

          <div className="w-px h-5 bg-white/20 mx-2" />

          {showInstall && (
            <button
              onClick={handleInstall}
              className="px-3 py-1 rounded-md border border-blue-400/50 text-xs font-semibold text-blue-300 hover:bg-white/10 transition-colors flex items-center gap-1.5"
              title="Instalar como aplicación"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Instalar App
            </button>
          )}

          <button
            onClick={toggleLang}
            className="px-2.5 py-1 rounded-md border border-white/20 text-xs font-semibold text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
            title="Toggle language / Cambiar idioma"
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>

          <button
            onClick={toggleDark}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-blue-200 hover:text-white"
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile: lang + dark + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 rounded-md border border-white/20 text-xs font-semibold text-blue-200 hover:bg-white/10 transition-colors"
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={toggleDark}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-blue-200"
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-md hover:bg-white/10 transition-colors text-white"
            aria-label="Toggle navigation menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              {menuOpen ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="sm:hidden overflow-hidden border-t border-white/10"
            style={{ background: 'rgba(7, 18, 36, 0.98)' }}
          >
            <div className="px-4 py-3 space-y-1">
              <Link to="/" onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/' ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
                {t('nav.home')}
              </Link>
              <div className="pt-1 pb-0.5 px-1 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                {t('nav.calculators')}
              </div>
              {CALC_ITEMS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`block pl-5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === to ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}
                >
                  {label}
                </Link>
              ))}
              <Link to="/sources" onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/sources' ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
                {t('nav.sources')}
              </Link>
              <Link to="/about" onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/about' ? 'bg-white/15 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
                {t('nav.about')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
