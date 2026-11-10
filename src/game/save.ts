import type { SaveData } from '../core/types';
import { heroById } from '../core/data';

export interface SaveRepository { load(): SaveData | null; save(d: SaveData): void; clear(): void }
const KEY = 'juego-mate-save-v1';
export class LocalRepo implements SaveRepository {
  private mem: string | null = null;
  load(): SaveData | null {
    try { const s = localStorage.getItem(KEY) ?? this.mem; if (!s) return null; const d = JSON.parse(s); return d?.version === 1 ? d : null; } catch { return null; }
  }
  save(d: SaveData): void { const s = JSON.stringify(d); this.mem = s; try { localStorage.setItem(KEY, s); } catch { /* sin almacenamiento */ } }
  clear(): void { this.mem = null; try { localStorage.removeItem(KEY); } catch { /* nada */ } }
}
export function newSave(heroId: string, name: string): SaveData {
  const h = heroById[heroId];
  return {
    version: 1, profile: { heroId, name, createdAt: new Date().toISOString() },
    progress: { levelsCleared: [], bossesDefeated: [] }, mastery: {}, deck: [...h.startingDeck], relics: [], achievements: [],
    errorBook: [], diaryPages: [],
    settings: { textScale: 1, colorBlind: false, sound: true, reduceMotion: false },
    stats: { questionsAnswered: 0, correct: 0, bestStreak: 0, freePlayLevels: 0, combatsWon: 0, bossNoHint: false, reviewed: 0 }
  };
}
