import { Gen, fmt, frac, gcd, pack, packN, sup, poly, pt } from './helpers';
import { randInt as ri, pick } from '../core/rng';
import type { Graph } from '../core/types';

const M = '−';
const eq = (m: number, b: number) => `y = ${poly([m, 'x'], [b, ''])}`;

export const ecuaciones: Record<string, Gen> = {
  'lineal.una-incognita': r => {
    const x = ri(r, -6, 9), a = ri(r, 2, 7), b = ri(r, -9, 12), c = a * x + b;
    return packN(r, x, [(c + b) / a, c - b, (c - b) / a + 1, -x], '', `${poly([a, 'x'], [b, ''])} = ${fmt(c)} → ${a}x = ${fmt(c - b)} → x = ${fmt(x)}.`,
      { text: `Resuelve ${poly([a, 'x'], [b, ''])} = ${fmt(c)}.` });
  },
  'lineal.fracciones': r => {
    const a = ri(r, 2, 6), b = ri(r, 1, 9), x = a * ri(r, 1, 7), c = x / a + b;
    return packN(r, x, [c - b, a * (c + b), c * a + b, (c - b) / a], '', `x/${a} = ${fmt(c)} ${M} ${b} = ${fmt(c - b)} → x = ${a}·${fmt(c - b)} = ${fmt(x)}.`,
      { text: `Resuelve x/${a} + ${b} = ${fmt(c)}.` });
  },
  'despejar-formula': r => {
    const F = [
      { t: 'Despeja b en A = (b·h)/2', ok: 'b = 2A/h', w: ['b = A/(2h)', 'b = 2Ah', 'b = (A − h)/2'], e: 'Multiplica por 2 y divide entre h.' },
      { t: 'Despeja t en v = u + a·t', ok: 't = (v − u)/a', w: ['t = (v + u)/a', 't = v − u − a', 't = a(v − u)'], e: 'Resta u a ambos lados y divide entre a.' },
      { t: 'Despeja l en P = 2(l + w)', ok: 'l = P/2 − w', w: ['l = P/2 + w', 'l = 2P − w', 'l = P − 2w'].concat(['l = (P − w)/2']), e: 'Divide entre 2 y resta w.' },
      { t: 'Despeja h en V = (π r² h)/3', ok: 'h = 3V/(π r²)', w: ['h = V/(3π r²)', 'h = 3V π r²', 'h = 3V/(π r)'], e: 'Multiplica por 3 y divide entre π r².' },
      { t: 'Despeja F en C = (5/9)(F − 32)', ok: 'F = 9C/5 + 32', w: ['F = 9C/5 − 32', 'F = 5C/9 + 32', 'F = 9(C + 32)/5 − 32'], e: 'Multiplica por 9/5 y suma 32.' }
    ];
    const f = pick(r, F);
    return pack(r, f.ok, f.w, f.e, { text: f.t + '.' });
  },
  'problema-enunciado': r => {
    if (r() < 0.5) {
      const L = ri(r, 5, 20), k = pick(r, [2, 3]), T = L * (k + 1);
      return packN(r, L, [T / k, T - L, T / 2, L * k], '', `Si Luis tiene x, Ana tiene ${k}x y juntos ${T}: ${k + 1}x = ${T}, x = ${L}.`,
        { text: `Ana tiene ${k === 2 ? 'el doble' : 'el triple'} de la edad de Luis. Juntos suman ${T} años. ¿Cuántos años tiene Luis?` });
    }
    const b = ri(r, 3, 9), c = ri(r, 2, 6), km = ri(r, 4, 15), T = b + c * km;
    return packN(r, km, [(T + b) / c, T - b, T / c, km + 1], ' km', `${b} + ${c}x = ${T} → x = ${fmt(km)} km.`,
      { text: `Un taxi cobra $${b} de salida y $${c} por kilómetro. Un viaje costó $${T}. ¿Cuántos kilómetros recorrió?` });
  }
};

function lineGraph(fns: { m: number; b: number }[], pts?: Graph['pts']): Graph {
  return { fns: fns.map(f => ({ t: 'lin' as const, ...f })), pts, xr: [-6, 6], yr: [-6, 6] };
}
export const funciones: Record<string, Gen> = {
  'evaluar': r => {
    const a = pick(r, [1, 2, 3, -1, -2]), b = ri(r, -5, 5), c = ri(r, -6, 6), x0 = ri(r, -3, 3) || 2;
    const v = a * x0 * x0 + b * x0 + c, wrongSq = -a * x0 * x0 + b * x0 + c;
    return packN(r, v, [wrongSq, a * x0 + b * x0 + c, a * x0 * x0 + b * x0 - c, v + 2 * a], '', `f(${fmt(x0)}) = ${fmt(a * x0 * x0)} ${b * x0 < 0 ? M : '+'} ${fmt(Math.abs(b * x0))} ${c < 0 ? M : '+'} ${fmt(Math.abs(c))} = ${fmt(v)}. Cuidado: (${fmt(x0)})² siempre es positivo.`,
      { text: `Si f(x) = ${poly([a, 'x²'], [b, 'x'], [c, ''])}, ¿cuánto vale f(${fmt(x0)})?` });
  },
  'leer-grafica': r => {
    const m = ri(r, -2, 2) || 1, b = ri(r, -2, 2), x0 = ri(r, -2, 3), v = m * x0 + b;
    return packN(r, v, [m * -x0 + b, x0, b, v + 1, v - 1], '', `Se ubica x = ${x0} en el eje horizontal y se sube o baja hasta la recta: y = ${fmt(v)}.`,
      { text: `Según la gráfica, ¿cuánto vale f(${fmt(x0)})?`, graph: lineGraph([{ m, b }]) });
  },
  'dominio-rango': r => {
    const a = ri(r, 1, 6);
    if (r() < 0.5) return pack(r, `x ≥ ${a}`, [`x > ${a}`, `x ≤ ${a}`, 'Todos los reales', `x ≥ ${fmt(-a)}`], `La raíz exige que x ${M} ${a} no sea negativo: x ≥ ${a}.`, { text: `¿Cuál es el dominio de f(x) = √(x ${M} ${a})?` });
    return pack(r, `x ≠ ${a}`, [`x ≠ ${fmt(-a)}`, `x > ${a}`, 'Todos los reales', `x ≠ 0`], `El denominador no puede ser cero: x ${M} ${a} ≠ 0, o sea x ≠ ${a}.`, { text: `¿Cuál es el dominio de f(x) = 1/(x ${M} ${a})?` });
  },
  'relacion-tabla-grafica': r => {
    const m = pick(r, [2, 3, -2, 4]), b = ri(r, -3, 4), xs = [0, 1, 2, 3];
    const tabla = xs.map(x => `x = ${x}  →  y = ${fmt(m * x + b)}`).join('\n');
    const ok = eq(m, b);
    return pack(r, ok, [eq(m, -b), eq(b || 5, m), eq(-m, b), `y = ${m === 1 ? '' : m}x²`], `El cambio constante de ${fmt(m)} por cada paso es la pendiente, y cuando x = 0 vale ${fmt(b)}: ${ok}.`,
      { text: `¿Qué ecuación cumple esta tabla?\n${tabla}` });
  }
};

export const lineal: Record<string, Gen> = {
  'pendiente-dos-puntos': (r, d) => {
    const pr = pick(r, [[2, 1], [3, 1], [1, 2], [3, 2], [2, 3], [4, 3], [1, 3], [4, 2]]), rise = pr[0], run = pr[1];
    const ax = ri(r, 1, 3), ay = ri(r, 1, 1 + (d > 2 ? 0 : 1));
    const cand = [[rise, run], [run, rise], [-rise, run], [rise + 1, run]] as const, seen = new Set<string>(), vals: { t: string; v: number; ok: boolean }[] = [];
    cand.forEach((c, i) => { const t = 'm = ' + frac(c[0], c[1]); if (!seen.has(t)) { seen.add(t); vals.push({ t, v: c[0] / c[1], ok: i === 0 }); } });
    const base = pack(r, vals[0].t, vals.slice(1).map(v => v.t), `Pendiente = subida ÷ avance = ${rise} ÷ ${run} = ${frac(rise, run)}.`, { text: '' }, () => ['m = 0', 'm = ' + frac(rise * 2, run), 'm = ' + frac(rise, run + 1)]);
    const optVals = base.options.map(o => { const f = vals.find(v => v.t === o); return f ? f.v : NaN; });
    return { ...base, text: `La rampa pasa por A (${ax}, ${ay}) y B (${ax + run}, ${ay + rise}). ¿Cuál es su pendiente?`, stage: { id: 'slope', meta: { ax, ay, rise, run, optVals } } };
  },
  'interceptos': r => {
    const m = pick(r, [1, 2, 3, -1, -2]), x0 = ri(r, 1, 5) * (r() < 0.5 ? -1 : 1), b = -m * x0;
    const o = (x: number, y: number) => `corta en ${pt(x, 0)} y ${pt(0, y)}`;
    return pack(r, o(x0, b), [o(b, x0), o(-x0, b), o(x0, -b)], `Si y = 0: x = ${fmt(x0)}. Si x = 0: y = ${fmt(b)}.`, { text: `¿Dónde corta a los ejes la recta ${eq(m, b)}?` });
  },
  'ecuacion-recta': r => {
    const m = pick(r, [2, 3, -1, -2, 1, 4]), x0 = ri(r, -3, 4), y0 = ri(r, -4, 6), b = y0 - m * x0;
    return pack(r, eq(m, b), [eq(m, y0 + m * x0), eq(m, y0), eq(m, -b), eq(b || 3, m)], `y ${M} ${fmt(y0)} = ${fmt(m)}(x ${M} ${fmt(x0)}) → b = ${fmt(y0)} ${M} (${fmt(m)})·(${fmt(x0)}) = ${fmt(b)}.`,
      { text: `¿Cuál es la ecuación de la recta de pendiente ${fmt(m)} que pasa por ${pt(x0, y0)}?` });
  },
  'grafica-desde-ecuacion': r => {
    const m = pick(r, [1, 2, -1, -2]), b = ri(r, -3, 3);
    return pack(r, eq(m, b), [eq(m, -b), eq(-m, b), eq(m, b + 1)], `Corta al eje y en ${fmt(b)} y ${m > 0 ? 'sube' : 'baja'} ${Math.abs(m)} por cada paso a la derecha.`,
      { text: `¿Qué ecuación tiene la recta dibujada?`, graph: lineGraph([{ m, b }], [{ x: 0, y: b }]) });
  }
};

export const sistemas: Record<string, Gen> = {
  'interseccion-grafica': r => {
    let m1 = ri(r, -2, 2), m2 = ri(r, -2, 2);
    while (m1 === m2) m2 = ri(r, -2, 2);
    const px = ri(r, -3, 3), py = ri(r, -3, 3), b1 = py - m1 * px, b2 = py - m2 * px;
    return pack(r, pt(px, py), [pt(py, px), pt(-px, py), pt(px, -py), pt(px + 1, py)], `Las rectas se cruzan donde las dos dan el mismo y: ${pt(px, py)}.`,
      { text: `¿En qué punto se cortan las dos rectas?`, graph: lineGraph([{ m: m1, b: b1 }, { m: m2, b: b2 }]) });
  },
  'sustitucion': r => {
    const x = ri(r, 1, 6), y = ri(r, 1, 8), a = ri(r, 1, 3), b = y - a * x, s = x + y;
    return pack(r, pt(x, y), [pt(y, x), pt(x + 1, y - 1), pt(x, s - x + 1), pt(s - y + 1, y)], `Sustituye y: x + (${poly([a, 'x'], [b, ''])}) = ${s} → x = ${x}, y = ${y}.`,
      { text: `Resuelve el sistema:\n${eq(a, b)}\nx + y = ${s}` });
  },
  'eliminacion': r => {
    const x = ri(r, -4, 6), y = ri(r, -4, 6);
    let a1 = ri(r, 1, 4), b1 = ri(r, 1, 4), a2 = ri(r, 1, 4), b2 = -ri(r, 1, 4);
    while (a1 * b2 - a2 * b1 === 0) a2 = ri(r, 1, 4);
    const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
    return pack(r, pt(x, y), [pt(y, x), pt(x + 1, y), pt(x, y + 1), pt(-x, -y)], `Se multiplica para igualar coeficientes y se restan las ecuaciones; sale x = ${fmt(x)}, y = ${fmt(y)}.`,
      { text: `Resuelve el sistema:\n${poly([a1, 'x'], [b1, 'y'])} = ${fmt(c1)}\n${poly([a2, 'x'], [b2, 'y'])} = ${fmt(c2)}` });
  },
  'problema-enunciado': r => {
    const ad = ri(r, 3, 9), ni = ri(r, 2, 8), pa = ri(r, 8, 15), pn = ri(r, 3, pa - 2), T = pa * ad + pn * ni, N = ad + ni;
    const o = (a: number, n: number) => `${a} adultos y ${n} niños`;
    return pack(r, o(ad, ni), [o(ni, ad), o(ad + 1, ni - 1), o(ad - 1, ni + 1), o(N - 1, 1)], `a + n = ${N} y ${pa}a + ${pn}n = ${T}. Resolviendo: a = ${ad}, n = ${ni}.`,
      { text: `Se vendieron ${N} entradas por $${T}. Cada entrada de adulto cuesta $${pa} y cada una de niño $${pn}. ¿Cuántas se vendieron de cada tipo?` });
  }
};

export const cuadratica: Record<string, Gen> = {
  'vertice': (r, d) => {
    const p = ri(r, -5, 5) || 3, q = ri(r, -6, 6);
    const text = d <= 1 ? `¿Cuál es el vértice de y = (x ${p < 0 ? '+' : M} ${Math.abs(p)})² ${q < 0 ? M : '+'} ${Math.abs(q)}?` : `¿Cuál es el vértice de y = ${poly([1, 'x²'], [-2 * p, 'x'], [p * p + q, ''])}?`;
    return pack(r, pt(p, q), [pt(-p, q), pt(p, -q), pt(q, p), pt(-p, -q)], d <= 1 ? `En y = (x ${M} h)² + k el vértice es (h, k).` : `x = ${fmt(2 * p)}/2 = ${fmt(p)}; y = ${fmt(q)}.`, { text });
  },
  'apertura-interceptos': r => {
    const a = pick(r, [1, -1]), r1 = ri(r, -4, 2), r2 = r1 + ri(r, 2, 5);
    const o = (up: boolean, x1: number, x2: number) => `Abre hacia ${up ? 'arriba' : 'abajo'}; corta en x = ${fmt(x1)} y x = ${fmt(x2)}`;
    return pack(r, o(a > 0, r1, r2), [o(a < 0, r1, r2), o(a > 0, -r1, -r2), o(a < 0, -r1, -r2)], `El coeficiente ${a > 0 ? 'positivo' : 'negativo'} abre hacia ${a > 0 ? 'arriba' : 'abajo'}; los factores dan x = ${fmt(r1)} y x = ${fmt(r2)}.`,
      { text: `¿Cómo es la parábola y = ${a < 0 ? M : ''}(x ${r1 > 0 ? M : '+'} ${Math.abs(r1) || ''})(x ${r2 > 0 ? M : '+'} ${Math.abs(r2)})?`.replace('( ', '(').replace(/\(x \+ \)/, '(x)').replace(/\(x [−+]  ?\)/, '(x)') });
  },
  'proyectil-altura-maxima': r => {
    const h = ri(r, 3, 5), k = h * h, vals = [k, h, 2 * h, k + h];
    const base = packN(r, k, [h, 2 * h, k + h], ' m', `El vértice está en x = ${h}: y = ${M}${h}² + ${2 * h}·${h} = ${k}. La altura máxima es ${k} m.`, { text: '' });
    const optVals = base.options.map(o => vals.find(v => fmt(v) + ' m' === o) as number);
    return { ...base, text: `Un proyectil sigue la trayectoria y = ${M}x² + ${2 * h}x. ¿Cuál es su altura máxima?`, stage: { id: 'projectile', meta: { h, optVals } } };
  },
  'grafica-desde-ecuacion': r => {
    const a = pick(r, [1, -1]), p = ri(r, -3, 3), q = ri(r, -3, 3), b = -2 * a * p, c = a * p * p + q;
    const f = (a2: number, b2: number, c2: number) => `y = ${poly([a2, 'x²'], [b2, 'x'], [c2, ''])}`;
    return pack(r, f(a, b, c), [f(-a, b, c), f(a, -b, c), f(a, b, -c), f(a, b, q)], `Vértice (${fmt(p)}, ${fmt(q)}) y ${a > 0 ? 'abre hacia arriba' : 'abre hacia abajo'}: y = ${a < 0 ? M : ''}(x ${p > 0 ? M : '+'} ${Math.abs(p)})² ${q < 0 ? M : '+'} ${Math.abs(q)}.`.replace('(x + 0)', 'x'),
      { text: `¿Qué ecuación corresponde a la parábola dibujada?`, graph: { fns: [{ t: 'quad', a, b, c }], pts: [{ x: p, y: q, label: 'V' }], xr: [-6, 6], yr: [-8, 8] } });
  }
};

export const ecuacionesCuadraticas: Record<string, Gen> = {
  'factorizar': r => {
    let x1 = ri(r, -5, 5), x2 = ri(r, -5, 5);
    while (x1 === x2 || x1 === 0 || x2 === 0) { x1 = ri(r, -5, 5); x2 = ri(r, -5, 5); }
    const o = (a: number, b: number) => { const s = [a, b].sort((u, v) => u - v); return `x = ${fmt(s[0])} y x = ${fmt(s[1])}`; };
    return pack(r, o(x1, x2), [o(-x1, -x2), o(x1, -x2), o(-x1, x2), o(x1 + x2, 1)], `Se factoriza como (x ${x1 > 0 ? M : '+'} ${Math.abs(x1)})(x ${x2 > 0 ? M : '+'} ${Math.abs(x2)}) = 0: x = ${fmt(x1)} y x = ${fmt(x2)}.`,
      { text: `Resuelve ${poly([1, 'x²'], [-(x1 + x2), 'x'], [x1 * x2, ''])} = 0.` });
  },
  'formula-general': r => {
    let x1 = ri(r, -4, 4), x2 = ri(r, -4, 4);
    while (x1 === x2) x2 = ri(r, -4, 4);
    const a = 2, b = -a * (x1 + x2), c = a * x1 * x2;
    const o = (u: number, v: number) => { const s = [u, v].sort((p, q) => p - q); return `x = ${fmt(s[0])} y x = ${fmt(s[1])}`; };
    return pack(r, o(x1, x2), [o(-x1, -x2), o(x1 + 1, x2), o(x1, -x2), o(x1 * 2, x2 * 2)], `Δ = ${fmt(b * b - 4 * a * c)}; x = (${fmt(-b)} ± √Δ)/${2 * a} → x = ${fmt(x1)} y x = ${fmt(x2)}.`,
      { text: `Usa la fórmula general en ${poly([a, 'x²'], [b, 'x'], [c, ''])} = 0.` });
  },
  'discriminante': r => {
    const a = ri(r, 1, 3), b = ri(r, -6, 6), c = ri(r, -5, 5), D = b * b - 4 * a * c;
    const v = (x: number) => (x > 0 ? 'dos soluciones reales distintas' : x === 0 ? 'una solución real doble' : 'ninguna solución real');
    const ok = `Δ = ${fmt(D)}: ${v(D)}`, D2 = b * b + 4 * a * c;
    return pack(r, ok, [`Δ = ${fmt(D)}: ${v(D > 0 ? -1 : 1)}`, `Δ = ${fmt(D2)}: ${v(D2)}`, `Δ = ${fmt(D + 2)}: ${v(D + 2)}`, `Δ = ${fmt(-D)}: ${v(-D)}`],
      `Δ = b² ${M} 4ac = ${fmt(b * b)} ${M} ${fmt(4 * a * c)} = ${fmt(D)}.`, { text: `Calcula el discriminante de ${poly([a, 'x²'], [b, 'x'], [c, ''])} = 0 e indica cuántas soluciones reales tiene.` });
  },
  'completar-cuadrado': r => {
    const h = ri(r, 1, 5), c = ri(r, -6, 8), b = 2 * h, rhs = h * h - c, sg = (n: number) => (n < 0 ? M : '+');
    const f = (hh: number, rr: number) => `(x ${sg(hh)} ${Math.abs(hh)})² = ${fmt(rr)}`;
    return pack(r, f(h, rhs), [f(b, rhs), f(-h, rhs), f(h, c + h * h), f(h, rhs + h)], `Se suma ${h * h} a ambos lados: (x + ${h})² = ${fmt(rhs)}.`,
      { text: `Completa el cuadrado en x² + ${b}x + ${fmt(c)} = 0 y escribe (x + h)² = k.`.replace('+ -', `${M} `) });
  }
};

const piStr = (k: number) => (k === 1 ? '2π' : k === 2 ? 'π' : k === 3 ? '2π/3' : 'π/2');
export const ondas: Record<string, Gen> = {
  'amplitud-periodo': r => {
    const A = ri(r, 2, 5), k = ri(r, 1, 4);
    const o = (a: number, t: string) => `A = ${a}, T = ${t}`;
    return pack(r, o(A, piStr(k)), [o(A, k === 1 ? 'π' : '2π'), o(k, piStr(k)), o(A, `${k}`), o(A * 2, piStr(k)), o(A, `π/${k}`)], `En y = A·sen(kx), A es la amplitud y T = 2π/k = ${piStr(k)}.`,
      { text: `¿Cuál es la amplitud y el período de y = ${A} sen(${k === 1 ? '' : k}x)?` });
  },
  'leer-grafica-seno': r => {
    const A = ri(r, 1, 3), T = pick(r, [4, 6, 8]), o = (a: number, t: number) => `A = ${a}, T = ${t}`;
    return pack(r, o(A, T), [o(A, T / 2), o(A * 2, T), o(T, A), o(A, T * 2)], `La cresta llega a y = ${A} y la onda se repite cada ${T} unidades.`,
      { text: `¿Cuál es la amplitud y el período de la onda?`, graph: { fns: [{ t: 'sin', A, T }], xr: [0, 12], yr: [-4, 4] } });
  },
  'desplazamiento': r => {
    const c = pick(r, ['π/2', 'π/3', 'π/4', 'π/6']), k = ri(r, 0, 2);
    const forms = [`y = sen(x ${M} ${c})`, `y = sen(x + ${c})`, `y = sen(x) + 2`];
    const answers = [`${c} a la derecha`, `${c} a la izquierda`, `2 unidades hacia arriba`];
    return pack(r, answers[k], answers.concat([`${c} hacia abajo`, '2 unidades hacia abajo']).filter((_, i) => i !== k), k === 2 ? 'Sumar fuera de la función sube la gráfica.' : 'Restar dentro del argumento desplaza a la derecha; sumar, a la izquierda.',
      { text: `¿Cómo se desplaza ${forms[k]} respecto de y = sen(x)?` });
  }
};
void gcd; void sup;
