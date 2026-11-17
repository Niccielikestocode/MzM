import type { CardDef, Level, Room, SaveData } from '../core/types';
import { dialogues, heroById, monsterById, roomIcon, topicById } from '../core/data';
import { mulberry32, newSeed } from '../core/rng';
import { h, $, ticker, heroSprite, monsterSprite, glyph, pct } from './dom';
import { BattleView } from '../gfx/battle';
import { gfxFlags } from '../gfx/scene';
import { masteryOf } from '../game/mastery';
import { isCleared, zoneClearable } from '../game/campaign';
import { checkAchievements, dropCards, masteryCards, treasureCard } from '../game/rewards';
import { achievements } from '../core/data';
import { fullCard } from './cards';
import { sfx, playMusic, playAmbient, setIntensity } from './audio';
import { startArena } from './arena';
import { confetti, sunburst } from '../gfx/finale';
import { playLevelClear } from './levelclear';

export type Mode = 'campaign' | 'learning' | 'free' | 'errors';
export interface RunCtx { story?(level: Level, then: () => void): boolean; save: SaveData; persist(): void; mount(el: HTMLElement, cleanup?: () => void): void; exit(): void; replay(level: Level, mode: Mode): void }
export function startRun(ctx: RunCtx, level: Level, mode: Mode): void {
  const save = ctx.save, rng = mulberry32(newSeed()), hero = heroById[save.profile.heroId];
  const run = { idx: 0, hp: hero.hp, asked: 0, correct: 0, topics: new Set<string>(), before: {} as Record<string, number>, newCards: [] as CardDef[], newAch: [] as string[], lastTemplate: '' };
  const topicsOf = (): string[] => { const s = new Set<string>(); level.rooms.forEach(r => { if (r.type === 'combat' || r.type === 'boss') { (r.phases ?? (r.topic ? [r.topic] : [])).forEach(t => s.add(t)); if (!r.phases && !r.topic) s.add(level.topic); if (r.monster && monsterById[r.monster].phases) monsterById[r.monster].phases!.forEach(t => s.add(t)); } }); return [...s].filter(t => topicById[t]); };
  topicsOf().forEach(t => { run.before[t] = masteryOf(save, t); });
  gfxFlags.reduce = save.settings.reduceMotion;

  /* ---------- pantalla de sala (descanso, cofre, resultado) ---------- */
  function roomScreen(room: Room | undefined, title: string, body: (Node | string)[], buttons: [string, () => void, boolean?][], opts: { dead?: boolean; win?: boolean } = {}): BattleView {
    const m = monsterById[room?.monster ?? 'slime_fraccionario'];
    const view = new BattleView(h('canvas', { class: 'c-canvas', 'aria-label': 'Escena' }));
    view.setup(level.world, heroSprite(hero), monsterSprite(m)); view.monVisible = false; if (opts.win) view.hero.play('win'); if (opts.dead) view.hero.play('hurt');
    const overlay = h('div', { class: 'c-overlay' }, h('div', { class: 'dlg wide' }, h('h3', {}, title), ...body, h('div', { class: 'dlg-btns' }, buttons.map(([t, fn, ghost]) => h('button', { class: 'pbtn' + (ghost ? ' ghost' : ''), onclick: () => { sfx('click'); fn(); } }, t)))));
    const dots = h('div', { class: 'c-dots', 'aria-label': 'Salas' }, level.rooms.map((r, i) => h('span', { class: `dot${i === run.idx ? ' now' : ''}${i < run.idx ? ' done' : ''}`, title: r.type }, glyph(roomIcon[r.type === 'boss' ? 'boss' : r.type] ?? 'star', 2, i === run.idx ? '#f2c14e' : '#9a90b8'))));
    if (opts.win) { sunburst(view, 160, 110, 7000); confetti(view, 60, 2800); overlay.classList.add('win'); }
    ctx.mount(h('div', { class: 'combat solo' }, h('div', { class: 'c-left' }, dots, h('div', { class: 'c-stage' }, view.cv, overlay))));
    ticker.add(dt => view.step(dt)); playMusic(level.world, 0); playAmbient(level.world);
    ($('button', overlay) as HTMLElement).focus(); return view;
  }
  const next = (): void => { run.idx++; nextRoom(); };

  function nextRoom(): void {
    if (run.idx >= level.rooms.length) { finishLevel(); return; }
    const room = level.rooms[run.idx];
    if (room.type === 'combat' || room.type === 'boss') enterCombat(room);
    else if (room.type === 'treasure') enterTreasure();
    else enterRest(room);
  }
  function enterRest(room: Room): void {
    setIntensity(0); const heal = Math.min(hero.hp - run.hp, Math.ceil(hero.hp * 0.4)); run.hp += heal;
    const v = roomScreen(room, 'Descanso junto al fuego', [`Recuperas ${heal} de vida. Vida actual: ${run.hp}/${hero.hp}.`], [['Seguir', next]]); sfx('heal'); v.float(`+${heal}`, 52, 100, '#6fcf8f');
  }
  function enterTreasure(): void {
    setIntensity(0); const c = treasureCard(save, rng); ctx.persist(); sfx('card');
    if (c) { run.newCards.push(c); roomScreen(undefined, '¡Un cofre!', [h('div', { class: 'reward-card' }, fullCard(c)), `Consigues «${c.name}».`], [['Seguir', next]]); }
    else { const heal = Math.min(hero.hp - run.hp, 8); run.hp += heal; roomScreen(undefined, '¡Un cofre!', [`Ya tienes todas las cartas posibles. Bebes una poción: +${heal} de vida.`], [['Seguir', next]]); }
  }
  function enterCombat(room: Room): void {
    const m = monsterById[room.monster!];
    const intro: { speaker: string; text: string }[] = [];
    if (run.idx === 0 && level.intro && dialogues[level.intro]) intro.push(...dialogues[level.intro]); else intro.push({ speaker: m.name, text: m.line });
    startArena({
      save, hero, monster: m, room, level, heroHp: run.hp, rng, lastTemplate: run.lastTemplate, intro, mount: ctx.mount, persist: ctx.persist, exit: ctx.exit,
      onAnswer: (q, ok) => { run.asked++; if (ok) run.correct++; run.topics.add(q.topic); run.lastTemplate = q.template; },
      onEnd: r => { run.lastTemplate = r.lastTemplate; if (r.won) victory(room, r.heroHp, r.hints); else defeat(room); }
    });
  }
  function victory(room: Room, heroHp: number, hints: number): void {
    const m = monsterById[room.monster!]; save.stats.combatsWon++;
    if (m.boss) { if (!save.progress.bossesDefeated.includes(m.id)) save.progress.bossesDefeated.push(m.id); if (hints === 0 && level.boss) save.stats.bossNoHint = true; }
    const drops = dropCards(save, m.id); run.newCards.push(...drops);
    const heal = Math.min(hero.hp - heroHp, Math.ceil(hero.hp * 0.4)); run.hp = heroHp + heal; ctx.persist();
    roomScreen(room, `¡Venciste a ${m.name}!`, [heal ? `Recuperas ${heal} de vida (${run.hp}/${hero.hp}).` : '', ...drops.map(c => h('div', { class: 'reward-card' }, fullCard(c)))], [[run.idx + 1 >= level.rooms.length ? 'Terminar' : 'Siguiente sala', next]], { win: true }); sfx('win');
  }
  function defeat(room: Room): void {
    playMusic('story', 0);
    roomScreen(room, 'Has caído', ['Nada se pierde: tu dominio sigue creciendo con cada pregunta. Puedes intentar la sala de nuevo con otras preguntas.'], [
      ['Reintentar sala', () => { run.hp = Math.ceil(hero.hp * 0.6); nextRoom(); }], ['Salir', () => ctx.exit(), true]], { dead: true });
  }

  /* ---------- fin del nivel ---------- */
  function finishLevel(): void {
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
    const summary = (): void => {
    const s = h('div', { class: 'summary screen' },
      h('h2', {}, title), h('p', { class: 'lead' }, msg), h('div', { class: 'sum' }, rows),
      run.newCards.length ? h('div', {}, h('h3', {}, 'Cartas nuevas'), h('div', { class: 'reward-row' }, run.newCards.map(c => fullCard(c)))) : null,
      run.newAch.length ? h('div', {}, h('h3', {}, 'Logros'), h('ul', { class: 'ach-new' }, run.newAch.map(id => { const a = achievements.find(x => x.id === id)!; return h('li', {}, h('b', {}, a.name), ' · ', a.rule); }))) : null,
      h('div', { class: 'row' }, h('button', { class: 'pbtn', onclick: () => ctx.exit() }, 'Volver'), mode === 'campaign' && !cleared || mode !== 'campaign' ? h('button', { class: 'pbtn ghost', onclick: () => ctx.replay(level, mode) }, 'Repetir') : null));
    sfx(cleared || mode !== 'campaign' ? 'win' : 'click');
    ctx.mount(s); playMusic('victoria', 0);
    };
    const showSummary = (): void => playLevelClear({ level, hero, cleared, mode, accuracy: acc, mount: ctx.mount, next: summary });
    if (cleared && mode === 'campaign' && ctx.story?.(level, showSummary)) return;
    showSummary();
  }

  nextRoom();
}
