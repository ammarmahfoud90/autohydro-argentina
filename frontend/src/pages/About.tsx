import { useTranslation } from 'react-i18next';

export function About() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-7">
          <h1 className="text-2xl font-bold text-[#1a365d] mb-6">{t('about.title')}</h1>

          {/* Developer */}
          <section className="mb-6">
            <h2 className="text-base font-bold text-gray-700 mb-2">{t('about.developerTitle')}</h2>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1a365d] text-white flex items-center justify-center text-xl font-bold shrink-0">
                AM
              </div>
              <div>
                <p className="font-semibold text-gray-800">{t('about.developerName')}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{t('about.developerBio')}</p>
              </div>
            </div>
          </section>

          {/* Methodology */}
          <section className="mb-6">
            <h2 className="text-base font-bold text-gray-700 mb-2">{t('about.methodologyTitle')}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{t('about.methodologyText')}</p>
          </section>

          {/* References */}
          <section className="mb-6">
            <h2 className="text-base font-bold text-gray-700 mb-2">{t('about.referencesTitle')}</h2>
            <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
              <li>{t('about.ref1')}</li>
              <li>{t('about.ref2')}</li>
              <li>{t('about.ref3')}</li>
              <li>{t('about.ref4')}</li>
            </ul>
          </section>

          {/* Tech stack */}
          <section className="mb-4">
            <h2 className="text-base font-bold text-gray-700 mb-2">{t('about.techTitle')}</h2>
            <div className="flex flex-wrap gap-2">
              {[
                'React 18 + TypeScript',
                'Tailwind CSS v4',
                'FastAPI (Python)',
                'Anthropic Claude API',
                'ReportLab PDF',
                'Recharts',
                'Vite',
              ].map((tech) => (
                <span
                  key={tech}
                  className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>

          <div className="text-xs text-gray-400 pt-4 border-t border-gray-100">
            {t('about.versionTitle')}: {t('about.version')}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          AutoHydro Argentina — Desarrollado por Ing. Ammar Mahfoud
        </p>
      </div>
    </div>
  );
}
