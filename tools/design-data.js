/* Fuente única del diseño de Juego Mate.
 * `node tools/build.js` genera de aquí todos los JSON en data/ y los sprites en assets/.
 * Para cambiar un monstruo, una carta o un nivel se edita este archivo y se vuelve a ejecutar el build. */

var INK = '#14101f';

/* ---------------- paletas ---------------- */
var palettes = {
  ui: {
    ink: INK, panel: '#231c36', panel2: '#2f2648', paper: '#f3ead8', muted: '#a99fc0',
    ok: '#6fcf8f', bad: '#e0505a', hint: '#6fb7ff', hp: '#d9434f', xp: '#f2c14e', mana: '#5f8bff', gold: '#e0b84c'
  },
  cavernas: ['#120f1f', '#1f2b3a', '#2f4a5c', '#4f7d8a', '#8fc1b5', '#f2a541', '#ffd77a', '#e8e2d0'],
  bosque: ['#0e1a14', '#1d3a2a', '#2f6b3f', '#6fae55', '#c4e87a', '#e86ab5', '#8a3f9e', '#f3f0d6'],
  ciudadela: ['#15121f', '#2b2740', '#4b4470', '#8a82b8', '#d6cfa8', '#e0b84c', '#4fd1d9', '#f4f1e6'],
  vacio: ['#050308', '#150a1f', '#2a1245', '#5a2a8a', '#b04fd1', '#ff4f79', '#f4f1e6', '#14101f']
};

/* ---------------- mundos ---------------- */
var worlds = [
  {
    id: 'cavernas', order: 1, name: 'Cavernas numéricas', unit: 'Pensamiento numérico',
    mood: 'Cueva azul grisácea con antorchas ámbar y cristales que brillan',
    music: 'Percusión suave y eco, 80 bpm', palette: 'cavernas',
    background: { layers: ['cielo-roca', 'estalactitas', 'rocas-lejanas', 'suelo-ladrillo'], tile: 16, props: ['antorcha', 'cristal', 'charco'] },
    intro: 'Los números reales se desmoronaron y rodaron hasta lo profundo. Hay que recogerlos uno por uno.',
    zones: ['reales', 'porcentajes', 'factorizacion'], boss: 'parcial1'
  },
  {
    id: 'bosque', order: 2, name: 'Bosque de las funciones', unit: 'Pensamiento variacional',
    mood: 'Bosque verde oscuro con flores rosadas y luciérnagas; las ramas dibujan curvas',
    music: 'Flauta y arpa, 96 bpm', palette: 'bosque',
    background: { layers: ['cielo-noche', 'arboles-lejanos', 'arboles-cercanos', 'pasto'], tile: 16, props: ['flor', 'luciernaga', 'tronco-curvo'] },
    intro: 'Aquí las curvas cobraron vida. Cada camino es una función y cada cruce, una ecuación.',
    zones: ['ecuaciones', 'funciones', 'lineal', 'sistemas', 'cuadratica', 'ecuacionesCuadraticas', 'ondas'], boss: 'parcial2'
  },
  {
    id: 'ciudadela', order: 3, name: 'Ciudadela métrica', unit: 'Pensamiento métrico espacial',
    mood: 'Ciudad de piedra violeta de noche, ventanas doradas y hologramas cian',
    music: 'Sintetizador suave y bajo, 110 bpm', palette: 'ciudadela',
    background: { layers: ['cielo-estrellado', 'torres-lejanas', 'torres-cercanas', 'piso-cuadricula'], tile: 16, props: ['holograma', 'ventana', 'puente'] },
    intro: 'La ciudad se midió mal y nada encaja. Hay que volver a medir, mover y convertir.',
    zones: ['medidas', 'pitagoras', 'tales', 'unidades', 'transformaciones', 'plano'], boss: 'parcial3'
  },
  {
    id: 'vacio', order: 4, name: 'Vacío del Divisor', unit: 'Examen final',
    mood: 'Espacio violeta con un agujero negro; las estrellas se parten en dos',
    music: 'Bajo profundo y coros, 120 bpm', palette: 'vacio',
    background: { layers: ['estrellas', 'remolino', 'suelo-grieta'], tile: 16, props: ['fragmento-ecuacion'] },
    intro: 'Tres fragmentos de la ecuación abren la puerta. Del otro lado espera quien lo divide todo entre cero.',
    zones: [], boss: 'final'
  }
];

/* ---------------- temas, zonas y plantillas de pregunta ---------------- */
/* plantilla: [id, dificultadMinima, tipoDeEntrada]  */
var T = function (list) { return list.map(function (x) { return { id: x[0], minDifficulty: x[1], input: x[2] }; }); };
var topics = [
  { id: 'reales', name: 'Números reales', world: 'cavernas', emblem: 'frac', templates: T([['reales.recta.ubicar', 1, 'choice'], ['reales.fracciones.operar', 1, 'number'], ['reales.raices.simplificar', 2, 'expression'], ['reales.orden.comparar', 2, 'choice'], ['reales.potencias.reglas', 3, 'number']]) },
  { id: 'porcentajes', name: 'Porcentajes y variación', world: 'cavernas', emblem: 'pct', templates: T([['pct.de-cantidad', 1, 'number'], ['pct.aumento-descuento', 2, 'number'], ['pct.variacion', 3, 'number'], ['pct.hallar-base', 4, 'number']]) },
  { id: 'factorizacion', name: 'Factorización', world: 'cavernas', emblem: 'fact', templates: T([['fact.factor-comun', 1, 'expression'], ['fact.diferencia-cuadrados', 2, 'expression'], ['fact.trinomio', 3, 'expression'], ['fact.agrupacion', 4, 'expression']]) },
  { id: 'ecuaciones', name: 'Ecuaciones', world: 'bosque', emblem: 'eq', templates: T([['ec.lineal.una-incognita', 1, 'number'], ['ec.lineal.fracciones', 2, 'number'], ['ec.despejar-formula', 3, 'expression'], ['ec.problema-enunciado', 4, 'number']]) },
  { id: 'funciones', name: 'Funciones y gráficas', world: 'bosque', emblem: 'axes', templates: T([['fun.evaluar', 1, 'number'], ['fun.leer-grafica', 2, 'choice'], ['fun.dominio-rango', 3, 'choice'], ['fun.relacion-tabla-grafica', 4, 'choice']]) },
  { id: 'lineal', name: 'Función lineal', world: 'bosque', emblem: 'slope', templates: T([['lin.pendiente-dos-puntos', 1, 'number'], ['lin.interceptos', 2, 'point'], ['lin.ecuacion-recta', 3, 'expression'], ['lin.grafica-desde-ecuacion', 4, 'graph']]) },
  { id: 'sistemas', name: 'Sistemas de ecuaciones', world: 'bosque', emblem: 'cross', templates: T([['sis.interseccion-grafica', 1, 'point'], ['sis.sustitucion', 2, 'point'], ['sis.eliminacion', 3, 'point'], ['sis.problema-enunciado', 4, 'point']]) },
  { id: 'cuadratica', name: 'Función cuadrática', world: 'bosque', emblem: 'parab', templates: T([['cua.vertice', 1, 'point'], ['cua.apertura-interceptos', 2, 'choice'], ['cua.proyectil-altura-maxima', 3, 'number'], ['cua.grafica-desde-ecuacion', 4, 'graph']]) },
  { id: 'ecuacionesCuadraticas', name: 'Ecuaciones cuadráticas', world: 'bosque', emblem: 'root', templates: T([['ecc.factorizar', 1, 'point'], ['ecc.formula-general', 2, 'point'], ['ecc.discriminante', 3, 'choice'], ['ecc.completar-cuadrado', 4, 'expression']]) },
  { id: 'ondas', name: 'Ondas (opcional)', world: 'bosque', emblem: 'wave', optional: true, templates: T([['ond.amplitud-periodo', 1, 'number'], ['ond.leer-grafica-seno', 2, 'choice'], ['ond.desplazamiento', 3, 'number']]) },
  { id: 'medidas', name: 'Medidas, áreas y volúmenes', world: 'ciudadela', emblem: 'vol', templates: T([['med.perimetro', 1, 'number'], ['med.area-figuras', 2, 'number'], ['med.volumen-solidos', 3, 'number'], ['med.area-superficie', 4, 'number']]) },
  { id: 'pitagoras', name: 'Pitágoras', world: 'ciudadela', emblem: 'pyth', templates: T([['pit.hipotenusa', 1, 'number'], ['pit.cateto', 2, 'number'], ['pit.problema-escalera', 3, 'number'], ['pit.terna', 4, 'choice']]) },
  { id: 'tales', name: 'Tales y semejanza', world: 'ciudadela', emblem: 'similar', templates: T([['tal.proporcion-segmentos', 1, 'number'], ['tal.altura-por-sombra', 2, 'number'], ['tal.semejanza-triangulos', 3, 'number']]) },
  { id: 'unidades', name: 'Sistemas métricos y conversión', world: 'ciudadela', emblem: 'units', templates: T([['uni.conversion-longitud', 1, 'number'], ['uni.conversion-volumen-masa', 2, 'number'], ['uni.escalas', 3, 'number'], ['uni.cadena-conversion', 4, 'number']]) },
  { id: 'transformaciones', name: 'Traslación, rotación y reflexión', world: 'ciudadela', emblem: 'reflect', templates: T([['tra.traslacion-coord', 1, 'point'], ['tra.reflexion-eje', 2, 'point'], ['tra.rotacion-90', 3, 'point'], ['tra.composicion', 4, 'point']]) },
  { id: 'plano', name: 'Figuras en el plano cartesiano', world: 'ciudadela', emblem: 'grid', templates: T([['pla.ubicar-puntos', 1, 'point'], ['pla.punto-medio', 2, 'point'], ['pla.distancia-puntos', 3, 'number'], ['pla.area-poligono', 4, 'number']]) }
];

/* ---------------- monstruos ---------------- */
function col(body, shade, light, accent, extra) {
  return Object.assign({ body: body, shade: shade, light: light, accent: accent }, extra || {});
}
var monsters = [
  { id: 'slime_fraccionario', name: 'Slime Fraccionario', world: 'cavernas', topic: 'reales', hp: 12, questions: 3, difficulty: [1, 2],
    attack: { name: 'Salpicón partido', damage: 3, telegraph: 'Se parte en dos y salta' }, line: 'Soy un medio... ¡o un tercio! No me decido.',
    sprite: { archetype: 'slime', size: 32, colors: col('#6fd6b0', '#3f9c8a', '#c9fff0', '#f2a541', { emblem: 'frac' }) } },
  { id: 'goblin_mercader', name: 'Goblin Mercader', world: 'cavernas', topic: 'porcentajes', hp: 16, questions: 3, difficulty: [1, 3],
    attack: { name: 'Rebaja traicionera', damage: 4, telegraph: 'Agita un letrero de descuento' }, line: '¡Todo con 30% de descuento! Pero ¿cuánto pagas?',
    sprite: { archetype: 'humanoid', size: 32, colors: col('#8fbf4f', '#5a8a2f', '#c4e87a', '#f2a541', { cloth: '#b8742f', clothShade: '#7a4a1f', emblem: 'pct', glyph: '#ffd77a' }), opts: { hat: 'cap', prop: 'sack' } } },
  { id: 'golem_bloques', name: 'Golem de Bloques', world: 'cavernas', topic: 'factorizacion', hp: 22, questions: 4, difficulty: [2, 4],
    attack: { name: 'Puñetazo en bloque', damage: 5, telegraph: 'Junta los bloques en un solo puño' }, line: 'Para romperme tienes que separar mis factores.',
    sprite: { archetype: 'golem', size: 32, colors: col('#8a8fa6', '#555b75', '#c8cde0', '#f2a541', { emblem: 'fact' }) } },
  { id: 'rey_irracional', name: 'Rey Irracional', world: 'cavernas', topic: 'parcial1', boss: true, hp: 60, questions: 9, phases: ['reales', 'porcentajes', 'factorizacion'], difficulty: [2, 4],
    attack: { name: 'Decimales sin fin', damage: 6, telegraph: 'Su corona suelta cifras que no terminan' }, line: 'Mi reino no tiene fin ni patrón. ¡Cuenta, si puedes!',
    sprite: { archetype: 'ghost', size: 64, colors: col('#5f7fb8', '#34507f', '#b9d0ff', '#ffd77a', { emblem: 'pi' }), opts: { crown: true } } },

  { id: 'murcielago_balanza', name: 'Murciélago de la Balanza', world: 'bosque', topic: 'ecuaciones', hp: 14, questions: 3, difficulty: [1, 3],
    attack: { name: 'Picada desequilibrada', damage: 3, telegraph: 'Se inclina hacia un lado' }, line: 'Lo que hagas de un lado, hazlo del otro.',
    sprite: { archetype: 'bat', size: 32, colors: col('#9a5fd1', '#5e3a8a', '#d9b8ff', '#e86ab5', { emblem: 'eq' }) } },
  { id: 'espectro_graficador', name: 'Espectro Graficador', world: 'bosque', topic: 'funciones', hp: 16, questions: 3, difficulty: [1, 3],
    attack: { name: 'Eje helado', damage: 4, telegraph: 'Traza dos ejes que se cierran' }, line: 'Dame una x y te muestro una y.',
    sprite: { archetype: 'ghost', size: 32, colors: col('#b8e0c8', '#6fae90', '#f0fff6', '#e86ab5', { emblem: 'axes' }) } },
  { id: 'serpiente_pendiente', name: 'Serpiente de Pendiente', world: 'bosque', topic: 'lineal', hp: 18, questions: 4, difficulty: [1, 4],
    attack: { name: 'Mordida inclinada', damage: 4, telegraph: 'Sube la cabeza en línea recta' }, line: 'Subo dos, avanzo uno. ¿Qué tan empinada soy?',
    sprite: { archetype: 'serpent', size: 32, colors: col('#6fae55', '#2f6b3f', '#c4e87a', '#e86ab5', { emblem: 'slope' }) } },
  { id: 'gemelos_intersecados', name: 'Gemelos Intersecados', world: 'bosque', topic: 'sistemas', hp: 20, questions: 4, difficulty: [1, 4],
    attack: { name: 'Cruce de espadas', damage: 5, telegraph: 'Cruzan sus espadas en un punto' }, line: 'Somos dos rectas, pero solo nos encontramos una vez.',
    sprite: { archetype: 'twins', size: 32, colors: col('#e8a35f', '#a8642f', '#ffd9a8', '#e86ab5', { cloth: '#c0502f', clothShade: '#7a2f1f', emblem: 'cross', glyph: '#ffd9a8' }) } },
  { id: 'arquero_parabolico', name: 'Arquero Parabólico', world: 'bosque', topic: 'cuadratica', hp: 22, questions: 4, difficulty: [2, 4],
    attack: { name: 'Flecha en arco', damage: 5, telegraph: 'Apunta al cielo y suelta la flecha' }, line: 'Calcula mi vértice o la flecha te encuentra.',
    sprite: { archetype: 'humanoid', size: 32, colors: col('#f0c8a0', '#c08f6a', '#fde6cf', '#e86ab5', { cloth: '#2f8f5a', clothShade: '#1d5a3a', emblem: 'parab', glyph: '#c4e87a' }), opts: { hat: 'hood', prop: 'bow' } } },
  { id: 'dragon_raices', name: 'Dragón de Raíces', world: 'bosque', topic: 'ecuacionesCuadraticas', hp: 28, questions: 5, difficulty: [2, 4],
    attack: { name: 'Aliento de raíces', damage: 6, telegraph: 'Respira hondo, dos llamas listas' }, line: 'Tengo dos raíces. ¿Las encuentras o te quemo?',
    sprite: { archetype: 'dragon', size: 32, colors: col('#3fa86f', '#1f6b45', '#9af0b8', '#e86ab5', { emblem: 'root' }) } },
  { id: 'sirena_ondas', name: 'Sirena de Ondas', world: 'bosque', topic: 'ondas', hp: 20, questions: 3, difficulty: [1, 3],
    attack: { name: 'Canto ondulante', damage: 4, telegraph: 'Su canto sube y baja' }, line: 'Mi canto sube y baja. ¿Cuánto mide mi amplitud?',
    sprite: { archetype: 'siren', size: 32, colors: col('#f0c8a0', '#c08f6a', '#fde6cf', '#e86ab5', { cloth: '#4fa8d9', clothShade: '#2f6b9e', emblem: 'wave', glyph: '#d9fcff' }) } },
  { id: 'hidra_cuadratica', name: 'Hidra Cuadrática', world: 'bosque', topic: 'parcial2', boss: true, hp: 85, questions: 12, phases: ['ecuaciones', 'lineal', 'sistemas', 'cuadratica'], difficulty: [2, 4],
    attack: { name: 'Doble mordisco', damage: 7, telegraph: 'Sus dos cabezas apuntan a ti' }, line: 'Corta una cabeza y salen dos soluciones.',
    sprite: { archetype: 'dragon', size: 64, colors: col('#7a3fa8', '#4a2370', '#d9a8ff', '#e86ab5', { emblem: 'parab' }), opts: { heads: 2 } } },

  { id: 'cubo_gelatinoso', name: 'Cubo Gelatinoso', world: 'ciudadela', topic: 'medidas', hp: 20, questions: 3, difficulty: [1, 3],
    attack: { name: 'Aplastamiento cúbico', damage: 4, telegraph: 'Se estira hasta tocar el techo' }, line: '¿Cuánto cabe dentro de mí?',
    sprite: { archetype: 'cube', size: 32, colors: col('#4fd1d9', '#2f8f9e', '#c8fbff', '#e0b84c', { emblem: 'vol' }) } },
  { id: 'troll_puente', name: 'Troll del Puente', world: 'ciudadela', topic: 'pitagoras', hp: 26, questions: 4, difficulty: [1, 4],
    attack: { name: 'Garrote en diagonal', damage: 5, telegraph: 'Levanta el garrote en diagonal' }, line: 'Para cruzar, dime cuánto mide la diagonal.',
    sprite: { archetype: 'humanoid', size: 32, colors: col('#8a9a7a', '#5a6a4f', '#c4d1b0', '#e0b84c', { cloth: '#6b5a3f', clothShade: '#4a3b27', emblem: 'pyth', glyph: '#ffd77a' }), opts: { k: 1.12, prop: 'club' } } },
  { id: 'gnomo_sombras', name: 'Gnomo de Sombras', world: 'ciudadela', topic: 'tales', hp: 16, questions: 3, difficulty: [1, 3],
    attack: { name: 'Sombra estirada', damage: 3, telegraph: 'Su sombra crece hacia ti' }, line: 'Mi sombra mide tanto, la torre mide cuánto?',
    sprite: { archetype: 'humanoid', size: 32, colors: col('#e0b8a0', '#b08568', '#f5d9c8', '#4fd1d9', { cloth: '#4b4470', clothShade: '#2b2740', emblem: 'similar', glyph: '#4fd1d9' }), opts: { k: 0.82, hat: 'pointy' } } },
  { id: 'alquimista_sobrecargado', name: 'Alquimista Sobrecargado', world: 'ciudadela', topic: 'unidades', hp: 20, questions: 4, difficulty: [1, 4],
    attack: { name: 'Poción desbordada', damage: 4, telegraph: 'Mezcla frascos de distintos tamaños' }, line: 'Dame los mililitros en litros o la poción explota.',
    sprite: { archetype: 'humanoid', size: 32, colors: col('#f0c8a0', '#c08f6a', '#fde6cf', '#4fd1d9', { cloth: '#2f8f9e', clothShade: '#1d5a66', emblem: 'units', glyph: '#d9fcff', flask: '#9af06f' }), opts: { hat: 'goggles', prop: 'flask' } } },
  { id: 'espejo_maldito', name: 'Espejo Maldito', world: 'ciudadela', topic: 'transformaciones', hp: 22, questions: 4, difficulty: [1, 4],
    attack: { name: 'Reflejo robado', damage: 5, telegraph: 'Copia tu último movimiento al revés' }, line: 'Soy tu reflejo, pero al revés. ¿Dónde caigo?',
    sprite: { archetype: 'mirror', size: 32, colors: col('#d6cfa8', '#a89860', '#f4f1e6', '#4fd1d9', { emblem: 'reflect' }) } },
  { id: 'caballero_coordenado', name: 'Caballero Coordenado', world: 'ciudadela', topic: 'plano', hp: 28, questions: 5, difficulty: [1, 4],
    attack: { name: 'Estocada en (x, y)', damage: 6, telegraph: 'Marca un punto y apunta a él' }, line: 'Dime mi posición exacta: primero x, luego y.',
    sprite: { archetype: 'humanoid', size: 32, colors: col('#8a82b8', '#5b4e7a', '#d6cfe8', '#e0b84c', { cloth: '#4b4470', clothShade: '#2b2740', emblem: 'grid', glyph: '#e0b84c' }), opts: { hat: 'helm', prop: 'sword' } } },
  { id: 'coloso_medidas', name: 'Coloso de las Medidas', world: 'ciudadela', topic: 'parcial3', boss: true, hp: 100, questions: 15, phases: ['medidas', 'pitagoras', 'tales', 'unidades', 'transformaciones', 'plano'], difficulty: [2, 4],
    attack: { name: 'Pisotón a escala', damage: 8, telegraph: 'Crece una escala con cada paso' }, line: 'Todo lo mido y nada se me escapa.',
    sprite: { archetype: 'golem', size: 64, colors: col('#b8a878', '#7a6a48', '#e8dfb8', '#4fd1d9', { emblem: 'ruler' }) } },
  { id: 'el_divisor', name: 'El Divisor', world: 'vacio', topic: 'final', boss: true, final: true, hp: 160, questions: 20, phases: ['porcentajes', 'ecuaciones', 'cuadratica', 'pitagoras', 'plano'], difficulty: [3, 4],
    attack: { name: 'División entre cero', damage: 9, telegraph: 'El agujero negro se traga la mitad del escenario' }, line: 'Todo lo divido. Todo lo reduzco a cero.',
    sprite: { archetype: 'void', size: 64, colors: col('#2a1245', '#5a2a8a', '#b04fd1', '#ff4f79', { emblem: 'div' }) } }
];

/* ---------------- héroes ---------------- */
var heroes = [
  { id: 'lia', name: 'Lía, la Hechicera', style: 'Álgebra y ecuaciones', hp: 28, passive: { id: 'pista_gratis', text: 'Una pista gratis por combate' },
    startingDeck: ['estocada_basica', 'escudo_de_balanza', 'pista_del_sabio', 'doble_o_nada'], color: '#6a4fc8',
    sprite: { kind: 'hero', archetype: 'humanoid', size: 32, facing: 'right', colors: col('#f0c8a0', '#c08f6a', '#fde6cf', '#e86ab5', { cloth: '#6a4fc8', clothShade: '#41318a', emblem: 'eq', glyph: '#e8e2d0', orb: '#7af0ff' }), opts: { hat: 'pointy', prop: 'staff' } } },
  { id: 'teo', name: 'Teo, el Guardián', style: 'Geometría y medidas', hp: 34, passive: { id: 'primer_fallo', text: 'El primer fallo de cada combate no hiere' },
    startingDeck: ['estocada_basica', 'barrera_metrica', 'cubo_de_volumen', 'doble_o_nada'], color: '#3f6fc0',
    sprite: { kind: 'hero', archetype: 'humanoid', size: 32, facing: 'right', colors: col('#d9a47a', '#a8754f', '#f0c8a0', '#e0b84c', { cloth: '#3f6fc0', clothShade: '#264a8a', emblem: 'pyth', glyph: '#e8e2d0', shield: '#4f7dd9' }), opts: { hat: 'helm', prop: 'shield' } } },
  { id: 'mara', name: 'Mara, la Arquera', style: 'Números y funciones', hp: 26, passive: { id: 'racha_dano', text: 'Cada acierto seguido suma 1 de daño (máximo 5)' },
    startingDeck: ['estocada_basica', 'regla_real', 'recta_guia', 'doble_o_nada'], color: '#2f8f5a',
    sprite: { kind: 'hero', archetype: 'humanoid', size: 32, facing: 'right', colors: col('#e0b88f', '#b08560', '#f5d9c0', '#c4e87a', { cloth: '#2f8f5a', clothShade: '#1d5a3a', emblem: 'slope', glyph: '#e8e2d0' }), opts: { hat: 'hood', prop: 'bow' } } }
];

/* ---------------- cartas ---------------- */
function card(id, name, type, topic, rarity, glyph, effect, params, unlock) {
  return { id: id, name: name, type: type, topic: topic, rarity: rarity, icon: glyph, effect: effect, params: params, unlock: unlock };
}
var mastery = function (t, th) { return { type: 'mastery', topic: t, threshold: th || 0.7 }; };
var cards = [
  card('estocada_basica', 'Golpe básico', 'ataque', null, 'comun', 'sword', 'Daño si aciertas', { damage: 3 }, { type: 'start' }),
  card('estocada_pitagorica', 'Estocada Pitagórica', 'ataque', 'pitagoras', 'comun', 'pyth', 'Daño si aciertas una pregunta de cualquier tema', { damage: 6 }, mastery('pitagoras')),
  card('flecha_parabolica', 'Flecha Parabólica', 'ataque', 'cuadratica', 'comun', 'parab', 'Daño si aciertas; +2 si la pregunta era una gráfica', { damage: 7, bonusIfGraph: 2 }, mastery('cuadratica')),
  card('rayo_de_raiz', 'Rayo de Raíz', 'ataque', 'ecuacionesCuadraticas', 'rara', 'root', 'Daño si aciertas; golpea dos veces si hallas ambas raíces', { damage: 8, hits: 2 }, mastery('ecuacionesCuadraticas')),
  card('golpe_porcentual', 'Golpe Porcentual', 'ataque', 'porcentajes', 'comun', 'pct', 'Quita el 15% de la vida máxima del monstruo (mínimo 4)', { percentMaxHp: 15, min: 4 }, mastery('porcentajes')),
  card('corte_de_factor', 'Corte de Factor', 'ataque', 'factorizacion', 'comun', 'fact', 'Daño que ignora el escudo del monstruo', { damage: 6, piercing: true }, mastery('factorizacion')),
  card('onda_de_choque', 'Onda de Choque', 'ataque', 'ondas', 'rara', 'wave', 'Daño si aciertas; el doble si fallaste la pregunta anterior', { damage: 5, doubleAfterMiss: true }, mastery('ondas')),
  card('escudo_de_balanza', 'Escudo de Balanza', 'defensa', 'ecuaciones', 'comun', 'eq', 'Bloquea daño del próximo golpe', { block: 6 }, mastery('ecuaciones')),
  card('espejo_reflejo', 'Espejo Reflejo', 'defensa', 'transformaciones', 'rara', 'reflect', 'Devuelve la mitad del próximo daño recibido', { reflectPercent: 50 }, mastery('transformaciones')),
  card('barrera_metrica', 'Barrera Métrica', 'defensa', 'unidades', 'comun', 'units', 'Bloquea daño y cura vida', { block: 4, heal: 2 }, mastery('unidades')),
  card('muralla_cartesiana', 'Muralla Cartesiana', 'defensa', 'plano', 'comun', 'grid', 'Bloquea daño del próximo golpe', { block: 5 }, mastery('plano')),
  card('pista_del_sabio', 'Pista del Sabio', 'utilidad', null, 'comun', 'book', 'Revela el primer paso de la solución sin perder racha', { hints: 1 }, { type: 'start' }),
  card('conoce_funcion', 'Ojo de Función', 'utilidad', 'funciones', 'comun', 'axes', 'Elimina dos opciones incorrectas', { removeOptions: 2 }, mastery('funciones')),
  card('interseca', 'Intersección', 'utilidad', 'sistemas', 'comun', 'cross', 'Elimina una opción incorrecta y muestra la gráfica de ambas rectas', { removeOptions: 1, showGraph: true }, mastery('sistemas')),
  card('recta_guia', 'Recta Guía', 'utilidad', 'lineal', 'comun', 'slope', 'Muestra la gráfica de la pregunta', { showGraph: true }, mastery('lineal')),
  card('sombra_de_tales', 'Sombra de Tales', 'utilidad', 'tales', 'comun', 'similar', 'La siguiente pregunta baja un nivel de dificultad', { difficultyDelta: -1 }, mastery('tales')),
  card('cubo_de_volumen', 'Cubo de Volumen', 'utilidad', 'medidas', 'comun', 'vol', 'Cura vida', { heal: 4 }, mastery('medidas')),
  card('regla_real', 'Regla Real', 'utilidad', 'reales', 'comun', 'ruler', 'Cura vida y muestra la recta numérica', { heal: 3, showNumberLine: true }, mastery('reales')),
  card('doble_o_nada', 'Doble o Nada', 'riesgo', null, 'rara', 'star', 'Pregunta un nivel más difícil con el doble de daño; si fallas, pierdes vida', { difficultyDelta: 1, damageMultiplier: 2, selfDamageOnMiss: 4 }, { type: 'start' }),
  card('raiz_ardiente', 'Raíz Ardiente', 'ataque', 'reales', 'rara', 'root', 'Daño y quema: 2 de daño al final de los 2 turnos siguientes', { damage: 4, burn: { n: 2, turns: 2 } }, mastery('reales', 0.9)),
  card('interes_compuesto', 'Interés Compuesto', 'ataque', 'porcentajes', 'rara', 'pct', 'Daño que crece +1 por cada acierto seguido de tu racha', { damage: 3, streakDamage: 1 }, mastery('porcentajes', 0.9)),
  card('descomposicion_prima', 'Descomposición Prima', 'ataque', 'factorizacion', 'rara', 'fact', 'Daño y debilita: el próximo golpe del monstruo hace 3 menos', { damage: 5, weak: 3 }, mastery('factorizacion', 0.9)),
  card('ecuacion_gemela', 'Ecuación Gemela', 'ataque', 'ecuaciones', 'rara', 'eq', 'Daño y robas una carta extra en el próximo turno', { damage: 5, drawExtra: 1 }, mastery('ecuaciones', 0.9)),
  card('lanza_secante', 'Lanza Secante', 'ataque', 'sistemas', 'rara', 'cross', 'Daño; robas vida igual a la mitad del daño', { damage: 6, lifesteal: 50 }, mastery('sistemas', 0.9)),
  card('tangente_pendiente', 'Tangente Pendiente', 'ataque', 'lineal', 'rara', 'slope', 'Daño; +4 si llevas 3 o más aciertos seguidos', { damage: 5, bonusIfStreak: { n: 3, bonus: 4 } }, mastery('lineal', 0.9)),
  card('ancla_de_origen', 'Ancla de Origen', 'defensa', 'plano', 'rara', 'grid', 'Bloquea mucho daño del próximo golpe', { block: 10 }, mastery('plano', 0.9)),
  card('rotacion_estelar', 'Rotación Estelar', 'defensa', 'transformaciones', 'rara', 'reflect', 'Bloquea daño y aturde: el monstruo pierde su próximo ataque', { block: 4, stun: true }, mastery('transformaciones', 0.9)),
  card('escala_de_tales', 'Escala de Tales', 'defensa', 'tales', 'rara', 'similar', 'Bloquea daño y debilita el próximo golpe del monstruo', { block: 5, weak: 2 }, mastery('tales', 0.9)),
  card('compas_de_oro', 'Compás de Oro', 'utilidad', 'medidas', 'rara', 'vol', 'Cura vida y robas una carta extra en el próximo turno', { heal: 3, drawExtra: 1 }, mastery('medidas', 0.9)),
  card('conversion_alquimica', 'Conversión Alquímica', 'utilidad', 'unidades', 'rara', 'units', 'Cura mucha vida', { heal: 7 }, mastery('unidades', 0.9)),
  card('sinusoide_calmante', 'Sinusoide Calmante', 'utilidad', 'ondas', 'rara', 'wave', 'Daño leve y aturde: el monstruo pierde su próximo ataque', { damage: 2, stun: true }, mastery('ondas', 0.9)),
  card('vertice_dorado', 'Vértice Dorado', 'riesgo', 'cuadratica', 'epica', 'parab', 'Mucho daño; si fallas, pierdes 3 de vida', { damage: 11, selfDamageOnMiss: 3 }, mastery('cuadratica', 0.9)),
  card('funcion_inversa', 'Función Inversa', 'utilidad', 'funciones', 'rara', 'axes', 'Elimina una opción incorrecta y da una pista', { removeOptions: 1, hints: 1 }, mastery('funciones', 0.9)),
  card('hipotenusa_celeste', 'Hipotenusa Celeste', 'ataque', 'pitagoras', 'epica', 'pyth', 'Rayo que ignora el escudo; +3 si la pregunta era un reto animado', { damage: 8, piercing: true, bonusIfGraph: 3 }, mastery('pitagoras', 0.9)),
  card('discriminante', 'Discriminante', 'ataque', 'ecuacionesCuadraticas', 'epica', 'root', 'Daño y quema: 3 de daño al final de los 2 turnos siguientes', { damage: 6, burn: { n: 3, turns: 2 } }, mastery('ecuacionesCuadraticas', 0.9)),
  card('anillo_del_cero', 'Anillo del Cero', 'reliquia', null, 'epica', 'shield', 'El primer fallo de cada combate no hiere', { passive: 'firstMissFree' }, { type: 'drop', source: 'rey_irracional' }),
  card('lente_del_vertice', 'Lente del Vértice', 'reliquia', null, 'epica', 'star', 'Las preguntas gráficas dan 1 de daño extra', { passive: 'graphDamage', value: 1 }, { type: 'drop', source: 'hidra_cuadratica' }),
  card('brujula_de_escala', 'Brújula de Escala', 'reliquia', null, 'epica', 'ruler', 'Las preguntas de conversión muestran las unidades equivalentes', { passive: 'showUnits' }, { type: 'drop', source: 'coloso_medidas' }),
  card('ecuacion_restaurada', 'Ecuación Restaurada', 'reliquia', null, 'legendaria', 'eq', 'Recuperas 1 de vida por cada 3 aciertos seguidos', { passive: 'streakHeal', every: 3, heal: 1 }, { type: 'drop', source: 'el_divisor' })
];

var achievements = [
  { id: 'primera_sangre', name: 'Primera victoria', icon: 'sword', rule: 'Gana tu primer combate' },
  { id: 'racha_10', name: 'Racha de 10', icon: 'bolt', rule: 'Acierta 10 preguntas seguidas' },
  { id: 'sin_pistas', name: 'Sin ayuda', icon: 'book', rule: 'Vence un parcial sin usar pistas' },
  { id: 'errores_repasados', name: 'Aprender del error', icon: 'heart', rule: 'Acierta 5 preguntas que antes fallaste' },
  { id: 'tema_dominado', name: 'Tema dominado', icon: 'star', rule: 'Llega a 0.7 de dominio en un tema' },
  { id: 'mundo_1', name: 'Cavernas recuperadas', icon: 'fire', rule: 'Vence el Parcial 1' },
  { id: 'mundo_2', name: 'Bosque en orden', icon: 'fire', rule: 'Vence el Parcial 2' },
  { id: 'mundo_3', name: 'Ciudad bien medida', icon: 'fire', rule: 'Vence el Parcial 3' },
  { id: 'ecuacion_completa', name: 'Ecuación completa', icon: 'eq', rule: 'Vence a El Divisor' },
  { id: 'mazo_completo', name: 'Coleccionista', icon: 'chest', rule: 'Consigue todas las cartas de tema' },
  { id: 'libre_20', name: 'Explorador libre', icon: 'question', rule: 'Completa 20 niveles del modo libre' },
  { id: 'diario_5', name: 'Lector de diarios', icon: 'book', rule: 'Encuentra 5 páginas de diario' }
];

/* ---------------- niveles de campaña ---------------- */
function combat(monster, difficulty, questions, extra) {
  return Object.assign({ type: 'combat', monster: monster, difficulty: difficulty, questions: questions }, extra || {});
}
var bossOf = { cavernas: 'rey_irracional', bosque: 'hidra_cuadratica', ciudadela: 'coloso_medidas' };
var monsterByTopic = {};
monsters.forEach(function (m) { monsterByTopic[m.topic] = m.id; });

var levels = [];
var zoneIndex = 0;
worlds.forEach(function (w) {
  w.zones.forEach(function (z, i) {
    var t = topics.filter(function (x) { return x.id === z; })[0], mid = monsterByTopic[z];
    var restOrChest = zoneIndex % 2 === 0 ? { type: 'treasure' } : { type: 'rest' };
    levels.push({
      id: 'zona_' + z, world: w.id, topic: z, name: t.name, order: zoneIndex + 1,
      intro: 'dialogo.' + z + '.intro',
      rooms: [
        combat(mid, 1, 3), combat(mid, 2, 3), restOrChest,
        combat(mid, 3, 4), combat(mid, 4, 5, { miniBoss: true, hpMultiplier: 1.5 })
      ],
      optional: !!t.optional,
      unlocks: (function () {
        var last = i === w.zones.length - 1;
        if (t.optional) return [];
        if (last) return ['parcial_' + w.id];
        var nt = topics.filter(function (x) { return x.id === w.zones[i + 1]; })[0];
        return nt && nt.optional && i + 2 >= w.zones.length ? ['zona_' + w.zones[i + 1], 'parcial_' + w.id] : ['zona_' + w.zones[i + 1]];
      })(),
      masteryToClear: 0.7
    });
    zoneIndex++;
  });
  if (w.boss !== 'final') {
    var bossMonster = monsters.filter(function (m) { return m.id === bossOf[w.id]; })[0];
    levels.push({
      id: 'parcial_' + w.id, world: w.id, topic: bossMonster.topic, name: 'Parcial ' + w.order, order: zoneIndex + 1, boss: true,
      intro: 'dialogo.' + bossMonster.topic + '.intro',
      rooms: [
        combat(monsterByTopic[w.zones[0]], 2, 3), { type: 'rest' },
        combat(monsterByTopic[w.zones[w.zones.length - 1]], 3, 4), { type: 'treasure' },
        { type: 'boss', monster: bossMonster.id, phases: bossMonster.phases, questions: bossMonster.questions, difficulty: 4 }
      ],
      unlocks: [w.order < 3 ? 'zona_' + worlds[w.order].zones[0] : 'final'],
      requires: w.zones.filter(function (z) { return !topics.filter(function (x) { return x.id === z; })[0].optional; }).map(function (z) { return 'zona_' + z; })
    });
    zoneIndex++;
  }
});
levels.push({
  id: 'final', world: 'vacio', topic: 'final', name: 'El Divisor', order: zoneIndex + 1, boss: true, final: true,
  intro: 'dialogo.final.intro',
  rooms: [
    combat('dragon_raices', 3, 4), { type: 'rest' }, combat('troll_puente', 3, 4), { type: 'treasure' },
    { type: 'boss', monster: 'el_divisor', phases: monsters.filter(function (m) { return m.id === 'el_divisor'; })[0].phases, questions: 20, difficulty: 4 }
  ],
  requires: ['parcial_cavernas', 'parcial_bosque', 'parcial_ciudadela']
});


/* ---------------- retos animados: la solución se ve en el mundo ---------------- */
var stageByTemplate = {
  'cua.proyectil-altura-maxima': 'projectile', 'cua.vertice': 'projectile',
  'pla.ubicar-puntos': 'aim-point-click', 'pla.punto-medio': 'aim-point-read',
  'lin.pendiente-dos-puntos': 'slope', 'lin.interceptos': 'slope',
  'pit.problema-escalera': 'ladder', 'pit.hipotenusa': 'ladder', 'pit.cateto': 'ladder',
  'tra.traslacion-coord': 'translate', 'tra.reflexion-eje': 'reflect',
  'sis.interseccion-grafica': 'aim-point-read'
};
topics.forEach(function (t) { t.templates.forEach(function (tp) { if (stageByTemplate[tp.id]) tp.stage = stageByTemplate[tp.id]; }); });

var challengeStages = [
  { id: 'projectile', name: 'Proyectil', topic: 'cuadratica', world: 'bosque', plane: true, hero: 'mara', monster: 'arquero_parabolico',
    question: 'y = -x² + 2h·x; ¿cuál es la altura máxima?', params: { h: [3, 5], answerFormula: 'k = h²', options: ['k', 'h', '2h', 'k + h'] },
    animation: ['La heroína tensa el arco (ataque, cuadro 2)', 'La flecha sale por la parábola de la respuesta elegida: y = -x² + 2·√k·x', 'Deja un rastro de puntos y marca la cima', 'Si k es correcto, aterriza exactamente sobre el monstruo; si no, cae antes o se pasa', 'Al terminar se dibuja la parábola correcta con su vértice como explicación'],
    success: 'El monstruo recibe el daño y muestra el número', fail: 'La flecha se clava en el suelo y el monstruo contraataca' },
  { id: 'aim-point-click', name: 'Ubicar un punto', topic: 'plano', world: 'ciudadela', plane: true, hero: 'lia', monster: 'caballero_coordenado',
    question: 'Lanza el hechizo al punto (x, y): el jugador toca la intersección en el plano', params: { x: [2, 9], y: [1, 5] },
    animation: ['El plano muestra una cuadrícula con ejes numerados', 'Al pasar el cursor se marca la intersección con sus coordenadas', 'El hechizo vuela en línea recta hasta el punto tocado', 'El monstruo está oculto en la niebla del punto correcto y aparece al acertar'],
    success: 'La niebla se disipa y el hechizo golpea al monstruo', fail: 'El hechizo estalla en vacío y el monstruo aparece en su lugar real' },
  { id: 'aim-point-read', name: 'Leer coordenadas', topic: 'plano', world: 'ciudadela', plane: true, hero: 'lia', monster: 'caballero_coordenado',
    question: 'El monstruo está sobre una plataforma; el jugador elige sus coordenadas entre varias opciones', params: { distractors: ['(y, x) invertido', 'x + 1', 'y + 1'] },
    animation: ['Se resalta la plataforma con líneas guía hasta los ejes', 'El hechizo vuela a las coordenadas elegidas', 'Si coinciden, golpea al monstruo'],
    success: 'Impacto directo', fail: 'El hechizo cae en otra plataforma y el monstruo ataca' },
  { id: 'slope', name: 'Pendiente de la rampa', topic: 'lineal', world: 'bosque', plane: true, hero: 'mara', monster: 'serpiente_pendiente',
    question: 'La rampa pasa por A y B; ¿cuál es la pendiente?', params: { m: [1, 3], run: [2, 3] },
    animation: ['Se dibuja la recta por los puntos A y B', 'La heroína sube por una rampa de luz con la pendiente elegida', 'Si es la correcta, llega justo a B y ataca a la serpiente', 'Si no, la rampa termina en el aire o bajo el punto y la heroína cae'],
    success: 'La heroína llega a B y golpea', fail: 'La rampa de luz no llega: caída y mordida' },
  { id: 'ladder', name: 'Escalera de Pitágoras', topic: 'pitagoras', world: 'ciudadela', plane: false, hero: 'teo', monster: 'troll_puente',
    question: 'Muro de altura a, base b: ¿cuánto mide la escalera?', params: { triples: [[3, 4, 5], [6, 8, 10], [5, 12, 13]], options: ['c', 'a + b', 'c + 1', 'c - 1'] },
    animation: ['La escalera gira desde el suelo con el largo elegido', 'Se apoya en el muro: si es corta, queda bajo el borde; si es larga, pasa de largo y resbala', 'Si es justa, el héroe sube peldaño a peldaño y ataca al troll'],
    success: 'La escalera encaja en el borde', fail: 'La escalera resbala o no alcanza' },
  { id: 'translate', name: 'Traslación', topic: 'transformaciones', world: 'ciudadela', plane: true, hero: 'lia', monster: 'espejo_maldito',
    question: 'El triángulo se traslada (dx, dy); ¿dónde queda el vértice A?', params: { dx: [2, 5], dy: [0, 2] },
    animation: ['El triángulo se desliza sobre el plano hasta la posición elegida', 'Si es correcta, encaja en su contorno y se activa un rayo', 'Si no, aterriza fuera de lugar y se rompe en pedazos'],
    success: 'El rayo golpea al Espejo Maldito', fail: 'La figura se rompe y el espejo contraataca' },
  { id: 'reflect', name: 'Reflexión', topic: 'transformaciones', world: 'ciudadela', plane: true, hero: 'lia', monster: 'espejo_maldito',
    question: 'Refleja el triángulo sobre la línea x = m; ¿dónde queda A?', params: { m: [4, 6] },
    animation: ['El triángulo se voltea sobre la línea como una hoja al girar', 'Termina en la posición elegida', 'Si coincide con el reflejo exacto, activa un rayo'],
    success: 'El reflejo exacto abre el rayo', fail: 'La figura cae en otro sitio y se rompe' }
];

/* niveles bonus que obligan a usar el plano cartesiano */
function stageRoom(monster, difficulty, questions, stage, extra) { return Object.assign({ type: 'combat', monster: monster, difficulty: difficulty, questions: questions, stage: stage }, extra || {}); }
var bonusBase = levels.length + 1;
levels.push(
  { id: 'campo_coordenadas', world: 'ciudadela', topic: 'plano', name: 'Campo de coordenadas', order: bonusBase, bonus: true, requires: ['zona_plano'], intro: 'dialogo.plano.intro',
    rooms: [stageRoom('caballero_coordenado', 1, 3, 'aim-point-click'), stageRoom('caballero_coordenado', 2, 3, 'aim-point-read'), stageRoom('espejo_maldito', 2, 3, 'translate'), stageRoom('espejo_maldito', 3, 4, 'reflect'), stageRoom('caballero_coordenado', 4, 5, 'aim-point-click', { miniBoss: true, hpMultiplier: 1.5 })] },
  { id: 'campo_proyectiles', world: 'bosque', topic: 'cuadratica', name: 'Campo de proyectiles', order: bonusBase + 1, bonus: true, requires: ['zona_cuadratica'], intro: 'dialogo.cuadratica.intro',
    rooms: [stageRoom('arquero_parabolico', 1, 3, 'projectile'), stageRoom('arquero_parabolico', 2, 3, 'projectile'), stageRoom('arquero_parabolico', 3, 4, 'projectile'), stageRoom('arquero_parabolico', 4, 5, 'projectile', { miniBoss: true, hpMultiplier: 1.5 })] },
  { id: 'rampa_pendientes', world: 'bosque', topic: 'lineal', name: 'Rampa de pendientes', order: bonusBase + 2, bonus: true, requires: ['zona_lineal'], intro: 'dialogo.lineal.intro',
    rooms: [stageRoom('serpiente_pendiente', 1, 3, 'slope'), stageRoom('serpiente_pendiente', 2, 3, 'slope'), stageRoom('serpiente_pendiente', 3, 4, 'slope'), stageRoom('serpiente_pendiente', 4, 5, 'slope', { miniBoss: true, hpMultiplier: 1.5 })] },
  { id: 'puente_pitagoras', world: 'ciudadela', topic: 'pitagoras', name: 'Puente de Pitágoras', order: bonusBase + 3, bonus: true, requires: ['zona_pitagoras'], intro: 'dialogo.pitagoras.intro',
    rooms: [stageRoom('troll_puente', 1, 3, 'ladder'), stageRoom('troll_puente', 2, 3, 'ladder'), stageRoom('troll_puente', 3, 4, 'ladder'), stageRoom('troll_puente', 4, 5, 'ladder', { miniBoss: true, hpMultiplier: 1.5 })] }
);

/* ---------------- tipos de sala y reglas del generador ---------------- */
var roomTypes = [
  { id: 'combat', name: 'Combate', icon: 'sword', desc: 'Un monstruo del tema lanza retos' },
  { id: 'treasure', name: 'Tesoro', icon: 'chest', desc: 'Una carta nueva o mejora de carta' },
  { id: 'rest', name: 'Descanso', icon: 'fire', desc: 'Cura vida o repasa el Libro de errores' },
  { id: 'event', name: 'Evento', icon: 'question', desc: 'Diario o dilema con recompensa' },
  { id: 'boss', name: 'Jefe', icon: 'skull', desc: 'Parcial por fases, mezcla de temas' }
];
var generatorRules = {
  seedAlgorithm: 'mulberry32',
  rooms: { campaign: 'manual', learning: [4, 6], free: [5, 10] },
  difficultyCurve: 'lineal de dificultad mínima a máxima, con salto en la última sala',
  placement: ['sin dos descansos seguidos', 'el mini jefe va al final', 'al menos un combate antes de un tesoro'],
  questionPick: {
    templatesWithMinDifficultyLE: 'dificultad de la sala',
    weakTopicWeight: 'peso = 1 + (1 - dominio)',
    noRepeatTemplateInRow: true
  },
  mastery: { alpha: 0.2, clearThreshold: 0.7, weightByDifficulty: true },
  adaptive: { downAfterMisses: 3, upAfterHits: 5, neverBelowZoneMin: true }
};

/* ---------------- máquina de estados del combate ---------------- */
var combatFsm = {
  initial: 'sala_intro',
  states: {
    sala_intro: { desc: 'Aparece el monstruo y su frase', on: { START: 'turno_inicio' } },
    turno_inicio: { desc: 'Se anuncia el ataque del monstruo', on: { DRAW: 'robar_mano' } },
    robar_mano: { desc: 'Se reparten 3 cartas', on: { READY: 'elegir_carta' } },
    elegir_carta: { desc: 'El jugador elige una carta o el golpe básico', on: { PLAY_CARD: 'pregunta', USE_BASIC: 'pregunta' } },
    pregunta: { desc: 'La UI muestra la pregunta; puede pedir ayuda', on: { ANSWER: 'evaluar', HINT: 'pregunta', GIVE_UP: 'revision_error' } },
    evaluar: { desc: 'El verificador compara la respuesta', on: { CORRECT: 'efecto_carta', WRONG: 'revision_error' } },
    efecto_carta: { desc: 'Se aplica la carta: daño, bloqueo o curación', on: { MONSTER_DEAD: 'victoria', MONSTER_ALIVE: 'turno_monstruo' } },
    revision_error: { desc: 'Se muestra la solución y se guarda en el Libro de errores', on: { CONTINUE: 'turno_monstruo' } },
    turno_monstruo: { desc: 'El monstruo ataca y se descuenta vida', on: { PLAYER_DEAD: 'derrota', PLAYER_ALIVE: 'turno_inicio' } },
    victoria: { desc: 'Se actualiza el dominio del tema y se dan recompensas', on: { CONTINUE: 'recompensa' } },
    recompensa: { desc: 'Carta, XP y página de diario', on: { NEXT_ROOM: 'sala_intro', ZONE_CLEAR: 'mapa' } },
    derrota: { desc: 'Se ofrece repetir con otras preguntas', on: { RETRY: 'sala_intro', LEAVE: 'mapa' } },
    mapa: { desc: 'Pantalla de zonas', on: { ENTER_ZONE: 'sala_intro' } }
  }
};

/* ---------------- interfaz ---------------- */
var uiTokens = {
  fonts: { display: 'Press Start 2P', label: 'Pixelify Sans', body: 'Atkinson Hyperlegible', math: 'KaTeX_Main' },
  scale: { logicalWidth: 320, logicalHeight: 180, integerScaling: true, imageRendering: 'pixelated' },
  spacing: [4, 8, 12, 16, 24, 32],
  radius: 0,
  border: { pixel: 2, color: 'ink' },
  touch: { minTarget: 48, pcMinTarget: 32 },
  breakpoints: { mobile: 0, tablet: 720, pc: 1024 },
  animation: { cardPlayMs: 250, damageNumberMs: 600, shakeMs: 180, hitStopMs: 60, textBoxCharMs: 22 },
  layout: {
    /* fracciones de la pantalla (PC 16:9, móvil vertical 9:19.5); el canvas del juego conserva 320x180 */
    pc: {
      hud: { x: 0, y: 0, w: 0.68, h: 0.08 },
      canvas: { x: 0, y: 0.08, w: 0.68, h: 0.68 },
      hand: { x: 0, y: 0.76, w: 0.68, h: 0.24 },
      questionPanel: { x: 0.68, y: 0, w: 0.32, h: 0.6 },
      answerPanel: { x: 0.68, y: 0.6, w: 0.32, h: 0.4 }
    },
    mobile: {
      hud: { x: 0, y: 0, w: 1, h: 0.06 },
      canvas: { x: 0, y: 0.06, w: 1, h: 0.26 },
      questionPanel: { x: 0, y: 0.32, w: 1, h: 0.2 },
      answerPanel: { x: 0, y: 0.52, w: 1, h: 0.28 },
      hand: { x: 0, y: 0.8, w: 1, h: 0.2 }
    }
  },
  feedback: { correct: 'ok', wrong: 'bad', hint: 'hint', colorBlindExtra: 'icono + forma además del color' }
};

var saveSchema = {
  version: 1,
  profile: { heroId: 'string', createdAt: 'ISO date', name: 'string' },
  progress: { levelsCleared: ['levelId'], bossesDefeated: ['monsterId'], currentLevel: 'levelId', currentRoom: 'number' },
  mastery: { '<topicId>': { m: 'number 0..1', attempts: 'number', correct: 'number', lastSeen: 'ISO date' } },
  deck: ['cardId'], relics: ['cardId'], achievements: ['achievementId'],
  errorBook: [{ templateId: 'string', seed: 'number', given: 'string', date: 'ISO date', resolved: 'boolean' }],
  diaryPages: ['pageId'],
  settings: { textScale: 'number 0.8..1.6', colorBlind: 'boolean', sound: 'boolean', music: 'boolean', language: 'es', timer: 'boolean' },
  stats: { questionsAnswered: 'number', bestStreak: 'number', freePlayLevels: 'number' }
};

module.exports = { palettes, worlds, topics, monsters, heroes, cards, achievements, levels, challengeStages, roomTypes, generatorRules, combatFsm, uiTokens, saveSchema };
