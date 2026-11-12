/** Animación al terminar un nivel: rayos de luz, confeti, estrellas según el desempeño y el héroe celebrando. */
import type { Level } from '../core/types';
import { h, ticker, heroSprite, monsterSprite } from './dom';
import { BattleView, GY } from '../gfx/battle';
import { confetti, stars, sunburst, title } from '../gfx/finale';
import { sfx, playMusic } from './audio';
import { monsterById } from '../core/data';

export interface ClearOpts { level: Level; hero: any; cleared: boolean; mode: string; accuracy: number; mount(el: HTMLElement, cb?: () => void): void; next(): void }
export const starsFor = (acc: number, cleared: boolean): number => (acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : cleared || acc >= 0.4 ? 1 : 0);
export function playLevelClear(o: ClearOpts): void {
  const bossRoom = [...o.level.rooms].reverse().find(r => r.monster), m = monsterById[bossRoom?.monster ?? 'slime_fraccionario'];
  const v = new BattleView(h('canvas', { class: 'c-canvas', 'aria-label': 'Celebración' }));
  v.setup(o.level.world, heroSprite(o.hero), monsterSprite(m)); v.monVisible = false; v.hero.x = 144; v.hero.y = GY - 29; v.hero.dirty = true; v.zoom = 0.3;
  const n = starsFor(o.accuracy, o.cleared), text = o.mode === 'campaign' ? (o.cleared ? 'ZONA SUPERADA' : 'SIGUE ENTRENANDO') : 'AVENTURA TERMINADA';
  const timers: number[] = []; const at = (ms: number, fn: () => void): void => { timers.push(window.setTimeout(fn, ms)); };
  const btn = h('button', { class: 'pbtn lc-next', hidden: true, onclick: () => go() }, 'Continuar (Enter)');
  const sub = h('p', { class: 'lead lc-sub' }, `${Math.round(o.accuracy * 100)} % de aciertos · ${n} de 3 estrellas`);
  let off: (() => void) | null = null, done = false;
  const keyH = (e: KeyboardEvent): void => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); go(); } };
  function go(): void { if (done) return; done = true; timers.forEach(clearTimeout); document.removeEventListener('keydown', keyH); off?.(); sfx('click'); o.next(); }
  o.mount(h('div', { class: 'screen lc' }, h('div', { class: 'c-stage lc-stage' }, v.cv), sub, btn, h('button', { class: 'pbtn small ghost lc-skip', onclick: () => go() }, 'Saltar')), () => { timers.forEach(clearTimeout); document.removeEventListener('keydown', keyH); off?.(); });
  off = ticker.add(dt => v.step(dt)); document.addEventListener('keydown', keyH);
  playMusic('victoria', 0); sfx(o.cleared || o.mode !== 'campaign' ? 'win' : 'swell');
  sunburst(v, 160, 120, 9000, o.cleared ? '255,220,110' : '140,190,255', 16); title(v, text, 34, o.cleared ? '#ffd24d' : '#9fe8ff', 250, text.length > 14 ? 3 : 4);
  stars(v, n, 80, 1000, 600, (k: string) => sfx(k as any)); confetti(v, 80, 3200); at(1600, () => confetti(v, 60, 3000)); at(3000, () => confetti(v, 60, 3000));
  at(300, () => v.hero.play('win')); for (let t = 1700; t < 12000; t += 1500) at(t, () => v.hero.play('win'));
  at(2400, () => { sfx('swell'); v.zoomPulse(0.04); }); at(3300, () => { btn.hidden = false; btn.focus(); });
}
