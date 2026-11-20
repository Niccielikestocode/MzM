import { describe, it, expect } from 'vitest';
import { levels, topics } from '../src/core/data';
import { mulberry32 } from '../src/core/rng';
import { newSave } from '../src/game/save';
import { pickQuestion } from '../src/game/picker';
import { topicsForRoom } from '../src/game/arena';
import { generate, GENERATORS } from '../src/questions';

describe('generadores de preguntas', () => {
  for (const t of topics) {
    for (const tpl of t.templates) {
      const name = tpl.id.slice(tpl.id.indexOf('.') + 1);
      it(`${t.id}.${name} cubre la plantilla y produce preguntas válidas`, () => {
        expect(GENERATORS[t.id]?.[name], 'falta generador').toBeTypeOf('function');
        for (let d = 1; d <= 4; d++) for (let s = 1; s <= 150; s++) {
          const q = generate(t.id, name, d, s * 7919 + d);
          expect(q.text.length).toBeGreaterThan(5);
          expect(q.explain.length).toBeGreaterThan(5);
          if (q.clickTarget) { expect(q.options.length).toBe(0); continue; }
          expect(q.options.length).toBe(4);
          expect(new Set(q.options).size, `${q.text} → ${q.options}`).toBe(4);
          expect(q.correct).toBeGreaterThanOrEqual(0);
          expect(q.options[q.correct]).toBeTruthy();
          expect(q.options.join('|')).not.toMatch(/NaN|undefined|Infinity/);
          expect(q.text).not.toMatch(/NaN|undefined|Infinity/);
          if (q.stage?.meta.optVals) q.stage.meta.optVals.forEach((v: number) => expect(Number.isFinite(v)).toBe(true));
          if (q.stage?.meta.optPts) q.stage.meta.optPts.forEach((p: unknown) => expect(Array.isArray(p)).toBe(true));
        }
      });
    }
  }
  it('es determinista con la misma semilla', () => {
    expect(generate('pitagoras', 'hipotenusa', 2, 42)).toEqual(generate('pitagoras', 'hipotenusa', 2, 42));
  });
  it('resuelve bancos válidos para cada sala de parcial y del boss final', () => {
    const save = newSave('lia', 'Prueba');
    const ids = ['parcial_cavernas', 'parcial_bosque', 'parcial_ciudadela', 'final'];
    for (const id of ids) {
      const level = levels.find(item => item.id === id)!;
      for (const room of level.rooms.filter(item => item.type === 'combat' || item.type === 'boss')) {
        const roomTopics = topicsForRoom(room, level.topic);
        expect(roomTopics.length).toBeGreaterThan(0);
        for (const topic of roomTopics) {
          expect(topics.some(item => item.id === topic), `${id} usa el banco inexistente ${topic}`).toBe(true);
          expect(pickQuestion({ topics: [topic], difficulty: 4, rng: mulberry32(7), save }).topic).toBe(topic);
        }
      }
    }
  });
});
