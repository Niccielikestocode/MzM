/** Respuesta gráfica: colocar el número en una recta o tocar el punto en un plano, en lugar de sólo elegir. */
import type { Question } from '../core/types';
import { h } from './dom';
import { drawLine, drawPlane, mkCanvas } from '../gfx/visual';
import { fmt, nearest, nearestPoint, parseVal, pickerKind, valNum, Val } from '../game/vis';

export interface PickerCfg { q: Question; items: { label: string; col: string }[]; onHover(i: number | null): void; onSubmit(i: number): void; sfx?(n: string): void }
export interface Picker { el: HTMLElement; kind: 'line' | 'plane'; submit(): void }
export function buildPicker(cfg: PickerCfg): Picker | null {
  const labels = cfg.items.map(i => i.label), kind = pickerKind(labels); if (!kind) return null;
  const vals = labels.map(l => parseVal(l)!) as Val[];
  return kind === 'line' ? linePicker(cfg, vals) : planePicker(cfg, vals);
}
function localX(cv: HTMLCanvasElement, e: PointerEvent): [number, number] { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height]; }

function linePicker(cfg: PickerCfg, vals: Val[]): Picker {
  const ns = vals.map(valNum), lo0 = Math.min(...ns), hi0 = Math.max(...ns), pad = (hi0 - lo0) * 0.14 || 1, lo = lo0 - pad, hi = hi0 + pad;
  const [cv, c] = mkCanvas(360, 84, 'vis-cv pick'); const read = h('b', { class: 'pk-read' }, '—'); let cur = (lo + hi) / 2, drag = false, touched = false, hov = -1;
  const x0 = 14, w = 332;
  const draw = (): void => {
    c.clearRect(0, 0, 360, 84); c.fillStyle = '#120d1e'; c.fillRect(0, 0, 360, 84);
    const sx = drawLine(c, x0, 46, w, lo, hi);
    const px = sx(cur); c.fillStyle = touched ? '#ffd24d' : '#6a5ea0'; c.strokeStyle = '#0b0714'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, 40); c.lineTo(px - 9, 14); c.lineTo(px + 9, 14); c.closePath(); c.fill(); c.stroke();
    c.fillRect(px - 1.5, 40, 3, 12);
  };
  const setFromEvent = (e: PointerEvent): void => { const [x] = localX(cv, e); cur = Math.max(lo, Math.min(hi, lo + ((x - x0) / w) * (hi - lo))); touched = true; read.textContent = '≈ ' + fmt(Math.round(cur * 100) / 100); const i = nearest(ns, cur); if (i !== hov) { hov = i; cfg.onHover(i); } draw(); };
  cv.addEventListener('pointerdown', e => { drag = true; cv.setPointerCapture(e.pointerId); setFromEvent(e); });
  cv.addEventListener('pointermove', e => { if (drag) setFromEvent(e); }); cv.addEventListener('pointerup', () => { drag = false; });
  const submit = (): void => { if (!touched) return; cfg.onSubmit(nearest(ns, cur)); };
  draw();
  const btn = h('button', { class: 'pbtn small', onclick: submit }, 'Lanzar respuesta (E)');
  const el = h('div', { class: 'pick' }, h('small', { class: 'muted' }, 'Arrastra el marcador al valor que crees y lánzalo'), cv, h('div', { class: 'pk-row' }, read, btn));
  return { el, kind: 'line', submit };
}

function planePicker(cfg: PickerCfg, vals: Val[]): Picker {
  const pts = vals.map(v => ({ x: (v as any).x as number, y: (v as any).y as number }));
  const [cv, c] = mkCanvas(360, 160, 'vis-cv pick'); let sel = -1; let g: ReturnType<typeof drawPlane>;
  const draw = (): void => { g = drawPlane(c, 0, 0, 360, 160, pts.map((p, i) => ({ ...p, col: cfg.items[i].col, label: String.fromCharCode(65 + i) })), { sel }); };
  draw();
  cv.addEventListener('pointermove', e => { const [px, py] = localX(cv, e), i = nearestPoint(pts.map(p => ({ x: g.sx(p.x), y: g.sy(p.y) })), px, py); if (i !== sel) { sel = i; cfg.onHover(i); draw(); } });
  cv.addEventListener('pointerdown', e => { const [px, py] = localX(cv, e), i = nearestPoint(pts.map(p => ({ x: g.sx(p.x), y: g.sy(p.y) })), px, py); sel = i; draw(); cfg.onSubmit(i); });
  const el = h('div', { class: 'pick' }, h('small', { class: 'muted' }, 'Toca en el plano el punto que responde'), cv);
  return { el, kind: 'plane', submit: () => { if (sel >= 0) cfg.onSubmit(sel); } };
}
