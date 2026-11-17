import type { Question } from '../core/types';
import { mulberry32, type Rng } from '../core/rng';
import type { Gen } from './helpers';
import { reales, porcentajes, factorizacion } from './numbers';
import { ecuaciones, funciones, lineal, sistemas, cuadratica, ecuacionesCuadraticas, ondas } from './algebra';
import { medidas, pitagoras, tales, unidades, transformaciones, plano } from './geometry';

export const GENERATORS: Record<string, Record<string, Gen>> = {
  reales, porcentajes, factorizacion, ecuaciones, funciones, lineal, sistemas, cuadratica, ecuacionesCuadraticas, ondas,
  medidas, pitagoras, tales, unidades, transformaciones, plano
};
export const templateId = (topic: string, name: string): string => `${topic}.${name}`;

/** Plantillas que existen, con su dificultad mínima (del archivo de temas). */
export function generate(topic: string, template: string, difficulty: number, seed: number): Question {
  const gen = GENERATORS[topic]?.[template];
  if (!gen) throw new Error(`no hay generador ${topic}.${template}`);
  // Si una semilla da un caso degenerado (p. ej. valores que se repiten), se pasa a la siguiente; sigue siendo determinista.
  let last: unknown;
  for (let k = 0; k < 30; k++) {
    try {
      const r: Rng = mulberry32(seed + k * 104729);
      const body = gen(r, difficulty);
      return { template: templateId(topic, template), topic, difficulty, seed, ...body };
    } catch (e) { last = e; }
  }
  throw last;
}
export const hasGenerator = (topic: string, template: string): boolean => !!GENERATORS[topic]?.[template];
