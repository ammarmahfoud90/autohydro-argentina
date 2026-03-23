/**
 * Curve Number (CN) tables for Argentine land use categories.
 * Adapted from USDA-SCS methodology for Argentine conditions.
 */

export type SoilGroup = 'A' | 'B' | 'C' | 'D';
export type HydrologicCondition = 'poor' | 'fair' | 'good';

export interface CNCategory {
  id: string;
  description: string;
  group: string;
  conditionBased: boolean;
  values: {
    A: Record<string, number>;
    B: Record<string, number>;
    C: Record<string, number>;
    D: Record<string, number>;
  };
}

export interface SoilGroupInfo {
  name: string;
  description: string;
  typicalLocations: string;
  infiltrationRate: string;
}

export const SOIL_GROUP_INFO: Record<SoilGroup, SoilGroupInfo> = {
  A: {
    name: 'Grupo A — Alta infiltración',
    description: 'Arenas profundas, loess profundo, limos agregados',
    typicalLocations: 'Médanos fijados, suelos arenosos de Entre Ríos',
    infiltrationRate: '> 7.6 mm/hr',
  },
  B: {
    name: 'Grupo B — Infiltración moderada',
    description: 'Limos, suelos franco-arenosos, loess poco profundo',
    typicalLocations: 'Pampa Ondulada, gran parte de la región pampeana',
    infiltrationRate: '3.8 – 7.6 mm/hr',
  },
  C: {
    name: 'Grupo C — Infiltración lenta',
    description: 'Arcillas, suelos con horizonte impermeable',
    typicalLocations: 'Bajos submeridionales, depresión del Salado',
    infiltrationRate: '1.3 – 3.8 mm/hr',
  },
  D: {
    name: 'Grupo D — Infiltración muy lenta',
    description: 'Arcillas pesadas, suelos con napa freática alta, suelos salino-sódicos',
    typicalLocations: 'Zonas deprimidas, áreas con napa < 1m',
    infiltrationRate: '< 1.3 mm/hr',
  },
};

// CN category groups for display organization
export const CN_CATEGORY_GROUPS = [
  'Zonas Urbanas',
  'Agricultura - Región Pampeana',
  'Pasturas y Ganadería',
  'Montes y Forestación',
  'Zonas Especiales',
  'Infraestructura',
] as const;

export type CNGroup = (typeof CN_CATEGORY_GROUPS)[number];

export interface CNEntry {
  id: string;
  description: string;
  group: CNGroup;
  conditionBased: boolean;
  notes?: string;
  values: {
    A: Record<'N/A' | 'poor' | 'fair' | 'good', number | undefined>;
    B: Record<'N/A' | 'poor' | 'fair' | 'good', number | undefined>;
    C: Record<'N/A' | 'poor' | 'fair' | 'good', number | undefined>;
    D: Record<'N/A' | 'poor' | 'fair' | 'good', number | undefined>;
  };
}

export const CN_ENTRIES: CNEntry[] = [
  // === ZONAS URBANAS ===
  {
    id: 'zona_comercial_industrial',
    description: 'Zonas comerciales e industriales',
    group: 'Zonas Urbanas',
    conditionBased: false,
    values: {
      A: { 'N/A': 89, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 92, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 94, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 95, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'residencial_alta_densidad',
    description: 'Residencial alta densidad (lote < 500 m²)',
    group: 'Zonas Urbanas',
    conditionBased: false,
    values: {
      A: { 'N/A': 77, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 85, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 90, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 92, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'residencial_media_densidad',
    description: 'Residencial media densidad (lote 500–1000 m²)',
    group: 'Zonas Urbanas',
    conditionBased: false,
    values: {
      A: { 'N/A': 61, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 75, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 83, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 87, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'residencial_baja_densidad',
    description: 'Residencial baja densidad (lote > 1000 m²)',
    group: 'Zonas Urbanas',
    conditionBased: false,
    values: {
      A: { 'N/A': 54, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 70, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 80, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 85, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'urbanizacion_informal',
    description: 'Urbanización informal / asentamientos',
    group: 'Zonas Urbanas',
    conditionBased: false,
    values: {
      A: { 'N/A': 72, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 82, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 88, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 91, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'espacios_verdes_urbanos',
    description: 'Plazas, parques urbanos',
    group: 'Zonas Urbanas',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 68, fair: 49, good: 39 },
      B: { 'N/A': undefined, poor: 79, fair: 69, good: 61 },
      C: { 'N/A': undefined, poor: 86, fair: 79, good: 74 },
      D: { 'N/A': undefined, poor: 89, fair: 84, good: 80 },
    },
  },
  {
    id: 'calles_pavimentadas',
    description: 'Calles y veredas pavimentadas',
    group: 'Zonas Urbanas',
    conditionBased: false,
    values: {
      A: { 'N/A': 98, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 98, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 98, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 98, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'calles_ripio',
    description: 'Calles de ripio o tierra compactada',
    group: 'Zonas Urbanas',
    conditionBased: false,
    values: {
      A: { 'N/A': 76, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 85, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 89, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 91, poor: undefined, fair: undefined, good: undefined },
    },
  },

  // === AGRICULTURA - REGIÓN PAMPEANA ===
  {
    id: 'soja_siembra_directa',
    description: 'Soja en siembra directa (práctica predominante)',
    group: 'Agricultura - Región Pampeana',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 72, fair: 67, good: 62 },
      B: { 'N/A': undefined, poor: 81, fair: 78, good: 74 },
      C: { 'N/A': undefined, poor: 88, fair: 85, good: 82 },
      D: { 'N/A': undefined, poor: 91, fair: 89, good: 86 },
    },
  },
  {
    id: 'soja_labranza_convencional',
    description: 'Soja con labranza convencional',
    group: 'Agricultura - Región Pampeana',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 77, fair: 72, good: 67 },
      B: { 'N/A': undefined, poor: 85, fair: 81, good: 78 },
      C: { 'N/A': undefined, poor: 91, fair: 88, good: 85 },
      D: { 'N/A': undefined, poor: 94, fair: 91, good: 89 },
    },
  },
  {
    id: 'maiz_siembra_directa',
    description: 'Maíz en siembra directa',
    group: 'Agricultura - Región Pampeana',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 70, fair: 65, good: 60 },
      B: { 'N/A': undefined, poor: 79, fair: 75, good: 71 },
      C: { 'N/A': undefined, poor: 86, fair: 82, good: 78 },
      D: { 'N/A': undefined, poor: 89, fair: 86, good: 83 },
    },
  },
  {
    id: 'trigo',
    description: 'Trigo / Cereales de invierno',
    group: 'Agricultura - Región Pampeana',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 65, fair: 60, good: 55 },
      B: { 'N/A': undefined, poor: 76, fair: 72, good: 68 },
      C: { 'N/A': undefined, poor: 84, fair: 80, good: 76 },
      D: { 'N/A': undefined, poor: 88, fair: 85, good: 82 },
    },
  },
  {
    id: 'girasol',
    description: 'Girasol',
    group: 'Agricultura - Región Pampeana',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 74, fair: 69, good: 64 },
      B: { 'N/A': undefined, poor: 82, fair: 78, good: 74 },
      C: { 'N/A': undefined, poor: 88, fair: 85, good: 82 },
      D: { 'N/A': undefined, poor: 91, fair: 88, good: 86 },
    },
  },

  // === PASTURAS Y GANADERÍA ===
  {
    id: 'pastizal_natural',
    description: 'Pastizal natural pampeano',
    group: 'Pasturas y Ganadería',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 68, fair: 49, good: 39 },
      B: { 'N/A': undefined, poor: 79, fair: 69, good: 61 },
      C: { 'N/A': undefined, poor: 86, fair: 79, good: 74 },
      D: { 'N/A': undefined, poor: 89, fair: 84, good: 80 },
    },
  },
  {
    id: 'pastizal_degradado',
    description: 'Pastizal degradado / sobrepastoreo',
    group: 'Pasturas y Ganadería',
    conditionBased: false,
    values: {
      A: { 'N/A': 75, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 83, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 89, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 92, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'pastura_implantada',
    description: 'Pastura implantada (alfalfa, festuca, etc.)',
    group: 'Pasturas y Ganadería',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 66, fair: 55, good: 45 },
      B: { 'N/A': undefined, poor: 77, fair: 70, good: 63 },
      C: { 'N/A': undefined, poor: 85, fair: 80, good: 75 },
      D: { 'N/A': undefined, poor: 88, fair: 84, good: 80 },
    },
  },
  {
    id: 'feedlot',
    description: 'Feedlot / Corrales de engorde',
    group: 'Pasturas y Ganadería',
    conditionBased: false,
    values: {
      A: { 'N/A': 88, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 92, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 94, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 95, poor: undefined, fair: undefined, good: undefined },
    },
  },

  // === MONTES Y FORESTACIÓN ===
  {
    id: 'monte_nativo_denso',
    description: 'Monte nativo denso (Chaco, Yungas)',
    group: 'Montes y Forestación',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 45, fair: 36, good: 30 },
      B: { 'N/A': undefined, poor: 66, fair: 60, good: 55 },
      C: { 'N/A': undefined, poor: 77, fair: 73, good: 70 },
      D: { 'N/A': undefined, poor: 83, fair: 79, good: 77 },
    },
  },
  {
    id: 'monte_nativo_ralo',
    description: 'Monte nativo ralo / arbustal',
    group: 'Montes y Forestación',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 57, fair: 48, good: 41 },
      B: { 'N/A': undefined, poor: 73, fair: 67, good: 62 },
      C: { 'N/A': undefined, poor: 82, fair: 78, good: 74 },
      D: { 'N/A': undefined, poor: 86, fair: 83, good: 80 },
    },
  },
  {
    id: 'forestacion_pinos',
    description: 'Forestación de pinos (NEA, Patagonia)',
    group: 'Montes y Forestación',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 45, fair: 36, good: 30 },
      B: { 'N/A': undefined, poor: 66, fair: 60, good: 55 },
      C: { 'N/A': undefined, poor: 77, fair: 73, good: 70 },
      D: { 'N/A': undefined, poor: 83, fair: 79, good: 77 },
    },
  },
  {
    id: 'forestacion_eucaliptus',
    description: 'Forestación de eucaliptus',
    group: 'Montes y Forestación',
    conditionBased: true,
    values: {
      A: { 'N/A': undefined, poor: 48, fair: 40, good: 34 },
      B: { 'N/A': undefined, poor: 68, fair: 62, good: 57 },
      C: { 'N/A': undefined, poor: 78, fair: 74, good: 71 },
      D: { 'N/A': undefined, poor: 84, fair: 80, good: 78 },
    },
  },
  {
    id: 'desmonte_reciente',
    description: 'Desmonte reciente / suelo expuesto',
    group: 'Montes y Forestación',
    conditionBased: false,
    values: {
      A: { 'N/A': 77, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 86, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 91, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 94, poor: undefined, fair: undefined, good: undefined },
    },
  },

  // === ZONAS ESPECIALES ===
  {
    id: 'humedal_bañado',
    description: 'Humedales / Bañados',
    group: 'Zonas Especiales',
    conditionBased: false,
    values: {
      A: { 'N/A': 85, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 90, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 93, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 95, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'salinas_salitrales',
    description: 'Salinas y salitrales',
    group: 'Zonas Especiales',
    conditionBased: false,
    values: {
      A: { 'N/A': 92, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 94, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 96, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 97, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'medanos_dunas',
    description: 'Médanos / Dunas (sin vegetación)',
    group: 'Zonas Especiales',
    conditionBased: false,
    values: {
      A: { 'N/A': 63, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 77, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 85, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 88, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'roca_expuesta',
    description: 'Roca expuesta / afloramientos',
    group: 'Zonas Especiales',
    conditionBased: false,
    values: {
      A: { 'N/A': 96, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 96, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 96, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 96, poor: undefined, fair: undefined, good: undefined },
    },
  },

  // === INFRAESTRUCTURA ===
  {
    id: 'parque_solar',
    description: 'Parque solar fotovoltaico',
    group: 'Infraestructura',
    conditionBased: false,
    values: {
      A: { 'N/A': 70, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 80, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 86, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 89, poor: undefined, fair: undefined, good: undefined },
    },
  },
  {
    id: 'parque_eolico',
    description: 'Parque eólico (área de servidumbre)',
    group: 'Infraestructura',
    conditionBased: true,
    notes: 'Usar CN del uso del suelo subyacente',
    values: {
      A: { 'N/A': undefined, poor: 68, fair: 49, good: 39 },
      B: { 'N/A': undefined, poor: 79, fair: 69, good: 61 },
      C: { 'N/A': undefined, poor: 86, fair: 79, good: 74 },
      D: { 'N/A': undefined, poor: 89, fair: 84, good: 80 },
    },
  },
  {
    id: 'cantera_mineria',
    description: 'Cantera / Minería a cielo abierto',
    group: 'Infraestructura',
    conditionBased: false,
    values: {
      A: { 'N/A': 91, poor: undefined, fair: undefined, good: undefined },
      B: { 'N/A': 93, poor: undefined, fair: undefined, good: undefined },
      C: { 'N/A': 95, poor: undefined, fair: undefined, good: undefined },
      D: { 'N/A': 96, poor: undefined, fair: undefined, good: undefined },
    },
  },
];

/**
 * Get CN value for a specific entry, soil group, and condition.
 */
export function getCNValue(
  entry: CNEntry,
  soilGroup: SoilGroup,
  condition: HydrologicCondition = 'fair',
): number {
  const soilData = entry.values[soilGroup];
  if (entry.conditionBased) {
    return soilData[condition] ?? 0;
  }
  return soilData['N/A'] ?? 0;
}

/**
 * Calculate composite CN from weighted land use categories.
 */
export function calculateCompositeCN(
  selections: Array<{
    entryId: string;
    areaPercent: number;
    condition?: HydrologicCondition;
  }>,
  soilGroup: SoilGroup,
): number {
  let cn = 0;
  for (const sel of selections) {
    const entry = CN_ENTRIES.find((e) => e.id === sel.entryId);
    if (!entry) continue;
    const cnVal = getCNValue(entry, soilGroup, sel.condition ?? 'fair');
    cn += cnVal * (sel.areaPercent / 100);
  }
  return Math.round(cn * 10) / 10;
}

/** Return entries grouped by CN_CATEGORY_GROUPS order */
export function getCNEntriesByGroup(): Record<CNGroup, CNEntry[]> {
  const grouped = {} as Record<CNGroup, CNEntry[]>;
  for (const group of CN_CATEGORY_GROUPS) {
    grouped[group] = CN_ENTRIES.filter((e) => e.group === group);
  }
  return grouped;
}
