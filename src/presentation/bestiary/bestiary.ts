/** Bestiario y Códice de Aritmia: criaturas folclóricas colombianas, animaciones y debilidades matemáticas */
import type { MonsterDef, SaveData } from '../../core/types';
import { levels, monsters, topicById } from '../../core/data';
import { COLOMBIA_WORLDS, loreForMonster } from '../../core/lore';
import { h, monsterSprite, spriteCanvas } from '../../ui/dom';
import { playMusic, sfx } from '../../ui/audio';

export interface BestiaryOpts {
  save: SaveData;
  onBack(): void;
  mount(el: HTMLElement, cleanup?: () => void): void;
}

export function showBestiary(opts: BestiaryOpts): void {
  const { save, onBack, mount } = opts;
  let filterWorld = 'todas';
  const root = h('div', { class: 'screen wide bestiary-screen' });

  const isDefeated = (m: MonsterDef): boolean => {
    if (m.boss) return save.progress.bossesDefeated.includes(m.id);
    return levels.some(l => save.progress.levelsCleared.includes(l.id) && l.rooms.some(r => r.monster === m.id));
  };

  function render(): void {
    const shown = monsters.filter(m => filterWorld === 'todas' || m.world === filterWorld);
    const defeatedCount = monsters.filter(isDefeated).length;

    const topBar = h('div', { class: 'ow-topbar' },
      h('button', { class: 'pbtn small ghost', onclick: () => { sfx('click'); onBack(); } }, '← Menú'),
      h('div', { class: 'ow-world-title' },
        h('span', { class: 'ow-badge' }, 'CÓDICE FOLCLÓRICO'),
        h('h2', { class: 'ow-title-text' }, `Bestiario de Aritmia (${defeatedCount}/${monsters.length})`)
      ),
      h('span', { class: 'eb-pill ok' }, `${defeatedCount} vencidos`)
    );

    const tabs = h('div', { class: 'tabs' },
      ([
        ['todas', 'Todas las regiones'],
        ['cavernas', 'Cavernas'],
        ['bosque', 'Páramo'],
        ['ciudadela', 'Ciudadela'],
        ['vacio', 'Tatacoa']
      ] as const).map(([id, label]) => h('button', {
        class: `pbtn small ${filterWorld === id ? '' : 'ghost'}`,
        onclick: () => { sfx('click'); filterWorld = id; render(); }
      }, label))
    );

    const grid = h('div', { class: 'bestiary-grid' },
      shown.map(m => {
        const defeated = isDefeated(m);
        const lore = loreForMonster(m);
        const worldTheme = COLOMBIA_WORLDS[m.world];
        const topicName = topicById[m.topic]?.name ?? (m.boss ? 'Evaluación Parcial' : m.topic);
        const spriteBox = h('div', { class: 'bst-sprite-box' }, spriteCanvas(monsterSprite(m), m.boss ? 2 : 3, 'idle'));

        const setAnim = (anim: 'idle' | 'attack' | 'hurt') => {
          sfx('click');
          spriteBox.replaceChildren(spriteCanvas(monsterSprite(m), m.boss ? 2 : 3, anim));
        };

        return h('article', {
          class: `bst-card${defeated ? ' defeated' : ''}${m.boss ? ' is-boss' : ''}`,
          style: { '--wc': worldTheme?.palette.accent ?? '#f5c542' } as any
        },
          h('div', { class: 'bst-head' },
            h('span', { class: 'bst-region' }, lore.region),
            h('span', { class: `bst-status ${defeated ? 'ok' : 'open'}` }, defeated ? '✓ VENCIDO' : m.boss ? '👑 JEFE' : '👁 EN RUTA')
          ),
          h('div', { class: 'bst-visual' },
            spriteBox,
            h('div', { class: 'bst-anim-btns' },
              h('button', { class: 'pbtn small ghost', onclick: () => setAnim('idle') }, 'Idle'),
              h('button', { class: 'pbtn small ghost', onclick: () => setAnim('attack') }, 'Ataque'),
              h('button', { class: 'pbtn small ghost', onclick: () => setAnim('hurt') }, 'Daño')
            )
          ),
          h('h3', { class: 'bst-name' }, m.name),
          h('p', { class: 'bst-myth' }, lore.myth),
          h('div', { class: 'bst-weakness' },
            h('b', {}, '🎯 Debilidad Matemática: '),
            h('span', {}, `${topicName} — ${lore.weakness}`)
          ),
          h('div', { class: 'bst-stats' },
            h('span', {}, `♥ Vida: ${m.hp}`),
            h('span', {}, `⚔ Daño: ${m.attack.damage}`),
            h('span', {}, `★ Nivel: ${m.difficulty[0]}–${m.difficulty[1]}`)
          )
        );
      })
    );

    root.replaceChildren(topBar, tabs, grid);
  }

  mount(root);
  playMusic('story', 0);
  render();
}
