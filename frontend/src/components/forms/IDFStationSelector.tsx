import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getLocality } from '../../services/api';

import { needsIDFStation } from '../../utils/idfStations';

export function IDFStationSelector({ localityId, stationId, stationName, onChange }: {
  localityId: string;
  stationId?: string | null;
  stationName?: string | null;
  onChange: (selection: { station_id: string | null; station_name: string | null }) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['locality', localityId],
    queryFn: () => getLocality(localityId),
    enabled: needsIDFStation(localityId),
    staleTime: Infinity,
  });
  if (!needsIDFStation(localityId)) return null;
  const byName = localityId === 'neuquen_zona_aluvional';
  const options = byName
    ? Object.keys(data?.p24h_by_station_mm?.stations ?? {}).map((name) => [name, name])
    : Object.entries(data?.stations ?? {}).map(([id, station]) => [id, station.name]);
  return (
    <div className="mt-4 space-y-2">
      <label className="block text-sm font-medium" htmlFor="idf-station">{t('calculator.idfStation')} *</label>
      <select id="idf-station" value={(byName ? stationName : stationId) ?? ''}
        disabled={isLoading}
        onChange={(event) => onChange({
          station_id: byName ? null : event.target.value || null,
          station_name: byName ? event.target.value || null : null,
        })}
        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
        <option value="">{t('calculator.selectStation')}</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
    </div>
  );
}
