/** Modo Dojo: Laboratorio Visual Interactivo de Aprendizaje Matemático */
import type { SaveData } from '../../core/types';
import { topicById, topics, worlds } from '../../core/data';
import { COLOMBIA_WORLDS } from '../../core/lore';
import { masteryOf } from '../../game/mastery';
import { h, pct, glyph } from '../../ui/dom';
import { sfx, playMusic } from '../../ui/audio';

export interface DojoOpts {
  save: SaveData;
  initialTopic?: string;
  onStartCombat(topicId: string): void;
  onBack(): void;
  mount(el: HTMLElement, cleanup?: () => void): void;
}

type LabKind = 'fractions' | 'linear' | 'quadratic' | 'pythagoras';

function labKindFor(topicId: string): LabKind {
  if (['reales', 'porcentajes', 'factorizacion'].includes(topicId)) return 'fractions';
  if (['cuadratica', 'ecuacionesCuadraticas', 'ondas'].includes(topicId)) return 'quadratic';
  if (['pitagoras', 'tales', 'medidas', 'plano', 'transformaciones', 'unidades'].includes(topicId)) return 'pythagoras';
  return 'linear';
}

const TOPIC_GUIDE: Record<LabKind, { title: string; formula: string; summary: string }> = {
  fractions: {
    title: 'Lingote de Sal y Oro (Fracciones y %)',
    formula: 'Fracción = Partes tomadas / Total de partes iguales',
    summary: 'Mueve los controles para rebanar el lingote de Zipaquirá y observar cómo cambian la fracción, el decimal y el porcentaje al mismo tiempo.'
  },
  linear: {
    title: 'Rampa de los Andes (Pendiente e Intercepto)',
    formula: 'y = m·x + b   |   m = Δy / Δx',
    summary: 'Ajusta la inclinación (m) y la altura inicial (b). Observa cómo si m > 0 el sendero sube, si m < 0 baja, y b siempre marca el cruce con el eje Y.'
  },
  quadratic: {
    title: 'Trayectoria Parabólica (Vértice y Curvatura)',
    formula: 'y = a·x² + b·x + c   |   x_v = −b / (2a)',
    summary: 'Cambia a, b y c para lanzar la flecha de Mara. Mira cómo el signo de «a» decide si la parábola abre hacia arriba o abajo y dónde queda el vértice.'
  },
  pythagoras: {
    title: 'Puente de Barichara (Teorema de Pitágoras)',
    formula: 'c² = a² + b²   ⇒   c = √(a² + b²)',
    summary: 'Modifica los catetos a y b para construir el triángulo rectángulo y ver la hipotenusa c y las áreas cuadradas en tiempo real.'
  }
};

export function showDojo(opts: DojoOpts): void {
  const { save, onStartCombat, onBack, mount } = opts;
  let activeTopic = opts.initialTopic ?? topics[0].id;

  const root = h('div', { class: 'screen wide dojo-screen' });

  function renderLab(container: HTMLElement, kind: LabKind): void {
    const cv = h('canvas', { width: 640, height: 360, class: 'dojo-cv' }) as HTMLCanvasElement;
    const ctx = cv.getContext('2d')!;
    ctx.scale(2, 2);
    const readout = h('div', { class: 'dojo-readout' });
    const sliders = h('div', { class: 'dojo-sliders' });

    const makeSlider = (label: string, min: number, max: number, step: number, val: number, onChange: (v: number) => void) => {
      const valEl = h('b', {}, String(val));
      const inp = h('input', {
        type: 'range', min, max, step, value: val,
        oninput: (e: Event) => { const v = +(e.target as HTMLInputElement).value; valEl.textContent = String(v); onChange(v); }
      });
      return h('label', { class: 'dojo-sl' }, h('span', {}, label, ' ', valEl), inp);
    };

    if (kind === 'fractions') {
      let num = 3, den = 4;
      const draw = () => {
        if (num > den) num = den;
        ctx.fillStyle = '#0f0c18'; ctx.fillRect(0, 0, 320, 180);
        // Título en canvas
        ctx.fillStyle = '#f5c542'; ctx.font = 'bold 12px monospace';
        ctx.fillText(`LINGOTE DE ORO: ${num}/${den}`, 20, 28);
        // Barra principal
        const bx = 24, by = 56, bw = 272, bh = 54;
        const segW = bw / den;
        for (let i = 0; i < den; i++) {
          ctx.fillStyle = i < num ? '#4ecb71' : '#261d3a';
          ctx.fillRect(bx + i * segW + 1, by, segW - 2, bh);
          if (i < num) {
            ctx.fillStyle = '#8bf5a8';
            ctx.fillRect(bx + i * segW + 2, by + 2, segW - 4, 6);
          }
          ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 2;
          ctx.strokeRect(bx + i * segW, by, segW, bh);
        }
        const dec = (num / den);
        const pc = Math.round(dec * 100);
        ctx.fillStyle = '#e8edf5'; ctx.font = 'bold 11px monospace';
        ctx.fillText(`Decimal: ${dec.toFixed(2)}   |   Porcentaje: ${pc}%`, 24, 142);
        readout.textContent = `${num}/${den} = ${dec.toFixed(2)} = ${pc} %`;
      };
      sliders.append(
        makeSlider('Numerador (partes tomadas):', 0, 12, 1, num, v => { num = v; draw(); }),
        makeSlider('Denominador (partes totales):', 1, 12, 1, den, v => { den = v; draw(); })
      );
      draw();
    } else if (kind === 'linear') {
      let m = 1, b = 1;
      const draw = () => {
        ctx.fillStyle = '#0f0c18'; ctx.fillRect(0, 0, 320, 180);
        const cx = 160, cy = 90, sc = 16;
        // Cuadrícula
        ctx.strokeStyle = '#231b36'; ctx.lineWidth = 1;
        for (let x = -10; x <= 10; x++) { ctx.beginPath(); ctx.moveTo(cx + x * sc, 0); ctx.lineTo(cx + x * sc, 180); ctx.stroke(); }
        for (let y = -6; y <= 6; y++) { ctx.beginPath(); ctx.moveTo(0, cy - y * sc); ctx.lineTo(320, cy - y * sc); ctx.stroke(); }
        // Ejes
        ctx.strokeStyle = '#6a5ea0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(320, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, 180); ctx.stroke();
        // Recta y = mx + b
        ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 10 * sc, cy - (m * -10 + b) * sc);
        ctx.lineTo(cx + 10 * sc, cy - (m * 10 + b) * sc);
        ctx.stroke();
        // Triángulo de pendiente Δx=1, Δy=m
        ctx.strokeStyle = '#4ecb71'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - b * sc);
        ctx.lineTo(cx + sc, cy - b * sc);
        ctx.lineTo(cx + sc, cy - (m + b) * sc);
        ctx.stroke();
        // Punto intercepto (0, b)
        ctx.fillStyle = '#ff7582';
        ctx.fillRect(cx - 4, cy - b * sc - 4, 8, 8);
        const signB = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
        readout.textContent = `y = ${m}x ${signB}   (Cruce eje Y en (0, ${b}))`;
      };
      sliders.append(
        makeSlider('Pendiente (m):', -3, 3, 0.5, m, v => { m = v; draw(); }),
        makeSlider('Intercepto (b):', -4, 4, 1, b, v => { b = v; draw(); })
      );
      draw();
    } else if (kind === 'quadratic') {
      let a = 0.5, b = 0, c = -2;
      const draw = () => {
        ctx.fillStyle = '#0f0c18'; ctx.fillRect(0, 0, 320, 180);
        const cx = 160, cy = 96, sc = 16;
        ctx.strokeStyle = '#231b36'; ctx.lineWidth = 1;
        for (let x = -10; x <= 10; x++) { ctx.beginPath(); ctx.moveTo(cx + x * sc, 0); ctx.lineTo(cx + x * sc, 180); ctx.stroke(); }
        for (let y = -6; y <= 6; y++) { ctx.beginPath(); ctx.moveTo(0, cy - y * sc); ctx.lineTo(320, cy - y * sc); ctx.stroke(); }
        ctx.strokeStyle = '#6a5ea0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(320, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, 180); ctx.stroke();
        // Curva
        ctx.strokeStyle = '#5ab9ea'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 0; px <= 320; px += 4) {
          const x = (px - cx) / sc;
          const y = a * x * x + b * x + c;
          const py = cy - y * sc;
          if (px === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        if (Math.abs(a) > 0.05) {
          const xv = -b / (2 * a);
          const yv = a * xv * xv + b * xv + c;
          ctx.fillStyle = '#f5c542';
          ctx.fillRect(cx + xv * sc - 4, cy - yv * sc - 4, 8, 8);
          readout.textContent = `y = ${a}x² + ${b}x + ${c}  ·  Vértice: (${xv.toFixed(1)}, ${yv.toFixed(1)})`;
        } else {
          readout.textContent = `Con a = 0 se vuelve una recta: y = ${b}x + ${c}`;
        }
      };
      sliders.append(
        makeSlider('Apertura (a):', -1.5, 1.5, 0.25, a, v => { a = v; draw(); }),
        makeSlider('Desplazamiento (b):', -3, 3, 0.5, b, v => { b = v; draw(); }),
        makeSlider('Altura (c):', -4, 4, 1, c, v => { c = v; draw(); })
      );
      draw();
    } else {
      let a = 3, b = 4;
      const draw = () => {
        ctx.fillStyle = '#0f0c18'; ctx.fillRect(0, 0, 320, 180);
        const ox = 95, oy = 148, sc = 16;
        const c = Math.hypot(a, b);
        // Triángulo rectángulo
        ctx.fillStyle = 'rgba(78, 203, 113, 0.22)';
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + b * sc, oy);
        ctx.lineTo(ox, oy - a * sc);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4ecb71'; ctx.lineWidth = 3; ctx.stroke();
        // Hipotenusa resaltada
        ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(ox, oy - a * sc); ctx.lineTo(ox + b * sc, oy); ctx.stroke();
        // Ángulo recto
        ctx.strokeStyle = '#ff7582'; ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy - 10, 10, 10);
        // Etiquetas
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace';
        ctx.fillText(`a = ${a}`, ox - 38, oy - (a * sc) / 2);
        ctx.fillText(`b = ${b}`, ox + (b * sc) / 2 - 14, oy + 16);
        ctx.fillStyle = '#f5c542';
        ctx.fillText(`c = ${c.toFixed(2)}`, ox + (b * sc) / 2 + 8, oy - (a * sc) / 2 - 6);
        readout.textContent = `${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}  ⇒  c = √${a * a + b * b} ≈ ${c.toFixed(2)}`;
      };
      sliders.append(
        makeSlider('Cateto vertical (a):', 1, 7, 1, a, v => { a = v; draw(); }),
        makeSlider('Cateto horizontal (b):', 1, 10, 1, b, v => { b = v; draw(); })
      );
      draw();
    }

    container.append(cv, readout, sliders);
  }

  function render(): void {
    const topDef = topicById[activeTopic] ?? topics[0];
    const kind = labKindFor(topDef.id);
    const guide = TOPIC_GUIDE[kind];
    const mast = masteryOf(save, topDef.id);

    const topBar = h('div', { class: 'ow-topbar' },
      h('button', { class: 'pbtn small ghost', onclick: () => { sfx('click'); onBack(); } }, '← Volver'),
      h('div', { class: 'ow-world-title' },
        h('span', { class: 'ow-badge' }, 'APRENDIZAJE VISUAL INTERACTIVO'),
        h('h2', { class: 'ow-title-text' }, 'Dojo de la Maestra Aritmia')
      ),
      h('button', { class: 'pbtn small', onclick: () => { sfx('ok'); onStartCombat(topDef.id); } }, '⚔ ¡Practicar en Arena!')
    );

    const labPanel = h('div', { class: 'dojo-lab-panel' });
    renderLab(labPanel, kind);

    const infoPanel = h('div', { class: 'dojo-info-panel' },
      h('span', { class: 'q-topic-badge' }, topDef.name),
      h('h3', {}, guide.title),
      h('div', { class: 'dojo-formula' }, guide.formula),
      h('p', {}, guide.summary),
      h('div', { class: 'ow-mastery-wrap' },
        h('div', { class: 'ow-mastery-label' }, h('span', {}, 'Tu dominio actual'), h('b', {}, pct(mast))),
        h('div', { class: 'bar' }, h('i', { style: { width: pct(mast) } }))
      ),
      h('button', { class: 'pbtn', onclick: () => { sfx('ok'); onStartCombat(topDef.id); } }, `⚔ Entrenar «${topDef.name}» en combate`)
    );

    const topicPicker = h('div', { class: 'dojo-topics' },
      worlds.filter(w => w.id !== 'vacio').map(w => {
        const ts = topics.filter(t => t.world === w.id);
        const wTheme = COLOMBIA_WORLDS[w.id];
        return h('section', { class: 'world', style: { '--c': wTheme?.palette.accent ?? '#f5c542' } as any },
          h('h3', {}, wTheme?.title ?? w.name),
          h('div', { class: 'zones' }, ts.map(t => h('button', {
            class: `zone${t.id === activeTopic ? ' sel-topic' : ''}`,
            onclick: () => { sfx('click'); activeTopic = t.id; render(); }
          },
            glyph(t.emblem ?? 'star', 3),
            h('b', {}, t.name),
            h('span', { class: 'muted' }, pct(masteryOf(save, t.id)) + ' dominio'),
            h('div', { class: 'bar mini' }, h('i', { style: { width: pct(masteryOf(save, t.id)) } }))
          )))
        );
      })
    );

    root.replaceChildren(
      topBar,
      h('div', { class: 'dojo-main-grid' }, labPanel, infoPanel),
      h('h3', { class: 'dojo-sub' }, 'Elige otro tema para explorar y entrenar:'),
      topicPicker
    );
  }

  mount(root);
  playMusic('dojo', 0);
  render();
}
