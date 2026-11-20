/** Trucos al estilo GTA: se escriben con el teclado (o en Ajustes). Solo letras, sin tildes. */
import type { SaveData } from '../core/types';
import { achievements, cards, levels, monsters, topics } from '../core/data';
import { CINEMATICS, DIARY } from '../core/story';
import { give } from './rewards';

export interface Cheat { code: string; label: string; apply(s: SaveData): void; runtime?: boolean }

const addAll = (list: string[], ids: string[]): void => { for (const id of ids) if (!list.includes(id)) list.push(id); };
let correctAnswerHighlight = false;

export function isCorrectAnswerHighlightActive(): boolean { return correctAnswerHighlight; }

function zonas(s: SaveData): void {
  addAll(s.progress.levelsCleared, levels.map(l => l.id));
  addAll(s.progress.bossesDefeated, monsters.filter(m => m.boss).map(m => m.id));
}
function cartas(s: SaveData): void { for (const c of cards) give(s, c); }
function maestria(s: SaveData): void {
  const now = new Date().toISOString();
  for (const t of topics) { const cur = s.mastery[t.id]; s.mastery[t.id] = { m: 1, attempts: Math.max(cur?.attempts ?? 0, 20), correct: Math.max(cur?.correct ?? 0, 20), lastSeen: cur?.lastSeen ?? now }; }
}
function historia(s: SaveData): void {
  s.seen ??= []; addAll(s.seen, CINEMATICS.map(c => c.id));
  addAll(s.diaryPages, Object.keys(DIARY).map(id => 'diario_' + id));
}
function logros(s: SaveData): void {
  addAll(s.achievements, achievements.map(a => a.id));
  const st = s.stats;
  st.questionsAnswered = Math.max(st.questionsAnswered, 200); st.correct = Math.max(st.correct, 180); st.bestStreak = Math.max(st.bestStreak, 20);
  st.freePlayLevels = Math.max(st.freePlayLevels, 20); st.combatsWon = Math.max(st.combatsWon, 50); st.bossNoHint = true; st.reviewed = Math.max(st.reviewed, 5);
}

export const CHEATS: Cheat[] = [
  { code: 'PASEJUEGO', label: 'Juego pasado: campaña, jefes, cartas, maestría, historia y logros', apply: s => { zonas(s); cartas(s); maestria(s); historia(s); logros(s); } },
  { code: 'ZONASYA', label: 'Campaña desbloqueada: todas las zonas superadas', apply: zonas },
  { code: 'CARTASYA', label: 'Todas las cartas y reliquias', apply: cartas },
  { code: 'MAESTRIA', label: 'Dominio completo de todos los temas', apply: maestria },
  { code: 'FOCO', label: 'Alterna el brillo de la respuesta correcta en combate (sin seleccionarla)', runtime: true, apply: () => { correctAnswerHighlight = !correctAnswerHighlight; } }
];

const norm = (t: string): string => t.toUpperCase().replace(/[^A-Z]/g, '');
/** Devuelve el truco cuyo código es el final de lo escrito. */
export function detectCheat(typed: string): Cheat | null {
  const t = norm(typed);
  return CHEATS.find(c => t.endsWith(c.code)) ?? null;
}
