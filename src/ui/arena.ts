/** Combate en tiempo real: arena lateral con salto, dash, golpes en cadena, combos, orbes de respuesta y cartas con enfriamiento. */
import type { HeroDef, Level, MonsterDef, Question, Room, SaveData } from '../core/types';
import { cardById, topicById } from '../core/data';
import type { Rng } from '../core/rng';
import { h, ticker, heroSprite, monsterSprite } from './dom';
import { BattleView, GY } from '../gfx/battle';
import { gfxFlags } from '../gfx/scene';
import { drawGraph, drawNumberLine } from '../gfx/plot';
import { pickQuestion } from '../game/picker';
import { sfx, sfxForCard, playMusic, playAmbient, setIntensity } from './audio';
import * as A from '../game/arena';
import { artCanvas } from './cards';

export interface ArenaOpts {
  save: SaveData; hero: HeroDef; monster: MonsterDef; room: Room; level: Level; heroHp: number; rng: Rng; lastTemplate?: string;
  intro: { speaker: string; text: string }[];
  mount(el: HTMLElement, cleanup?: () => void): void; persist(): void; exit(): void;
  onAnswer(q: Question, correct: boolean): void;
  onEnd(r: { won: boolean; heroHp: number; hints: number; best: number; lastTemplate: string }): void;
}
interface Orb { x: number; y: number; ph: number; label: string; ok: boolean; dim: boolean; col: string; el: HTMLElement; gone: boolean }
interface Proj { x: number; y: number; vx: number; r: number; col: string }
type Box = { x0: number; x1: number; y0: number; y1: number };
const COLS = ['#ff6f7a', '#6fb7ff', '#6fcf8f', '#ffd24d'];
const overlap = (a: Box, b: Box): boolean => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export function startArena(o: ArenaOpts): void {
  const { save, hero, monster: m, room, level, rng } = o;
  const s = A.newFight(m, room.questions ?? m.questions, room.hpMultiplier ?? 1, o.heroHp, hero.hp);
  const view = new BattleView(h('canvas', { class: 'c-canvas', 'aria-label': 'Arena de combate' }));
  view.setup(level.world, heroSprite(hero), monsterSprite(m));
  const sz: number = view.mon.def.size, monBase = sz > 32 ? 206 : 232;
  const tScale = save.settings.timeMode === 'veryslow' ? 0.45 : save.settings.timeMode === 'slow' ? 0.7 : 1;
  const noTimeout = !!save.settings.noTimeout;
  const slots: A.Slot[] = A.loadoutOf(save).map(id => ({ id, cd: 4000, max: A.cooldownMs(cardById[id]) }));

  /* ---------- DOM ---------- */
  const heroHpBar = h('i'), heroTxt = h('span'), shieldTxt = h('span', { class: 'c-block' }), monHpBar = h('i'), monTxt = h('span'), monStat = h('span', { class: 'c-phase' });
  const comboNum = h('b', { class: 'a-cn' }, '0'), comboTier = h('span', { class: 'a-ct' }), comboBar = h('i'), comboBox = h('div', { class: 'a-combo', hidden: true }, h('span', { class: 'a-cx' }, '×'), comboNum, h('small', {}, 'COMBO'), comboTier, h('div', { class: 'bar mini' }, comboBar));
  const labels = h('div', { class: 'a-labels' }), overlayEl = h('div', { class: 'c-overlay', hidden: true }), popEl = h('div', { class: 'a-pop', hidden: true });
  const qTag = h('div', { class: 'q-tag' }, 'Prepárate…'), qText = h('p', { class: 'q-text hint' }, 'Golpea el orbe con la respuesta correcta. ¡Esquiva al monstruo!'), qMedia = h('div', { class: 'q-media' }), legend = h('div', { class: 'a-legend' });
  const timerBar = h('i'), timer = h('div', { class: 'bar a-timer' }, timerBar), qFb = h('div', { class: 'q-fb', 'aria-live': 'polite' });
  const hintBtn = h('button', { class: 'pbtn small', onclick: () => useHint() }, 'Pista (H)'), pauseBtn = h('button', { class: 'pbtn small ghost', onclick: () => pause(true) }, 'Pausa (P)');
  const skillEls = slots.map((sl, i) => {
    const c = cardById[sl.id], cd = h('div', { class: 'sk-cd' }), keyEl = h('span', { class: 'hc-key' }, String(i + 1));
    const b = h('button', { class: 'skill', onclick: () => castSlot(i), title: c.effect }, keyEl, artCanvas(c), h('span', { class: 'sk-n' }, c.name), A.needsProblem(c) ? h('span', { class: 'sk-q' }, '?') : null, cd);
    b.style.setProperty('--c', ({ ataque: '#ff6f7a', defensa: '#6fb7ff', utilidad: '#6fcf8f', riesgo: '#ffb347' } as any)[c.type] ?? '#aaa');
    return { b, cd };
  });
  const touch = h('div', { class: 'a-touch' },
    h('div', { class: 'tpad' }, tbtn('◀', 'left'), tbtn('▶', 'right')),
    h('div', { class: 'tpad' }, tbtn('»', 'dash', 'small'), tbtn('▲', 'jump'), tbtn('⚔', 'atk', 'big')));
  function tbtn(t: string, k: string, cls = ''): HTMLElement {
    const b = h('button', { class: 'tb ' + cls, 'aria-label': k }, t);
    const on = (e: Event) => { e.preventDefault(); press(k, true); b.classList.add('on'); }, off = (e: Event) => { e.preventDefault(); press(k, false); b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  }
  const root = h('div', { class: 'arena', 'data-world': level.world },
    h('div', { class: 'a-top' },
      h('div', { class: 'c-side' }, h('span', { class: 'c-name' }, save.profile.name), h('div', { class: 'bar hp' }, heroHpBar), h('div', { class: 'c-nums' }, heroTxt, shieldTxt)),
      comboBox,
      h('div', { class: 'c-side r' }, h('span', { class: 'c-name' }, m.name + (room.miniBoss ? ' (mini jefe)' : '')), h('div', { class: 'bar mhp' }, monHpBar), h('div', { class: 'c-nums' }, monTxt, monStat))),
    h('div', { class: 'a-main' },
      h('div', { class: 'a-left' }, h('div', { class: 'c-stage' }, view.cv, labels, popEl, overlayEl), h('div', { class: 'a-skills' }, ...skillEls.map(e => e.b))),
      h('div', { class: 'a-side' }, h('div', { class: 'q-panel' }, qTag, qText, qMedia, legend, timer, qFb), h('div', { class: 'c-tools' }, hintBtn, pauseBtn),
        h('p', { class: 'a-help' }, 'A/D mover · W/Espacio saltar · K dash · J/clic golpear · 1-4 cartas · H pista'))),
    touch);

  /* ---------- estado ---------- */
  const H = { x: 40, yo: 0, vy: 0, face: 1, dashT: 0, dashCd: 0, inv: 0, atkCd: 0, chainT: 0, step: 0, swing: -1, hitStun: 0, air: false };
  const M = { x: monBase, st: 'idle' as 'idle' | 'tele' | 'act' | 'back', t: 0, pat: '', tx: 0, hit: false, next: 3, clock: 0, burnAcc: 0, nearT: 0, shots: [] as number[] };
  const orbs: Orb[] = [], projs: Proj[] = [], waves: { x: number; vx: number }[] = [], marks: { x: number; t: number }[] = [];
  let prob: { q: Question; t: number; total: number } | null = null, nextProb = 2.5, pop: { q: Question; card: A.Slot; t: number; total: number } | null = null;
  let phase: 'intro' | 'fight' | 'end' = 'intro', paused = false, hints = 1, lastTemplate = o.lastTemplate ?? '', hintsUsed = 0, shotT = 0, clockT = 0;
  const keys = new Set<string>(), pressed: Record<string, boolean> = {}, queued = { jump: false, dash: false, atk: false };
  view.arena = true; view.hero.homeX = H.x; gfxFlags.reduce = save.settings.reduceMotion;
  setIntensity(m.boss ? 2 : 1);

  function press(k: string, on: boolean): void { pressed[k] = on; if (on) { if (k === 'jump') queued.jump = true; if (k === 'dash') queued.dash = true; if (k === 'atk') queued.atk = true; } }
  const dirX = (): number => ((keys.has('a') || keys.has('arrowleft') || pressed.left) ? -1 : 0) + ((keys.has('d') || keys.has('arrowright') || pressed.right) ? 1 : 0);
  const onKeyDown = (e: KeyboardEvent): void => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
    if (e.repeat) { keys.add(k); return; }
    keys.add(k);
    if (!overlayEl.hidden) return;
    if (k === 'p' || k === 'escape') { pause(!paused); return; }
    if (paused) return;
    if (pop && /^[1-4]$/.test(k)) { answerPop(+k - 1); return; }
    if (k === 'w' || k === 'arrowup' || k === ' ') queued.jump = true;
    else if (k === 'k' || k === 'shift' || k === 'l') queued.dash = true;
    else if (k === 'j' || k === 'z' || k === 'x') queued.atk = true;
    else if (/^[1-4]$/.test(k)) castSlot(+k - 1);
    else if (k === 'h') useHint();
  };
  const onKeyUp = (e: KeyboardEvent): void => { keys.delete(e.key.toLowerCase()); };
  const onBlur = (): void => { keys.clear(); if (phase === 'fight' && !paused) pause(true); };
  const onVis = (): void => { if (document.hidden) onBlur(); };
  document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur); document.addEventListener('visibilitychange', onVis);
  view.cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) { queued.atk = true; } });
  view.cv.addEventListener('contextmenu', e => e.preventDefault());
  let off: (() => void) | null = null;
  const cleanup = (): void => { document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVis); off?.(); off = null; };
  o.mount(root, cleanup);
  playMusic(level.world, m.boss ? 2 : 1); playAmbient(level.world); setIntensity(m.boss ? 2 : 1);
  off = ticker.add(dt => { view.step(dt); frame(dt); });
  view.frontHook = drawFront; view.backHook = drawBack;

  /* ---------- utilidades ---------- */
  const heroBox = (): Box => ({ x0: H.x + 8, x1: H.x + 24, y0: GY - 30 - H.yo, y1: GY - H.yo });
  const monBox = (): Box => ({ x0: M.x + sz * 0.18, x1: M.x + sz * 0.82, y0: GY - sz * 0.9, y1: GY });
  const monCX = (): number => M.x + sz / 2;
  function pause(on: boolean): void {
    if (phase !== 'fight') return; paused = on;
    if (on) { overlayEl.hidden = false; overlayEl.replaceChildren(h('div', { class: 'dlg' }, h('h3', {}, 'Pausa'), h('p', {}, 'El combate está detenido.'), h('div', { class: 'dlg-btns' }, h('button', { class: 'pbtn', onclick: () => { sfx('click'); pause(false); } }, 'Seguir'), h('button', { class: 'pbtn ghost', onclick: () => { sfx('click'); cleanup(); o.exit(); } }, 'Salir')))); (overlayEl.querySelector('button') as HTMLElement).focus(); }
    else overlayEl.hidden = true;
  }
  const uiBars = (): void => {
    heroHpBar.style.width = Math.max(0, (s.heroHp / s.heroMax) * 100) + '%'; heroTxt.textContent = `♥ ${Math.max(0, s.heroHp)}/${s.heroMax}`;
    shieldTxt.textContent = s.shield ? `🛡 ${s.shield}` : ''; shieldTxt.hidden = !s.shield;
    monHpBar.style.width = Math.max(0, (s.hp / s.maxHp) * 100) + '%'; monTxt.textContent = `${Math.max(0, s.hp)}/${s.maxHp}`;
    monStat.textContent = [s.stunT > 0 ? '⚡ aturdido' : '', s.burnT > 0 ? '🔥 quema' : '', s.weakT > 0 ? '↓ débil' : '', (room.phases ?? m.phases) ? topicById[A.topicNow(s, level.topic, room)]?.name ?? '' : ''].filter(Boolean).join(' · ');
  };
  const say = (lines: { speaker: string; text: string }[], then: () => void): void => {
    let i = 0;
    const show = (): void => {
      if (i >= lines.length) { overlayEl.hidden = true; then(); return; }
      const l = lines[i++]; overlayEl.hidden = false;
      overlayEl.replaceChildren(h('div', { class: 'dlg' }, h('b', {}, l.speaker === 'heroe' ? save.profile.name : l.speaker), h('p', {}, l.text), h('button', { class: 'pbtn', onclick: () => { sfx('click'); show(); } }, i < lines.length ? 'Siguiente' : '¡A pelear!')));
      (overlayEl.querySelector('button') as HTMLElement).focus();
    };
    show();
  };
  function gain(n: number): void {
    const t = A.addCombo(s, n);
    comboBox.hidden = s.combo < 2; comboNum.textContent = String(s.combo); comboBox.classList.remove('pop'); void comboBox.offsetWidth; comboBox.classList.add('pop');
    view.setAura(s.combo >= 2 ? [0, 2, 3, 5, 6][A.comboTier(s.combo)] : 0);
    if (t) { comboTier.textContent = A.TIER_NAME[t]; view.banner(A.TIER_NAME[t], ['', '#ffd24d', '#ff9a3c', '#ff6f7a', '#c8a3ff'][t], 40); sfx(('combo' + t) as any); view.zoomPulse(0.03 + t * 0.01); }
  }
  function loseCombat(): void { if (s.combo >= 3) view.float('combo roto', view.heroCenter()[0], view.heroCenter()[1] - 26, '#9a90b8'); A.breakCombo(s); comboBox.hidden = true; comboTier.textContent = ''; view.setAura(0); }
  function hurtHero(n: number, kx = 0): void {
    if (phase !== 'fight' || H.inv > 0) return;
    let d = Math.max(1, Math.round(n * (s.weakT > 0 ? 0.6 : 1)));
    if (s.reflectT > 0) { const r = Math.max(1, Math.ceil(d / 2)); hitMonster(r, 'reflect'); }
    const [hx, hy] = view.heroCenter();
    if (s.shield > 0) { const t = Math.min(s.shield, d); s.shield -= t; d -= t; view.bigNum('BLOQUEO', hx, hy - 6, '#8fb4ff'); sfx('block'); }
    if (d > 0) { s.heroHp = Math.max(0, s.heroHp - d); view.heroHurt(); view.hurtFx(); sfx('hurt'); view.bigNum(`-${d}`, hx, hy - 6, '#ff6f7a', d >= 5); loseCombat(); H.hitStun = 0.28; H.vy = Math.max(H.vy, 90); H.x = clamp(H.x + kx * 14, 4, 284); }
    H.inv = d > 0 ? 1.1 : 0.4; uiBars();
    if (s.heroHp <= 0) finish(false);
  }
  function hitMonster(n: number, kind: 'hit' | 'orb' | 'card' | 'reflect' | 'burn', crit = false): void {
    if (phase !== 'fight' || n <= 0) return;
    s.hp = Math.max(0, s.hp - n); const [mx, my] = view.monCenter();
    view.monHurt(); if (kind !== 'burn') view.hitFx(Math.min(8, n / 2), crit); view.bigNum(`-${n}`, mx, my - 4, kind === 'burn' ? '#ff9a3c' : crit ? '#ffd24d' : '#ffffff', crit);
    uiBars(); if (s.hp <= 0) finish(true);
  }

  /* ---------- héroe ---------- */
  function doDash(): void {
    if (H.dashCd > 0 || H.dashT > 0 || H.hitStun > 0 || view.tweens.length) return;
    H.dashT = 0.2; H.dashCd = 0.75; H.inv = Math.max(H.inv, 0.28); sfx('dash'); view.burst(H.x + 16, GY - 4, '#d8d0ee', 8);
    if (dirX()) H.face = dirX();
  }
  function doJump(): void { if (H.yo > 0.5 || H.hitStun > 0 || view.tweens.length) return; H.vy = 205; H.air = true; sfx('jump'); view.burst(H.x + 16, GY - 2, '#b8ae9a', 5); }
  function doAttack(): void {
    if (H.atkCd > 0 || H.dashT > 0 || H.hitStun > 0 || view.tweens.length || phase !== 'fight') return;
    H.step = H.chainT > 0 ? (H.step + 1) % 3 : 0; const last = H.step === 2;
    H.atkCd = last ? 0.46 : 0.27; H.chainT = 0.7; H.swing = 0.07; view.hero.play('attack'); sfx(('swing' + (H.step + 1)) as any);
    H.x = clamp(H.x + H.face * (last ? 10 : 5), 4, 284); slashFx(H.step);
  }
  function slashFx(step: number): void {
    const f = H.face, cx = H.x + 16, cy = GY - 16 - H.yo, col = ['#ffffff', '#cfe6ff', '#ffd24d'][step], r = step === 2 ? 30 : 24;
    view.fx.push({ t: 0, life: 170, draw(ctx: CanvasRenderingContext2D, p: number) { ctx.globalAlpha = 1 - p; ctx.strokeStyle = col; ctx.lineWidth = step === 2 ? 4 : 3; ctx.beginPath(); const a0 = step === 1 ? 0.9 : -0.9, a1 = step === 1 ? -0.9 : 0.9, k = a0 + (a1 - a0) * Math.min(1, p * 1.6); ctx.arc(cx + f * 4, cy, r, f > 0 ? k - 0.5 : Math.PI - k - 0.5, f > 0 ? k + 0.5 : Math.PI - k + 0.5); ctx.stroke(); ctx.globalAlpha = 1; } });
  }
  function resolveSwing(): void {
    const f = H.face, cx = H.x + 16, cy = GY - 16 - H.yo;
    const box: Box = { x0: f > 0 ? cx + 2 : cx - 36, x1: f > 0 ? cx + 36 : cx - 2, y0: cy - 20, y1: cy + 18 };
    let any = false;
    for (const ob of orbs) if (!ob.gone && !ob.dim && overlap(box, { x0: ob.x - 10, x1: ob.x + 10, y0: ob.y - 10, y1: ob.y + 10 })) { hitOrb(ob); any = true; break; }
    for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; if (overlap(box, { x0: p.x - p.r, x1: p.x + p.r, y0: p.y - p.r, y1: p.y + p.r })) { projs.splice(i, 1); view.burst(p.x, p.y, p.col, 12); sfx('break'); gain(1); view.float('¡PARADA!', p.x, p.y - 12, '#ffd24d'); any = true; } }
    if (overlap(box, monBox())) {
      const stunned = s.stunT > 0, d = Math.round(A.hitDamage(H.step, s.combo) * (stunned ? 1.5 : 1)), crit = H.step === 2 || stunned;
      hitMonster(d, 'hit', crit); sfx(crit ? 'crit' : 'hit'); gain(1); any = true;
    }
    if (!any && H.step === 2) loseCombatSoft();
  }
  function loseCombatSoft(): void { s.comboT = Math.max(0, s.comboT - 700); }

  /* ---------- orbes y preguntas ---------- */
  function topicDiff(): number {
    const [lo, hi] = m.difficulty, base = (room.difficulty ?? lo) + s.diff + s.prep.delta;
    return Math.max(1, Math.min(4, Math.max(lo > 1 ? lo - 1 : 1, Math.min(hi, base))));
  }
  function makeQ(): Question {
    const topic = A.topicNow(s, level.topic, room); let q: Question;
    for (let i = 0; i < 14; i++) { q = pickQuestion({ topics: [topic], difficulty: topicDiff(), rng, save, lastTemplate }); if (!q.stage && !q.clickTarget && q.options.length >= 2) break; }
    lastTemplate = q!.template; return q!;
  }
  function renderMedia(q: Question, into: HTMLElement): void {
    into.replaceChildren();
    if (q.graph) { const cv = h('canvas', { class: 'q-cv', 'aria-label': 'Gráfica' }); drawGraph(cv, q.graph); into.append(cv); }
    if (q.numberLine) { const cv = h('canvas', { class: 'q-cv nl', 'aria-label': 'Recta numérica' }); drawNumberLine(cv, q.numberLine); into.append(cv); }
  }
  function spawnProblem(): void {
    const q = makeQ(), total = noTimeout ? 0 : A.answerTime(topicDiff());
    let opts = q.options.map((t, i) => ({ t, ok: i === q.correct }));
    if (opts.length > 4) { const wr = opts.filter(x => !x.ok).slice(0, 3); opts = [opts.find(x => x.ok)!, ...wr]; }
    const xs = [66, 108, 150, 192].sort(() => rng() - 0.5), hs = [GY - 14, GY - 14, GY - 46, GY - 46].sort(() => rng() - 0.5);
    labels.replaceChildren(); orbs.length = 0; legend.replaceChildren();
    opts.sort(() => rng() - 0.5).forEach((op, i) => {
      const el = h('div', { class: 'orb-lbl', style: { borderColor: COLS[i] } }, op.t); labels.append(el);
      orbs.push({ x: xs[i], y: hs[i], ph: rng() * 6, label: op.t, ok: op.ok, dim: false, col: COLS[i], el, gone: false });
      const lg = h('div', { class: 'lg' }, h('i', {}), h('span', {}, op.t)); lg.style.setProperty('--oc', COLS[i]); legend.append(lg);
    });
    let rm = s.prep.remove; s.prep.remove = 0; s.prep.delta = 0;
    for (const ob of orbs.filter(x => !x.ok).sort(() => rng() - 0.5)) { if (rm <= 0) break; dimOrb(ob); rm--; }
    prob = { q, t: total, total };
    qTag.replaceChildren(`${topicById[q.topic]?.name ?? ''} · `, h('span', { class: 'diff' }, '●'.repeat(q.difficulty) + '○'.repeat(4 - q.difficulty)));
    qText.textContent = q.text; qText.className = 'q-text'; qFb.textContent = ''; qFb.className = 'q-fb'; renderMedia(q, qMedia); timer.hidden = noTimeout; timerBar.style.width = '100%';
    sfx('orb'); view.banner('¡PROBLEMA!', '#9fe8ff', 34); (window as any).__jmQ = q; (window as any).__jmOrbs = orbs;
    updHint();
  }
  function dimOrb(ob: Orb): void { ob.dim = true; ob.el.classList.add('dim'); view.burst(ob.x, ob.y, '#777', 6); sfx('break'); }
  function useHint(): void {
    if (!prob || hints < 1 || pop || paused) return;
    const w = orbs.filter(x => !x.ok && !x.dim && !x.gone); if (w.length <= 1) return;
    hints--; hintsUsed++; s.hintsUsed++; dimOrb(w[Math.floor(rng() * w.length)]); updHint();
  }
  const updHint = (): void => { hintBtn.textContent = `Pista (H)${hints ? ' · ' + hints : ''}`; hintBtn.disabled = !(prob && hints > 0); };
  function endProblem(ok: boolean, given: string, why: string): void {
    const q = prob!.q; prob = null;
    A.recordAnswer(save, q, ok, given); o.onAnswer(q, ok); A.adaptDiff(s, ok); save.stats.bestStreak = Math.max(save.stats.bestStreak, s.best); o.persist();
    s.asked++; if (ok) s.correct++;
    orbs.forEach(ob => { ob.gone = true; ob.el.remove(); });
    qFb.className = 'q-fb ' + (ok ? 'ok' : 'no'); qFb.replaceChildren(h('b', {}, why + ' '), 'Respuesta: ' + q.options[q.correct] + '. ', q.explain);
    labels.replaceChildren(); nextProb = A.questionGap(1) * (ok ? 0.8 : 1); timerBar.style.width = '0%'; updHint(); legend.replaceChildren(); qMedia.replaceChildren();
    hints = Math.min(2, hints + (ok && s.correct % 3 === 0 ? 1 : 0)); updHint();
  }
  function hitOrb(ob: Orb): void {
    if (!prob || ob.gone) return;
    view.burst(ob.x, ob.y, ob.col, 20);
    if (ob.ok) {
      const d = A.orbDamage(s.maxHp, s.combo); sfx('orbok'); gain(3); view.cv.dataset.last = 'ok';
      view.fx.push({ t: 0, life: 380, draw(ctx: CanvasRenderingContext2D, p: number) { ctx.globalAlpha = 1 - p; ctx.strokeStyle = ob.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ob.x, ob.y, 8 + 50 * p, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; } });
      view.hero.play('attack'); hitMonster(d, 'orb', true); view.zoomPulse(0.06); view.banner('¡CORRECTO!', '#8bf0a8', 40);
      endProblem(true, ob.label, '✓ ¡Correcto!');
    } else {
      sfx('orbbad'); loseCombat(); view.banner('¡INCORRECTO!', '#ff6f7a', 40); qPanelShake();
      endProblem(false, ob.label, '✗ No era esa.'); hurtHero(Math.max(2, Math.round(m.attack.damage * 0.7)));
    }
  }
  function qPanelShake(): void { const p = root.querySelector('.q-panel')!; p.classList.remove('shake'); void (p as HTMLElement).offsetWidth; p.classList.add('shake'); }
  function problemTimeout(): void { sfx('bad'); loseCombat(); view.banner('¡TIEMPO!', '#ff9a3c', 40); endProblem(false, '—', '⏱ Se acabó el tiempo.'); }

  /* ---------- cartas ---------- */
  function castSlot(i: number): void {
    const sl = slots[i]; if (!sl || phase !== 'fight' || paused || pop || sl.cd > 0 || view.tweens.length) return;
    const c = cardById[sl.id];
    if (A.needsProblem(c)) { openPop(sl); return; }
    fire(sl, true);
  }
  function openPop(sl: A.Slot): void {
    const q = makeQ(), c = cardById[sl.id], total = noTimeout ? 0 : 9000;
    pop = { q, card: sl, t: total, total }; popEl.hidden = false;
    const wrongs = q.options.map((t, i) => ({ t, i })); // todas las opciones, máx. 4
    const show = wrongs.length > 4 ? [wrongs[q.correct], ...wrongs.filter(x => x.i !== q.correct).slice(0, 3)].sort((a, b) => a.i - b.i) : wrongs;
    const mapIdx = show.map(x => x.i);
    const media = h('div', { class: 'q-media' }); renderMedia(q, media);
    popEl.replaceChildren(h('div', { class: 'pop-in' }, h('b', {}, `${c.name}: resuelve para potenciarla`), h('p', {}, q.text), media,
      h('div', { class: 'q-opts' }, show.map((x, k) => h('button', { class: 'opt', onclick: () => answerPop(k) }, h('b', {}, String(k + 1)), h('span', {}, x.t)))), h('div', { class: 'bar a-timer' }, h('i', { class: 'pt' }))));
    (popEl as any)._map = mapIdx; sfx('card');
  }
  function answerPop(k: number): void {
    if (!pop) return; const { q, card } = pop, idx = k < 0 ? -1 : ((popEl as any)._map as number[])[k]; if (idx === undefined) return;
    pop = null; popEl.hidden = true; const ok = idx === q.correct;
    A.recordAnswer(save, q, ok, idx >= 0 ? q.options[idx] : '—'); o.onAnswer(q, ok); A.adaptDiff(s, ok); o.persist();
    if (!ok) { sfx('bad'); const ev = A.missCard(s, cardById[card.id]); if (ev.length) hurtHero(ev[0].t === 'self' ? ev[0].n : 0); }
    fire(card, ok);
  }
  function fire(sl: A.Slot, boosted: boolean): void {
    const c = cardById[sl.id]; sl.cd = sl.max; H.inv = Math.max(H.inv, 0.6); view.hero.homeX = H.x;
    const evs = A.applyCard(s, c, boosted, slots);
    sfxForCard(view.fxKind(c).kind); const [hx, hy] = view.heroCenter();
    const dmg = evs.find(e => e.t === 'damage') as { n: number } | undefined;
    if (dmg) { s.hp += dmg.n; } // el daño se aplica en el impacto
    view.cast(c, () => {
      const [mx, my] = view.monCenter();
      for (const e of evs) {
        if (e.t === 'damage') { s.hp = Math.max(0, s.hp); hitMonster(e.n, 'card', true); sfx('crit'); gain(2); }
        else if (e.t === 'shield') { view.bigNum(`+${e.n}`, hx, hy - 6, '#8fb4ff'); sfx('shield'); }
        else if (e.t === 'heal' && e.n > 0) { view.bigNum(`+${e.n}`, hx, hy - 6, '#6fcf8f'); }
        else if (e.t === 'drain') view.bigNum(`+${e.n}`, hx, hy + 8, '#ff8fa0');
        else if (e.t === 'stun') { view.float('¡Aturdido!', mx, my - 30, '#9fe8ff'); view.tintMon('#9fe8ff', 2400); sfx('freeze'); M.st = 'idle'; M.next = 3; marks.length = 0; }
        else if (e.t === 'weak') view.float('¡Debilitado!', mx, my - 30, '#c8a3ff');
        else if (e.t === 'burn') view.tintMon('#ff9a3c', 1600);
        else if (e.t === 'reflect') view.float('¡Reflejo!', hx, hy - 30, '#ffd24d');
        else if (e.t === 'prep') view.float(e.what === 'remove' ? 'Pista lista' : e.what === 'graph' ? 'Gráfica lista' : 'Pregunta más fácil', hx, hy - 30, '#9fe8ff');
      }
      uiBars();
    });
    if (!dmg) { evs.forEach(() => 0); uiBars(); }
  }

  /* ---------- monstruo ---------- */
  const TELE: Record<string, number> = { lunge: 0.7, shot: 0.55, slam: 0.75, rain: 0.9, swipe: 0.4 };
  const dmgM = (): number => Math.max(2, Math.round(m.attack.damage * (m.boss ? 1.1 : 1)));
  function startAttack(): void {
    const near = Math.abs(H.x + 16 - monCX()) < sz * 0.5 + 26;
    const pats: string[] = A.patternsFor(m); M.pat = near && rng() < 0.7 ? 'swipe' : pats[Math.floor(rng() * pats.length)];
    M.st = 'tele'; M.t = TELE[M.pat]; M.hit = false; view.telegraph(M.t * 1000); sfx('charge'); if (m.boss && M.pat !== 'swipe') sfx('roar');
    if (M.pat === 'rain') { marks.length = 0; const hx = H.x + 16; [0, -1, 1].forEach((d, i) => marks.push({ x: clamp(hx + d * 42 + (rng() - 0.5) * 10, 14, 306), t: TELE.rain + i * 0.28 })); }
  }
  function updMonster(dt: number): void {
    M.clock += dt; view.mon.flip = H.x + 16 > monCX();
    if (s.stunT > 0) { M.st = 'idle'; if (M.x !== monBase) M.x += Math.sign(monBase - M.x) * Math.min(Math.abs(monBase - M.x), 60 * dt); }
    else if (M.st === 'idle') {
      M.x = monBase + Math.round(Math.sin(M.clock * 0.9) * 8); M.next -= dt;
      if (M.next <= 0 && !pop) startAttack();
    } else if (M.st === 'tele') {
      M.t -= dt; if (M.t <= 0) {
        view.mon.play('attack'); const f = view.mon.flip ? 1 : -1;
        if (M.pat === 'lunge') { M.st = 'act'; M.tx = clamp(H.x + 16 - sz / 2, 4, 300 - sz); sfx('whoosh'); }
        else if (M.pat === 'shot') { M.st = 'back'; M.t = m.boss ? 0.9 : 0.55; M.shots = m.boss ? [0, 0.35] : [0]; shotT = 0; }
        else if (M.pat === 'slam') { M.st = 'back'; M.t = 0.7; waves.push({ x: monCX() + f * sz * 0.3, vx: f * 150 }); sfx('slam'); view.shake = 380; view.zoomPulse(0.03); if (m.boss) waves.push({ x: monCX() - f * sz * 0.3, vx: -f * 150 }); }
        else if (M.pat === 'swipe') { M.st = 'back'; M.t = 0.5; const reach: Box = f < 0 ? { x0: M.x - 26, x1: M.x + sz * 0.5, y0: GY - 40, y1: GY } : { x0: M.x + sz * 0.5, x1: M.x + sz + 26, y0: GY - 40, y1: GY }; sfx('whoosh'); if (overlap(reach, heroBox())) hurtHero(dmgM(), -f); view.burst(f < 0 ? M.x - 8 : M.x + sz + 8, GY - 16, '#ff9a8a', 8); }
        else { M.st = 'act'; }
      }
    } else if (M.st === 'act') {
      if (M.pat === 'lunge') {
        const dir = Math.sign(M.tx - M.x); M.x += dir * 340 * dt;
        if (!M.hit && overlap(monBox(), heroBox())) { M.hit = true; hurtHero(dmgM(), dir); }
        if (Math.abs(M.tx - M.x) < 6 || (M.x <= 4) || M.x >= 300 - sz) { M.st = 'back'; M.t = 0.35; }
      } else if (M.pat === 'rain') { if (!marks.length) { M.st = 'back'; M.t = 0.5; } }
    } else { // back
      M.t -= dt; shotT += dt;
      if (M.pat === 'shot') while (M.shots.length && shotT >= M.shots[0]) { M.shots.shift(); const air = m.boss && M.shots.length === 0; projs.push({ x: monCX() + (view.mon.flip ? 1 : -1) * sz * 0.4, y: air ? GY - 46 : GY - 12, vx: (view.mon.flip ? 1 : -1) * 150, r: 6, col: m.boss ? '#c8a3ff' : '#ff8a3c' }); sfx('proj'); }
      if (M.x !== monBase) M.x += Math.sign(monBase - M.x) * Math.min(Math.abs(monBase - M.x), 140 * dt);
      if (M.t <= 0) { M.st = 'idle'; M.next = (m.boss ? 1.7 : 2.4) * (0.8 + 0.4 * (s.hp / s.maxHp)); }
    }
    view.mon.x = Math.round(M.x); view.mon.dirty = true;
    for (let i = marks.length - 1; i >= 0; i--) { const mk = marks[i]; mk.t -= dt; if (mk.t <= 0) { marks.splice(i, 1); sfx('meteor'); view.burst(mk.x, GY - 4, '#ff9a3c', 16); view.shake = 200; if (Math.abs(H.x + 16 - mk.x) < 15 && H.yo < 22) hurtHero(dmgM()); } }
    for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; p.x += p.vx * dt; if (overlap({ x0: p.x - p.r, x1: p.x + p.r, y0: p.y - p.r, y1: p.y + p.r }, heroBox())) { projs.splice(i, 1); hurtHero(dmgM(), Math.sign(p.vx)); view.burst(p.x, p.y, p.col, 10); } else if (p.x < -10 || p.x > 330) projs.splice(i, 1); }
    for (let i = waves.length - 1; i >= 0; i--) { const w = waves[i]; w.x += w.vx * dt; if (Math.abs(w.x - (H.x + 16)) < 11 && H.yo < 13) hurtHero(dmgM(), Math.sign(w.vx)); if (w.x < -12 || w.x > 332) waves.splice(i, 1); }
  }

  /* ---------- bucle principal ---------- */
  function frame(rawDt: number): void {
    if (phase !== 'fight' || paused) { queued.jump = queued.dash = queued.atk = false; return; }
    const scale = pop ? 0.12 : prob ? tScale : 1, dt = Math.min(0.05, rawDt / 1000) * scale;
    // acciones
    if (queued.jump) { doJump(); } if (queued.dash) { doDash(); } if (queued.atk) { doAttack(); }
    queued.jump = queued.dash = queued.atk = false;
    // héroe
    H.dashCd = Math.max(0, H.dashCd - dt); H.atkCd = Math.max(0, H.atkCd - dt); H.chainT = Math.max(0, H.chainT - dt); H.inv = Math.max(0, H.inv - dt); H.hitStun = Math.max(0, H.hitStun - dt);
    if (H.swing >= 0) { H.swing -= dt; if (H.swing < 0) { H.swing = -1; resolveSwing(); } }
    if (view.tweens.length) H.x = view.hero.x;
    else {
      const dx = dirX(); if (H.hitStun <= 0) { if (dx) H.face = dx; }
      if (H.dashT > 0) { H.dashT -= dt; H.x += H.face * 270 * dt; }
      else if (H.hitStun <= 0) H.x += dx * (H.atkCd > 0.15 ? 28 : 80) * dt;
      H.x = clamp(H.x, 2, 286);
    }
    if (H.yo > 0 || H.vy > 0) { H.vy -= 560 * dt; H.yo += H.vy * dt; if (H.yo <= 0) { if (H.air) { sfx('land'); view.burst(H.x + 16, GY - 2, '#b8ae9a', 4); } H.yo = 0; H.vy = 0; H.air = false; } }
    if (H.chainT <= 0) H.step = 0;
    view.hero.x = Math.round(H.x); view.hero.y = GY - 29 - Math.round(H.yo); view.hero.flip = H.face < 0; view.hero.dirty = true;
    clockT += dt;
    // combo
    if (s.combo > 0) { s.comboT -= dt * 1000; comboBar.style.width = Math.max(0, (s.comboT / A.COMBO_WINDOW) * 100) + '%'; if (s.comboT <= 0) { loseCombat(); } }
    // estados del monstruo
    const ms = dt * 1000;
    s.reflectT = Math.max(0, s.reflectT - ms); s.weakT = Math.max(0, s.weakT - ms); s.stunT = Math.max(0, s.stunT - ms);
    if (s.burnT > 0) { s.burnT -= ms; M.burnAcc += ms; if (M.burnAcc >= 1500) { M.burnAcc = 0; hitMonster(s.burnN, 'burn'); sfx('fire'); } }
    if (phase !== 'fight') return;
    // cartas
    slots.forEach((sl, i) => { const was = sl.cd; sl.cd = Math.max(0, sl.cd - ms); const e = skillEls[i]; e.cd.style.height = (sl.cd / sl.max) * 100 + '%'; e.b.classList.toggle('ready', sl.cd <= 0); if (was > 0 && sl.cd <= 0) sfx('cd'); });
    // problema
    if (pop) { const bar = popEl.querySelector('.pt') as HTMLElement | null; if (!noTimeout && pop.total) { pop.t -= rawDt; if (bar) bar.style.width = Math.max(0, pop.t / pop.total * 100) + '%'; if (pop.t <= 0) answerPop(-1); } }
    else if (prob) {
      if (!noTimeout) { prob.t -= rawDt; timerBar.style.width = Math.max(0, prob.t / prob.total * 100) + '%'; timer.classList.toggle('low', prob.t < prob.total * 0.25); if (prob.t <= 0) problemTimeout(); }
    } else { nextProb -= dt; if (nextProb <= 0 && s.hp > 0) spawnProblem(); }
    // orbes (posición en DOM)
    for (const ob of orbs) { ob.ph += dt * 2.2; const by = ob.y + Math.sin(ob.ph) * 3; ob.el.style.left = (ob.x / 320) * 100 + '%'; ob.el.style.top = ((by - 18) / 180) * 100 + '%'; }
    updMonster(dt); uiBars();
  }

  /* ---------- dibujo propio ---------- */
  function drawBack(ctx: CanvasRenderingContext2D): void {
    for (const mk of marks) { const p = clamp(1 - mk.t / 0.9, 0, 1); ctx.globalAlpha = 0.25 + 0.4 * Math.abs(Math.sin(p * 18)); ctx.fillStyle = '#ff3c5a'; ctx.beginPath(); ctx.ellipse(mk.x, GY + 2, 15, 4, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; if (mk.t < 0.3) { const k = 1 - mk.t / 0.3; ctx.fillStyle = '#ffb347'; ctx.fillRect(Math.round(mk.x - 3), Math.round(-10 + (GY - 4) * k), 6, 12); ctx.fillStyle = '#fff3c4'; ctx.fillRect(Math.round(mk.x - 1), Math.round(-6 + (GY - 4) * k), 2, 6); } }
  }
  function drawFront(ctx: CanvasRenderingContext2D): void {
    for (const w of waves) { ctx.fillStyle = '#ffb347'; ctx.fillRect(Math.round(w.x - 5), GY - 10, 10, 10); ctx.fillStyle = '#fff3c4'; ctx.fillRect(Math.round(w.x - 2), GY - 7, 4, 7); }
    for (const p of projs) { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(Math.round(p.x), Math.round(p.y), p.r, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), 3, 3); }
    for (const ob of orbs) {
      if (ob.gone) continue; const y = Math.round(ob.y + Math.sin(ob.ph) * 3), x = Math.round(ob.x);
      ctx.globalAlpha = ob.dim ? 0.2 : 1; ctx.fillStyle = ob.col; ctx.globalAlpha *= 0.28; ctx.beginPath(); ctx.arc(x, y, 15, 0, 6.3); ctx.fill(); ctx.globalAlpha = ob.dim ? 0.25 : 1;
      ctx.fillStyle = '#1a1428'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.3); ctx.fill(); ctx.fillStyle = ob.col; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ffffffaa'; ctx.fillRect(x - 5, y - 6, 4, 3); ctx.globalAlpha = 1;
    }
  }

  /* ---------- fin ---------- */
  function finish(won: boolean): void {
    if (phase === 'end') return; phase = 'end'; prob = null; pop = null; popEl.hidden = true; labels.replaceChildren(); orbs.length = 0; projs.length = 0; waves.length = 0; marks.length = 0; view.setAura(0);
    if (won) { view.deathFx(); view.monDie(); sfx('explode'); view.zoomPulse(0.08); view.banner('¡VICTORIA!', '#ffd24d', 50); setTimeout(() => { view.heroWin(); sfx('win'); }, 500); }
    else { view.hero.play('die'); sfx('lose'); view.banner('DERROTA', '#ff6f7a', 50); playMusic('story', 0); }
    uiBars(); const res = { won, heroHp: Math.max(0, s.heroHp), hints: hintsUsed, best: s.best, lastTemplate };
    setTimeout(() => { cleanup(); o.onEnd(res); }, won ? 2100 : 1700);
  }

  /* ---------- inicio ---------- */
  uiBars(); updHint();
  say(o.intro.length ? o.intro : [{ speaker: m.name, text: m.line }], () => {
    let n = 3;
    const tick = (): void => { if (n > 0) { view.banner(String(n), '#ffd24d', 70); sfx('tick'); n--; setTimeout(tick, 520); } else { view.banner('¡PELEA!', '#ff6f7a', 70); sfx('crit'); phase = 'fight'; } };
    tick();
  });
}
