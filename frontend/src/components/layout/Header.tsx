import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLang = () =>
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/calculator', label: t('nav.calculator') },
    { to: '/about', label: t('nav.about') },
  ];

  const linkClass = (to: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
      pathname === to
        ? 'bg-white/15 text-white'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <header className="bg-[#1a365d] text-white shadow-[0_2px_12px_rgba(0,0,0,0.35)] relative z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setMenuOpen(false)}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 font-extrabold text-base leading-none select-none shadow-md ring-1 ring-white/20 group-hover:from-blue-300 group-hover:to-blue-500 transition-all">
            AH
          </div>
          <div>
            <div className="font-bold text-[15px] leading-tight tracking-tight">AutoHydro Argentina</div>
            <div className="text-[11px] text-blue-300 leading-tight hidden sm:block">
              {t('app.subtitle')}
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className={linkClass(to)}>
              {label}
              {pathname === to && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-300 rounded-full" />
              )}
            </Link>
          ))}
          <div className="w-px h-5 bg-blue-700 mx-2" />
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 rounded-md border border-blue-500/60 text-xs font-semibold text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
            title="Toggle language / Cambiar idioma"
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
        </nav>

        {/* Mobile: lang + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 rounded-md border border-blue-500/60 text-xs font-semibold text-blue-200 hover:bg-white/10 transition-colors"
            title="Toggle language / Cambiar idioma"
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
        <div className="sm:hidden bg-[#152c4a] border-t border-blue-800/60 px-4 py-3 space-y-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`block ${linkClass(to)}`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
