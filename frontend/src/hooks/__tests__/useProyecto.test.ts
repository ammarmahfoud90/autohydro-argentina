import { describe, expect, it } from 'vitest';
import { updateProjectStep, type ProyectoHidraulico } from '../useProyecto';

const project = {
  id: 'test', nombre: 'Canal', creado: '2026-10-11', modificado: '2026-10-11',
  paso1: { localidad_id: 'amgr' }, paso2: { area_km2: 1 },
  paso3: { metodo: 'chicago' }, paso4: { q_pico_m3s: 10 },
  paso5: { q_capacidad_m3s: 12 }, paso6: { notas: 'Conservar las notas' },
} as ProyectoHidraulico;

describe('project dependency invalidation', () => {
  it('clears every calculation after a change to IDF inputs', () => {
    const next = updateProjectStep(project, 'paso1', project.paso1);
    expect([next.paso2, next.paso3, next.paso4, next.paso5]).toEqual([null, null, null, null]);
    expect(next.paso6).toEqual(project.paso6);
    expect(project.paso5).not.toBeNull();
  });
  it('preserves the basin but invalidates the design capacity after flow changes', () => {
    const next = updateProjectStep(project, 'paso4', null);
    expect(next.paso2).toEqual(project.paso2);
    expect(next.paso3).toEqual(project.paso3);
    expect(next.paso4).toBeNull();
    expect(next.paso5).toBeNull();
  });
  it('keeps calculated values when only report metadata changes', () => {
    const next = updateProjectStep(project, 'nombre', 'Nuevo nombre');
    expect(next.paso4).toEqual(project.paso4);
    expect(next.paso5).toEqual(project.paso5);
  });
});
