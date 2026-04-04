import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LOCALITIES_SUMMARY } from '../constants/localities-summary';
import type { LocalitySummary } from '../constants/localities-summary';
import { MalvinasSection } from '../components/MalvinasSection';

const GITHUB_URL = 'https://github.com/ammarmahfoud90/autohydro-argentina';
const LINKEDIN_URL = 'https://www.linkedin.com/in/ammar-mahfoud-499212118';

const TOOLS = [
  {
    labelKey: 'home.toolHydrologyLabel',
    descKey: 'home.toolHydrologyDesc',
    href: '/calculator',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    color: 'from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10',
    iconBg: 'bg-blue-500/10 text-blue-600',
  },
  {
    labelKey: 'home.toolManningLabel',
    descKey: 'home.toolManningDesc',
    href: '/calculadora/manning',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'from-cyan-500/10 to-cyan-600/5 hover:from-cyan-500/20 hover:to-cyan-600/10',
    iconBg: 'bg-cyan-500/10 text-cyan-600',
  },
  {
    labelKey: 'home.toolCulvertsLabel',
    descKey: 'home.toolCulvertsDesc',
    href: '/calculadora/alcantarilla',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    color: 'from-indigo-500/10 to-indigo-600/5 hover:from-indigo-500/20 hover:to-indigo-600/10',
    iconBg: 'bg-indigo-500/10 text-indigo-600',
  },
  {
    labelKey: 'home.toolHyetogramLabel',
    descKey: 'home.toolHyetogramDesc',
    href: '/calculadora/hietograma',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'from-violet-500/10 to-violet-600/5 hover:from-violet-500/20 hover:to-violet-600/10',
    iconBg: 'bg-violet-500/10 text-violet-600',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

function LocalityCard({ loc, index }: { loc: LocalitySummary; index: number }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`bg-white rounded-2xl border p-5 cursor-default ${
        loc.warning_badge
          ? 'border-amber-200 hover:border-amber-300 hover:shadow-[0_8px_30px_rgba(251,191,36,0.15)]'
          : 'border-gray-200 hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)]'
      } shadow-sm transition-all duration-300`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-medium text-gray-400">{String(index + 1).padStart(2, '0')}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{loc.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">{loc.province}</p>
        </div>
        {loc.warning_badge && (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
            {loc.warning_badge}
          </span>
        )}
      </div>
      <dl className="space-y-1.5 text-xs text-gray-600">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-400 shrink-0">Fuente</dt>
          <dd className="text-right max-w-[62%] leading-tight text-gray-600">{loc.source_document}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-400 shrink-0">Período</dt>
          <dd className="text-right text-gray-600">{loc.series_period}</dd>
        </div>
        {loc.max_reliable_return_period != null && (
          <div className="flex justify-between gap-2 pt-1.5 border-t border-gray-100">
            <dt className="text-gray-400 shrink-0">TR máximo confiable</dt>
            <dd className="font-semibold text-gray-800">{loc.max_reliable_return_period} años</dd>
          </div>
        )}
      </dl>
    </motion.div>
  );
}

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2a5e 45%, #1a1260 100%)' }}
      >
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 50%)',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-blue-300 text-xs font-medium px-3.5 py-1.5 rounded-full mb-7"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
            </span>
            {t('home.verifiedBadge')}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl sm:text-5xl font-bold leading-tight text-white mb-4"
          >
            AutoHydro Argentina
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-blue-300 text-lg sm:text-xl font-medium mb-3"
          >
            {t('home.heroTitle')}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-white/60 text-base max-w-2xl leading-relaxed mb-9"
          >
            {t('home.heroDescription')}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-3"
          >
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', color: 'white', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}
            >
              {t('home.cta')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/sources"
              className="inline-flex items-center gap-2 text-white/75 hover:text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            >
              {t('home.ctaSources')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Localities ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('home.localitiesTitle')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('home.localitiesSubtitle')}
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {LOCALITIES_SUMMARY.map((loc, i) => (
            <LocalityCard key={loc.id} loc={loc} index={i} />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xs text-gray-400 mt-5"
        >
          {t('home.moreLocalities')}{' '}
          <Link to="/sources" className="text-blue-600 hover:underline">
            {t('home.viewFullDetails')}
          </Link>
        </motion.p>
      </section>

      {/* ── Tools ─────────────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('home.calculatorsTitle')}</h2>
            <p className="text-sm text-gray-500">
              {t('home.calculatorsSubtitle')}
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid sm:grid-cols-2 gap-4"
          >
            {TOOLS.map((tool) => (
              <motion.div key={tool.href} variants={fadeUp}>
                <Link
                  to={tool.href}
                  className={`group flex items-start gap-4 bg-gradient-to-br ${tool.color} border border-gray-200 hover:border-gray-300 rounded-2xl p-5 transition-all duration-300 hover:shadow-md`}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl ${tool.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                        {t(tool.labelKey)}
                      </h3>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0 transition-all duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t(tool.descKey)}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Methodology note ──────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-blue-50 border border-blue-200 p-6"
        >
          <h2 className="text-sm font-semibold text-blue-900 mb-2">{t('home.methodologyTitle')}</h2>
          <p className="text-sm text-blue-800 leading-relaxed">
            {t('home.methodologyText')}
          </p>
        </motion.div>
      </section>

      {/* ── Disclaimer ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-amber-50 border border-amber-200 p-5"
        >
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{t('home.disclaimerTitle')}:</span>{' '}
            {t('home.disclaimerFull')}
          </p>
        </motion.div>
      </section>

      {/* ── Malvinas ──────────────────────────────────────────────────────── */}
      <MalvinasSection />

      {/* ── Developer credit ──────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="py-10 px-4 sm:px-6"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2a5e 100%)' }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl ring-1 ring-white/20 font-bold text-lg text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)' }}
          >
            AM
          </div>
          <div className="text-center sm:text-left">
            <p className="text-white font-semibold text-sm">
              Ing. Ammar Mahfoud{' '}
              <span role="img" aria-label="Argentine flag">🇦🇷</span>
            </p>
            <p className="text-blue-300 text-xs mt-0.5">
              Ingeniero Civil · Hidrología e Hidráulica · Buenos Aires, Argentina
            </p>
          </div>
          <div className="sm:ml-auto flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-white text-xs font-medium transition-colors"
            >
              GitHub
            </a>
            <span className="text-white/20">·</span>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-white text-xs font-medium transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-5 pt-4 border-t border-white/10 text-center">
          <p className="text-white/30 text-xs">
            AutoHydro Argentina · {t('home.openSource')}
          </p>
        </div>
      </motion.section>

    </div>
  );
}
