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
  // ── Chaco ──────────────────────────────────────────────────────────────────
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
    id: 'pr_saenz_pena',
    name: 'Presidencia Roque Sáenz Peña',
    short_name: 'P.R. Sáenz Peña',
    province: 'Chaco',
    source_document: 'Resolución APA 1334/21 — Anexo III',
    series_period: '1978-2008 (31 años)',
    max_reliable_return_period: 25,
    warning_badge: null,
  },
  // ── Formosa ────────────────────────────────────────────────────────────────
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
  // ── Entre Ríos ─────────────────────────────────────────────────────────────
  {
    id: 'entre_rios_concordia',
    name: 'Concordia',
    short_name: 'Concordia (ER)',
    province: 'Entre Ríos',
    source_document: 'Zamanillo et al. 2008 — Dirección de Hidráulica ER',
    series_period: '1961–2004 (43 años)',
    max_reliable_return_period: 50,
    warning_badge: null,
  },
  {
    id: 'entre_rios_concepcion_uruguay',
    name: 'Concepción del Uruguay',
    short_name: 'Cón. del Uruguay (ER)',
    province: 'Entre Ríos',
    source_document: 'Zamanillo et al. 2008 — Dirección de Hidráulica ER',
    series_period: '1980–2005 (25 años)',
    max_reliable_return_period: 50,
    warning_badge: null,
  },
  {
    id: 'entre_rios_parana',
    name: 'Paraná',
    short_name: 'Paraná (ER)',
    province: 'Entre Ríos',
    source_document: 'Zamanillo et al. 2008 — Dirección de Hidráulica ER',
    series_period: '1963–2005 (42 años)',
    max_reliable_return_period: 50,
    warning_badge: null,
  },
  // ── Santa Fe ───────────────────────────────────────────────────────────────
  {
    id: 'santa_fe_cim_fich',
    name: 'Santa Fe (Estación CIM-FICH)',
    short_name: 'Santa Fe CIM',
    province: 'Santa Fe',
    source_document: 'Marcus et al. 2019 — Cuadernos CURIHAM',
    series_period: '1986–2016 (31 años)',
    max_reliable_return_period: 25,
    warning_badge: null,
  },
  // ── Buenos Aires ───────────────────────────────────────────────────────────
  {
    id: 'buenos_aires_azul',
    name: 'Azul y aledaños',
    short_name: 'Azul (BA)',
    province: 'Buenos Aires',
    source_document: 'Collazos & Cazenave 2015 — IHLLA / CONICET',
    series_period: '2006–2013 (8 años subdiar.)',
    max_reliable_return_period: 50,
    warning_badge: 'Serie corta',
  },
  {
    id: 'buenos_aires_balcarce',
    name: 'Balcarce',
    short_name: 'Balcarce (BA)',
    province: 'Buenos Aires',
    source_document: 'Puricelli & Marino 2014 — INTA Balcarce',
    series_period: '1972-2006 (23 años)',
    max_reliable_return_period: 100,
    warning_badge: null,
  },
  // ── Córdoba ────────────────────────────────────────────────────────────────
  {
    id: 'cordoba_observatorio',
    name: 'Córdoba — Observatorio',
    short_name: 'Córdoba Obs.',
    province: 'Córdoba',
    source_document: 'Rico et al. 2025 — INA-CIRSA',
    series_period: '1943–2025 (82 años)',
    max_reliable_return_period: 50,
    warning_badge: null,
  },
  {
    id: 'cordoba_la_suela',
    name: 'Córdoba — La Suela (Sierras)',
    short_name: 'La Suela (CBA)',
    province: 'Córdoba',
    source_document: 'Rico et al. 2025 — INA-CIRSA',
    series_period: '1971–2025 (49 años)',
    max_reliable_return_period: 50,
    warning_badge: null,
  },
  {
    id: 'cordoba_pampa_olaen',
    name: 'Córdoba — Pampa de Olaen',
    short_name: 'Pampa de Olaen (CBA)',
    province: 'Córdoba',
    source_document: 'Rico et al. 2025 — INA-CIRSA',
    series_period: '1992–2025 (27 años)',
    max_reliable_return_period: 25,
    warning_badge: null,
  },
  {
    id: 'cordoba_altas_cumbres',
    name: 'Córdoba — Altas Cumbres',
    short_name: 'Altas Cumbres (CBA)',
    province: 'Córdoba',
    source_document: 'Rico et al. 2024 — INA-CIRSA',
    series_period: '1994–2024 (28 años)',
    max_reliable_return_period: 25,
    warning_badge: null,
  },
  // ── Mendoza ────────────────────────────────────────────────────────────────
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
  // ── Neuquén ────────────────────────────────────────────────────────────────
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
  // ── Salta ──────────────────────────────────────────────────────────────────
  {
    id: 'salta_capital',
    name: 'Salta Capital',
    short_name: 'Salta Capital',
    province: 'Salta',
    source_document: 'Rico et al. 2025 — INA-CIRSA',
    series_period: '1963–2014 (23 años ef.)',
    max_reliable_return_period: 25,
    warning_badge: null,
  },
  // ── Tucumán ────────────────────────────────────────────────────────────────
  {
    id: 'tucuman_estaciones',
    name: 'Tucumán — Red provincial (28 estaciones)',
    short_name: 'Tucumán (red)',
    province: 'Tucumán',
    source_document: 'Bazzano 2019 — Tesis UNT-FACET',
    series_period: '2001–2015 (15 años)',
    max_reliable_return_period: 25,
    warning_badge: null,
  },
  // ── Catamarca ──────────────────────────────────────────────────────────────
  {
    id: 'catamarca_el_rodeo',
    name: 'El Rodeo — Catamarca',
    short_name: 'El Rodeo (CA)',
    province: 'Catamarca',
    source_document: 'INA-CRA IT Nº 145 (2012)',
    series_period: '1970–2006 (37 años)',
    max_reliable_return_period: 200,
    warning_badge: null,
  },
];
