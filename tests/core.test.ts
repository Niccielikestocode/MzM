import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/core/rng';
import { heroById, monsterById, levels, topics, cardById } from '../src/core/data';
import { newSave } from '../src/game/save';
import { masteryOf, updateMastery } from '../src/game/mastery';
import { freeRun, learningRun, planRooms } from '../src/game/levelgen';
import { pickQuestion } from '../src/game/picker';
import { isAvailable } from '../src/game/campaign';
import { startCombat, drawHand, resolve, monsterAttack, monsterWillAttack, isWon, isDead, currentTopic } from '../src/game/combat';
import { masteryCards, checkAchievements } from '../src/game/rewards';
import { generate } from '../src/questions';

describe('dominio', () => {
  it('sube con aciertos y baja con fallos', () => {
    const s = newSave('lia', 'T'); const m0 = masteryOf(s, 'reales');
    for (let i = 0; i < 10; i++) updateMastery(s, 'reales', true, 2);
    expect(masteryOf(s, 'reales')).toBeGreaterThan(0.7);
    const hi = masteryOf(s, 'reales'); updateMastery(s, 'reales', false, 2);
    expect(masteryOf(s, 'reales')).toBeLessThan(hi); expect(m0).toBe(0.25);
  });
});
describe('generador de niveles', () => {
  it('cumple las reglas de colocación y es determinista', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rooms = planRooms(seed, 5 + (seed % 6), ['reales', 'plano'], { minD: 1, maxD: 4 });
      expect(rooms[rooms.length - 1].type).toBe('combat'); expect(rooms[rooms.length - 1].miniBoss).toBe(true);
      expect(rooms[0].type).toBe('combat');
      rooms.forEach((r, i) => { if (r.type === 'rest') expect(rooms[i - 1].type).not.toBe('rest'); if (r.type === 'treasure') expect(rooms[i - 1].type).toBe('combat'); });
    }
    expect(freeRun(5, ['cavernas'])).toEqual(freeRun(5, ['cavernas']));
    const l = learningRun('lineal', 9); expect(l.rooms.length).toBeGreaterThanOrEqual(4); expect(l.rooms.length).toBeLessThanOrEqual(6);
  });
});
describe('selector de preguntas', () => {
  it('sirve preguntas de todos los temas sin repetir plantilla seguida', () => {
    const s = newSave('lia', 'T'), r = mulberry32(3); let last = '';
    for (const t of topics) for (let i = 0; i < 30; i++) { const q = pickQuestion({ topics: [t.id], difficulty: 1 + (i % 4), rng: r, save: s, lastTemplate: last }); expect(q.topic).toBe(t.id); last = q.template; }
  });
});
describe('campaña', () => {
  it('desbloquea en orden', () => {
    const s = newSave('lia', 'T'); const L = (id: string) => levels.find(l => l.id === id)!;
    expect(isAvailable(s, L('zona_reales'))).toBe(true); expect(isAvailable(s, L('zona_porcentajes'))).toBe(false);
    s.progress.levelsCleared.push('zona_reales'); expect(isAvailable(s, L('zona_porcentajes'))).toBe(true);
    expect(isAvailable(s, L('parcial_cavernas'))).toBe(false);
    s.progress.levelsCleared.push('zona_porcentajes', 'zona_factorizacion'); expect(isAvailable(s, L('parcial_cavernas'))).toBe(true);
  });
});
describe('combate', () => {
  const setup = (heroId = 'lia') => { const save = newSave(heroId, 'T'), rng = mulberry32(1), hero = heroById[heroId]; const m = monsterById.slime_fraccionario;
    const s = startCombat({ hero, save, monster: m, room: { type: 'combat', monster: m.id, difficulty: 1, questions: 3 }, heroHp: hero.hp, rng }); drawHand(s, rng); return { s, save, rng }; };
  it('la vida del monstruo escala con las preguntas y la mano tiene 3 cartas', () => { const { s } = setup(); expect(s.monsterMaxHp).toBe(12); expect(s.hand.length).toBe(3); });
  it('acertar con el golpe básico hiere; fallar hace que el monstruo ataque', () => {
    const { s } = setup(); const q = generate('reales', 'raices.simplificar', 1, 4);
    resolve(s, 'basic', q, true); expect(s.monsterHp).toBe(9); expect(monsterWillAttack(s, 'basic', true)).toBe(false);
    resolve(s, 'basic', q, false); expect(monsterWillAttack(s, 'basic', false)).toBe(true);
    const ev = monsterAttack(s); expect(ev[0]).toMatchObject({ t: 'monster', n: 3 }); expect(s.heroHp).toBe(25);
  });
  it('el bloqueo absorbe y Teo ignora el primer golpe', () => {
    const { s } = setup(); s.block = 2; monsterAttack(s); expect(s.heroHp).toBe(27);
    const t = setup('teo'); monsterAttack(t.s); expect(t.s.heroHp).toBe(34);
  });
  it('doble o nada duplica y castiga el fallo', () => {
    const { s } = setup(); const q = generate('reales', 'raices.simplificar', 1, 4);
    resolve(s, 'doble_o_nada', q, true); expect(s.monsterHp).toBe(12 - 8);
    const b = setup(); resolve(b.s, 'doble_o_nada', q, false); expect(b.s.heroHp).toBe(28 - 4);
  });
  it('se puede ganar y perder', () => {
    const { s } = setup(); const q = generate('reales', 'raices.simplificar', 1, 4);
    while (!isWon(s)) resolve(s, 'doble_o_nada', q, true); expect(isWon(s)).toBe(true);
    s.heroHp = 1; monsterAttack(s); expect(isDead(s)).toBe(true);
  });
  it('los jefes cambian de tema por fase', () => {
    const save = newSave('lia', 'T'), rng = mulberry32(2), hero = heroById.lia, m = monsterById.rey_irracional;
    const s = startCombat({ hero, save, monster: m, room: { type: 'boss', monster: m.id, phases: m.phases, questions: 9, difficulty: 4 }, heroHp: 28, rng });
    expect(currentTopic(s, 'x')).toBe('reales'); s.monsterHp = s.monsterMaxHp * 0.5; expect(currentTopic(s, 'x')).toBe('porcentajes'); s.monsterHp = 2; expect(currentTopic(s, 'x')).toBe('factorizacion');
  });
});
describe('recompensas', () => {
  it('dominar un tema entrega sus cartas y logros', () => {
    const s = newSave('lia', 'T'); for (let i = 0; i < 10; i++) updateMastery(s, 'pitagoras', true, 2);
    const got = masteryCards(s, 'pitagoras'); expect(got.length).toBeGreaterThan(0); expect(s.deck).toContain(got[0].id);
    expect(checkAchievements(s)).toContain('tema_dominado'); expect(cardById.estocada_pitagorica).toBeTruthy();
  });
});

import { endTurn, monsterAttack as mAtk } from '../src/game/combat';
describe('cartas nuevas', () => {
  const mk = () => { const save = newSave('lia', 'T'), rng = mulberry32(2), hero = heroById.lia, m = monsterById.slime_fraccionario;
    const s = startCombat({ hero, save, monster: m, room: { type: 'combat', monster: m.id, difficulty: 1, questions: 10 }, heroHp: hero.hp, rng }); drawHand(s, rng); return { s, rng }; };
  const q = { graph: undefined } as any;
  it('quemar hace daño al final de los turnos', () => { const { s } = mk(); resolve(s, 'raiz_ardiente', q, true); const h0 = s.monsterHp; expect(endTurn(s)[0]).toMatchObject({ t: 'burn', n: 2 }); endTurn(s); expect(s.monsterHp).toBe(h0 - 4); expect(endTurn(s)).toEqual([]); });
  it('aturdir cancela el siguiente ataque y debilitar lo reduce', () => { const { s } = mk(); resolve(s, 'rotacion_estelar', q, true); expect(mAtk(s)[0].t).toBe('stunned'); resolve(s, 'escala_de_tales', q, true); const ev = mAtk(s)[0] as any; expect(ev.n + ev.blocked).toBe(s.monster.attack.damage - 2); });
  it('robo de vida, racha y carta extra', () => { const { s, rng } = mk(); s.heroHp = 10; const ev = resolve(s, 'lanza_secante', q, true); expect(ev.find(e => e.t === 'drain')).toBeTruthy(); expect(s.heroHp).toBeGreaterThan(10);
    s.streak = 3; const d = (resolve(s, 'interes_compuesto', q, true).find(e => e.t === 'damage') as any).n; expect(d).toBe(3 + 4); resolve(s, 'compas_de_oro', q, true); drawHand(s, rng); expect(s.hand.length).toBe(4); });
});
