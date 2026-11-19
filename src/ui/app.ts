import type { Level, SaveData } from '../core/types';
import { achievements, cards, cardById, heroes, heroById, levels, monsters, topics, worlds } from '../core/data';
import { COLOMBIA_WORLDS, calculatorRank } from '../core/lore';
import { LocalRepo, newSave, exportSaveJSON, importSaveJSON } from '../game/save';
import { masteryOf } from '../game/mastery';
import { freeRun, learningRun } from '../game/levelgen';
import { newSeed } from '../core/rng';
import { h, ticker, spriteCanvas, heroSprite, pct, glyph } from './dom';
import { fullCard } from './cards';
import { setSound, setVolumes, setMusicMode, sfx, playMusic, playAmbient, unlockAudio, soundtrackStatus, playSoundtrackNow, AUDIO_BUILD } from './audio';
import { loadoutOf } from '../game/arena';
import { CHEATS, detectCheat } from '../game/cheats';
import { ActorClass, gfxFlags } from '../gfx/scene';
import { Mode, startRun } from './run';
import { playCinematic } from './cinematic';
import { CINEMATICS, CINE_BY_ID, DIARY, POST_STORY, PRE_STORY } from '../core/story';
import { showOverworld } from './overworld';
import { showDojo } from '../presentation/dojo/dojo';
import { showErrorBook } from '../presentation/errorbook/errorbook';
import { showBestiary } from '../presentation/bestiary/bestiary';
import { showAbout } from '../presentation/about/about';
import { canInstallPWA, promptInstallPWA, onInstallChange } from '../engine/pwa';
import { CONTROL_ACTIONS, prettyKeyName, ControlAction } from '../game/controls';

const repo = new LocalRepo();
let save: SaveData | null = repo.load();
const appEl = document.getElementById('app')!;
let cleanup: (() => void) | null = null;

function mount(el: HTMLElement, cb?: () => void): void {
  cleanup?.(); cleanup = cb ?? null;
  appEl.replaceChildren(el); window.scrollTo(0, 0);
  playMusic('menu', 0); playAmbient('menu');
}
function applySettings(): void {
  const s = save?.settings; if (!s) return;
  document.documentElement.style.setProperty('--ts', String(s.textScale));
  document.documentElement.classList.toggle('cb', s.colorBlind);
  setSound(s.sound);
  setMusicMode(s.musicMode ?? 'dynamic');
  gfxFlags.reduce = s.reduceMotion;
  setVolumes({ music: s.musicVol ?? 0.5, sfx: s.sfxVol ?? 0.8, amb: s.ambVol ?? 0.6 });
}
const persist = (): void => { if (save) repo.save(save); };
const btn = (t: string, fn: () => void, cls = ''): HTMLButtonElement => h('button', { class: 'pbtn ' + cls, onclick: () => { sfx('click'); fn(); } }, t);
const back = (fn: () => void = home): HTMLElement => h('div', { class: 'topbar' }, btn('← Volver', fn, 'small ghost'));

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

/* ---------------- Diorama Pixel Art Vivo (Portada) ---------------- */
function titleDioramaCanvas(): HTMLCanvasElement {
  const cv = h('canvas', { width: 320, height: 96, class: 'title-diorama', 'aria-label': 'Campamento andino de los héroes' }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const actors = heroes.map((hr, i) => {
    const a = new ActorClass(heroSprite(hr), [58, 198, 244][i], 46, 1);
    a.flip = i > 0;
    a.t = i;
    return a;
  });

  let elapsed = 0, mounted = false;
  const off = ticker.add((rawDt: number) => {
    if (cv.isConnected) mounted = true;
    else if (mounted) { off(); return; }
    const dt = Math.min(0.05, rawDt / 1000);
    elapsed += dt;

    // Cielo estrellado nocturno de los Andes
    ctx.fillStyle = '#0b0818'; ctx.fillRect(0, 0, 320, 44);
    ctx.fillStyle = '#191334'; ctx.fillRect(0, 44, 320, 30);

    // Estrellas titilantes
    for (let i = 0; i < 28; i++) {
      const sx = (i * 53 + 11) % 316, sy = (i * 29 + 5) % 42;
      ctx.fillStyle = Math.floor(elapsed * 2.5 + i) % 3 === 0 ? '#fff099' : '#7b6aa8';
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Silueta de cordillera andina en 2 capas
    ctx.fillStyle = '#211b40';
    for (let x = 0; x < 320; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 74); ctx.lineTo(x + 24, 24 + ((x * 3) % 16)); ctx.lineTo(x + 48, 74); ctx.fill();
    }
    ctx.fillStyle = '#2d2552';
    for (let x = 16; x < 320; x += 44) {
      ctx.beginPath(); ctx.moveTo(x, 74); ctx.lineTo(x + 22, 38 + ((x * 5) % 14)); ctx.lineTo(x + 44, 74); ctx.fill();
    }

    // Pradera del páramo
    ctx.fillStyle = '#1b382a'; ctx.fillRect(0, 70, 320, 26);
    ctx.fillStyle = '#29523c'; ctx.fillRect(0, 70, 320, 4);

    // Fogata central cálida con chispas pixeladas
    const fx = 152, fy = 68;
    const flick = Math.floor(elapsed * 8) % 2;
    ctx.fillStyle = 'rgba(255, 160, 40, 0.14)';
    ctx.beginPath(); ctx.arc(fx + 6, fy + 2, 26 + flick * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6e472b'; ctx.fillRect(fx, fy + 4, 12, 4);
    ctx.fillStyle = '#e84a5f'; ctx.fillRect(fx + 2, fy - 2 + flick, 8, 6);
    ctx.fillStyle = '#f5c542'; ctx.fillRect(fx + 3, fy - 4 - flick, 6, 6);
    ctx.fillStyle = '#fff099'; ctx.fillRect(fx + 5, fy - 1, 3, 3);
    for (let i = 0; i < 4; i++) {
      const sy = fy - ((elapsed * 18 + i * 9) % 24);
      const sx = fx + 5 + Math.round(Math.sin(elapsed * 4 + i) * 5);
      ctx.fillStyle = i % 2 ? '#fff099' : '#ff9a3c';
      ctx.fillRect(sx, Math.round(sy), 2, 2);
    }

    // Luciérnagas
    for (let i = 0; i < 6; i++) {
      const lx = Math.round(((i * 61 + elapsed * 10) % 312) + 4);
      const ly = Math.round(46 + Math.sin(elapsed * 2 + i) * 14);
      ctx.fillStyle = Math.sin(elapsed * 4 + i) > 0 ? '#4ecb71' : '#fff099';
      ctx.fillRect(lx, ly, 2, 2);
    }

    // Héroes animados junto a la fogata
    actors.forEach(a => { a.step(rawDt); a.draw(ctx); });
  });

  return cv;
}

/* ---------------- título ---------------- */
export function title(): void {
  const installBtn = canInstallPWA() ? btn('📲 Instalar como App', () => { void promptInstallPWA(); }, 'ghost small') : null;
  mount(h('div', { class: 'screen title' },
    h('span', { class: 'ow-badge' }, 'RPG PIXEL ART · TIERRAS DE ARITMIA'),
    h('h1', { class: 'logo' }, 'Mazmorra', h('br'), 'Matemática'),
    h('p', { class: 'lead' }, 'Recorre las regiones míticas de Colombia dominando el cálculo. Cada golpe es un problema; cada acierto, poder.'),
    titleDioramaCanvas(),
    h('div', { class: 'col' },
      save ? btn('▶ Continuar Aventura', home) : null,
      btn(save ? 'Nueva partida' : '⚔ ¡Empezar Aventura!', () => (save ? confirmNew() : heroSelect()), save ? 'ghost' : ''),
      h('div', { class: 'row' },
        btn('📜 Acerca de y Guía', () => about(title), 'ghost small'),
        installBtn
      )
    )));
}
function confirmNew(): void {
  mount(h('div', { class: 'screen' }, h('h2', {}, '¿Borrar la partida actual?'), h('p', {}, 'Se perderá el progreso guardado en este dispositivo (puedes exportarlo antes en Ajustes).'), h('div', { class: 'row' }, btn('Cancelar', title, 'ghost'), btn('Borrar y empezar', () => { repo.clear(); save = null; heroSelect(); }))));
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

/* ---------------- inicio (Cabecera con Rango RPG + Radar Matemático + Menú Colorido) ---------------- */
export function home(): void {
  if (!save) { title(); return; }
  applySettings();
  const hero = heroById[save.profile.heroId];
  const rank = calculatorRank(save);
  const cleared = levels.filter(l => !l.bonus && !l.optional && save!.progress.levelsCleared.includes(l.id)).length;
  const totalZ = levels.filter(l => !l.bonus && !l.optional).length;

  const tile = (name: string, desc: string, icon: string, fn: () => void, cls: string, tag?: string) =>
    h('button', { class: `tile ${cls}`, onclick: () => { sfx('click'); fn(); } },
      tag ? h('span', { class: 'tile-tag' }, tag) : null,
      glyph(icon, 5),
      h('b', {}, name),
      h('span', {}, desc));

  const weak = topics.map(t => ({ t, m: masteryOf(save!, t.id) })).sort((a, b) => a.m - b.m)[0];
  const openErrs = save.errorBook.filter(e => !e.resolved).length;
  const diffLabel = ({ casual: 'APRENDIZ', normal: 'AVENTURERO', expert: 'MAESTRO' })[save.settings.difficulty ?? 'normal'];

  // Radar de Dominio por las 3 Ramas
  const branchAvg = (worldId: string) => {
    const ts = topics.filter(t => t.world === worldId);
    if (!ts.length) return 0;
    return ts.reduce((acc, t) => acc + masteryOf(save!, t.id), 0) / ts.length;
  };
  const bNum = branchAvg('cavernas'), bAlg = branchAvg('bosque'), bGeo = branchAvg('ciudadela');

  const radarPanel = h('section', { class: 'radar-panel' },
    h('div', { class: 'radar-head' },
      h('b', {}, '📊 Radar del Calculista'),
      weak ? btn(`⚡ Entrenar «${weak.t.name}»`, () => learning(weak.t.id), 'small') : null
    ),
    h('div', { class: 'radar-bars' },
      h('div', { class: 'radar-row' }, h('span', {}, 'Números Reales'), h('div', { class: 'bar' }, h('i', { style: { width: pct(bNum), background: '#f5c542' } })), h('b', {}, pct(bNum))),
      h('div', { class: 'radar-row' }, h('span', {}, 'Álgebra y Funciones'), h('div', { class: 'bar' }, h('i', { style: { width: pct(bAlg), background: '#4ecb71' } })), h('b', {}, pct(bAlg))),
      h('div', { class: 'radar-row' }, h('span', {}, 'Geometría y Medidas'), h('div', { class: 'bar' }, h('i', { style: { width: pct(bGeo), background: '#5ab9ea' } })), h('b', {}, pct(bGeo)))
    )
  );

  mount(h('div', { class: 'screen home' },
    h('header', { class: 'home-head' },
      spriteCanvas(heroSprite(hero), 4, 'idle'),
      h('div', { class: 'home-head-info' },
        h('div', { class: 'row' },
          h('h2', {}, save.profile.name),
          h('span', { class: 'rank-badge' }, `${rank.badge} Nv.${rank.level} · ${rank.title}`),
          h('span', { class: `q-diff-badge ${save.settings.difficulty ?? 'normal'}` }, diffLabel)
        ),
        h('p', { class: 'muted' }, `${hero.name} · ${cleared}/${totalZ} zonas · ${save.stats.questionsAnswered ? pct(save.stats.correct / save.stats.questionsAnswered) : '—'} acierto · Racha máx ${save.stats.bestStreak}`),
        h('div', { class: 'xp-row' },
          h('small', {}, `XP ${rank.xp}/${rank.nextXp}`),
          h('div', { class: 'bar mini' }, h('i', { style: { width: pct(rank.pct), background: '#ffcf40' } }))
        )
      )
    ),
    radarPanel,
    h('div', { class: 'tiles' },
      tile('Mapa de Campaña', 'Overworld 16-bit por las 4 regiones de Colombia', 'sword', campaign, 'tile-gold', `${cleared}/${totalZ}`),
      tile('Dojo Visual', 'Laboratorio interactivo de gráficas y conceptos', 'book', () => learning(), 'tile-emerald', 'Visual'),
      tile('Libro de Errores', 'Diagnóstico conceptual y revanchas inmediatas', 'skull', errors, 'tile-coral', openErrs ? `${openErrs} pendientes` : 'Al día'),
      tile('Cartas Técnicas', `${save.deck.length + save.relics.length}/${cards.length} técnicas equipables (⚡PA)`, 'bolt', collection, 'tile-amber'),
      tile('Bestiario y Mitos', `${monsters.length} criaturas del folclor y sus debilidades`, 'skull', bestiary, 'tile-violet'),
      tile('Juego Libre', 'Aventura aleatoria mezclando regiones', 'question', free, 'tile-sky'),
      tile('Logros', `${save.achievements.length}/${achievements.length} medallas desbloqueadas`, 'star', ach, 'tile-gold'),
      tile('Historia y Diario', 'Cinemáticas y cuaderno de la Maestra Aritmia', 'book', story, 'tile-cyan'),
      tile('Acerca de y Guía', 'Cómo jugar, propósito pedagógico y ficha técnica', 'star', () => about(home), 'tile-emerald'),
      tile('Configuración', 'Dificultad, audio, controles PC y respaldo JSON', 'grid', settings, 'tile-rose')
    ),
    h('div', { class: 'row' },
      btn('Salir al título', title, 'ghost small'),
      canInstallPWA() ? btn('📲 Instalar App', () => { void promptInstallPWA(); }, 'small') : null
    )));
}

/* ---------------- campaña (overworld pixel art tipo Mario) ---------------- */
export function campaign(): void {
  const s = save!;
  showOverworld({
    save: s,
    onPlay: l => play(l, 'campaign'),
    onDojo: tid => learning(tid),
    onBack: home,
    mount
  });
}

/* ---------------- aprendizaje (Dojo Visual Interactivo) ---------------- */
export function learning(initialTopic?: string): void {
  const s = save!;
  showDojo({
    save: s,
    initialTopic,
    onStartCombat: tid => play(learningRun(tid, newSeed()), 'learning'),
    onBack: home,
    mount
  });
}

/* ---------------- bestiario y acerca de ---------------- */
export function bestiary(): void {
  showBestiary({ save: save!, onBack: home, mount });
}
export function about(backTo: () => void = home): void {
  showAbout({ save, onBack: backTo, mount });
}

/* ---------------- juego libre ---------------- */
export function free(): void {
  const sel = new Set(worlds.filter(w => w.id !== 'vacio').map(w => w.id));
  const boxes = worlds.filter(w => w.id !== 'vacio').map(w => {
    const th = COLOMBIA_WORLDS[w.id];
    return h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: true, onchange: (e: Event) => { (e.target as HTMLInputElement).checked ? sel.add(w.id) : sel.delete(w.id); } }), `${th?.title ?? w.name} (${th?.region ?? ''})`);
  });
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Juego Libre'), h('p', { class: 'muted' }, 'Genera una mazmorra aleatoria mezclando los temas de las regiones que escojas.'), h('div', { class: 'col left' }, boxes),
    btn('⚔ ¡Generar Aventura!', () => { if (!sel.size) return; play(freeRun(newSeed(), [...sel]), 'free'); })));
}

/* ---------------- cartas ---------------- */
export function collection(): void {
  const s = save!, own = new Set([...s.deck, ...s.relics]);
  const tf = ['todas', 'ataque', 'defensa', 'utilidad', 'riesgo', 'reliquia'];
  const grid = h('div', { class: 'cardgrid' });
  const info = h('p', { class: 'lead' });
  const eq = (): string[] => loadoutOf(s);
  const showInfo = (): void => { info.textContent = `Cinto de combate (${eq().length}/4 técnicas): ` + (eq().map(id => cardById[id].name).join(', ') || 'ninguna') + '. En combate las cargas respondiendo bien (+1 ⚡PA). Toca una carta para equiparla.'; };
  const toggleEq = (id: string): void => { const cur = eq(); const i = cur.indexOf(id); if (i >= 0) cur.splice(i, 1); else { if (cur.length >= 4) cur.shift(); cur.push(id); } s.loadout = cur; persist(); sfx('card'); draw(curF); };
  let curF = 'todas';
  const draw = (f: string): void => { curF = f; showInfo(); grid.replaceChildren(...cards.filter(c => f === 'todas' || c.type === f).map(c => { const el = fullCard(c, own.has(c.id)); const eqOk = s.deck.includes(c.id) && c.type !== 'reliquia' && c.id !== 'estocada_basica'; if (eqOk) { el.classList.add('equippable'); el.classList.toggle('equipped', eq().includes(c.id)); el.addEventListener('click', () => toggleEq(c.id)); el.tabIndex = 0; el.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') toggleEq(c.id); }); } return el; })); };
  const tabs = h('div', { class: 'tabs' }, tf.map(f => h('button', { class: 'pbtn small ghost', onclick: () => { sfx('click'); draw(f); } }, f)));
  draw('todas');
  mount(h('div', { class: 'screen wide' }, back(), h('h2', {}, `Cartas Técnicas · ${own.size}/${cards.length}`), info, tabs, grid));
}

/* ---------------- logros ---------------- */
export function ach(): void {
  const s = save!;
  mount(h('div', { class: 'screen' }, back(), h('h2', {}, 'Logros de Aritmia'), h('ul', { class: 'achs' }, achievements.map(a => { const got = s.achievements.includes(a.id); return h('li', { class: got ? 'got' : '' }, glyph(a.icon, 4, got ? '#f5c542' : '#6b6283'), h('div', {}, h('b', {}, a.name), h('span', { class: 'muted' }, a.rule))); }))));
}

/* ---------------- libro de errores pedagógico ---------------- */
export function errors(): void {
  const s = save!;
  showErrorBook({
    save: s,
    persist,
    onBack: home,
    onPracticeTopic: tid => play(learningRun(tid, newSeed()), 'errors'),
    mount
  });
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

/* ---------------- ajustes por pestañas y controles ---------------- */
export function keybindingsScreen(): void {
  const s = save!;
  s.settings.keybinds ??= {};
  let listeningAction: ControlAction | null = null;
  const list = h('div', { class: 'kb-list' });

  const draw = () => {
    list.replaceChildren(...CONTROL_ACTIONS.map(act => {
      const curKey = s.settings.keybinds?.[act.id] || act.defaultKey;
      const isListening = listeningAction === act.id;
      return h('div', { class: `kb-row${isListening ? ' listening' : ''}` },
        h('span', { class: 'kb-action-name' }, act.name),
        h('button', {
          class: `pbtn small ${isListening ? '' : 'ghost'} kb-btn`,
          onclick: () => { sfx('click'); listeningAction = act.id; draw(); }
        }, isListening ? 'Pulsa una tecla…' : `[ ${prettyKeyName(curKey)} ]`)
      );
    }));
  };

  const onKey = (e: KeyboardEvent) => {
    if (!listeningAction) return;
    e.preventDefault(); e.stopPropagation();
    const k = e.key.toLowerCase();
    if (k === 'escape') { listeningAction = null; draw(); return; }
    s.settings.keybinds![listeningAction] = k;
    listeningAction = null; persist(); sfx('ok'); draw();
  };

  window.addEventListener('keydown', onKey);
  draw();
  mount(h('div', { class: 'screen' },
    back(settings),
    h('h2', {}, 'Configurar Controles (PC)'),
    h('p', { class: 'muted' }, 'Toca una acción y pulsa la nueva tecla. Pulsa Escape para cancelar.'),
    list,
    h('div', { class: 'row' }, btn('Restablecer por Defecto', () => { s.settings.keybinds = {}; persist(); sfx('ok'); draw(); }, 'ghost small'))
  ), () => window.removeEventListener('keydown', onKey));
}

export function settings(): void {
  const s = save!;
  let activeTab: 'play' | 'audio' | 'controls' | 'data' = 'play';
  const body = h('div', { class: 'settings-body' });
  const tabsEl = h('div', { class: 'settings-tabs' });

  const importInp = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const loaded = await importSaveJSON(f);
    if (loaded) { save = loaded; persist(); applySettings(); sfx('win'); home(); }
    else sfx('bad');
  } }) as HTMLInputElement;

  const toggle = (label: string, key: 'sound' | 'colorBlind' | 'reduceMotion') =>
    h('label', { class: 'chk retro-toggle' },
      h('input', { type: 'checkbox', checked: s.settings[key], onchange: (e: Event) => { s.settings[key] = (e.target as HTMLInputElement).checked; persist(); applySettings(); } }),
      h('span', {}, label)
    );

  const volSlider = (label: string, key: 'musicVol' | 'sfxVol' | 'ambVol', d: number) => {
    const cur = s.settings[key] ?? d;
    const valEl = h('b', { class: 'vol-pct' }, Math.round(cur * 100) + ' %');
    const inp = h('input', {
      type: 'range', min: 0, max: 1, step: 0.05, value: cur, 'aria-label': label,
      oninput: (e: Event) => { const v = +(e.target as HTMLInputElement).value; s.settings[key] = v; valEl.textContent = Math.round(v * 100) + ' %'; persist(); applySettings(); },
      onchange: () => sfx('ok')
    });
    return h('div', { class: 'vol-row' }, h('div', { class: 'vol-head' }, h('span', {}, label), valEl), inp);
  };

  function render(): void {
    tabsEl.replaceChildren(...([
      ['play', '🎮 Jugabilidad'],
      ['audio', '🔊 Audio'],
      ['controls', '⌨️ Controles'],
      ['data', '💾 Datos y Códigos']
    ] as const).map(([id, label]) => h('button', {
      class: `pbtn small ${activeTab === id ? '' : 'ghost'}`,
      onclick: () => { sfx('click'); activeTab = id; render(); }
    }, label)));

    if (activeTab === 'play') {
      const curDiff = s.settings.difficulty ?? 'normal';
      const diffs = [
        { id: 'casual' as const, icon: '★', title: 'Aprendiz (Casual)', desc: '+50 % tiempo de respuesta · −30 % daño enemigo · 2 pistas iniciales.' },
        { id: 'normal' as const, icon: '★★', title: 'Aventurero (Normal)', desc: 'Experiencia balanceada original entre reflejos y cálculo.' },
        { id: 'expert' as const, icon: '★★★', title: 'Maestro (Experto)', desc: '−20 % tiempo · +25 % daño enemigo · +50 % energía de combo.' }
      ];
      body.replaceChildren(
        h('h3', {}, 'Selecciona la Dificultad'),
        h('div', { class: 'diff-cards' }, diffs.map(d => h('button', {
          class: `diff-card ${d.id}${curDiff === d.id ? ' sel' : ''}`,
          onclick: () => { s.settings.difficulty = d.id; persist(); sfx('ok'); render(); }
        }, h('span', { class: 'diff-stars' }, d.icon), h('b', {}, d.title), h('small', {}, d.desc)))),
        h('label', { class: 'lbl' }, 'Velocidad del combate mientras resuelves un problema', h('select', {
          'aria-label': 'Velocidad durante problemas',
          onchange: (e: Event) => { s.settings.timeMode = (e.target as HTMLSelectElement).value as any; persist(); }
        }, ([['normal', 'Normal (100 %)'], ['slow', 'Lento (70 %)'], ['veryslow', 'Muy lento (45 %)']] as const).map(([v, t]) => h('option', { value: v, selected: (s.settings.timeMode ?? 'normal') === v }, t)))),
        h('div', { class: 'row' }, btn('↺ Reactivar Tutorial en Combate', () => { s.tutorialDone = false; persist(); sfx('ok'); }, 'ghost small'))
      );
    } else if (activeTab === 'audio') {
      const st = h('p', { class: 'muted', role: 'status' }, soundtrackStatus());
      const upd = () => { st.textContent = soundtrackStatus(); };
      body.replaceChildren(
        h('h3', {}, 'Sonido y Banda Sonora Dinámica'),
        toggle('Sonido general activado', 'sound'),
        h('label', { class: 'lbl' }, 'Estilo de música', h('select', {
          onchange: (e: Event) => { s.settings.musicMode = (e.target as HTMLSelectElement).value as any; persist(); applySettings(); upd(); }
        }, ([
          ['dynamic', '16-bit Dinámica por región y tensión (Recomendada)'],
          ['soundtrack', 'Pista MP3 en menús + 16-bit en combate']
        ] as const).map(([v, t]) => h('option', { value: v, selected: (s.settings.musicMode ?? 'dynamic') === v }, t)))),
        volSlider('Música', 'musicVol', 0.5),
        volSlider('Efectos (SFX)', 'sfxVol', 0.8),
        volSlider('Ambiente por bioma', 'ambVol', 0.6),
        st,
        h('div', { class: 'row' },
          btn('▶ Probar música', () => { playSoundtrackNow(); setTimeout(upd, 400); }, 'ghost small'),
          h('small', { class: 'muted' }, 'Motor: ' + AUDIO_BUILD)
        )
      );
    } else if (activeTab === 'controls') {
      const scaleVal = h('b', {}, Math.round(s.settings.textScale * 100) + ' %');
      const range = h('input', {
        type: 'range', min: 0.9, max: 1.5, step: 0.1, value: s.settings.textScale, 'aria-label': 'Tamaño del texto',
        oninput: (e: Event) => { const v = +(e.target as HTMLInputElement).value; s.settings.textScale = v; scaleVal.textContent = Math.round(v * 100) + ' %'; persist(); applySettings(); }
      });
      body.replaceChildren(
        h('h3', {}, 'Controles y Accesibilidad'),
        h('div', { class: 'row' }, btn('⌨ Personalizar Teclas de PC', keybindingsScreen)),
        h('p', { class: 'muted' }, 'En pantallas táctiles dispones automáticamente de Joystick analógico a la izquierda y botones ergonómicos a la derecha.'),
        h('label', { class: 'chk retro-toggle' }, h('input', { type: 'checkbox', checked: !!s.settings.noTimeout, onchange: (e: Event) => { s.settings.noTimeout = (e.target as HTMLInputElement).checked; persist(); } }), h('span', {}, 'Sin límite de tiempo para responder (accesibilidad)')),
        toggle('Modo daltónico (formas y etiquetas extra)', 'colorBlind'),
        toggle('Reducir movimiento y vibración de cámara', 'reduceMotion'),
        h('div', { class: 'vol-row' }, h('div', { class: 'vol-head' }, h('span', {}, 'Tamaño global del texto'), scaleVal), range)
      );
    } else {
      const inp = h('input', { class: 'inp', maxLength: 24, placeholder: 'Escribe un código secreto', 'aria-label': 'Código secreto' }) as HTMLInputElement;
      const go = () => { if (runCheat(inp.value, false)) inp.value = ''; else sfx('bad'); };
      inp.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') go(); });

      body.replaceChildren(
        h('h3', {}, 'Almacenamiento Local Blindado'),
        h('span', { class: 'eb-pill ok' }, '✓ IndexedDB Persistente + LocalStorage Activo'),
        h('p', { class: 'muted' }, 'Aunque el juego funciona 100% sin conexión ni servidor, puedes exportar tu progreso en un archivo JSON para transferirlo entre PC y celular.'),
        h('div', { class: 'row' },
          btn('⬇ Exportar Partida (.json)', () => { exportSaveJSON(s); sfx('coin'); }, 'small'),
          btn('⬆ Importar Partida', () => importInp.click(), 'ghost small'),
          importInp
        ),
        h('hr'),
        h('h3', {}, 'Códigos Secretos (estilo GTA)'),
        h('div', { class: 'row' }, inp, btn('Activar', go, 'small')),
        h('div', { class: 'cheat-ref' }, CHEATS.map(c => h('div', { class: 'cheat-chip' }, h('b', {}, c.code), h('small', {}, c.label)))),
        h('hr'),
        btn('🗑 Borrar partida', () => { mount(h('div', { class: 'screen' }, h('h2', {}, '¿Borrar todo el progreso?'), h('div', { class: 'row' }, btn('Cancelar', settings, 'ghost'), btn('Borrar', () => { repo.clear(); save = null; title(); })))); }, 'ghost small')
      );
    }
  }

  render();
  mount(h('div', { class: 'screen settings-screen' },
    back(),
    h('h2', {}, 'Centro de Configuración'),
    tabsEl,
    body
  ));
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
export function boot(): void {
  window.addEventListener('keydown', cheatKeys);
  applySettings();
  if (!save) {
    repo.hydrateFromIDB(recovered => {
      if (recovered && !save) { save = recovered; applySettings(); title(); }
    });
  }
  onInstallChange(() => { if (document.querySelector('.title')) title(); });
  title();
  window.addEventListener('pointerdown', () => unlockAudio(), { once: true });
  window.addEventListener('keydown', () => unlockAudio(), { once: true });
}
