import type { Question, SaveData } from '../core/types';
import { Rng, weightedPick } from '../core/rng';
import { topicById } from '../core/data';
import { generate, hasGenerator } from '../questions';
import { masteryOf } from './mastery';

/** Elige un tema (con más peso a los más débiles) y una plantilla sin repetir la última. */
export function pickQuestion(o: { topics: string[]; difficulty: number; rng: Rng; save: SaveData; lastTemplate?: string }): Question {
  const d = Math.max(1, Math.min(4, Math.round(o.difficulty)));
  const topic = weightedPick(o.rng, o.topics, t => 1 + (1 - masteryOf(o.save, t)));
  const all = topicById[topic].templates.map(t => ({ name: t.id.slice(t.id.indexOf('.') + 1), min: t.minDifficulty })).filter(t => hasGenerator(topic, t.name));
  let pool = all.filter(t => t.min <= d);
  if (!pool.length) pool = all;
  const fresh = pool.filter(t => `${topic}.${t.name}` !== o.lastTemplate);
  const use = fresh.length ? fresh : pool;
  // las plantillas cercanas a la dificultad pedida pesan más
  const forced = (globalThis as any).__jmForce as string | undefined; // gancho de pruebas
  const tpl = forced && all.find(t => t.name === forced) ? { name: forced, min: 1 } : weightedPick(o.rng, use, t => 1 + t.min / 2 * (d >= t.min ? 1 : 0));
  return generate(topic, tpl.name, d, Math.floor(o.rng() * 2 ** 30));
}
