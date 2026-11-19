import { describe, it, expect } from 'vitest';
import { diagnoseMistake } from '../src/domain/pedagogy/diagnosis';
import { validateSaveData } from '../src/domain/save/storage';
import { newSave } from '../src/game/save';
import { COLOMBIA_WORLDS, pickBanter } from '../src/core/lore';

describe('pedagogía, lore colombiano y respaldo', () => {
  it('detecta error de signo opuesto correctamente', () => {
    const d = diagnoseMistake({
      topic: 'ecuaciones', template: 'eq1', text: '2x = -8',
      given: '4', answer: '-4', explain: 'Dividiendo entre 2 da -4.'
    });
    expect(d.id).toBe('sign_flip');
    expect(d.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('genera diagnósticos específicos por tema matemático', () => {
    const dFrac = diagnoseMistake({ topic: 'reales', template: 'f', text: '1/2 + 1/3', given: '2/5', answer: '5/6', explain: 'm.c.m. = 6' });
    expect(dFrac.id).toBe('reales_fraccion');
    const dPit = diagnoseMistake({ topic: 'pitagoras', template: 'p', text: 'a=3, b=4', given: '7', answer: '5', explain: '3^2+4^2=25' });
    expect(dPit.id).toBe('geometria_formula');
  });

  it('valida archivos de partida exportados/importados', () => {
    const s = newSave('lia', 'Camilo');
    expect(validateSaveData(s)).toBeTruthy();
    expect(validateSaveData({ version: 2 })).toBeNull();
    expect(validateSaveData(null)).toBeNull();
  });

  it('cubre los 4 mundos colombianos y frases de combate', () => {
    expect(Object.keys(COLOMBIA_WORLDS)).toEqual(['cavernas', 'bosque', 'ciudadela', 'vacio']);
    expect(pickBanter('lia', 'hit').length).toBeGreaterThan(2);
    expect(pickBanter('teo', 'start').length).toBeGreaterThan(2);
    expect(pickBanter('mara', 'combo').length).toBeGreaterThan(2);
  });
});
