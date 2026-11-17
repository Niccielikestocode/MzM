// Mapa carta → efecto visual (sin dependencias del navegador)
export type FxKind = 'slash' | 'pierce' | 'arrow' | 'bolt' | 'fire' | 'ice' | 'meteor' | 'wave' | 'nova' | 'shield' | 'heal' | 'drain' | 'rune' | 'time';
export interface CardFx { kind: FxKind; col: string; col2: string }
const P = (kind: FxKind, col: string, col2: string): CardFx => ({ kind, col, col2 });
export const CARD_FX: Record<string, CardFx> = {
  estocada_basica: P('slash', '#ffffff', '#ffd24d'), estocada_pitagorica: P('pierce', '#8fb4ff', '#ffffff'), flecha_parabolica: P('arrow', '#c4e87a', '#ffffff'),
  rayo_de_raiz: P('bolt', '#4fd1d9', '#ffffff'), golpe_porcentual: P('meteor', '#ffb347', '#ff5a3c'), corte_de_factor: P('pierce', '#e8dfb8', '#ffffff'),
  onda_de_choque: P('wave', '#c88bff', '#ffffff'), escudo_de_balanza: P('shield', '#6fa8ff', '#ffffff'), espejo_reflejo: P('shield', '#e8e2ff', '#8fe9ff'),
  barrera_metrica: P('shield', '#4fd1d9', '#9af06f'), muralla_cartesiana: P('shield', '#e0b84c', '#ffffff'), cubo_de_volumen: P('heal', '#6fcf8f', '#ffffff'),
  regla_real: P('heal', '#8fe9ff', '#ffffff'), pista_del_sabio: P('rune', '#6fb7ff', '#ffffff'), conoce_funcion: P('rune', '#6fcf8f', '#ffffff'),
  interseca: P('rune', '#e86ab5', '#ffffff'), recta_guia: P('rune', '#f2c14e', '#ffffff'), sombra_de_tales: P('time', '#a99fc0', '#ffffff'),
  doble_o_nada: P('nova', '#ff5a7a', '#ffd24d'),
  raiz_ardiente: P('fire', '#ff9a3c', '#ffe08a'), interes_compuesto: P('nova', '#6fcf8f', '#e0b84c'), descomposicion_prima: P('pierce', '#b8a878', '#ffffff'),
  ecuacion_gemela: P('bolt', '#e86ab5', '#ffffff'), lanza_secante: P('drain', '#d9434f', '#ffffff'), tangente_pendiente: P('arrow', '#f2c14e', '#ffffff'),
  ancla_de_origen: P('shield', '#4fd1d9', '#e0b84c'), rotacion_estelar: P('ice', '#9fe8ff', '#ffffff'), escala_de_tales: P('shield', '#c8a3ff', '#ffffff'),
  compas_de_oro: P('rune', '#e0b84c', '#ffffff'), conversion_alquimica: P('heal', '#9af06f', '#ffffff'), sinusoide_calmante: P('ice', '#7fb8ff', '#ffffff'),
  vertice_dorado: P('meteor', '#e0b84c', '#ff5a3c'), funcion_inversa: P('time', '#e86ab5', '#ffffff'), hipotenusa_celeste: P('bolt', '#8fb4ff', '#ffffff'), discriminante: P('fire', '#b04fd1', '#ffffff')
};
const TYPE_FX: Record<string, FxKind> = { ataque: 'slash', defensa: 'shield', utilidad: 'rune', riesgo: 'nova', reliquia: 'rune' };
export function fxFor(card: { id: string; type: string }): CardFx { return CARD_FX[card.id] ?? P(TYPE_FX[card.type] ?? 'slash', '#ffffff', '#ffd24d'); }

