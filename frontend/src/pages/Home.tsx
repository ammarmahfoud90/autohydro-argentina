import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { IDF_ARGENTINA } from '../constants/idf-data';

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-[#1a365d] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-block bg-blue-700 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-2">
            Ing. Ammar Mahfoud — AutoHydro Argentina v1.0
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            {t('home.heroTitle')}
          </h1>
          <p className="text-blue-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('home.heroSubtitle')}
          </p>
          <Link
            to="/calculator"
            className="inline-block bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-3 rounded-lg text-base transition-colors shadow-lg"
          >
            {t('home.cta')} →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard icon="🗺️" title={t('home.feature1Title')} desc={t('home.feature1Desc')} />
          <FeatureCard icon="📐" title={t('home.feature2Title')} desc={t('home.feature2Desc')} />
          <FeatureCard icon="🤖" title={t('home.feature3Title')} desc={t('home.feature3Desc')} />
          <FeatureCard icon="📄" title={t('home.feature4Title')} desc={t('home.feature4Desc')} />
        </div>
      </section>

      {/* Cities */}
      <section className="bg-white border-y border-gray-200 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{t('home.citiesTitle')}</h2>
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
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ {t('home.disclaimerTitle')}</h3>
          <p className="text-sm text-yellow-700 leading-relaxed">{t('home.disclaimerText')}</p>
        </div>
      </section>
    </div>
  );
}
