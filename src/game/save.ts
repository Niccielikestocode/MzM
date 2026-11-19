import type { SaveData } from '../core/types';
import { heroById } from '../core/data';
import { HybridRepo, type SaveRepository } from '../domain/save/storage';

export type { SaveRepository };
export { HybridRepo, exportSaveJSON, importSaveJSON, validateSaveData } from '../domain/save/storage';

export class LocalRepo extends HybridRepo {}

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
