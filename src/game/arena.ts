/** Lógica pura del combate en tiempo real (sin DOM): daño, combo, cartas, enfriamientos y ataques del monstruo. */
import type { CardDef, MonsterDef, Question, SaveData } from '../core/types';
import { cardById, cards } from '../core/data';
import { updateMastery } from './mastery';

export const BASIC_DMG = [2, 3, 5]; // golpes 1, 2 y 3 de la cadena
export const COMBO_WINDOW = 2000; // ms para mantener el combo entre golpes
export const comboMult = (n: number): number => 1 + Math.min(1.5, n * 0.07);
export const comboTier = (n: number): number => (n >= 30 ? 4 : n >= 20 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0);
export const TIER_NAME = ['', '¡BIEN!', '¡GENIAL!', '¡INCREÍBLE!', '¡LEGENDARIO!'];

/** Daño de un golpe básico de la cadena. */
export function hitDamage(step: number, combo: number, extra = 0): number { return Math.max(1, Math.round((BASIC_DMG[step % 3] + extra) * comboMult(combo))); }
/** Daño del orbe correcto: una fracción de la vida máxima del monstruo. */
export const orbDamage = (maxHp: number, combo: number, n = 4): number => Math.max(3, Math.round(Math.ceil(maxHp / (Math.max(3, n) + 1)) * (1 + Math.min(0.15, combo * 0.01))));
/** Los golpes y cartas sólo pueden quitar esta fracción de la vida: el resto exige acertar problemas. */
export const CHIP_CAP = 0.35;
export const chipLeft = (s: { maxHp: number; chip: number }): number => Math.max(0, Math.floor(s.maxHp * CHIP_CAP) - s.chip);

export type Slot = { id: string; cd: number; max: number };
/** Cartas que exigen resolver un problema para activarse con todo su efecto. */
export const needsProblem = (c: CardDef): boolean => c.type === 'riesgo' || c.rarity === 'rara' || c.rarity === 'epica' || c.rarity === 'legendaria';
export function cooldownMs(c: CardDef): number {
  const base = { ataque: 7, defensa: 10, utilidad: 12, riesgo: 16, reliquia: 0 }[c.type] ?? 10;
  return Math.round(base * (c.rarity === 'comun' ? 1 : c.rarity === 'rara' ? 1.15 : 1.3) * 1000);
}
/** Mazo equipado: usa el guardado o, si no hay, las mejores 4 cartas no básicas del mazo. */
export function loadoutOf(save: SaveData): string[] {
  const ok = (id: string) => save.deck.includes(id) && id !== 'estocada_basica' && cardById[id] && cardById[id].type !== 'reliquia';
  const chosen = (save.loadout ?? []).filter(ok);
  const rar = { legendaria: 0, epica: 1, rara: 2, comun: 3 } as Record<string, number>;
  const rest = save.deck.filter(ok).filter(id => !chosen.includes(id)).sort((a, b) => rar[cardById[a].rarity] - rar[cardById[b].rarity]);
  return [...chosen, ...rest].slice(0, 4);
}

export interface FightState {
  monster: MonsterDef; maxHp: number; hp: number; heroMax: number; heroHp: number;
  combo: number; comboT: number; best: number; shield: number; reflectT: number; weakT: number; stunT: number; burnT: number; burnN: number; empowered: number;
  chip: number; hits: number; correct: number; asked: number; hintsUsed: number; diff: number; hitRun: number; missRun: number; prep: { remove: number; delta: number; graph: boolean };
}
export function newFight(monster: MonsterDef, qCount: number, hpMult: number, heroHp: number, heroMax: number): FightState {
  const base = monster.hp * (qCount / monster.questions) * hpMult;
  const maxHp = Math.max(8, Math.round(base * 1.25));
  return { monster, maxHp, hp: maxHp, heroMax, heroHp, combo: 0, comboT: 0, best: 0, shield: 0, reflectT: 0, weakT: 0, stunT: 0, burnT: 0, burnN: 0, empowered: 0, chip: 0, hits: 0, correct: 0, asked: 0, hintsUsed: 0, diff: 0, hitRun: 0, missRun: 0, prep: { remove: 0, delta: 0, graph: false } };
}
export type AEv =
  | { t: 'damage'; n: number } | { t: 'shield'; n: number } | { t: 'heal'; n: number } | { t: 'drain'; n: number } | { t: 'self'; n: number }
  | { t: 'stun' } | { t: 'weak' } | { t: 'burn' } | { t: 'reflect' } | { t: 'rush'; ms: number } | { t: 'prep'; what: string };

/** Suma un golpe al combo; devuelve el nuevo nivel si cambió de tier. */
export function addCombo(s: FightState, n = 1): number | null {
  const before = comboTier(s.combo); s.combo += n; s.comboT = COMBO_WINDOW; s.best = Math.max(s.best, s.combo);
  const after = comboTier(s.combo); return after > before ? after : null;
}
export function breakCombo(s: FightState): void { s.combo = 0; s.comboT = 0; }
/** Daño de una carta según el estado (combo hace las veces de racha). */
export function cardDamage(s: FightState, c: CardDef, boosted: boolean): number {
  const p = c.params; let d = 0;
  if (p.percentMaxHp) d = Math.max(p.min ?? 0, Math.ceil((s.maxHp * p.percentMaxHp) / 100));
  else if (p.damage) d = p.damage; else if (c.type === 'utilidad') d = 0;
  if (!d) return 0;
  if (p.streakDamage) d += Math.min(6, Math.floor(s.combo / 3)) * p.streakDamage;
  if (p.bonusIfStreak && s.combo >= p.bonusIfStreak.n * 2) d += p.bonusIfStreak.bonus;
  if (p.bonusIfGraph && boosted) d += p.bonusIfGraph;
  if (p.damageMultiplier) d = (c.type === 'riesgo' && !p.damage ? 4 : d) * p.damageMultiplier;
  if (p.hits && boosted) d *= p.hits;
  return Math.round(d * 1.3 * (boosted ? 1.5 : 1));
}
/** Aplica el efecto de una carta. `boosted` = se resolvió su problema (o es común). */
export function applyCard(s: FightState, c: CardDef, boosted: boolean, slots: Slot[]): AEv[] {
  const p = c.params, ev: AEv[] = [], mult = boosted ? 1.4 : 1;
  const d = cardDamage(s, c, boosted);
  if (d) { s.hp = Math.max(0, s.hp - d); ev.push({ t: 'damage', n: d }); if (p.lifesteal) { const h = Math.min(Math.ceil((d * p.lifesteal) / 100), s.heroMax - s.heroHp); if (h > 0) { s.heroHp += h; ev.push({ t: 'drain', n: h }); } } }
  if (p.block) { const b = Math.round(p.block * mult); s.shield = Math.min(14, s.shield + b); ev.push({ t: 'shield', n: b }); }
  if (p.heal) { const h = Math.min(Math.round(p.heal * mult * 1.2), s.heroMax - s.heroHp); s.heroHp += h; ev.push({ t: 'heal', n: h }); }
  if (p.reflectPercent) { s.reflectT = 6000; ev.push({ t: 'reflect' }); }
  if (p.burn) { s.burnT = p.burn.turns * 1500; s.burnN = p.burn.n; ev.push({ t: 'burn' }); }
  if (p.weak) { s.weakT = 6000; ev.push({ t: 'weak' }); }
  if (p.stun) { s.stunT = 2500; ev.push({ t: 'stun' }); }
  if (p.drawExtra) slots.forEach(sl => { if (sl.id !== c.id) sl.cd = Math.max(0, sl.cd - 3000); });
  if (p.removeOptions || p.hints) { s.prep.remove += (p.removeOptions ?? 0) + (p.hints ?? 0); ev.push({ t: 'prep', what: 'remove' }); }
  if (p.showGraph) { s.prep.graph = true; ev.push({ t: 'prep', what: 'graph' }); }
  if (p.difficultyDelta && c.type === 'utilidad') { s.prep.delta += p.difficultyDelta; ev.push({ t: 'prep', what: 'delta' }); }
  return ev;
}
export const missCard = (s: FightState, c: CardDef): AEv[] => {
  const n = c.params.selfDamageOnMiss ?? 0; if (!n) return [];
  s.heroHp = Math.max(0, s.heroHp - n); return [{ t: 'self', n }];
};

/* ---- monstruo ---- */
export type Pattern = 'lunge' | 'shot' | 'slam' | 'rain';
export function patternsFor(m: MonsterDef): Pattern[] {
  if (m.boss) return ['lunge', 'shot', 'slam', 'rain'];
  let h = 0; for (const ch of m.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const sets: Pattern[][] = [['lunge', 'shot'], ['slam', 'lunge'], ['shot', 'rain'], ['slam', 'shot'], ['lunge', 'rain']];
  return sets[h % sets.length];
}
/** Tiempo para responder según dificultad (ms). */
export const answerTime = (d: number): number => 14000 + d * 2500;
/** Pausa entre un problema y el siguiente (ms). */
export const questionGap = (qLeft: number): number => (qLeft > 0 ? 4500 : 7000);
export function topicNow(s: FightState, fallback: string, room: { phases?: string[]; topic?: string }): string {
  const ph = room.phases ?? s.monster.phases; if (!ph?.length) return room.topic ?? fallback;
  const frac = 1 - s.hp / s.maxHp; return ph[Math.min(ph.length - 1, Math.floor(frac * ph.length))];
}
export function adaptDiff(s: FightState, ok: boolean): void {
  if (ok) { s.hitRun++; s.missRun = 0; if (s.hitRun >= 3) { s.diff = Math.min(1, s.diff + 1); s.hitRun = 0; } }
  else { s.missRun++; s.hitRun = 0; if (s.missRun >= 2) { s.diff = Math.max(-1, s.diff - 1); s.missRun = 0; } }
}

/** Registra el resultado de una pregunta en el guardado (dominio, estadísticas, libro de errores). */
export function recordAnswer(save: SaveData, q: Question, correct: boolean, given: string): void {
  save.stats.questionsAnswered++; if (correct) save.stats.correct++;
  updateMastery(save, q.topic, correct, q.difficulty);
  const prev = save.errorBook.find(e => !e.resolved && e.template === q.template);
  if (correct && prev) { prev.resolved = true; save.stats.reviewed++; }
  if (!correct) save.errorBook.push({ template: q.template, topic: q.topic, text: q.text, given, answer: q.options[q.correct] ?? '', explain: q.explain, date: new Date().toISOString(), resolved: false });
  if (save.errorBook.length > 60) save.errorBook = save.errorBook.filter(e => !e.resolved).slice(-60).concat(save.errorBook.filter(e => e.resolved).slice(-10));
}
void cards;
