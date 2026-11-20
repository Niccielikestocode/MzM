import { describe, expect, it } from 'vitest';
import { battleMusicKind, battleSoundtrackPath } from '../src/ui/audio';

describe('música de combate', () => {
  it('separa peleas regulares, parciales y el nivel final', () => {
    expect(battleMusicKind('cavernas', false, false, false)).toBe('regular');
    expect(battleMusicKind('bosque', true, false, false)).toBe('regular');
    expect(battleMusicKind('ciudadela', false, false, false)).toBe('regular');
    expect(battleMusicKind('cavernas', false, true, false)).toBe('unit');
    expect(battleMusicKind('cavernas', true, true, false)).toBe('unit');
    expect(battleMusicKind('vacio', false, false, true)).toBe('final');
    expect(battleMusicKind('vacio', true, true, true)).toBe('final');
    expect(battleMusicKind('otro_mundo', false, false, false)).toBe('common');
  });

  it('asigna pistas regulares por unidad, pistas propias a los parciales y una al nivel final', () => {
    expect(battleSoundtrackPath('cavernas', 'regular')).toBe('music/Steel_Stance.mp3');
    expect(battleSoundtrackPath('bosque', 'regular')).toBe('music/Quadratic_Strike.mp3');
    expect(battleSoundtrackPath('ciudadela', 'regular')).toBe('music/The_Acute_Angle.mp3');
    expect(battleSoundtrackPath('cavernas', 'unit')).toBe('music/The_Integer_Duel.mp3');
    expect(battleSoundtrackPath('bosque', 'unit')).toBe('music/Arc_of_the_Final_Strike.mp3');
    expect(battleSoundtrackPath('ciudadela', 'unit')).toBe('music/The_Pythagorean_Gambit.mp3');
    expect(battleSoundtrackPath('vacio', 'final')).toBe('music/The_Geometry_of_Ruin.mp3');
  });

  it('deja música dinámica cuando no hay pista asignada', () => {
    expect(battleSoundtrackPath('otro_mundo', 'common')).toBeNull();
    expect(battleSoundtrackPath('otro_mundo', 'unit')).toBeNull();
  });
});
