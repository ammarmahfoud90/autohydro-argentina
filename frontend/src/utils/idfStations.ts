export function needsIDFStation(localityId: string): boolean {
  return ['tucuman_estaciones', 'neuquen_zona_aluvional'].includes(localityId);
}
