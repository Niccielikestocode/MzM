import { h, ticker } from './dom';
import type { CardDef } from '../core/types';
import { WORLD_COLOR, topicById } from '../core/data';
import '../../tools/cardart.js';

const CA = (window as any).CardArt;
export const TYPECOL: Record<string, string> = { ataque: '#d9434f', defensa: '#5f8bff', utilidad: '#6fcf8f', riesgo: '#e0b84c', reliquia: '#b04fd1' };
export const TYPENAME: Record<string, string> = { ataque: 'Ataque', defensa: 'Defensa', utilidad: 'Utilidad', riesgo: 'Riesgo', reliquia: 'Reliquia' };
export const RARNAME: Record<string, string> = { comun: 'Común', rara: 'Rara', epica: 'Épica', legendaria: 'Legendaria' };
const colCache: Record<string, number[]> = {};
const rgb = (hx: string) => (colCache[hx] ??= [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)]);
export function blit(cv: HTMLCanvasElement, px: (string | null)[], w: number, hgt: number): void {
  const ctx = cv.getContext('2d')!, im = ctx.createImageData(w, hgt), d = im.data;
  for (let i = 0; i < w * hgt; i++) { const v = px[i]; if (v) { const c = rgb(v); d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; } }
  ctx.putImageData(im, 0, 0);
}
/** Ilustración animada (64×40, 8 cuadros). */
export function artCanvas(c: CardDef, phase = 0): HTMLCanvasElement {
  const cv = h('canvas', { width: 64, height: 40, class: 'artcv' }); let t = phase, acc = 0, vis = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; }, { rootMargin: '60px' }).observe(cv);
  blit(cv, CA.art(c, t), 64, 40);
  let mounted = false;
  const off = ticker.add(dt => {
    if (cv.isConnected) mounted = true;
    else if (mounted) { off(); return; }
    if (!vis) return;
    acc += dt;
    if (acc >= 125) { acc = 0; t = (t + 1) % 8; blit(cv, CA.art(c, t), 64, 40); }
  });
  return cv;
}
export function unlockText(c: CardDef): string {
  if (c.unlock.type === 'start') return 'Mazo inicial';
  if (c.unlock.type === 'mastery') return 'Domina ' + (topicById[c.unlock.topic!]?.name ?? '');
  return 'Botín de jefe';
}
/** Carta completa con marco y holograma (galería). */
export function fullCard(c: CardDef, owned = true): HTMLElement {
  const cost = c.rarity === 'comun' ? 1 : c.rarity === 'rara' ? 2 : 3;
  const face = h('div', { class: 'gc-face' });
  const cv = h('canvas', { width: 80, height: 112, class: 'gc-cv', 'aria-hidden': 'true' }); face.append(cv);
  face.append(
    h('span', { class: 'gc-cost' }, `⚡${cost}`),
    h('div', { class: 'gc-name' }, c.name),
    h('div', { class: 'gc-fx' }, c.effect),
    h('div', { class: 'gc-type' }, `${TYPENAME[c.type]} · ${RARNAME[c.rarity]}`)
  );
  const el = h('article', { class: `gcard r-${c.rarity}${owned ? '' : ' locked'}`, style: { '--c': TYPECOL[c.type] } as any }, h('div', { class: 'gc-tilt' }, face), h('div', { class: 'gc-un' }, owned ? 'En tu colección' : unlockText(c)));
  let t = 0, acc = Math.random() * 100, vis = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(el);
  blit(cv, CA.composite(c, t), 80, 112);
  let mounted = false;
  const off = ticker.add(dt => {
    if (cv.isConnected) mounted = true;
    else if (mounted) { off(); return; }
    if (!vis) return;
    acc += dt;
    if (acc >= 125) { acc = 0; t = (t + 1) % 8; blit(cv, CA.composite(c, t), 80, 112); }
  });
  return el;
}
/** Carta compacta de la mano. */
export function handCard(c: CardDef, key: string, onPlay: () => void, aid = ''): HTMLButtonElement {
  return h('button', { class: 'handcard', style: { '--c': TYPECOL[c.type] } as any, onclick: onPlay, 'aria-label': `${c.name}. ${c.effect}` },
    h('span', { class: 'hc-key' }, key), artCanvas(c, Math.floor(Math.random() * 8)),
    h('b', { class: 'hc-name' }, c.name), h('span', { class: 'hc-type' }, `${TYPENAME[c.type]}${c.rarity !== 'comun' ? ' · ' + RARNAME[c.rarity] : ''}`),
    h('span', { class: 'hc-fx' }, c.effect), aid ? h('span', { class: 'hc-aid' }, aid) : null);
}
void WORLD_COLOR;
