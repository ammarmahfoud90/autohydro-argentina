import { useState, useRef, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

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
];

export function Header() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const calcRef = useRef<HTMLDivElement>(null);
  const isOnline = useOnlineStatus();

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function handleInstall() {
    if (!installPrompt) return;
    (installPrompt as BeforeInstallPromptEvent).prompt();
    setShowInstall(false);
  }

  const toggleLang = () =>
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calcRef.current && !calcRef.current.contains(e.target as Node)) {
        setCalcOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isCalcActive = pathname.startsWith('/calculator') || pathname.startsWith('/calculadora') || pathname === '/manning' || pathname === '/alcantarilla';

  const linkClass = (to: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
      pathname === to
        ? 'bg-white/15 text-white'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <header className="bg-[#0055A4] text-white shadow-[0_2px_16px_rgba(0,0,0,0.35)] relative z-20">
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
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/25 font-bold text-base leading-none select-none shadow-md group-hover:bg-white/25 transition-all">
            <span className="text-white tracking-tight">AH</span>
            <span className="absolute bottom-1 left-2 right-2 h-[2px] rounded-full bg-[#74ACDF]" />
          </div>
          <div>
            <div className="font-bold text-[15px] leading-tight tracking-tight">
              AutoHydro Argentina
            </div>
            <div className="text-[11px] text-blue-200 leading-tight hidden sm:block">
              {t('app.subtitle')}
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link to="/" className={linkClass('/')}>
            {t('nav.home')}
            {pathname === '/' && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#74ACDF] rounded-full" />
            )}
          </Link>

          {/* Calculadoras dropdown */}
          <div ref={calcRef} className="relative">
            <button
              type="button"
              onClick={() => setCalcOpen((o) => !o)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 relative ${
                isCalcActive
                  ? 'bg-white/15 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              Calculadoras
              <svg className={`w-3.5 h-3.5 transition-transform ${calcOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {isCalcActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#74ACDF] rounded-full" />
              )}
            </button>

            {calcOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-30">
                {CALC_ITEMS.map(({ to, label, desc, icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setCalcOpen(false)}
                    className={`flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors ${
                      pathname === to ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${pathname === to ? 'text-blue-600' : 'text-gray-400'}`}>
                      {icon}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${pathname === to ? 'text-blue-700' : 'text-gray-700'}`}>
                        {label}
                      </div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/sources" className={linkClass('/sources')}>
            {t('nav.sources')}
            {pathname === '/sources' && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#74ACDF] rounded-full" />
            )}
          </Link>

          <Link to="/about" className={linkClass('/about')}>
            {t('nav.about')}
            {pathname === '/about' && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#74ACDF] rounded-full" />
            )}
          </Link>

          <div className="w-px h-5 bg-white/20 mx-2" />
          {showInstall && (
            <button
              onClick={handleInstall}
              className="px-3 py-1 rounded-md border border-[#74ACDF]/60 text-xs font-semibold text-[#74ACDF] hover:bg-white/10 transition-colors flex items-center gap-1.5"
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
            className="px-2.5 py-1 rounded-md border border-white/25 text-xs font-semibold text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            title="Toggle language / Cambiar idioma"
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
        </nav>

        {/* Mobile: lang + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 rounded-md border border-white/25 text-xs font-semibold text-blue-100 hover:bg-white/10 transition-colors"
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden bg-[#004a91] border-t border-white/10 px-4 py-3 space-y-1">
          <Link to="/" onClick={() => setMenuOpen(false)} className={`block ${linkClass('/')}`}>
            {t('nav.home')}
          </Link>
          <div className="pt-1 pb-0.5 px-1 text-[10px] font-semibold text-blue-300 uppercase tracking-wider">
            Calculadoras
          </div>
          {CALC_ITEMS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`block ${linkClass(to)} pl-4`}
            >
              {label}
            </Link>
          ))}
          <Link to="/sources" onClick={() => setMenuOpen(false)} className={`block ${linkClass('/sources')}`}>
            {t('nav.sources')}
          </Link>
          <Link to="/about" onClick={() => setMenuOpen(false)} className={`block ${linkClass('/about')}`}>
            {t('nav.about')}
          </Link>
        </div>
      )}
    </header>
  );
}
