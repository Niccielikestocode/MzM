import type { SaveData } from '../core/types';

export const ALPHA = 0.12, CLEAR = 0.7, INITIAL = 0.25;
export const masteryOf = (s: SaveData, topic: string): number => s.mastery[topic]?.m ?? INITIAL;
/** m_{t+1} = m_t + α·(r − m_t); α crece un poco con la dificultad. */
export function updateMastery(s: SaveData, topic: string, correct: boolean, difficulty: number): number {
  const cur = s.mastery[topic] ?? { m: INITIAL, attempts: 0, correct: 0, lastSeen: '' };
  const a = ALPHA * (0.7 + 0.1 * difficulty);
  cur.m = cur.m + a * ((correct ? 1 : 0) - cur.m);
  cur.attempts++; if (correct) cur.correct++;
  cur.lastSeen = new Date().toISOString();
  s.mastery[topic] = cur;
  return cur.m;
}
export const isMastered = (s: SaveData, topic: string, threshold = CLEAR): boolean => masteryOf(s, topic) >= threshold;
