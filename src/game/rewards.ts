import type { CardDef, SaveData } from '../core/types';
import { Rng, pick } from '../core/rng';
import { cards, achievements, levels } from '../core/data';
import { isMastered } from './mastery';
import { isCleared } from './campaign';

const own = (s: SaveData, id: string) => s.deck.includes(id) || s.relics.includes(id);
export function give(s: SaveData, c: CardDef): void { if (own(s, c.id)) return; (c.type === 'reliquia' ? s.relics : s.deck).push(c.id); }

/** Cartas que se ganan al dominar un tema. */
export function masteryCards(s: SaveData, topic: string): CardDef[] {
  const out: CardDef[] = [];
  for (const c of cards) if (c.unlock.type === 'mastery' && c.unlock.topic === topic && !own(s, c.id) && isMastered(s, topic, c.unlock.threshold ?? 0.7)) { give(s, c); out.push(c); }
  return out;
}
export function dropCards(s: SaveData, monsterId: string): CardDef[] {
  const out: CardDef[] = [];
  for (const c of cards) if (c.unlock.type === 'drop' && c.unlock.source === monsterId && !own(s, c.id)) { give(s, c); out.push(c); }
  return out;
}
export function treasureCard(s: SaveData, rng: Rng): CardDef | null {
  const pool = cards.filter(c => c.type !== 'reliquia' && !own(s, c.id) && c.unlock.type !== 'start');
  if (!pool.length) return null;
  const c = pick(rng, pool); give(s, c); return c;
}

/** Revisa logros y devuelve los recién desbloqueados. */
export function checkAchievements(s: SaveData): string[] {
  const has = (id: string) => s.achievements.includes(id), got: string[] = [];
  const grant = (id: string, ok: boolean) => { if (ok && !has(id)) { s.achievements.push(id); got.push(id); } };
  const mc = cards.filter(c => c.unlock.type === 'mastery');
  grant('primera_sangre', s.stats.combatsWon >= 1);
  grant('racha_10', s.stats.bestStreak >= 10);
  grant('sin_pistas', s.stats.bossNoHint);
  grant('errores_repasados', s.stats.reviewed >= 5);
  grant('tema_dominado', Object.values(s.mastery).some(m => m.m >= 0.7));
  grant('mundo_1', isCleared(s, 'parcial_cavernas'));
  grant('mundo_2', isCleared(s, 'parcial_bosque'));
  grant('mundo_3', isCleared(s, 'parcial_ciudadela'));
  grant('ecuacion_completa', isCleared(s, 'final'));
  grant('mazo_completo', mc.every(c => own(s, c.id)));
  grant('libre_20', s.stats.freePlayLevels >= 20);
  grant('diario_5', s.diaryPages.length >= 5);
  return got;
}
export const totalLevels = levels.length;
void achievements;
