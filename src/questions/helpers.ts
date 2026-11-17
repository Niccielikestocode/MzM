import { Rng, shuffle, randInt, pick } from '../core/rng';
import type { Question } from '../core/types';

export type Body = Omit<Question, 'template' | 'topic' | 'difficulty' | 'seed'>;
export type Gen = (r: Rng, d: number) => Body;

const MINUS = '−';
/** Formatea con coma decimal, signo menos tipográfico y sin ceros sobrantes. */
export function fmt(n: number, dec = 2): string {
  let s = Number.isInteger(n) ? String(n) : (+n.toFixed(dec)).toString();
  if (s === '-0') s = '0';
  s = s.replace('.', ',');
  if (s.startsWith('-')) s = MINUS + s.slice(1);
  const [i, f] = s.split(',');
  const neg = i.startsWith(MINUS), ip = neg ? i.slice(1) : i;
  const g = ip.length > 4 ? ip.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ip;
  return (neg ? MINUS : '') + g + (f ? ',' + f : '');
}
export const sgn = (n: number): string => (n < 0 ? MINUS : '+');
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export function frac(n: number, d: number): string {
  const g = gcd(n, d) || 1; n /= g; d /= g;
  if (d < 0) { n = -n; d = -d; }
  return d === 1 ? fmt(n) : `${fmt(n)}/${d}`;
}
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
export const sup = (n: number | string): string => String(n).split('').map(c => SUP[c] ?? c).join('');
/** Coeficiente junto a variable: 1x -> x, -1x -> -x */
export function term(c: number, v: string, first = false): string {
  if (c === 0) return '';
  const a = Math.abs(c), body = a === 1 && v ? v : fmt(a) + v;
  if (first) return (c < 0 ? MINUS : '') + body;
  return ` ${c < 0 ? MINUS : '+'} ${body}`;
}
export function poly(...ts: [number, string][]): string {
  let out = '', first = true;
  for (const [c, v] of ts) { if (c === 0) continue; out += term(c, v, first); first = false; }
  return out || '0';
}
export const par = (a: number, v = 'x'): string => `(${v} ${a < 0 ? MINUS : '+'} ${Math.abs(a)})`;
export const pt = (x: number, y: number): string => `(${fmt(x)}, ${fmt(y)})`;

/** Arma 4 opciones barajadas con la correcta y distractores únicos. */
export function pack(r: Rng, correct: string, wrongs: string[], explain: string, extra: Partial<Body> & { text: string }, filler?: () => string[]): Body {
  const seen = new Set([correct]);
  const w: string[] = [];
  for (const x of wrongs.concat(filler ? filler() : [])) { if (!seen.has(x)) { seen.add(x); w.push(x); } if (w.length === 3) break; }
  if (w.length < 3) throw new Error(`faltan distractores para ${extra.text}`);
  const options = shuffle(r, [correct, ...w]);
  return { options, correct: options.indexOf(correct), explain, ...extra };
}
/** Versión numérica: rellena distractores con desplazamientos si hacen falta. */
export function packN(r: Rng, correct: number, wrongs: number[], unit: string, explain: string, extra: Partial<Body> & { text: string }): Body {
  const f = (n: number) => fmt(n) + unit;
  const c = f(correct);
  return pack(r, c, wrongs.filter(Number.isFinite).map(f).filter(x => !/^0(\s|$)/.test(x)), explain, extra, () => {
    const step = Math.max(1, Math.round(Math.abs(correct) / 10));
    return [correct + step, correct - step, correct + 2 * step, correct * 2, correct + 10 * step].map(f);
  });
}
export const R = { randInt, pick };
