import type { Level, SaveData } from '../core/types';
import { achievements, cards, cardById, heroes, heroById, levels, monsterById, topics, topicById, worlds, WORLD_COLOR } from '../core/data';
import { LocalRepo, newSave } from '../game/save';
import { masteryOf } from '../game/mastery';
import { isAvailable, isCleared } from '../game/campaign';
import { freeRun, learningRun } from '../game/levelgen';
import { newSeed } from '../core/rng';
import { h, ticker, spriteCanvas, heroSprite, monsterSprite, pct, glyph } from './dom';
import { fullCard } from './cards';
import { setSound, setVolumes, sfx, playMusic, playAmbient, unlockAudio, soundtrackStatus, playSoundtrackNow, AUDIO_BUILD } from './audio';
import { loadoutOf } from '../game/arena';
import { detectCheat } from '../game/cheats';
import { gfxFlags } from '../gfx/scene';
import { Mode, startRun } from './run';
import { playCinematic } from './cinematic';
import { CINEMATICS, CINE_BY_ID, DIARY, POST_STORY, PRE_STORY } from '../core/story';

const repo = new LocalRepo();
let save: SaveData | null = repo.load();
const appEl = document.getElementById('app')!;
let cleanup: (() => void) | null = null;

function mount(el: HTMLElement, cb?: () => void): void {
  cleanup?.(); cleanup = cb ?? null; ticker.clear(); playMusic('menu', 0); playAmbient('menu');
  appEl.replaceChildren(el); window.scrollTo(0, 0);
}
function applySettings(): void {
  const s = save?.settings; if (!s) return;
  document.documentElement.style.setProperty('--ts', String(s.textScale));
  document.documentElement.classList.toggle('cb', s.colorBlind);
  setSound(s.sound); gfxFlags.reduce = s.reduceMotion; setVolumes({ music: s.musicVol ?? 0.5, sfx: s.sfxVol ?? 0.8, amb: s.ambVol ?? 0.6 });
}
const persist = (): void => { if (save) repo.save(save); };
const btn = (t: string, fn: () => void, cls = ''): HTMLButtonElement => h('button', { class: 'pbtn ' + cls, onclick: () => { sfx('click'); fn(); } }, t);
const back = (fn: () => void = home): HTMLElement => h('div', { class: 'topbar' }, btn('← Volver', fn, 'small ghost'));
const bar = (v: number): HTMLElement => h('div', { class: 'bar mini' }, h('i', { style: { width: pct(v) } }));

/** Reproduce cinemáticas en cadena (solo las no vistas, salvo force) y luego continúa. */
function stories(ids: string[], then: () => void, force = false): void {
  const todo = ids.filter(id => CINE_BY_ID[id] && (force || !save!.seen?.includes(id)));
  const go = (i: number): void => { if (i >= todo.length) { then(); return; } playCinematic({ save: save!, id: todo[i], mount, persist, done: () => go(i + 1) }); };
  go(0);
}
function play(level: Level, mode: Mode): void {
  if (!save) return;
  if (mode === 'campaign' && PRE_STORY[level.id] && PRE_STORY[level.id].some(id => !save!.seen?.includes(id))) { stories(PRE_STORY[level.id], () => play(level, mode)); return; }
  startRun({
    save, persist, mount,
    story: (l, then) => { const id = POST_STORY[l.id]; if (!id) return false; stories([id], then, true); return true; },
    exit: () => { if (mode === 'learning') learning(); else if (mode === 'free') free(); else if (mode === 'errors') errors(); else campaign(); },
    replay: (l, m) => play(l, m)
  }, level, mode);
}

/* ---------------- título ---------------- */
export function title(): void {
  const hs = heroes.map(x => h('div', { class: 'title-hero' }, spriteCanvas(heroSprite(x), 5, 'idle', { vary: true })));
  mount(h('div', { class: 'screen title' },
    h('h1', { class: 'logo' }, 'Mazmorra', h('br'), 'Matemática'),
    h('p', { class: 'lead' }, 'Combate por cartas. Cada golpe es un problema; cada acierto, poder.'),
    h('div', { class: 'title-heroes' }, hs),
    h('div', { class: 'col' }, save ? btn('Continuar', home) : null, btn(save ? 'Nueva partida' : 'Empezar', () => (save ? confirmNew() : heroSelect()), save ? 'ghost' : ''))));
}
function confirmNew(): void {
  mount(h('div', { class: 'screen' }, h('h2', {}, '¿Borrar la partida actual?'), h('p', {}, 'Se perderá todo el progreso guardado en este navegador.'), h('div', { class: 'row' }, btn('Cancelar', title, 'ghost'), btn('Borrar y empezar', () => { repo.clear(); save = null; heroSelect(); }))));
}
function heroSelect(): void {
  let sel = heroes[0].id;
  const input = h('input', { class: 'inp', maxLength: 16, placeholder: 'Tu nombre', 'aria-label': 'Nombre del héroe', value: '' });
  const grid = h('div', { class: 'hero-grid' });
  const draw = () => grid.replaceChildren(...heroes.map(x => h('button', { class: 'hero-card' + (x.id === sel ? ' sel' : ''), style: { '--c': x.color } as any, onclick: () => { sel = x.id; sfx('click'); draw(); } },
    spriteCanvas(heroSprite(x), 5, 'idle'), h('b', {}, x.name), h('span', {}, x.style), h('span', { class: 'muted' }, `Vida ${x.hp} · ${x.passive.text}`))));
  draw();
  mount(h('div', { class: 'screen' }, back(title), h('h2', {}, 'Elige a tu héroe'), grid, h('label', { class: 'lbl' }, 'Nombre', input),
    btn('¡A la aventura!', () => { save = newSave(sel, (input.value.trim() || heroById[sel].name.split(',')[0]).slice(0, 16)); persist(); applySettings(); stories(['prologo'], home); })));
}

/* ---------------- inicio ---------------- */
export function home(): void {
  if (!save) { title(); return; }
  applySettings();
  const hero = heroById[save.profile.heroId];
  const cleared = levels.filter(l => !l.bonus && !l.optional && save!.progress.levelsCleared.includes(l.id)).length;
  const tile = (name: string, desc: string, icon: string, fn: () => void) => h('button', { class: 'tile', onclick: () => { sfx('click'); fn(); } }, glyph(icon, 5), h('b', {}, name), h('span', {}, desc));
  const weak = topics.map(t => ({ t, m: masteryOf(save!, t.id) })).sort((a, b) => a.m - b.m)[0];
  mount(h('div', { class: 'screen home' },
    h('header', { class: 'home-head' }, spriteCanvas(heroSprite(hero), 4, 'idle'), h('div', {}, h('h2', {}, save.profile.name), h('p', { class: 'muted' }, `${hero.name} · ${cleared}/${levels.filter(l => !l.bonus && !l.optional).length} zonas superadas · ${save.stats.questionsAnswered ? pct(save.stats.correct / save.stats.questionsAnswered) : '—'} de acierto`))),
    h('div', { class: 'tiles' },
      tile('Campaña', 'La historia por mundos y parciales', 'sword', campaign),
      tile('Aprendizaje', 'Entrena un tema con dificultad adaptable', 'book', learning),
      tile('Juego libre', 'Aventura aleatoria mezclando temas', 'question', free),
      tile('Cartas', `${save.deck.length + save.relics.length}/${cards.length} en tu colección`, 'bolt', collection),
      tile('Libro de errores', `${save.errorBook.filter(e => !e.resolved).length} por repasar`, 'skull', errors),
      tile('Logros', `${save.achievements.length}/${achievements.length}`, 'star', ach),
      tile('Historia', 'Cinemáticas y diario de la Maestra', 'book', story),
      tile('Ajustes', 'Texto, sonido, accesibilidad', 'grid', settings)),
    weak && save.stats.questionsAnswered ? h('p', { class: 'muted tip' }, `Sugerencia: practica «${weak.t.name}» (${pct(weak.m)}).`) : null,
    btn('Salir al título', title, 'ghost small')));
}

/* ---------------- campaña ---------------- */
function levelCard(l: Level, s: SaveData, onPlay: () => void): HTMLElement {
  const ok = isAvailable(s, l), done = isCleared(s, l.id), t = topicById[l.topic];
  const firstMon = l.rooms.find(r => r.monster)?.monster, m = firstMon ? monsterById[firstMon] : null;
  return h('button', { class: `zone${done ? ' done' : ''}${ok ? '' : ' locked'}`, disabled: !ok, onclick: onPlay },
    m ? spriteCanvas(monsterSprite(m), 2, 'idle', { vary: true }) : null,
    h('b', {}, l.name), h('span', { class: 'muted' }, l.boss ? (l.final ? 'Combate final' : 'Parcial') : l.bonus ? 'Bonus' : (t ? pct(masteryOf(s, t.id)) + ' dominio' : '')),
    t && !l.boss ? bar(masteryOf(s, t.id)) : null, h('i', { class: 'zone-st' }, done ? '✓' : ok ? '' : '🔒'));
}
export function campaign(): void {
  const s = save!;
  const sections = worlds.map(w => {
    const ls = levels.filter(l => l.world === w.id || (w.id === 'vacio' && l.final));
    if (!ls.length) return null;
    return h('section', { class: 'world', style: { '--c': WORLD_COLOR[w.id] ?? '#888' } as any }, h('h3', {}, w.name), h('p', { class: 'muted' }, w.unit),
      h('div', { class: 'zones' }, ls.sort((a, b) => (a.bonus ? 1 : 0) - (b.bonus ? 1 : 0) || (a.order ?? 99) - (b.order ?? 99)).map(l => levelCard(l, s, () => play(l, 'campaign')))));
  });
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Campaña'), h('p', { class: 'muted' }, 'Supera cada zona dominando su tema (70 %). Cada parcial mezcla los temas del mundo.'), sections));
}

/* ---------------- aprendizaje ---------------- */
export function learning(): void {
  const s = save!;
  const worldsEl = worlds.map(w => {
    const ts = topics.filter(t => t.world === w.id); if (!ts.length) return null;
    return h('section', { class: 'world', style: { '--c': WORLD_COLOR[w.id] ?? '#888' } as any }, h('h3', {}, w.name),
      h('div', { class: 'zones' }, ts.map(t => h('button', { class: 'zone', onclick: () => { sfx('click'); play(learningRun(t.id, newSeed()), 'learning'); } },
        glyph(t.emblem ?? 'star', 4), h('b', {}, t.name), h('span', { class: 'muted' }, pct(masteryOf(s, t.id)) + ' dominio'), bar(masteryOf(s, t.id))))));
  });
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Aprendizaje'), h('p', { class: 'muted' }, 'Elige un tema. La dificultad se adapta a tu nivel.'), worldsEl));
}

/* ---------------- juego libre ---------------- */
export function free(): void {
  const sel = new Set(worlds.filter(w => w.id !== 'vacio').map(w => w.id));
  const boxes = worlds.filter(w => w.id !== 'vacio').map(w => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: true, onchange: (e: Event) => { (e.target as HTMLInputElement).checked ? sel.add(w.id) : sel.delete(w.id); } }), w.name));
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Juego libre'), h('p', { class: 'muted' }, 'Aventura aleatoria con los temas de los mundos que elijas.'), h('div', { class: 'col left' }, boxes),
    btn('¡Generar aventura!', () => { if (!sel.size) return; play(freeRun(newSeed(), [...sel]), 'free'); })));
}

/* ---------------- cartas ---------------- */
export function collection(): void {
  const s = save!, own = new Set([...s.deck, ...s.relics]);
  const tf = ['todas', 'ataque', 'defensa', 'utilidad', 'riesgo', 'reliquia'];
  const grid = h('div', { class: 'cardgrid' });
  const info = h('p', { class: 'lead' });
  const eq = (): string[] => loadoutOf(s);
  const showInfo = (): void => { info.textContent = 'Habilidades equipadas para el combate (' + eq().length + '/4): ' + (eq().map(id => cardById[id].name).join(', ') || 'ninguna') + '. Toca una carta que tengas para equiparla o quitarla.'; };
  const toggleEq = (id: string): void => { const cur = eq(); const i = cur.indexOf(id); if (i >= 0) cur.splice(i, 1); else { if (cur.length >= 4) cur.shift(); cur.push(id); } s.loadout = cur; persist(); sfx('card'); draw(curF); };
  let curF = 'todas';
  const draw = (f: string): void => { curF = f; showInfo(); grid.replaceChildren(...cards.filter(c => f === 'todas' || c.type === f).map(c => { const el = fullCard(c, own.has(c.id)); const eqOk = s.deck.includes(c.id) && c.type !== 'reliquia' && c.id !== 'estocada_basica'; if (eqOk) { el.classList.add('equippable'); el.classList.toggle('equipped', eq().includes(c.id)); el.addEventListener('click', () => toggleEq(c.id)); el.tabIndex = 0; el.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') toggleEq(c.id); }); } return el; })); };
  const tabs = h('div', { class: 'tabs' }, tf.map(f => h('button', { class: 'pbtn small ghost', onclick: () => { sfx('click'); draw(f); } }, f)));
  draw('todas');
  mount(h('div', { class: 'screen wide' }, back(), h('h2', {}, `Cartas · ${own.size}/${cards.length}`), info, tabs, grid));
}

/* ---------------- logros ---------------- */
export function ach(): void {
  const s = save!;
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Logros'), h('ul', { class: 'achs' }, achievements.map(a => { const got = s.achievements.includes(a.id); return h('li', { class: got ? 'got' : '' }, glyph(a.icon, 4, got ? '#f2c14e' : '#6b6283'), h('div', {}, h('b', {}, a.name), h('span', { class: 'muted' }, a.rule))); }))));
}

/* ---------------- errores ---------------- */
export function errors(): void {
  const s = save!, open = s.errorBook.filter(e => !e.resolved).slice().reverse();
  const counts: Record<string, number> = {}; open.forEach(e => { counts[e.topic] = (counts[e.topic] ?? 0) + 1; });
  const worst = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Libro de errores'),
    open.length ? h('div', {}, worst ? btn(`Practicar «${topicById[worst]?.name}»`, () => play(learningRun(worst, newSeed()), 'errors')) : null,
      h('ul', { class: 'errs' }, open.slice(0, 40).map(e => h('li', {}, h('small', { class: 'muted' }, topicById[e.topic]?.name ?? ''), h('p', {}, e.text), h('p', { class: 'bad' }, 'Tu respuesta: ' + e.given), h('p', { class: 'good' }, 'Correcta: ' + e.answer), h('p', { class: 'muted' }, e.explain)))))
      : h('p', { class: 'lead' }, 'Aún no tienes errores pendientes. Los fallos aparecerán aquí para repasarlos; al acertar una pregunta del mismo tipo se marcan como repasados.')));
}

/* ---------------- historia ---------------- */
export function story(): void {
  const s = save!, seen = new Set(s.seen ?? []);
  const cines = CINEMATICS.map(c => seen.has(c.id) ? h('button', { class: 'zone', onclick: () => { sfx('click'); stories([c.id], story, true); } }, h('b', {}, c.title), h('span', { class: 'muted' }, '▶ Volver a ver')) : h('div', { class: 'zone locked' }, h('b', {}, '???'), h('span', { class: 'muted' }, 'Avanza en la campaña')));
  const pages = Object.entries(DIARY).map(([id, d]) => s.diaryPages.includes('diario_' + id) ? h('article', { class: 'diary' }, h('b', {}, d.title), h('p', {}, d.text)) : null);
  const have = pages.filter(Boolean).length;
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Historia'), h('h3', {}, 'Cinemáticas'), h('div', { class: 'zones' }, cines),
    h('h3', {}, `Diario de la Maestra Aritmia · ${have}/${pages.length}`), have ? h('div', { class: 'diaries' }, pages) : h('p', { class: 'muted' }, 'Supera zonas de la campaña para desbloquear páginas con consejos y lore.')));
}

/* ---------------- ajustes ---------------- */
export function settings(): void {
  const s = save!;
  const toggle = (label: string, key: 'sound' | 'colorBlind' | 'reduceMotion') => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: s.settings[key], onchange: (e: Event) => { s.settings[key] = (e.target as HTMLInputElement).checked; persist(); applySettings(); } }), label);
  const range = h('input', { type: 'range', min: 0.9, max: 1.5, step: 0.1, value: s.settings.textScale, 'aria-label': 'Tamaño del texto', oninput: (e: Event) => { s.settings.textScale = +(e.target as HTMLInputElement).value; persist(); applySettings(); } });
  const vol = (label: string, key: 'musicVol' | 'sfxVol' | 'ambVol', d: number) => h('label', { class: 'lbl' }, label, h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.settings[key] ?? d, 'aria-label': label, oninput: (e: Event) => { s.settings[key] = +(e.target as HTMLInputElement).value; persist(); applySettings(); }, onchange: () => sfx('ok') }));
  const musicRow = () => { const st = h('p', { class: 'muted', role: 'status' }, soundtrackStatus()); const upd = () => { st.textContent = soundtrackStatus(); }; return h('div', { class: 'col left' }, st, btn('Reproducir banda sonora', () => { playSoundtrackNow(); setTimeout(upd, 500); setTimeout(upd, 2000); }, 'ghost'), h('small', { class: 'muted' }, 'Versión de audio: ' + AUDIO_BUILD)); };
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Ajustes'), h('div', { class: 'col left' },
    h('label', { class: 'lbl' }, 'Tamaño del texto', range), toggle('Sonido', 'sound'), vol('Música', 'musicVol', 0.5), vol('Efectos', 'sfxVol', 0.8), vol('Ambiente', 'ambVol', 0.6), musicRow(), toggle('Reducir movimiento', 'reduceMotion'),
    h('label', { class: 'lbl' }, 'Velocidad del combate mientras resuelves un problema', h('select', { 'aria-label': 'Velocidad durante problemas', onchange: (e: Event) => { s.settings.timeMode = (e.target as HTMLSelectElement).value as any; persist(); } }, ([['normal', 'Normal'], ['slow', 'Lento (70 %)'], ['veryslow', 'Muy lento (45 %)']] as const).map(([v, t]) => h('option', { value: v, selected: (s.settings.timeMode ?? 'normal') === v }, t)))),
    h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!s.settings.noTimeout, onchange: (e: Event) => { s.settings.noTimeout = (e.target as HTMLInputElement).checked; persist(); } }), 'Sin límite de tiempo para responder (accesibilidad)'),
    toggle('Modo daltónico (formas y etiquetas extra)', 'colorBlind'),
    (() => { const inp = h('input', { class: 'inp', maxLength: 24, placeholder: 'Código secreto', 'aria-label': 'Código secreto' }) as HTMLInputElement; const go = () => { if (runCheat(inp.value, false)) inp.value = ''; else sfx('bad'); }; inp.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') go(); }); return h('div', { class: 'row' }, inp, btn('Probar', go, 'ghost small')); })(),
    h('hr'), btn('Borrar partida', () => { mount(h('div', { class: 'screen' }, h('h2', {}, '¿Borrar todo el progreso?'), h('div', { class: 'row' }, btn('Cancelar', settings, 'ghost'), btn('Borrar', () => { repo.clear(); save = null; title(); })))); }, 'ghost'))));
}

/* ---------------- trucos (estilo GTA) ---------------- */
let cheatBuf = '', cheatT = 0;
function runCheat(text: string, refresh: boolean): boolean {
  const c = save ? detectCheat(text) : null; if (!save || !c) return false;
  c.apply(save); persist(); sfx('win');
  const el = h('div', { class: 'cheat-toast', role: 'status' }, h('b', {}, '¡TRUCO ACTIVADO!'), h('span', {}, c.label)); document.body.append(el); setTimeout(() => el.remove(), 3400);
  if (refresh) home();
  return true;
}
function cheatKeys(e: KeyboardEvent): void {
  const t = e.target as HTMLElement | null; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (document.querySelector('.arena, .a-chal') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
  cheatBuf = (cheatBuf + e.key.toUpperCase()).slice(-16); clearTimeout(cheatT); cheatT = window.setTimeout(() => { cheatBuf = ''; }, 3000);
  if (runCheat(cheatBuf, true)) cheatBuf = '';
}
export function boot(): void { window.addEventListener('keydown', cheatKeys); applySettings(); title(); window.addEventListener('pointerdown', () => unlockAudio(), { once: true }); window.addEventListener('keydown', () => unlockAudio(), { once: true }); }
