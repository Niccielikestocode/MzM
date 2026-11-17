import { ActorClass as Actor, SGX } from '../gfx/scene';
import { spriteDefs } from '../core/data';

type Child = Node | string | number | null | undefined | false | Child[];
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; else if (k in el && k !== 'list') (el as any)[k] = v; else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c: Child): void => { if (Array.isArray(c)) c.forEach(add); else if (c != null && c !== false) el.append(c instanceof Node ? c : String(c)); };
  kids.forEach(add);
  return el;
}
export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;

/** Un solo bucle de animación; cada pantalla registra sus tareas y se limpian al cambiar. */
export class Ticker {
  private fns = new Set<(dt: number) => void>(); private last = 0; private raf = 0;
  constructor() { const loop = (ts: number) => { const dt = Math.min(100, ts - (this.last || ts)); this.last = ts; if (!document.hidden) this.fns.forEach(f => f(dt)); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  add(fn: (dt: number) => void): () => void { this.fns.add(fn); return () => this.fns.delete(fn); }
  clear(): void { this.fns.clear(); }
}
export const ticker = new Ticker();

/** Canvas con un sprite animado. */
export function spriteCanvas(def: any, scale = 3, anim = 'idle', opts: { vary?: boolean } = {}): HTMLCanvasElement {
  const size = def.size, cv = document.createElement('canvas'); cv.width = size * scale; cv.height = size * scale; cv.className = 'sprite';
  const a = new Actor({ ...def }, 0, 0, scale), ctx = cv.getContext('2d')!;
  a.anim = anim; if (opts.vary) a.t = Math.floor(Math.random() * 4);
  const draw = () => { ctx.clearRect(0, 0, cv.width, cv.height); a.draw(ctx); };
  draw();
  ticker.add(dt => { a.step(dt); if (a.dirty) { a.dirty = false; draw(); } });
  return cv;
}
export function glyph(name: string, scale = 3, color = '#f3ead8'): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = cv.height = 5 * scale + 2; cv.className = 'glyph';
  SGX.drawGlyph(cv.getContext('2d')!, name, 1, 1, scale, color); return cv;
}
export const heroSprite = (hero: any) => ({ ...spriteDefs[hero.id], _id: hero.id });
export const monsterSprite = (m: any) => ({ ...spriteDefs[m.id], _id: m.id });
export const pct = (n: number): string => Math.round(n * 100) + ' %';
