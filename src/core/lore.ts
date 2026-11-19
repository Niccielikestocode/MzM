/** Identidad colombiana, regiones míticas, rangos RPG, bestiario y narración viva en combate */
import type { MonsterDef, SaveData } from './types';

export interface WorldTheme {
  id: string;
  title: string;
  region: string;
  guardian: string;
  desc: string;
  palette: {
    skyTop: string;
    skyBot: string;
    ground: string;
    groundDark: string;
    pathLocked: string;
    pathOpen: string;
    accent: string;
    water: string;
  };
}

export const COLOMBIA_WORLDS: Record<string, WorldTheme> = {
  cavernas: {
    id: 'cavernas',
    title: 'Cavernas de Sal y Oro',
    region: 'Zipaquirá y Laguna de Guatavita',
    guardian: 'El Mohán de los Reales',
    desc: 'Minas subterráneas de sal cristalina y vetas de oro muisca donde los números reales se desordenaron.',
    palette: {
      skyTop: '#0f0c18',
      skyBot: '#1d152b',
      ground: '#2d243b',
      groundDark: '#1c1526',
      pathLocked: '#493c5e',
      pathOpen: '#f5c542',
      accent: '#f5c542',
      water: '#1e5c4d'
    }
  },
  bosque: {
    id: 'bosque',
    title: 'Bosque de Niebla y Páramo',
    region: 'Chingaza y Sierra Nevada del Cocuy',
    guardian: 'La Madremonte Cuadrática',
    desc: 'Frailejones milenarios y lagunas sagradas donde cada sendero traza una función y cada cruce es una ecuación.',
    palette: {
      skyTop: '#101d1c',
      skyBot: '#1c362c',
      ground: '#244a34',
      groundDark: '#163022',
      pathLocked: '#3c5947',
      pathOpen: '#f5c542',
      accent: '#4ecb71',
      water: '#2b6e8a'
    }
  },
  ciudadela: {
    id: 'ciudadela',
    title: 'Ciudadela Colonial de Piedra',
    region: 'Barichara, Villa de Leyva y Cartagena',
    guardian: 'El Coloso de la Malla',
    desc: 'Balcones de madera, calles empedradas y murallas de piedra que esperan ser medidas con Pitágoras y Tales.',
    palette: {
      skyTop: '#151930',
      skyBot: '#263359',
      ground: '#6e5245',
      groundDark: '#4a352c',
      pathLocked: '#594a42',
      pathOpen: '#f5c542',
      accent: '#5ab9ea',
      water: '#214c78'
    }
  },
  vacio: {
    id: 'vacio',
    title: 'Desierto Cósmico de la Tatacoa',
    region: 'Valle del Silencio, Huila',
    guardian: 'El Divisor',
    desc: 'Cañones de tierra roja bajo una bóveda estrellada donde aguarda quien intenta dividir la realidad entre cero.',
    palette: {
      skyTop: '#0b0517',
      skyBot: '#241038',
      ground: '#632920',
      groundDark: '#3d1712',
      pathLocked: '#522938',
      pathOpen: '#ff7582',
      accent: '#e84a5f',
      water: '#33154a'
    }
  }
};

export interface BanterPool {
  start: string[];
  hit: string[];
  miss: string[];
  hurt: string[];
  combo: string[];
  dash: string[];
  card: string[];
  win: string[];
}

export const HERO_BANTER: Record<string, BanterPool> = {
  lia: {
    start: ['¡Pilas pues, que arrancó esto!', '¡A ver de qué está hecho este bicho!', '¡Por la Sierra, esta cuenta no me gana!'],
    hit: ['¡A la fija!', '¡Tome su simplificación!', '¡Eso fue con toda!', '¡Pura matemática fina!'],
    miss: ['¡Uy quieto, me comí un signo!', '¡Epa, concéntrate Lía!', '¡Se me cruzaron los cables!'],
    hurt: ['¡Ay! ¡Eso dolió, pero sigo en pie!', '¡Qué golpe tan bravo!', '¡No me dejo tumbar!'],
    combo: ['¡Estoy en racha, qué berraquera!', '¡Nadie me frena hoy!', '¡Imparable!'],
    dash: ['¡Por un pelo!', '¡Muy lento, mijo!', '¡Ni me tocó!'],
    card: ['¡Ahí te va mi técnica especial!', '¡Poder andino al máximo!', '¡Equilibrio total!'],
    win: ['¡Listo el pollo! ¡Seguimos!', '¡Ecuación despejada!', '¡Bien jugado!']
  },
  teo: {
    start: ['Con calma y buena letra, vamos.', 'Mi balanza no falla. ¡Adelante!', '¡A defender las tierras de Aritmia!'],
    hit: ['¡Exacto al milímetro!', '¡Bien medido!', '¡Así es que se calcula!', '¡Firme como la piedra!'],
    miss: ['¡Un tropiezo no es caída!', '¡Me faltó revisar el signo!', '¡A corregir esa cuenta!'],
    hurt: ['¡Buen intento, pero aguanto!', '¡Mi ruana amortigua el golpe!', '¡Toca esquivar mejor!'],
    combo: ['¡Qué pulso tan firme!', '¡Dominio absoluto!', '¡A ritmo de tiple!'],
    dash: ['¡Esquivado con clase!', '¡Paso firme!', '¡A salvo!'],
    card: ['¡Guardia de la Balanza!', '¡Toma la fuerza de los Andes!', '¡Técnica ancestral!'],
    win: ['¡Equilibrio restaurado!', '¡Paso a paso se llega lejos!', '¡Victoria merecida!']
  },
  mara: {
    start: ['¡Ya tengo el blanco en la mira!', '¡Calculemos esa trayectoria!', '¡Vamos a ver quién apunta mejor!'],
    hit: ['¡En todo el blanco!', '¡Curva perfecta!', '¡A la fija, sin fallo!', '¡Directo al vértice!'],
    miss: ['¡Se me desvió la flecha!', '¡Ups, mal ángulo!', '¡Toca recalibrar!'],
    hurt: ['¡Casi me sacan del plano!', '¡Esa sí la sentí!', '¡A tomar distancia!'],
    combo: ['¡Lluvia de aciertos!', '¡Precisión milimétrica!', '¡Qué puntería!'],
    dash: ['¡Como brisa del litoral!', '¡No me atrapas!', '¡Ágil como el viento!'],
    card: ['¡Disparo parabólico!', '¡Lanza de coordenadas!', '¡Fuego calculado!'],
    win: ['¡Objetivo cumplido!', '¡Ni una flecha perdida!', '¡A la siguiente zona!']
  }
};

export const MONSTER_TAUNTS = {
  telegraph: [
    '¡A ver si esquivas esta!',
    '¡Prepárate para el golpe!',
    '¡Te voy a dividir en dos!',
    '¡Cuidado abajo!',
    '¡No te va a salvar ni el despeje!'
  ],
  boss: [
    '¡Nadie cruza mi territorio sin dominar el tema!',
    '¡Mis fases cambiarán tu cálculo!',
    '¡El Divisor nos mostró el verdadero cero!'
  ],
  hurt: [
    '¡Argh! ¡Sí sabías la fórmula!',
    '¡Eso arde como sal en herida!',
    '¡Malditas matemáticas exactas!'
  ]
};

export function pickBanter(heroId: string, kind: keyof BanterPool): string {
  const pool = HERO_BANTER[heroId] ?? HERO_BANTER.lia;
  const arr = pool[kind];
  return arr[Math.floor(Math.random() * arr.length)] ?? '';
}

export function pickMonsterTaunt(kind: keyof typeof MONSTER_TAUNTS): string {
  const arr = MONSTER_TAUNTS[kind];
  return arr[Math.floor(Math.random() * arr.length)] ?? '';
}

/* ---------- Progresión RPG: Nivel y Rango Andino de Calculista ---------- */
export interface RankInfo {
  level: number;
  title: string;
  xp: number;
  nextXp: number;
  pct: number;
  badge: string;
}

export function calculatorRank(save: SaveData): RankInfo {
  const xp =
    save.stats.correct * 15 +
    save.progress.levelsCleared.length * 120 +
    save.achievements.length * 80 +
    (save.stats.reviewed ?? 0) * 40;
  const level = Math.max(1, Math.floor(xp / 200) + 1);
  const floorXp = (level - 1) * 200;
  const nextXp = level * 200;
  const pct = Math.min(1, (xp - floorXp) / 200);

  let title = 'Aprendiz de la Sal';
  let badge = '⛏️';
  if (level >= 13) { title = 'Gran Maestro de Aritmia'; badge = '✨'; }
  else if (level >= 9) { title = 'Sabio de Guatavita'; badge = '👑'; }
  else if (level >= 6) { title = 'Artífice de Barichara'; badge = '🏛️'; }
  else if (level >= 3) { title = 'Calculista del Páramo'; badge = '🌿'; }

  return { level, title, xp, nextXp, pct, badge };
}

/* ---------- Bestiario Folclórico y Debilidades Matemáticas ---------- */
export const MONSTER_LORE: Record<string, { region: string; myth: string; weakness: string }> = {
  slime_fraccionario: {
    region: 'Minas de Zipaquirá',
    myth: 'Nace de la salmuera verdosa que gotea en las galerías antiguas; se parte en mitades y tercios para confundir a los mineros.',
    weakness: 'Fracciones equivalentes y común denominador.'
  },
  goblin_mercader: {
    region: 'Mercados de Nemocón',
    myth: 'Duende avaricioso de los socavones que cobra intereses ocultos y descuentos engañosos en sus trueques.',
    weakness: 'Cálculo exacto de porcentajes y variación proporcional.'
  },
  golem_bloques: {
    region: 'Canteras Muiscas',
    myth: 'Autómata de sal y piedra ensamblado en piezas polinómicas; solo se desarma encontrando sus factores.',
    weakness: 'Factor común, trinomios y diferencia de cuadrados.'
  },
  rey_irracional: {
    region: 'Laguna Sagrada de Guatavita',
    myth: 'Soberano cubierto de polvo dorado que custodia las raíces inexactas en lo profundo de las cavernas.',
    weakness: 'Orden de números reales, porcentajes y factorización combinados.'
  },
  murcielago_balanza: {
    region: 'Cuevas de Chingaza',
    myth: 'Quiróptero nocturno que solo vuela en equilibrio si ambos lados de la ecuación pesan lo mismo.',
    weakness: 'Despeje de ecuaciones de primer grado con cuidado en los signos.'
  },
  espectro_graficador: {
    region: 'Niebla del Cocuy',
    myth: 'Aparición del páramo que dibuja senderos invisibles entre la bruma para desviar a los caminantes.',
    weakness: 'Identificación de dominio, rango y lectura de funciones.'
  },
  serpiente_pendiente: {
    region: 'Cañón del Chicamocha',
    myth: 'Culebra andina que se desliza por laderas empinadas cambiando su inclinación en cada recodo.',
    weakness: 'Fórmula de pendiente m = Δy / Δx e intercepto con el eje Y.'
  },
  gemelos_intersecados: {
    region: 'Bosque Altoandino',
    myth: 'Dos espíritus inseparables que solo aparecen en el punto exacto donde dos rectas se cruzan.',
    weakness: 'Sistemas de ecuaciones 2×2 por sustitución o igualación.'
  },
  arquero_parabolico: {
    region: 'Valles de Boyacá',
    myth: 'Cazador espectral cuyas flechas trazan arcos cuadráticos perfectos sobre los frailejones.',
    weakness: 'Vértice y abertura de funciones cuadráticas.'
  },
  dragon_raices: {
    region: 'Cumbres Nevadas',
    myth: 'Dragón de escamas esmeralda que guarda los puntos donde toda parábola toca el suelo.',
    weakness: 'Factorización cuadrática y discriminante.'
  },
  sirena_ondas: {
    region: 'Laguna de Tota',
    myth: 'Espíritu de las aguas que agita la superficie con crestas periódicas de amplitud precisa.',
    weakness: 'Lectura de amplitud, período y desplazamiento en senoides.'
  },
  hidra_cuadratica: {
    region: 'Corazón del Páramo (Madremonte)',
    myth: 'Guardiana ancestral del bosque de niebla; cada cabeza representa una función viva de Aritmia.',
    weakness: 'Dominio completo del álgebra lineal, sistemas y parábolas.'
  },
  cubo_gelatinoso: {
    region: 'Aljibes de Villa de Leyva',
    myth: 'Masa geométrica transparente que absorbe ladrillos y adoquines manteniendo siempre su volumen.',
    weakness: 'Áreas, perímetros y volúmenes de prismas y cilindros.'
  },
  troll_puente: {
    region: 'Puentes de Barichara',
    myth: 'Gigante tozudo que bloquea los viaductos coloniales con vigas en diagonal.',
    weakness: 'Teorema de Pitágoras: c² = a² + b².'
  },
  gnomo_sombras: {
    region: 'Calles Empedradas',
    myth: 'Duende travieso que mide torres altísimas comparando la sombra de su bastón al mediodía.',
    weakness: 'Semejanza de triángulos y Teorema de Tales.'
  },
  alquimista_sobrecargado: {
    region: 'Botica Colonial',
    myth: 'Boticario confundido que mezcla litros, metros y segundos en pócimas inestables.',
    weakness: 'Conversión rigurosa de unidades métricas y tiempo.'
  },
  espejo_maldito: {
    region: 'Casonas Antiguas',
    myth: 'Reliquia encantada que traslada, rota y refleja todo lo que se acerca a su marco dorado.',
    weakness: 'Traslaciones, rotaciones y reflexiones en el plano.'
  },
  caballero_coordenado: {
    region: 'Murallas de Cartagena',
    myth: 'Centinela de armadura añil que patrulla las garitas siguiendo coordenadas exactas.',
    weakness: 'Distancia entre puntos, punto medio y cuadrantes.'
  },
  coloso_medidas: {
    region: 'Gran Ciudadela de Piedra',
    myth: 'Titán tallado en piedra caliza que custodia el tercer fragmento de la Ecuación Maestra.',
    weakness: 'Pitágoras, Tales, áreas, transformaciones y plano cartesiano.'
  },
  el_divisor: {
    region: 'Desierto Cósmico de la Tatacoa',
    myth: 'Entidad ancestral nacida de la prohibición absoluta: dividir entre cero para desgarrar la realidad.',
    weakness: 'Todos los saberes matemáticos de Aritmia en armonía.'
  }
};

export function loreForMonster(m: MonsterDef): { region: string; myth: string; weakness: string } {
  return MONSTER_LORE[m.id] ?? {
    region: COLOMBIA_WORLDS[m.world]?.region ?? 'Tierras de Aritmia',
    myth: m.line,
    weakness: `Dominio del tema «${m.topic}».`
  };
}
