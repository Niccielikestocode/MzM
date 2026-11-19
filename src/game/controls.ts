/** Gestión y configuración de controles y atajos de teclado */
export type ControlAction =
  | 'left'
  | 'right'
  | 'jump'
  | 'dash'
  | 'attack'
  | 'card1'
  | 'card2'
  | 'card3'
  | 'card4'
  | 'hint'
  | 'pause';

export interface ActionInfo {
  id: ControlAction;
  name: string;
  defaultKey: string;
  altKeys: string[];
}

export const CONTROL_ACTIONS: ActionInfo[] = [
  { id: 'left', name: 'Mover Izquierda', defaultKey: 'a', altKeys: ['arrowleft'] },
  { id: 'right', name: 'Mover Derecha', defaultKey: 'd', altKeys: ['arrowright'] },
  { id: 'jump', name: 'Saltar', defaultKey: 'w', altKeys: ['arrowup', ' '] },
  { id: 'dash', name: 'Dash / Esquivar', defaultKey: 'k', altKeys: ['shift', 'l'] },
  { id: 'attack', name: 'Atacar / Golpear', defaultKey: 'j', altKeys: ['z', 'x'] },
  { id: 'card1', name: 'Carta 1', defaultKey: '1', altKeys: [] },
  { id: 'card2', name: 'Carta 2', defaultKey: '2', altKeys: [] },
  { id: 'card3', name: 'Carta 3', defaultKey: '3', altKeys: [] },
  { id: 'card4', name: 'Carta 4', defaultKey: '4', altKeys: [] },
  { id: 'hint', name: 'Usar Pista', defaultKey: 'h', altKeys: [] },
  { id: 'pause', name: 'Pausa', defaultKey: 'p', altKeys: ['escape'] }
];

export function getKeyMap(custom?: Record<string, string>): Record<ControlAction, string[]> {
  const map: Record<string, string[]> = {};
  for (const act of CONTROL_ACTIONS) {
    const list: string[] = [];
    if (custom && custom[act.id]) {
      list.push(custom[act.id].toLowerCase());
    } else {
      list.push(act.defaultKey.toLowerCase());
    }
    for (const alt of act.altKeys) {
      if (!list.includes(alt.toLowerCase())) list.push(alt.toLowerCase());
    }
    map[act.id] = list;
  }
  return map as Record<ControlAction, string[]>;
}

export function matchesAction(key: string, act: ControlAction, map: Record<ControlAction, string[]>): boolean {
  const k = key.toLowerCase();
  return map[act]?.includes(k) ?? false;
}

export function prettyKeyName(key: string): string {
  if (key === ' ') return 'Espacio';
  if (key === 'arrowleft') return '← Izquierda';
  if (key === 'arrowright') return '→ Derecha';
  if (key === 'arrowup') return '↑ Arriba';
  if (key === 'arrowdown') return '↓ Abajo';
  if (key === 'escape') return 'Esc';
  if (key === 'shift') return 'Shift';
  return key.toUpperCase();
}
