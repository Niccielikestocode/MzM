/** Combate en tiempo real: arena pixel art con PA para cartas, bocadillos colombianos, tutorial guiado y HUD dinámico. */
import type { CardDef, HeroDef, Level, MonsterDef, Question, Room, SaveData } from '../core/types';
import { cardById, topicById } from '../core/data';
import { pickBanter, pickMonsterTaunt } from '../core/lore';
import type { Rng } from '../core/rng';
import { h, ticker, heroSprite, monsterSprite } from './dom';
import { BattleView, GY } from '../gfx/battle';
import { gfxFlags } from '../gfx/scene';
import { drawGraph, drawNumberLine } from '../gfx/plot';
import { pickQuestion } from '../game/picker';
import { sfx, sfxForCard, playMusic, playBattleMusic, battleMusicKind, playAmbient, setIntensity } from './audio';
import * as A from '../game/arena';
import { artCanvas } from './cards';
import { victorySequence } from '../gfx/finale';
import { renderMathText } from './mathfmt';
import { questionVisual } from '../gfx/visual';
import { getKeyMap, matchesAction } from '../game/controls';
import { createVirtualJoystick } from './joystick';
import { smartHintFor } from '../domain/pedagogy/diagnosis';

export interface ArenaOpts {
  save: SaveData; hero: HeroDef; monster: MonsterDef; room: Room; level: Level; heroHp: number; rng: Rng; lastTemplate?: string;
  intro: { speaker: string; text: string }[];
  mount(el: HTMLElement, cleanup?: () => void): void; persist(): void; exit(): void;
  onAnswer(q: Question, correct: boolean): void;
  onEnd(r: { won: boolean; heroHp: number; hints: number; best: number; lastTemplate: string }): void;
  guidedTour?: { complete(): void; skip(): void };
}
interface Orb { x: number; y: number; ph: number; label: string; ok: boolean; dim: boolean; col: string; el: HTMLElement; gone: boolean }
interface Proj { x: number; y: number; vx: number; r: number; col: string }
type Box = { x0: number; x1: number; y0: number; y1: number };
const COLS = ['#e84a5f', '#5ab9ea', '#4ecb71', '#f5c542'];
const overlap = (a: Box, b: Box): boolean => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const cardCost = (c: CardDef): number => (c.rarity === 'comun' ? 1 : c.rarity === 'rara' ? 2 : 3);

export function startArena(o: ArenaOpts): void {
  const { save, hero, monster: m, room, level, rng } = o;
  const diffMode = save.settings.difficulty ?? 'normal';
  const keyMap = getKeyMap(save.settings.keybinds);
  const fallbackTopic = A.topicsForRoom(room, level.topic)[0];

  const s = A.newFight(m, room.questions ?? m.questions, room.hpMultiplier ?? 1, o.heroHp, hero.hp);
  const view = new BattleView(h('canvas', { class: 'c-canvas', 'aria-label': 'Arena de combate' }));
  view.setup(level.world, heroSprite(hero), monsterSprite(m));
  const sz: number = view.mon.def.size, monBase = sz > 32 ? 206 : 232;
  const tScale = save.settings.timeMode === 'veryslow' ? 0.45 : save.settings.timeMode === 'slow' ? 0.7 : 1;
  const noTimeout = !!save.settings.noTimeout;
  const slots: A.Slot[] = A.loadoutOf(save).map(id => ({ id, cd: 0, max: A.cooldownMs(cardById[id]) }));

  /* ---------- Energía de Cartas (PA: Puntos de Acierto) ---------- */
  let pa = 1;
  const MAX_PA = 4;

  /* ---------- DOM ---------- */
  const heroHpBar = h('i'), heroTxt = h('span'), shieldTxt = h('span', { class: 'c-block' }), monHpBar = h('i'), monTxt = h('span'), monStat = h('span', { class: 'c-phase' });
  const comboNum = h('b', { class: 'a-cn' }, '0'), comboTier = h('span', { class: 'a-ct' }), comboBar = h('i'), comboBox = h('div', { class: 'a-combo', hidden: true }, h('span', { class: 'a-cx' }, '×'), comboNum, h('small', {}, 'COMBO'), comboTier, h('div', { class: 'bar mini' }, comboBar));
  const labels = h('div', { class: 'a-labels' }), overlayEl = h('div', { class: 'c-overlay', hidden: true }), popEl = h('div', { class: 'a-pop', hidden: true });

  // Bocadillos de narración viva sobre héroe y monstruo
  const heroBubble = h('div', { class: 'speech-bubble hero-b', hidden: true });
  const monBubble = h('div', { class: 'speech-bubble mon-b', hidden: true });
  let heroBubT = 0, monBubT = 0;

  function sayBubble(who: 'hero' | 'mon', text: string, ms = 2400): void {
    if (!text) return;
    if (who === 'hero') {
      heroBubble.textContent = text;
      heroBubble.hidden = false;
      heroBubT = ms;
    } else {
      monBubble.textContent = text;
      monBubble.hidden = false;
      monBubT = ms;
    }
  }

  // Tutorial guiado para nuevos jugadores
  let tutStep = save.tutorialDone ? 0 : 1;
  const tutText = h('span', {});
  const tutBanner = h('div', { class: 'tut-banner', hidden: tutStep === 0 },
    h('b', { class: 'tut-tag' }, 'GUÍA'),
    tutText,
    h('button', { class: 'pbtn small ghost', onclick: () => finishTut() }, 'Entendido ✓')
  );
  function updTut(): void {
    if (tutStep === 0) { tutBanner.hidden = true; return; }
    tutBanner.hidden = false;
    if (tutStep === 1) tutText.textContent = 'Paso 1/3: Muévete (A/D o Joystick) y salta (Espacio / ▲) para esquivar al monstruo.';
    else if (tutStep === 2) tutText.textContent = 'Paso 2/3: ¡Problema activo! Salta y golpea el orbe correcto en la arena, o toca su botón [1-4].';
    else if (tutStep === 3) tutText.textContent = 'Paso 3/3: ¡Ganaste ⚡PA! Toca una carta iluminada abajo para desatar tu técnica especial.';
  }
  const persistSafe = () => { try { o.persist(); } catch { /* nada */ } };
  function finishTut(): void { tutStep = 0; save.tutorialDone = true; persistSafe(); updTut(); }
  updTut();

  // Tarjeta de pregunta limpia y profesional
  const qTopicBadge = h('span', { class: 'q-topic-badge' }, topicById[level.topic]?.name ?? 'Matemáticas');
  const qDiffStars = h('span', { class: 'diff' }, '●●○○');
  const qModeBadge = h('span', { class: `q-diff-badge ${diffMode}` }, diffMode.toUpperCase());
  const qMeta = h('div', { class: 'q-meta-row' }, qTopicBadge, qDiffStars, qModeBadge);
  const qText = h('p', { class: 'q-text' }, '¡Prepárate! El guardián se acerca…');
  const qMedia = h('div', { class: 'q-media' });
  const answerBar = h('div', { class: 'q-quick-answers' });
  const timerBar = h('i'), timer = h('div', { class: 'bar a-timer' }, timerBar), qFb = h('div', { class: 'q-fb', 'aria-live': 'polite' });
  const hintBtn = h('button', { class: 'pbtn small', onclick: () => useHint() }, 'Pista (H)'), pauseBtn = h('button', { class: 'pbtn small ghost', onclick: () => pause(true) }, 'Pausa (P)');

  // Barra visual de PA (Puntos de Acierto) + Cartas Técnicas
  const paMeter = h('div', { class: 'pa-meter' });
  const skillEls = slots.map((sl, i) => {
    const c = cardById[sl.id], cost = cardCost(c);
    const costBadge = h('span', { class: 'sk-cost' }, `⚡${cost}`);
    const b = h('button', { class: 'skill', onclick: () => castSlot(i), title: `${c.name} (${cost} PA): ${c.effect}` },
      costBadge, artCanvas(c), h('span', { class: 'sk-n' }, c.name), h('span', { class: 'sk-fx-mini' }, c.type));
    b.style.setProperty('--c', ({ ataque: '#e84a5f', defensa: '#5ab9ea', utilidad: '#4ecb71', riesgo: '#f5c542' } as any)[c.type] ?? '#aaa');
    return { b, cost };
  });

  let lastPa = -1, lastPaPhase = '';
  function updPA(): void {
    if (lastPa === pa && lastPaPhase === phase) return;
    lastPa = pa; lastPaPhase = phase;
    paMeter.replaceChildren(
      h('span', { class: 'pa-lbl' }, '⚡ ENERGÍA (PA):'),
      ...Array.from({ length: MAX_PA }, (_, idx) => h('i', { class: `pa-gem${idx < pa ? ' on' : ''}` }))
    );
    skillEls.forEach(({ b, cost }) => {
      const ready = pa >= cost && phase === 'fight';
      b.classList.toggle('ready', ready);
      b.disabled = !ready;
    });
  }

  // Controles táctiles móviles ergonómicos con Joystick y botones
  const touchLeft = h('div', { class: 'tpad-left' });
  const touchRight = h('div', { class: 'tpad-right' });
  const touch = h('div', { class: 'a-touch' }, touchLeft, touchRight);
  function tbtn(t: string, k: string, cls = ''): HTMLElement {
    const b = h('button', { class: 'tb ' + cls, 'aria-label': k }, t);
    const on = (e: Event) => { e.preventDefault(); press(k, true); b.classList.add('on'); };
    const off = (e: Event) => { e.preventDefault(); press(k, false); b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  }
  touchRight.append(tbtn('»', 'dash', 'small'), tbtn('▲', 'jump', 'medium'), tbtn('⚔', 'atk', 'big'));

  const root = h('div', { class: 'arena', 'data-world': level.world },
    h('div', { class: 'a-top' },
      h('div', { class: 'c-side' }, h('span', { class: 'c-name' }, save.profile.name), h('div', { class: 'bar hp' }, heroHpBar), h('div', { class: 'c-nums' }, heroTxt, shieldTxt)),
      comboBox,
      h('div', { class: 'c-side r' }, h('span', { class: 'c-name' }, m.name + (room.miniBoss ? ' (mini jefe)' : '')), h('div', { class: 'bar mhp' }, monHpBar), h('div', { class: 'c-nums' }, monTxt, monStat))),
    tutBanner,
    h('div', { class: 'a-main' },
      h('div', { class: 'a-left' },
        h('div', { class: 'c-stage' }, view.cv, labels, heroBubble, monBubble, popEl, overlayEl),
        h('div', { class: 'a-skills-wrap' }, paMeter, h('div', { class: 'a-skills' }, ...skillEls.map(e => e.b)))),
      h('div', { class: 'a-side' },
        h('div', { class: 'q-panel' },
          qMeta, qText, qMedia, timer, answerBar, qFb,
          h('div', { class: 'q-footer' },
            h('span', { class: 'q-action-tip' }, '🎯 Golpea el orbe en la arena o elige [1-4]'),
            h('div', { class: 'c-tools' }, hintBtn, pauseBtn)
          )
        ),
        h('p', { class: 'a-help' }, 'A/D mover · Espacio saltar · K dash · J golpear · 1-4 responder · Clic en carta ⚡PA · H pista'))),
    touch);

  const joy = createVirtualJoystick(touchLeft, {
    onMove(dir) {
      pressed.left = dir.left;
      pressed.right = dir.right;
      if (dir.up) queued.jump = true;
    }
  });

  /* ---------- estado físico ---------- */
  const H = { x: 40, yo: 0, vy: 0, face: 1, dashT: 0, dashCd: 0, inv: 0, atkCd: 0, chainT: 0, step: 0, swing: -1, swingT: 0, hitStun: 0, air: false };
  const M = { x: monBase, st: 'idle' as 'idle' | 'tele' | 'act' | 'back', t: 0, pat: '', tx: 0, hit: false, next: 3.5, clock: 0, burnAcc: 0, shots: [] as number[] };
  const orbs: Orb[] = [], projs: Proj[] = [], waves: { x: number; vx: number }[] = [], marks: { x: number; t: number }[] = [];
  let chal: { q: Question; settled: boolean } | null = null;
  let prob: { q: Question; t: number; total: number } | null = null, nextProb = 1.6;
  let phase: 'intro' | 'fight' | 'end' = 'intro', paused = false, disposed = false, hints = diffMode === 'casual' ? 2 : 1, lastTemplate = o.lastTemplate ?? '', hintsUsed = 0, shotT = 0;
  let tourActive = !!o.guidedTour, tourStep = 0;
  let offChalT: (() => void) | null = null;
  const keys = new Set<string>(), pressed: Record<string, boolean> = {}, queued = { jump: false, dash: false, atk: false };
  const tourSteps = [
    { title: 'Controles', text: 'Muévete y esquiva los ataques. Usa A/D, Espacio, K y J; en móvil, utiliza el joystick y los botones.', targets: ['.a-help', '.a-touch'] },
    { title: 'Arena de combate', text: 'Aquí ves a tu héroe, al enemigo y los orbes de respuesta. Golpea el orbe que corresponda a la respuesta correcta.', targets: ['.c-stage'] },
    { title: 'Vidas y combo', text: 'Vigila la vida de ambos combatientes. Encadenar aciertos aumenta tu combo.', targets: ['.a-top'] },
    { title: 'Pregunta y respuestas', text: 'Resuelve el ejercicio y elige su respuesta con los botones numerados o golpeando el orbe del mismo color.', targets: ['.q-panel'] },
    { title: 'Energía y técnicas', text: 'Cada acierto te da energía. Cuando tengas suficiente, toca una carta para usar su técnica.', targets: ['.a-skills-wrap'] }
  ];
  const tourSpotlight = h('div', { class: 'battle-tour-spotlight', 'aria-hidden': 'true' });
  const tourTitle = h('h2', {});
  const tourText = h('p', { 'aria-live': 'polite' });
  const tourProgress = h('span', { class: 'battle-tour-progress' });
  const tourPrevious = h('button', { class: 'pbtn small ghost', 'aria-label': 'Paso anterior', onclick: () => moveTour(-1) }, '← Anterior');
  const tourNext = h('button', { class: 'pbtn small', onclick: () => moveTour(1) }, 'Siguiente →');
  const tourCard = h('section', { class: 'battle-tour-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'battle-tour-title' },
    tourTitle, tourText,
    h('div', { class: 'battle-tour-footer' }, tourProgress, h('div', { class: 'row' }, tourPrevious, tourNext)),
    h('button', { class: 'battle-tour-skip', onclick: () => skipTour() }, 'Saltar tutorial')
  );
  tourTitle.id = 'battle-tour-title';
  const tourLayer = h('div', { class: 'battle-tour-layer', hidden: true }, tourSpotlight, tourCard);
  root.append(tourLayer);

  function updateTourFocus(): void {
    const target = tourSteps[tourStep].targets
      .map(selector => root.querySelector<HTMLElement>(selector))
      .find((el): el is HTMLElement => !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0);
    if (!target) {
      tourSpotlight.hidden = true;
      return;
    }
    tourSpotlight.hidden = false;
    const rect = target.getBoundingClientRect();
    const pad = 7;
    const left = Math.max(0, rect.left - pad), top = Math.max(0, rect.top - pad);
    tourSpotlight.style.left = `${left}px`;
    tourSpotlight.style.top = `${top}px`;
    tourSpotlight.style.width = `${Math.min(window.innerWidth - left, rect.width + pad * 2)}px`;
    tourSpotlight.style.height = `${Math.min(window.innerHeight - top, rect.height + pad * 2)}px`;
    const placeBelow = rect.top < window.innerHeight * 0.45;
    tourCard.style.top = placeBelow ? 'auto' : '12px';
    tourCard.style.bottom = placeBelow ? '12px' : 'auto';
  }
  function renderTourStep(): void {
    const step = tourSteps[tourStep];
    tourTitle.textContent = step.title;
    tourText.textContent = step.text;
    tourProgress.textContent = `${tourStep + 1} / ${tourSteps.length}`;
    tourPrevious.disabled = tourStep === 0;
    tourNext.textContent = tourStep === tourSteps.length - 1 ? 'Terminar guía ✓' : 'Siguiente →';
    tourLayer.hidden = false;
    window.requestAnimationFrame(updateTourFocus);
  }
  function closeTour(): void {
    tourActive = false;
    tourLayer.hidden = true;
    window.removeEventListener('resize', updateTourFocus);
  }
  function moveTour(direction: number): void {
    if (!tourActive) return;
    const nextStep = tourStep + direction;
    if (nextStep < 0) return;
    if (nextStep >= tourSteps.length) {
      closeTour();
      o.guidedTour?.complete();
      return;
    }
    tourStep = nextStep;
    renderTourStep();
  }
  function skipTour(): void {
    if (!tourActive) return;
    closeTour();
    o.guidedTour?.skip();
  }
  (window as any).__jmArena = { H, M, s, orbs, projs, waves, marks, get phase() { return phase; }, get prob() { return prob; } };
  view.arena = true; view.hero.homeX = H.x; gfxFlags.reduce = save.settings.reduceMotion;

  function press(k: string, on: boolean): void { pressed[k] = on; if (on) { if (k === 'jump') queued.jump = true; if (k === 'dash') queued.dash = true; if (k === 'atk') queued.atk = true; } }
  const dirX = (): number => ((keyMap.left.some(k => keys.has(k)) || pressed.left) ? -1 : 0) + ((keyMap.right.some(k => keys.has(k)) || pressed.right) ? 1 : 0);

  const onKeyDown = (e: KeyboardEvent): void => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (tourActive) {
      if (k === 'arrowleft') { e.preventDefault(); moveTour(-1); }
      else if (k === 'arrowright') { e.preventDefault(); moveTour(1); }
      else if (k === 'escape') { e.preventDefault(); skipTour(); }
      return;
    }
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
    if (e.repeat) { keys.add(k); return; }
    keys.add(k);
    if (!overlayEl.hidden) return;
    if (matchesAction(k, 'pause', keyMap) || k === 'escape') { pause(!paused); return; }
    if (paused || phase !== 'fight') return;
    if (chal) { if (/^[1-4]$/.test(k)) (root.querySelectorAll('.chal-in .opt')[+k - 1] as HTMLElement | undefined)?.click(); return; }

    // 1-4 responde al problema activo si hay orbes; si no hay problema activo, lanza la carta correspondiente
    if (/^[1-4]$/.test(k)) {
      const idx = +k - 1;
      if (prob && orbs[idx] && !orbs[idx].gone && !orbs[idx].dim) {
        hitOrb(orbs[idx], true);
        return;
      }
      castSlot(idx);
      return;
    }

    if (matchesAction(k, 'jump', keyMap)) queued.jump = true;
    else if (matchesAction(k, 'dash', keyMap)) queued.dash = true;
    else if (matchesAction(k, 'attack', keyMap)) queued.atk = true;
    else if (matchesAction(k, 'hint', keyMap)) useHint();
  };

  const onKeyUp = (e: KeyboardEvent): void => { keys.delete(e.key.toLowerCase()); };
  const onBlur = (): void => { keys.clear(); if (phase === 'fight' && !paused) pause(true); };
  const onVis = (): void => { if (document.hidden) onBlur(); };

  document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur); document.addEventListener('visibilitychange', onVis);
  view.cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0 && phase === 'fight' && !paused && overlayEl.hidden) queued.atk = true; });
  view.cv.addEventListener('contextmenu', e => e.preventDefault());

  let off: (() => void) | null = null;
  const cleanup = (): void => {
    disposed = true;
    joy.destroy();
    offChalT?.(); offChalT = null;
    window.removeEventListener('resize', updateTourFocus);
    document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVis); off?.(); off = null;
  };
  o.mount(root, cleanup);
  if (o.guidedTour) {
    phase = 'fight';
    renderTourStep();
    window.addEventListener('resize', updateTourFocus);
  }
  const bossFight = room.type === 'boss' || !!m.boss || !!room.miniBoss;
  const musicKind = battleMusicKind(level.world, bossFight, !!level.boss, !!level.final);
  playBattleMusic(level.world, musicKind); playAmbient(level.world); setIntensity(bossFight ? 2 : 1);
  off = ticker.add(rawDt => { view.step(rawDt); frame(rawDt); });
  view.frontHook = drawFront; view.backHook = drawBack;

  /* ---------- utilidades ---------- */
  const heroBox = (): Box => ({ x0: H.x + 8, x1: H.x + 24, y0: GY - 30 - H.yo, y1: GY - H.yo });
  const monBox = (): Box => ({ x0: M.x + sz * 0.18, x1: M.x + sz * 0.82, y0: GY - sz * 0.9, y1: GY });
  const monCX = (): number => M.x + sz / 2;

  function pause(on: boolean): void {
    if (phase !== 'fight') return; paused = on;
    if (on) {
      overlayEl.hidden = false;
      overlayEl.replaceChildren(h('div', { class: 'dlg' },
        h('h3', {}, 'Pausa'),
        h('p', {}, 'El combate está detenido.'),
        h('div', { class: 'dlg-btns' },
          h('button', { class: 'pbtn', onclick: () => { sfx('click'); pause(false); } }, 'Seguir'),
          h('button', { class: 'pbtn ghost', onclick: () => { sfx('click'); cleanup(); o.exit(); } }, 'Salir al Mapa'))));
      (overlayEl.querySelector('button') as HTMLElement).focus();
    } else overlayEl.hidden = true;
  }

  const uiBars = (): void => {
    heroHpBar.style.width = Math.max(0, (s.heroHp / s.heroMax) * 100) + '%'; heroTxt.textContent = `♥ ${Math.max(0, s.heroHp)}/${s.heroMax}`;
    shieldTxt.textContent = s.shield ? `🛡 ${s.shield}` : ''; shieldTxt.hidden = !s.shield;
    monHpBar.style.width = Math.max(0, (s.hp / s.maxHp) * 100) + '%'; monTxt.textContent = `${Math.max(0, s.hp)}/${s.maxHp}`;
    monStat.textContent = [s.stunT > 0 ? '⚡ aturdido' : '', s.burnT > 0 ? '🔥 quema' : '', s.weakT > 0 ? '↓ débil' : '', (room.phases ?? m.phases) ? topicById[A.topicNow(s, fallbackTopic, room)]?.name ?? '' : ''].filter(Boolean).join(' · ');
    setIntensity(m.boss || s.heroHp / s.heroMax < 0.35 ? 2 : 1);
    updPA();
  };

  const say = (lines: { speaker: string; text: string }[], then: () => void): void => {
    let i = 0;
    const show = (): void => {
      if (disposed) return;
      if (i >= lines.length) { overlayEl.hidden = true; then(); return; }
      const l = lines[i++]; overlayEl.hidden = false;
      overlayEl.replaceChildren(h('div', { class: 'dlg' }, h('b', {}, l.speaker === 'heroe' ? save.profile.name : l.speaker), h('p', {}, l.text), h('button', { class: 'pbtn', onclick: () => { sfx('click'); show(); } }, i < lines.length ? 'Siguiente' : '¡A pelear!')));
      (overlayEl.querySelector('button') as HTMLElement).focus();
    };
    show();
  };

  function gain(n: number): void {
    const boost = diffMode === 'expert' ? Math.round(n * 1.5) : n;
    const t = A.addCombo(s, boost);
    comboBox.hidden = s.combo < 2; comboNum.textContent = String(s.combo); comboBox.classList.remove('pop'); void comboBox.offsetWidth; comboBox.classList.add('pop');
    view.setAura(s.combo >= 2 ? [0, 2, 3, 5, 6][A.comboTier(s.combo)] : 0);
    if (t) {
      comboTier.textContent = A.TIER_NAME[t];
      view.banner(A.TIER_NAME[t], ['', '#f5c542', '#ff9a3c', '#e84a5f', '#c8a3ff'][t], 40);
      sfx(('combo' + t) as any); view.zoomPulse(0.03 + t * 0.01);
      sayBubble('hero', pickBanter(hero.id, 'combo'));
    }
  }
  function loseCombat(): void {
    if (s.combo >= 3) view.float('combo roto', view.heroCenter()[0], view.heroCenter()[1] - 26, '#9a90b8');
    A.breakCombo(s); comboBox.hidden = true; comboTier.textContent = ''; view.setAura(0);
  }
  function loseCombatSoft(): void { s.comboT = Math.max(0, s.comboT - 700); }

  /* ---------- impactos ---------- */
  function hurtHero(n: number, kx = 0): void {
    if (phase !== 'fight' || H.inv > 0) return;
    let d = Math.max(1, Math.round(n * (s.weakT > 0 ? 0.6 : 1)));
    if (s.reflectT > 0) { const r = Math.max(1, Math.ceil(d / 2)); hitMonster(r, 'reflect'); }
    const [hx, hy] = view.heroCenter();
    if (s.shield > 0) { const t = Math.min(s.shield, d); s.shield -= t; d -= t; view.bigNum('BLOQUEO', hx, hy - 6, '#5ab9ea'); sfx('block'); }
    if (d > 0) {
      s.heroHp = Math.max(0, s.heroHp - d);
      view.heroHurt(); view.hurtFx(); sfx('hurt');
      view.bigNum(`-${d}`, hx, hy - 6, '#e84a5f', d >= 5);
      sayBubble('hero', pickBanter(hero.id, 'hurt'), 1800);
      loseCombat(); H.hitStun = 0.28; H.vy = Math.max(H.vy, 90); H.x = clamp(H.x + kx * 14, 4, 284);
    }
    H.inv = d > 0 ? 1.1 : 0.4; uiBars();
    if (s.heroHp <= 0) finish(false);
  }

  function hitMonster(n: number, kind: 'hit' | 'orb' | 'card' | 'reflect' | 'burn', crit = false): void {
    if (phase !== 'fight' || n <= 0) return;
    const [mx, my] = view.monCenter();
    if (kind === 'hit' || kind === 'reflect') {
      const ok = Math.min(n, A.chipLeft(s));
      if (ok < n && s.chip >= Math.floor(s.maxHp * A.CHIP_CAP)) {
        if (!view.cv.dataset.warn || Date.now() - +view.cv.dataset.warn > 2500) {
          view.cv.dataset.warn = String(Date.now());
          view.float('¡Protegido! Resuelve el problema', mx, my - 34, '#5ab9ea');
        }
        if (view.fx.length < 40) view.burst(mx, my, '#5ab9ea', 6);
        sfx('block'); view.monHurt(); return;
      }
      n = ok; s.chip += n;
    }
    s.hp = Math.max(0, s.hp - n);
    view.monHurt();
    if (kind !== 'burn') view.hitFx(Math.min(8, n / 2), crit);
    view.bigNum(`-${n}`, mx, my - 4, kind === 'burn' ? '#ff9a3c' : crit ? '#f5c542' : '#ffffff', crit);
    if (crit && rng() < 0.4) sayBubble('mon', pickMonsterTaunt('hurt'), 1600);
    uiBars();
    if (s.hp <= 0) finish(true);
  }

  /* ---------- héroe ---------- */
  function doDash(): void {
    if (H.dashCd > 0 || H.dashT > 0 || H.hitStun > 0 || view.tweens.length) return;
    H.dashT = 0.2; H.dashCd = 0.75; H.inv = Math.max(H.inv, 0.28);
    sfx('dash'); view.burst(H.x + 16, GY - 4, '#5ab9ea', 8);
    if (dirX()) H.face = dirX();
    if (M.st === 'tele' || M.st === 'act') sayBubble('hero', pickBanter(hero.id, 'dash'), 1400);
  }
  function doJump(): void {
    if (H.yo > 0.5 || H.hitStun > 0 || view.tweens.length) return;
    H.vy = 215; H.air = true; sfx('jump'); view.burst(H.x + 16, GY - 2, '#d4c5a9', 5);
  }
  function doAttack(): void {
    if (H.atkCd > 0 || H.dashT > 0 || H.hitStun > 0 || view.tweens.length || phase !== 'fight') return;
    H.step = H.chainT > 0 ? (H.step + 1) % 3 : 0; const last = H.step === 2;
    H.atkCd = last ? 0.44 : 0.26; H.chainT = 0.7; H.swing = 0.07; H.swingT = 0.16;
    view.hero.play('attack'); sfx(('swing' + (H.step + 1)) as any);
    H.x = clamp(H.x + H.face * (last ? 10 : 5), 4, 284); slashFx(H.step);
  }
  function slashFx(step: number): void {
    const f = H.face, cx = H.x + 16, cy = GY - 16 - H.yo, col = ['#ffffff', '#5ab9ea', '#f5c542'][step], r = step === 2 ? 30 : 24;
    view.fx.push({ t: 0, life: 170, draw(ctx: CanvasRenderingContext2D, p: number) { ctx.globalAlpha = 1 - p; ctx.strokeStyle = col; ctx.lineWidth = step === 2 ? 4 : 3; ctx.beginPath(); const a0 = step === 1 ? 0.9 : -0.9, a1 = step === 1 ? -0.9 : 0.9, k = a0 + (a1 - a0) * Math.min(1, p * 1.6); ctx.arc(cx + f * 4, cy, r, f > 0 ? k - 0.5 : Math.PI - k - 0.5, f > 0 ? k + 0.5 : Math.PI - k + 0.5); ctx.stroke(); ctx.globalAlpha = 1; } });
  }
  function resolveSwing(): void {
    const f = H.face, cx = H.x + 16, cy = GY - 16 - H.yo;
    const box: Box = { x0: f > 0 ? cx + 2 : cx - 36, x1: f > 0 ? cx + 36 : cx - 2, y0: cy - 22, y1: cy + 20 };
    let any = false;
    for (const ob of orbs) if (!ob.gone && !ob.dim && overlap(box, { x0: ob.x - 10, x1: ob.x + 10, y0: ob.y - 10, y1: ob.y + 10 })) { hitOrb(ob); any = true; break; }
    for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; if (overlap(box, { x0: p.x - p.r, x1: p.x + p.r, y0: p.y - p.r, y1: p.y + p.r })) { projs.splice(i, 1); view.burst(p.x, p.y, p.col, 12); sfx('break'); gain(1); view.float('¡PARADA!', p.x, p.y - 12, '#f5c542'); any = true; } }
    if (overlap(box, monBox())) {
      const stunned = s.stunT > 0, d = Math.round(A.hitDamage(H.step, s.combo) * (stunned ? 1.5 : 1)), crit = H.step === 2 || stunned;
      hitMonster(d, 'hit', crit); sfx(crit ? 'crit' : 'hit'); gain(1); any = true;
    }
    if (!any && H.step === 2) loseCombatSoft();
  }

  /* ---------- orbes y preguntas ---------- */
  function topicDiff(): number {
    const [lo, hi] = m.difficulty, base = (room.difficulty ?? lo) + s.diff + s.prep.delta;
    return Math.max(1, Math.min(4, Math.max(lo > 1 ? lo - 1 : 1, Math.min(hi, base))));
  }
  function makeQ(allowStage = false): Question {
    const topic = A.topicNow(s, fallbackTopic, room); let q: Question;
    for (let i = 0; i < 14; i++) {
      q = pickQuestion({ topics: [topic], difficulty: topicDiff(), rng, save, lastTemplate });
      if (allowStage ? (q.stage || q.options.length >= 2) : (!q.stage && !q.clickTarget && q.options.length >= 2)) break;
    }
    lastTemplate = q!.template; return q!;
  }
  function renderMedia(q: Question, into: HTMLElement): void {
    into.replaceChildren();
    if (q.graph) { const cv = h('canvas', { class: 'q-cv', 'aria-label': 'Gráfica' }); drawGraph(cv, q.graph); into.append(cv); }
    if (q.numberLine) { const cv = h('canvas', { class: 'q-cv nl', 'aria-label': 'Recta numérica' }); drawNumberLine(cv, q.numberLine); into.append(cv); }
  }

  function spawnProblem(): void {
    if (phase !== 'fight' || disposed) return;
    const q = makeQ(true);
    const timeMod = diffMode === 'casual' ? 1.5 : diffMode === 'expert' ? 0.8 : 1.0;
    const total = noTimeout ? 0 : Math.round(A.answerTime(topicDiff()) * timeMod);
    if (q.stage) { openChallenge(q); return; }

    let opts = q.options.map((t, i) => ({ t, ok: i === q.correct }));
    if (opts.length > 4) { const wr = opts.filter(x => !x.ok).slice(0, 3); opts = [opts.find(x => x.ok)!, ...wr]; }

    const xs = [66, 108, 150, 192].sort(() => rng() - 0.5);
    const hs = [GY - 16, GY - 16, GY - 48, GY - 48].sort(() => rng() - 0.5);

    labels.replaceChildren(); orbs.length = 0; answerBar.replaceChildren();

    opts.sort(() => rng() - 0.5).forEach((op, i) => {
      const el = h('div', { class: 'orb-lbl', style: { borderColor: COLS[i] } });
      renderMathText(el, `${i + 1}. ${op.t}`);
      labels.append(el);

      const ob: Orb = { x: xs[i], y: hs[i], ph: rng() * 6, label: op.t, ok: op.ok, dim: false, col: COLS[i], el, gone: false };
      orbs.push(ob);

      const txt = h('span', { class: 'q-ans-txt' });
      renderMathText(txt, op.t);
      const chip = h('button', {
        class: 'q-ans-chip',
        onclick: () => { if (!ob.gone && !ob.dim) hitOrb(ob, true); }
      }, h('span', { class: 'q-ans-num' }, String(i + 1)), txt);
      chip.style.setProperty('--ac', ob.col);
      answerBar.append(chip);
    });

    let rm = s.prep.remove; s.prep.remove = 0; s.prep.delta = 0;
    for (const ob of orbs.filter(x => !x.ok).sort(() => rng() - 0.5)) { if (rm <= 0) break; dimOrb(ob); rm--; }

    prob = { q, t: total, total };
    qTopicBadge.textContent = topicById[q.topic]?.name ?? 'Matemáticas';
    qDiffStars.textContent = '●'.repeat(q.difficulty) + '○'.repeat(4 - q.difficulty);
    renderMathText(qText, q.text);
    qText.className = 'q-text'; qFb.textContent = ''; qFb.className = 'q-fb';
    renderMedia(q, qMedia);
    const qv = questionVisual(q); if (qv) qMedia.append(qv);
    timer.hidden = noTimeout; timerBar.style.width = '100%';
    sfx('orb'); view.banner('¡PROBLEMA!', '#5ab9ea', 34);
    (window as any).__jmQ = q; (window as any).__jmOrbs = orbs;
    if (tutStep === 1) { tutStep = 2; updTut(); }
    updHint();
  }

  function dimOrb(ob: Orb): void {
    ob.dim = true; ob.el.classList.add('dim');
    const idx = orbs.indexOf(ob);
    if (idx >= 0) (answerBar.children[idx] as HTMLElement | undefined)?.classList.add('dim');
    view.burst(ob.x, ob.y, '#777', 6); sfx('break');
  }
  function useHint(): void {
    if (!prob || hints < 1 || paused || phase !== 'fight') return;
    const w = orbs.filter(x => !x.ok && !x.dim && !x.gone);
    if (w.length <= 1) return;
    hints--; hintsUsed++; s.hintsUsed++;
    dimOrb(w[Math.floor(rng() * w.length)]);
    const tip = smartHintFor(prob.q);
    qFb.className = 'q-fb hint-msg';
    qFb.replaceChildren(h('b', {}, '💡 Maestra Aritmia: '), tip);
    sayBubble('hero', '¡Gracias por la pista, Maestra!', 1600);
    updHint();
  }
  const updHint = (): void => { hintBtn.textContent = `Pista (H)${hints ? ' · ' + hints : ''}`; hintBtn.disabled = !(prob && hints > 0); };

  function endProblem(ok: boolean, given: string, why: string): void {
    const q = prob!.q; prob = null;
    A.recordAnswer(save, q, ok, given); o.onAnswer(q, ok); A.adaptDiff(s, ok);
    save.stats.bestStreak = Math.max(save.stats.bestStreak, s.best); o.persist();
    s.asked++; if (ok) s.correct++;
    orbs.forEach(ob => { ob.gone = true; ob.el.remove(); }); answerBar.replaceChildren();
    qFb.className = 'q-fb ' + (ok ? 'ok' : 'no');
    qFb.replaceChildren(h('b', {}, why + ' '), 'Respuesta: ' + q.options[q.correct] + '. ', q.explain);
    labels.replaceChildren();
    nextProb = (A.questionGap(1) / 1000) * (ok ? 0.8 : 1);
    timerBar.style.width = '0%'; qMedia.replaceChildren();
    hints = Math.min(2, hints + (ok && s.correct % 3 === 0 ? 1 : 0));
    updHint(); updPA();
  }

  function hitOrb(ob: Orb, graphic = false): void {
    if (!prob || ob.gone || phase !== 'fight') return;
    view.burst(ob.x, ob.y, ob.col, 20);
    if (ob.ok) {
      pa = Math.min(MAX_PA, pa + 1);
      const d = Math.round(A.orbDamage(s.maxHp, s.combo, room.questions ?? m.questions) * (graphic ? 1.2 : 1));
      sfx('orbok');
      const hl = Math.min(2, s.heroMax - s.heroHp);
      if (hl > 0) { s.heroHp += hl; view.bigNum(`+${hl}`, view.heroCenter()[0], view.heroCenter()[1] - 6, '#4ecb71'); }
      gain(3);
      view.hero.play('attack'); H.swingT = 0.16; view.zoomPulse(0.06);
      view.banner(graphic ? '¡A LA FIJA!' : '¡CORRECTO!', '#4ecb71', 40);
      sayBubble('hero', pickBanter(hero.id, 'hit'));
      if (tutStep === 2) { tutStep = 3; updTut(); }
      endProblem(true, ob.label, '✓ ¡Correcto! (+1 ⚡PA)');
      hitMonster(d, 'orb', true);
    } else {
      sfx('orbbad'); loseCombat(); view.banner('¡INCORRECTO!', '#e84a5f', 40); qPanelShake();
      sayBubble('hero', pickBanter(hero.id, 'miss'));
      endProblem(false, ob.label, '✗ No era esa.');
      hurtHero(Math.max(2, Math.round(m.attack.damage * 0.7)));
    }
  }

  function qPanelShake(): void { const p = root.querySelector('.q-panel')!; p.classList.remove('shake'); void (p as HTMLElement).offsetWidth; p.classList.add('shake'); }
  function problemTimeout(): void { sfx('bad'); loseCombat(); view.banner('¡TIEMPO!', '#f5c542', 40); endProblem(false, '—', '⏱ Se acabó el tiempo.'); }

  /* ---------- retos gráficos interactivos ---------- */
  function openChallenge(q: Question): void {
    touch.classList.add('hud-dimmed');
    const v2 = new BattleView(h('canvas', { class: 'c-canvas chal-cv', 'aria-label': 'Reto gráfico' }));
    v2.setup(level.world, heroSprite(hero), monsterSprite(m)); v2.monVisible = true;
    offChalT?.();
    offChalT = ticker.add(rawDt => v2.step(rawDt));
    const click = !!q.clickTarget;
    const st = { q, settled: false }; chal = st; (window as any).__jmQ = q;
    const optsEl = h('div', { class: 'q-opts' }), help = h('p', { class: 'muted' }, click ? 'Toca el plano para lanzar el hechizo en esa coordenada.' : 'Elige la respuesta y mira cómo se resuelve en la escena.');
    const fin = (ok: boolean, given: string): void => {
      if (st.settled) return; st.settled = true;
      setTimeout(() => {
        offChalT?.(); offChalT = null;
        if (disposed) return;
        modal.remove(); chal = null; touch.classList.remove('hud-dimmed');
        resolveChallenge(q, ok, given);
      }, 1000);
    };
    let stageGiven = '';
    q.options.slice(0, 4).forEach((t, i) => optsEl.append(h('button', {
      class: 'opt',
      onclick: () => { if (st.settled || !v2.stageReady()) return; optsEl.querySelectorAll('button').forEach(b => ((b as HTMLButtonElement).disabled = true)); v2.stagePick(i); stageGiven = t; }
    }, h('b', {}, String(i + 1)), h('span', {}, t))));
    v2.beginStage(q.stage!.id, q.stage!.meta, q, ok => fin(ok, click ? '(punto tocado)' : stageGiven));
    v2.cv.addEventListener('pointermove', e => v2.pointer('move', e.clientX, e.clientY));
    v2.cv.addEventListener('pointerdown', e => { if (click) v2.pointer('down', e.clientX, e.clientY); });
    const modal = h('div', { class: 'a-chal' }, h('div', { class: 'chal-in' }, h('b', { class: 'chal-t' }, '⚔ Reto Gráfico Interactivo'), h('p', { class: 'q-text' }, q.text), v2.cv, click ? null : optsEl, help));
    root.append(modal); sfx('swell'); view.banner('¡RETO GRÁFICO!', '#5ab9ea', 34);
  }
  function resolveChallenge(q: Question, ok: boolean, given: string): void {
    A.recordAnswer(save, q, ok, given); o.onAnswer(q, ok); A.adaptDiff(s, ok);
    save.stats.bestStreak = Math.max(save.stats.bestStreak, s.best); o.persist();
    s.asked++; if (ok) s.correct++;
    renderMathText(qText, q.text); qFb.className = 'q-fb ' + (ok ? 'ok' : 'no');
    qFb.replaceChildren(h('b', {}, ok ? '✓ ¡Reto superado! (+2 ⚡PA) ' : '✗ No salió. '), q.explain);
    nextProb = (A.questionGap(1) / 1000) * (ok ? 0.8 : 1);
    if (phase !== 'fight') return;
    if (ok) {
      pa = Math.min(MAX_PA, pa + 2);
      const d = Math.round(A.orbDamage(s.maxHp, s.combo, room.questions ?? m.questions) * 1.35);
      sfx('orbok'); gain(3); view.zoomPulse(0.06); view.banner('¡RETO SUPERADO!', '#4ecb71', 40);
      sayBubble('hero', pickBanter(hero.id, 'hit'));
      hitMonster(d, 'orb', true);
    } else {
      sfx('orbbad'); loseCombat(); view.banner('¡FALLASTE EL RETO!', '#e84a5f', 40); qPanelShake();
      sayBubble('hero', pickBanter(hero.id, 'miss'));
      hurtHero(Math.max(2, Math.round(m.attack.damage * 0.7)));
    }
    updPA();
  }

  /* ---------- cartas técnicas (activación inmediata por PA) ---------- */
  function castSlot(i: number): void {
    const sl = slots[i], el = skillEls[i];
    if (!sl || !el || phase !== 'fight' || paused || view.tweens.length) return;
    if (pa < el.cost) { sfx('bad'); return; }
    pa -= el.cost;
    if (tutStep === 3) finishTut();
    updPA();
    const c = cardById[sl.id];
    H.inv = Math.max(H.inv, 0.7); view.hero.homeX = H.x;
    sayBubble('hero', pickBanter(hero.id, 'card'));
    const evs = A.applyCard(s, c, true, slots);
    sfxForCard(view.fxKind(c).kind);
    const [hx, hy] = view.heroCenter();
    const dmg = evs.find(e => e.t === 'damage') as { n: number } | undefined;
    if (dmg) s.hp += dmg.n; // se aplica en el impacto visual
    view.cast(c, () => {
      if (phase !== 'fight' || disposed) return;
      const [mx, my] = view.monCenter();
      for (const e of evs) {
        if (e.t === 'damage') { hitMonster(e.n, 'card', true); sfx('crit'); gain(2); }
        else if (e.t === 'shield') { view.bigNum(`+${e.n}`, hx, hy - 6, '#5ab9ea'); sfx('shield'); }
        else if (e.t === 'heal' && e.n > 0) view.bigNum(`+${e.n}`, hx, hy - 6, '#4ecb71');
        else if (e.t === 'drain') view.bigNum(`+${e.n}`, hx, hy + 8, '#ff7582');
        else if (e.t === 'stun') { view.float('¡Aturdido!', mx, my - 30, '#5ab9ea'); view.tintMon('#5ab9ea', 2400); sfx('freeze'); M.st = 'idle'; M.next = 3; marks.length = 0; }
        else if (e.t === 'weak') view.float('¡Debilitado!', mx, my - 30, '#c8a3ff');
        else if (e.t === 'burn') view.tintMon('#ff9a3c', 1600);
        else if (e.t === 'reflect') view.float('¡Reflejo!', hx, hy - 30, '#f5c542');
        else if (e.t === 'prep') view.float('¡Preparado!', hx, hy - 30, '#5ab9ea');
      }
      uiBars();
    });
    if (!dmg) uiBars();
  }

  /* ---------- monstruo y telegrafiado ---------- */
  const TELE: Record<string, number> = { lunge: 0.78, shot: 0.6, slam: 0.8, rain: 0.95, swipe: 0.45 };
  const dmgMod = diffMode === 'casual' ? 0.7 : diffMode === 'expert' ? 1.25 : 1.0;
  const dmgM = (): number => Math.max(1, Math.round(m.attack.damage * (m.boss ? 1.1 : 1) * dmgMod));

  function startAttack(): void {
    const near = Math.abs(H.x + 16 - monCX()) < sz * 0.5 + 26;
    const pats: string[] = A.patternsFor(m);
    M.pat = near && rng() < 0.7 ? 'swipe' : pats[Math.floor(rng() * pats.length)];
    const teleTime = TELE[M.pat] * (diffMode === 'expert' ? 0.85 : 1.0);
    M.st = 'tele'; M.t = teleTime; M.hit = false;
    view.telegraph(M.t * 1000); sfx('charge');
    if (m.boss && M.pat !== 'swipe') { sfx('roar'); sayBubble('mon', pickMonsterTaunt('boss'), 2000); }
    else if (rng() < 0.45) sayBubble('mon', pickMonsterTaunt('telegraph'), 1600);
    if (M.pat === 'rain') {
      marks.length = 0; const hx = H.x + 16;
      [0, -1, 1].forEach((d, i) => marks.push({ x: clamp(hx + d * 42 + (rng() - 0.5) * 10, 14, 306), t: teleTime + i * 0.28 }));
    }
  }

  function updMonster(dt: number): void {
    M.clock += dt; view.mon.flip = H.x + 16 > monCX();
    if (s.stunT > 0) { M.st = 'idle'; if (M.x !== monBase) M.x += Math.sign(monBase - M.x) * Math.min(Math.abs(monBase - M.x), 60 * dt); }
    else if (M.st === 'idle') {
      M.x = monBase + Math.round(Math.sin(M.clock * 0.9) * 8); M.next -= dt;
      if (M.next <= 0) startAttack();
    } else if (M.st === 'tele') {
      M.t -= dt; if (M.t <= 0) {
        view.mon.play('attack'); const f = view.mon.flip ? 1 : -1;
        if (M.pat === 'lunge') { M.st = 'act'; M.tx = clamp(H.x + 16 - sz / 2, 4, 300 - sz); sfx('whoosh'); }
        else if (M.pat === 'shot') { M.st = 'back'; M.t = m.boss ? 0.9 : 0.55; M.shots = m.boss ? [0, 0.35] : [0]; shotT = 0; }
        else if (M.pat === 'slam') { M.st = 'back'; M.t = 0.7; waves.push({ x: monCX() + f * sz * 0.3, vx: f * 150 }); sfx('slam'); view.shake = 380; view.zoomPulse(0.03); if (m.boss) waves.push({ x: monCX() - f * sz * 0.3, vx: -f * 150 }); }
        else if (M.pat === 'swipe') { M.st = 'back'; M.t = 0.5; const reach: Box = f < 0 ? { x0: M.x - 26, x1: M.x + sz * 0.5, y0: GY - 40, y1: GY } : { x0: M.x + sz * 0.5, x1: M.x + sz + 26, y0: GY - 40, y1: GY }; sfx('whoosh'); if (overlap(reach, heroBox())) hurtHero(dmgM(), f); view.burst(f < 0 ? M.x - 8 : M.x + sz + 8, GY - 16, '#ff9a8a', 8); }
        else M.st = 'act';
      }
    } else if (M.st === 'act') {
      if (M.pat === 'lunge') {
        const dir = Math.sign(M.tx - M.x); M.x += dir * 340 * dt;
        if (!M.hit && overlap(monBox(), heroBox())) { M.hit = true; hurtHero(dmgM(), dir); }
        if (Math.abs(M.tx - M.x) < 6 || M.x <= 4 || M.x >= 300 - sz) { M.st = 'back'; M.t = 0.35; }
      } else if (M.pat === 'rain') { if (!marks.length) { M.st = 'back'; M.t = 0.5; } }
    } else {
      M.t -= dt; shotT += dt;
      if (M.pat === 'shot') {
        while (M.shots.length && shotT >= M.shots[0]) {
          M.shots.shift(); const f = view.mon.flip ? 1 : -1;
          const air = m.boss && M.shots.length === 0;
          projs.push({ x: monCX() + f * sz * 0.4, y: air ? GY - 46 : GY - 12, vx: f * 150, r: 6, col: m.boss ? '#c8a3ff' : '#e84a5f' });
          sfx('proj');
        }
      }
      if (M.x !== monBase) M.x += Math.sign(monBase - M.x) * Math.min(Math.abs(monBase - M.x), 140 * dt);
      if (M.t <= 0) { M.st = 'idle'; M.next = (m.boss ? 2.4 : 3.8) * (0.8 + 0.4 * (s.hp / s.maxHp)) * (s.heroHp / s.heroMax < 0.35 ? 1.5 : 1); view.mon.play('idle'); }
    }

    view.mon.x = Math.round(M.x); view.mon.dirty = true;

    for (let i = marks.length - 1; i >= 0; i--) {
      const mk = marks[i]; mk.t -= dt;
      if (mk.t <= 0) { marks.splice(i, 1); sfx('meteor'); view.burst(mk.x, GY - 4, '#f5c542', 16); view.shake = 200; if (Math.abs(H.x + 16 - mk.x) < 15 && H.yo < 22) hurtHero(dmgM()); }
    }
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i]; p.x += p.vx * dt;
      if (overlap({ x0: p.x - p.r, x1: p.x + p.r, y0: p.y - p.r, y1: p.y + p.r }, heroBox())) {
        projs.splice(i, 1); hurtHero(dmgM(), Math.sign(p.vx)); view.burst(p.x, p.y, p.col, 10);
      } else if (p.x < -10 || p.x > 330) projs.splice(i, 1);
    }
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i]; w.x += w.vx * dt;
      if (Math.abs(w.x - (H.x + 16)) < 11 && H.yo < 13) hurtHero(dmgM(), Math.sign(w.vx));
      if (w.x < -12 || w.x > 332) waves.splice(i, 1);
    }
  }

  /* ---------- bucle principal (rawDt en milisegundos) ---------- */
  function frame(rawDt: number): void {
    if (tourActive) { queued.jump = queued.dash = queued.atk = false; return; }
    if (phase !== 'fight' || paused) { queued.jump = queued.dash = queued.atk = false; return; }
    if (chal) { queued.jump = queued.dash = queued.atk = false; H.inv = Math.max(H.inv, 0.3); }

    const scale = chal ? 0.04 : prob ? tScale : 1;
    const dt = Math.min(0.05, rawDt / 1000) * scale;
    const ms = dt * 1000;

    // Temporizador de bocadillos
    if (heroBubT > 0) { heroBubT -= rawDt; if (heroBubT <= 0) heroBubble.hidden = true; }
    if (monBubT > 0) { monBubT -= rawDt; if (monBubT <= 0) monBubble.hidden = true; }

    // Acciones en cola
    if (queued.jump) doJump();
    if (queued.dash) doDash();
    if (queued.atk) doAttack();
    queued.jump = queued.dash = queued.atk = false;

    // Héroe
    H.dashCd = Math.max(0, H.dashCd - dt); H.atkCd = Math.max(0, H.atkCd - dt); H.chainT = Math.max(0, H.chainT - dt);
    H.inv = Math.max(0, H.inv - dt); H.hitStun = Math.max(0, H.hitStun - dt); H.swingT = Math.max(0, H.swingT - dt);
    if (H.swing >= 0) { H.swing -= dt; if (H.swing < 0) { H.swing = -1; resolveSwing(); } }

    if (view.tweens.length) H.x = view.hero.x;
    else {
      const dx = dirX(); if (H.hitStun <= 0 && dx) H.face = dx;
      if (H.dashT > 0) { H.dashT -= dt; H.x += H.face * 270 * dt; }
      else if (H.hitStun <= 0) H.x += dx * (H.atkCd > 0.15 ? 36 : 110) * dt;
      H.x = clamp(H.x, 2, 286);
    }

    if (H.yo > 0 || H.vy > 0) {
      H.vy -= 560 * dt; H.yo += H.vy * dt;
      if (H.yo <= 0) {
        if (H.air) { sfx('land'); view.burst(H.x + 16, GY - 2, '#d4c5a9', 4); }
        H.yo = 0; H.vy = 0; H.air = false;
      }
    }
    if (H.chainT <= 0) H.step = 0;

    view.hero.x = Math.round(H.x); view.hero.y = GY - 29 - Math.round(H.yo); view.hero.flip = H.face < 0; view.hero.dirty = true;

    // Decaimiento del combo
    if (s.combo > 0) {
      s.comboT -= ms;
      comboBar.style.width = Math.max(0, (s.comboT / A.COMBO_WINDOW) * 100) + '%';
      if (s.comboT <= 0) loseCombat();
    }

    // Estados alterados del monstruo
    s.reflectT = Math.max(0, s.reflectT - ms); s.weakT = Math.max(0, s.weakT - ms); s.stunT = Math.max(0, s.stunT - ms);
    if (s.burnT > 0) { s.burnT -= ms; M.burnAcc += ms; if (M.burnAcc >= 1500) { M.burnAcc = 0; hitMonster(s.burnN, 'burn'); sfx('fire'); } }

    if (phase !== 'fight') return;

    // Temporizador de problema (ms reales)
    if (prob) {
      if (!noTimeout && prob.total > 0) {
        prob.t -= rawDt;
        const p = Math.max(0, prob.t / prob.total);
        timerBar.style.width = (p * 100) + '%'; timer.classList.toggle('low', p < 0.25);
        if (prob.t <= 0) problemTimeout();
      }
    } else if (!chal) {
      nextProb -= dt;
      if (nextProb <= 0 && s.hp > 0) spawnProblem();
    }

    updMonster(dt);
    uiBars();

    // Posicionar bocadillos pixelados sobre héroe y monstruo
    if (!heroBubble.hidden) {
      heroBubble.style.left = `${clamp(((H.x + 16) / 320) * 100, 14, 72)}%`;
      heroBubble.style.top = `${clamp(((GY - 38 - H.yo) / 180) * 100, 8, 68)}%`;
    }
    if (!monBubble.hidden) {
      monBubble.style.left = `${clamp((monCX() / 320) * 100, 32, 86)}%`;
      monBubble.style.top = `${clamp(((GY - sz - 8) / 180) * 100, 8, 60)}%`;
    }

    for (const ob of orbs) {
      ob.ph += dt * 2.2;
      const by = ob.y + Math.sin(ob.ph) * 3;
      ob.el.style.left = `${(ob.x / 320) * 100}%`;
      ob.el.style.top = `${((by - 12) / 180) * 100}%`;
    }
  }

  /* ---------- ganchos gráficos pixel art ---------- */
  function drawBack(ctx: CanvasRenderingContext2D): void {
    // Zona de peligro roja telegrafiada en el suelo antes del ataque enemigo
    if (M.st === 'tele') {
      ctx.fillStyle = Math.floor(M.t * 16) % 2 === 0 ? 'rgba(232, 74, 95, 0.55)' : 'rgba(245, 197, 66, 0.35)';
      ctx.fillRect(0, GY - 4, 320, 4);
    }
    for (const mk of marks) {
      const p = clamp(1 - mk.t / 0.9, 0, 1);
      ctx.globalAlpha = 0.25 + 0.4 * Math.abs(Math.sin(p * 18)); ctx.fillStyle = '#e84a5f';
      ctx.beginPath(); ctx.ellipse(mk.x, GY + 2, 15, 4, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
      if (mk.t < 0.3) {
        const k = 1 - mk.t / 0.3;
        ctx.fillStyle = '#f5c542'; ctx.fillRect(Math.round(mk.x - 3), Math.round(-10 + (GY - 4) * k), 6, 12);
        ctx.fillStyle = '#fff3c4'; ctx.fillRect(Math.round(mk.x - 1), Math.round(-6 + (GY - 4) * k), 2, 6);
      }
    }
  }

  function drawFront(ctx: CanvasRenderingContext2D): void {
    if (H.swingT > 0) {
      const sx = Math.round(H.face > 0 ? H.x + 26 : H.x - 10);
      const sy = Math.round(GY - 24 - H.yo);
      ctx.fillStyle = '#fff099'; ctx.fillRect(sx, sy, 14, 3);
      ctx.fillStyle = '#f5c542'; ctx.fillRect(sx + (H.face > 0 ? 4 : -2), sy + 3, 12, 4);
    }
    for (const w of waves) { ctx.fillStyle = '#f5c542'; ctx.fillRect(Math.round(w.x) - 5, GY - 10, 10, 10); ctx.fillStyle = '#fff3c4'; ctx.fillRect(Math.round(w.x) - 2, GY - 7, 4, 7); }
    for (const p of projs) { ctx.fillStyle = '#0f0c18'; ctx.fillRect(Math.round(p.x) - 5, Math.round(p.y) - 5, 10, 10); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x) - 4, Math.round(p.y) - 4, 8, 8); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 3, 3); }
    for (const ob of orbs) {
      if (ob.gone) continue;
      const oy = Math.round(Math.sin(ob.ph) * 3);
      const x = Math.round(ob.x), y = Math.round(ob.y + oy);
      ctx.globalAlpha = ob.dim ? 0.25 : 1;
      ctx.fillStyle = '#0f0c18'; ctx.fillRect(x - 9, y - 9, 18, 18);
      ctx.fillStyle = ob.col; ctx.fillRect(x - 7, y - 7, 14, 14);
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 5, 4, 4);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- fin unificado ---------- */
  function finish(won: boolean): void {
    if (phase === 'end') return;
    phase = 'end';
    root.querySelector('.a-chal')?.remove();
    offChalT?.(); offChalT = null; chal = null; prob = null;
    touch.classList.remove('hud-dimmed');
    labels.replaceChildren(); answerBar.replaceChildren();
    orbs.length = 0; projs.length = 0; waves.length = 0; marks.length = 0;
    view.setAura(0);

    let dur = 1700;
    if (won) {
      sayBubble('hero', pickBanter(hero.id, 'win'), 2600);
      dur = victorySequence(view, { combo: s.best, boss: !!m.boss || !!room.miniBoss, sfx: n => sfx(n as any) }) + 500;
    } else {
      view.hero.play('die'); sfx('lose'); view.banner('DERROTA', '#e84a5f', 50); playMusic('story', 0);
    }
    uiBars();
    const res = { won, heroHp: Math.max(0, s.heroHp), hints: hintsUsed, best: s.best, lastTemplate };
    setTimeout(() => {
      if (disposed) return;
      cleanup();
      o.onEnd(res);
    }, dur);
  }

  /* ---------- inicio ---------- */
  uiBars(); updHint();
  if (o.guidedTour) {
    view.banner('BATALLA DE PRÁCTICA', '#5ab9ea', 70);
    spawnProblem();
  } else say(o.intro.length ? o.intro : [{ speaker: m.name, text: m.line }], () => {
    let n = 3;
    const tick = (): void => {
      if (disposed || phase === 'end') return;
      if (n > 0) {
        view.banner(String(n), '#f5c542', 70); sfx('tick'); n--;
        setTimeout(tick, 480);
      } else {
        view.banner('¡PELEA!', '#e84a5f', 70); sfx('crit');
        phase = 'fight';
        sayBubble('hero', pickBanter(hero.id, 'start'), 2400);
        spawnProblem();
        uiBars();
      }
    };
    tick();
  });
}
