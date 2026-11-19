/** Pantalla «Acerca de / Guía del Jugador y Propósito Pedagógico» */
import type { SaveData } from '../../core/types';
import { heroes, topics } from '../../core/data';
import { COLOMBIA_WORLDS } from '../../core/lore';
import { h, heroSprite, spriteCanvas, glyph } from '../../ui/dom';
import { AUDIO_BUILD, playMusic, sfx } from '../../ui/audio';
import { isStandalonePWA } from '../../engine/pwa';

export interface AboutOpts {
  save: SaveData | null;
  onBack(): void;
  mount(el: HTMLElement, cleanup?: () => void): void;
}

export function showAbout(opts: AboutOpts): void {
  const { onBack, mount } = opts;

  const topBar = h('div', { class: 'ow-topbar' },
    h('button', { class: 'pbtn small ghost', onclick: () => { sfx('click'); onBack(); } }, '← Volver'),
    h('div', { class: 'ow-world-title' },
      h('span', { class: 'ow-badge' }, 'GUÍA Y PROPÓSITO'),
      h('h2', { class: 'ow-title-text' }, 'Acerca de Mazmorra Matemática')
    ),
    h('span', { class: 'eb-pill ok' }, isStandalonePWA() ? 'PWA NATIVA' : 'EDICIÓN 16-BIT')
  );

  // 1. El Mundo de Aritmia y Colombia
  const worldCard = h('section', { class: 'about-card tile-gold' },
    h('div', { class: 'about-head' }, glyph('star', 4, '#f5c542'), h('h3', {}, 'El Mundo de Aritmia e Identidad Colombiana')),
    h('p', {}, 'Mazmorra Matemática es un RPG de acción y cálculo en pixel art de 16 bits. Cuando El Divisor cometió el acto prohibido de dividir entre cero, la Ecuación Maestra se fragmentó sobre cuatro regiones inspiradas en Colombia:'),
    h('div', { class: 'about-regions' },
      Object.values(COLOMBIA_WORLDS).map(w => h('div', { class: 'about-region', style: { '--wc': w.palette.accent } as any },
        h('b', {}, w.title),
        h('small', {}, w.region),
        h('span', { class: 'muted' }, `Guardián: ${w.guardian}`)
      ))
    ),
    h('div', { class: 'about-heroes' },
      heroes.map(hr => h('div', { class: 'about-hero-pill' },
        spriteCanvas(heroSprite(hr), 2, 'idle'),
        h('div', {}, h('b', {}, hr.name), h('small', { class: 'muted' }, hr.passive.text))
      ))
    )
  );

  // 2. Guía Visual de Combate
  const combatCard = h('section', { class: 'about-card tile-sky' },
    h('div', { class: 'about-head' }, glyph('sword', 4, '#5ab9ea'), h('h3', {}, 'Cómo Jugar: Sinergia Acción + Cálculo')),
    h('ul', { class: 'about-list' },
      h('li', {}, h('b', { style: { color: '#4ecb71' } }, '🎯 Orbes y Barra [1–4]: '), 'Durante la batalla aparecen 4 orbes flotantes. Puedes saltar y golpear el orbe correcto en la arena, presionar las teclas 1–4 o tocar el botón de respuesta para dar un golpe crítico.'),
      h('li', {}, h('b', { style: { color: '#f5c542' } }, '⚡ Energía PA y Cartas Técnicas: '), 'Cada respuesta correcta carga +1 ⚡PA. Al reunir suficiente energía, las cartas de tu cinto brillan en dorado para desatar ataques especiales, escudos o curación al instante.'),
      h('li', {}, h('b', { style: { color: '#ff7582' } }, '⚠ Esquiva y Parada: '), 'Cuando el suelo parpadea en rojo, el monstruo telegrafía un ataque. ¡Salta, usa Dash (K / Shift / ») o corta proyectiles en el aire con tu espada!'),
      h('li', {}, h('b', { style: { color: '#5ab9ea' } }, '💡 El Susurro de la Maestra (H): '), 'La pista elimina un orbe falso y te da un consejo matemático conceptual para resolver el ejercicio en caliente.')
    )
  );

  // 3. Propósito Pedagógico
  const pedCard = h('section', { class: 'about-card tile-emerald' },
    h('div', { class: 'about-head' }, glyph('book', 4, '#4ecb71'), h('h3', {}, 'Método y Propósito Pedagógico')),
    h('p', {}, `Diseñado para fortalecer los ${topics.length} temas fundamentales del pensamiento matemático universitario y preuniversitario mediante aprendizaje activo:` ),
    h('ul', { class: 'about-list' },
      h('li', {}, h('b', {}, '📖 Dojo Visual Interactivo: '), 'Antes de entrar a un nivel, explora fracciones, pendientes, parábolas y Pitágoras moviendo controles visuales en tiempo real.'),
      h('li', {}, h('b', {}, '🧠 Libro de Errores Clínico: '), 'Detecta el tipo exacto de tropiezo (signo invertido, suma directa de denominadores, pendiente al revés) y ofrece revancha inmediata para superarlo.'),
      h('li', {}, h('b', {}, '📈 Dificultad Adaptable: '), 'Las preguntas escalan según tu precisión y nivel de dificultad elegido (Aprendiz, Aventurero o Maestro).')
    )
  );

  // 4. Ficha Técnica
  const techCard = h('section', { class: 'about-card tile-violet' },
    h('div', { class: 'about-head' }, glyph('grid', 4, '#c8a3ff'), h('h3', {}, 'Ficha Técnica y Arquitectura')),
    h('div', { class: 'about-tech-grid' },
      h('div', { class: 'about-tech-item' }, h('b', {}, 'Motor Gráfico'), h('span', { class: 'muted' }, 'Canvas 2D Pixel Art 16-bit + Gráficas HD 2×')),
      h('div', { class: 'about-tech-item' }, h('b', {}, 'Audio Dinámico'), h('span', { class: 'muted' }, `Web Audio API Sintetizado (${AUDIO_BUILD})`)),
      h('div', { class: 'about-tech-item' }, h('b', {}, 'Persistencia Local'), h('span', { class: 'muted' }, 'IndexedDB Persistente + LocalStorage + JSON')),
      h('div', { class: 'about-tech-item' }, h('b', {}, 'Disponibilidad'), h('span', { class: 'muted' }, 'PWA Offline-First instalable en PC y móvil'))
    )
  );

  const root = h('div', { class: 'screen wide about-screen' },
    topBar,
    h('div', { class: 'about-grid' }, worldCard, combatCard, pedCard, techCard)
  );

  mount(root);
  playMusic('story', 0);
}
