// @ts-nocheck
/* Retos animados: la solución se ejecuta en el mundo. Portado del Atlas. */
import '../../tools/cardart.js';
import { R, disc, rng as _rng } from './scene';
const CA = (window as any).CardArt;
export const C: any = { hero: null, mon: null, tk: 0, finish: (ok: boolean) => {} };
const GYX = 140;
  const GY = 140, PL = { ox: 58, oy: 140, u: 21, nx: 12, ny: 6 };
  const ppx = x => PL.ox + x * PL.u, ppy = y => PL.oy - y * PL.u;
  function ptxt(ctx, s, x, y, col, sc) {
    sc = sc || 1; s = String(s);
    for (let k = 0; k < s.length; k++) {
      const rows = CA.NF[s[k]] || ['   ', '   ', '   ', '   ', '   '], w = rows[0].length;
      for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) if (rows[j][i] === '#') R(ctx, col, x + i * sc, y + j * sc, sc, sc);
      x += (w + 1) * sc;
    }
  }
  const twidth = (s, sc) => String(s).split('').reduce((a, ch) => a + ((CA.NF[ch] || ['   '])[0].length + 1) * (sc || 1), 0) - (sc || 1);
  function pline(ctx, c, x0, y0, x1, y1, sz, dash) {
    sz = sz || 1; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) { if (dash && Math.floor(i / dash) % 2) continue; R(ctx, c, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, sz, sz); }
  }
  function ftri(ctx, col, P) {
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    const x0 = Math.floor(Math.min.apply(0, xs)), x1 = Math.ceil(Math.max.apply(0, xs)), y0 = Math.floor(Math.min.apply(0, ys)), y1 = Math.ceil(Math.max.apply(0, ys));
    const d = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1]); if (!d) return;
    ctx.fillStyle = col;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const a = ((P[1][1] - P[2][1]) * (x + .5 - P[2][0]) + (P[2][0] - P[1][0]) * (y + .5 - P[2][1])) / d, b = ((P[2][1] - P[0][1]) * (x + .5 - P[2][0]) + (P[0][0] - P[2][0]) * (y + .5 - P[2][1])) / d, c = 1 - a - b;
      if (a >= 0 && b >= 0 && c >= 0) ctx.fillRect(x, y, 1, 1);
    }
  }
  const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const fr = (n, d) => { const g = gcd(Math.abs(n), d) || 1; n /= g; d /= g; return { n, d, v: n / d, t: d === 1 ? String(n) : n + '/' + d }; };
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));

  function drawPlane(ctx, S) {
    ctx.globalAlpha = .58; R(ctx, '#0b0813', PL.ox - 9, ppy(PL.ny) - 6, PL.nx * PL.u + 18, PL.ny * PL.u + 20); ctx.globalAlpha = 1;
    ctx.globalAlpha = .55;
    for (let i = 0; i <= PL.nx; i++) R(ctx, i ? '#4a3f6b' : '#a99fc0', ppx(i), ppy(PL.ny), 1, PL.ny * PL.u + 1);
    for (let j = 0; j <= PL.ny; j++) R(ctx, j ? '#4a3f6b' : '#a99fc0', ppx(0), ppy(j), PL.nx * PL.u + 1, 1);
    ctx.globalAlpha = 1;
    for (let i = 0; i <= PL.nx; i++) ptxt(ctx, i, ppx(i) - Math.floor(twidth(i) / 2), PL.oy + 4, '#a99fc0');
    for (let j = 1; j <= PL.ny; j++) ptxt(ctx, j, ppx(0) - 6, ppy(j) - 2, '#a99fc0');
  }

  export function floatText(S, str, x, y, col) { S.fx.push({ t: 0, life: 900, draw(ctx, p) { ptxt(ctx, str, x - Math.floor(twidth(str, 2) / 2), y - 22 * p, col, 2); } }); }
  export function burst(S, x, y, col, n, spread) {
    for (let i = 0; i < (n || 14); i++) { const a = Math.random() * 6.28, v = (spread || 1) * (0.4 + Math.random() * 1.1); S.fx.push({ t: 0, life: 500 + Math.random() * 400, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .6, x, y, col, draw(ctx, p) { this.x += this.vx; this.y += this.vy; this.vy += .05; ctx.globalAlpha = 1 - p; R(ctx, this.col, this.x, this.y, 2, 2); ctx.globalAlpha = 1; } }); }
  }
  export function bolt(ctx, x0, y0, x1, y1, col) {
    let px = x0, py = y0; const n = 12;
    for (let i = 1; i <= n; i++) { const nx = x0 + (x1 - x0) * i / n, ny = y0 + (y1 - y0) * i / n + (i < n ? (Math.random() - .5) * 18 : 0); pline(ctx, '#ffffff', px, py, nx, ny, 3); pline(ctx, col, px, py, nx, ny, 1); px = nx; py = ny; }
  }
  const stageFloat = (..._a: any[]) => {};
  const IMPL: any = {};

  IMPL.projectile = {
    make(meta, q) {
      const h = meta.h, k = h * h;
      return { phase: 'ready', fx: [], h, k, sx: 102 / h, sy: 96 / (k + h), opts: q.options.map((t, i) => ({ t, v: meta.optVals[i], ok: i === q.correct })), trail: [] };
    },
    setup() { C.hero.x = 14; C.hero.y = GY - 29; C.mon.x = 236; C.mon.y = GY - 29; },
    start(S) { S.hp = Math.sqrt(S.opts[S.pick].v); S.range = 2 * S.hp; S.sub = 'draw'; S.t = 0; C.hero.play('attack'); },
    update(S, dt) {
      S.t += dt;
      if (S.sub === 'draw' && S.t > 380) { S.sub = 'fly'; S.t = 0; }
      else if (S.sub === 'fly') {
        const p = Math.min(1, S.t / 1500); S.xu = p * S.range; S.yu = -S.xu * S.xu + 2 * S.hp * S.xu;
        const X = 48 + S.xu * S.sx, Y = 120 - S.yu * S.sy; S.prev = S.arrow || { x: X - 1, y: Y }; S.arrow = { x: X, y: Y };
        const lt = S.trail[S.trail.length - 1]; if (!lt || Math.hypot(lt.x - X, lt.y - Y) > 5) S.trail.push({ x: X, y: Y });
        if (p >= 1) { S.sub = 'land'; S.t = 0; S.hit = Math.abs(X - 252) < 13; if (S.hit) { C.mon.play('hurt'); stageFloat(S, '-' + S.k, 252, 100, '#ffd24d'); burst(S, 252, 120, '#ffd24d', 14); } else { C.mon.play('attack'); C.hero.play('hurt'); burst(S, X, 120, '#c9b99a', 8, .7); } }
      }
      else if (S.sub === 'land' && S.t > 650) { S.sub = 'reveal'; S.t = 0; }
      else if (S.sub === 'reveal' && S.t > 1500) { S.sub = 'end'; const v = S.opts[S.pick].v; C.finish(S.hit, S.hit ? `El vértice está en x = ${S.h}: y = −${S.h}² + ${2 * S.h}·${S.h} = ${S.k}. La flecha cayó justo sobre el arquero.` : `Con ${v} la flecha cayó ${S.arrow.x < 252 ? 'antes' : 'después'} del monstruo. La altura máxima es el valor de y en el vértice (x = ${S.h}): y = ${S.k}.`); }
    },
    back(ctx, S) {
      R(ctx, '#0b0813', 44, 18, 270, 108); ctx.globalAlpha = .6; R(ctx, '#0b0813', 44, 18, 270, 108); ctx.globalAlpha = .6;
      R(ctx, '#a99fc0', 48, 20, 1, 101); R(ctx, '#a99fc0', 48, 120, 262, 1); ctx.globalAlpha = 1;
      for (let i = 0; i <= 2 * S.h + 2; i++) { R(ctx, '#a99fc0', 48 + i * S.sx, 121, 1, 3); if (i % 1 === 0 && i <= 2 * S.h + 1) ptxt(ctx, i, 48 + i * S.sx - Math.floor(twidth(i) / 2), 126, '#a99fc0'); }
      for (let v = S.h; v <= S.k + S.h; v += S.h) { R(ctx, '#a99fc0', 45, 120 - v * S.sy, 3, 1); ptxt(ctx, v, 43 - twidth(v), 120 - v * S.sy - 2, '#a99fc0'); }
    },
    front(ctx, S) {
      S.trail.forEach((p, i) => { R(ctx, '#e86ab5', p.x - 1, p.y - 1, 3, 3); });
      if (S.arrow && S.sub !== 'reveal' && S.sub !== 'end' || (S.arrow && S.sub !== 'end' && !S.hit)) {
        const a = S.arrow, p = S.prev, dx = a.x - p.x, dy = a.y - p.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
        pline(ctx, '#f3ead8', a.x - ux * 9, a.y - uy * 9, a.x, a.y, 1); R(ctx, '#ffd24d', a.x - 1, a.y - 1, 3, 3); R(ctx, '#e86ab5', a.x - ux * 9 - 1, a.y - uy * 9 - 1, 2, 2);
      }
      if (S.sub === 'reveal' || S.sub === 'end') {
        const p = S.sub === 'end' ? 1 : Math.min(1, S.t / 1100);
        for (let x = 0; x <= p * 2 * S.h; x += .12) { if (Math.floor(x * 5) % 2) continue; R(ctx, '#ffd24d', 48 + x * S.sx, 120 - (-x * x + 2 * S.h * x) * S.sy, 2, 2); }
        if (p >= .5) {
          const vx = 48 + S.h * S.sx, vy = 120 - S.k * S.sy;
          pline(ctx, '#ffd24d', vx, vy, vx, 120, 1, 3); pline(ctx, '#ffd24d', 48, vy, vx, vy, 1, 3);
          for (let i = -3; i <= 3; i++) R(ctx, '#ffd24d', vx - 3 + Math.abs(i), vy + i, 7 - 2 * Math.abs(i), 1);
          ptxt(ctx, '(' + S.h + ',' + S.k + ')', vx + 6, vy - 3, '#ffd24d', 1);
        }
      }
    }
  };

  IMPL.clickpoint = {
    make(meta) { return { phase: 'ready', fx: [], tx: meta.tx, ty: meta.ty, hover: null, fog: 1, opts: null }; },
    setup(S) { C.hero.x = 4; C.hero.y = GY - 29; C.mon.x = ppx(S.tx) - 16; C.mon.y = ppy(S.ty) - 16; },
    pointer(S, type, x, y) {
      const gx = Math.round((x - PL.ox) / PL.u), gy = Math.round((PL.oy - y) / PL.u), okp = gx >= 0 && gx <= PL.nx && gy >= 0 && gy <= PL.ny;
      S.hover = okp ? { x: gx, y: gy } : null;
      if (type === 'down' && okp && S.phase === 'ready') { S.pick = { x: gx, y: gy }; S.phase = 'run'; S.sub = 'draw'; S.t = 0; C.hero.play('attack'); }
    },
    update(S, dt) {
      if (S.sub === 'gone') S.fog = Math.max(0, S.fog - dt / 700);
      if (S.phase !== 'run') return; S.t += dt;
      if (S.sub === 'draw' && S.t > 380) { S.sub = 'fly'; S.t = 0; }
      else if (S.sub === 'fly') { const p = Math.min(1, S.t / 650); S.sp = { x: 40 + (ppx(S.pick.x) - 40) * p, y: 118 + (ppy(S.pick.y) - 118) * p }; S.sparks = S.sparks || []; if (Math.random() < .8) S.fx.push({ t: 0, life: 300, x: S.sp.x, y: S.sp.y, draw(ctx, q) { ctx.globalAlpha = 1 - q; R(ctx, '#9be8ff', this.x + (Math.random() - .5) * 4, this.y + (Math.random() - .5) * 4, 2, 2); ctx.globalAlpha = 1; } });
        if (p >= 1) { S.hit = S.pick.x === S.tx && S.pick.y === S.ty; S.sub = S.hit ? 'gone' : 'miss'; S.t = 0; S.sp = null; burst(S, ppx(S.pick.x), ppy(S.pick.y), S.hit ? '#ffd24d' : '#9be8ff', 16); if (S.hit) { C.mon.play('hurt'); stageFloat(S, '-5', ppx(S.tx), ppy(S.ty) - 10, '#ffd24d'); } else { C.hero.play('hurt'); } } }
      else if (S.sub === 'miss' && S.t > 700) { S.sub = 'gone'; S.t = 0; C.mon.play('attack'); }
      else if (S.sub === 'gone' && S.t > 1500) { S.sub = 'end'; C.finish(S.hit, S.hit ? `Punto (${S.tx}, ${S.ty}): ${S.tx} pasos a la derecha y ${S.ty} hacia arriba. La niebla se disipó.` : `Tocaste (${S.pick.x}, ${S.pick.y}). El caballero estaba en (${S.tx}, ${S.ty}): primero x (horizontal), luego y (vertical).`); }
    },
    back(ctx, S) { drawPlane(ctx, S); },
    front(ctx, S) {
      if (S.hover && S.phase === 'ready') { const hx = ppx(S.hover.x), hy = ppy(S.hover.y); ctx.globalAlpha = .7; R(ctx, '#ffd24d', hx, ppy(PL.ny), 1, PL.ny * PL.u); R(ctx, '#ffd24d', ppx(0), hy, PL.nx * PL.u, 1); ctx.globalAlpha = 1; for (let i = -2; i <= 2; i++) { R(ctx, '#ffffff', hx + i, hy, 1, 1); R(ctx, '#ffffff', hx, hy + i, 1, 1); } const lab = '(' + S.hover.x + ',' + S.hover.y + ')'; R(ctx, '#14101f', hx + 5, hy - 12, twidth(lab) + 4, 9); ptxt(ctx, lab, hx + 7, hy - 10, '#ffd24d'); }
      if (S.fog > 0) { const cx = ppx(S.tx), cy = ppy(S.ty); ctx.globalAlpha = .92 * S.fog; [[-8, 4, 10], [0, -3, 12], [8, 4, 10], [-3, 7, 9], [4, -6, 9]].forEach((d, i) => disc(ctx, i % 2 ? '#aab6cf' : '#d4dcec', Math.round(cx + d[0] + 2 * Math.sin(C.tk * .6 + i)), Math.round(cy + d[1]), d[2])); ctx.globalAlpha = 1; }
      if (S.sp) { disc(ctx, '#ffffff', S.sp.x, S.sp.y, 3); disc(ctx, '#7fe0ff', S.sp.x, S.sp.y, 2); }
      if (S.sub === 'gone' && !S.hit || S.sub === 'end' && !S.hit) { const cx = ppx(S.tx), cy = ppy(S.ty); pline(ctx, '#ffd24d', cx, cy, cx, PL.oy, 1, 3); pline(ctx, '#ffd24d', cx, cy, PL.ox, cy, 1, 3); const lab = '(' + S.tx + ',' + S.ty + ')'; ptxt(ctx, lab, cx + 8, cy - 22, '#ffd24d'); }
      if (S.phase === 'ready' && !S.hover) { ptxt(ctx, 'TOCA UN PUNTO', 120, 6, '#a99fc0'); }
    }
  };

  IMPL.slope = {
    make(meta, q) {
      const rise = meta.rise, run = meta.run;
      return { phase: 'ready', fx: [], rise, run, m: fr(rise, run), ax: meta.ax, ay: meta.ay, opts: q.options.map((t, i) => ({ t, v: meta.optVals[i], ok: i === q.correct })) };
    },
    setup(S) { C.hero.x = ppx(S.ax) - 34; C.hero.y = ppy(S.ay) - 29; C.mon.x = ppx(S.ax + S.run) - 4; C.mon.y = ppy(S.ay + S.rise) - 29; },
    start(S) { S.mp = S.opts[S.pick].v; S.sub = 'ramp'; S.t = 0; S.endY = Math.max(0, S.ay + S.mp * S.run); S.p = 0; },
    update(S, dt) {
      S.t += dt;
      if (S.sub === 'ramp') { S.p = Math.min(1, S.t / 900); if (S.p >= 1) { S.sub = 'climb'; S.t = 0; C.hero.play('idle'); } }
      else if (S.sub === 'climb') {
        const p = Math.min(1, S.t / 1100), x = S.ax + S.run * p, y = S.ay + (S.endY - S.ay) * p; S.hx = x; S.hy = y;
        C.hero.x = ppx(x) - 30; C.hero.y = ppy(y) - 29;
        if (p >= 1) { S.sub = 'result'; S.t = 0; S.hit = Math.abs(S.endY - (S.ay + S.rise)) < 1e-6; if (S.hit) { C.hero.play('attack'); setTimeout(() => { C.mon.play('hurt'); stageFloat(S, '-6', ppx(S.ax + S.run), ppy(S.ay + S.rise) - 20, '#ffd24d'); burst(S, ppx(S.ax + S.run) + 8, ppy(S.ay + S.rise) - 14, '#ffd24d', 12); }, 280); } else { C.hero.play('hurt'); C.mon.play('attack'); } }
      }
      else if (S.sub === 'result') { if (!S.hit) { S.fall = (S.fall || 0) + dt * .0018 * S.t; C.hero.y = Math.min(ppy(0) - 29, ppy(S.hy) - 29 + S.fall); } if (S.t > 1100) { S.sub = 'reveal'; S.t = 0; } }
      else if (S.sub === 'reveal' && S.t > 1400) { S.sub = 'end'; C.finish(S.hit, S.hit ? `Pendiente = subida ÷ avance = ${S.rise} ÷ ${S.run} = ${S.m.t}. La rampa llegó justo a B.` : `La pendiente es subida ÷ avance = ${S.rise} ÷ ${S.run} = ${S.m.t}. Con esa otra pendiente la rampa termina fuera de B.`); }
    },
    back(ctx, S) { drawPlane(ctx, S); const x0 = ppx(S.ax + S.run) - 6, y0 = ppy(S.ay + S.rise); R(ctx, '#3b2f57', x0, y0, 20, 4); R(ctx, '#a99fc0', x0, y0, 20, 1); },
    front(ctx, S) {
      const A = [ppx(S.ax), ppy(S.ay)], B = [ppx(S.ax + S.run), ppy(S.ay + S.rise)];
      if (S.sub !== 'reveal' && S.sub !== 'end' || !S.sub) { pline(ctx, '#6f628f', ppx(0), ppy(S.ay - S.ax * S.rise / S.run), ppx(PL.nx), ppy(S.ay + (PL.nx - S.ax) * S.rise / S.run), 1, 4); }
      if (S.mp !== undefined) { const p = S.sub === 'ramp' ? S.p : 1; ctx.globalAlpha = .9; pline(ctx, '#7fe0ff', A[0], A[1], ppx(S.ax + S.run * p), ppy(S.ay + (S.endY - S.ay) * p), 3); ctx.globalAlpha = 1; pline(ctx, '#ffffff', A[0], A[1], ppx(S.ax + S.run * p), ppy(S.ay + (S.endY - S.ay) * p), 1); }
      if (S.sub === 'reveal' || S.sub === 'end') {
        const p = S.sub === 'end' ? 1 : Math.min(1, S.t / 700);
        pline(ctx, '#ffd24d', A[0], A[1], A[0] + (B[0] - A[0]) * p, A[1], 1); if (p > .98) pline(ctx, '#ffd24d', B[0], A[1], B[0], A[1] + (B[1] - A[1]) * Math.min(1, (S.t - 600) / 600 || 0), 1);
        if (S.sub === 'end' || S.t > 700) { ptxt(ctx, S.run, (A[0] + B[0]) / 2 - 2, A[1] + 4, '#ffd24d', 2); ptxt(ctx, S.rise, B[0] + 4, (A[1] + B[1]) / 2 - 4, '#ffd24d', 2); }
      }
      [[A, 'A'], [B, 'B']].forEach(p => { disc(ctx, '#14101f', p[0][0], p[0][1], 3); disc(ctx, '#ffd24d', p[0][0], p[0][1], 2); ptxt(ctx, p[1], p[0][0] - 8, p[0][1] - 12, '#ffd24d', 1); });
    }
  };

  IMPL.ladder = {
    make(meta, q) {
      const { a, b, c } = meta, u = Math.min(16, 170 / b, 118 / a);
      return { phase: 'ready', fx: [], a, b, c, u, W0: 214, opts: q.options.map((t, i) => ({ t, v: meta.optVals[i], ok: i === q.correct })) };
    },
    setup(S) { C.hero.x = 6; C.hero.y = GY - 29; C.mon.x = S.W0 + 2; C.mon.y = GY - S.a * S.u - 29; S.fx0 = S.W0 - S.b * S.u; },
    start(S) { S.L = S.opts[S.pick].v * S.u; S.th = Math.acos(Math.min(1, S.b * S.u / S.L)); S.h = Math.sqrt(S.opts[S.pick].v ** 2 - S.b ** 2); S.kind = Math.abs(S.h - S.a) < 1e-6 ? 'ok' : (S.h < S.a ? 'short' : 'long'); S.sub = 'rot'; S.t = 0; S.ang = 0; S.foot = S.fx0; },
    update(S, dt) {
      S.t += dt;
      if (S.sub === 'rot') { S.ang = S.th * ease(Math.min(1, S.t / 1000)); if (S.t >= 1000) { S.t = 0; S.sub = S.kind === 'long' ? 'slip' : 'climb'; } }
      else if (S.sub === 'slip') { const p = Math.min(1, S.t / 900); S.foot = S.fx0 - 46 * p; S.ang = S.th * (1 - .75 * p); if (p >= 1) { S.sub = 'fall'; S.t = 0; C.hero.play('hurt'); C.mon.play('attack'); } }
      else if (S.sub === 'fall') { S.ang = Math.max(0, S.th * .25 * (1 - S.t / 500)); if (S.t > 1100) { S.sub = 'reveal'; S.t = 0; } }
      else if (S.sub === 'climb') {
        const p = Math.min(1, S.t / 1200), tx = S.foot + S.L * Math.cos(S.ang), ty = GY - S.L * Math.sin(S.ang), hx = S.foot + (tx - S.foot) * p, hy = GY + (ty - GY) * p;
        C.hero.x = hx - 18; C.hero.y = hy - 29; S.hp2 = p;
        if (p >= 1) { S.sub = 'top'; S.t = 0; if (S.kind === 'ok') { C.hero.play('attack'); setTimeout(() => { C.mon.play('hurt'); stageFloat(S, '-8', S.W0 + 18, GY - S.a * S.u - 36, '#ffd24d'); burst(S, S.W0 + 12, GY - S.a * S.u - 12, '#ffd24d', 14); }, 280); } else { C.hero.play('hurt'); C.mon.play('attack'); } }
      }
      else if (S.sub === 'top') { if (S.kind === 'short') { S.fl = (S.fl || 0) + dt * .0016 * S.t; C.hero.y = Math.min(GY - 29, C.hero.y + S.fl * .2); } if (S.t > 1200) { S.sub = 'reveal'; S.t = 0; } }
      else if (S.sub === 'reveal' && S.t > 1500) { S.sub = 'end'; const ok = S.kind === 'ok', v = S.opts[S.pick].v; C.finish(ok, ok ? `${S.a}² + ${S.b}² = ${S.a * S.a + S.b * S.b} = ${S.c}², así que la escalera mide ${S.c} m.` : `Con ${v} m la escalera ${S.kind === 'short' ? 'se queda corta' : 'se pasa y resbala'}. El largo exacto sale de c² = ${S.a}² + ${S.b}² = ${S.a * S.a + S.b * S.b}, o sea c = ${S.c}.`); }
    },
    back(ctx, S) {
      const top = GY - S.a * S.u; R(ctx, '#2a2240', S.W0, top, 30, GY - top + 4); R(ctx, '#4a3f6b', S.W0, top, 30, 3); R(ctx, '#7e72a2', S.W0, top, 30, 1);
      for (let y = top + 6; y < GY; y += 6) { R(ctx, '#3b2f57', S.W0, y, 30, 1); for (let x = S.W0 + ((y / 6) % 2 ? 6 : 12); x < S.W0 + 30; x += 12) R(ctx, '#3b2f57', x, y - 6, 1, 6); }
      ptxt(ctx, S.a + 'M', S.W0 + 6, top + 8, '#a99fc0');
    },
    front(ctx, S) {
      const base = S.sub === 'ready' || S.L === undefined;
      if (!base) {
        const f = S.foot, ca = Math.cos(S.ang), sa = Math.sin(S.ang), nx = -sa * 2.2, ny = -ca * 2.2, tx = f + S.L * ca, ty = GY - S.L * sa;
        pline(ctx, '#6b4420', f - nx, GY - ny, tx - nx, ty - ny, 2); pline(ctx, '#c58a46', f + nx, GY + ny, tx + nx, ty + ny, 2);
        const n = Math.floor(S.L / 6); for (let i = 1; i < n; i++) { const q = i / n; pline(ctx, '#e0b06a', f + (tx - f) * q - nx, GY + (ty - GY) * q - ny, f + (tx - f) * q + nx, GY + (ty - GY) * q + ny, 1); }
      }
      if (S.sub === 'reveal' || S.sub === 'end') {
        const p = S.sub === 'end' ? 1 : Math.min(1, S.t / 900), F = [S.fx0, GY], Wb = [S.W0, GY], Tp = [S.W0, GY - S.a * S.u];
        pline(ctx, '#ffd24d', F[0], GY - 1, F[0] + (Wb[0] - F[0]) * p, GY - 1, 1, 3); pline(ctx, '#ffd24d', Wb[0] - 1, GY, Wb[0] - 1, GY + (Tp[1] - GY) * p, 1, 3); pline(ctx, '#ffd24d', F[0], F[1], F[0] + (Tp[0] - F[0]) * p, F[1] + (Tp[1] - F[1]) * p, 1);
        if (p > .8) { ptxt(ctx, S.b, (F[0] + Wb[0]) / 2 - 2, GY - 12, '#ffd24d', 2); ptxt(ctx, S.c, (F[0] + Wb[0]) / 2 - 18, (GY + Tp[1]) / 2 - 8, '#ffd24d', 2); const eq = `${S.a * S.a}+${S.b * S.b}=${S.c * S.c}`; R(ctx, '#14101f', 50, 10, twidth(eq, 2) + 8, 16); ptxt(ctx, eq, 54, 14, '#ffd24d', 2); }
      }
    }
  };

  const TRI = [[0, 0], [2, 0], [0, 2]];
  function triPx(pts, dx, dy) { return pts.map(p => [ppx(p[0] + dx), ppy(p[1] + dy)]); }
  function drawTri(ctx, P, fill, alpha, line, lab) {
    ctx.globalAlpha = alpha; ftri(ctx, fill, P); ctx.globalAlpha = 1;
    [[0, 1], [1, 2], [2, 0]].forEach(e => pline(ctx, line, P[e[0]][0], P[e[0]][1], P[e[1]][0], P[e[1]][1], 1));
    if (lab) lab.forEach((t, i) => ptxt(ctx, t, P[i][0] + (i === 0 ? -8 : (i === 1 ? 4 : -8)), P[i][1] + (i === 2 ? -9 : 3), line, 1));
  }
  function shatter(S, P, col) { P.forEach(p => burst(S, p[0], p[1], col, 10, 1.6)); const cx = (P[0][0] + P[1][0] + P[2][0]) / 3, cy = (P[0][1] + P[1][1] + P[2][1]) / 3; burst(S, cx, cy, col, 22, 1.8); }

  IMPL.translate = {
    make(meta, q) {
      const { ax, ay, dx, dy } = meta;
      return { phase: 'ready', fx: [], ax, ay, dx, dy, ok: [ax + dx, ay + dy], opts: q.options.map((t, i) => ({ t, p: meta.optPts[i], ok: i === q.correct })) };
    },
    setup(S) { C.hero.x = 4; C.hero.y = GY - 29; C.mon.x = 286; C.mon.y = GY - 29; },
    start(S) { const o = S.opts[S.pick].p; S.tx = o[0] - S.ax; S.ty = o[1] - S.ay; S.sub = 'slide'; S.t = 0; S.off = [0, 0]; },
    update(S, dt) {
      S.t += dt;
      if (S.sub === 'slide') { const p = ease(Math.min(1, S.t / 1300)); S.off = [S.tx * p, S.ty * p]; if (S.t >= 1300) { S.sub = 'result'; S.t = 0; S.hit = S.opts[S.pick].ok; if (S.hit) { S.flash = 1; C.hero.play('attack'); } else { shatter(S, triPx(TRI, S.ax + S.tx, S.ay + S.ty), '#e86ab5'); S.gone = true; C.hero.play('hurt'); C.mon.play('attack'); } } }
      else if (S.sub === 'result') { S.flash = Math.max(0, (S.flash || 0) - dt / 500); if (S.hit && S.t > 350 && !S.bolted) { S.bolted = 1; C.mon.play('hurt'); stageFloat(S, '-7', 300, 96, '#ffd24d'); } if (S.t > 1100) { S.sub = 'reveal'; S.t = 0; } }
      else if (S.sub === 'reveal' && S.t > 1300) { S.sub = 'end'; C.finish(S.hit, S.hit ? `Cada vértice se mueve (+${S.dx}, +${S.dy}): A (${S.ax}, ${S.ay}) → A' (${S.ok[0]}, ${S.ok[1]}).` : `Trasladar suma ${S.dx} a x y ${S.dy} a y: A' = (${S.ax} + ${S.dx}, ${S.ay} + ${S.dy}) = (${S.ok[0]}, ${S.ok[1]}).`); }
    },
    back(ctx, S) { drawPlane(ctx, S); },
    front(ctx, S) {
      drawTri(ctx, triPx(TRI, S.ax, S.ay), '#6f628f', .25, '#8e82b3', ['A', 'B', 'C']);
      if (S.sub !== 'ready' && S.off && !S.gone) { const P = triPx(TRI, S.ax + S.off[0], S.ay + S.off[1]); drawTri(ctx, P, '#e86ab5', .75, '#ffd0ea', ["A'", "B'", "C'"].map(s => s[0])); if (S.sub === 'slide') pline(ctx, '#ffd24d', ppx(S.ax), ppy(S.ay), P[0][0], P[0][1], 1, 3); }
      if (S.flash > 0 || (S.hit && S.sub === 'result')) { bolt(ctx, 36, 116, 292, 116, '#7fe0ff'); }
      if ((S.sub === 'reveal' || S.sub === 'end')) { const p = S.sub === 'end' ? 1 : Math.min(1, S.t / 700); if (!S.hit || true) { pline(ctx, '#ffd24d', ppx(S.ax), ppy(S.ay), ppx(S.ax) + (ppx(S.ok[0]) - ppx(S.ax)) * p, ppy(S.ay) + (ppy(S.ok[1]) - ppy(S.ay)) * p, 1); const G = triPx(TRI, S.ok[0] - 0 - 0 - 0 + 0 - S.ax + S.ax - 0, 0); } const G = triPx(TRI, S.dx + S.ax, S.dy + S.ay); G.forEach((q, i) => { [[0, 1], [1, 2], [2, 0]].forEach(e => { if (e[0] === i) pline(ctx, '#ffd24d', G[e[0]][0], G[e[0]][1], G[e[1]][0], G[e[1]][1], 1, 3); }); }); const lab = "A'" ; ptxt(ctx, 'A', G[0][0] - 8, G[0][1] + 3, '#ffd24d'); ptxt(ctx, '(' + S.ok[0] + ',' + S.ok[1] + ')', G[0][0] + 4, G[0][1] + 4, '#ffd24d'); }
    }
  };

  IMPL.reflect = {
    make(meta, q) {
      const { m, ax, ay } = meta;
      return { phase: 'ready', fx: [], m, ax, ay, ok: [2 * m - ax, ay], opts: q.options.map((t, i) => ({ t, p: meta.optPts[i], ok: i === q.correct })) };
    },
    setup() { C.hero.x = 4; C.hero.y = GY - 29; C.mon.x = 286; C.mon.y = GY - 29; },
    start(S) { const o = S.opts[S.pick].p; S.ex = o[0] - S.ok[0]; S.ey = o[1] - S.ok[1]; S.sub = 'flip'; S.t = 0; S.fp = 0; S.sl = 0; },
    update(S, dt) {
      S.t += dt;
      if (S.sub === 'flip') { S.fp = ease(Math.min(1, S.t / 1300)); if (S.t >= 1300) { S.sub = 'move'; S.t = 0; } }
      else if (S.sub === 'move') { S.sl = (S.ex || S.ey) ? ease(Math.min(1, S.t / 600)) : 1; if (S.t >= ((S.ex || S.ey) ? 600 : 100)) { S.sub = 'result'; S.t = 0; S.hit = S.opts[S.pick].ok; if (S.hit) C.hero.play('attack'); else { shatter(S, triPx(TRI.map(p => [2 * S.m - S.ax - p[0] + 0, p[1]]), 0, 0).map(q => q), '#e86ab5'); S.gone = true; C.hero.play('hurt'); C.mon.play('attack'); } } }
      else if (S.sub === 'result') { if (S.hit && S.t > 350 && !S.bolted) { S.bolted = 1; C.mon.play('hurt'); stageFloat(S, '-7', 300, 96, '#ffd24d'); } if (S.t > 1100) { S.sub = 'reveal'; S.t = 0; } }
      else if (S.sub === 'reveal' && S.t > 1200) { S.sub = 'end'; C.finish(S.hit, S.hit ? `A está a ${S.m - S.ax} de la recta; su reflejo queda ${S.m - S.ax} al otro lado: A' (${S.ok[0]}, ${S.ok[1]}).` : `La distancia a la recta se conserva al otro lado: A está a ${S.m - S.ax}, así que A' = ${S.m} + ${S.m - S.ax} = ${S.ok[0]}. Queda en (${S.ok[0]}, ${S.ok[1]}).`); }
    },
    back(ctx, S) { drawPlane(ctx, S); },
    front(ctx, S) {
      const T0 = TRI.map(p => [S.ax + p[0], S.ay + p[1]]);
      for (let y = 0; y < PL.ny * PL.u; y += 6) R(ctx, '#ffd24d', ppx(S.m), ppy(PL.ny) + y, 1, 3); ptxt(ctx, 'X=' + S.m, ppx(S.m) + 3, ppy(PL.ny) - 8, '#ffd24d');
      drawTri(ctx, T0.map(p => [ppx(p[0]), ppy(p[1])]), '#6f628f', .75, '#cdbff0', ['A', 'B', 'C']);
      if (S.sub !== 'ready' && !S.gone && S.fp !== undefined && S.sub !== 'reveal' && S.sub !== 'end' || (S.sub === 'reveal' || S.sub === 'end') && !S.gone) {
        const c = Math.cos(Math.PI * S.fp), P = T0.map(p => [ppx(S.m + (p[0] - S.m) * c + (S.ex || 0) * S.sl), ppy(p[1] + (S.ey || 0) * S.sl)]);
        drawTri(ctx, P, '#e86ab5', .75, '#ffd0ea', ['A', 'B', 'C']);
      }
      if (S.sub === 'result' && S.hit || S.sub === 'reveal' && S.hit) bolt(ctx, 36, 116, 292, 116, '#7fe0ff');
      if (S.sub === 'reveal' || S.sub === 'end') { const G = TRI.map(p => [ppx(2 * S.m - S.ax - p[0]), ppy(S.ay + p[1])]); [[0, 1], [1, 2], [2, 0]].forEach(e => pline(ctx, '#ffd24d', G[e[0]][0], G[e[0]][1], G[e[1]][0], G[e[1]][1], 1, 3)); pline(ctx, '#ffd24d', ppx(S.ax), ppy(S.ay), G[0][0], G[0][1], 1, 3); ptxt(ctx, '(' + S.ok[0] + ',' + S.ok[1] + ')', G[0][0] - 8, G[0][1] + 5, '#ffd24d'); }
    }
  };


export const STAGE_IMPL = IMPL;
export { drawPlane, PL, GY, ptxt, twidth, pline };
