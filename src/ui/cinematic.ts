import type { SaveData } from '../core/types';
import { CINE_BY_ID, HERO_LINE, MENTOR_DEF, Beat, Cinematic } from '../core/story';
import { heroById, spriteDefs, WORLD_COLOR } from '../core/data';
import { ActorClass, makeBg, overlay, gfxFlags, SGX } from '../gfx/scene';
import '../gfx/font';
import { ptxt, twidth, pline } from '../gfx/stages';
import { h, ticker } from './dom';
import { sfx, playMusic, playAmbient, stopAmbient } from './audio';

const GY = 140, W = 320, H = 180;
const bgCache: Record<string, HTMLCanvasElement> = {};
function bgFor(scene: string): HTMLCanvasElement {
  if (bgCache[scene]) return bgCache[scene];
  let cv: HTMLCanvasElement;
  if (scene === 'cosmos') {
    cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d')!;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07040f'); g.addColorStop(0.6, '#1c1040'); g.addColorStop(1, '#3a1e6a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  } else cv = makeBg(scene === 'academia' ? 'ciudadela' : scene, W, H, GY);
  return (bgCache[scene] = cv);
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
interface P { x: number; y: number; vx: number; vy: number; life: number; t: number; ch?: string; col: string; sz: number; ph: number }

export function playCinematic(o: { save: SaveData; id: string; mount: (el: HTMLElement, cleanup?: () => void) => void; done: () => void; persist: () => void; skipOnly?: boolean }): void {
  const cine: Cinematic = CINE_BY_ID[o.id]; if (!cine) { o.done(); return; }
  const save = o.save, hero = heroById[save.profile.heroId], first = hero.name.split(',')[0];
  const sub = (t: string) => t.replace('{n}', save.profile.name).replace('{h}', HERO_LINE[hero.id] ?? '');
  save.seen ??= []; if (!save.seen.includes(o.id)) save.seen.push(o.id); o.persist();

  const cv = h('canvas', { class: 'cine-cv', width: W, height: H, 'aria-label': 'Escena de la historia' }) as HTMLCanvasElement, ctx = cv.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d')!; tctx.imageSmoothingEnabled = false;
  const who = h('b', { class: 'cine-who' }), line = h('p', { class: 'cine-line' }), title = h('div', { class: 'cine-title' }, cine.title);
  const nextBtn = h('button', { class: 'pbtn', onclick: () => advance() }, 'Continuar ▶'), skipBtn = h('button', { class: 'pbtn small ghost cine-skip', onclick: () => finish() }, 'Saltar ⏭');
  const root = h('div', { class: 'cine' }, h('div', { class: 'cine-frame' }, cv, skipBtn, title), h('div', { class: 'cine-box' }, who, line, h('div', { class: 'cine-hint' }, nextBtn, h('span', { class: 'muted' }, 'Enter / Espacio / clic'))));

  let idx = -1, bt = 0, shown = 0, full = '', tk = 0, tacc = 0, finished = false;
  let beat!: Beat; let dur = 3000; const parts: P[] = []; let actors: { a: any; sil: boolean; x: number }[] = []; let fxT: Record<string, number> = {};
  let off: (() => void) | null = null;
  const kh = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); } else if (e.key === 'Escape') finish(); };
  document.addEventListener('keydown', kh);
  o.mount(root, () => { off?.(); off = null; document.removeEventListener('keydown', kh); });
  off = ticker.add(dt => frame(dt));

  const defFor = (id: string, flip?: boolean): any => {
    const base = id === 'hero' ? spriteDefs[hero.id] : id === 'mentor' ? MENTOR_DEF : spriteDefs[id];
    const d: any = { ...base, _id: id === 'hero' ? hero.id : id }, f = base.facing ?? 'left';
    if (flip) d.facing = f === 'right' ? 'left' : 'right'; else d.facing = f; return d;
  };
  function start(i: number): void {
    idx = i; beat = CINE_BY_ID[o.id].beats[i]; bt = 0; shown = 0; tacc = 0; parts.length = 0; fxT = {};
    full = sub(beat.line); const spk = beat.who === 'heroe' ? first : beat.who;
    who.textContent = spk && spk !== 'narrador' ? spk : ''; who.className = 'cine-who' + (beat.who === 'narrador' ? ' hide' : '');
    line.className = 'cine-line' + (beat.who === 'narrador' ? ' narr' : ''); line.textContent = '';
    dur = Math.max(3200, full.length * 60);
    actors = (beat.cast ?? []).map(c => { const a = new ActorClass(defFor(c.id, c.flip), 0, 0, 1); a.play(c.anim ?? 'idle'); a.x = c.x - a.def.size / 2; a.y = GY - Math.round((29 * a.def.size) / 32); return { a, sil: !!c.sil, x: c.x }; });
    (beat.fx ?? []).forEach(f => { fxT[f] = 0; });
    if (beat.sfx) sfx(beat.sfx);
    const w = beat.scene === 'cosmos' || beat.scene === 'academia' ? beat.scene : beat.scene;
    if (beat.music) playMusic(beat.music, 0); else if (idx === 0) playMusic('story', 0);
    if (beat.scene === 'cosmos') stopAmbient(); else playAmbient(beat.scene); void w;
    if (beat.layers?.includes('stars')) for (let k = 0; k < 60; k++) parts.push({ x: rnd(0, W), y: rnd(0, H * 0.8), vx: 0, vy: 0, life: 1e9, t: 0, col: '#ffffff', sz: Math.random() < .2 ? 2 : 1, ph: rnd(0, 6) });
  }
  function advance(): void {
    if (finished) return;
    if (shown < full.length) { shown = full.length; line.textContent = full; return; }
    if (idx + 1 >= CINE_BY_ID[o.id].beats.length) { finish(); return; }
    sfx('click'); start(idx + 1);
  }
  function finish(): void { if (finished) return; finished = true; off?.(); off = null; document.removeEventListener('keydown', kh); o.done(); }
  start(0);

  const wcol = (): string => WORLD_COLOR[beat.scene] ?? '#e0b84c';
  function spawn(dt: number): void {
    const L = beat.layers ?? [], c = wcol();
    if (L.includes('numbers') && Math.random() < dt / 90) parts.push({ x: rnd(0, W), y: -6, vx: 0, vy: rnd(0.3, 0.9), life: 9000, t: 0, ch: String(Math.floor(rnd(0, 10))), col: Math.random() < .5 ? '#e0b84c' : c, sz: Math.random() < .2 ? 2 : 1, ph: 0 });
    if (L.includes('fireflies') && Math.random() < dt / 260) parts.push({ x: rnd(0, W), y: rnd(60, 140), vx: rnd(-.15, .15), vy: rnd(-.1, .1), life: 5000, t: 0, col: '#d8f56a', sz: 2, ph: rnd(0, 6) });
    if (L.includes('dust') && Math.random() < dt / 200) parts.push({ x: rnd(0, W), y: rnd(20, 150), vx: rnd(-.12, .12), vy: rnd(-.05, .05), life: 6000, t: 0, col: '#f3ead8', sz: 1, ph: rnd(0, 6) });
    if (L.includes('embers') && Math.random() < dt / 120) parts.push({ x: rnd(0, W), y: H + 4, vx: rnd(-.2, .2), vy: -rnd(.3, .8), life: 5000, t: 0, col: Math.random() < .5 ? '#ff4f79' : '#b04fd1', sz: 2, ph: rnd(0, 6) });
  }
  function frame(dt: number): void {
    tk += dt; bt += dt; tacc += dt;
    if (shown < full.length) { while (tacc > 26 && shown < full.length) { tacc -= 26; shown++; if (shown % 3 === 0 && full[shown - 1] !== ' ') sfx('tick'); } line.textContent = full.slice(0, shown); }
    actors.forEach(x => x.a.step(dt));
    Object.keys(fxT).forEach(k => { fxT[k] += dt; });
    spawn(dt);
    const k = Math.min(1, bt / dur), [z0, z1, f0, f1] = beat.cam ?? [1, 1, 160, 160], z = z0 + (z1 - z0) * k, fx = Math.max(160 / z, Math.min(W - 160 / z, f0 + (f1 - f0) * k));
    ctx.clearRect(0, 0, W, H); ctx.save();
    const shake = fxT.shake !== undefined && fxT.shake < 700 && !gfxFlags.reduce ? (1 - fxT.shake / 700) * 4 : 0;
    ctx.translate(160 + Math.round((Math.random() - .5) * shake * 2), 112 + Math.round((Math.random() - .5) * shake * 2)); ctx.scale(z, z); ctx.translate(-fx, -112);
    ctx.drawImage(bgFor(beat.scene), 0, 0);
    if (beat.scene !== 'cosmos') overlay(ctx, beat.scene === 'academia' ? 'ciudadela' : beat.scene, Math.floor(tk / 125), W, H, GY);
    if (beat.scene === 'academia') { ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffb347'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    // estrellas, partículas de fondo
    parts.forEach(p => { if (p.life === 1e9) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(tk / 400 + p.ph)); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz); ctx.globalAlpha = 1; } });
    // sombras bajo los actores y actores
    actors.forEach(({ a, sil, x }) => {
      if (beat.scene !== 'cosmos') { ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; const w = a.def.size * 0.7; ctx.fillRect(Math.round(x - w / 2), GY + 1, Math.round(w), 3); ctx.globalAlpha = 1; }
      if (sil) { tctx.clearRect(0, 0, W, H); a.draw(tctx); tctx.globalCompositeOperation = 'source-atop'; tctx.fillStyle = '#0a0414'; tctx.fillRect(0, 0, W, H); tctx.globalCompositeOperation = 'source-over'; ctx.drawImage(tmp, 0, 0); const ex = a.x + a.def.size * 0.5, ey = a.y + a.def.size * 0.42, bl = Math.sin(tk / 500) > 0.95 ? 0 : 2; ctx.fillStyle = '#ff4f79'; ctx.fillRect(Math.round(ex - 6), Math.round(ey), 3, bl); ctx.fillRect(Math.round(ex + 3), Math.round(ey), 3, bl); } else a.draw(ctx);
    });
    parts.forEach(p => {
      if (p.life === 1e9) return; p.t += dt; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; const a = 1 - p.t / p.life; if (a <= 0) return;
      ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5)) * (p.ch ? 0.75 : 0.5 + 0.5 * Math.abs(Math.sin(tk / 300 + p.ph)));
      if (p.ch) ptxt(ctx, p.ch, Math.round(p.x), Math.round(p.y), p.col, p.sz + 1); else { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz); } ctx.globalAlpha = 1;
    });
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life !== 1e9 && (parts[i].t > parts[i].life || parts[i].y < -12 || parts[i].y > H + 12)) parts.splice(i, 1);
    if (beat.tint) { ctx.globalAlpha = 0.38; ctx.fillStyle = beat.tint; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (beat.scene === 'cosmos' && beat.line.length <= 8) { const s = 'x = x', sc = 7, w = twidth(s, sc); ctx.globalAlpha = Math.min(1, bt / 800); ptxt(ctx, s, 160 - w / 2 + 2, 70 + 2, '#3a1e6a', sc); ptxt(ctx, s, 160 - w / 2, 70, '#ffd24d', sc); ctx.globalAlpha = 1; }
    ctx.restore();
    // efectos de pantalla
    if (fxT.crack !== undefined && fxT.crack < 900) { const p = Math.min(1, fxT.crack / 250); let x = 150, y = 0; for (let i = 0; i < 14 * p; i++) { const nx = x + rnd(-14, 14) * (i % 3 ? 1 : .4), ny = y + 14; (pline as any)(ctx, '#ffffff', x, y, nx, ny, 3); (pline as any)(ctx, '#ff4f79', x, y, nx, ny, 1); x = nx; y = ny; } }
    if (fxT.flash !== undefined && fxT.flash < 600) { ctx.globalAlpha = 0.9 * (1 - fxT.flash / 600); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (fxT.fade !== undefined && fxT.fade < 900) { ctx.globalAlpha = 1 - fxT.fade / 900; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    // viñeta y barras de cine
    const g = ctx.createRadialGradient(160, 90, 70, 160, 90, 210); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const bar = Math.round(14 * Math.min(1, tk / 600)); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    if (idx === 0 && bt < 2600) { ctx.globalAlpha = Math.min(1, bt / 500) * (bt > 2000 ? (2600 - bt) / 600 : 1); title.style.opacity = String(ctx.globalAlpha); ctx.globalAlpha = 1; } else title.style.opacity = '0';
  }
  void SGX; void bgFor;
}
