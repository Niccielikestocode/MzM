/** Interpretación visual de preguntas y respuestas (puro, sin DOM): fracciones, porcentajes, puntos y números. */
export type Val = { k: 'frac'; n: number; d: number } | { k: 'num'; v: number } | { k: 'pct'; v: number } | { k: 'pt'; x: number; y: number };
const num = (s: string): number => parseFloat(s.replace(',', '.'));
const UNIT = /^(m|cm|mm|km|kg|g|l|ml|m²|cm²|mm²|km²|m³|cm³|°|s|h|u|u²|unidades|cuadrados)$/i;
export function parseVal(raw: string): Val | null {
  let s = raw.replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
  s = s.replace(/^[a-zA-Z']{1,2}\s*=\s*/, '');
  let m = /^\(\s*(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)\s*\)$/.exec(s); if (m) return { k: 'pt', x: num(m[1]), y: num(m[2]) };
  m = /^(-?\d+)\s*\/\s*(\d+)$/.exec(s); if (m && +m[2] > 0) return { k: 'frac', n: +m[1], d: +m[2] };
  m = /^(-?\d+(?:[.,]\d+)?)\s*%$/.exec(s); if (m) return { k: 'pct', v: num(m[1]) };
  m = /^(-?\d+(?:[.,]\d+)?)(?:\s*(\S+))?$/.exec(s); if (m && (!m[2] || UNIT.test(m[2]))) return { k: 'num', v: num(m[1]) };
  return null;
}
export const valNum = (v: Val): number => (v.k === 'frac' ? v.n / v.d : v.k === 'pt' ? NaN : v.v);
export const fmt = (x: number): string => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : String(Math.round(x * 100) / 100).replace('.', ','));
/** Tipo de respuesta gráfica posible para un conjunto de opciones. */
export function pickerKind(options: string[]): 'line' | 'plane' | null {
  const vs = options.map(parseVal); if (vs.length < 2 || vs.some(v => !v)) return null;
  if (vs.every(v => v!.k === 'pt')) return new Set(vs.map(v => `${(v as any).x},${(v as any).y}`)).size === vs.length ? 'plane' : null;
  if (vs.some(v => v!.k === 'pt')) return null;
  const nums = vs.map(v => valNum(v!)); return new Set(nums.map(n => Math.round(n * 1e6))).size === nums.length && nums.every(Number.isFinite) ? 'line' : null;
}
export function nearest(values: number[], x: number): number { let b = 0; values.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(values[b] - x)) b = i; }); return b; }
export function nearestPoint(pts: { x: number; y: number }[], x: number, y: number): number { let b = 0, bd = 1e18; pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }
/** Fracciones / puntos / porcentajes que aparecen en el enunciado, para dibujarlos. */
export function textFractions(t: string): { n: number; d: number }[] { const out: { n: number; d: number }[] = []; for (const m of t.replace(/[−–]/g, '-').matchAll(/(?<![\d.])(-?\d+)\s*\/\s*(\d+)(?![\d/])/g)) { const n = +m[1], d = +m[2]; if (d >= 2 && d <= 12 && Math.abs(n) <= 3 * d) out.push({ n, d }); } return out.slice(0, 3); }
export function textPoints(t: string): { x: number; y: number }[] { const out: { x: number; y: number }[] = []; for (const m of t.replace(/[−–]/g, '-').matchAll(/\(\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)\s*\)/g)) out.push({ x: num(m[1]), y: num(m[2]) }); return out.slice(0, 6); }
export function textPercents(t: string): number[] { const out: number[] = []; for (const m of t.matchAll(/(-?\d+(?:[.,]\d+)?)\s*%/g)) out.push(num(m[1])); return out.slice(0, 3); }
