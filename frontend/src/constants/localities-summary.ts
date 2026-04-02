export interface LocalitySummary {
  id: string;
  name: string;
  short_name: string;
  province: string;
  source_document: string;
  series_period: string;
  max_reliable_return_period: number | null;
  warning_badge: string | null;
}

export const LOCALITIES_SUMMARY: LocalitySummary[] = [
  {
    id: 'amgr',
    name: 'Área Metropolitana del Gran Resistencia',
    short_name: 'Gran Resistencia',
    province: 'Chaco',
    source_document: 'Resolución APA 1334/21 — Anexo I',
    series_period: '1960-2019 (60 años)',
    max_reliable_return_period: 50,
    warning_badge: null,
  },
  {
    id: 'el_colorado',
    name: 'El Colorado',
    short_name: 'El Colorado',
    province: 'Formosa',
    source_document: 'Resolución APA 1334/21 — Anexo II',
    series_period: '1993-2000 (7 años)',
    max_reliable_return_period: 25,
    warning_badge: 'Serie corta',
  },
  {
    id: 'mendoza_pedemonte',
    name: 'Pedemonte del Gran Mendoza',
    short_name: 'Gran Mendoza (pedemonte)',
    province: 'Mendoza',
    source_document: 'INA-CRA 2008',
    series_period: '1982-1995 (13 años)',
    max_reliable_return_period: 25,
    warning_badge: 'Serie corta',
  },
  {
    id: 'neuquen_zona_aluvional',
    name: 'Zona Aluvional de Neuquén (centro-norte)',
    short_name: 'Neuquén árido',
    province: 'Neuquén',
    source_document: 'Instructivo ERH — SsRH Neuquén 2018',
    series_period: 'Múltiples estaciones',
    max_reliable_return_period: 100,
    warning_badge: null,
  },
  {
    id: 'pr_saenz_pena',
    name: 'Presidencia Roque Sáenz Peña',
    short_name: 'P.R. Sáenz Peña',
    province: 'Chaco',
    source_document: 'Resolución APA 1334/21 — Anexo III',
    series_period: '1978-2008 (31 años)',
    max_reliable_return_period: 25,
    warning_badge: null,
  },
];
