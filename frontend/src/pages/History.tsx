import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCalculationHistory, type CalculationHistoryEntry } from '../hooks/useCalculationHistory';
import { getProjectsFromStorage, deleteProjectFromStorage, type ProyectoHidraulico } from '../hooks/useProyecto';
import { DEFAULT_FORM } from '../types';

const RISK_BADGE: Record<string, string> = {
  muy_bajo: 'bg-green-100 text-green-800 border-green-300',
  bajo:     'bg-lime-100 text-lime-800 border-lime-300',
  moderado: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  alto:     'bg-orange-100 text-orange-800 border-orange-300',
  muy_alto: 'bg-red-100 text-red-800 border-red-300',
};

const RISK_LABEL: Record<string, string> = {
  muy_bajo: 'Muy bajo',
  bajo:     'Bajo',
  moderado: 'Moderado',
  alto:     'Alto',
  muy_alto: 'Muy alto',
};

const METHOD_LABEL: Record<string, string> = {
  rational:          'Racional',
  modified_rational: 'Racional Mod.',
  scs_cn:            'SCS-CN',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function History() {
  const { getHistory, deleteEntry, clearHistory } = useCalculationHistory();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<CalculationHistoryEntry[]>(getHistory);
  const [confirmClear, setConfirmClear] = useState(false);
  const [projects, setProjects] = useState<ProyectoHidraulico[]>(getProjectsFromStorage);

  const handleDelete = (id: string) => {
    deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearHistory();
    setEntries([]);
    setConfirmClear(false);
  };

  const handleView = (entry: CalculationHistoryEntry) => {
    navigate('/calculator', {
      state: {
        caseStudyData: entry.input_params ?? { ...DEFAULT_FORM, locality_id: entry.locality_id },
        caseStudyName: entry.locality_name,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header row */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Historial de cálculos</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Últimos 10 cálculos guardados en este navegador
            </p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              onBlur={() => setConfirmClear(false)}
              className={`shrink-0 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                confirmClear
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              {confirmClear ? '¿Confirmar?' : 'Limpiar todo'}
            </button>
          )}
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-300"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-base font-medium text-gray-500 mb-1">
              Todavía no realizaste ningún cálculo
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Los resultados se guardan automáticamente al finalizar el wizard
            </p>
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Ir a la calculadora
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        )}

        {/* History list */}
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                      {entry.locality_name}
                    </h3>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{entry.province}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-600 dark:text-slate-300">
                    <span>TR = <strong>{entry.return_period}</strong> años</span>
                    <span className="text-gray-300 dark:text-slate-600">·</span>
                    <span><strong>{entry.duration_min}</strong> min</span>
                    <span className="text-gray-300 dark:text-slate-600">·</span>
                    <span>Q = <strong>{entry.peak_flow_m3s.toFixed(3)}</strong> m³/s</span>
                    <span className="text-gray-300 dark:text-slate-600">·</span>
                    <span className="text-gray-500">{METHOD_LABEL[entry.method] ?? entry.method}</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    RISK_BADGE[entry.risk_level] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {RISK_LABEL[entry.risk_level] ?? entry.risk_level}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700">
                <span className="text-xs text-gray-400 dark:text-slate-500">{formatDate(entry.timestamp)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(entry)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs font-medium text-gray-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-slate-600 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {entries.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-slate-500 text-center mt-6">
            {entries.length} cálculo{entries.length !== 1 ? 's' : ''} guardado{entries.length !== 1 ? 's' : ''} · Máximo 10 · Almacenado localmente en este navegador
          </p>
        )}

        {/* ── Proyectos guardados ──────────────────────────────────────── */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Proyectos guardados</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Diseños completos del Modo Proyecto · Máximo 5
              </p>
            </div>
            <Link
              to="/proyecto"
              className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo proyecto
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center">
              <div className="text-3xl mb-3">🗂</div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No hay proyectos guardados</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 mb-4">
                Usá el Modo Proyecto para diseñar y guardar proyectos completos
              </p>
              <Link
                to="/proyecto"
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                Ir al Modo Proyecto →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-snug truncate">
                        {p.paso6?.nombre_proyecto || p.nombre || 'Proyecto sin nombre'}
                      </h3>
                      {p.paso1 && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {p.paso1.localidad_nombre} · TR={p.paso1.return_period} años
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-600 dark:text-slate-300">
                        {p.paso4 && <span>Q = <strong>{p.paso4.q_pico_m3s.toFixed(3)}</strong> m³/s</span>}
                        {p.paso4 && <span className="text-gray-300 dark:text-slate-600">·</span>}
                        {p.paso5 && <span>Canal {p.paso5.tipo_seccion}</span>}
                        {p.paso6?.profesional && (
                          <>
                            <span className="text-gray-300 dark:text-slate-600">·</span>
                            <span className="text-gray-500 dark:text-slate-400">{p.paso6.profesional}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-violet-100 text-violet-800 border-violet-300">
                      {[p.paso1, p.paso2, p.paso3, p.paso4, p.paso5, p.paso6].filter(Boolean).length}/6 pasos
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-700">
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {new Date(p.modificado).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => {
                        deleteProjectFromStorage(p.id);
                        setProjects((prev) => prev.filter((x) => x.id !== p.id));
                      }}
                      className="text-xs font-medium text-gray-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-slate-600 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
