import { ActorClass as Actor, gfxFlags, makeBg, overlay, SGX } from './scene';
import { C, STAGE_IMPL, floatText, burst } from './stages';
import type { Question } from '../core/types';
import { cast, fxFor, banner, bigNumber, telegraph, monsterDeath, hurtVignette, slashHero, sparks, flashScreen } from './vfx';
import type { CardFx } from './vfx';

export const GY = 140;
const WCOL = '#000';
type Def = any;

/** Escena de combate a 320×180: fondo, héroe, monstruo, efectos y retos animados. */
export class BattleView {
  readonly ctx: CanvasRenderingContext2D;
  bg!: HTMLCanvasElement; hero!: any; mon!: any; world = 'cavernas'; tk = 0; private acc = 0;
  fx: any[] = []; monVisible = true; heroVisible = true; shake = 0; flash = 0;
  freeze = 0; zoom = 0; tint: { col: string; left: number; total: number } | null = null; tweens: any[] = []; aura = 0; private tmp: HTMLCanvasElement | null = null;
  stage: { impl: any; S: any; done: boolean; ok: boolean; cb: (ok: boolean) => void } | null = null;
  constructor(readonly cv: HTMLCanvasElement) { cv.width = 320; cv.height = 180; this.ctx = cv.getContext('2d')!; this.ctx.imageSmoothingEnabled = false; }

  setup(world: string, heroDef: Def, monDef: Def): void {
    this.world = world; this.bg = makeBg(world, 320, 180, GY);
    this.hero = new Actor({ ...heroDef, _id: heroDef._id ?? 'hero' }, 0, 0, 1);
    this.mon = new Actor({ kind: 'monster', ...monDef, _id: monDef._id ?? 'mon' }, 0, 0, 1);
    this.monVisible = true; this.heroVisible = true; this.stage = null; this.fx = [];
    this.home();
  }
  home(): void {
    this.tweens = []; this.hero.x = 34; this.hero.y = GY - 29;
    const sz = this.mon.def.size; this.mon.x = sz > 32 ? 206 : 232; this.mon.y = GY - Math.round((29 * sz) / 32); this.hero.homeX = this.hero.x; this.mon.homeX = this.mon.x;
    this.hero.dirty = true;
  }
  /* ---- animaciones sueltas ---- */
  heroAttack(): void { this.hero.play('attack'); }
  /** Embiste hacia toX, aguanta y vuelve. Devuelve los ms hasta llegar. */
  dash(a: any, toX: number, ms: number): number {
    this.tweens.push({ a, from: a.x, to: toX, t: 0, dur: ms }); a.play('attack');
    this.tweens.push({ a, from: toX, to: a.homeX ?? a.x, t: -(ms + 220), dur: 200 }); return ms;
  }
  zoomPulse(z: number): void { if (!gfxFlags.reduce) this.zoom = Math.max(this.zoom, z); }
  tintMon(col: string, ms: number): void { this.tint = { col, left: ms, total: ms }; }
  setAura(level: number): void { this.aura = level; }
  cast(card: { id: string; type: string }, onHit: () => void): number { return cast(this, fxFor(card), onHit); }
  fxKind(card: { id: string; type: string }): CardFx { return fxFor(card); }
  banner(t: string, col?: string, y?: number): void { banner(this, t, col, y); }
  bigNum(t: string, x: number, y: number, col: string, crit = false): void { bigNumber(this, t, x, y, col, crit); }
  telegraph(ms = 700): void { telegraph(this, '#ff3c5a', ms); this.mon.play('idle'); }
  /** El monstruo se lanza sobre el héroe. */
  lunge(): number { const ms = 150; this.dash(this.mon, this.hero.x + 30, ms); return ms; }
  hurtFx(): void { hurtVignette(this); slashHero(this); this.shake = 300; this.freeze = 90; this.zoomPulse(0.04); }
  deathFx(): void { monsterDeath(this); }
  hitStop(ms: number): void { if (!gfxFlags.reduce) this.freeze = Math.max(this.freeze, ms); }
  hitFx(power: number, crit: boolean): void { this.flash = 170; this.shake = 140 + power * 25; this.hitStop(40 + power * 10); if (crit) { flashScreen(this, '#ffffff', 0.35, 140); this.zoomPulse(0.05); } void sparks; }
  heroHurt(): void { this.hero.play('hurt'); this.shake = 220; }
  heroWin(): void { this.hero.play('win'); }
  monAttack(): void { this.mon.play('attack'); }
  monHurt(): void { this.mon.play('hurt'); this.flash = 160; }
  monDie(): void { this.mon.play('die'); setTimeout(() => { this.monVisible = false; }, 800); }
  float(str: string, x: number, y: number, col: string): void { (floatText as any)(this as any, str, x, y, col); }
  burst(x: number, y: number, col: string, n = 14): void { (burst as any)(this as any, x, y, col, n); }
  monCenter(): [number, number] { const s = this.mon.def.size; return [this.mon.x + s / 2, this.mon.y + s / 2.4]; }
  heroCenter(): [number, number] { return [this.hero.x + 16, this.hero.y + 12]; }

  /* ---- retos animados ---- */
  beginStage(id: string, meta: Record<string, any>, q: Question, cb: (ok: boolean) => void): void {
    const impl = STAGE_IMPL[stageImplKey(id)]; this.monVisible = true;
    C.hero = this.hero; C.mon = this.mon; C.tk = this.tk;
    const S = impl.make(meta, q); this.fx = [];
    S.fx = this.fx;
    this.stage = { impl, S, done: false, ok: false, cb };
    C.finish = (ok: boolean) => { const st = this.stage; if (!st || st.done) return; st.S.phase = 'done'; st.done = true; st.ok = ok; st.cb(ok); };
    impl.setup(S);
  }
  stagePick(i: number): void { const st = this.stage; if (!st || st.S.phase !== 'ready') return; st.S.pick = i; st.S.phase = 'run'; st.impl.start(st.S); }
  pointer(type: 'move' | 'down', clientX: number, clientY: number): void {
    const st = this.stage; if (!st?.impl.pointer) return;
    const r = this.cv.getBoundingClientRect();
    st.impl.pointer(st.S, type, ((clientX - r.left) / r.width) * 320, ((clientY - r.top) / r.height) * 180);
  }
  stageReady(): boolean { return !!this.stage && this.stage.S.phase === 'ready'; }
  endStage(): void { this.stage = null; this.fx = []; this.home(); this.hero.play('idle'); this.mon.play('idle'); this.monVisible = true; }

  /* ---- bucle ---- */
  step(dt: number): void {
    this.acc += dt; if (this.acc >= 125) { this.acc = 0; this.tk++; }
    C.tk = this.tk;
    const adt = this.freeze > 0 ? 0 : dt; if (this.freeze > 0) this.freeze -= dt;
    this.hero.step(adt); this.mon.step(adt);
    for (const tw of this.tweens) { tw.t += dt; if (tw.t < 0) continue; const p = Math.min(1, tw.t / tw.dur); tw.a.x = Math.round(tw.from + (tw.to - tw.from) * (1 - Math.pow(1 - p, 3))); tw.a.dirty = true; }
    this.tweens = this.tweens.filter(tw => tw.t < tw.dur);
    if (this.zoom > 0) this.zoom = Math.max(0, this.zoom - dt * 0.0003);
    if (this.tint && (this.tint.left -= dt) <= 0) this.tint = null;
    if (this.shake > 0) this.shake -= dt; if (this.flash > 0) this.flash -= dt;
    const st = this.stage;
    if (st && (st.S.phase === 'run' || st.S.phase === 'ready') && st.impl.update) st.impl.update(st.S, dt);
    this.render(dt);
  }
  render(dt: number): void {
    const ctx = this.ctx; ctx.clearRect(0, 0, 320, 180);
    ctx.save();
    if (this.zoom > 0) { const z = 1 + this.zoom; ctx.translate(160, 100); ctx.scale(z, z); ctx.translate(-160, -100); }
    if (this.shake > 0 && !gfxFlags.reduce) ctx.translate(Math.round(Math.sin(this.shake * 0.9) * Math.min(4, this.shake / 60)), Math.round(Math.cos(this.shake * 1.3) * Math.min(3, this.shake / 90)));
    ctx.drawImage(this.bg, 0, 0); overlay(ctx, this.world, this.tk, 320, 180, GY);
    const st = this.stage;
    if (st?.impl.back) st.impl.back(ctx, st.S);
    ctx.globalAlpha = 0.35; ctx.fillStyle = WCOL;
    const sh = (a: any, on: boolean) => { if (!on) return; const w = a.def.size * 0.7; ctx.fillRect(Math.round(a.x + (a.def.size - w) / 2), GY + 1, Math.round(w), 3); };
    if (!st) { sh(this.hero, true); sh(this.mon, this.monVisible); } ctx.globalAlpha = 1;
    if (this.aura > 0 && !st && this.heroVisible && !gfxFlags.reduce) {
      const [ax, ay] = this.heroCenter(), pul = 0.5 + 0.5 * Math.sin(this.tk * 0.9), col = this.aura >= 5 ? '#ffd24d' : this.aura >= 3 ? '#ff9a3c' : '#6fb7ff';
      ctx.globalAlpha = 0.18 + 0.12 * pul; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ax, ay + 10, 17 + pul * 2, 24 + pul * 2, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
      if (this.tk % 2 === 0 && Math.random() < 0.5) sparks(this, ax - 10 + Math.random() * 20, ay + 26, col, 1, 0.3, 1.1, 700);
    }
    if (this.heroVisible) this.hero.draw(ctx);
    if (this.monVisible) {
      this.mon.draw(ctx);
      const wantFlash = this.flash > 0 && !gfxFlags.reduce, tint = this.tint;
      if (wantFlash || tint) {
        this.tmp ??= document.createElement('canvas'); this.tmp.width = 320; this.tmp.height = 180;
        const t2 = this.tmp.getContext('2d')!; t2.imageSmoothingEnabled = false; this.mon.draw(t2); t2.globalCompositeOperation = 'source-atop';
        t2.fillStyle = wantFlash ? '#ffffff' : tint!.col; t2.fillRect(0, 0, 320, 180);
        ctx.globalAlpha = wantFlash ? Math.min(1, this.flash / 120) : 0.35 + 0.15 * Math.sin(this.tk); ctx.drawImage(this.tmp, 0, 0); ctx.globalAlpha = 1;
      }
    }
    if (st?.impl.front) st.impl.front(ctx, st.S);
    this.fx = this.fx.filter(f => { f.t += dt; const p = f.t / f.life; if (p >= 1) return false; f.draw(ctx, p); return true; });
    if (st) st.S.fx = this.fx;
    ctx.restore();
  }
}
const KEYS: Record<string, string> = { projectile: 'projectile', clickpoint: 'clickpoint', slope: 'slope', ladder: 'ladder', translate: 'translate', reflect: 'reflect' };
const stageImplKey = (id: string): string => KEYS[id];
void SGX;
