import type { Graph } from '../core/types';
import '../../tools/cardart.js';

const NF: Record<string, string[]> = (window as any).CardArt?.NF ?? {};
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, col: string): void {
  for (const ch of s) { const rows = NF[ch]; if (!rows) { x += 4; continue; } for (let j = 0; j < 5; j++) for (let i = 0; i < rows[0].length; i++) if (rows[j][i] === '#') { ctx.fillStyle = col; ctx.fillRect(x + i, y + j, 1, 1); } x += rows[0].length + 1; }
}
/** Dibuja funciones en un plano con cuadrícula (160×100 píxeles lógicos). */
export function drawGraph(cv: HTMLCanvasElement, g: Graph): void {
  const W = 160, H = 100; cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!, px = (x: number) => ((x - g.xr[0]) / (g.xr[1] - g.xr[0])) * (W - 8) + 4, py = (y: number) => H - 4 - ((y - g.yr[0]) / (g.yr[1] - g.yr[0])) * (H - 8);
  ctx.fillStyle = '#14101f'; ctx.fillRect(0, 0, W, H);
  for (let x = Math.ceil(g.xr[0]); x <= g.xr[1]; x++) { ctx.fillStyle = x === 0 ? '#a99fc0' : '#3a3158'; ctx.fillRect(Math.round(px(x)), 0, 1, H); if (x !== 0 && x % 2 === 0 && g.xr[1] - g.xr[0] <= 14) text(ctx, String(x).replace('-', '-'), Math.round(px(x)) - 2, Math.round(py(0)) + 2, '#a99fc0'); }
  for (let y = Math.ceil(g.yr[0]); y <= g.yr[1]; y++) { ctx.fillStyle = y === 0 ? '#a99fc0' : '#3a3158'; ctx.fillRect(0, Math.round(py(y)), W, 1); if (y !== 0 && y % 2 === 0) text(ctx, String(y), Math.round(px(0)) + 3, Math.round(py(y)) - 2, '#a99fc0'); }
  const cols = ['#e86ab5', '#6fb7ff'];
  g.fns.forEach((f, k) => {
    for (let X = 0; X < W; X++) {
      const x = g.xr[0] + (X / (W - 8)) * (g.xr[1] - g.xr[0]) - 0.2;
      let y = 0;
      if (f.t === 'lin') y = f.m * x + f.b; else if (f.t === 'quad') y = f.a * x * x + f.b * x + f.c; else y = f.A * Math.sin((2 * Math.PI * (x - (f.ph ?? 0))) / f.T) + (f.k ?? 0);
      const Y = py(y); if (Y < 0 || Y > H) continue;
      ctx.fillStyle = cols[k % 2]; ctx.fillRect(X, Math.round(Y) - 1, 2, 2);
    }
  });
  g.pts?.forEach(p => { ctx.fillStyle = '#f2c14e'; ctx.fillRect(Math.round(px(p.x)) - 2, Math.round(py(p.y)) - 2, 5, 5); if (p.label) text(ctx, p.label, Math.round(px(p.x)) + 5, Math.round(py(p.y)) - 8, '#f2c14e'); });
}
export function drawNumberLine(cv: HTMLCanvasElement, nl: { min: number; max: number; marks: number[] }): void {
  const W = 160, H = 40; cv.width = W; cv.height = H; const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#14101f'; ctx.fillRect(0, 0, W, H);
  const px = (v: number) => 10 + ((v - nl.min) / (nl.max - nl.min)) * (W - 20);
  ctx.fillStyle = '#a99fc0'; ctx.fillRect(8, 22, W - 16, 2);
  for (let i = 0; i <= 4; i++) { const x = Math.round(px(nl.min + (i / 4) * (nl.max - nl.min))); ctx.fillStyle = i % 4 === 0 ? '#f3ead8' : '#a99fc0'; ctx.fillRect(x, i % 4 === 0 ? 16 : 18, 1, i % 4 === 0 ? 14 : 10); }
  text(ctx, String(nl.min), Math.round(px(nl.min)) - 2, 32, '#f3ead8'); text(ctx, String(nl.max), Math.round(px(nl.max)) - 2, 32, '#f3ead8');
  nl.marks.forEach(v => { const x = Math.round(px(v)); ctx.fillStyle = '#f2c14e'; for (let k = 0; k < 6; k++) ctx.fillRect(x - k, 6 + k, 1 + 2 * k, 1); ctx.fillStyle = '#14101f'; ctx.fillRect(x, 13, 1, 1); text(ctx, 'P', x - 1, 0, '#f2c14e'); });
}
