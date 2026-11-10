import type { CardDef, HeroDef, MonsterDef, Question, Room, SaveData } from '../core/types';
import { Rng, shuffle } from '../core/rng';
import { cardById } from '../core/data';

export type Pick = string; // id de carta o 'basic'
export interface CombatState {
  hero: HeroDef; monster: MonsterDef; room: Room; relics: string[];
  heroHp: number; heroMaxHp: number; block: number; reflect: number;
  monsterHp: number; monsterMaxHp: number;
  drawPile: string[]; discard: string[]; hand: string[];
  turn: number; streak: number; missed: boolean; lastMissed: boolean; firstMissUsed: boolean; firstMissFreeUsed: boolean;
  freeHint: boolean; hintsUsed: number; extraHints: number; diffOffset: number; hitRun: number; missRun: number;
  phaseIdx: number; questionsAsked: number;
  burn: { n: number; turns: number } | null; weak: number; stun: boolean; extraDraw: number;
}
export type Ev =
  | { t: 'damage'; n: number } | { t: 'block'; n: number } | { t: 'heal'; n: number } | { t: 'self'; n: number }
  | { t: 'monster'; n: number; blocked: number } | { t: 'reflect'; n: number } | { t: 'free' } | { t: 'text'; s: string } | { t: 'burn'; n: number } | { t: 'stunned' } | { t: 'weak'; n: number } | { t: 'drain'; n: number } | { t: 'stun' } | { t: 'draw' };

export const BASIC = 'estocada_basica';
const isRelic = (id: string) => cardById[id]?.type === 'reliquia';

export function startCombat(o: { hero: HeroDef; save: SaveData; monster: MonsterDef; room: Room; heroHp: number; rng: Rng }): CombatState {
  const base = o.monster.hp * ((o.room.questions ?? o.monster.questions) / o.monster.questions) * (o.room.hpMultiplier ?? 1);
  const maxHp = Math.max(6, Math.round(base));
  const deck = o.save.deck.filter(id => !isRelic(id));
  const s: CombatState = {
    hero: o.hero, monster: o.monster, room: o.room, relics: o.save.relics,
    heroHp: o.heroHp, heroMaxHp: o.hero.hp, block: 0, reflect: 0, monsterHp: maxHp, monsterMaxHp: maxHp,
    drawPile: shuffle(o.rng, deck), discard: [], hand: [], turn: 0, streak: 0, missed: false, lastMissed: false, firstMissUsed: false, firstMissFreeUsed: false,
    freeHint: o.hero.passive.id === 'pista_gratis', hintsUsed: 0, extraHints: 0, diffOffset: 0, hitRun: 0, missRun: 0, phaseIdx: 0, questionsAsked: 0, burn: null, weak: 0, stun: false, extraDraw: 0
  };
  return s;
}
export function drawHand(s: CombatState, rng: Rng, n = 3): void {
  n += s.extraDraw; s.extraDraw = 0;
  s.discard.push(...s.hand); s.hand = [];
  while (s.hand.length < n) {
    if (!s.drawPile.length) { if (!s.discard.length) break; s.drawPile = shuffle(rng, s.discard); s.discard = []; }
    s.hand.push(s.drawPile.pop() as string);
  }
  s.turn++;
}
/** Tema de la pregunta: en jefes cambia según la fase (por vida restante). */
export function currentTopic(s: CombatState, fallback: string): string {
  const ph = s.room.phases ?? s.monster.phases;
  if (!ph?.length) return s.room.topic ?? fallback;
  const frac = 1 - s.monsterHp / s.monsterMaxHp;
  s.phaseIdx = Math.min(ph.length - 1, Math.floor(frac * ph.length));
  return ph[s.phaseIdx];
}
export function difficultyFor(s: CombatState, card: CardDef | undefined): number {
  const [lo, hi] = s.monster.difficulty;
  const base = (s.room.difficulty ?? lo) + s.diffOffset + (card?.params.difficultyDelta ?? 0);
  return Math.max(1, Math.min(4, Math.max(lo > 1 ? lo - 1 : 1, Math.min(hi, base))));
}
export function adapt(s: CombatState, correct: boolean): void {
  if (correct) { s.hitRun++; s.missRun = 0; if (s.hitRun >= 5) { s.diffOffset = Math.min(1, s.diffOffset + 1); s.hitRun = 0; } }
  else { s.missRun++; s.hitRun = 0; if (s.missRun >= 3) { s.diffOffset = Math.max(-1, s.diffOffset - 1); s.missRun = 0; } }
}

export function damageOf(s: CombatState, card: CardDef, q: Question): number {
  const p = card.params;
  let d = 0;
  if (p.percentMaxHp) d = Math.max(p.min ?? 0, Math.ceil((s.monsterMaxHp * p.percentMaxHp) / 100));
  else if (p.damage) d = p.damage;
  else if (card.type === 'utilidad') d = 2;
  if (p.bonusIfGraph && (q.graph || q.stage || q.clickTarget)) d += p.bonusIfGraph;
  if (p.streakDamage) d += Math.min(6, s.streak) * p.streakDamage;
  if (p.bonusIfStreak && s.streak >= p.bonusIfStreak.n) d += p.bonusIfStreak.bonus;
  if (p.doubleAfterMiss && s.lastMissed) d *= 2;
  if (p.damageMultiplier) d = (card.type === 'riesgo' ? 4 : d) * p.damageMultiplier;
  if (card.type === 'riesgo' && !p.damage && !p.damageMultiplier) d = 4;
  if (p.hits && (q.topic === 'ecuacionesCuadraticas' || q.topic === 'cuadratica')) d *= p.hits;
  if (s.relics.includes('lente_del_vertice') && (q.graph || q.stage)) d += 1;
  if (s.hero.passive.id === 'racha_dano') d += Math.min(5, s.streak);
  return d > 0 ? d : 0;
}

/** Aplica el resultado de responder. No decide la animación: devuelve eventos. */
export function resolve(s: CombatState, pickId: Pick, q: Question, correct: boolean): Ev[] {
  const card = cardById[pickId] ?? cardById[BASIC], p = card.params, ev: Ev[] = [];
  s.lastMissed = s.missed; s.missed = !correct;
  if (correct) {
    s.streak++;
    const d = damageOf(s, card, q);
    if (d) { s.monsterHp = Math.max(0, s.monsterHp - d); ev.push({ t: 'damage', n: d }); }
    if (d && p.lifesteal) { const h = Math.min(Math.ceil((d * p.lifesteal) / 100), s.heroMaxHp - s.heroHp); if (h > 0) { s.heroHp += h; ev.push({ t: 'drain', n: h }); } }
    if (p.burn) s.burn = { n: p.burn.n, turns: p.burn.turns };
    if (p.weak) { s.weak = Math.max(s.weak, p.weak); ev.push({ t: 'weak', n: p.weak }); }
    if (p.stun) { s.stun = true; ev.push({ t: 'stun' }); }
    if (p.drawExtra) { s.extraDraw += p.drawExtra; ev.push({ t: 'draw' }); }
    if (p.block) { s.block += p.block; ev.push({ t: 'block', n: p.block }); }
    if (p.heal) { const h = Math.min(p.heal, s.heroMaxHp - s.heroHp); s.heroHp += h; ev.push({ t: 'heal', n: h }); }
    if (p.reflectPercent) s.reflect = p.reflectPercent;
    if (s.relics.includes('ecuacion_restaurada') && s.streak % 3 === 0) { if (s.heroHp < s.heroMaxHp) { s.heroHp++; ev.push({ t: 'heal', n: 1 }); } }
  } else {
    s.streak = 0;
    if (p.selfDamageOnMiss) { s.heroHp = Math.max(0, s.heroHp - p.selfDamageOnMiss); ev.push({ t: 'self', n: p.selfDamageOnMiss }); }
  }
  adapt(s, correct);
  s.questionsAsked++;
  if (pickId !== 'basic') { const i = s.hand.indexOf(pickId); if (i >= 0) s.discard.push(...s.hand.splice(i, 1)); }
  return ev;
}
/** ¿El monstruo ataca después de este turno? Solo tras un fallo o una carta que no hace daño. */
export function monsterWillAttack(s: CombatState, pickId: Pick, correct: boolean): boolean {
  if (s.monsterHp <= 0) return false;
  const card = cardById[pickId] ?? cardById[BASIC];
  const dealt = !!(card.params.damage || card.params.percentMaxHp) && correct;
  return !correct || !dealt;
}
export function monsterAttack(s: CombatState): Ev[] {
  const ev: Ev[] = [], a = { ...s.monster.attack };
  if (s.stun) { s.stun = false; s.weak = 0; ev.push({ t: 'stunned' }); return ev; }
  if (s.weak) { a.damage = Math.max(0, a.damage - s.weak); s.weak = 0; }
  if (!s.firstMissFreeUsed && ((s.hero.passive.id === 'primer_fallo') || s.relics.includes('anillo_del_cero'))) {
    s.firstMissFreeUsed = true; s.block = 0; ev.push({ t: 'free' }); return ev;
  }
  const blocked = Math.min(s.block, a.damage), dmg = a.damage - blocked;
  s.block -= blocked; s.heroHp = Math.max(0, s.heroHp - dmg);
  ev.push({ t: 'monster', n: dmg, blocked });
  if (s.reflect && dmg + blocked > 0) { const r = Math.ceil(((dmg + blocked) * s.reflect) / 100); s.monsterHp = Math.max(0, s.monsterHp - r); ev.push({ t: 'reflect', n: r }); }
  s.reflect = 0;
  return ev;
}
export const isDead = (s: CombatState): boolean => s.heroHp <= 0;
export const isWon = (s: CombatState): boolean => s.monsterHp <= 0;

/** Daño por quemadura al final del turno. */
export function endTurn(s: CombatState): Ev[] {
  const ev: Ev[] = [];
  if (s.burn && s.monsterHp > 0) { s.monsterHp = Math.max(0, s.monsterHp - s.burn.n); ev.push({ t: 'burn', n: s.burn.n }); if (--s.burn.turns <= 0) s.burn = null; }
  return ev;
}
