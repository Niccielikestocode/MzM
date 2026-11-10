// @ts-nocheck
/* Efectos de combate procedurales: golpes, proyectiles, hechizos, escudos, curas, aura, explosión. */
import './font';
import { R, disc } from './scene';
import { ptxt, twidth, pline, bolt } from './stages';
import type { BattleView } from './battle';

import { CARD_FX, fxFor } from './cardfx';
import type { CardFx, FxKind } from './cardfx';
export { CARD_FX, fxFor };
export type { CardFx, FxKind };
const ease = (p: number) => 1 - Math.pow(1 - p, 3);
const add = (V: BattleView, life: number, draw: (ctx: CanvasRenderingContext2D, p: number, t: number) => void) => V.fx.push({ t: 0, life, draw: (ctx: any, p: number) => draw(ctx, p, 0) });
function ring(ctx, col, cx, cy, r, thick = 2, sq = 1) { const n = Math.max(12, r * 3); for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; R(ctx, col, cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq, thick, thick); } }
function sparks(V, x, y, col, n, spread = 1.4, up = 0.5, life = 600) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = spread * (0.3 + Math.random()); V.fx.push({ t: 0, life: life * (0.6 + Math.random() * 0.6), vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, x, y, col, draw(ctx, p) { this.x += this.vx; this.y += this.vy; this.vy += 0.06; ctx.globalAlpha = 1 - p; R(ctx, this.col, this.x, this.y, p < .5 ? 2 : 1, p < .5 ? 2 : 1); ctx.globalAlpha = 1; } }); }
}
function flashScreen(V, col, a = 0.5, life = 160) { add(V, life, (ctx, p) => { ctx.globalAlpha = a * (1 - p); ctx.fillStyle = col; ctx.fillRect(0, 0, 320, 180); ctx.globalAlpha = 1; }); }

/** Dibuja el hechizo; devuelve los ms hasta el impacto y llama onHit() entonces. */
export function cast(V: BattleView, fx: CardFx, onHit: () => void): number {
  const [hx, hy] = V.heroCenter(), [mx, my] = V.monCenter(), { col, col2 } = fx;
  const impact = (ms: number) => { setTimeout(onHit, ms); return ms; };
  switch (fx.kind) {
    case 'slash': {
      const dash = V.dash(V.hero, V.mon.x - 26, 130);
      return impact(dash + 40, setTimeout(() => {
        for (let k = 0; k < 3; k++) setTimeout(() => add(V, 240, (ctx, p) => { const o = (k - 1) * 9, L = 38 * ease(Math.min(1, p * 2)); const x0 = mx - 20 + o, y0 = my - 26 + k * 3; for (const [c, s] of [[col2, 5], [col, 3]]) pline(ctx, c, x0, y0, x0 + L * 0.8, y0 + L, s); ctx.globalAlpha = 1; }), k * 70);
        sparks(V, mx, my, col2, 14, 1.8);
      }, dash));
    }
    case 'pierce': {
      const dash = V.dash(V.hero, V.mon.x - 30, 100);
      setTimeout(() => add(V, 260, (ctx, p) => { const L = (mx - hx) * Math.min(1, p * 3); pline(ctx, col2, hx + 10, hy, hx + 10 + L, my, 5); pline(ctx, col, hx + 10, hy, hx + 10 + L, my, 2); }), dash);
      setTimeout(() => sparks(V, mx, my, col, 16, 2), dash + 90);
      return impact(dash + 110);
    }
    case 'arrow': case 'fire': case 'meteor': {
      const big = fx.kind === 'meteor', fire = fx.kind === 'fire', T = big ? 520 : 340;
      const sx = big ? mx + 60 : hx + 14, sy = big ? -20 : hy - 4;
      V.hero.play('attack'); const trail = [];
      add(V, T, (ctx, p) => {
        const e = fx.kind === 'arrow' ? p : p * p, x = sx + (mx - sx) * e, y = sy + (my - sy) * e - (big ? 0 : Math.sin(p * Math.PI) * 26);
        trail.push([x, y]); if (trail.length > 10) trail.shift();
        trail.forEach(([tx, ty], i) => { ctx.globalAlpha = i / trail.length * 0.8; R(ctx, i % 2 ? col : col2, tx - 1, ty - 1, big ? 5 : 3, big ? 5 : 3); }); ctx.globalAlpha = 1;
        if (big) { disc(ctx, col, Math.round(x), Math.round(y), 6); disc(ctx, col2, Math.round(x), Math.round(y), 3); } else if (fire) { disc(ctx, col, Math.round(x), Math.round(y), 4); disc(ctx, col2, Math.round(x), Math.round(y), 2); } else { R(ctx, col2, x - 4, y - 1, 9, 3); R(ctx, col, x + 4, y - 2, 3, 5); }
      });
      setTimeout(() => {
        sparks(V, mx, my, col, big ? 40 : 22, big ? 3.2 : 2.2); sparks(V, mx, my, col2, 12, 1.6);
        add(V, 360, (ctx, p) => { ring(ctx, col2, mx, my, 6 + 26 * ease(p) * (big ? 1.4 : 1), 2, 0.7); ctx.globalAlpha = 1; });
        if (big) { V.zoomPulse(0.06); flashScreen(V, '#ffffff', 0.55); } if (fire) V.tintMon(col, 900);
      }, T);
      return impact(T);
    }
    case 'bolt': {
      V.hero.play('attack');
      add(V, 220, (ctx, p) => { const r = 3 + p * 5; disc(ctx, col, hx + 14, hy - 4, Math.round(r)); disc(ctx, col2, hx + 14, hy - 4, 2); });
      setTimeout(() => add(V, 280, (ctx, p) => { if (Math.floor(p * 14) % 2 === 0 || p < .5) bolt(ctx, hx + 14, hy - 4, mx, my, col); disc(ctx, col2, mx, my, 5 * (1 - p) + 1); }), 220);
      setTimeout(() => { sparks(V, mx, my, col, 24, 2.4); flashScreen(V, col, 0.3, 140); }, 260);
      return impact(260);
    }
    case 'ice': {
      for (let i = 0; i < 7; i++) setTimeout(() => { const x = mx - 22 + i * 7 + Math.random() * 4; add(V, 260, (ctx, p) => { const y = -10 + (my + 6 + (i % 3) * 3 + 10) * p * p; R(ctx, col2, x, y, 2, 7); R(ctx, col, x - 1, y + 6, 4, 3); }); }, i * 40);
      setTimeout(() => { sparks(V, mx, my, col, 28, 2); V.tintMon(col, 1400); add(V, 700, (ctx, p) => { ring(ctx, col, mx, my + 12, 8 + 18 * p, 2, 0.35); ctx.globalAlpha = 1; }); }, 360);
      return impact(340);
    }
    case 'wave': {
      for (let k = 0; k < 3; k++) setTimeout(() => add(V, 420, (ctx, p) => { const x = hx + 20 + (mx - hx - 16) * ease(p); ctx.globalAlpha = 1 - p * .6; for (let j = -10; j <= 10; j++) R(ctx, k % 2 ? col2 : col, x + Math.abs(j) * 0.5, 135 + j * 1.2 + Math.sin(p * 20 + j) * 2, 2, 2); ctx.globalAlpha = 1; }), k * 110);
      setTimeout(() => { sparks(V, mx, my + 10, col, 22, 2.4); V.zoomPulse(0.03); }, 520);
      return impact(520);
    }
    case 'nova': {
      V.hero.play('attack'); sfxHold();
      add(V, 520, (ctx, p) => { ring(ctx, col, hx, hy, 4 + 30 * ease(p), 2, 1); for (let a = 0; a < 12; a++) { const an = a / 12 * 6.283 + p * 2, r0 = 10 + 28 * ease(p); pline(ctx, col2, hx + Math.cos(an) * r0, hy + Math.sin(an) * r0, hx + Math.cos(an) * (r0 + 6), hy + Math.sin(an) * (r0 + 6), 2); } });
      setTimeout(() => { sparks(V, mx, my, col, 30, 2.6); sparks(V, mx, my, col2, 14, 2); flashScreen(V, col2, 0.35); V.zoomPulse(0.05); }, 480);
      return impact(500);
    }
    case 'drain': {
      V.hero.play('attack');
      for (let i = 0; i < 14; i++) setTimeout(() => add(V, 480, (ctx, p) => { const e = ease(p), x = mx + (hx - mx) * e, y = my + (hy - my) * e - Math.sin(p * 3.14) * 16 * (i % 2 ? 1 : -1); R(ctx, i % 2 ? col : col2, x, y, 2, 2); }), 200 + i * 30);
      setTimeout(() => { sparks(V, mx, my, col, 18, 1.8); flashScreen(V, col, 0.18, 120); }, 120);
      return impact(150);
    }
    case 'shield': {
      add(V, 900, (ctx, p) => { const r = 16 + 3 * Math.sin(p * 18); ctx.globalAlpha = p < .15 ? p / .15 : 1 - Math.max(0, (p - .6) / .4); ring(ctx, col, hx, hy, r, 2, 1.15); ring(ctx, col2, hx, hy, r - 3, 1, 1.15); for (let a = 0; a < 6; a++) { const an = a / 6 * 6.283 + p * 4; R(ctx, col2, hx + Math.cos(an) * r, hy + Math.sin(an) * r * 1.15, 3, 3); } ctx.globalAlpha = 1; });
      sparks(V, hx, hy, col, 16, 1.2, 0.2); return impact(120);
    }
    case 'heal': {
      for (let i = 0; i < 10; i++) setTimeout(() => { const x = hx - 14 + Math.random() * 28; add(V, 800, (ctx, p) => { const y = hy + 14 - 40 * p; ctx.globalAlpha = 1 - p; R(ctx, col, x - 1, y - 3, 2, 7); R(ctx, col, x - 3, y - 1, 7, 2); R(ctx, col2, x, y - 1, 1, 3); ctx.globalAlpha = 1; }); }, i * 55);
      add(V, 700, (ctx, p) => { ring(ctx, col, hx, hy + 12, 6 + 14 * p, 2, 0.4); ctx.globalAlpha = 1; });
      return impact(100);
    }
    case 'time': {
      add(V, 800, (ctx, p) => { ring(ctx, col, hx, hy, 8 + 10 * p, 1, 1); for (let a = 0; a < 2; a++) { const an = p * 12 * (a ? -1 : 1); pline(ctx, a ? col2 : col, hx, hy, hx + Math.cos(an) * 10, hy + Math.sin(an) * 10, 1); } });
      return impact(180);
    }
    default: { // rune
      add(V, 800, (ctx, p) => { const r = 10 + 12 * ease(p); ctx.globalAlpha = 1 - p * .8; ring(ctx, col, hx, hy, r, 2, 1); for (let a = 0; a < 4; a++) { const an = a / 4 * 6.283 + p * 5; R(ctx, col2, hx + Math.cos(an) * r - 1, hy + Math.sin(an) * r - 1, 3, 3); } ctx.globalAlpha = 1; });
      for (let i = 0; i < 8; i++) setTimeout(() => add(V, 700, (ctx, p) => { const x = hx - 12 + i * 3.4; R(ctx, col, x, hy + 14 - 34 * p, 1, 3 + i % 3); }), i * 40);
      return impact(150);
    }
  }
}
function sfxHold() { /* el sonido lo gestiona run.ts */ }

export function banner(V: BattleView, text: string, col = '#ffd24d', y = 36): void {
  add(V, 1100, (ctx, p) => { const sc = p < .15 ? 2 + 2 * (1 - p / .15) : 3; const w = twidth(text, sc); ctx.globalAlpha = p > .7 ? 1 - (p - .7) / .3 : 1; ptxt(ctx, text, 160 - w / 2 + 1, y + 1 - p * 6, '#000000', sc); ptxt(ctx, text, 160 - w / 2, y - p * 6, col, sc); ctx.globalAlpha = 1; });
}
export function bigNumber(V: BattleView, str: string, x: number, y: number, col: string, crit = false): void {
  const sc = crit ? 4 : 3; add(V, 950, (ctx, p) => { const jump = Math.sin(Math.min(1, p * 2.2) * Math.PI) * 14, w = twidth(str, sc); ctx.globalAlpha = p > .75 ? 1 - (p - .75) / .25 : 1; ptxt(ctx, str, x - w / 2 + 1, y - jump - 26 * p + 1, '#000', sc); ptxt(ctx, str, x - w / 2, y - jump - 26 * p, col, sc); ctx.globalAlpha = 1; });
}
export function telegraph(V: BattleView, col = '#ff3c5a', ms = 700): void {
  const [mx, my] = V.monCenter();
  add(V, ms, (ctx, p) => { const pulse = 0.5 + 0.5 * Math.sin(p * 30); ctx.globalAlpha = 0.25 + 0.35 * pulse; disc(ctx, col, Math.round(mx), Math.round(my + 6), Math.round(16 + 8 * p)); ctx.globalAlpha = 1; ring(ctx, col, mx, my + 6, 20 + 6 * pulse, 2, 1); R(ctx, '#ffe08a', mx - 1, my - 34 - Math.round(pulse * 2), 3, 8); R(ctx, '#ffe08a', mx - 1, my - 24 - Math.round(pulse * 2), 3, 3); });
}
export function monsterDeath(V: BattleView): void {
  const [mx, my] = V.monCenter(); const cols = Object.values(V.mon.def.colors ?? {}).filter(v => typeof v === 'string' && v[0] === '#') as string[];
  const use = cols.length ? cols : ['#ffffff', '#ffd24d'];
  for (let i = 0; i < 46; i++) sparks(V, mx + (Math.random() - .5) * 16, my + (Math.random() - .5) * 18, use[i % use.length], 1, 3.2, 1.2, 1100);
  add(V, 600, (ctx, p) => { ring(ctx, '#ffffff', mx, my, 6 + 50 * ease(p), 2, 0.8); ctx.globalAlpha = 1; });
  flashScreen(V, '#ffffff', 0.6, 260); V.zoomPulse(0.07); V.shake = 380;
}
export function hurtVignette(V: BattleView, col = '#ff1f3d'): void { add(V, 380, (ctx, p) => { const a = 0.5 * (1 - p); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, 320, 10); ctx.fillRect(0, 170, 320, 10); ctx.fillRect(0, 0, 10, 180); ctx.fillRect(310, 0, 10, 180); ctx.globalAlpha = a * 0.35; ctx.fillRect(0, 0, 320, 180); ctx.globalAlpha = 1; }); }
export function slashHero(V: BattleView): void { /* garra del monstruo sobre el héroe */ const [hx, hy] = V.heroCenter(); for (let k = 0; k < 3; k++) setTimeout(() => add(V, 220, (ctx, p) => { const L = 30 * ease(Math.min(1, p * 2)), x0 = hx - 12 + k * 8, y0 = hy - 20; pline(ctx, '#ffffff', x0, y0, x0 + L * 0.6, y0 + L, 3); pline(ctx, '#ff3c5a', x0, y0, x0 + L * 0.6, y0 + L, 1); }), k * 60); sparks(V, hx, hy, '#ff9aa2', 14, 1.8); }
export { sparks, flashScreen };
