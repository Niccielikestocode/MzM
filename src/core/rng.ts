/** Generador pseudoaleatorio con semilla (mulberry32). */
export type Rng = () => number;
export function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (r: Rng, a: number, b: number): number => a + Math.floor(r() * (b - a + 1));
export const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
export function shuffle<T>(r: Rng, xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function weightedPick<T>(r: Rng, xs: readonly T[], w: (x: T) => number): T {
  const ws = xs.map(w), tot = ws.reduce((a, b) => a + b, 0);
  let x = r() * tot;
  for (let i = 0; i < xs.length; i++) { x -= ws[i]; if (x <= 0) return xs[i]; }
  return xs[xs.length - 1];
}
export const newSeed = (): number => (Math.random() * 2 ** 31) | 0;
