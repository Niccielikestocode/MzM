import { Gen, fmt, frac, gcd, pack, packN, sup, poly, par, pt, term, sgn } from './helpers';
import { randInt as ri, pick, shuffle } from '../core/rng';

const MINUS = '−';
export const reales: Record<string, Gen> = {
  'recta.ubicar': r => {
    const a = ri(r, 0, 4), n = ri(r, 1, 3), v = a + n / 4, others = [1, 2, 3].filter(k => k !== n).map(k => a + k / 4);
    return pack(r, fmt(v), others.map(fmt).concat([fmt(a + n / 10), fmt(a + 1)]),
      `Entre ${a} y ${a + 1} hay 4 partes iguales; el punto está en la marca ${n}, o sea ${a} + ${n}/4 = ${fmt(v)}.`,
      { text: `En la recta numérica, ¿qué valor tiene el punto P?`, numberLine: { min: a, max: a + 1, marks: [v] } });
  },
  'fracciones.operar': (r, d) => {
    const b = pick(r, [2, 3, 4, 5, 6]), dd = pick(r, [2, 3, 4, 5, 6].filter(x => x !== b)), a = ri(r, 1, b - 1 || 1), c = ri(r, 1, dd - 1 || 1);
    const op = d <= 1 ? '+' : pick(r, ['+', '−', '×']);
    let n: number, den: number;
    if (op === '+') { n = a * dd + c * b; den = b * dd; } else if (op === '−') { n = a * dd - c * b; den = b * dd; } else { n = a * c; den = b * dd; }
    const ok = frac(n, den);
    const wr = [frac(a + c, b + dd), frac(a * c, b * dd), frac(a * dd + c * b, b + dd), frac(Math.abs(a * dd - c * b), b * dd), frac(n, den + 1), frac(n + 1, den)];
    return pack(r, ok, wr, op === '×' ? `Se multiplican numeradores y denominadores: ${a}·${c}/${b}·${dd} = ${ok}.` : `Denominador común ${b * dd}: (${a}·${dd} ${op} ${c}·${b})/${b * dd} = ${ok}.`,
      { text: `Calcula ${a}/${b} ${op} ${c}/${dd}. Simplifica el resultado.` });
  },
  'raices.simplificar': r => {
    const k = ri(r, 2, 6), m = pick(r, [2, 3, 5, 6, 7]), n = k * k * m, ok = `${k}√${m}`;
    return pack(r, ok, [`${m}√${k}`, `${k * k}√${m}`, `${k + m}`, `${k}√${m * k}`, `${k * m}√${k}`],
      `${n} = ${k * k}·${m}, y √${k * k} = ${k}. Por eso √${n} = ${k}√${m}.`, { text: `Simplifica √${n}.` });
  },
  'orden.comparar': r => {
    for (let t = 0; t < 50; t++) {
      const vals: { s: string; v: number }[] = [];
      while (vals.length < 4) {
        const den = pick(r, [2, 4, 5, 8]), num = ri(r, 1, den * 2 - 1);
        const asFrac = r() < 0.5, v = num / den;
        const cand = asFrac ? { s: frac(num, den), v } : { s: fmt(Math.round(v * 100) / 100), v: Math.round(v * 100) / 100 };
        if (!vals.some(x => Math.abs(x.v - cand.v) < 0.001) && cand.s.length < 8) vals.push(cand);
      }
      const big = vals.reduce((a, b) => (b.v > a.v ? b : a));
      return pack(r, big.s, vals.filter(x => x !== big).map(x => x.s),
        `Pasando todo a decimales: ${vals.map(x => `${x.s} = ${fmt(x.v)}`).join(', ')}. El mayor es ${big.s}.`, { text: `¿Cuál de estos números es el mayor?` });
    }
    throw new Error('orden');
  },
  'potencias.reglas': r => {
    const m = ri(r, 4, 8), n = ri(r, 2, 5), p = ri(r, 2, 5), e = m + n - p, ok = `x${sup(e)}`;
    return pack(r, ok, [`x${sup(m + n + p)}`, `x${sup(m * n - p)}`, `x${sup(m + n)}`, `x${sup(m - n + p)}`, `x${sup(m * n / p | 0)}`],
      `Al multiplicar se suman los exponentes (${m}+${n}=${m + n}) y al dividir se restan (${m + n}−${p}=${e}).`, { text: `Simplifica x${sup(m)} · x${sup(n)} ÷ x${sup(p)}.` });
  }
};

export const porcentajes: Record<string, Gen> = {
  'de-cantidad': r => {
    const p = pick(r, [5, 10, 15, 20, 25, 30, 40, 50]), N = 20 * ri(r, 2, 15), v = (N * p) / 100;
    return packN(r, v, [N / p, N - v, N * p, v * 10, (N * (100 - p)) / 100], '', `${p}% de ${N} = ${p}/100 · ${N} = ${fmt(v)}.`, { text: `¿Cuánto es el ${p}% de ${N}?` });
  },
  'aumento-descuento': r => {
    const p = pick(r, [10, 15, 20, 25, 30, 40]), N = 20 * ri(r, 3, 20), up = r() < 0.4, f = up ? 1 + p / 100 : 1 - p / 100, v = N * f;
    return packN(r, v, [N * (up ? 1 - p / 100 : 1 + p / 100), up ? N + p : N - p, (N * p) / 100, N * f * f], '', `${up ? 'Aumento' : 'Descuento'} del ${p}%: ${N} · ${fmt(f)} = ${fmt(v)}.`,
      { text: `Un artículo cuesta $${N} y ${up ? 'sube' : 'baja'} un ${p}%. ¿Cuál es el precio final en pesos?` });
  },
  'variacion': r => {
    const A = 20 * ri(r, 3, 15), p = pick(r, [10, 20, 25, 30, 40, 50]), up = r() < 0.5, B = A * (up ? 1 + p / 100 : 1 - p / 100);
    const s = (n: number, u: boolean) => `${u ? '+' : MINUS}${fmt(n)} %`;
    return pack(r, s(p, up), [s(p, !up), s(Math.round(Math.abs(B - A) / B * 1000) / 10, up), s(Math.abs(B - A), up), s(p / 2, up)],
      `Variación = (${fmt(B)} ${MINUS} ${A}) / ${A} = ${fmt((B - A) / A)} = ${s(p, up)}. Siempre se divide entre el valor inicial.`,
      { text: `Un valor pasó de ${A} a ${fmt(B)}. ¿Cuál es la variación porcentual?` });
  },
  'hallar-base': r => {
    const p = pick(r, [10, 20, 25, 40, 50, 5]), N = 20 * ri(r, 2, 12), part = (N * p) / 100;
    return packN(r, N, [part * p / 100, part + p, part * p, N + part], '', `Si el ${p}% es ${fmt(part)}, el 100% es ${fmt(part)} ÷ ${fmt(p / 100)} = ${fmt(N)}.`,
      { text: `El ${p}% de un número es ${fmt(part)}. ¿Cuál es el número?` });
  }
};

export const factorizacion: Record<string, Gen> = {
  'factor-comun': r => {
    const g = ri(r, 2, 6), p = ri(r, 1, 4), q = ri(r, 1, 5) * (r() < 0.4 ? -1 : 1);
    const gg = gcd(p, Math.abs(q)) || 1, P = p / gg, Q = q / gg, G = g * gg;
    const expr = poly([G * P, 'x²'], [G * Q, 'x']);
    const inner = poly([P, 'x'], [Q, '']);
    const ok = `${G}x(${inner})`;
    return pack(r, ok, [`${G}(${poly([P, 'x²'], [Q, 'x'])})`, `x(${poly([G * P, 'x'], [G * Q, ''])})`, `${G}x(${poly([P, 'x'], [Q, ''])})`.replace('+', '+') === ok ? `${G}x²(${inner})` : `${G}x(${poly([P, 'x²'], [Q, ''])})`, `${G}x(${poly([P, 'x'], [-Q, ''])})`],
      `El factor común es ${G}x: ${expr} = ${ok}. Se comprueba distribuyendo.`, { text: `Factoriza completamente ${expr}.` });
  },
  'diferencia-cuadrados': r => {
    const a = ri(r, 1, 3), b = ri(r, 2, 9), A = a === 1 ? 'x' : `${a}x`, expr = `${a * a === 1 ? '' : a * a}x² ${MINUS} ${b * b}`;
    const ok = `(${A} ${MINUS} ${b})(${A} + ${b})`;
    return pack(r, ok, [`(${A} ${MINUS} ${b})²`, `(${A} + ${b})²`, `(${A} ${MINUS} ${b * b})(${A} + ${b * b})`, `(${A} ${MINUS} ${b})(${A} ${MINUS} ${b})`.replace(/.*/, `(${A} ${MINUS} ${b})(${a}x + ${b * 2})`)],
      `Es una diferencia de cuadrados: (${A})² ${MINUS} ${b}² = (${A} ${MINUS} ${b})(${A} + ${b}).`, { text: `Factoriza ${expr}.` });
  },
  'trinomio': r => {
    let p = 0, q = 0;
    while (p === 0 || q === 0 || p === q) { p = ri(r, -7, 7); q = ri(r, -7, 7); }
    const f = (a: number, b: number) => [a, b].sort((x, y) => x - y).map(v => par(v)).join('');
    const ok = f(p, q);
    return pack(r, ok, [f(-p, -q), f(p, -q), f(-p, q), f(p + q, 1)].filter(x => x !== ok),
      `Se buscan dos números que multiplicados den ${p * q} y sumados ${p + q}: son ${p} y ${q}.`, { text: `Factoriza x² ${p + q < 0 ? MINUS : '+'} ${Math.abs(p + q) === 1 ? '' : Math.abs(p + q)}x ${p * q < 0 ? MINUS : '+'} ${Math.abs(p * q)}.`.replace(/ 1x/, ' x') });
  },
  'agrupacion': r => {
    const p = ri(r, 2, 7), q = pick(r, [2, 3, 4, 5, 6, 7].filter(x => x !== p));
    const ok = `(x + ${p})(y + ${q})`;
    return pack(r, ok, [`(x + ${q})(y + ${p})`, `(x + ${p})(y + ${p})`, `(x ${MINUS} ${p})(y ${MINUS} ${q})`, `(x + ${p * q})(y + 1)`],
      `Agrupa: x(y + ${q}) + ${p}(y + ${q}) = (x + ${p})(y + ${q}).`, { text: `Factoriza por agrupación: xy + ${q}x + ${p}y + ${p * q}.` });
  }
};
void term; void sgn; void pt; void shuffle;
