# Juego Mate: datos de diseño

Dungeon pixel art de matemáticas (primer semestre de pensamiento matemático). Esta carpeta contiene el diseño convertido en datos listos para el código.

## Estructura

- `data/` JSON del juego: mundos, temas (con plantillas de pregunta), monstruos, héroes, cartas, logros, niveles de campaña, reglas del generador, máquina de estados del combate, tokens de interfaz, esquema de guardado y diálogos.
- `assets/sprites/` una hoja PNG por personaje y `atlas.json` con las animaciones (fila, cuadros, velocidad, repetición).
- `assets/palette.gpl` paleta para Aseprite, LibreSprite o GIMP; `assets/tokens.css` variables CSS.
- `assets/_preview_*.png` hojas de contacto para revisar los sprites a ojo.
- `assets/cards/` una hoja PNG por carta (8 cuadros de 64×40 de ilustración animada), `cards-atlas.json` y `frames/` con los marcos de carta (80×112) por tipo y rareza.
- `data/challenge-stages.json` los retos animados: la solución se ejecuta en el mundo (flecha por la parábola, rampa de pendiente, escalera de Pitágoras, hechizo al punto del plano, traslación y reflexión).
- `tools/design-data.js` fuente única del diseño. `tools/spritegen.js` dibujante procedural de sprites. `tools/cardart.js` ilustraciones y marcos de cartas. `tools/build.js` regenera todo.

## Regenerar

```
node tools/build.js
```

No requiere dependencias: usa solo Node.

## Sprites

Los sprites son de trabajo, generados por código. Para reemplazarlos por arte dibujado a mano basta mantener el formato: hoja de 5 columnas, una fila por animación (`idle`, `attack`, `hurt`, `die` y `win` en héroes), celdas de 32×32 (64×64 en jefes). Los monstruos miran a la izquierda y los héroes a la derecha.

## Cargar un monstruo en Phaser

```ts
const a = atlas['slime_fraccionario'];
this.load.spritesheet('slime', a.file, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
// en create():
for (const [name, an] of Object.entries(a.anims)) {
  this.anims.create({
    key: `slime-${name}`,
    frames: this.anims.generateFrameNumbers('slime', { start: an.start, end: an.start + an.frames - 1 }),
    frameRate: an.fps,
    repeat: an.loop ? -1 : 0
  });
}
```

## Cartas

Cada carta se compone de un marco (`frames/`) y una ilustración animada de 8 cuadros (`assets/cards/<id>.png`, 8 cuadros de 64×40 en una fila) que se coloca en (8, 18). Los textos (nombre, efecto, tipo) se dibujan en la interfaz con la fuente del juego, no en el PNG, para poder traducirlos. Las cartas raras o superiores llevan un destello holográfico que `CardArt.composite(card, t)` ya calcula.

## Retos animados

`data/challenge-stages.json` describe cada reto como una escena: héroe, monstruo, parámetros y los pasos de la animación. La respuesta elegida alimenta la animación (por ejemplo la flecha sigue y = −x² + 2·√k·x con el k elegido), de modo que el acierto y el error se ven. El Atlas contiene una implementación de referencia de cada uno.
