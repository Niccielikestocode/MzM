/* Genera data/*.json, assets/sprites/*.png, assets/sprites/atlas.json y assets/palette.gpl
 * Uso: node tools/build.js   (desde la carpeta del proyecto) */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const SG = require('./spritegen.js');
const D = require('./design-data.js');
const CA = require('./cardart.js');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const spriteDir = path.join(root, 'assets', 'sprites');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(spriteDir, { recursive: true });

/* ---------- PNG sin dependencias ---------- */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const writeJson = (name, obj) => fs.writeFileSync(path.join(dataDir, name), JSON.stringify(obj, null, 2) + '\n');

/* ---------- sprites ---------- */
const entities = [
  ...D.monsters.map((m) => ({ id: m.id, def: Object.assign({ kind: 'monster' }, m.sprite) })),
  ...D.heroes.map((h) => ({ id: h.id, def: Object.assign({}, h.sprite) }))
];
const atlas = {};
fs.writeFileSync(path.join(root, 'data', 'sprites.json'), JSON.stringify(Object.fromEntries(entities.map((e) => [e.id, e.def])), null, 1) + '\n');
for (const e of entities) {
  const sheet = SG.sheetRGBA(e.def);
  fs.writeFileSync(path.join(spriteDir, e.id + '.png'), png(sheet.width, sheet.height, sheet.data));
  atlas[e.id] = Object.assign({ file: 'assets/sprites/' + e.id + '.png', kind: e.def.kind, facing: e.def.facing || 'left' }, SG.atlasEntry(e.def));
}
fs.writeFileSync(path.join(spriteDir, 'atlas.json'), JSON.stringify(atlas, null, 2) + '\n');

/* hoja de contacto para revisar a ojo */
function contact(list, scale, name) {
  const frames = [['idle', 0], ['idle', 2], ['attack', 2], ['hurt', 0], ['die', 2]];
  const N = list[0].def.size, cell = N * scale, cols = N === 32 ? 3 : 2, pad = 6;
  const w = cols * (frames.length * cell + pad * 2), rows = Math.ceil(list.length / cols), h = rows * (cell + pad * 2);
  const buf = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { buf[i * 4] = 0x23; buf[i * 4 + 1] = 0x1c; buf[i * 4 + 2] = 0x36; buf[i * 4 + 3] = 255; }
  list.forEach((e, idx) => {
    const ox = (idx % cols) * (frames.length * cell + pad * 2) + pad, oy = Math.floor(idx / cols) * (cell + pad * 2) + pad;
    frames.forEach(([a, t], fi) => {
      const px = SG.frame(e.def, a, t);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = px[y * N + x]; if (!v) continue;
        const rgb = [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
          const o = ((oy + y * scale + sy) * w + ox + fi * cell + x * scale + sx) * 4;
          buf[o] = rgb[0]; buf[o + 1] = rgb[1]; buf[o + 2] = rgb[2];
        }
      }
    });
  });
  fs.writeFileSync(path.join(root, 'assets', name), png(w, h, buf));
}
contact(entities.filter((e) => e.def.size === 32), 3, '_preview_pequenos.png');
contact(entities.filter((e) => e.def.size === 64), 2, '_preview_jefes.png');


/* ---------- cartas: arte animado (8 cuadros de 64x40) y marcos 80x112 ---------- */
const cardDir = path.join(root, 'assets', 'cards');
fs.mkdirSync(path.join(cardDir, 'frames'), { recursive: true });
const hex2 = (v) => [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
function pixelsToPng(px, w, h) {
  const buf = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { const v = px[i]; if (!v) continue; const c = hex2(v); buf[i * 4] = c[0]; buf[i * 4 + 1] = c[1]; buf[i * 4 + 2] = c[2]; buf[i * 4 + 3] = 255; }
  return png(w, h, buf);
}
const frameKeys = new Set();
for (const c of D.cards) {
  const W8 = CA.ARTW * CA.FRAMES, sheet = new Array(W8 * CA.ARTH).fill(null);
  for (let t = 0; t < CA.FRAMES; t++) { const a = CA.art(c, t); for (let y = 0; y < CA.ARTH; y++) for (let x = 0; x < CA.ARTW; x++) sheet[y * W8 + t * CA.ARTW + x] = a[y * CA.ARTW + x]; }
  fs.writeFileSync(path.join(cardDir, c.id + '.png'), pixelsToPng(sheet, W8, CA.ARTH));
  c.artSheet = 'assets/cards/' + c.id + '.png';
  frameKeys.add(c.type + '_' + c.rarity + '|' + c.type + '|' + c.rarity + '|' + c.icon);
}
const frameList = [];
for (const k of frameKeys) {
  const [name, type, rarity] = k.split('|');
  fs.writeFileSync(path.join(cardDir, 'frames', name + '.png'), pixelsToPng(CA.frame(type, rarity, 'star'), CA.CW, CA.CH));
  if (!frameList.includes(name)) frameList.push(name);
}
fs.writeFileSync(path.join(cardDir, 'cards-atlas.json'), JSON.stringify({
  card: { width: CA.CW, height: CA.CH }, art: { width: CA.ARTW, height: CA.ARTH, frames: CA.FRAMES, fps: 8, x: 8, y: 18 },
  textZones: { name: { x: 10, y: 6, w: 60, h: 9 }, type: { x: 9, y: 69, w: 62, h: 7 }, effect: { x: 9, y: 76, w: 62, h: 24 }, footer: { x: 7, y: 103, w: 66, h: 6 }, badge: { cx: 14, cy: 64, r: 7 } },
  frames: frameList.map((n) => 'assets/cards/frames/' + n + '.png'),
  note: 'La carta = marco + hoja de arte animada en (art.x, art.y) + texto en las zonas. El insignia de tipo usa el glifo del tema.'
}, null, 2) + '\n');

/* ---------- datos ---------- */
const dialogues = {};
for (const m of D.monsters) {
  dialogues['dialogo.' + m.topic + '.intro'] = [
    { speaker: m.name, text: m.line },
    { speaker: 'heroe', text: 'Muy bien. Veamos qué sabes hacer.' }
  ];
}
writeJson('palette.json', D.palettes);
writeJson('worlds.json', D.worlds);
writeJson('topics.json', D.topics);
writeJson('monsters.json', D.monsters.map(({ sprite, ...rest }) => Object.assign({}, rest, { sprite: sprite.size === 64 ? 'boss' : 'normal', spriteSheet: 'assets/sprites/' + rest.id + '.png' })));
writeJson('heroes.json', D.heroes.map(({ sprite, ...rest }) => Object.assign({}, rest, { spriteSheet: 'assets/sprites/' + rest.id + '.png' })));
writeJson('cards.json', D.cards);
writeJson('achievements.json', D.achievements);
writeJson('levels.json', D.levels);
writeJson('challenge-stages.json', D.challengeStages);
writeJson('room-types.json', D.roomTypes);
writeJson('generator-rules.json', D.generatorRules);
writeJson('combat-fsm.json', D.combatFsm);
writeJson('ui-tokens.json', D.uiTokens);
writeJson('save-schema.json', D.saveSchema);
writeJson('dialogues.json', dialogues);
/* fuente completa para el atlas visual */
writeJson('_design-bundle.json', { palettes: D.palettes, worlds: D.worlds, topics: D.topics, monsters: D.monsters, heroes: D.heroes, cards: D.cards, levels: D.levels, challengeStages: D.challengeStages, roomTypes: D.roomTypes, fsm: D.combatFsm, ui: D.uiTokens, achievements: D.achievements });

/* paleta .gpl para Aseprite / GIMP / LibreSprite */
const seen = new Set(), lines = ['GIMP Palette', 'Name: Juego Mate', 'Columns: 8', '#'];
const addColor = (hex, name) => {
  hex = hex.toLowerCase(); if (seen.has(hex)) return; seen.add(hex);
  lines.push([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)].map((n) => String(n).padStart(3)).join(' ') + '  ' + name + ' ' + hex);
};
Object.entries(D.palettes).forEach(([k, v]) => (Array.isArray(v) ? v.forEach((h, i) => addColor(h, k + '-' + i)) : Object.entries(v).forEach(([n, h]) => addColor(h, 'ui-' + n))));
fs.writeFileSync(path.join(root, 'assets', 'palette.gpl'), lines.join('\n') + '\n');

/* tokens.css para la interfaz */
const css = [':root {'];
Object.entries(D.palettes.ui).forEach(([k, v]) => css.push('  --jm-' + k + ': ' + v + ';'));
D.worlds.forEach((w) => D.palettes[w.palette].forEach((h, i) => css.push('  --jm-' + w.id + '-' + i + ': ' + h + ';')));
css.push('  --jm-font-display: "Press Start 2P", monospace;', '  --jm-font-label: "Pixelify Sans", monospace;', '  --jm-font-body: "Atkinson Hyperlegible", system-ui, sans-serif;', '}');
fs.writeFileSync(path.join(root, 'assets', 'tokens.css'), css.join('\n') + '\n');

console.log('Sprites:', entities.length, '| niveles:', D.levels.length, '| cartas:', D.cards.length);
