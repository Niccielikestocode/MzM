import { describe, it, expect } from 'vitest';
import { newSave } from '../src/game/save';
import { CHEATS, detectCheat, isCorrectAnswerHighlightActive } from '../src/game/cheats';
import { achievements, cards, levels } from '../src/core/data';
import { isCleared } from '../src/game/campaign';
import { checkAchievements } from '../src/game/rewards';

describe('trucos', () => {
  it('detecta el código al final de lo escrito, sin importar mayúsculas ni basura previa', () => {
    expect(detectCheat('xxPasejuego')?.code).toBe('PASEJUEGO');
    expect(detectCheat('pase juego')?.code).toBe('PASEJUEGO');
    expect(detectCheat('hola')).toBeNull();
  });
  it('PASEJUEGO deja la partida como si se hubiera terminado', () => {
    const s = newSave('lia', 'T');
    detectCheat('PASEJUEGO')!.apply(s);
    expect(levels.every(l => isCleared(s, l.id))).toBe(true);
    expect(s.deck.length + s.relics.length).toBe(cards.length);
    expect(s.achievements.length).toBe(achievements.length);
    expect(Object.values(s.mastery).every(m => m.m === 1)).toBe(true);
    expect(checkAchievements(s)).toEqual([]);
  });
  it('es idempotente', () => {
    const s = newSave('lia', 'T'); const c = CHEATS[0];
    c.apply(s); const a = JSON.stringify(s); c.apply(s); expect(JSON.stringify(s)).toBe(a);
  });
  it('FOCO alterna el resaltado correcto sin modificar la partida', () => {
    const s = newSave('lia', 'T');
    const cheat = CHEATS.find(c => c.code === 'FOCO')!;
    expect(detectCheat('FOCO')).toBe(cheat);
    const before = JSON.stringify(s), activeBefore = isCorrectAnswerHighlightActive();
    cheat.apply(s);
    expect(isCorrectAnswerHighlightActive()).toBe(!activeBefore);
    expect(JSON.stringify(s)).toBe(before);
    cheat.apply(s);
    expect(isCorrectAnswerHighlightActive()).toBe(activeBefore);
  });
});
