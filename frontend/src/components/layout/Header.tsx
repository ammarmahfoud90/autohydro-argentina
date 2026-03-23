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
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      pathname === to
        ? 'bg-blue-700 text-white'
        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
    }`;

  return (
    <header className="bg-[#1a365d] text-white shadow-lg relative z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 font-bold text-lg leading-none select-none">
            AH
          </div>
          <div>
            <div className="font-bold text-base leading-tight">AutoHydro Argentina</div>
            <div className="text-xs text-blue-300 leading-tight hidden sm:block">
              {t('app.subtitle')}
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className={linkClass(to)}>
              {label}
            </Link>
          ))}
          <button
            onClick={toggleLang}
            className="ml-2 px-2.5 py-1 rounded border border-blue-400 text-xs font-semibold text-blue-200 hover:bg-blue-700 transition-colors"
            title="Toggle language / Cambiar idioma"
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
        </nav>

        {/* Mobile: lang + hamburger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 rounded border border-blue-400 text-xs font-semibold text-blue-200 hover:bg-blue-700 transition-colors"
            title="Toggle language / Cambiar idioma"
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-md hover:bg-blue-700 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden bg-[#162d52] border-t border-blue-800 px-4 py-3 space-y-1">
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
