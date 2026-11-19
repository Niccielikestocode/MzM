/** Verdadero Libro de Errores Pedagógico: análisis conceptual, paso a paso y revancha instantánea */
import type { Question, SaveData } from '../../core/types';
import { topicById } from '../../core/data';
import { diagnoseMistake } from '../../domain/pedagogy/diagnosis';
import { pickQuestion } from '../../game/picker';
import { mulberry32, newSeed } from '../../core/rng';
import { h } from '../../ui/dom';
import { sfx, playMusic } from '../../ui/audio';
import { renderMathText } from '../../ui/mathfmt';
import { drawGraph, drawNumberLine } from '../../gfx/plot';

export interface ErrorBookOpts {
  save: SaveData;
  persist(): void;
  onBack(): void;
  onPracticeTopic(topicId: string): void;
  mount(el: HTMLElement, cleanup?: () => void): void;
}

export function showErrorBook(opts: ErrorBookOpts): void {
  const { save, persist, onBack, onPracticeTopic, mount } = opts;
  let tab: 'open' | 'resolved' = 'open';
  let rematch: { entryIdx: number; q: Question; answered: boolean } | null = null;

  const root = h('div', { class: 'screen wide eb-screen' });

  function startRematch(entryIdx: number): void {
    const entry = save.errorBook[entryIdx];
    if (!entry) return;
    const rng = mulberry32(newSeed());
    const q = pickQuestion({ topics: [entry.topic], difficulty: 2, rng, save });
    rematch = { entryIdx, q, answered: false };
    sfx('card');
    render();
  }

  function render(): void {
    const openEntries = save.errorBook.map((e, i) => ({ e, i })).filter(x => !x.e.resolved).reverse();
    const doneEntries = save.errorBook.map((e, i) => ({ e, i })).filter(x => x.e.resolved).reverse();
    const list = tab === 'open' ? openEntries : doneEntries;

    // Tema más débil
    const counts: Record<string, number> = {};
    openEntries.forEach(x => { counts[x.e.topic] = (counts[x.e.topic] ?? 0) + 1; });
    const worstTopic = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const header = h('div', { class: 'ow-topbar' },
      h('button', { class: 'pbtn small ghost', onclick: () => { sfx('click'); onBack(); } }, '← Volver'),
      h('div', { class: 'ow-world-title' },
        h('span', { class: 'ow-badge' }, 'DIAGNÓSTICO PEDAGÓGICO'),
        h('h2', { class: 'ow-title-text' }, 'Libro de Errores de la Maestra')
      ),
      h('div', { class: 'eb-stats-mini' },
        h('span', { class: 'eb-pill bad' }, `${openEntries.length} por repasar`),
        h('span', { class: 'eb-pill ok' }, `${doneEntries.length} superados`)
      )
    );

    const controls = h('div', { class: 'eb-bar' },
      h('div', { class: 'tabs' },
        h('button', { class: `pbtn small ${tab === 'open' ? '' : 'ghost'}`, onclick: () => { sfx('click'); tab = 'open'; rematch = null; render(); } }, `Por repasar (${openEntries.length})`),
        h('button', { class: `pbtn small ${tab === 'resolved' ? '' : 'ghost'}`, onclick: () => { sfx('click'); tab = 'resolved'; rematch = null; render(); } }, `Superados ✓ (${doneEntries.length})`)
      ),
      worstTopic ? h('button', {
        class: 'pbtn small',
        onclick: () => { sfx('ok'); onPracticeTopic(worstTopic); }
      }, `⚔ Entrenar «${topicById[worstTopic]?.name ?? worstTopic}»`) : null
    );

    // Modal inline de Revancha Instantánea
    let rematchEl: HTMLElement | null = null;
    if (rematch) {
      const { q, entryIdx } = rematch;
      const qTxt = h('p', { class: 'q-text' });
      renderMathText(qTxt, q.text);
      const media = h('div', { class: 'q-media' });
      if (q.graph) { const cv = h('canvas', { class: 'q-cv' }); drawGraph(cv, q.graph); media.append(cv); }
      if (q.numberLine) { const cv = h('canvas', { class: 'q-cv nl' }); drawNumberLine(cv, q.numberLine); media.append(cv); }

      const fb = h('div', { class: 'q-fb' });
      const optsGrid = h('div', { class: 'q-quick-answers' });
      const cols = ['#e84a5f', '#5ab9ea', '#4ecb71', '#f5c542'];

      q.options.slice(0, 4).forEach((optText, idx) => {
        const txtSpan = h('span', { class: 'q-ans-txt' });
        renderMathText(txtSpan, optText);
        const btn = h('button', {
          class: 'q-ans-chip',
          style: { '--ac': cols[idx % 4] } as any,
          onclick: () => {
            if (!rematch || rematch.answered) return;
            rematch.answered = true;
            const ok = idx === q.correct;
            optsGrid.querySelectorAll('button').forEach(b => ((b as HTMLButtonElement).disabled = true));
            if (ok) {
              sfx('win');
              save.errorBook[entryIdx].resolved = true;
              save.stats.reviewed = (save.stats.reviewed ?? 0) + 1;
              persist();
              fb.className = 'q-fb ok';
              fb.replaceChildren(h('b', {}, '★ ¡REVANCHA GANADA! '), 'Sellaste este error como superado. ', q.explain);
              setTimeout(() => { rematch = null; render(); }, 1800);
            } else {
              sfx('bad');
              fb.className = 'q-fb no';
              fb.replaceChildren(h('b', {}, '✗ Casi, revisemos: '), `La respuesta correcta es ${q.options[q.correct]}. `, q.explain);
            }
          }
        }, h('span', { class: 'q-ans-num' }, String(idx + 1)), txtSpan);
        optsGrid.append(btn);
      });

      rematchEl = h('div', { class: 'eb-rematch-box' },
        h('div', { class: 'eb-rematch-head' },
          h('b', {}, '⚔ REVANCHA INSTANTÁNEA · Demuestra que dominaste el concepto'),
          h('button', { class: 'pbtn small ghost', onclick: () => { rematch = null; render(); } }, 'Cerrar')
        ),
        qTxt,
        media,
        optsGrid,
        fb
      );
    }

    // Lista de fichas clínicas
    const cardsEl = list.length
      ? h('div', { class: 'eb-grid' }, list.slice(0, 30).map(({ e, i }) => {
          const diag = diagnoseMistake(e);
          const qEl = h('p', { class: 'eb-q' });
          renderMathText(qEl, e.text);
          const givenEl = h('b', {}); renderMathText(givenEl, e.given);
          const ansEl = h('b', {}); renderMathText(ansEl, e.answer);

          return h('article', { class: `eb-card${e.resolved ? ' resolved' : ''}` },
            h('div', { class: 'eb-card-head' },
              h('span', { class: 'q-topic-badge' }, topicById[e.topic]?.name ?? e.topic),
              h('span', { class: `eb-diag-tag ${e.resolved ? 'ok' : 'warn'}` }, e.resolved ? '✓ SUPERADO' : `⚠ ${diag.title}`)
            ),
            qEl,
            h('div', { class: 'eb-compare' },
              h('div', { class: 'eb-ans bad' }, h('small', {}, 'Tu respuesta'), givenEl),
              h('div', { class: 'eb-ans ok' }, h('small', {}, 'Correcta'), ansEl)
            ),
            h('div', { class: 'eb-diagnosis' },
              h('b', {}, '¿Por qué ocurrió?'),
              h('p', {}, diag.why)
            ),
            h('div', { class: 'eb-steps' },
              h('b', {}, 'Cómo resolverlo paso a paso:'),
              h('ol', {}, diag.steps.map(st => h('li', {}, st)))
            ),
            h('p', { class: 'eb-tip' }, `💡 Consejo: ${diag.tip}`),
            !e.resolved ? h('div', { class: 'eb-actions' },
              h('button', { class: 'pbtn small', onclick: () => startRematch(i) }, '⚔ ¡Revancha ahora!')
            ) : null
          );
        }))
      : h('div', { class: 'eb-empty' },
          h('h3', {}, tab === 'open' ? '¡Tu cuaderno está limpio!' : 'Aún no has sellado revanchas'),
          h('p', { class: 'muted' }, tab === 'open'
            ? 'Cada vez que falles una pregunta en combate, aparecerá aquí con su diagnóstico conceptual y un botón de revancha instantánea.'
            : 'Completa una revancha desde la pestaña "Por repasar" para ganar el sello de concepto superado.')
        );

    root.replaceChildren(...([header, controls, rematchEl, cardsEl].filter(Boolean) as Node[]));
  }

  mount(root);
  playMusic('dojo', 0);
  render();
}
