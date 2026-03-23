import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-[#1a365d] text-blue-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs space-y-1">
        <p className="font-medium text-white">{t('footer.tagline')}</p>
        <p>{t('footer.rights')}</p>
      </div>
    </footer>
  );
}
