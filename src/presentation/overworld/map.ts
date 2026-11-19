/** Overworld Map 16-bits Deluxe estilo Super Mario World con biomas colombianos, píldoras HTML nítidas y cortinilla Iris Wipe */
import type { Level, SaveData } from '../../core/types';
import { heroById, levels, monsterById, topicById, worlds } from '../../core/data';
import { COLOMBIA_WORLDS } from '../../core/lore';
import { isAvailable, isCleared } from '../../game/campaign';
import { masteryOf } from '../../game/mastery';
import { h, heroSprite, monsterSprite, pct, spriteCanvas, ticker } from '../../ui/dom';
import { sfx, playMusic, playAmbient } from '../../ui/audio';
import { ActorClass } from '../../gfx/scene';

interface NodeCoord { x: number; y: number } // coordenadas en el lienzo 320×180

const MAP_LAYOUT: Record<string, { nodes: Record<string, NodeCoord>; edges: [string, string][] }> = {
  cavernas: {
    nodes: {
      zona_reales: { x: 54, y: 126 },
      zona_porcentajes: { x: 128, y: 76 },
      zona_factorizacion: { x: 204, y: 120 },
      parcial_cavernas: { x: 272, y: 66 }
    },
    edges: [
      ['zona_reales', 'zona_porcentajes'],
      ['zona_porcentajes', 'zona_factorizacion'],
      ['zona_factorizacion', 'parcial_cavernas']
    ]
  },
  bosque: {
    nodes: {
      zona_ecuaciones: { x: 34, y: 134 },
      zona_funciones: { x: 76, y: 88 },
      zona_lineal: { x: 118, y: 128 },
      rampa_pendientes: { x: 118, y: 48 },
      zona_sistemas: { x: 164, y: 88 },
      zona_cuadratica: { x: 208, y: 130 },
      campo_proyectiles: { x: 208, y: 48 },
      zona_ecuacionesCuadraticas: { x: 248, y: 90 },
      zona_ondas: { x: 282, y: 136 },
      parcial_bosque: { x: 284, y: 52 }
    },
    edges: [
      ['zona_ecuaciones', 'zona_funciones'],
      ['zona_funciones', 'zona_lineal'],
      ['zona_lineal', 'rampa_pendientes'],
      ['zona_lineal', 'zona_sistemas'],
      ['zona_sistemas', 'zona_cuadratica'],
      ['zona_cuadratica', 'campo_proyectiles'],
      ['zona_cuadratica', 'zona_ecuacionesCuadraticas'],
      ['zona_ecuacionesCuadraticas', 'zona_ondas'],
      ['zona_ecuacionesCuadraticas', 'parcial_bosque']
    ]
  },
  ciudadela: {
    nodes: {
      zona_medidas: { x: 36, y: 130 },
      zona_pitagoras: { x: 76, y: 82 },
      puente_pitagoras: { x: 76, y: 38 },
      zona_tales: { x: 124, y: 124 },
      zona_unidades: { x: 168, y: 78 },
      zona_transformaciones: { x: 214, y: 124 },
      zona_plano: { x: 252, y: 80 },
      campo_coordenadas: { x: 252, y: 36 },
      parcial_ciudadela: { x: 288, y: 66 }
    },
    edges: [
      ['zona_medidas', 'zona_pitagoras'],
      ['zona_pitagoras', 'puente_pitagoras'],
      ['zona_pitagoras', 'zona_tales'],
      ['zona_tales', 'zona_unidades'],
      ['zona_unidades', 'zona_transformaciones'],
      ['zona_transformaciones', 'zona_plano'],
      ['zona_plano', 'campo_coordenadas'],
      ['zona_plano', 'parcial_ciudadela']
    ]
  },
  vacio: {
    nodes: {
      final: { x: 160, y: 96 }
    },
    edges: []
  }
};

const SHORT_NAMES: Record<string, string> = {
  zona_reales: 'Núm. reales',
  zona_porcentajes: 'Porcentajes',
  zona_factorizacion: 'Factorización',
  parcial_cavernas: 'Parcial 1',
  zona_ecuaciones: 'Ecuaciones',
  zona_funciones: 'Funciones',
  zona_lineal: 'F. Lineal',
  rampa_pendientes: 'Pendientes',
  zona_sistemas: 'Sistemas',
  zona_cuadratica: 'Cuadrática',
  campo_proyectiles: 'Proyectiles',
  zona_ecuacionesCuadraticas: 'Ec. Cuad.',
  zona_ondas: 'Ondas',
  parcial_bosque: 'Parcial 2',
  zona_medidas: 'Medidas',
  zona_pitagoras: 'Pitágoras',
  puente_pitagoras: 'P. Pitágoras',
  zona_tales: 'Tales',
  zona_unidades: 'Unidades',
  zona_transformaciones: 'Transform.',
  zona_plano: 'Plano',
  campo_coordenadas: 'Coordenadas',
  parcial_ciudadela: 'Parcial 3',
  final: 'El Divisor'
};

const LABEL_ABOVE = new Set([
  'zona_funciones',
  'zona_sistemas',
  'zona_ecuacionesCuadraticas',
  'puente_pitagoras',
  'zona_unidades',
  'campo_coordenadas'
]);

export interface OverworldOpts {
  save: SaveData;
  initialWorld?: string;
  onPlay(level: Level): void;
  onDojo?(topicId: string): void;
  onBack(): void;
  mount(el: HTMLElement, cleanup?: () => void): void;
}

/* ---------- Primitivas Pixel Art 16-bit de Escenografía ---------- */
function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const f = Math.floor(t * 9) % 2;
  ctx.fillStyle = '#0f0c18'; ctx.fillRect(x - 2, y - 1, 6, 11);
  ctx.fillStyle = '#6b4f35'; ctx.fillRect(x, y + 3, 2, 6);
  ctx.fillStyle = '#ff7b24'; ctx.fillRect(x - 1, y + f, 4, 4);
  ctx.fillStyle = '#fff099'; ctx.fillRect(x, y + 1 - f, 2, 2);
}

function drawPlateau(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  topCol: string, bodyCol: string, shadowCol: string, lipCol: string
): void {
  ctx.fillStyle = shadowCol;
  ctx.fillRect(x + 2, y + 3, w, h);
  ctx.fillStyle = bodyCol;
  ctx.fillRect(x, y + 2, w - 2, h - 4);
  ctx.fillStyle = topCol;
  ctx.fillRect(x + 2, y, w - 4, 3);
  ctx.fillStyle = lipCol;
  ctx.fillRect(x + 2, y + h - 3, w - 4, 3);
}

function drawOrganicLake(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  rimCol: string, shallowCol: string, deepCol: string, foamCol: string, t: number
): void {
  const bands = Math.max(4, Math.floor(h / 2));
  const wave = Math.floor(t * 2.5) % 2;

  for (let b = 0; b < bands; b++) {
    const v = ((b + 0.5) / bands) * 2 - 1;
    const sinW = Math.sqrt(Math.max(0.08, 1 - v * v));
    const wobble = Math.round(Math.sin(b * 1.4) * 3);
    const rw = Math.max(12, Math.round(w * sinW) + wobble);
    const rx = Math.round(x + (w - rw) / 2);
    const ry = y + b * 2;
    ctx.fillStyle = rimCol;
    ctx.fillRect(rx - 2, ry, rw + 4, 2);
  }

  for (let b = 1; b < bands - 1; b++) {
    const v = ((b + 0.5) / bands) * 2 - 1;
    const sinW = Math.sqrt(Math.max(0.08, 1 - v * v));
    const wobble = Math.round(Math.sin(b * 1.4) * 3);
    const rw = Math.max(10, Math.round((w - 4) * sinW) + wobble);
    const rx = Math.round(x + (w - rw) / 2);
    const ry = y + b * 2;
    ctx.fillStyle = shallowCol;
    ctx.fillRect(rx, ry, rw, 2);
  }

  for (let b = 2; b < bands - 2; b++) {
    const v = ((b + 0.5) / bands) * 2 - 1;
    const sinW = Math.sqrt(Math.max(0.05, 1 - v * v));
    const rw = Math.max(8, Math.round((w - 14) * sinW));
    const rx = Math.round(x + (w - rw) / 2);
    const ry = y + b * 2;
    ctx.fillStyle = deepCol;
    ctx.fillRect(rx, ry, rw, 2);
  }

  ctx.fillStyle = foamCol;
  for (let i = 0; i < 4; i++) {
    const wx = Math.round(x + w * (0.24 + i * 0.16) + ((i + wave) % 2) * 3);
    const wy = Math.round(y + h * (0.36 + (i % 2) * 0.24));
    ctx.fillRect(wx, wy, 5, 1);
  }
}

function drawCrystalCluster(ctx: CanvasRenderingContext2D, x: number, y: number, body: string, hi: string, sparkle: boolean): void {
  ctx.fillStyle = '#0f0c18';
  ctx.fillRect(x - 1, y - 4, 9, 8);
  ctx.fillStyle = body;
  ctx.fillRect(x + 2, y - 5, 3, 7);
  ctx.fillRect(x, y - 2, 2, 4);
  ctx.fillRect(x + 5, y - 3, 2, 5);
  ctx.fillStyle = sparkle ? '#fff8eb' : hi;
  ctx.fillRect(x + 3, y - 4, 1, 4);
  ctx.fillRect(x + 1, y - 1, 1, 2);
}

function drawBiomeBackdrop(ctx: CanvasRenderingContext2D, worldId: string, t: number): void {
  const th = COLOMBIA_WORLDS[worldId] ?? COLOMBIA_WORLDS.cavernas;
  const p = th.palette;

  // Cielo / bóveda en bandas pixeladas
  ctx.fillStyle = p.skyTop; ctx.fillRect(0, 0, 320, 44);
  ctx.fillStyle = p.skyBot; ctx.fillRect(0, 44, 320, 136);

  // Superficie base + texturas escalonadas
  ctx.fillStyle = p.ground; ctx.fillRect(0, 26, 320, 154);

  if (worldId === 'cavernas') {
    // Mesetas subterráneas con relieve esculpido
    drawPlateau(ctx, 18, 52, 286, 114, '#392f5c', '#2b2347', '#17122a', '#1e1836');
    drawPlateau(ctx, 76, 48, 108, 52, '#44386c', '#332a54', '#1b1530', '#241d40');
    drawPlateau(ctx, 232, 34, 80, 62, '#4a3d75', '#372d5b', '#1b1530', '#251e42');

    // Textura mineral en piso
    ctx.fillStyle = '#3f3566';
    for (let y = 38; y < 170; y += 18) {
      for (let x = ((y / 18) % 2) * 10 + 8; x < 310; x += 28) {
        ctx.fillRect(x, y, 5, 2);
        ctx.fillStyle = '#1b1530';
        ctx.fillRect(x + 1, y + 2, 4, 1);
        ctx.fillStyle = '#3f3566';
      }
    }

    // Estalactitas escalonadas de sal arriba
    for (let x = 0; x < 320; x += 14) {
      const h1 = 7 + ((x * 7) % 13);
      ctx.fillStyle = '#0f0c18'; ctx.fillRect(x, 0, 7, h1 + 1);
      ctx.fillStyle = '#cfd8ea'; ctx.fillRect(x, 0, 5, h1);
      ctx.fillStyle = '#8b99b5'; ctx.fillRect(x + 4, 0, 2, Math.max(2, h1 - 2));
    }

    // Estanque subterráneo superior derecho + Laguna sagrada de Guatavita abajo izquierda
    drawOrganicLake(ctx, 186, 20, 114, 24, '#56497a', '#196e52', '#104e3d', '#5df09a', t);
    drawOrganicLake(ctx, 14, 144, 130, 32, '#56497a', '#1b7a5a', '#104e3d', '#6bf5a5', t);

    // Balsa Muisca dorada navegando suavemente
    const by = 156 + (Math.floor(t * 1.6) % 2);
    ctx.fillStyle = '#0f0c18'; ctx.fillRect(88, by - 1, 22, 6);
    ctx.fillStyle = '#b57414'; ctx.fillRect(89, by, 20, 4);
    ctx.fillStyle = '#ffcf40'; ctx.fillRect(91, by - 1, 16, 2);
    ctx.fillStyle = '#fff8eb'; ctx.fillRect(97, by - 5, 4, 4);
    ctx.fillStyle = '#ffcf40'; ctx.fillRect(98, by - 6, 2, 1);

    // Catedral de Sal monumental escalonada (arriba izquierda)
    ctx.fillStyle = '#0f0c18'; ctx.fillRect(6, 28, 38, 32);
    ctx.fillStyle = '#9aa8c7'; ctx.fillRect(8, 30, 34, 28);
    ctx.fillStyle = '#dce4f2'; ctx.fillRect(10, 30, 30, 3);
    ctx.fillStyle = '#c4d0e6'; ctx.fillRect(12, 34, 5, 22); ctx.fillRect(31, 34, 5, 22);
    ctx.fillStyle = '#0c0916'; ctx.fillRect(18, 42, 12, 16);
    ctx.fillStyle = '#256c8f'; ctx.fillRect(22, 33, 4, 7);
    ctx.fillStyle = '#74e0ff'; ctx.fillRect(23, 34, 2, 6); ctx.fillRect(21, 35, 6, 2);
    ctx.fillStyle = '#e8fbff'; ctx.fillRect(23, 35, 2, 2);

    // Vía férrea con durmientes de madera y vagoneta con mineral de oro
    for (let rx = 148; rx < 306; rx += 6) {
      ctx.fillStyle = '#4a3222';
      ctx.fillRect(rx, 160, 3, 5);
    }
    ctx.fillStyle = '#6c7c99'; ctx.fillRect(146, 161, 162, 1);
    ctx.fillStyle = '#c2cfe0'; ctx.fillRect(146, 163, 162, 1);
    const vx = 216 + Math.round(Math.sin(t * 0.9) * 14);
    ctx.fillStyle = '#0f0c18'; ctx.fillRect(vx - 1, 148, 18, 13);
    ctx.fillStyle = '#7d563c'; ctx.fillRect(vx, 151, 16, 7);
    ctx.fillStyle = '#ffcf40'; ctx.fillRect(vx + 2, 149, 12, 3);
    ctx.fillStyle = '#fff8eb'; ctx.fillRect(vx + 5, 148, 4, 2);
    ctx.fillStyle = '#1c1829'; ctx.fillRect(vx + 2, 158, 3, 3); ctx.fillRect(vx + 11, 158, 3, 3);

    // Antorchas y drusas de cristal facetado
    drawTorch(ctx, 48, 44, t);
    drawTorch(ctx, 180, 48, t + 0.5);
    const spark = Math.floor(t * 4) % 4;
    drawCrystalCluster(ctx, 78, 52, '#f5c542', '#fff099', spark === 0);
    drawCrystalCluster(ctx, 160, 122, '#2ecc71', '#98f5be', spark === 1);
    drawCrystalCluster(ctx, 248, 136, '#f5c542', '#fff099', spark === 2);
    drawCrystalCluster(ctx, 296, 114, '#38bdf8', '#b8ecff', spark === 3);
  } else if (worldId === 'bosque') {
    // Picos nevados del Cocuy al fondo
    for (let x = 0; x < 320; x += 40) {
      ctx.fillStyle = '#163327';
      ctx.beginPath(); ctx.moveTo(x, 34); ctx.lineTo(x + 20, 4); ctx.lineTo(x + 40, 34); ctx.fill();
      ctx.fillStyle = '#e8edf5';
      ctx.beginPath(); ctx.moveTo(x + 14, 13); ctx.lineTo(x + 20, 4); ctx.lineTo(x + 26, 13); ctx.fill();
    }

    // Terrazas boscosas de Chingaza
    drawPlateau(ctx, 12, 34, 296, 138, '#2d7a4c', '#1e5737', '#113522', '#17432a');
    drawPlateau(ctx, 84, 30, 144, 42, '#358c57', '#246640', '#133b25', '#1a4c30');

    // Laguna sagrada de Chingaza + cascada animada + puente
    drawOrganicLake(ctx, 136, 140, 128, 34, '#3d704f', '#1a759f', '#124e70', '#c4f1ff', t);
    ctx.fillStyle = '#0f384f'; ctx.fillRect(182, 34, 14, 108);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(184, 34, 10, 108);
    const fall = Math.floor(t * 8) % 4;
    ctx.fillStyle = '#fff8eb';
    for (let y = 38 + fall * 4; y < 140; y += 16) ctx.fillRect(186, y, 6, 4);

    ctx.fillStyle = '#0f0c18'; ctx.fillRect(177, 85, 24, 8);
    ctx.fillStyle = '#855832'; ctx.fillRect(178, 86, 22, 6);
    ctx.fillStyle = '#d99e43'; ctx.fillRect(178, 86, 22, 2);

    // Frailejones en flor
    const sway = Math.floor(t * 2) % 2;
    [[16, 56], [56, 148], [94, 54], [156, 44], [266, 152], [304, 92]].forEach(([fx, fy]) => {
      ctx.fillStyle = '#5c4632'; ctx.fillRect(fx + 2, fy + 6, 3, 8);
      ctx.fillStyle = '#87b880'; ctx.fillRect(fx + sway, fy, 7, 7);
      ctx.fillStyle = '#ffcf40'; ctx.fillRect(fx + 2 + sway, fy - 3, 3, 3);
    });

    // Luciérnagas luminosas
    for (let i = 0; i < 10; i++) {
      const lx = Math.round(((i * 47 + t * 8) % 310) + 4);
      const ly = Math.round(36 + ((i * 29) % 120) + Math.sin(t * 3 + i) * 4);
      ctx.fillStyle = Math.sin(t * 5 + i) > 0 ? '#fff099' : '#4ecb71';
      ctx.fillRect(lx, ly, 2, 2);
    }
  } else if (worldId === 'ciudadela') {
    // Plazas escalonadas de Cartagena & Barichara
    drawPlateau(ctx, 8, 30, 304, 124, '#3e487a', '#2b325c', '#171b36', '#212748');
    drawPlateau(ctx, 108, 48, 128, 80, '#4a558c', '#343c6e', '#1c2140', '#272e56');

    // Murallas coloniales con garitas + banderines colombianos
    ctx.fillStyle = '#d4c5a9'; ctx.fillRect(0, 18, 320, 14);
    ctx.fillStyle = '#a84332';
    for (let x = 0; x < 320; x += 20) ctx.fillRect(x, 12, 14, 6);
    for (let x = 14; x < 310; x += 18) {
      ctx.fillStyle = x % 3 === 0 ? '#ffcf40' : x % 2 === 0 ? '#38bdf8' : '#e84a5f';
      ctx.fillRect(x, 22, 6, 4);
    }

    // Torre del Reloj colonial
    ctx.fillStyle = '#0f0c18'; ctx.fillRect(8, 19, 26, 42);
    ctx.fillStyle = '#e8dec8'; ctx.fillRect(10, 26, 22, 34);
    ctx.fillStyle = '#b54935'; ctx.fillRect(8, 20, 26, 7);
    ctx.fillStyle = '#fff8eb'; ctx.fillRect(16, 32, 10, 10);
    ctx.fillStyle = '#0f0c18'; ctx.fillRect(20, 34, 2, 4); ctx.fillRect(20, 36, 4, 2);

    // Canal caribeño orgánico + puente arco de piedra
    drawOrganicLake(ctx, 6, 146, 308, 32, '#9c8f78', '#2272a8', '#154d78', '#9be2ff', t);
    ctx.fillStyle = '#0f0c18'; ctx.fillRect(112, 144, 60, 14);
    ctx.fillStyle = '#d4c5a9'; ctx.fillRect(114, 146, 56, 12);
    ctx.fillStyle = '#2272a8'; ctx.fillRect(126, 152, 32, 8);

    // Casitas coloniales y antorchas
    [[54, 40], [136, 40], [202, 42], [292, 122]].forEach(([cx, cy]) => {
      ctx.fillStyle = '#0f0c18'; ctx.fillRect(cx - 3, cy - 1, 22, 18);
      ctx.fillStyle = '#f4ecdc'; ctx.fillRect(cx, cy + 6, 16, 10);
      ctx.fillStyle = '#b54935'; ctx.fillRect(cx - 2, cy, 20, 6);
      ctx.fillStyle = '#263359'; ctx.fillRect(cx + 6, cy + 10, 4, 6);
    });
    drawTorch(ctx, 112, 134, t);
    drawTorch(ctx, 170, 134, t + 0.5);
  } else {
    // Desierto Cósmico de la Tatacoa
    ctx.fillStyle = '#0b0517'; ctx.fillRect(0, 0, 320, 180);
    for (let i = 0; i < 52; i++) {
      const sx = (i * 73 + 17) % 316, sy = (i * 41 + 9) % 172;
      ctx.fillStyle = (Math.floor(t * 3 + i) % 3 === 0) ? '#fff099' : '#967dc4';
      ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
    }
    drawPlateau(ctx, 58, 52, 204, 88, '#913829', '#6b281f', '#36120e', '#4d1b15');
    drawPlateau(ctx, 90, 64, 140, 62, '#b84c37', '#8a3324', '#4a1912', '#61231a');
    drawPlateau(ctx, 114, 76, 92, 38, '#d46348', '#a84332', '#592017', '#752b20');

    // Observatorio astronómico
    ctx.fillStyle = '#0f0c18'; ctx.fillRect(24, 92, 28, 36);
    ctx.fillStyle = '#dfe6f2'; ctx.fillRect(26, 108, 24, 18);
    ctx.fillStyle = '#fff8eb'; ctx.fillRect(28, 98, 20, 10);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(36, 94, 8, 4);

    // Cactus candelabro
    [[268, 112], [288, 72]].forEach(([cx, cy]) => {
      ctx.fillStyle = '#3ba362';
      ctx.fillRect(cx, cy, 4, 16);
      ctx.fillRect(cx - 4, cy + 4, 4, 3); ctx.fillRect(cx - 4, cy + 1, 2, 4);
      ctx.fillRect(cx + 4, cy + 6, 4, 3); ctx.fillRect(cx + 6, cy + 3, 2, 4);
    });
  }
}

function drawMarioPath(ctx: CanvasRenderingContext2D, a: NodeCoord, b: NodeCoord, unlocked: boolean, t: number): void {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(4, Math.floor(dist / 7));

  // Calzada continua de fondo para máximo contraste sobre cualquier bioma
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f0c18';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

  ctx.strokeStyle = unlocked ? '#c9881d' : '#5e5282';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.restore();

  // Adoquines pixelados individuales iluminados
  for (let i = 1; i < steps; i++) {
    const u = i / steps;
    const px = Math.round(a.x + dx * u);
    const py = Math.round(a.y + dy * u);
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(px - 4, py - 3, 8, 6);
    if (unlocked) {
      const pulse = (Math.floor(t * 7) % steps) === i;
      ctx.fillStyle = pulse ? '#fff8eb' : '#ffcf40';
      ctx.fillRect(px - 3, py - 2, 6, 4);
      ctx.fillStyle = '#ffe994';
      ctx.fillRect(px - 2, py - 2, 4, 1);
    } else {
      ctx.fillStyle = '#8b7fb3';
      ctx.fillRect(px - 3, py - 2, 6, 4);
      ctx.fillStyle = '#b4a9d9';
      ctx.fillRect(px - 2, py - 2, 4, 1);
    }
  }
}

function drawMarioNode(ctx: CanvasRenderingContext2D, lvl: Level, pos: NodeCoord, done: boolean, avail: boolean, sel: boolean, mastery: number, t: number): void {
  const x = Math.round(pos.x), y = Math.round(pos.y);

  // Pedestal base pixelado bajo cada nodo
  ctx.fillStyle = '#0f0c18';
  ctx.fillRect(x - 10, y + 3, 20, 6);
  ctx.fillStyle = '#473d6b';
  ctx.fillRect(x - 9, y + 4, 18, 4);

  if (lvl.boss) {
    // Fortaleza / Castillo de Jefe 16-bit con torres laterales y alto contraste
    const cx = x - 13, cy = y - 14;
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(cx - 1, cy - 1, 28, 25);
    ctx.fillRect(cx - 4, cy + 3, 6, 20);
    ctx.fillRect(cx + 24, cy + 3, 6, 20);

    const wall = done ? '#2ea85c' : avail ? '#e04f44' : '#7a6ba3';
    const hi = done ? '#6ee89a' : avail ? '#ff8b7d' : '#b4a7d6';
    const dark = done ? '#1a6636' : avail ? '#912920' : '#4a406b';

    // Torres laterales y cuerpo central
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 3, cy + 4, 5, 18);
    ctx.fillRect(cx + 24, cy + 4, 5, 18);
    ctx.fillStyle = wall;
    ctx.fillRect(cx, cy + 4, 26, 19);
    ctx.fillRect(cx, cy, 6, 4); ctx.fillRect(cx + 10, cy, 6, 4); ctx.fillRect(cx + 20, cy, 6, 4);
    ctx.fillStyle = hi;
    ctx.fillRect(cx, cy, 6, 1); ctx.fillRect(cx + 10, cy, 6, 1); ctx.fillRect(cx + 20, cy, 6, 1);
    ctx.fillRect(cx - 3, cy + 4, 4, 2); ctx.fillRect(cx + 25, cy + 4, 4, 2);

    // Ventanas y puerta arqueada
    ctx.fillStyle = avail && !done ? '#fff099' : '#c8c0e0';
    ctx.fillRect(cx + 4, cy + 8, 3, 4);
    ctx.fillRect(cx + 19, cy + 8, 3, 4);
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(cx + 10, cy + 13, 6, 10);
    ctx.fillRect(cx + 11, cy + 12, 4, 1);

    if (avail && !done) {
      const f = Math.floor(t * 8) % 2;
      ctx.fillStyle = f ? '#fff099' : '#ff7b24';
      ctx.fillRect(cx + 6, cy + 13, 2, 3);
      ctx.fillRect(cx + 18, cy + 13, 2, 3);
    }

    const wave = Math.floor(t * 5) % 2;
    ctx.fillStyle = '#fff8eb'; ctx.fillRect(x, cy - 10, 1, 10);
    ctx.fillStyle = done ? '#4ecb71' : avail ? '#ffcf40' : '#a89cc8';
    ctx.fillRect(x + 1, cy - 10 + wave, 8, 4);
  } else {
    // Medallón octogonal de alto contraste
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(x - 9, y - 6, 18, 12);
    ctx.fillRect(x - 7, y - 8, 14, 16);

    const fill = done
      ? '#2ea85c'
      : avail
        ? (Math.floor(t * 3) % 2 === 0 ? '#ffcf40' : '#e69f1e')
        : '#6c6094';
    const rim = done ? '#7ff5aa' : avail ? '#fff8eb' : '#a89cc8';

    ctx.fillStyle = rim;
    ctx.fillRect(x - 7, y - 5, 14, 10);
    ctx.fillRect(x - 5, y - 7, 10, 14);
    ctx.fillStyle = fill;
    ctx.fillRect(x - 6, y - 4, 12, 8);
    ctx.fillRect(x - 4, y - 6, 8, 12);

    // Detalle interior según estado
    if (done) {
      ctx.fillStyle = '#a8ffd0';
      ctx.fillRect(x - 3, y - 4, 5, 2);
      ctx.fillStyle = '#fff099'; ctx.fillRect(x + 5, y - 14, 1, 10);
      ctx.fillStyle = '#4ecb71'; ctx.fillRect(x + 6, y - 14, 6, 4);
      const sc = mastery >= 0.9 ? 3 : mastery >= 0.7 ? 2 : 1;
      for (let i = 0; i < sc; i++) {
        ctx.fillStyle = '#0f0c18'; ctx.fillRect(x - 6 + i * 4, y + 7, 4, 4);
        ctx.fillStyle = '#ffcf40'; ctx.fillRect(x - 5 + i * 4, y + 8, 3, 2);
      }
    } else if (avail) {
      ctx.fillStyle = '#fff8eb';
      ctx.fillRect(x - 3, y - 4, 4, 2);
      if (lvl.bonus) {
        ctx.fillStyle = '#fff099'; ctx.fillRect(x - 1, y - 12, 3, 3);
      }
    } else {
      // Candado pixelado nítido sobre nodos bloqueados
      ctx.fillStyle = '#fff8eb';
      ctx.fillRect(x - 2, y - 4, 4, 1);
      ctx.fillRect(x - 2, y - 3, 1, 2);
      ctx.fillRect(x + 1, y - 3, 1, 2);
      ctx.fillStyle = '#ffcf40';
      ctx.fillRect(x - 3, y - 1, 6, 4);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(x - 1, y, 2, 2);
    }
  }

  // Cursor parpadeante Nintendo en el nodo seleccionado
  if (sel) {
    const b = Math.floor(t * 6) % 2;
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(x - 13 - b, y - 11 - b, 7, 3);
    ctx.fillRect(x + 6 + b, y - 11 - b, 7, 3);
    ctx.fillStyle = '#fff099';
    ctx.fillRect(x - 12 - b, y - 10 - b, 5, 2); ctx.fillRect(x - 12 - b, y - 10 - b, 2, 5);
    ctx.fillRect(x + 7 + b, y - 10 - b, 5, 2);  ctx.fillRect(x + 10 + b, y - 10 - b, 2, 5);
    ctx.fillRect(x - 12 - b, y + 8 + b, 5, 2);  ctx.fillRect(x - 12 - b, y + 5 + b, 2, 5);
    ctx.fillRect(x + 7 + b, y + 8 + b, 5, 2);   ctx.fillRect(x + 10 + b, y + 5 + b, 2, 5);
  }
}

export function showPixelOverworld(opts: OverworldOpts): void {
  const { save, onPlay, onDojo, onBack, mount } = opts;
  const hero = heroById[save.profile.heroId];

  let currentWorld = opts.initialWorld ?? 'cavernas';
  if (!opts.initialWorld) {
    for (const w of worlds) {
      const ls = levels.filter(l => l.world === w.id || (w.id === 'vacio' && l.final));
      if (ls.some(l => isAvailable(save, l) && !isCleared(save, l.id))) {
        currentWorld = w.id;
        break;
      }
    }
  }

  let selectedId = '';
  const heroActor = new ActorClass(heroSprite(hero), 54, 126, 1);
  let heroX = 54, heroY = 126, targetX = 54, targetY = 126;
  let elapsed = 0;
  let irisLevel: Level | null = null;
  let irisTimer = 0;

  const cv = h('canvas', { width: 320, height: 180, class: 'ow-pixel-canvas', 'aria-label': 'Mapa del mundo pixel art' }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Capa de píldoras HTML nítidas sobre todos los nodos del mapa
  const labelsLayer = h('div', { class: 'ow-labels-layer' });

  const topBar = h('div', { class: 'ow-topbar' });
  const tabsEl = h('div', { class: 'ow-world-tabs' });
  const stagePanel = h('div', { class: 'ow-stage-panel' });
  const hintBar = h('div', { class: 'ow-controls-hint' }, '←/→ o toca un nodo para caminar · Enter / segundo toque para entrar · 📖 Dojo Visual para practicar antes');

  const root = h('div', { class: 'screen wide overworld-screen' },
    topBar,
    tabsEl,
    h('div', { class: 'ow-canvas-frame' }, cv, labelsLayer),
    stagePanel,
    hintBar
  );

  function worldLevels(): Level[] {
    return levels.filter(l => l.world === currentWorld || (currentWorld === 'vacio' && l.final))
      .sort((a, b) => (a.bonus ? 1 : 0) - (b.bonus ? 1 : 0) || (a.order ?? 99) - (b.order ?? 99));
  }

  function launchLevel(lvl: Level): void {
    if (irisLevel) return;
    sfx('ok');
    irisLevel = lvl;
    irisTimer = 0.34;
  }

  function syncSelection(snapHero = false): void {
    const ls = worldLevels();
    if (!ls.some(l => l.id === selectedId)) {
      const def = ls.find(l => isAvailable(save, l) && !isCleared(save, l.id)) ?? ls.find(l => isAvailable(save, l)) ?? ls[0];
      selectedId = def?.id ?? '';
    }
    const layout = MAP_LAYOUT[currentWorld] ?? MAP_LAYOUT.cavernas;
    const pos = layout.nodes[selectedId] ?? { x: 160, y: 96 };
    targetX = pos.x; targetY = pos.y;
    if (snapHero) { heroX = targetX; heroY = targetY; }
    renderUI();
  }

  function selectWorld(wId: string): void {
    if (irisLevel) return;
    currentWorld = wId;
    sfx('click');
    playMusic('overworld', 0);
    playAmbient(wId);
    syncSelection(true);
  }

  function selectLevel(id: string): void {
    if (irisLevel) return;
    const lvl = worldLevels().find(l => l.id === id);
    if (!lvl || !isAvailable(save, lvl)) { sfx('bad'); return; }
    if (selectedId === id) { launchLevel(lvl); return; }
    selectedId = id;
    sfx('step');
    syncSelection(false);
  }

  function renderUI(): void {
    const theme = COLOMBIA_WORLDS[currentWorld] ?? COLOMBIA_WORLDS.cavernas;
    const ls = worldLevels();
    const selLvl = ls.find(l => l.id === selectedId) ?? ls[0];
    const layout = MAP_LAYOUT[currentWorld] ?? MAP_LAYOUT.cavernas;

    topBar.replaceChildren(
      h('button', { class: 'pbtn small ghost', onclick: () => { sfx('click'); onBack(); } }, '← Menú'),
      h('div', { class: 'ow-world-title' },
        h('span', { class: 'ow-badge' }, theme.region.toUpperCase()),
        h('h2', { class: 'ow-title-text' }, theme.title)
      ),
      h('div', { class: 'ow-hero-badge' }, spriteCanvas(heroSprite(hero), 2, 'idle'), h('span', {}, save.profile.name))
    );

    tabsEl.replaceChildren(...worlds.map((w, idx) => {
      const wTheme = COLOMBIA_WORLDS[w.id];
      const wLs = levels.filter(l => l.world === w.id || (w.id === 'vacio' && l.final));
      const cleared = wLs.filter(l => isCleared(save, l.id)).length;
      const locked = !wLs.some(l => isAvailable(save, l));
      return h('button', {
        class: `ow-tab${w.id === currentWorld ? ' active' : ''}${locked ? ' locked' : ''}`,
        style: { '--wc': wTheme?.palette.accent ?? '#f5c542' } as any,
        disabled: locked,
        onclick: () => selectWorld(w.id)
      },
        h('span', { class: 'ow-tab-icon' }, locked ? '🔒' : `M${idx + 1}`),
        h('div', { class: 'ow-tab-info' },
          h('b', {}, wTheme?.title ?? w.name),
          h('small', { class: 'muted' }, `${cleared}/${wLs.length} zonas`)
        )
      );
    }));

    // Renderizar píldoras HTML nítidas para todos los nodos del mundo actual
    let zoneNum = 0;
    const pills = ls.map(lvl => {
      const avail = isAvailable(save, lvl);
      const done = isCleared(save, lvl.id);
      const isSel = lvl.id === selectedId;
      const topDef = topicById[lvl.topic];
      const mast = topDef ? masteryOf(save, topDef.id) : 0;
      const starsCount = done ? (mast >= 0.9 ? 3 : mast >= 0.7 ? 2 : 1) : 0;
      const badgeTxt = lvl.boss ? '👑' : String(++zoneNum);
      const pos = layout.nodes[lvl.id] ?? { x: 160, y: 96 };
      const above = LABEL_ABOVE.has(lvl.id);
      const yOffset = above ? -22 : (lvl.boss ? 16 : 13);
      const leftPct = Math.max(12, Math.min(88, (pos.x / 320) * 100));
      const topPct = Math.max(4, Math.min(88, ((pos.y + yOffset) / 180) * 100));
      const shortLabel = SHORT_NAMES[lvl.id] ?? lvl.name;

      const children: (string | Node)[] = [
        h('span', { class: 'ow-pill-idx' }, badgeTxt),
        h('span', { class: 'ow-pill-txt' }, shortLabel)
      ];
      if (starsCount > 0) children.push(h('span', { class: 'ow-stars' }, '★'.repeat(starsCount)));

      return h('button', {
        type: 'button',
        class: `ow-node-pill${isSel ? ' selected' : ''}${done ? ' done' : avail ? ' avail' : ' locked'}`,
        style: { left: `${leftPct}%`, top: `${topPct}%` } as any,
        title: lvl.name,
        onclick: () => selectLevel(lvl.id)
      }, ...children);
    });
    labelsLayer.replaceChildren(...pills);

    if (selLvl) {
      const avail = isAvailable(save, selLvl);
      const done = isCleared(save, selLvl.id);
      const topDef = topicById[selLvl.topic];
      const mId = selLvl.rooms.find(r => r.monster)?.monster;
      const mon = mId ? monsterById[mId] : null;
      const mast = topDef ? masteryOf(save, topDef.id) : 0;

      stagePanel.replaceChildren(
        h('div', { class: 'ow-stage-media' },
          mon ? spriteCanvas(monsterSprite(mon), 3, 'idle') : null,
          h('div', { class: 'ow-stage-badges' },
            h('span', { class: `ow-status-badge ${done ? 'done' : avail ? 'avail' : 'lock'}` },
              done ? '✓ SUPERADO' : avail ? '★ DISPONIBLE' : '🔒 BLOQUEADO'
            ),
            selLvl.boss ? h('span', { class: 'ow-boss-badge' }, selLvl.final ? 'JEFE FINAL' : 'PARCIAL') : null
          )
        ),
        h('div', { class: 'ow-stage-info' },
          h('h3', { class: 'ow-stage-title' }, selLvl.name),
          h('p', { class: 'ow-stage-desc' }, topDef ? `Tema: ${topDef.name} · Guardián: ${mon?.name ?? theme.guardian}` : `Jefe de región: ${theme.guardian}`),
          topDef && !selLvl.boss ? h('div', { class: 'ow-mastery-wrap' },
            h('div', { class: 'ow-mastery-label' }, h('span', {}, 'Dominio del tema'), h('b', {}, pct(mast))),
            h('div', { class: 'bar' }, h('i', { style: { width: pct(mast) } }))
          ) : null
        ),
        h('div', { class: 'ow-stage-actions' },
          onDojo && topDef && !selLvl.boss ? h('button', {
            class: 'pbtn small ghost',
            onclick: () => { sfx('click'); onDojo(topDef.id); }
          }, '📖 Dojo Visual') : null,
          h('button', {
            class: `pbtn ow-play-btn${done ? ' ghost' : ''}`,
            disabled: !avail,
            onclick: () => launchLevel(selLvl)
          }, done ? '↺ Repetir' : '⚔ ¡Entrar!')
        )
      );
    }
  }

  cv.addEventListener('pointerdown', (e: PointerEvent) => {
    const r = cv.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 320;
    const py = ((e.clientY - r.top) / r.height) * 180;
    const layout = MAP_LAYOUT[currentWorld] ?? MAP_LAYOUT.cavernas;
    let bestId = '', bestD = 26;
    for (const lvl of worldLevels()) {
      const pos = layout.nodes[lvl.id];
      if (!pos) continue;
      const d = Math.hypot(px - pos.x, py - pos.y);
      if (d < bestD) { bestD = d; bestId = lvl.id; }
    }
    if (bestId) selectLevel(bestId);
  });

  function onKeyDown(e: KeyboardEvent): void {
    if (irisLevel) return;
    const ls = worldLevels().filter(l => isAvailable(save, l));
    if (!ls.length) return;
    const idx = ls.findIndex(l => l.id === selectedId);
    const k = e.key.toLowerCase();
    if (k === 'arrowright' || k === 'd') {
      e.preventDefault();
      selectedId = ls[(idx + 1) % ls.length].id;
      sfx('step'); syncSelection(false);
    } else if (k === 'arrowleft' || k === 'a') {
      e.preventDefault();
      selectedId = ls[(idx - 1 + ls.length) % ls.length].id;
      sfx('step'); syncSelection(false);
    } else if (k === 'enter' || k === ' ') {
      e.preventDefault();
      const lvl = ls.find(l => l.id === selectedId);
      if (lvl) launchLevel(lvl);
    }
  }

  window.addEventListener('keydown', onKeyDown);

  let stopTick: (() => void) | null = null;
  mount(root, () => {
    window.removeEventListener('keydown', onKeyDown);
    stopTick?.(); stopTick = null;
  });

  playMusic('overworld', 0);
  playAmbient(currentWorld);
  syncSelection(true);

  stopTick = ticker.add((rawDt: number) => {
    const dt = Math.min(0.05, rawDt / 1000);
    elapsed += dt;

    const dx = targetX - heroX, dy = targetY - heroY;
    const dist = Math.hypot(dx, dy);
    const walking = dist > 1.5;
    if (walking) {
      const sp = 120 * dt;
      heroX += (dx / dist) * Math.min(sp, dist);
      heroY += (dy / dist) * Math.min(sp, dist);
      heroActor.flip = dx < 0;
    }
    heroActor.step(rawDt);

    ctx.clearRect(0, 0, 320, 180);
    drawBiomeBackdrop(ctx, currentWorld, elapsed);

    const layout = MAP_LAYOUT[currentWorld] ?? MAP_LAYOUT.cavernas;
    for (const [aId, bId] of layout.edges) {
      const a = layout.nodes[aId], b = layout.nodes[bId];
      if (a && b) drawMarioPath(ctx, a, b, isCleared(save, aId), elapsed);
    }

    const ls = worldLevels();
    for (const lvl of ls) {
      const pos = layout.nodes[lvl.id];
      if (!pos) continue;
      const m = topicById[lvl.topic] ? masteryOf(save, lvl.topic) : 1;
      drawMarioNode(ctx, lvl, pos, isCleared(save, lvl.id), isAvailable(save, lvl), lvl.id === selectedId, m, elapsed);
    }

    const bob = walking ? Math.abs(Math.sin(elapsed * 16)) * 3 : Math.sin(elapsed * 4) * 1;
    heroActor.x = Math.round(heroX - 16);
    heroActor.y = Math.round(heroY - 26 - bob);
    heroActor.dirty = true;
    heroActor.draw(ctx);

    // Cortinilla circular 16-bit (Iris Wipe) al entrar al nivel
    if (irisLevel) {
      irisTimer -= dt;
      const p = Math.max(0, irisTimer / 0.34);
      const rad = p * 220;
      ctx.save();
      ctx.fillStyle = '#0f0c18';
      ctx.beginPath();
      ctx.rect(0, 0, 320, 180);
      ctx.arc(Math.round(heroX), Math.round(heroY - 12), rad, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.restore();
      if (irisTimer <= 0) {
        const goLvl = irisLevel;
        irisLevel = null;
        onPlay(goLvl);
      }
    }
  });
}
