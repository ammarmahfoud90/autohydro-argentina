import { useState } from 'react';

interface ChangelogEntry {
  version: string;
  label?: string;
  highlights: string[];
}

const ENTRIES: ChangelogEntry[] = [
  {
    version: 'v1.6.1',
    label: 'Nuevo',
    highlights: [
      'Validación técnica contra HEC-HMS (U.S. Army Corps of Engineers)',
      'Diferencias < 5% en los 3 casos de prueba',
      'Página de validación completa con tablas de comparación',
    ],
  },
  {
    version: 'v1.6',
    highlights: [
      '3 casos de estudio reales documentados (AMBA, NEA, Cuyo)',
      'Función "Cargar caso en calculadora" con parámetros pre-llenados',
      'Nueva sección de casos de estudio en el inicio',
    ],
  },
  {
    version: 'v1.5.1',
    highlights: [
      'Advertencias mejoradas para datos IDF estimados',
      'Selector de ciudad con indicadores verificado/estimado',
      'Limpieza de interfaz — simulador de inundaciones oculto hasta producción',
    ],
  },
  {
    version: 'v1.5',
    highlights: [
      'Ajuste por cambio climático (RCP 4.5/8.5)',
      'Generador de hietogramas de diseño',
      'Memorias de cálculo hidráulico (Manning + Alcantarillas)',
    ],
  },
  {
    version: 'v1.4',
    highlights: [
      'Simulador de inundaciones',
      'Cálculo de área inundable y profundidades',
      'Clasificación de riesgo hídrico',
    ],
  },
  {
    version: 'v1.3',
    highlights: [
      'Chat con Ingeniero IA (Haiku)',
      'App instalable (PWA)',
      'Importar/Exportar Shapefile',
    ],
  },
  {
    version: 'v1.2',
    highlights: [
      'Hidrograma Unitario SCS',
      'Comparación de escenarios',
      'Exportar a Excel (.xlsx)',
      'Dimensionamiento de alcantarillas',
    ],
  },
  {
    version: 'v1.1',
    highlights: ['Cálculo de Manning', 'Mapa de cuenca en reportes'],
  },
  {
    version: 'v1.0',
    highlights: ['Lanzamiento inicial — Cálculo hidrológico, IDF 33 ciudades'],
  },
];

const INITIALLY_VISIBLE = 3;

export function ChangelogTimeline() {
  const [expanded, setExpanded] = useState(false);

  const hidden = ENTRIES.length - INITIALLY_VISIBLE;
  const visible = expanded ? ENTRIES : ENTRIES.slice(0, INITIALLY_VISIBLE);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-gray-700">Historial de versiones</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            v1.6.1 actual
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {expanded ? 'Colapsar' : `Ver todas (${hidden} más)`}
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />

        <div className="space-y-4">
          {visible.map((entry, i) => {
            const isCurrent = i === 0 && !expanded ? true : entry.version === 'v1.6.1';
            return (
              <div key={entry.version} className="relative flex gap-4">
                {/* Dot */}
                <div className="relative z-10 mt-1 shrink-0">
                  {isCurrent ? (
                    <div
                      className="w-[11px] h-[11px] rounded-full bg-emerald-500"
                      style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }}
                    />
                  ) : (
                    <div className="w-[11px] h-[11px] rounded-full bg-slate-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2 pb-1">
                  <span className="text-xs font-semibold text-slate-700 shrink-0">
                    {entry.version}
                  </span>
                  {entry.label && (
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 leading-none">
                      {entry.label}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1.5 w-full">
                    {entry.highlights.map((h) => (
                      <span
                        key={h}
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fade gradient when collapsed */}
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
