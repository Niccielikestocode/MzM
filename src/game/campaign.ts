import type { Level, SaveData } from '../core/types';
import { levels } from '../core/data';
import { isMastered } from './mastery';

export const isCleared = (s: SaveData, id: string): boolean => s.progress.levelsCleared.includes(id);
export function isAvailable(s: SaveData, l: Level): boolean {
  if (l.id === 'zona_reales') return true;
  if (l.requires) return l.requires.every(id => isCleared(s, id));
  return levels.some(o => isCleared(s, o.id) && o.unlocks?.includes(l.id));
}
/** Una zona normal se limpia si, al terminar sus salas, el dominio del tema llega al umbral. */
export function zoneClearable(s: SaveData, l: Level): boolean { return l.boss || l.bonus ? true : isMastered(s, l.topic, l.masteryToClear ?? 0.7); }
