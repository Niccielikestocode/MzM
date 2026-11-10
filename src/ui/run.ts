import type { CardDef, Level, Question, Room, SaveData } from '../core/types';
import { cardById, dialogues, heroById, levels, monsterById, roomIcon, topicById, WORLD_COLOR } from '../core/data';
import { mulberry32, newSeed } from '../core/rng';
import { h, $, ticker, heroSprite, monsterSprite, glyph, pct } from './dom';
import { BattleView } from '../gfx/battle';
import { drawGraph, drawNumberLine } from '../gfx/plot';
import { gfxFlags } from '../gfx/scene';
import { BASIC, CombatState, Ev, currentTopic, difficultyFor, drawHand, endTurn, isDead, isWon, monsterAttack, monsterWillAttack, resolve, startCombat } from '../game/combat';
import { pickQuestion } from '../game/picker';
import { masteryOf, updateMastery } from '../game/mastery';
import { isCleared, zoneClearable } from '../game/campaign';
import { checkAchievements, dropCards, masteryCards, treasureCard } from '../game/rewards';
import { achievements } from '../core/data';
import { artCanvas, fullCard, handCard, TYPENAME } from './cards';
import { sfx, sfxForCard, playMusic, playAmbient, setIntensity } from './audio';

export type Mode = 'campaign' | 'learning' | 'free' | 'errors';
export interface RunCtx { story?(level: Level, then: () => void): boolean; save: SaveData; persist(): void; mount(el: HTMLElement, cleanup?: () => void): void; exit(): void; replay(level: Level, mode: Mode): void }
export function startRun(ctx: RunCtx, level: Level, mode: Mode): void {
  const save = ctx.save, rng = mulberry32(newSeed()), hero = heroById[save.profile.heroId];
  const run = { idx: 0, hp: hero.hp, asked: 0, correct: 0, topics: new Set<string>(), before: {} as Record<string, number>, newCards: [] as CardDef[], newAch: [] as string[], lastTemplate: '' };
  const topicsOf = (): string[] => { const s = new Set<string>(); level.rooms.forEach(r => { if (r.type === 'combat' || r.type === 'boss') { (r.phases ?? (r.topic ? [r.topic] : [])).forEach(t => s.add(t)); if (!r.phases && !r.topic) s.add(level.topic); if (r.monster && monsterById[r.monster].phases) monsterById[r.monster].phases!.forEach(t => s.add(t)); } }); return [...s].filter(t => topicById[t]); };
  topicsOf().forEach(t => { run.before[t] = masteryOf(save, t); });

  /* ---------- estructura de la pantalla ---------- */
  const view = new BattleView(h('canvas', { class: 'c-canvas', 'aria-label': 'Escena del combate' }));
  const heroName = h('span', { class: 'c-name' }, save.profile.name), heroHpBar = h('i'), heroHpTxt = h('span'), blockTxt = h('span', { class: 'c-block' });
  const monName = h('span', { class: 'c-name' }), monHpBar = h('i'), monHpTxt = h('span'), phaseTxt = h('span', { class: 'c-phase' });
  const dots = h('div', { class: 'c-dots', 'aria-label': 'Salas' });
  const tele = h('div', { class: 'c-tele' });
  const overlay = h('div', { class: 'c-overlay', hidden: true });
  const hand = h('div', { class: 'c-hand' });
  const qTag = h('div', { class: 'q-tag' }), qText = h('p', { class: 'q-text' }), qMedia = h('div', { class: 'q-media' }), qUnits = h('div', { class: 'q-units' });
  const qOpts = h('div', { class: 'q-opts' }), qFb = h('div', { class: 'q-fb', 'aria-live': 'polite' }), qActions = h('div', { class: 'q-actions' });
  const hintBtn = h('button', { class: 'pbtn small', onclick: () => useHint() }, 'Pista (H)');
  const exitBtn = h('button', { class: 'pbtn small ghost', onclick: () => confirmExit() }, 'Salir');
  const qPanel = h('div', { class: 'q-panel' }, qTag, qText, qMedia, qUnits, qOpts, qFb, qActions);
  const root = h('div', { class: 'combat' },
    h('div', { class: 'c-left' },
      h('div', { class: 'c-hud' },
        h('div', { class: 'c-side' }, heroName, h('div', { class: 'bar hp' }, heroHpBar), h('div', { class: 'c-nums' }, heroHpTxt, blockTxt)),
        dots, h('div', { class: 'c-side r' }, monName, h('div', { class: 'bar mhp' }, monHpBar), h('div', { class: 'c-nums' }, monHpTxt, phaseTxt))),
      h('div', { class: 'c-stage' }, view.cv, tele, overlay),
      hand),
    h('div', { class: 'c-right' }, qPanel, h('div', { class: 'c-tools' }, hintBtn, exitBtn)));

  let state!: CombatState, phase: 'idle' | 'choose' | 'answer' | 'busy' | 'feedback' | 'end' = 'idle', q: Question | null = null, pickId = BASIC, proceed: (() => void) | null = null;
  const keyHandler = (e: KeyboardEvent) => onKey(e);
  document.addEventListener('keydown', keyHandler);
  ctx.mount(root, () => document.removeEventListener('keydown', keyHandler));
  ticker.add(dt => view.step(dt));
  playMusic(level.world, 1); playAmbient(level.world);
  gfxFlags.reduce = save.settings.reduceMotion;

  view.cv.addEventListener('pointermove', e => view.pointer('move', e.clientX, e.clientY));
  view.cv.addEventListener('pointerdown', e => { if (phase === 'answer' && q?.clickTarget) view.pointer('down', e.clientX, e.clientY); });

  /* ---------- utilidades de interfaz ---------- */
  const setPhase = (p: typeof phase) => { phase = p; root.dataset.phase = p; };
  function renderDots(): void {
    dots.replaceChildren(...level.rooms.map((r, i) => { const d = h('span', { class: `dot${i === run.idx ? ' now' : ''}${i < run.idx ? ' done' : ''}`, title: r.type }, glyph(roomIcon[r.type === 'boss' ? 'boss' : r.type] ?? 'star', 2, i === run.idx ? '#f2c14e' : '#a99fc0')); return d; }));
  }
  function renderBars(): void {
    if (!state) return;
    heroHpBar.style.width = Math.max(0, (state.heroHp / state.heroMaxHp) * 100) + '%'; heroHpTxt.textContent = `♥ ${state.heroHp}/${state.heroMaxHp}`;
    blockTxt.textContent = state.block ? `🛡 ${state.block}` : ''; blockTxt.hidden = !state.block;
    monHpBar.style.width = Math.max(0, (state.monsterHp / state.monsterMaxHp) * 100) + '%'; monHpTxt.textContent = `${Math.max(0, state.monsterHp)}/${state.monsterMaxHp}`;
  }
  const say = (lines: { speaker: string; text: string }[], then: () => void): void => {
    let i = 0;
    const show = () => {
      if (i >= lines.length) { overlay.hidden = true; then(); return; }
      const l = lines[i++];
      overlay.hidden = false; overlay.replaceChildren(h('div', { class: 'dlg' }, h('b', {}, l.speaker === 'heroe' ? save.profile.name : l.speaker), h('p', {}, l.text), h('button', { class: 'pbtn', onclick: () => { sfx('click'); show(); } }, i < lines.length ? 'Siguiente' : '¡A combatir!')));
      ($('button', overlay) as HTMLElement).focus();
    };
    show();
  };
  const panel = (title: string, body: (Node | string)[], buttons: [string, () => void, boolean?][]): void => {
    overlay.hidden = false;
    overlay.replaceChildren(h('div', { class: 'dlg wide' }, h('h3', {}, title), ...body, h('div', { class: 'dlg-btns' }, buttons.map(([t, fn, ghost]) => h('button', { class: 'pbtn' + (ghost ? ' ghost' : ''), onclick: () => { sfx('click'); fn(); } }, t)))));
    ($('button', overlay) as HTMLElement).focus();
  };
  function confirmExit(): void {
    panel('¿Salir de esta aventura?', ['Tu progreso de dominio se conserva, pero esta sala se pierde.'], [['Seguir jugando', () => { overlay.hidden = true; }], ['Salir', () => { ctx.exit(); }, true]]);
  }

  /* ---------- flujo de salas ---------- */
  function nextRoom(): void {
    renderDots();
    if (run.idx >= level.rooms.length) { finishLevel(); return; }
    const room = level.rooms[run.idx];
    if (room.type === 'combat' || room.type === 'boss') enterCombat(room);
    else if (room.type === 'treasure') enterTreasure();
    else enterRest(room);
  }
  function backdrop(room?: Room): void {
    const m = monsterById[room?.monster ?? 'slime_fraccionario'];
    view.setup(level.world, heroSprite(hero), monsterSprite(m)); view.monVisible = false;
  }
  function enterRest(room: Room): void {
    setIntensity(0);
    backdrop(room); setPhase('end'); qOpts.replaceChildren(); qText.textContent = ''; qTag.textContent = 'Descanso'; qMedia.replaceChildren(); qFb.textContent = ''; qActions.replaceChildren(); hand.replaceChildren(); tele.textContent = '';
    const heal = Math.min(hero.hp - run.hp, Math.ceil(hero.hp * 0.4)); run.hp += heal; sfx('heal');
    view.float(`+${heal}`, 52, 100, '#6fcf8f');
    panel('Descanso junto al fuego', [`Recuperas ${heal} de vida. Vida actual: ${run.hp}/${hero.hp}.`], [['Seguir', () => { run.idx++; nextRoom(); }]]);
  }
  function enterTreasure(): void {
    setIntensity(0);
    backdrop(); setPhase('end'); hand.replaceChildren(); tele.textContent = ''; qTag.textContent = 'Tesoro'; qText.textContent = ''; qOpts.replaceChildren(); qMedia.replaceChildren(); qFb.textContent = ''; qActions.replaceChildren();
    const c = treasureCard(save, rng); ctx.persist(); sfx('card');
    if (c) { run.newCards.push(c); panel('¡Un cofre!', [h('div', { class: 'reward-card' }, fullCard(c)), `Consigues «${c.name}».`], [['Seguir', () => { run.idx++; nextRoom(); }]]); }
    else { const heal = Math.min(hero.hp - run.hp, 8); run.hp += heal; panel('¡Un cofre!', [`Ya tienes todas las cartas posibles. Bebes una poción: +${heal} de vida.`], [['Seguir', () => { run.idx++; nextRoom(); }]]); }
  }
  function enterCombat(room: Room): void {
    const m = monsterById[room.monster!];
    setIntensity(monsterById[room.monster!].boss ? 2 : 1);
    state = startCombat({ hero, save, monster: m, room, heroHp: run.hp, rng });
    view.setup(level.world, heroSprite(hero), monsterSprite(m));
    qTag.textContent = m.name; qText.textContent = ''; qOpts.replaceChildren(); qMedia.replaceChildren(); qFb.textContent = ''; qActions.replaceChildren(); qUnits.textContent = '';
    monName.textContent = m.name + (room.miniBoss ? ' (mini jefe)' : ''); phaseTxt.textContent = '';
    renderBars(); renderDots(); setPhase('busy'); hand.replaceChildren();
    const intro: { speaker: string; text: string }[] = [];
    if (run.idx === 0 && level.intro && dialogues[level.intro]) intro.push(...dialogues[level.intro]);
    else intro.push({ speaker: m.name, text: m.line });
    say(intro, startTurn);
  }
  function startTurn(): void {
    drawHand(state, rng); state.hand = state.hand.filter(id => id !== BASIC); renderBars();
    const m = state.monster, topic = currentTopic(state, level.topic);
    phaseTxt.textContent = (state.room.phases ?? m.phases) ? `Fase: ${topicById[topic]?.name ?? ''}` : '';
    tele.textContent = `⚠ ${m.attack.name}: ${m.attack.telegraph}. Si fallas hace ${m.attack.damage} de daño.`;
    qTag.textContent = topicById[topic]?.name ?? m.name; qText.textContent = 'Elige una carta. Cada carta te hace una pregunta; si aciertas, se activa.'; qText.className = 'q-text hint'; qOpts.replaceChildren(); qMedia.replaceChildren(); qFb.textContent = ''; qFb.className = 'q-fb'; qActions.replaceChildren(); qUnits.textContent = '';
    hand.replaceChildren(...state.hand.map((id, i) => { const b = handCard(cardById[id], String(i + 1), () => choose(id)); b.dataset.id = id; return b; }), h('div', { class: 'hand-sep' }), (() => { const b = handCard(cardById[BASIC], 'B', () => choose('basic'), 'Siempre disponible'); b.dataset.id = 'basic'; return b; })());
    [...hand.querySelectorAll('.handcard')].forEach((b, i) => { (b as HTMLElement).style.animationDelay = i * 70 + 'ms'; b.classList.add('deal'); });
    hand.querySelector('.hc-name:last-of-type'); // el último muestra «Golpe básico»
    updateHint(); setPhase('choose');
  }
  function hintsLeft(): number { return (state.freeHint ? 1 : 0) + state.extraHints; }
  function updateHint(): void { const n = hintsLeft(); hintBtn.textContent = `Pista (H)${n ? ' · ' + n : ''}`; hintBtn.disabled = !(phase === 'answer' && n > 0 && !!q && !q.clickTarget); }
  function useHint(): void {
    if (phase !== 'answer' || !q || hintsLeft() < 1 || q.clickTarget) return;
    const wrong = [...qOpts.children].filter((b, i) => i !== q!.correct && !(b as HTMLElement).classList.contains('gone'));
    if (wrong.length <= 1) return;
    if (state.freeHint) state.freeHint = false; else state.extraHints--;
    state.hintsUsed++; (wrong[Math.floor(rng() * wrong.length)] as HTMLElement).classList.add('gone'); (qOpts.querySelector('.gone') as HTMLButtonElement).disabled = true; sfx('click'); updateHint();
  }

  /* ---------- pregunta ---------- */
  function choose(id: string): void {
    if (phase !== 'choose') return;
    sfx('card'); pickId = id;
    hand.querySelectorAll('.handcard').forEach(b => b.classList.add((b as HTMLElement).dataset.id === id ? 'played' : 'dropped'));
    const card = cardById[id === 'basic' ? BASIC : id];
    const topic = currentTopic(state, level.topic);
    q = pickQuestion({ topics: [topic], difficulty: difficultyFor(state, card), rng, save, lastTemplate: run.lastTemplate });
    run.lastTemplate = q.template; run.topics.add(topic);
    if (card.params.hints) state.extraHints += card.params.hints;
    renderQuestion(card);
    setPhase('answer'); updateHint();
  }
  function renderQuestion(card: CardDef): void {
    const qq = q!; (window as any).__jmQ = qq;
    hand.querySelectorAll('button').forEach(b => ((b as HTMLButtonElement).disabled = true));
    qTag.replaceChildren(`${topicById[qq.topic]?.name ?? ''} · `, h('span', { class: 'diff', 'aria-label': `Dificultad ${qq.difficulty}` }, '●'.repeat(qq.difficulty) + '○'.repeat(4 - qq.difficulty)), ` · con ${card.id === BASIC ? 'Golpe básico' : card.name}`);
    qText.textContent = qq.text; qText.className = 'q-text'; qFb.textContent = ''; qFb.className = 'q-fb'; qActions.replaceChildren(); qMedia.replaceChildren(); qUnits.textContent = '';
    if (qq.graph) { const cv = h('canvas', { class: 'q-cv', 'aria-label': 'Gráfica' }); drawGraph(cv, qq.graph); qMedia.append(cv); }
    if (qq.numberLine) { const cv = h('canvas', { class: 'q-cv nl', 'aria-label': 'Recta numérica' }); drawNumberLine(cv, qq.numberLine); qMedia.append(cv); }
    if (qq.units && save.relics.includes('brujula_de_escala')) qUnits.textContent = `Equivalencia: ${qq.units}`;
    else if (qq.units && card.params.showNumberLine) qUnits.textContent = '';
    if (qq.clickTarget) { qOpts.replaceChildren(h('p', { class: 'q-hint' }, 'Toca el plano de la escena para lanzar el hechizo.')); }
    else {
      qOpts.replaceChildren(...qq.options.map((o, i) => h('button', { class: 'opt', onclick: () => answer(i) }, h('b', {}, String(i + 1)), h('span', {}, o))));
      let remove = card.params.removeOptions ?? 0;
      if (card.params.showGraph && !qq.graph && !qq.stage) remove = Math.max(remove, 1);
      const wrongs = [...qOpts.children].map((b, i) => [b, i] as const).filter(([, i]) => i !== qq.correct);
      for (let k = 0; k < remove && wrongs.length > 1; k++) { const [b] = wrongs.splice(Math.floor(rng() * wrongs.length), 1)[0]; b.classList.add('gone'); (b as HTMLButtonElement).disabled = true; }
    }
    if (qq.stage) view.beginStage(qq.stage.id, qq.stage.meta, qq, ok => { stageOk = ok; stageDone?.(ok); });
  }
  let stageOk = false; let stageDone: ((ok: boolean) => void) | null = null;
  const lockOpts = () => qOpts.querySelectorAll('button').forEach(b => ((b as HTMLButtonElement).disabled = true));
  function answer(i: number): void {
    if (phase !== 'answer' || !q) return;
    setPhase('busy'); lockOpts(); updateHint();
    const qq = q;
    if (qq.stage) { stageDone = ok => { stageDone = null; setTimeout(() => finishQuestion(ok, i), 350); }; view.stagePick(i); }
    else finishQuestion(i === qq.correct, i);
  }
  // reto de tocar el plano: termina cuando el reto avisa
  const watchClick = () => { if (q?.clickTarget && phase === 'answer' && view.stage && view.stage.S.phase === 'run') { setPhase('busy'); stageDone = ok => { stageDone = null; setTimeout(() => finishQuestion(ok, -1), 350); }; } };
  view.cv.addEventListener('pointerup', () => setTimeout(watchClick, 0));

  function finishQuestion(correct: boolean, picked: number): void {
    const qq = q!, card = cardById[pickId === 'basic' ? BASIC : pickId];
    const usedStage = !!qq.stage;
    run.asked++; if (correct) run.correct++;
    save.stats.questionsAnswered++; if (correct) save.stats.correct++;
    updateMastery(save, qq.topic, correct, qq.difficulty);
    const prevErr = save.errorBook.find(e => !e.resolved && e.template === qq.template);
    if (correct && prevErr) { prevErr.resolved = true; save.stats.reviewed++; }
    if (!correct) save.errorBook.push({ template: qq.template, topic: qq.topic, text: qq.text, given: picked >= 0 ? qq.options[picked] : 'Punto equivocado', answer: qq.clickTarget ? `(${qq.clickTarget.x}, ${qq.clickTarget.y})` : qq.options[qq.correct], explain: qq.explain, date: new Date().toISOString(), resolved: false });
    if (save.errorBook.length > 60) save.errorBook = save.errorBook.filter(e => !e.resolved).slice(-60).concat(save.errorBook.filter(e => e.resolved).slice(-10));
    const ev = resolve(state, pickId, qq, correct);
    save.stats.bestStreak = Math.max(save.stats.bestStreak, state.streak);
    [...qOpts.children].forEach((b, i) => { b.classList.toggle('good', i === qq.correct); if (i === picked && !correct) b.classList.add('bad'); });
    qFb.className = 'q-fb ' + (correct ? 'ok' : 'no');
    qFb.replaceChildren(h('b', {}, correct ? '✓ ¡Correcto! ' : '✗ No era esa. '), qq.explain);
    if (!correct) { qPanel.classList.remove('shake'); void qPanel.offsetWidth; qPanel.classList.add('shake'); }
    sfx(correct ? 'ok' : 'bad');
    playEffects(card, ev, correct, usedStage);
    renderBars(); ctx.persist();
    const next = () => { if (usedStage) view.endStage(); afterResolution(correct); };
    setPhase('feedback');
    const btn = h('button', { class: 'pbtn', onclick: () => { clearTimeout(auto); sfx('click'); proceed = null; next(); } }, 'Continuar (Enter)');
    qActions.replaceChildren(btn); proceed = () => btn.click(); btn.focus();
    const auto = correct ? window.setTimeout(() => { if (phase === 'feedback') btn.click(); }, 2600) : 0;
  }
  /** Orquesta animaciones, sonido y números según los eventos de combate. */
  function playEffects(card: CardDef, ev: Ev[], correct: boolean, usedStage: boolean): void {
    const [mx, my] = view.monCenter(), [hx, hy] = view.heroCenter(), fx = view.fxKind(card);
    view.setAura(correct ? state.streak : 0);
    if (!correct) {
      view.banner('¡FALLO!', '#ff6f7a', 46); view.heroHurt(); view.hero.play('hurt');
      ev.forEach(e => { if (e.t === 'self') { view.hurtFx(); view.bigNum(`-${e.n}`, hx, hy - 6, '#ff6f7a'); sfx('hurt'); } });
      return;
    }
    const dmg = ev.find(e => e.t === 'damage') as { n: number } | undefined, crit = !!dmg && (dmg.n >= 8 || card.rarity !== 'comun');
    const onHit = () => {
      ev.forEach(e => {
        if (e.t === 'damage') { view.monHurt(); view.hitFx(e.n, crit); view.bigNum(`-${e.n}`, mx, my - 4, crit ? '#ffd24d' : '#ffffff', crit); sfx(crit ? 'crit' : 'hit'); }
        if (e.t === 'block') { view.bigNum(`+${e.n}`, hx, hy - 6, '#8fb4ff'); sfx('block'); view.hero.play('win'); }
        if (e.t === 'heal' && e.n > 0) { view.bigNum(`+${e.n}`, hx, hy - 6, '#6fcf8f'); }
        if (e.t === 'drain') { view.bigNum(`+${e.n}`, hx, hy + 8, '#ff8fa0'); }
        if (e.t === 'weak') view.float('¡Debilitado!', mx, my - 30, '#c8a3ff');
        if (e.t === 'stun') { view.float('¡Aturdido!', mx, my - 30, '#9fe8ff'); view.tintMon('#9fe8ff', 1600); sfx('freeze'); }
        if (e.t === 'draw') view.float('+1 carta', hx, hy - 30, '#e0b84c');
      });
      if (ev.some(e => e.t === 'burn')) void 0;
    };
    sfxForCard(fx.kind);
    if (usedStage && dmg) setTimeout(onHit, 120); else view.cast(card, onHit);
    const st = state.streak;
    if (st === 3 || st === 5 || st === 8 || st === 10 || st === 15) setTimeout(() => { view.banner(`¡RACHA x${st}!`, st >= 8 ? '#ff9a3c' : '#ffd24d', 40); sfx('swell'); }, 520);
  }
  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  async function monsterTurn(): Promise<void> {
    setPhase('busy'); const m = state.monster, [hx, hy] = view.heroCenter();
    tele.textContent = `⚠ ${m.attack.name}…`; view.telegraph(m.boss ? 900 : 650); sfx('charge'); if (m.boss) sfx('roar');
    await wait(m.boss ? 950 : 700);
    const ev = monsterAttack(state);
    if (ev.some(e => e.t === 'stunned')) { view.float('¡Aturdido!', ...view.monCenter() as [number, number], '#9fe8ff'); sfx('freeze'); await wait(700); return; }
    view.hero.play('idle'); const t = view.lunge(); view.mon.play('attack'); sfx('whoosh'); await wait(t + 20);
    for (const e of ev) {
      if (e.t === 'free') { view.float('¡Sin daño!', hx, hy - 10, '#a8f0c0'); sfx('shield'); }
      if (e.t === 'monster') { if (e.n > 0) { view.heroHurt(); view.hurtFx(); sfx('hurt'); view.bigNum(`-${e.n}`, hx, hy - 6, '#ff6f7a', e.n >= 5); } else { view.bigNum('BLOQUEO', hx, hy - 6, '#8fb4ff'); sfx('block'); view.float('', 0, 0, '#fff'); } if (e.blocked > 0 && e.n > 0) view.float(`-${e.blocked} escudo`, hx, hy + 12, '#8fb4ff'); }
      if (e.t === 'reflect') { const [mx, my] = view.monCenter(); view.monHurt(); view.hitFx(e.n, false); view.bigNum(`-${e.n}`, mx, my - 4, '#ffd24d'); sfx('hit'); }
    }
    renderBars(); await wait(650);
  }
  async function afterResolution(correct: boolean): Promise<void> {
    qMedia.replaceChildren(); qOpts.replaceChildren(); qActions.replaceChildren();
    if (isWon(state)) { victory(); return; }
    if (monsterWillAttack(state, pickId, correct)) {
      await monsterTurn();
      if (isWon(state)) { victory(); return; }
      if (isDead(state)) { defeat(); return; }
    }
    const burn = endTurn(state);
    for (const e of burn) if (e.t === 'burn') { const [mx, my] = view.monCenter(); view.monHurt(); view.tintMon('#ff9a3c', 700); view.bigNum(`-${e.n}`, mx, my - 4, '#ff9a3c'); sfx('fire'); renderBars(); await wait(600); }
    if (isWon(state)) { victory(); return; }
    startTurn();
  }
  function victory(): void {
    setPhase('end'); view.setAura(0); view.deathFx(); view.monDie(); sfx('explode'); tele.textContent = '';
    setTimeout(() => { view.heroWin(); sfx('win'); }, 500);
    const m = state.monster; save.stats.combatsWon++;
    if (m.boss) { if (!save.progress.bossesDefeated.includes(m.id)) save.progress.bossesDefeated.push(m.id); if (state.hintsUsed === 0 && level.boss) save.stats.bossNoHint = true; }
    const drops = dropCards(save, m.id); run.newCards.push(...drops);
    const heal = Math.min(hero.hp - state.heroHp, Math.ceil(hero.hp * 0.25)); run.hp = state.heroHp + heal; state.heroHp = run.hp;
    ctx.persist();
    setTimeout(() => panel(`¡Venciste a ${m.name}!`, [heal ? `Recuperas ${heal} de vida (${run.hp}/${hero.hp}).` : '', ...drops.map(c => h('div', { class: 'reward-card' }, fullCard(c)))], [[run.idx + 1 >= level.rooms.length ? 'Terminar' : 'Siguiente sala', () => { run.idx++; nextRoom(); }]]), 1400);
  }
  function defeat(): void {
    setPhase('end'); view.setAura(0); sfx('lose'); view.heroHurt(); tele.textContent = ''; playMusic('story', 0);
    setTimeout(() => panel('Has caído', ['Nada se pierde: tu dominio sigue creciendo con cada pregunta. Puedes intentar la sala de nuevo con otras preguntas.'], [
      ['Reintentar sala', () => { run.hp = Math.ceil(hero.hp * 0.6); playMusic(level.world, 1); nextRoom(); }], ['Salir', () => ctx.exit(), true]]), 900);
  }

  /* ---------- fin del nivel ---------- */
  function finishLevel(): void {
    setPhase('end'); document.removeEventListener('keydown', keyHandler);
    let cleared = false;
    if (mode === 'campaign') {
      cleared = zoneClearable(save, level);
      if (cleared && !isCleared(save, level.id)) { save.progress.levelsCleared.push(level.id); const pg = 'diario_' + level.id; if (!save.diaryPages.includes(pg)) save.diaryPages.push(pg); }
    } else if (mode === 'free') save.stats.freePlayLevels++;
    [...run.topics, ...topicsOf()].forEach(t => run.newCards.push(...masteryCards(save, t)));
    run.newAch = checkAchievements(save); ctx.persist();
    const acc = run.asked ? run.correct / run.asked : 0;
    const rows = [...new Set([...run.topics])].filter(t => topicById[t]).map(t => h('div', { class: 'sum-row' }, h('span', {}, topicById[t].name), h('div', { class: 'bar mini' }, h('i', { style: { width: pct(masteryOf(save, t)) } })), h('b', {}, `${pct(run.before[t] ?? 0.25)} → ${pct(masteryOf(save, t))}`)));
    const title = mode === 'campaign' ? (cleared ? '¡Zona superada!' : 'Aún no dominas el tema') : '¡Aventura terminada!';
    const msg = mode === 'campaign' && !cleared ? 'Terminaste las salas, pero el dominio del tema no llegó al 70 %. Repite la zona o entrena en el modo Aprendizaje.' : `${run.correct} de ${run.asked} correctas (${pct(acc)}).`;
    const showSummary = (): void => {
    const s = h('div', { class: 'summary screen' },
      h('h2', {}, title), h('p', { class: 'lead' }, msg), h('div', { class: 'sum' }, rows),
      run.newCards.length ? h('div', {}, h('h3', {}, 'Cartas nuevas'), h('div', { class: 'reward-row' }, run.newCards.map(c => fullCard(c)))) : null,
      run.newAch.length ? h('div', {}, h('h3', {}, 'Logros'), h('ul', { class: 'ach-new' }, run.newAch.map(id => { const a = achievements.find(x => x.id === id)!; return h('li', {}, h('b', {}, a.name), ' · ', a.rule); }))) : null,
      h('div', { class: 'row' }, h('button', { class: 'pbtn', onclick: () => ctx.exit() }, 'Volver'), mode === 'campaign' && !cleared || mode !== 'campaign' ? h('button', { class: 'pbtn ghost', onclick: () => ctx.replay(level, mode) }, 'Repetir') : null));
    sfx(cleared || mode !== 'campaign' ? 'win' : 'click');
    ctx.mount(s); playMusic('victoria', 0);
    };
    if (cleared && mode === 'campaign' && ctx.story?.(level, showSummary)) return;
    showSummary();
  }

  /* ---------- teclado ---------- */
  function onKey(e: KeyboardEvent): void {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (!overlay.hidden) return;
    if (phase === 'feedback' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); proceed?.(); return; }
    if (phase === 'choose') {
      if (e.key === 'b' || e.key === 'B') choose('basic');
      else if (/^[1-3]$/.test(e.key)) { const id = state.hand[+e.key - 1]; if (id) choose(id); }
    } else if (phase === 'answer') {
      if (/^[1-4]$/.test(e.key)) { const b = qOpts.children[+e.key - 1] as HTMLButtonElement | undefined; if (b && !b.disabled) b.click(); }
      else if (e.key === 'h' || e.key === 'H') useHint();
    }
  }

  nextRoom();
}
void artCanvas; void TYPENAME; void WORLD_COLOR; void levels;
