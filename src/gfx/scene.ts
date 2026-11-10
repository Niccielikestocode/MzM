// @ts-nocheck
import { palettes as DATA_PAL } from '../core/data';
const DATA = { palettes: DATA_PAL as any };
/* Fondos por mundo, actores animados. Portado del Atlas (arte 100 % procedural). */
import '../../tools/spritegen.js';
const SG = (window as any).SpriteGen;
export const SGX = SG;
export const gfxFlags = { reduce: false };
  const cache = new Map();
  function getFrame(def, anim, t) {
    const k = def._id + '|' + anim + '|' + t;
    let f = cache.get(k);
    if (!f) { f = SG.frame(def, anim, t); cache.set(k, f); }
    return f;
  }
  export function Actor(def, x, y, scale) { this.def = def; this.x = x; this.y = y; this.scale = scale || 1; this.anim = 'idle'; this.t = 0; this.acc = 0; this.hold = 0; this.dirty = true; }
  Actor.prototype.play = function (anim) { this.anim = anim; this.t = 0; this.acc = 0; this.hold = 0; this.dirty = true; };
  Actor.prototype.step = function (dt) {
    if (this.hold > 0) { this.hold -= dt; if (this.hold <= 0) this.play('idle'); return; }
    const an = SG.ANIMS[this.anim];
    if (gfxFlags.reduce && this.anim === 'idle') return;
    this.acc += dt;
    const ms = 1000 / an.fps;
    while (this.acc >= ms) {
      this.acc -= ms; this.t++; this.dirty = true;
      if (this.t >= an.frames) {
        if (an.loop) this.t = 0;
        else if (this.anim === 'die') { this.t = an.frames - 1; this.hold = 1100; break; }
        else { this.play('idle'); break; }
      }
    }
  };
  Actor.prototype.draw = function (ctx) { SG.drawPixels(ctx, getFrame(this.def, this.anim, this.t), this.def.size, this.x, this.y, this.scale); };

  export function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  export const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  export function vgrad(ctx, W, y0, y1, cols) {
    const n = cols.length - 1;
    for (let y = y0; y < y1; y++) {
      const p = (y - y0) / (y1 - y0) * n, i = Math.min(n - 1, Math.floor(p)), f = p - i;
      for (let x = 0; x < W; x++) R(ctx, ((x + y) & 1) ? (f > 0.5 ? cols[i + 1] : cols[i]) : (f > 0.25 ? cols[i + 1] : cols[i]), x, y, 1, 1);
    }
  }
  export function disc(ctx, c, cx, cy, r) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) R(ctx, c, cx + x, cy + y, 1, 1); }
  export function makeBg(wid, W, H, gy) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'), P = DATA.palettes[wid === 'vacio' ? 'vacio' : wid], r = rng(wid.length * 91 + 7);
    if (wid === 'cavernas') {
      vgrad(ctx, W, 0, gy, [P[0], P[0], P[1]]);
      for (let x = 0; x < W; x++) { const h = 20 + 10 * Math.sin(x / 23) + 6 * Math.sin(x / 9); R(ctx, '#1a2432', x, gy - 22 - h, 1, 22 + h); }
      for (let i = 0; i < 24; i++) {
        const x = r() * W, w = 6 + r() * 10, h = 10 + r() * 32;
        for (let yy = 0; yy < h; yy++) { const hw = w / 2 * (1 - yy / h); R(ctx, P[1], x - hw, yy, hw * 2, 1); R(ctx, P[2], x - hw, yy, 1, 1); }
      }
      for (let i = 0; i < 6; i++) { const x = 20 + r() * (W - 40), h = 8 + r() * 10; for (let k = 0; k < 3; k++) { R(ctx, P[4], x + k * 4, gy - h + k * 3, 3, h - k * 3); R(ctx, P[3], x + k * 4 + 2, gy - h + k * 3, 1, h - k * 3); } }
      R(ctx, P[2], 0, gy, W, H - gy);
      for (let row = 0; row * 8 < H - gy; row++) { R(ctx, P[1], 0, gy + row * 8, W, 1); for (let x = (row % 2) * 8; x < W; x += 16) R(ctx, P[1], x, gy + row * 8, 1, 8); }
      R(ctx, P[3], 0, gy, W, 2);
    } else if (wid === 'bosque') {
      vgrad(ctx, W, 0, gy, [P[0], P[1]]);
      disc(ctx, P[7], 268, 24, 9); disc(ctx, P[1], 272, 21, 7);
      for (let x = -8; x < W; x += 14) { const h = 40 + r() * 24; for (let yy = 0; yy < h; yy++) R(ctx, '#15301f', x + 7 - yy * 0.28, gy - h + yy, yy * 0.56 + 1, 1); }
      const tx = [30, 96, 170, 236, 296];
      tx.forEach((x, i) => {
        R(ctx, '#3b2a20', x, gy - 54, 6, 54); R(ctx, '#55402f', x, gy - 54, 2, 54);
        [[3, -64, 22], [-6, -52, 17], [12, -52, 17]].forEach(c => { for (let y = -c[2]; y <= c[2]; y++) { const hw = Math.sqrt(c[2] * c[2] - y * y) * 1.15; R(ctx, P[2], x + c[0] - hw, gy + c[1] + y, hw * 2, 1); } });
        for (let k = 0; k < 14; k++) R(ctx, P[3], x - 14 + r() * 34, gy - 78 + r() * 22, 3, 2);
      });
      R(ctx, P[1], 0, gy, W, H - gy); R(ctx, P[2], 0, gy, W, 3);
      for (let x = 0; x < W; x += 2) R(ctx, P[3], x, gy - 1 - Math.floor(r() * 3), 1, 2);
      for (let i = 0; i < 14; i++) { const x = r() * W; R(ctx, P[2], x, gy - 4, 1, 4); R(ctx, P[5], x - 1, gy - 6, 3, 3); R(ctx, P[7], x, gy - 5, 1, 1); }
    } else if (wid === 'ciudadela') {
      vgrad(ctx, W, 0, gy, [P[0], P[1]]);
      for (let i = 0; i < 40; i++) R(ctx, P[7], r() * W, r() * (gy - 50), 1, 1);
      for (let x = -6; x < W; x += 20) { const h = 30 + r() * 40, w = 14 + r() * 8; R(ctx, '#201b32', x, gy - h, w, h); }
      let x = 4;
      while (x < W) {
        const w = 22 + Math.floor(r() * 12), h = 54 + Math.floor(r() * 40);
        R(ctx, P[2], x, gy - h, w, h); R(ctx, P[3], x, gy - h, w, 2); R(ctx, '#3a3560', x + w - 3, gy - h, 3, h);
        R(ctx, P[3], x + w / 2, gy - h - 8, 1, 8);
        for (let wy = gy - h + 8; wy < gy - 6; wy += 8) for (let wx = x + 4; wx < x + w - 6; wx += 7) { const q = r(); R(ctx, q < 0.45 ? P[5] : q < 0.62 ? P[6] : P[1], wx, wy, 3, 4); }
        x += w + 4 + Math.floor(r() * 10);
      }
      R(ctx, P[1], 0, gy, W, H - gy); R(ctx, P[3], 0, gy, W, 2);
      ctx.globalAlpha = 0.5; for (let gx = 0; gx < W; gx += 16) R(ctx, P[6], gx, gy + 2, 1, H - gy); for (let gyy = gy + 8; gyy < H; gyy += 10) R(ctx, P[6], 0, gyy, W, 1); ctx.globalAlpha = 1;
    } else {
      R(ctx, P[0], 0, 0, W, H);
      for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * gy; R(ctx, P[6], x, y, 1, 1); if (i % 5 === 0) R(ctx, P[6], x + 3, y, 1, 1); }
      for (let rr = 26; rr > 0; rr--) { const c = rr > 21 ? P[2] : rr > 17 ? P[3] : rr > 13 ? P[4] : '#000'; disc(ctx, c, 232, Math.round(gy * 0.42), rr); }
      R(ctx, P[1], 0, gy, W, H - gy); R(ctx, P[2], 0, gy, W, 2);
      for (let i = 0; i < 9; i++) { let x = r() * W, y = gy + 4; for (let k = 0; k < 6; k++) { R(ctx, P[5], x, y, 1, 1); x += (r() - 0.5) * 8; y += 3 + r() * 3; if (y > H) break; } }
    }
    return cv;
  }
  export function overlay(ctx, wid, tk, W, H, gy) {
    const P = DATA.palettes[wid];
    if (wid === 'cavernas') {
      [36, 160, 284].forEach((x, i) => {
        R(ctx, '#5a3a22', x, gy - 34, 3, 34); R(ctx, '#3b2a20', x - 3, gy - 36, 9, 3);
        const f = (tk + i) % 3;
        R(ctx, P[5], x - 1, gy - 46 - f, 5, 10 + f); R(ctx, P[6], x, gy - 43 - f, 3, 7); R(ctx, '#fff3c4', x + 1, gy - 40, 1, 3);
        ctx.globalAlpha = 0.04 + 0.02 * f; ctx.fillStyle = P[5]; ctx.beginPath(); ctx.arc(x + 1, gy - 40, 26, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
      });
      for (let i = 0; i < 5; i++) if ((tk + i * 3) % 7 === 0) R(ctx, '#fff', 30 + i * 62, gy - 14 - (i % 3) * 3, 1, 1);
    } else if (wid === 'bosque') {
      for (let i = 0; i < 12; i++) { const x = (i * 29 + 14 * Math.sin(tk * 0.15 + i)) % W, y = 40 + (i * 13) % 52 + 6 * Math.sin(tk * 0.2 + i * 2); if ((tk + i) % 5 !== 0) { R(ctx, P[4], x, y, 2, 2); ctx.globalAlpha = 0.18; R(ctx, P[4], x - 1, y - 1, 4, 4); ctx.globalAlpha = 1; } }
    } else if (wid === 'ciudadela') {
      const rx = 12 + (tk % 8 < 4 ? 2 : 0);
      for (let a = 0; a < 40; a++) { const t = a / 40 * 6.283; R(ctx, P[6], 96 + Math.cos(t) * rx * 1.4, 60 + Math.sin(t) * 5, 1, 1); R(ctx, P[6], 96 + Math.cos(t) * rx * 0.9, 50 + Math.sin(t) * 3, 1, 1); }
      for (let i = 0; i < 4; i++) if ((tk + i * 2) % 6 === 0) R(ctx, P[7], 20 + i * 90, 12 + i * 5, 1, 1);
      R(ctx, P[6], 96, 52, 1, 20);
    } else {
      for (let k = 0; k < 16; k++) { const a = tk * 0.35 + k * 0.4, rr = 14 + (k % 3) * 4 + k * 0.4; R(ctx, k % 2 ? P[4] : P[5], 232 + Math.cos(a) * rr * 1.3, Math.round(gy * 0.42) + Math.sin(a) * rr * 0.5, 1, 1); }
      [[40, 40], [110, 60], [170, 28]].forEach((p, i) => SG.drawGlyph(ctx, 'eq', p[0], p[1] + Math.round(2 * Math.sin(tk * 0.3 + i)), 2, P[4]));
    }
  }

  /* ---------- escenas (varios actores sobre un fondo) ---------- */
export const ActorClass: any = Actor;
