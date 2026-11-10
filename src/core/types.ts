export type TopicId = string;
export type GraphFn =
  | { t: 'lin'; m: number; b: number }
  | { t: 'quad'; a: number; b: number; c: number }
  | { t: 'sin'; A: number; T: number; ph?: number; k?: number };
export interface Graph {
  fns: GraphFn[];
  pts?: { x: number; y: number; label?: string }[];
  xr: [number, number];
  yr: [number, number];
}
export type StageId = 'projectile' | 'clickpoint' | 'slope' | 'ladder' | 'translate' | 'reflect';
export interface Question {
  template: string;
  topic: TopicId;
  difficulty: number;
  seed: number;
  text: string;
  options: string[];
  correct: number;
  explain: string;
  graph?: Graph;
  /** datos para el reto animado correspondiente */
  stage?: { id: StageId; meta: Record<string, any> };
  /** el jugador toca el plano en vez de elegir una opción */
  clickTarget?: { x: number; y: number };
  numberLine?: { min: number; max: number; marks: number[] };
  units?: string;
}
export interface Mastery { m: number; attempts: number; correct: number; lastSeen: string }
export type RoomType = 'combat' | 'treasure' | 'rest' | 'boss' | 'event';
export interface Room {
  type: RoomType; monster?: string; difficulty?: number; questions?: number;
  miniBoss?: boolean; hpMultiplier?: number; phases?: string[]; stage?: StageId; topic?: TopicId;
}
export interface Level {
  id: string; world: string; topic: string; name: string; order?: number; rooms: Room[];
  intro?: string; boss?: boolean; final?: boolean; bonus?: boolean; optional?: boolean;
  unlocks?: string[]; requires?: string[]; masteryToClear?: number;
}
export interface MonsterDef {
  id: string; name: string; world: string; topic: string; hp: number; questions: number; boss?: boolean;
  phases?: string[]; difficulty: [number, number];
  attack: { name: string; damage: number; telegraph: string }; line: string; sprite: any;
}
export interface HeroDef { id: string; name: string; style: string; hp: number; passive: { id: string; text: string }; startingDeck: string[]; color: string; sprite: any }
export interface CardDef {
  id: string; name: string; type: 'ataque' | 'defensa' | 'utilidad' | 'riesgo' | 'reliquia'; topic: string | null;
  rarity: 'comun' | 'rara' | 'epica' | 'legendaria'; icon: string; effect: string; params: Record<string, any>;
  unlock: { type: 'start' | 'mastery' | 'drop'; topic?: string; threshold?: number; source?: string };
}
export interface SaveData {
  version: 1;
  profile: { heroId: string; name: string; createdAt: string };
  progress: { levelsCleared: string[]; bossesDefeated: string[] };
  mastery: Record<string, Mastery>;
  deck: string[]; relics: string[]; achievements: string[];
  errorBook: { template: string; topic: string; text: string; given: string; answer: string; explain: string; date: string; resolved: boolean }[];
  diaryPages: string[];
  settings: { textScale: number; colorBlind: boolean; sound: boolean; reduceMotion: boolean; timeMode?: 'normal' | 'slow' | 'veryslow'; noTimeout?: boolean; musicVol?: number; sfxVol?: number; ambVol?: number };
  seen?: string[]; loadout?: string[];
  stats: { questionsAnswered: number; correct: number; bestStreak: number; freePlayLevels: number; combatsWon: number; bossNoHint: boolean; reviewed: number };
}
