/** Dibujos didácticos: tartas de fracciones, barras, planos y rectas. Todo en canvas, sin imágenes. */
import type { Question } from '../core/types';
import { Val, valNum, textFractions, textPoints, textPercents, fmt } from '../game/vis';
const BG = '#120d1e', GRID = '#3a3160', AX = '#9a90b8', INK = '#f3ead8';
type Ctx = CanvasRenderingContext2D;
export function mkCanvas(w: number, h: number, cls = 'vis-cv'): [HTMLCanvasElement, Ctx] { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.className = cls; const c = cv.getContext('2d')!; c.imageSmoothingEnabled = false; return [cv, c]; }

export function drawPie(c: Ctx, cx: number, cy: number, r: number, n: number, d: number, col: string): void {
  const whole = Math.floor(Math.abs(n) / d), rest = Math.abs(n) % d;
  c.lineWidth = 2; c.strokeStyle = '#0b0714';
  for (let i = 0; i < d; i++) {
    const a0 = -Math.PI / 2 + (i / d) * 6.2832, a1 = -Math.PI / 2 + ((i + 1) / d) * 6.2832;
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, a0, a1); c.closePath(); c.fillStyle = whole > 0 || i < rest ? col : '#2a2347'; c.fill(); c.stroke();
  }
  if (whole > 1) { c.fillStyle = INK; c.font = `bold ${Math.round(r * 0.7)}px monospace`; c.textAlign = 'center'; c.fillText('×' + whole, cx, cy + r * 0.25); }
}
export function drawBar(c: Ctx, x: number, y: number, w: number, h: number, frac: number, col: string, label?: string): void {
  c.fillStyle = '#2a2347'; c.fillRect(x, y, w, h); c.fillStyle = col; c.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  c.strokeStyle = '#0b0714'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
  c.strokeStyle = '#0b0714'; c.lineWidth = 1; for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(x + (w * i) / 10, y); c.lineTo(x + (w * i) / 10, y + h * 0.35); c.stroke(); }
  if (label) { c.fillStyle = INK; c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillText(label, x + w / 2, y + h / 2 + 4); }
}
/** Plano cartesiano pequeño que ajusta su escala a los puntos dados. */
export function drawPlane(c: Ctx, x0: number, y0: number, w: number, h: number, pts: { x: number; y: number; col?: string; label?: string }[], opts: { segments?: boolean; sel?: number } = {}): { sx: (v: number) => number; sy: (v: number) => number; ux: (px: number) => number; uy: (py: number) => number } {
  let xs = pts.map(p => p.x).concat(0), ys = pts.map(p => p.y).concat(0);
  const pad = 1.5, lx = Math.floor(Math.min(...xs) - pad), hx = Math.ceil(Math.max(...xs) + pad), ly = Math.floor(Math.min(...ys) - pad), hy = Math.ceil(Math.max(...ys) + pad);
  const span = Math.max(hx - lx, (hy - ly) * (w / h)), scale = w / span, ox = x0 + (w - (hx - lx) * scale) / 2, oy = y0 + (h + (hy - ly) * scale) / 2 - (hy - ly) * scale * 0 ;
  const sx = (v: number): number => ox + (v - lx) * scale, sy = (v: number): number => y0 + h / 2 + ((ly + hy) / 2 - v) * scale;
  void oy; c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip(); c.fillStyle = BG; c.fillRect(x0, y0, w, h);
  c.lineWidth = 1; c.strokeStyle = GRID; const step = Math.max(1, Math.round((hx - lx) / 12));
  for (let gx = Math.ceil(lx / step) * step; gx <= hx; gx += step) { c.beginPath(); c.moveTo(sx(gx) + 0.5, y0); c.lineTo(sx(gx) + 0.5, y0 + h); c.stroke(); }
  for (let gy = Math.ceil(ly / step) * step; gy <= hy; gy += step) { c.beginPath(); c.moveTo(x0, sy(gy) + 0.5); c.lineTo(x0 + w, sy(gy) + 0.5); c.stroke(); }
  c.strokeStyle = AX; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, sy(0)); c.lineTo(x0 + w, sy(0)); c.moveTo(sx(0), y0); c.lineTo(sx(0), y0 + h); c.stroke();
  c.fillStyle = AX; c.font = '9px monospace'; c.textAlign = 'center';
  for (let gx = Math.ceil(lx / step) * step; gx <= hx; gx += step) if (gx) c.fillText(String(gx), sx(gx), sy(0) + 10);
  c.textAlign = 'right'; for (let gy = Math.ceil(ly / step) * step; gy <= hy; gy += step) if (gy) c.fillText(String(gy), sx(0) - 3, sy(gy) + 3);
  if (opts.segments && pts.length > 1) { c.strokeStyle = '#ffd24d'; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(sx(p.x), sy(p.y)) : c.moveTo(sx(p.x), sy(p.y)))); if (pts.length > 2) c.closePath(); c.stroke(); c.setLineDash([]); }
  pts.forEach((p, i) => { c.fillStyle = p.col ?? '#ffd24d'; c.beginPath(); c.arc(sx(p.x), sy(p.y), opts.sel === i ? 6 : 4.5, 0, 6.3); c.fill(); c.strokeStyle = '#0b0714'; c.lineWidth = 2; c.stroke(); if (p.label) { c.fillStyle = INK; c.textAlign = 'left'; c.font = 'bold 10px monospace'; c.fillText(p.label, sx(p.x) + 7, sy(p.y) - 6); } });
  c.restore(); c.strokeStyle = '#4a3f6c'; c.lineWidth = 2; c.strokeRect(x0, y0, w, h);
  return { sx, sy, ux: px => lx + (px - ox) / scale, uy: py => (ly + hy) / 2 - (py - (y0 + h / 2)) / scale };
}
export function drawLine(c: Ctx, x0: number, y: number, w: number, lo: number, hi: number, marks: { v: number; col: string; label?: string }[] = [], sel?: number): (v: number) => number {
  const sx = (v: number): number => x0 + ((v - lo) / (hi - lo || 1)) * w;
  c.strokeStyle = AX; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke();
  const raw = (hi - lo) / 8, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), step = [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw) ?? mag;
  c.fillStyle = AX; c.font = '10px monospace'; c.textAlign = 'center'; c.lineWidth = 2;
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) { c.beginPath(); c.moveTo(sx(v), y - 5); c.lineTo(sx(v), y + 5); c.stroke(); c.fillText(fmt(v), sx(v), y + 18); }
  marks.forEach((m, i) => { c.fillStyle = m.col; c.beginPath(); c.arc(sx(m.v), y, sel === i ? 7 : 5, 0, 6.3); c.fill(); c.strokeStyle = '#0b0714'; c.stroke(); if (m.label) { c.fillStyle = INK; c.fillText(m.label, sx(m.v), y - 12); } });
  return sx;
}

/** Pictograma de una opción (para la leyenda). */
export function optionPicto(v: Val | null, all: Val[], col: string): HTMLCanvasElement | null {
  if (!v) return null; const [cv, c] = mkCanvas(84, 48);
  if (v.k === 'frac' && v.d <= 12 && Math.abs(v.n) <= 3 * v.d) drawPie(c, 24, 24, 20, v.n, v.d, col), drawBar(c, 50, 18, 30, 12, Math.min(1, Math.abs(v.n / v.d)), col);
  else if (v.k === 'pct' || (v.k === 'num' && v.v >= 0 && v.v <= 1 && all.every(a => a.k !== 'frac'))) drawBar(c, 6, 14, 72, 20, v.k === 'pct' ? v.v / 100 : v.v, col, v.k === 'pct' ? fmt(v.v) + ' %' : fmt(v.v));
  else if (v.k === 'pt') return null;
  else if (v.k === 'frac' || v.k === 'num') { const ns = all.filter(a => a.k !== 'pt').map(valNum); const lo = Math.min(...ns), hi = Math.max(...ns), pad = (hi - lo) * 0.1 || 1; const sx = drawLine(c, 8, 28, 68, lo - pad, hi + pad); c.fillStyle = col; c.beginPath(); c.moveTo(sx(valNum(v)), 24); c.lineTo(sx(valNum(v)) - 6, 8); c.lineTo(sx(valNum(v)) + 6, 8); c.closePath(); c.fill(); }
  else return null;
  return cv;
}
/** Dibujo del enunciado: fracciones como tartas, porcentajes como barras o puntos sobre un plano. */
export function questionVisual(q: Question): HTMLCanvasElement | null {
  if (q.graph || q.numberLine || q.stage) return null;
  const fr = textFractions(q.text), pts = textPoints(q.text), pc = textPercents(q.text);
  if (pts.length >= 1 && /punto|segmento|tri[aá]ngulo|distancia|medio|pol[ií]gono|figura|traslada|refleja|rota|v[eé]rtice|coordenad/i.test(q.text)) {
    const [cv, c] = mkCanvas(300, 150); const L = 'ABCDEF', cols = ['#ff6f7a', '#6fb7ff', '#6fcf8f', '#ffd24d', '#c8a3ff', '#ff9a3c'];
    drawPlane(c, 0, 0, 300, 150, pts.map((p, i) => ({ ...p, col: cols[i], label: `${L[i]}` })), { segments: pts.length > 1 }); return cv;
  }
  if (fr.length) {
    const op = (/\d\s*([+\-−×÷*·])\s*\(?-?\d/.exec(q.text)?.[1] ?? '+').replace('*', '×').replace('-', '−'), [cv, c] = mkCanvas(Math.max(150, fr.length * 100), 70), cols = ['#6fb7ff', '#ffb347', '#6fcf8f'];
    fr.forEach((f, i) => { drawPie(c, 36 + i * 100, 32, 28, f.n, f.d, cols[i]); c.fillStyle = INK; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText(`${f.n}/${f.d}`, 36 + i * 100, 68); if (i < fr.length - 1) { c.font = 'bold 22px monospace'; c.fillText(op, 86 + i * 100, 38); } });
    return cv;
  }
  if (pc.length) { const [cv, c] = mkCanvas(300, 20 + pc.length * 34); pc.forEach((p, i) => drawBar(c, 10, 10 + i * 34, 280, 22, p / 100, ['#6fb7ff', '#ffb347', '#6fcf8f'][i], fmt(p) + ' %')); return cv; }
  return null;
}
