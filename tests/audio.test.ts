import { describe, expect, it } from 'vitest';
import { battleSoundtrackPath } from '../src/ui/audio';

describe('música de jefes', () => {
  it('asigna un MP3 por parcial y una pista exclusiva al boss final', () => {
    expect(battleSoundtrackPath('cavernas', true, false)).toBe('music/The_Integer_Duel.mp3');
    expect(battleSoundtrackPath('bosque', true, false)).toBe('music/Arc_of_the_Final_Strike.mp3');
    expect(battleSoundtrackPath('ciudadela', true, false)).toBe('music/The_Pythagorean_Gambit.mp3');
    expect(battleSoundtrackPath('vacio', true, true)).toBe('music/The_Geometry_of_Ruin.mp3');
  });

  it('no asigna MP3 específico a los jefes de mundos sin soundtrack definido', () => {
    expect(battleSoundtrackPath('otro_mundo', true, false)).toBeNull();
    expect(battleSoundtrackPath('cavernas', false, false)).toBeNull();
  });
});
