import type { Graph } from '../core/types';

const UI_FONT = '"Nunito", "Segoe UI", system-ui, sans-serif';

function drawPillLabel(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, color: string, align: CanvasTextAlign = 'center'): void {
  ctx.font = `bold 15px ${UI_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0f0c1d';
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
}

/** Dibuja funciones en un plano con cuadrícula en alta definición (480×280). */
export function drawGraph(cv: HTMLCanvasElement, g: Graph): void {
  const W = 480, H = 280;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const pad = 22;
  const px = (x: number) => ((x - g.xr[0]) / (g.xr[1] - g.xr[0])) * (W - pad * 2) + pad;
  const py = (y: number) => H - pad - ((y - g.yr[0]) / (g.yr[1] - g.yr[0])) * (H - pad * 2);

  ctx.fillStyle = '#141026';
  ctx.fillRect(0, 0, W, H);

  // Cuadrícula nítida
  const xSpan = g.xr[1] - g.xr[0];
  const ySpan = g.yr[1] - g.yr[0];
  const xStep = xSpan > 16 ? 2 : 1;
  const yStep = ySpan > 16 ? 2 : 1;

  for (let x = Math.ceil(g.xr[0]); x <= g.xr[1]; x++) {
    const X = Math.round(px(x)) + 0.5;
    ctx.strokeStyle = x === 0 ? '#b8aed8' : '#2d254c';
    ctx.lineWidth = x === 0 ? 2.5 : 1;
    ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
  }
  for (let y = Math.ceil(g.yr[0]); y <= g.yr[1]; y++) {
    const Y = Math.round(py(y)) + 0.5;
    ctx.strokeStyle = y === 0 ? '#b8aed8' : '#2d254c';
    ctx.lineWidth = y === 0 ? 2.5 : 1;
    ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke();
  }

  // Flechas en los ejes principales
  const axX = Math.max(12, Math.min(W - 12, px(0)));
  const axY = Math.max(12, Math.min(H - 12, py(0)));
  ctx.fillStyle = '#b8aed8';
  ctx.beginPath(); ctx.moveTo(W - 4, axY); ctx.lineTo(W - 12, axY - 5); ctx.lineTo(W - 12, axY + 5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(axX, 4); ctx.lineTo(axX - 5, 12); ctx.lineTo(axX + 5, 12); ctx.closePath(); ctx.fill();

  // Etiquetas numéricas de ejes con contorno oscuro
  const labelY = Math.max(16, Math.min(H - 14, py(0) + 14));
  for (let x = Math.ceil(g.xr[0]); x <= g.xr[1]; x += xStep) {
    if (x === 0 || (xStep === 1 && xSpan > 10 && x % 2 !== 0)) continue;
    drawPillLabel(ctx, String(x), Math.round(px(x)), labelY, '#cfc7ea', 'center');
  }
  const labelX = Math.max(24, Math.min(W - 16, px(0) - 8));
  for (let y = Math.ceil(g.yr[0]); y <= g.yr[1]; y += yStep) {
    if (y === 0 || (yStep === 1 && ySpan > 8 && y % 2 !== 0)) continue;
    drawPillLabel(ctx, String(y), labelX, Math.round(py(y)), '#cfc7ea', 'right');
  }

  // Curvas suaves y nítidas
  const cols = ['#ff6b8b', '#38bdf8'];
  g.fns.forEach((f, k) => {
    ctx.strokeStyle = cols[k % 2];
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let penDown = false;
    for (let X = 0; X <= W; X += 2) {
      const x = g.xr[0] + ((X - pad) / (W - pad * 2)) * xSpan;
      let y = 0;
      if (f.t === 'lin') y = f.m * x + f.b;
      else if (f.t === 'quad') y = f.a * x * x + f.b * x + f.c;
      else y = f.A * Math.sin((2 * Math.PI * (x - (f.ph ?? 0))) / f.T) + (f.k ?? 0);
      const Y = py(y);
      if (!Number.isFinite(Y) || Y < -40 || Y > H + 40) { penDown = false; continue; }
      if (!penDown) { ctx.moveTo(X, Y); penDown = true; }
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();
  });

  // Puntos destacados con pastilla legible
  g.pts?.forEach(p => {
    const cx = Math.round(px(p.x)), cy = Math.round(py(p.y));
    ctx.fillStyle = '#ffcf40';
    ctx.strokeStyle = '#0f0c1d';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (p.label) {
      ctx.font = `bold 14px ${UI_FONT}`;
      const tw = ctx.measureText(p.label).width + 12;
      const bx = Math.max(4, Math.min(W - tw - 4, cx + 8));
      const by = Math.max(4, Math.min(H - 22, cy - 22));
      ctx.fillStyle = 'rgba(15, 12, 29, 0.92)';
      ctx.fillRect(bx, by, tw, 20);
      ctx.strokeStyle = '#ffcf40'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, tw, 20);
      ctx.fillStyle = '#ffcf40'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(p.label, bx + 6, by + 10);
    }
  });
}

/** Recta numérica en alta definición (480×110) sin revelar el valor de los marcadores preguntados. */
export function drawNumberLine(cv: HTMLCanvasElement, nl: { min: number; max: number; marks: number[] }): void {
  const W = 480, H = 110;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#141026';
  ctx.fillRect(0, 0, W, H);

  const pad = 38;
  const px = (v: number) => pad + ((v - nl.min) / (nl.max - nl.min || 1)) * (W - pad * 2);
  const cy = 60;

  // Segmentos alternados en cuartos para lectura visual clara
  for (let i = 0; i < 4; i++) {
    const x0 = Math.round(px(nl.min + (i / 4) * (nl.max - nl.min)));
    const x1 = Math.round(px(nl.min + ((i + 1) / 4) * (nl.max - nl.min)));
    ctx.fillStyle = i % 2 === 0 ? '#2a2348' : '#38305e';
    ctx.fillRect(x0, cy - 4, x1 - x0, 8);
  }

  // Eje horizontal con flechas en ambos extremos
  ctx.strokeStyle = '#b8aed8';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(pad - 14, cy); ctx.lineTo(W - pad + 14, cy); ctx.stroke();

  ctx.fillStyle = '#b8aed8';
  ctx.beginPath();
  ctx.moveTo(pad - 20, cy); ctx.lineTo(pad - 11, cy - 5); ctx.lineTo(pad - 11, cy + 5); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W - pad + 20, cy); ctx.lineTo(W - pad + 11, cy - 5); ctx.lineTo(W - pad + 11, cy + 5); ctx.closePath();
  ctx.fill();

  // Marcas y etiquetas (sin revelar el valor de P ni decimales intermedios)
  for (let i = 0; i <= 4; i++) {
    const val = nl.min + (i / 4) * (nl.max - nl.min);
    const x = Math.round(px(val));
    const major = i === 0 || i === 4 || i === 2;
    const isTargetMark = nl.marks.some(m => Math.abs(m - val) < 1e-4);
    const isEndpointOrInt = i === 0 || i === 4 || Math.abs(val - Math.round(val)) < 1e-4;

    ctx.strokeStyle = major ? '#fff8eb' : '#9a90b8';
    ctx.lineWidth = major ? 2.5 : 2;
    ctx.beginPath(); ctx.moveTo(x, cy - (major ? 12 : 9)); ctx.lineTo(x, cy + (major ? 12 : 9)); ctx.stroke();

    if (!isTargetMark && isEndpointOrInt) {
      const cleanVal = Math.abs(val - Math.round(val)) < 1e-4 ? Math.round(val) : val;
      const txt = Number.isInteger(cleanVal) ? String(cleanVal) : cleanVal.toFixed(1).replace('.', ',');
      drawPillLabel(ctx, txt, x, cy + 26, '#fff8eb', 'center');
    }
  }

  // Marcadores P con punto luminoso, pastilla dorada arriba y "?" cian debajo
  nl.marks.forEach(v => {
    const x = Math.round(px(v));

    ctx.fillStyle = '#ffcf40';
    ctx.strokeStyle = '#0f0c1d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, cy, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#ffcf40';
    ctx.beginPath();
    ctx.moveTo(x, cy - 8);
    ctx.lineTo(x - 9, cy - 22);
    ctx.lineTo(x + 9, cy - 22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    const pw = 24, ph = 20;
    const bx = Math.round(x - pw / 2), by = 8;
    ctx.fillStyle = '#1b1534';
    ctx.fillRect(bx, by, pw, ph);
    ctx.strokeStyle = '#ffcf40';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, pw, ph);
    drawPillLabel(ctx, 'P', x, by + ph / 2 + 1, '#ffcf40', 'center');

    drawPillLabel(ctx, '?', x, cy + 26, '#38bdf8', 'center');
  });
}
