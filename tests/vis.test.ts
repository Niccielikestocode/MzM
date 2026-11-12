import { describe, it, expect } from 'vitest';
import { parseVal, valNum, pickerKind, nearest, nearestPoint, textFractions, textPoints, textPercents, fmt } from '../src/game/vis';
describe('visual', () => {
  it('interpreta respuestas', () => {
    expect(parseVal('9/10')).toEqual({ k: 'frac', n: 9, d: 10 }); expect(parseVal('−3/4')).toEqual({ k: 'frac', n: -3, d: 4 });
    expect(parseVal('3,25')).toEqual({ k: 'num', v: 3.25 }); expect(parseVal('15 %')).toEqual({ k: 'pct', v: 15 }); expect(parseVal('12 cm²')).toEqual({ k: 'num', v: 12 });
    expect(parseVal('(3, −2)')).toEqual({ k: 'pt', x: 3, y: -2 }); expect(parseVal('x = 4')).toEqual({ k: 'num', v: 4 });
    expect(parseVal('3x + 2')).toBeNull(); expect(parseVal('raíz de 2')).toBeNull();
    expect(valNum(parseVal('1/4')!)).toBe(0.25);
  });
  it('elige el tipo de respuesta gráfica', () => {
    expect(pickerKind(['1/5', '9/10', '3/7', '9/7'])).toBe('line'); expect(pickerKind(['(1, 2)', '(3, 4)', '(0, 0)'])).toBe('plane');
    expect(pickerKind(['x = 2', 'y + 1'])).toBeNull(); expect(pickerKind(['1', '1'])).toBeNull(); expect(pickerKind(['(1, 2)', '5'])).toBeNull();
  });
  it('encuentra el más cercano', () => { expect(nearest([0.2, 0.9, 0.43], 0.5)).toBe(2); expect(nearestPoint([{ x: 0, y: 0 }, { x: 5, y: 5 }], 4, 4)).toBe(1); expect(fmt(2.5)).toBe('2,5'); expect(fmt(3)).toBe('3'); });
  it('extrae elementos del enunciado', () => {
    expect(textFractions('Calcula 2/5 + 1/2.')).toEqual([{ n: 2, d: 5 }, { n: 1, d: 2 }]); expect(textFractions('el 12/100')).toEqual([]);
    expect(textPoints('A (1, 2) y B (-3, 4)')).toEqual([{ x: 1, y: 2 }, { x: -3, y: 4 }]); expect(textPercents('sube un 15 % y luego 20%')).toEqual([15, 20]);
  });
});
