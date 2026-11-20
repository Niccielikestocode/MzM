import { describe, expect, it } from 'vitest';
import { battleMusicKind, battleSoundtrackPath } from '../src/ui/audio';

describe('música de combate', () => {
  it('mantiene la pista de unidad en todas las peleas del parcial, salvo el nivel final', () => {
    expect(battleMusicKind(false, true, false)).toBe('unit');
    expect(battleMusicKind(true, true, false)).toBe('unit');
    expect(battleMusicKind(false, false, false)).toBe('common');
    expect(battleMusicKind(false, true, true)).toBe('common');
    expect(battleMusicKind(true, true, true)).toBe('final');
  });

  it('asigna un MP3 por parcial y una pista exclusiva al boss final', () => {
    expect(battleSoundtrackPath('cavernas', 'unit')).toBe('music/The_Integer_Duel.mp3');
    expect(battleSoundtrackPath('bosque', 'unit')).toBe('music/Arc_of_the_Final_Strike.mp3');
    expect(battleSoundtrackPath('ciudadela', 'unit')).toBe('music/The_Pythagorean_Gambit.mp3');
    expect(battleSoundtrackPath('vacio', 'final')).toBe('music/The_Geometry_of_Ruin.mp3');
  });

  it('deja la música dinámica para enemigos comunes y mundos sin pista definida', () => {
    expect(battleSoundtrackPath('cavernas', 'common')).toBeNull();
    expect(battleSoundtrackPath('otro_mundo', 'unit')).toBeNull();
  });
});
