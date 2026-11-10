/** Audio 100 % sintetizado: efectos, música procedural por mundo y ambientes. Sin archivos. */
let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musBus: GainNode, ambBus: GainNode, delayBus: GainNode;
const vol = { sfx: 0.8, music: 0.5, amb: 0.6, on: true };
let noiseBuf: AudioBuffer | null = null;

export function setSound(on: boolean): void { vol.on = on; apply(); }
export function setVolumes(v: { sfx?: number; music?: number; amb?: number }): void { Object.assign(vol, v); apply(); }
function apply(): void {
  if (!ctx) return; const t = ctx.currentTime;
  master.gain.setTargetAtTime(vol.on ? 1 : 0, t, 0.05); sfxBus.gain.setTargetAtTime(vol.sfx, t, 0.05);
  musBus.gain.setTargetAtTime(vol.music * 0.5, t, 0.1); ambBus.gain.setTargetAtTime(vol.amb * 0.5, t, 0.1);
}
function ac(): AudioContext | null {
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
export function unlockAudio(): void { ac(); }

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

/* ============================ MÚSICA ============================ */
interface Track { bpm: number; root: number; scale: number[]; prog: number[][]; lead: 'square' | 'triangle' | 'sawtooth'; pad: OscillatorType; bass: OscillatorType; seed: number; swing?: number; density: number }
const MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], MIX = [0, 2, 4, 5, 7, 9, 10], PHR = [0, 1, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11];
export const TRACKS: Record<string, Track> = {
  menu:      { bpm: 72,  root: 57, scale: MIN, prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], lead: 'triangle', pad: 'sine', bass: 'triangle', seed: 3, density: 0.35 },
  story:     { bpm: 60,  root: 50, scale: DOR, prog: [[0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1]], lead: 'sine' as any, pad: 'sine', bass: 'sine', seed: 8, density: 0.25 },
  cavernas:  { bpm: 82,  root: 52, scale: MIN, prog: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [6, 1, 3]], lead: 'triangle', pad: 'sine', bass: 'triangle', seed: 11, density: 0.45 },
  bosque:    { bpm: 100, root: 55, scale: DOR, prog: [[0, 2, 4], [3, 5, 0], [6, 1, 3], [4, 6, 1]], lead: 'square', pad: 'triangle', bass: 'triangle', seed: 21, density: 0.6 },
  ciudadela: { bpm: 112, root: 53, scale: MIX, prog: [[0, 2, 4], [6, 1, 3], [3, 5, 0], [4, 6, 1]], lead: 'sawtooth', pad: 'triangle', bass: 'square', seed: 31, density: 0.65 },
  vacio:     { bpm: 124, root: 45, scale: PHR, prog: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [6, 1, 3]], lead: 'sawtooth', pad: 'sawtooth', bass: 'sawtooth', seed: 41, density: 0.7 },
  victoria:  { bpm: 96,  root: 60, scale: MAJ, prog: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [0, 2, 4]], lead: 'square', pad: 'triangle', bass: 'triangle', seed: 51, density: 0.7 }
};
let cur: { name: string; intensity: number } | null = null;
let timer = 0, nextT = 0, step = 0, bar = 0, rngS = 1;
const r = () => { rngS = (rngS * 1664525 + 1013904223) >>> 0; return rngS / 4294967296; };
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function degree(t: Track, d: number, oct = 0): number { const n = t.scale.length; return t.root + t.scale[((d % n) + n) % n] + 12 * (Math.floor(d / n) + oct); }
let motif: number[] = [];
function schedule(): void {
  const c = ac(); if (!c || !cur) return;
  const t = TRACKS[cur.name]; if (!t) return;
  const spb = 60 / t.bpm / 2; // corchea
  while (nextT < c.currentTime + 0.4) {
    const chord = t.prog[bar % t.prog.length], at = Math.max(0, nextT - c.currentTime), s16 = step % 16, inten = cur.intensity;
    if (s16 === 0) { // pad + bajo sostenido
      chord.forEach(d => tone(hz(degree(t, d, 0)), spb * 15, t.pad, 0.045, at, 0, musBus, 0.25));
      tone(hz(degree(t, chord[0], -2)), spb * 7.5, t.bass, 0.16, at, 0, musBus);
      if (bar % 4 === 0) { rngS = t.seed * 977 + bar * 13; motif = Array.from({ length: 8 }, () => Math.floor(r() * 7)); }
    }
    if (s16 % 4 === 2 || (inten > 0 && s16 % 2 === 0)) tone(hz(degree(t, chord[0], -2)), spb * 1.4, t.bass, 0.13, at, 0, musBus); // pulso de bajo
    // arpegio
    if (s16 % 2 === 0 || (t.density > 0.6 && s16 % 2 === 1 && r() < 0.3)) { const d = chord[(s16 >> 1) % 3]; tone(hz(degree(t, d, 1)), spb * 1.6, 'triangle', 0.05, at, 0, musBus, 0.3); }
    // melodía
    if (s16 % 2 === 0 && r() < t.density * (inten ? 1.2 : 0.8)) { const d = motif[(s16 >> 1) % motif.length] + (bar % 2 ? 2 : 0); tone(hz(degree(t, d, 2)), spb * (1 + r()), t.lead, 0.045, at, 0, musBus, 0.35); }
    // percusión
    if (inten > 0 || t.density > 0.55) {
      if (s16 % 8 === 0) { tone(110, 0.14, 'sine', 0.26, at, -70, musBus); noise(0.05, 0.06, 150, 60, 'lowpass', at, 1, musBus); }
      if (s16 % 8 === 4) noise(0.12, 0.12, 2200, 1500, 'bandpass', at, 1.5, musBus);
      if (s16 % 2 === 1 && inten > 0) noise(0.03, 0.05, 7000, 7000, 'highpass', at, 1, musBus);
      if (inten > 1 && s16 % 4 === 3) tone(80, 0.1, 'sine', 0.2, at, -40, musBus);
    } else if (s16 % 8 === 0) noise(0.08, 0.04, 1800, 1800, 'bandpass', at, 3, musBus);
    nextT += spb; step++; if (step % 16 === 0) bar++;
  }
}
export function playMusic(name: string, intensity = 0): void {
  if (!vol.on) { cur = { name, intensity }; return; }
  if (cur && cur.name === name) { cur.intensity = intensity; return; }
  const c = ac(); if (!c) { cur = { name, intensity }; return; }
  cur = { name, intensity }; step = 0; bar = 0; nextT = c.currentTime + 0.1;
  clearInterval(timer); timer = window.setInterval(schedule, 120); schedule();
}
export function setIntensity(i: number): void { if (cur) cur.intensity = i; }
export function stopMusic(): void { clearInterval(timer); timer = 0; cur = null; }
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
const every = (ms: number, jitter: number, fn: () => void): void => { const go = () => { fn(); ambTimers.push(window.setTimeout(go, ms + Math.random() * jitter)); }; ambTimers.push(window.setTimeout(go, ms * Math.random() + 400)); };
const atAmb = (f: () => void) => { if (vol.on) f(); };
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
