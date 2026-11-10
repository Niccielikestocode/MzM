import { describe, it, expect } from 'vitest';
import { newSave } from '../src/game/save';
import { cardById, heroById, monsterById } from '../src/core/data';
import { addCombo, applyCard, breakCombo, cardDamage, comboMult, comboTier, hitDamage, loadoutOf, needsProblem, newFight, orbDamage, patternsFor, cooldownMs, Slot } from '../src/game/arena';

const mk = () => newFight(monsterById.slime_fraccionario, 3, 1, 28, 28);
describe('combate en tiempo real', () => {
  it('el combo multiplica el daño y sube de nivel', () => {
    expect(comboMult(0)).toBe(1); expect(comboMult(100)).toBeCloseTo(2.5);
    expect(hitDamage(2, 0)).toBe(5); expect(hitDamage(0, 20)).toBeGreaterThan(hitDamage(0, 0));
    const s = mk(); let tier: number | null = null; for (let i = 0; i < 5; i++) tier = addCombo(s) ?? tier; expect(tier).toBe(1); expect(comboTier(s.combo)).toBe(1); breakCombo(s); expect(s.combo).toBe(0); expect(s.best).toBe(5);
  });
  it('el orbe correcto hace una fracción grande de la vida', () => { const s = mk(); expect(orbDamage(s.maxHp, 0)).toBeGreaterThanOrEqual(6); expect(orbDamage(40, 0)).toBe(12); });
  it('cartas: daño, escudo, aturdir, quemar y recarga', () => {
    const s = mk(), slots: Slot[] = [{ id: 'a', cd: 5000, max: 9000 }, { id: 'escala_de_tales', cd: 4000, max: 9000 }];
    const e1 = applyCard(s, cardById.rotacion_estelar, true, slots); expect(s.stunT).toBe(2500); expect(s.shield).toBeGreaterThan(0); expect(e1.some(e => e.t === 'stun')).toBe(true);
    applyCard(s, cardById.raiz_ardiente, true, slots); expect(s.burnT).toBeGreaterThan(0);
    applyCard(s, cardById.ecuacion_gemela, true, slots); expect(slots[0].cd).toBe(2000); expect(slots[1].cd).toBe(1000);
    const f = newFight(monsterById.el_divisor, 6, 1, 28, 28), hp = f.hp; applyCard(f, cardById.estocada_pitagorica, false, slots); expect(f.hp).toBeLessThan(hp);
    expect(cardDamage(s, cardById.estocada_pitagorica, true)).toBeGreaterThan(cardDamage(s, cardById.estocada_pitagorica, false));
  });
  it('las cartas raras piden problema y las comunes no', () => { expect(needsProblem(cardById.raiz_ardiente)).toBe(true); expect(needsProblem(cardById.estocada_pitagorica)).toBe(false); expect(needsProblem(cardById.doble_o_nada)).toBe(true); expect(cooldownMs(cardById.doble_o_nada)).toBeGreaterThan(cooldownMs(cardById.estocada_pitagorica)); });
  it('el mazo equipado excluye el golpe básico y reliquias, máximo 4', () => {
    const s = newSave('lia', 'T'); s.deck.push('raiz_ardiente', 'rayo_de_raiz', 'regla_real', 'cubo_de_volumen'); s.relics.push('anillo_del_cero');
    const l = loadoutOf(s); expect(l.length).toBe(4); expect(l).not.toContain('estocada_basica'); expect(l.every(id => cardById[id].type !== 'reliquia')).toBe(true);
    s.loadout = ['regla_real']; expect(loadoutOf(s)[0]).toBe('regla_real');
  });
  it('los monstruos tienen al menos dos patrones y los jefes cuatro', () => { expect(patternsFor(monsterById.slime_fraccionario).length).toBeGreaterThanOrEqual(2); expect(patternsFor(monsterById.el_divisor).length).toBe(4); void heroById; });
});
