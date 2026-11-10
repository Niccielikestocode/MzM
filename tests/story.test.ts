import { describe, it, expect } from 'vitest';
import { CINEMATICS, CINE_BY_ID, DIARY, POST_STORY, PRE_STORY } from '../src/core/story';
import { levels, spriteDefs } from '../src/core/data';
import { cards } from '../src/core/data';
import { CARD_FX } from '../src/gfx/cardfx';

describe('historia', () => {
  it('todas las referencias de cinemáticas existen', () => {
    const ids = new Set(CINEMATICS.map(c => c.id)); expect(ids.size).toBe(CINEMATICS.length);
    Object.entries(PRE_STORY).forEach(([lv, list]) => { expect(levels.some(l => l.id === lv)).toBe(true); list.forEach(id => expect(ids.has(id)).toBe(true)); });
    Object.entries(POST_STORY).forEach(([lv, id]) => { expect(levels.some(l => l.id === lv)).toBe(true); expect(ids.has(id)).toBe(true); });
  });
  it('los personajes de las escenas tienen sprite y cada beat tiene texto', () => {
    CINEMATICS.forEach(c => c.beats.forEach(b => { expect(b.line.length).toBeGreaterThan(2); (b.cast ?? []).forEach(k => { if (k.id !== 'hero' && k.id !== 'mentor') expect(spriteDefs[k.id], k.id).toBeTruthy(); }); }));
    expect(CINE_BY_ID.prologo.beats.length).toBeGreaterThan(5);
  });
  it('el diario cubre las zonas principales', () => { Object.keys(DIARY).forEach(id => expect(levels.some(l => l.id === id)).toBe(true)); expect(Object.keys(DIARY).length).toBeGreaterThanOrEqual(19); });
  it('cada carta tiene efecto visual propio', () => { cards.filter(c => c.type !== 'reliquia').forEach(c => expect(CARD_FX[c.id], c.id).toBeTruthy()); });
});
