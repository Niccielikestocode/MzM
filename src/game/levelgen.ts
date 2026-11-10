import type { Level, Room } from '../core/types';
import { mulberry32, pick, randInt, shuffle } from '../core/rng';
import { monsters, topics, topicById } from '../core/data';

const monsterForTopic = (topic: string) => monsters.find(m => m.topic === topic && !m.boss);

/** Plano de salas: sin dos descansos seguidos, mini jefe al final, un combate antes del tesoro. */
export function planRooms(seed: number, n: number, topicsPool: string[], opts: { minD: number; maxD: number }): Room[] {
  const r = mulberry32(seed);
  const rooms: Room[] = [];
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    const t = i / Math.max(1, n - 1);
    const difficulty = Math.min(opts.maxD, Math.max(opts.minD, Math.round(opts.minD + t * (opts.maxD - opts.minD))));
    let type: Room['type'] = 'combat';
    if (!last && i > 0 && i < n - 1) {
      const prev = rooms[i - 1]?.type;
      const roll = r();
      if (roll < 0.18 && prev === 'combat') type = 'treasure';
      else if (roll < 0.34 && prev !== 'rest' && prev !== 'treasure') type = 'rest';
    }
    if (type !== 'combat') { rooms.push({ type }); continue; }
    const topic = pick(r, topicsPool), m = monsterForTopic(topic) ?? monsters[0];
    const base = m.questions;
    rooms.push({ type: 'combat', monster: m.id, topic, difficulty: last ? Math.min(4, difficulty + 1) : difficulty, questions: last ? base + 2 : Math.max(3, base - 1 + (i % 2)), miniBoss: last, hpMultiplier: last ? 1.5 : 1 });
  }
  return rooms;
}

export function learningRun(topic: string, seed: number): Level {
  const r = mulberry32(seed), n = randInt(r, 4, 6), m = monsterForTopic(topic) ?? monsters[0];
  const rooms = planRooms(seed, n, [topic], { minD: 1, maxD: 4 }).map(rm => (rm.type === 'combat' ? { ...rm, monster: m.id } : rm));
  return { id: `learn_${topic}_${seed}`, world: topicById[topic].world, topic, name: `Aprendizaje: ${topicById[topic].name}`, rooms };
}
export function freeRun(seed: number, worldIds: string[]): Level {
  const r = mulberry32(seed), n = randInt(r, 5, 10);
  const pool = topics.filter(t => worldIds.includes(t.world) && monsterForTopic(t.id)).map(t => t.id);
  const world = pick(r, worldIds);
  return { id: `free_${seed}`, world, topic: 'libre', name: 'Modo libre', rooms: planRooms(seed, n, pool.length ? shuffle(r, pool) : ['reales'], { minD: 1, maxD: 4 }) };
}
