/** Audio: efectos y ambientes sintetizados, música procedural y soundtracks MP3 para combate y menús. */
let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musBus: GainNode, ambBus: GainNode, delayBus: GainNode;
const vol = { sfx: 0.8, music: 0.5, amb: 0.6, on: true };
let noiseBuf: AudioBuffer | null = null;
let audioUnlocked = false;

export function setSound(on: boolean): void {
  vol.on = on;
  if (!on) { clearInterval(cinematicFadeT); cinematicFadeT = 0; }
  applyAll();
  if (on) { resumeBattleSoundtrack(); resumeCinematicSoundtrack(); }
}
export function setVolumes(v: { sfx?: number; music?: number; amb?: number }): void { Object.assign(vol, v); applyAll(); }
function apply(): void {
  if (!ctx) return; const t = ctx.currentTime;
  master.gain.setTargetAtTime(vol.on ? 1 : 0, t, 0.05); sfxBus.gain.setTargetAtTime(vol.sfx, t, 0.05);
  musBus.gain.setTargetAtTime(vol.music * 0.5, t, 0.1); ambBus.gain.setTargetAtTime(vol.amb * 0.5, t, 0.1);
}
function applyAll(): void { apply(); fileVol(); battleFileVol(); cinematicFileVol(); }
function ac(): AudioContext | null {
  if (!audioUnlocked || isHidden || !vol.on) return null;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain(); sfxBus = ctx.createGain(); musBus = ctx.createGain(); ambBus = ctx.createGain(); delayBus = ctx.createGain();
      const comp = ctx.createDynamicsCompressor(); master.connect(comp).connect(ctx.destination);
      sfxBus.connect(master); musBus.connect(master); ambBus.connect(master);
      const d = ctx.createDelay(1); d.delayTime.value = 0.28; const fb = ctx.createGain(); fb.gain.value = 0.35; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      delayBus.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(master); delayBus.gain.value = 0.5;
      const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      apply();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return vol.on ? ctx : null;
  } catch { return null; }
}
/** Hay que llamarlo desde un gesto del usuario para que el navegador permita sonar. */
export function unlockAudio(): void { audioUnlocked = true; ac(); fileResume(); resumeBattleSoundtrack(); resumeCinematicSoundtrack(); }

type Out = AudioNode;
function tone(freq: number, dur: number, type: OscillatorType, v: number, delay = 0, slide = 0, out?: Out, echo = 0): void {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? sfxBus); if (echo) { const e = c.createGain(); e.gain.value = echo; g.connect(e).connect(delayBus); }
  o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur: number, v: number, f0: number, f1: number, type: BiquadFilterType = 'bandpass', delay = 0, q = 1, out?: Out): void {
  const c = ac(); if (!c || !noiseBuf) return;
  const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out ?? sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

export type Sfx = 'click' | 'ok' | 'bad' | 'hit' | 'hurt' | 'heal' | 'win' | 'lose' | 'card' | 'block'
  | 'slash' | 'zap' | 'fire' | 'shield' | 'explode' | 'roar' | 'whoosh' | 'crit' | 'coin' | 'step' | 'swell' | 'tick' | 'freeze' | 'charge'
  | 'jump' | 'land' | 'dash' | 'swing1' | 'swing2' | 'swing3' | 'orb' | 'orbok' | 'orbbad' | 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'alarm' | 'slam' | 'proj' | 'meteor' | 'break' | 'cd';
export function sfx(n: Sfx): void {
  switch (n) {
    case 'click': tone(520, 0.05, 'square', 0.05); break;
    case 'tick': tone(900, 0.025, 'square', 0.025); break;
    case 'card': noise(0.09, 0.22, 3000, 900, 'highpass'); tone(380, 0.06, 'triangle', 0.08); tone(560, 0.07, 'triangle', 0.06, 0.05); break;
    case 'ok': tone(523, 0.09, 'square', 0.07, 0, 0, undefined, 0.2); tone(784, 0.16, 'square', 0.07, 0.08, 0, undefined, 0.3); tone(1046, 0.2, 'triangle', 0.05, 0.16); break;
    case 'bad': tone(200, 0.28, 'sawtooth', 0.08, 0, -120); tone(150, 0.3, 'square', 0.05, 0.06, -90); break;
    case 'hit': noise(0.12, 0.5, 1800, 200, 'lowpass'); tone(160, 0.14, 'square', 0.12, 0, -110); break;
    case 'slash': noise(0.16, 0.35, 1200, 5200, 'bandpass', 0, 2); tone(900, 0.1, 'sawtooth', 0.04, 0.02, -600); break;
    case 'whoosh': noise(0.28, 0.25, 300, 2500, 'bandpass', 0, 1.5); break;
    case 'zap': tone(1200, 0.22, 'sawtooth', 0.07, 0, -1000, undefined, 0.3); tone(600, 0.18, 'square', 0.05, 0.03, 700); noise(0.18, 0.2, 5000, 2000, 'highpass'); break;
    case 'fire': noise(0.45, 0.35, 600, 200, 'lowpass', 0, 0.8); tone(220, 0.35, 'sawtooth', 0.05, 0, 160); break;
    case 'freeze': [1568, 1318, 1046, 880].forEach((f, i) => tone(f, 0.22, 'sine', 0.06, i * 0.05, 0, undefined, 0.4)); break;
    case 'shield': tone(660, 0.12, 'triangle', 0.09, 0, 0, undefined, 0.3); tone(990, 0.25, 'sine', 0.07, 0.07, 0, undefined, 0.4); noise(0.2, 0.12, 4000, 1500, 'bandpass'); break;
    case 'block': tone(300, 0.08, 'square', 0.07); tone(200, 0.1, 'square', 0.05, 0.05); noise(0.1, 0.25, 2500, 800, 'bandpass'); break;
    case 'charge': tone(110, 0.55, 'sawtooth', 0.08, 0, 220); noise(0.55, 0.15, 200, 1800, 'bandpass'); break;
    case 'explode': noise(0.7, 0.7, 1400, 60, 'lowpass'); tone(80, 0.5, 'sine', 0.2, 0, -50); break;
    case 'roar': tone(90, 0.5, 'sawtooth', 0.1, 0, -30); tone(135, 0.5, 'square', 0.05, 0.02, -40); noise(0.5, 0.2, 600, 150, 'lowpass'); break;
    case 'hurt': tone(150, 0.3, 'sawtooth', 0.11, 0, -90); noise(0.15, 0.4, 900, 150, 'lowpass'); break;
    case 'crit': tone(1318, 0.1, 'square', 0.07); tone(1760, 0.2, 'square', 0.07, 0.07, 0, undefined, 0.3); noise(0.2, 0.3, 6000, 2000, 'highpass'); break;
    case 'heal': [440, 554, 659, 880].forEach((f, i) => tone(f, 0.18, 'sine', 0.07, i * 0.07, 0, undefined, 0.35)); break;
    case 'coin': tone(988, 0.07, 'square', 0.06); tone(1319, 0.18, 'square', 0.06, 0.07); break;
    case 'step': noise(0.05, 0.12, 400, 200, 'lowpass'); break;
    case 'swell': tone(196, 1.2, 'sawtooth', 0.04, 0, 100, undefined, 0.4); tone(294, 1.2, 'triangle', 0.05, 0, 150, undefined, 0.4); break;
    case 'jump': tone(300, 0.14, 'square', 0.06, 0, 380); break;
    case 'land': noise(0.08, 0.2, 500, 150, 'lowpass'); tone(110, 0.08, 'triangle', 0.08, 0, -40); break;
    case 'dash': noise(0.2, 0.3, 500, 4000, 'bandpass', 0, 1.2); tone(500, 0.12, 'sawtooth', 0.04, 0, -300); break;
    case 'swing1': noise(0.1, 0.3, 1400, 4200, 'bandpass', 0, 2); tone(700, 0.07, 'sawtooth', 0.04, 0, -300); break;
    case 'swing2': noise(0.1, 0.32, 1700, 5000, 'bandpass', 0, 2); tone(820, 0.07, 'sawtooth', 0.045, 0, -350); break;
    case 'swing3': noise(0.18, 0.4, 900, 6000, 'bandpass', 0, 2); tone(520, 0.16, 'sawtooth', 0.07, 0, -380); tone(260, 0.2, 'square', 0.05, 0.02, -120); break;
    case 'orb': tone(880, 0.1, 'sine', 0.05, 0, 0, undefined, 0.4); tone(1320, 0.14, 'sine', 0.04, 0.06, 0, undefined, 0.4); break;
    case 'orbok': noise(0.5, 0.6, 2400, 80, 'lowpass'); tone(120, 0.4, 'sine', 0.2, 0, -70); [784, 1046, 1568].forEach((f, i) => tone(f, 0.2, 'square', 0.07, i * 0.06, 0, undefined, 0.3)); break;
    case 'orbbad': noise(0.3, 0.45, 1000, 100, 'lowpass'); tone(170, 0.35, 'sawtooth', 0.1, 0, -110); tone(120, 0.35, 'square', 0.06, 0.05, -60); break;
    case 'combo1': tone(660, 0.09, 'square', 0.06); tone(880, 0.12, 'square', 0.06, 0.06); break;
    case 'combo2': [660, 880, 1100].forEach((f, i) => tone(f, 0.1, 'square', 0.065, i * 0.055, 0, undefined, 0.2)); break;
    case 'combo3': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.07, i * 0.055, 0, undefined, 0.3)); noise(0.3, 0.2, 3000, 800, 'highpass'); break;
    case 'combo4': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.05, 0, undefined, 0.35)); tone(130, 0.6, 'sawtooth', 0.09, 0, 60); noise(0.5, 0.3, 4000, 400, 'bandpass'); break;
    case 'alarm': tone(988, 0.07, 'square', 0.05); tone(988, 0.07, 'square', 0.05, 0.12); break;
    case 'slam': noise(0.45, 0.6, 600, 60, 'lowpass'); tone(70, 0.4, 'sine', 0.25, 0, -30); break;
    case 'proj': tone(380, 0.2, 'sawtooth', 0.05, 0, -200); noise(0.2, 0.2, 800, 300, 'bandpass'); break;
    case 'meteor': tone(900, 0.4, 'sawtooth', 0.04, 0, -700); noise(0.5, 0.4, 1200, 80, 'lowpass', 0.3); break;
    case 'break': noise(0.2, 0.3, 3000, 600, 'highpass'); tone(300, 0.15, 'triangle', 0.08, 0, -150); break;
    case 'cd': tone(1200, 0.05, 'sine', 0.05); tone(1800, 0.08, 'sine', 0.05, 0.05); break;
    case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'square', 0.07, i * 0.1, 0, undefined, 0.3)); tone(523, 0.9, 'triangle', 0.06, 0.5); break;
    case 'lose': [330, 262, 220, 165].forEach((f, i) => tone(f, 0.34, 'triangle', 0.1, i * 0.2, 0, undefined, 0.3)); break;
  }
}
/** Sonido de la carta jugada según su efecto. */
export function sfxForCard(kind: string): void {
  const m: Record<string, Sfx> = { slash: 'slash', bolt: 'zap', fire: 'fire', shield: 'shield', heal: 'heal', ice: 'freeze', arrow: 'whoosh', meteor: 'explode', wave: 'zap', nova: 'crit' };
  sfx(m[kind] ?? 'whoosh');
}

/* ============================ MÚSICA DINÁMICA ============================ */
interface Track { bpm: number; root: number; scale: number[]; prog: number[][]; lead: 'square' | 'triangle' | 'sawtooth'; pad: OscillatorType; bass: OscillatorType; seed: number; swing?: number; density: number }
const MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], MIX = [0, 2, 4, 5, 7, 9, 10], PHR = [0, 1, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11], PENT = [0, 2, 4, 7, 9];
export const TRACKS: Record<string, Track> = {
  menu:      { bpm: 84,  root: 57, scale: DOR,  prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], lead: 'triangle', pad: 'sine', bass: 'triangle', seed: 3, density: 0.45 },
  overworld: { bpm: 108, root: 60, scale: MAJ,  prog: [[0, 2, 4], [4, 6, 1], [5, 0, 2], [3, 5, 0]], lead: 'square',   pad: 'triangle', bass: 'triangle', seed: 19, density: 0.65 },
  dojo:      { bpm: 78,  root: 55, scale: PENT, prog: [[0, 2, 4], [2, 4, 1], [3, 0, 2], [4, 1, 3]], lead: 'triangle', pad: 'sine', bass: 'sine', seed: 7, density: 0.4 },
  story:     { bpm: 64,  root: 50, scale: DOR,  prog: [[0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1]], lead: 'triangle', pad: 'sine', bass: 'sine', seed: 8, density: 0.3 },
  cavernas:  { bpm: 88,  root: 52, scale: MIN,  prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [6, 1, 3]], lead: 'triangle', pad: 'sine', bass: 'triangle', seed: 11, density: 0.5 },
  bosque:    { bpm: 104, root: 55, scale: DOR,  prog: [[0, 2, 4], [3, 5, 0], [6, 1, 3], [4, 6, 1]], lead: 'square',   pad: 'triangle', bass: 'triangle', seed: 21, density: 0.62 },
  ciudadela: { bpm: 116, root: 53, scale: MIX,  prog: [[0, 2, 4], [6, 1, 3], [3, 5, 0], [4, 6, 1]], lead: 'sawtooth', pad: 'triangle', bass: 'square', seed: 31, density: 0.68 },
  vacio:     { bpm: 128, root: 45, scale: PHR,  prog: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [6, 1, 3]], lead: 'sawtooth', pad: 'sawtooth', bass: 'sawtooth', seed: 41, density: 0.75 },
  victoria:  { bpm: 104, root: 60, scale: MAJ,  prog: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [0, 2, 4]], lead: 'square',   pad: 'triangle', bass: 'triangle', seed: 51, density: 0.75 }
};
const UNIT_BATTLE_SOUNDTRACKS: Record<string, string> = {
  cavernas: 'music/The_Integer_Duel.mp3',
  bosque: 'music/Arc_of_the_Final_Strike.mp3',
  ciudadela: 'music/The_Pythagorean_Gambit.mp3'
};
const REGULAR_BATTLE_SOUNDTRACKS: Record<string, string> = {
  cavernas: 'music/Steel_Stance.mp3',
  bosque: 'music/Quadratic_Strike.mp3',
  ciudadela: 'music/The_Acute_Angle.mp3'
};
const FINAL_BOSS_SOUNDTRACK = 'music/The_Geometry_of_Ruin.mp3';
export type BattleMusicKind = 'common' | 'regular' | 'unit' | 'final';
export function battleMusicKind(world: string, bossFight: boolean, unitBossLevel: boolean, finalLevel: boolean): BattleMusicKind {
  if (finalLevel) return 'final';
  if (unitBossLevel) return 'unit';
  if (REGULAR_BATTLE_SOUNDTRACKS[world]) return 'regular';
  if (bossFight) return 'unit';
  return 'common';
}
export function battleSoundtrackPath(world: string, kind: BattleMusicKind): string | null {
  if (kind === 'common') return null;
  if (kind === 'final') return FINAL_BOSS_SOUNDTRACK;
  return (kind === 'regular' ? REGULAR_BATTLE_SOUNDTRACKS : UNIT_BATTLE_SOUNDTRACKS)[world] ?? null;
}
let cur: { name: string; intensity: number } | null = null;
let timer = 0, nextT = 0, step = 0, bar = 0, rngS = 1;
let isHidden = false;
let musicMode: 'dynamic' | 'soundtrack' = 'dynamic';

export function setMusicMode(m: 'dynamic' | 'soundtrack'): void {
  if (musicMode === m) return;
  musicMode = m;
  if (battleFileWanted) return;
  if (cur) {
    const n = cur.name, i = cur.intensity;
    cur = null;
    playMusic(n, i);
  }
}

const r = () => { rngS = (rngS * 1664525 + 1013904223) >>> 0; return rngS / 4294967296; };
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function degree(t: Track, d: number, oct = 0): number { const n = t.scale.length; return t.root + t.scale[((d % n) + n) % n] + 12 * (Math.floor(d / n) + oct); }
let motif: number[] = [];
function schedule(): void {
  if (isHidden || !vol.on) return;
  const c = ac(); if (!c || c.state !== 'running' || !cur) return;
  if (nextT < c.currentTime) nextT = c.currentTime + 0.04;
  const t = TRACKS[cur.name] ?? TRACKS.menu;
  const bpmBoost = cur.intensity >= 2 ? 1.12 : cur.intensity === 1 ? 1.04 : 1;
  const spb = 60 / (t.bpm * bpmBoost) / 2; // corchea
  let guard = 0;
  while (nextT < c.currentTime + 0.35 && guard++ < 4) {
    const chord = t.prog[bar % t.prog.length], at = Math.max(0, nextT - c.currentTime), s16 = step % 16, inten = cur.intensity;
    if (s16 === 0) { // pad + bajo sostenido
      chord.forEach(d => tone(hz(degree(t, d, 0)), spb * 15, t.pad, 0.042, at, 0, musBus, 0.25));
      tone(hz(degree(t, chord[0], -2)), spb * 7.5, t.bass, 0.16, at, 0, musBus);
      if (bar % 4 === 0) { rngS = t.seed * 977 + bar * 13; motif = Array.from({ length: 8 }, () => Math.floor(r() * 7)); }
    }
    if (s16 % 4 === 2 || (inten > 0 && s16 % 2 === 0)) tone(hz(degree(t, chord[0], -2)), spb * 1.4, t.bass, 0.13, at, 0, musBus); // pulso de bajo
    // arpegio 16-bit
    if (s16 % 2 === 0 || (t.density > 0.6 && s16 % 2 === 1 && r() < 0.3)) { const d = chord[(s16 >> 1) % 3]; tone(hz(degree(t, d, 1)), spb * 1.5, 'triangle', 0.052, at, 0, musBus, 0.28); }
    // melodía
    if (s16 % 2 === 0 && r() < t.density * (inten ? 1.2 : 0.85)) { const d = motif[(s16 >> 1) % motif.length] + (bar % 2 ? 2 : 0); tone(hz(degree(t, d, 2)), spb * (1 + r()), t.lead, 0.048, at, 0, musBus, 0.32); }
    // percusión reactiva
    if (inten > 0 || t.density > 0.55) {
      if (s16 % 8 === 0) { tone(110, 0.14, 'sine', 0.24, at, -70, musBus); noise(0.05, 0.06, 150, 60, 'lowpass', at, 1, musBus); }
      if (s16 % 8 === 4) noise(0.12, 0.11, 2200, 1500, 'bandpass', at, 1.5, musBus);
      if (s16 % 2 === 1 && inten > 0) noise(0.03, 0.045, 7000, 7000, 'highpass', at, 1, musBus);
      if (inten > 1 && s16 % 4 === 3) tone(85, 0.1, 'sine', 0.2, at, -40, musBus);
    } else if (s16 % 8 === 0) noise(0.08, 0.04, 1800, 1800, 'bandpass', at, 3, musBus);
    nextT += spb; step++; if (step % 16 === 0) bar++;
  }
}

/* ---------- Pistas MP3 opcionales para menús y jefes ---------- */
const SOUNDTRACK_URL: string = (globalThis as any).__JM_SOUNDTRACK__ ?? (import.meta.env.BASE_URL + 'music/beyond-the-kingdom-gates.mp3');
const DEFEAT_SOUNDTRACK_PATH = 'music/Victory_at_the_Limit.mp3';
let fileEl: HTMLAudioElement | null = null, fileOk = true, fileWanted = false, fadeT = 0;
let battleFileEl: HTMLAudioElement | null = null, battleFileWanted = false, battleFilePath = '';
let battleFallback: { name: string; intensity: number } | null = null, battleFileName = '';
let battleFileStatus: 'loading' | 'playing' | 'blocked' | null = null;
let cinematicFileEl: HTMLAudioElement | null = null, cinematicFileWanted = false, cinematicFadeT = 0, battleFadeT = 0;
const fileTarget = (): number => (vol.on && fileWanted && !isHidden ? Math.min(1, vol.music * 0.7) : 0);
const battleFileTarget = (): number => (vol.on && battleFileWanted && !isHidden ? Math.min(1, vol.music * 0.7) : 0);
const cinematicFileTarget = (): number => (vol.on && cinematicFileWanted && !isHidden ? Math.min(1, vol.music * 0.7) : 0);
function fileGet(): HTMLAudioElement | null {
  if (!fileOk || typeof Audio === 'undefined') return null;
  if (!fileEl) {
    fileEl = new Audio(SOUNDTRACK_URL); fileEl.loop = true; fileEl.preload = 'auto'; fileEl.volume = 0;
    fileEl.addEventListener('error', () => { fileOk = false; fileEl = null; if (cur) { const n = cur.name, i = cur.intensity; cur = null; playMusic(n, i); } });
  }
  return fileEl;
}
function fileVol(): void { if (fileEl) fileEl.volume = Math.max(0, Math.min(1, fileTarget())); }
function fileFade(to: number, ms: number, done?: () => void): void {
  clearInterval(fadeT); const a = fileEl; if (!a) { done?.(); return; }
  const from = a.volume, n = Math.max(1, Math.round(ms / 40)); let k = 0;
  fadeT = window.setInterval(() => { k++; a.volume = Math.max(0, Math.min(1, from + (to - from) * (k / n))); if (k >= n) { clearInterval(fadeT); done?.(); } }, 40);
}
function fadeElement(a: HTMLAudioElement, to: number, ms: number, done?: () => void): number {
  if (ms <= 0) { a.volume = to; done?.(); return 0; }
  const from = a.volume, n = Math.max(1, Math.round(ms / 40)); let k = 0, timer = 0;
  timer = window.setInterval(() => {
    k++; a.volume = Math.max(0, Math.min(1, from + (to - from) * (k / n)));
    if (k >= n) { clearInterval(timer); done?.(); }
  }, 40);
  return timer;
}
function fileResume(): void {
  if (!fileWanted || isHidden) return; const a = fileGet(); if (!a) return;
  if (a.paused) { a.volume = 0; void a.play().then(() => fileFade(fileTarget(), 700)).catch(() => { /* espera gesto */ }); } else fileFade(fileTarget(), 500);
}
function fileStart(): void { fileWanted = true; fileResume(); }
function fileStop(ms = 350): void { fileWanted = false; if (!fileEl) return; const a = fileEl; fileFade(0, ms, () => { if (!fileWanted) a.pause(); }); }
function battleFileVol(): void { if (battleFileEl) battleFileEl.volume = battleFileTarget(); }
function cinematicFileVol(): void { if (cinematicFileEl) cinematicFileEl.volume = cinematicFileTarget(); }
function stopBattleSoundtrack(): void {
  clearInterval(battleFadeT); battleFadeT = 0;
  battleFileWanted = false; battleFilePath = ''; battleFallback = null; battleFileName = ''; battleFileStatus = null;
  if (battleFileEl) { battleFileEl.pause(); battleFileEl = null; }
}
function failBattleSoundtrack(a: HTMLAudioElement): void {
  if (battleFileEl !== a) return;
  const fallback = battleFallback;
  console.error(`No se pudo reproducir la pista de jefe "${battleFileName}".`, a.error);
  stopBattleSoundtrack();
  if (fallback) { cur = null; playMusic(fallback.name, fallback.intensity); }
}
function resumeBattleSoundtrack(): void {
  if (!battleFileWanted || isHidden || !vol.on || !battleFileEl) return;
  const a = battleFileEl;
  a.volume = battleFileTarget();
  if (a.paused) {
    battleFileStatus = 'loading';
    void a.play().then(() => {
      if (battleFileEl === a) battleFileStatus = 'playing';
    }).catch(error => {
      if (error instanceof Error && error.name === 'NotAllowedError') battleFileStatus = 'blocked';
      else failBattleSoundtrack(a);
    });
  }
}
export function playBattleMusic(world: string, kind: BattleMusicKind): void {
  stopCinematicSoundtrack(500);
  const trackName = TRACKS[world] ? world : 'menu';
  const path = battleSoundtrackPath(world, kind);
  if (!path || typeof Audio === 'undefined') { playMusic(trackName, kind === 'common' ? 1 : 2); return; }
  if (battleFileWanted && battleFilePath === path && battleFileEl) {
    cur = { name: trackName, intensity: 2 };
    clearInterval(timer); timer = 0;
    resumeBattleSoundtrack();
    return;
  }
  stopBattleSoundtrack();
  fileStop(250);
  cur = { name: trackName, intensity: 2 };
  clearInterval(timer); timer = 0;
  const a = new Audio(new URL(import.meta.env.BASE_URL + path, document.baseURI).href);
  a.loop = true; a.preload = 'auto'; a.volume = 0;
  battleFileEl = a; battleFileWanted = true; battleFilePath = path; battleFileStatus = 'loading'; battleFileName = path.split('/').pop() ?? path;
  battleFallback = { name: trackName, intensity: 2 };
  a.addEventListener('error', () => failBattleSoundtrack(a));
  a.load();
  resumeBattleSoundtrack();
}

export function stopBattleMusic(ms = 700): void {
  battleFileWanted = false; battleFallback = null; battleFileName = ''; battleFileStatus = null;
  const a = battleFileEl;
  if (!a) { battleFilePath = ''; return; }
  clearInterval(battleFadeT);
  battleFadeT = fadeElement(a, 0, ms, () => {
    if (battleFileEl === a) { a.pause(); battleFileEl = null; battleFilePath = ''; }
    battleFadeT = 0;
  });
}

export function playCinematicSoundtrack(): void {
  stopCinematicSoundtrack(0);
  clearInterval(timer); timer = 0; cur = null; fileStop(700);
  if (ctx && musBus) musBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);

  const battle = battleFileEl;
  battleFileWanted = false; battleFallback = null; battleFilePath = ''; battleFileName = ''; battleFileStatus = null;
  clearInterval(battleFadeT); battleFadeT = 0;
  if (battle) {
    battleFadeT = fadeElement(battle, 0, 1300, () => {
      if (battleFileEl === battle) { battle.pause(); battleFileEl = null; }
      battleFadeT = 0;
    });
  }

  if (typeof Audio === 'undefined') { playMusic('story', 0); return; }
  const a = new Audio(new URL(import.meta.env.BASE_URL + DEFEAT_SOUNDTRACK_PATH, document.baseURI).href);
  a.loop = false; a.preload = 'auto'; a.volume = 0;
  cinematicFileEl = a; cinematicFileWanted = true;
  a.addEventListener('ended', () => {
    if (cinematicFileEl !== a) return;
    clearInterval(cinematicFadeT); cinematicFadeT = 0; cinematicFileEl = null; cinematicFileWanted = false;
  });
  a.addEventListener('error', () => {
    if (cinematicFileEl !== a) return;
    console.error('No se pudo reproducir la música de la cinemática de derrota.', a.error);
    clearInterval(cinematicFadeT); cinematicFadeT = 0; cinematicFileEl = null; cinematicFileWanted = false;
    playMusic('story', 0);
  });
  a.load();
  resumeCinematicSoundtrack();
}
function resumeCinematicSoundtrack(): void {
  if (!cinematicFileWanted || isHidden || !vol.on || !cinematicFileEl) return;
  const a = cinematicFileEl;
  if (a.ended) { cinematicFileWanted = false; cinematicFileEl = null; return; }
  if (a.paused) {
    void a.play().then(() => {
      if (cinematicFileEl === a) {
        clearInterval(cinematicFadeT);
        cinematicFadeT = fadeElement(a, cinematicFileTarget(), 650);
      }
    }).catch(error => {
      if (!(error instanceof Error && error.name === 'NotAllowedError')) {
        console.error('No se pudo iniciar la música de la cinemática de derrota.', error);
      }
    });
  } else {
    clearInterval(cinematicFadeT);
    cinematicFadeT = fadeElement(a, cinematicFileTarget(), 350);
  }
}
export function stopCinematicSoundtrack(ms = 650): void {
  cinematicFileWanted = false;
  const a = cinematicFileEl;
  if (!a) return;
  clearInterval(cinematicFadeT);
  cinematicFadeT = fadeElement(a, 0, ms, () => {
    if (cinematicFileEl === a) { a.pause(); cinematicFileEl = null; }
    cinematicFadeT = 0;
  });
}

/* ---------- Ciclo de vida: detener TODO el sonido al salir o cambiar pestaña ---------- */
function suspendAllAudio(): void {
  isHidden = true;
  clearInterval(timer); timer = 0;
  clearInterval(fadeT); fadeT = 0;
  if (fileEl && !fileEl.paused) { fileEl.pause(); }
  if (battleFileEl && !battleFileEl.paused) battleFileEl.pause();
  if (cinematicFileEl && !cinematicFileEl.paused) cinematicFileEl.pause();
  if (ctx && ctx.state === 'running') { void ctx.suspend(); }
}

function resumeAllAudio(): void {
  if (!isHidden) return;
  isHidden = false;
  if (!vol.on) return;
  if (ctx && ctx.state === 'suspended') { void ctx.resume(); }
  if (battleFileWanted) {
    resumeBattleSoundtrack();
  } else if (fileWanted && musicMode === 'soundtrack') {
    fileResume();
  } else if (cur && !timer) {
    const c = ac();
    if (c) {
      nextT = c.currentTime + 0.1;
      timer = window.setInterval(schedule, 120);
      schedule();
    }
  }
  resumeCinematicSoundtrack();
}

if (typeof window !== 'undefined') {
  const kick = () => {
    unlockAudio();
    resumeBattleSoundtrack();
    resumeCinematicSoundtrack();
    if (cur && !timer && !battleFileWanted && musicMode === 'dynamic' && vol.on && !isHidden) {
      const c = ac();
      if (c) { nextT = c.currentTime + 0.08; timer = window.setInterval(schedule, 120); schedule(); }
    }
  };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendAllAudio();
    else resumeAllAudio();
  });
  window.addEventListener('pagehide', suspendAllAudio);
  window.addEventListener('blur', () => {
    if (document.hidden) suspendAllAudio();
  });
  window.addEventListener('focus', () => {
    if (!document.hidden) resumeAllAudio();
  });
}

export const AUDIO_BUILD = 'dinamico-16bit-v6';
export function soundtrackStatus(): string {
  if (!vol.on) return 'Sonido desactivado en Ajustes.';
  if (cinematicFileWanted) return cinematicFileEl && !cinematicFileEl.paused ? 'Pista de cinemática sonando.' : 'Pista de cinemática lista.';
  if (battleFileWanted) {
    if (battleFileStatus === 'blocked') return `Toca o presiona una tecla para iniciar ${battleFileName}.`;
    if (battleFileStatus === 'loading') return `Cargando pista de jefe: ${battleFileName}.`;
    return `Pista MP3 de jefe activa: ${battleFileName}.`;
  }
  if (musicMode === 'dynamic') return `Banda sonora 16-bit dinámica activa (${cur?.name ?? 'en espera'}).`;
  if (!fileOk) return 'No se pudo cargar la pista MP3: usando sintetizador 16-bit.';
  if (fileEl && !fileEl.paused && fileEl.volume > 0.001) return 'Pista MP3 sonando en menús.';
  return 'Listo para reproducir.';
}
export function playSoundtrackNow(): void {
  ac();
  if (musicMode === 'soundtrack') {
    if (!fileOk) { fileOk = true; fileEl = null; }
    if (!cur) cur = { name: 'menu', intensity: 0 };
    clearInterval(timer); timer = 0; fileStart();
  } else {
    const n = cur?.name ?? 'menu', i = cur?.intensity ?? 0;
    cur = null;
    playMusic(n, i);
  }
}
export const soundtrackActive = (): boolean => (!!fileEl && !fileEl.paused) || (!!battleFileEl && !battleFileEl.paused) || (!!cinematicFileEl && !cinematicFileEl.paused) || timer > 0;

export function playMusic(name: string, intensity = 0): void {
  stopCinematicSoundtrack(500);
  const trackName = TRACKS[name] ? name : 'menu';
  if (battleFileWanted) { stopBattleSoundtrack(); cur = null; }
  if (cur && cur.name === trackName) { cur.intensity = intensity; return; }
  cur = { name: trackName, intensity };
  if (isHidden || !vol.on) return;
  apply();
  if (musicMode === 'soundtrack' && fileOk && trackName === 'menu') {
    clearInterval(timer); timer = 0; fileStart(); return;
  }
  fileStop(250);
  const c = ac(); if (!c) return;
  step = 0; bar = 0; nextT = c.currentTime + 0.08;
  clearInterval(timer); timer = window.setInterval(schedule, 120); schedule();
}
export function setIntensity(i: number): void { if (cur) cur.intensity = i; }
export function stopMusic(): void { clearInterval(timer); timer = 0; cur = null; stopBattleSoundtrack(); stopCinematicSoundtrack(0); fileStop(); }
export function musicName(): string | null { return cur?.name ?? null; }

/* ============================ AMBIENTE ============================ */
let ambNodes: AudioNode[] = [], ambTimers: number[] = [], ambName = '';
function loopNoise(f: number, type: BiquadFilterType, v: number, q = 0.7, lfo = 0, lfoDepth = 0): GainNode | null {
  const c = ac(); if (!c || !noiseBuf) return null;
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = v;
  s.connect(fl).connect(g).connect(ambBus); s.start(); ambNodes.push(s, fl, g);
  if (lfo) { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = lfo; og.gain.value = lfoDepth; o.connect(og).connect(g.gain); o.start(); ambNodes.push(o, og); }
  return g;
}
function drone(freqs: number[], type: OscillatorType, v: number, lfo = 0.1): void {
  const c = ac(); if (!c) return;
  for (const f of freqs) { const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; l.frequency.value = lfo * (0.7 + Math.random() * 0.6); lg.gain.value = v * 0.6; l.connect(lg).connect(g.gain); o.connect(g).connect(ambBus); o.start(); l.start(); ambNodes.push(o, g, l, lg); }
}
const every = (ms: number, jitter: number, fn: () => void): void => {
  const idx = ambTimers.length;
  ambTimers.push(0);
  const go = () => {
    fn();
    ambTimers[idx] = window.setTimeout(go, ms + Math.random() * jitter);
  };
  ambTimers[idx] = window.setTimeout(go, ms * Math.random() + 400);
};
const atAmb = (f: () => void) => { if (vol.on && !isHidden && ctx && ctx.state === 'running') f(); };
export function stopAmbient(): void {
  ambTimers.forEach(clearTimeout); ambTimers = []; const c = ctx;
  ambNodes.forEach(n => { try { (n as any).stop?.(); } catch { /* ya parado */ } try { n.disconnect(); } catch { /* nada */ } }); ambNodes = []; ambName = ''; void c;
}
export function playAmbient(name: string): void {
  if (name === ambName) return; stopAmbient(); if (!ac()) { return; } ambName = name;
  const ambOut = ambBus;
  if (name === 'cavernas') {
    loopNoise(180, 'lowpass', 0.5, 0.5, 0.07, 0.25); loopNoise(900, 'bandpass', 0.05, 4, 0.13, 0.04); drone([55, 82.4], 'sine', 0.03);
    every(1800, 3200, () => atAmb(() => { const f = 1400 + Math.random() * 900; tone(f, 0.12, 'sine', 0.05, 0, -f * 0.55, ambOut, 0.6); }));
    every(7000, 9000, () => atAmb(() => { [2093, 2637, 3136].forEach((f, i) => tone(f, 0.5, 'sine', 0.025, i * 0.12, 0, ambOut, 0.6)); }));
  } else if (name === 'bosque') {
    loopNoise(500, 'bandpass', 0.18, 0.4, 0.09, 0.12); loopNoise(3000, 'highpass', 0.03, 0.5, 0.2, 0.02);
    every(500, 700, () => atAmb(() => { for (let i = 0; i < 3; i++) tone(4200 + Math.random() * 150, 0.04, 'square', 0.012, i * 0.07, 0, ambOut); }));
    every(9000, 12000, () => atAmb(() => { tone(392, 0.28, 'sine', 0.05, 0, -40, ambOut, 0.5); tone(330, 0.5, 'sine', 0.05, 0.38, -40, ambOut, 0.5); }));
  } else if (name === 'ciudadela') {
    drone([65.4, 98, 130.8], 'triangle', 0.018, 0.05); loopNoise(260, 'lowpass', 0.3, 0.5, 0.05, 0.1); loopNoise(2200, 'bandpass', 0.03, 6, 0.3, 0.015);
    every(5000, 7000, () => atAmb(() => { const b = [880, 1175, 1568][Math.floor(Math.random() * 3)]; tone(b, 0.9, 'sine', 0.03, 0, 0, ambOut, 0.7); tone(b * 1.5, 0.7, 'sine', 0.015, 0.02, 0, ambOut, 0.7); }));
    every(3000, 6000, () => atAmb(() => { tone(1760, 0.04, 'square', 0.015, 0, 0, ambOut); tone(1760, 0.04, 'square', 0.015, 0.1, 0, ambOut); }));
  } else if (name === 'vacio') {
    drone([36.7, 55, 73.4, 110.5], 'sawtooth', 0.02, 0.07); loopNoise(120, 'lowpass', 0.4, 0.4, 0.05, 0.2);
    every(2500, 4500, () => atAmb(() => { const c = ac(); if (!c) return; noise(1.4, 0.05, 300 + Math.random() * 600, 3000, 'bandpass', 0, 8, ambOut); }));
    every(9000, 9000, () => atAmb(() => { tone(55, 2.2, 'sine', 0.12, 0, -20, ambOut, 0.6); }));
  } else if (name === 'academia') {
    loopNoise(400, 'bandpass', 0.07, 0.5, 0.08, 0.05); every(6000, 6000, () => atAmb(() => { tone(1319, 0.7, 'sine', 0.025, 0, 0, ambOut, 0.7); }));
  } else if (name === 'menu') {
    loopNoise(350, 'bandpass', 0.12, 0.4, 0.06, 0.08); every(4000, 6000, () => atAmb(() => { tone(2000 + Math.random() * 1500, 0.3, 'sine', 0.015, 0, 0, ambOut, 0.7); }));
  }
}
export const ambientName = (): string => ambName;
