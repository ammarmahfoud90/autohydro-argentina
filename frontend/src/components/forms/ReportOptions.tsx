import { useTranslation } from 'react-i18next';
import type { HydrologyInput } from '../../types';

interface Props {
  formData: HydrologyInput;
  onChange: (updates: Partial<HydrologyInput>) => void;
}

export function ReportOptions({ formData, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-700">Opciones del Informe PDF</h3>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('calculator.projectName')}
        </label>
        <input
          type="text"
          value={formData.project_name}
          placeholder={t('calculator.projectNamePlaceholder')}
          onChange={(e) => onChange({ project_name: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('calculator.clientName')}
        </label>
        <input
          type="text"
          value={formData.client_name}
          placeholder={t('calculator.clientNamePlaceholder')}
          onChange={(e) => onChange({ client_name: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('calculator.language')}
        </label>
        <select
          value={formData.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>
  );
}
