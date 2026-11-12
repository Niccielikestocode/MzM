// @ts-nocheck
/** Cinemáticas de victoria: disolución del monstruo en píxeles, rayos, botín, confeti y estrellas. */
import { ptxt, twidth } from './stages';
import type { BattleView } from './battle';
const add = (V, life, draw) => V.fx.push({ t: 0, life, draw });
export function sunburst(V, cx, cy, life = 2600, col = '255,220,110', rays = 14) {
  add(V, life, (ctx, p) => {
    const a0 = p * 1.6, fade = p < 0.15 ? p / 0.15 : p > 0.7 ? (1 - p) / 0.3 : 1; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < rays; i++) { const a = a0 + (i / rays) * 6.2832, w = 0.1; ctx.fillStyle = `rgba(${col},${0.22 * fade})`; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 260, cy + Math.sin(a) * 260); ctx.lineTo(cx + Math.cos(a + w) * 260, cy + Math.sin(a + w) * 260); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  });
}
export function confetti(V, n = 70, life = 2600) {
  const cols = ['#ffd24d', '#ff6f7a', '#6fb7ff', '#6fcf8f', '#c8a3ff', '#ff9a3c'];
  const ps = Array.from({ length: n }, (_, i) => ({ x: Math.random() * 320, y: -10 - Math.random() * 90, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 60, ph: Math.random() * 6, w: 2 + Math.floor(Math.random() * 2), c: cols[i % cols.length] }));
  add(V, life, (ctx, p) => { const t = p * life / 1000; ctx.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1; for (const q of ps) { const x = q.x + q.vx * t + Math.sin(t * 5 + q.ph) * 8, y = q.y + q.vy * t; if (y > 190) continue; ctx.fillStyle = q.c; ctx.fillRect(Math.round(x), Math.round(y), q.w, Math.sin(t * 9 + q.ph) > 0 ? q.w + 1 : 1); } ctx.globalAlpha = 1; });
}
/** El monstruo se deshace en sus propios píxeles que suben y se desvanecen. */
export function dissolve(V) {
  const sz = V.mon.def.size, x0 = Math.max(0, Math.round(V.mon.x)), y0 = Math.max(0, Math.round(V.mon.y));
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; V.mon.draw(c);
  const w = Math.min(sz, 320 - x0), h = Math.min(sz, 180 - y0), d = c.getImageData(x0, y0, w, h).data, ps = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (d[i + 3] > 200 && (x + y) % 2 === 0) ps.push({ x: x0 + x, y: y0 + y, col: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, delay: (y / h) * 650 + Math.random() * 120, vx: (Math.random() - 0.5) * 22, vy: -(25 + Math.random() * 55) }); }
  V.monVisible = false;
  add(V, 2000, function (ctx, p) { const t = this.t; for (const q of ps) { if (t < q.delay) { ctx.fillStyle = q.col; ctx.fillRect(q.x, q.y, 2, 1); continue; } const s = (t - q.delay) / 1000; if (s > 1.1) continue; ctx.globalAlpha = Math.max(0, 1 - s / 1.1); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x + q.vx * s), Math.round(q.y + q.vy * s + 30 * s * s), 2, 2); } ctx.globalAlpha = 1; });
}
/** Monedas y destellos vuelan del monstruo al héroe. */
export function loot(V, n, sfx) {
  const [mx, my] = V.monCenter(); const [hx, hy] = V.heroCenter();
  for (let i = 0; i < n; i++) {
    const delay = i * 90, dur = 700, ox = (Math.random() - 0.5) * 30, ctl = -40 - Math.random() * 40;
    V.fx.push({ t: -delay, life: dur, done: false, draw(ctx, p) { if (this.t < 0) return; const x = mx + (hx - mx) * p + ox * (1 - p), y = my + (hy - my) * p + Math.sin(p * Math.PI) * ctl; ctx.fillStyle = '#ffd24d'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5); ctx.fillStyle = '#fff6c0'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); if (p > 0.92 && !this.done) { this.done = true; V.burst(hx, hy - 4, '#ffd24d', 4); sfx('coin'); } } });
  }
}
export function star(ctx, cx, cy, r, col, line = '#0b0714') {
  ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * 0.6283, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = line; ctx.stroke();
}
/** Fila de estrellas que aparecen una a una. */
export function stars(V, count, y, startMs, gapMs, sfx, total = 3) {
  for (let i = 0; i < total; i++) {
    const on = i < count, at = startMs + i * gapMs;
    V.fx.push({ t: -at, life: 12000, fired: false, draw(ctx, p) { if (this.t < 0) return; const s = Math.min(1, this.t / 380), bounce = s < 1 ? 1 + Math.sin(s * Math.PI) * 0.5 : 1, x = 160 + (i - (total - 1) / 2) * 44; if (!this.fired) { this.fired = true; if (on) { sfx(i === total - 1 ? 'crit' : 'coin'); V.burst(x, y, '#ffd24d', 14); } } if (on) { ctx.save(); ctx.translate(x, y); ctx.scale(s * bounce, s * bounce); star(ctx, 0, 0, 17, '#ffd24d'); ctx.restore(); } else { ctx.globalAlpha = 0.5; star(ctx, x, y, 15, '#2a2347'); ctx.globalAlpha = 1; } } });
  }
}
/** Rótulo grande persistente con entrada deslizante. */
export function title(V, text, y, col, startMs, sc = 4) {
  V.fx.push({ t: -startMs, life: 14000, draw(ctx) { if (this.t < 0) return; const p = Math.min(1, this.t / 350), w = twidth(text, sc), x = 160 - w / 2, yy = y - (1 - p) * 20; ctx.globalAlpha = p; ptxt(ctx, text, x + 1, yy + 1, '#000', sc); ptxt(ctx, text, x, yy + Math.sin(this.t / 400) * 1.2, col, sc); ctx.globalAlpha = 1; } });
}
/** Secuencia completa al derrotar al monstruo. Devuelve su duración en ms. */
export function victorySequence(V: BattleView, o: { combo: number; boss: boolean; sfx: (n: string) => void }): number {
  const [mx, my] = V.monCenter(), boss = o.boss;
  V.flash = 0; V.slow = 0.18; V.shake = 500; V.zoomPulse(boss ? 0.14 : 0.09); o.sfx('explode'); add(V, 260, (ctx, p) => { ctx.globalAlpha = 0.85 * (1 - p); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 320, 180); ctx.globalAlpha = 1; });
  setTimeout(() => { V.slow = 1; dissolve(V); sunburst(V, mx, my, boss ? 3600 : 2600); o.sfx('swell'); if (boss) V.shake = 700; }, 420);
  setTimeout(() => loot(V, boss ? 12 : 6, o.sfx), 800);
  setTimeout(() => { V.hero.play('win'); o.sfx('win'); confetti(V, boss ? 120 : 70, 2800); V.banner(boss ? '¡PARCIAL SUPERADO!' : '¡VICTORIA!', '#ffd24d', 46); }, 1100);
  if (o.combo >= 3) setTimeout(() => { V.bigNum('COMBO MÁX ' + o.combo, 160, 104, '#ff9a3c', true); o.sfx('combo2'); }, 1700);
  return boss ? 3600 : 2700;
}
