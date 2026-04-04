import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-8xl font-extrabold text-blue-200 select-none mb-2">404</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        {isEs ? 'Página no encontrada' : 'Page not found'}
      </h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        {isEs
          ? 'La dirección que ingresaste no existe o fue movida.'
          : 'The URL you entered does not exist or has been moved.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          {isEs ? 'Ir al inicio' : 'Go home'}
        </Link>
        <Link
          to="/calculator"
          className="px-5 py-2.5 rounded-lg border border-blue-300 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors"
        >
          {isEs ? 'Abrir calculadora' : 'Open calculator'}
        </Link>
      </div>
    </div>
  );
}
