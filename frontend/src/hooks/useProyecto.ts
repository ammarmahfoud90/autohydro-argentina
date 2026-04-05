import { useState } from 'react';
import type { HydrologyResult } from '../types';
import type { HyetographResult } from '../services/api';

// ── Paso data types ───────────────────────────────────────────────────────────

export interface Paso1Data {
  localidad_id: string;
  localidad_nombre: string;
  provincia: string;
  return_period: number;
  duration_min: number;
  intensidad_mm_hr: number;
  fuente_idf: string;
}

export interface Paso2Data {
  area_km2: number;
  longitud_cauce_km: number;
  pendiente_media: number;
  elevation_diff_m: number | null;
  avg_elevation_m: number | null;
  coef_escorrentia_C: number;
  numero_curva_CN: number;
  tc_formula: string;
  tc_horas: number;
}

export interface Paso3Data {
  metodo: string;
  delta_t_min: number;
  precipitacion_total_mm: number;
  result: HyetographResult;
}

export interface Paso4Data {
  metodo_calculo: string;
  q_pico_m3s: number;
  nivel_riesgo: string;
  result: HydrologyResult;
}

export interface Paso5Data {
  tipo_seccion: string;
  b_m: number | null;
  y_m: number;
  z: number | null;
  D_m: number | null;
  n_manning: number;
  pendiente_canal: number;
  q_capacidad_m3s: number;
  velocidad_ms: number;
  verifica: boolean;
}

export interface Paso6Data {
  nombre_proyecto: string;
  comitente: string;
  profesional: string;
  fecha: string;
  notas: string;
}

export interface ProyectoHidraulico {
  id: string;
  nombre: string;
  creado: string;
  modificado: string;
  paso1: Paso1Data | null;
  paso2: Paso2Data | null;
  paso3: Paso3Data | null;
  paso4: Paso4Data | null;
  paso5: Paso5Data | null;
  paso6: Paso6Data | null;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const PROJECTS_KEY = 'autohydro-projects';
const MAX_PROJECTS = 5;

export function saveProjectToStorage(proyecto: ProyectoHidraulico) {
  try {
    const projects: ProyectoHidraulico[] = JSON.parse(
      localStorage.getItem(PROJECTS_KEY) || '[]',
    );
    const idx = projects.findIndex((p) => p.id === proyecto.id);
    if (idx >= 0) {
      projects[idx] = proyecto;
    } else {
      projects.unshift(proyecto);
      if (projects.length > MAX_PROJECTS) projects.pop();
    }
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Error guardando proyecto:', e);
  }
}

export function getProjectsFromStorage(): ProyectoHidraulico[] {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function deleteProjectFromStorage(id: string) {
  try {
    const projects = getProjectsFromStorage().filter((p) => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Error eliminando proyecto:', e);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function createProyecto(): ProyectoHidraulico {
  return {
    id: crypto.randomUUID(),
    nombre: 'Nuevo proyecto',
    creado: new Date().toISOString(),
    modificado: new Date().toISOString(),
    paso1: null,
    paso2: null,
    paso3: null,
    paso4: null,
    paso5: null,
    paso6: null,
  };
}

export function useProyecto() {
  const [proyecto, setProyecto] = useState<ProyectoHidraulico>(createProyecto);
  const [step, setStep] = useState(1);

  function updateStep<K extends keyof ProyectoHidraulico>(
    key: K,
    value: ProyectoHidraulico[K],
  ) {
    setProyecto((prev) => ({
      ...prev,
      [key]: value,
      modificado: new Date().toISOString(),
    }));
  }

  function saveProject(extraPaso6?: Paso6Data) {
    const p: ProyectoHidraulico = {
      ...proyecto,
      paso6: extraPaso6 ?? proyecto.paso6,
      nombre: extraPaso6?.nombre_proyecto ?? proyecto.paso1?.localidad_nombre ?? 'Proyecto',
      modificado: new Date().toISOString(),
    };
    saveProjectToStorage(p);
    return p;
  }

  return { proyecto, step, setStep, updateStep, saveProject };
}
