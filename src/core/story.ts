import type { Sfx } from '../ui/audio';
/** Guion del juego: lore, cinemáticas y páginas del diario. {n} = nombre del jugador, {h} = frase propia del héroe. */
export interface Cast { id: string; x: number; flip?: boolean; anim?: string; sil?: boolean }
export interface Beat {
  scene: 'cosmos' | 'academia' | 'cavernas' | 'bosque' | 'ciudadela' | 'vacio';
  cast?: Cast[]; who?: string; line: string; layers?: ('numbers' | 'fireflies' | 'dust' | 'embers' | 'stars' | 'rain')[];
  fx?: ('shake' | 'flash' | 'crack' | 'fade')[]; cam?: [number, number, number, number]; sfx?: Sfx; music?: string; tint?: string;
}
export interface Cinematic { id: string; title: string; world?: string; beats: Beat[] }
const N = 'narrador', M = 'Maestra Aritmia', H = 'heroe';
export const HERO_LINE: Record<string, string> = {
  lia: 'El álgebra es equilibrio: lo que hago de un lado, lo hago del otro. Yo repararé la Ecuación.',
  teo: 'Soy guardián de la Balanza. Mientras yo vigile, nada se perderá del todo.',
  mara: 'Una flecha bien calculada traza la curva perfecta. Apuntemos al Divisor.'
};
export const MENTOR_DEF = { archetype: 'humanoid', size: 32, facing: 'right', colors: { body: '#e8c8a8', shade: '#b08a68', light: '#f8e6d0', accent: '#e0b84c', cloth: '#2f8f9e', clothShade: '#1d5a66', emblem: 'pi', glyph: '#ffd77a' }, opts: { hat: 'pointy' } };

export const CINEMATICS: Cinematic[] = [
  { id: 'prologo', title: 'La Ecuación Maestra', beats: [
    { scene: 'cosmos', who: N, line: 'Antes de las piedras y de las estrellas existió una sola frase: x = x.', layers: ['stars', 'numbers'], music: 'story', cam: [1, 1.25, 160, 160], fx: ['fade'] },
    { scene: 'cosmos', who: N, line: 'Era la Ecuación Maestra. Mientras se mantuvo en equilibrio, el mundo tuvo forma: las fracciones repartían el pan, las rectas tendían los caminos y las ciudades encajaban piedra con piedra.', layers: ['stars', 'numbers'], cam: [1.25, 1.1, 160, 160] },
    { scene: 'academia', who: N, line: 'En la Academia de los Calculistas, un joven calculista estudiaba, sin saber que esa noche cambiaría su vida.', cast: [{ id: 'hero', x: 90 }, { id: 'mentor', x: 200, flip: true }], layers: ['dust'], cam: [1, 1.3, 130, 150], fx: ['fade'], music: 'story' },
    { scene: 'academia', who: M, line: '{n}, llegas justo a tiempo. La Torre del Igual guardaba la Ecuación Maestra... hasta anoche.', cast: [{ id: 'hero', x: 90 }, { id: 'mentor', x: 200, flip: true }], cam: [1.4, 1.6, 200, 200] },
    { scene: 'academia', who: N, line: 'Alguien había dividido entre cero.', cast: [{ id: 'hero', x: 90 }, { id: 'mentor', x: 200, flip: true }], fx: ['crack', 'shake', 'flash'], sfx: 'explode', tint: '#2a0f3a', cam: [1.2, 1.2, 160, 160] },
    { scene: 'vacio', who: 'El Divisor', line: 'Todo lo divido. Todo lo reduzco a cero.', cast: [{ id: 'el_divisor', x: 170, sil: true }], layers: ['stars', 'embers'], sfx: 'roar', music: 'vacio', cam: [1.1, 1.6, 170, 170], fx: ['fade'] },
    { scene: 'cosmos', who: N, line: 'La Ecuación se partió en tres fragmentos —el del Número, el de la Función y el de la Medida— y cayeron a los reinos de abajo.', layers: ['stars', 'numbers'], music: 'story', cam: [1.4, 1, 160, 160], sfx: 'swell' },
    { scene: 'academia', who: M, line: 'Cada reino guarda un jefe que custodia su fragmento. Los Calculistas los llamamos parciales. Domina cada tema y los guardianes cederán el paso.', cast: [{ id: 'hero', x: 90 }, { id: 'mentor', x: 200, flip: true }], layers: ['dust'], cam: [1.2, 1.4, 190, 190], fx: ['fade'] },
    { scene: 'academia', who: H, line: '{h}', cast: [{ id: 'hero', x: 90 }, { id: 'mentor', x: 200, flip: true }], cam: [1.5, 1.7, 90, 90] },
    { scene: 'academia', who: M, line: 'Llévate este cuaderno: se llena con cada error que corrijas. Equivocarse es la mitad de calcular. Ahora ve: las Cavernas Numéricas te esperan.', cast: [{ id: 'hero', x: 90 }, { id: 'mentor', x: 200, flip: true }], cam: [1.6, 1.3, 200, 150], sfx: 'coin' }
  ] },
  { id: 'mundo_cavernas', title: 'Cavernas numéricas', world: 'cavernas', beats: [
    { scene: 'cavernas', who: N, line: 'Los números reales se desmoronaron y rodaron hasta lo más profundo. Allí, entre cristales y goteras, esperan a quien sepa ordenarlos.', cast: [{ id: 'hero', x: 60 }], layers: ['dust'], music: 'cavernas', cam: [1.1, 1.35, 90, 70], fx: ['fade'] },
    { scene: 'cavernas', who: H, line: 'Fracciones, raíces, porcentajes... Todo está revuelto. Hay que ir paso a paso.', cast: [{ id: 'hero', x: 60 }], cam: [1.6, 1.6, 60, 60] },
    { scene: 'cavernas', who: N, line: 'Un moco verde se despegó de la pared. Decía ser un medio. A veces, un tercio.', cast: [{ id: 'hero', x: 60 }, { id: 'slime_fraccionario', x: 220 }], cam: [1.2, 1.5, 150, 215], sfx: 'whoosh' }
  ] },
  { id: 'mundo_bosque', title: 'Bosque de las funciones', world: 'bosque', beats: [
    { scene: 'bosque', who: N, line: 'Más allá de las cavernas, los caminos se curvan solos. En el Bosque de las Funciones cada sendero es una función y cada cruce, una ecuación.', cast: [{ id: 'hero', x: 60 }], layers: ['fireflies'], music: 'bosque', cam: [1.1, 1.4, 90, 130], fx: ['fade'] },
    { scene: 'bosque', who: H, line: 'Si encuentro dónde se cruzan los caminos, sabré por dónde seguir.', cast: [{ id: 'hero', x: 60 }], cam: [1.6, 1.6, 60, 60] },
    { scene: 'bosque', who: N, line: 'Entre las ramas brilló un destello: el eco del Fragmento del Número vibraba al fondo del bosque, esperando a su próximo guardián.', cast: [{ id: 'hero', x: 60 }, { id: 'murcielago_balanza', x: 230 }], layers: ['fireflies'], cam: [1.2, 1.2, 160, 200], sfx: 'swell' }
  ] },
  { id: 'mundo_ciudadela', title: 'Ciudadela métrica', world: 'ciudadela', beats: [
    { scene: 'ciudadela', who: N, line: 'La Ciudadela Métrica fue la más bella de las ciudades. Ahora se midió mal y nada encaja: los puentes no llegan, las torres no alcanzan.', cast: [{ id: 'hero', x: 60 }], layers: ['dust'], music: 'ciudadela', cam: [1.1, 1.4, 90, 130], fx: ['fade'] },
    { scene: 'ciudadela', who: H, line: 'Hay que volver a medir, mover y convertir. Con Pitágoras, Tales y mucho cuidado.', cast: [{ id: 'hero', x: 60 }], cam: [1.6, 1.6, 60, 60] },
    { scene: 'ciudadela', who: N, line: 'En lo alto del puente, un troll con garrote en diagonal no dejaba pasar a nadie que no supiera su hipotenusa.', cast: [{ id: 'hero', x: 60 }, { id: 'troll_puente', x: 220 }], cam: [1.2, 1.5, 150, 220], sfx: 'roar' }
  ] },
  { id: 'mundo_vacio', title: 'El Vacío del Divisor', world: 'vacio', beats: [
    { scene: 'vacio', who: N, line: 'Tres fragmentos de la Ecuación latían juntos en las manos de {n}. Entonces la grieta del cielo se abrió.', cast: [{ id: 'hero', x: 70 }], layers: ['stars', 'embers'], music: 'vacio', cam: [1.1, 1.4, 90, 100], fx: ['fade', 'flash'], sfx: 'swell' },
    { scene: 'vacio', who: M, line: 'Allí abajo no hay suelo ni medida. Solo quien lo divide todo entre cero. {n}: recuerda que un error no es un final, es un dato.', cast: [{ id: 'hero', x: 70 }], layers: ['stars', 'embers'], cam: [1.5, 1.5, 70, 70] },
    { scene: 'vacio', who: N, line: 'El suelo se partió en dos... luego en cuatro... luego en ocho.', cast: [{ id: 'hero', x: 70 }, { id: 'el_divisor', x: 200, sil: true }], layers: ['stars', 'embers'], fx: ['shake', 'crack'], sfx: 'explode', cam: [1.2, 1.1, 150, 160] }
  ] },
  { id: 'jefe_parcial_cavernas', title: 'Parcial 1: Rey Irracional', world: 'cavernas', beats: [
    { scene: 'cavernas', who: N, line: 'En el fondo de la caverna, sobre un trono de decimales sin fin, esperaba el guardián del Fragmento del Número.', cast: [{ id: 'hero', x: 55 }, { id: 'rey_irracional', x: 200 }], layers: ['dust'], cam: [1, 1.4, 100, 200], sfx: 'swell', fx: ['fade'] },
    { scene: 'cavernas', who: 'Rey Irracional', line: 'Mi reino no tiene fin ni patrón. ¡Cuenta, si puedes!', cast: [{ id: 'hero', x: 55 }, { id: 'rey_irracional', x: 200 }], cam: [1.5, 1.7, 200, 200], sfx: 'roar' }
  ] },
  { id: 'jefe_parcial_bosque', title: 'Parcial 2: Hidra Cuadrática', world: 'bosque', beats: [
    { scene: 'bosque', who: N, line: 'El agua del lago se partió en dos. Y cada gota, en otras dos.', cast: [{ id: 'hero', x: 55 }, { id: 'hidra_cuadratica', x: 200 }], layers: ['fireflies'], cam: [1, 1.4, 100, 200], sfx: 'swell', fx: ['fade'] },
    { scene: 'bosque', who: 'Hidra Cuadrática', line: 'Corta una cabeza y salen dos soluciones.', cast: [{ id: 'hero', x: 55 }, { id: 'hidra_cuadratica', x: 200 }], cam: [1.4, 1.6, 200, 200], sfx: 'roar' }
  ] },
  { id: 'jefe_parcial_ciudadela', title: 'Parcial 3: Coloso de las Medidas', world: 'ciudadela', beats: [
    { scene: 'ciudadela', who: N, line: 'En la plaza central, una torre de piedra se puso de pie. Tenía una regla por brazo y un compás por mirada.', cast: [{ id: 'hero', x: 55 }, { id: 'coloso_medidas', x: 200 }], layers: ['dust'], cam: [1, 1.4, 100, 200], sfx: 'swell', fx: ['fade', 'shake'] },
    { scene: 'ciudadela', who: 'Coloso de las Medidas', line: 'Todo lo mido y nada se me escapa.', cast: [{ id: 'hero', x: 55 }, { id: 'coloso_medidas', x: 200 }], cam: [1.4, 1.6, 200, 200], sfx: 'roar' }
  ] },
  { id: 'jefe_final', title: 'El Divisor', world: 'vacio', beats: [
    { scene: 'vacio', who: N, line: 'No tenía rostro, solo una barra horizontal y, debajo, un cero que se tragaba todo lo demás.', cast: [{ id: 'hero', x: 55 }, { id: 'el_divisor', x: 190 }], layers: ['stars', 'embers'], cam: [1, 1.3, 120, 190], sfx: 'swell', fx: ['fade', 'shake'], music: 'vacio' },
    { scene: 'vacio', who: 'El Divisor', line: 'Todo lo divido. Todo lo reduzco a cero.', cast: [{ id: 'hero', x: 55 }, { id: 'el_divisor', x: 190 }], layers: ['stars', 'embers'], cam: [1.3, 1.6, 190, 190], sfx: 'roar' },
    { scene: 'vacio', who: H, line: 'Dividir entre cero no tiene sentido. Pero yo sé exactamente qué hacer con lo que no tiene sentido: preguntar por qué.', cast: [{ id: 'hero', x: 55 }, { id: 'el_divisor', x: 190 }], layers: ['stars', 'embers'], cam: [1.7, 1.8, 55, 55] }
  ] },
  { id: 'fragmento_cavernas', title: 'Fragmento del Número', world: 'cavernas', beats: [
    { scene: 'cavernas', who: N, line: 'El Rey Irracional se deshizo en una lluvia de cifras. De entre ellas, flotando, quedó un cristal con un signo grabado: π.', cast: [{ id: 'hero', x: 100 }], layers: ['numbers', 'dust'], cam: [1.1, 1.5, 100, 100], sfx: 'win', fx: ['flash'], music: 'story' },
    { scene: 'cavernas', who: M, line: 'Un tercio de la Ecuación late de nuevo. Los números reales vuelven a su sitio: ya sabes ordenarlos. Ahora, al bosque.', cast: [{ id: 'hero', x: 100 }], layers: ['numbers'], cam: [1.5, 1.2, 100, 160] }
  ] },
  { id: 'fragmento_bosque', title: 'Fragmento de la Función', world: 'bosque', beats: [
    { scene: 'bosque', who: N, line: 'La Hidra se hundió en el lago sin dejar una sola ola. En la orilla creció una hoja de cristal con una curva dibujada: una parábola.', cast: [{ id: 'hero', x: 100 }], layers: ['fireflies', 'numbers'], cam: [1.1, 1.5, 100, 100], sfx: 'win', fx: ['flash'], music: 'story' },
    { scene: 'bosque', who: M, line: 'Dos tercios. Las funciones ya conectan unas cosas con otras otra vez. Falta la ciudad que se midió mal.', cast: [{ id: 'hero', x: 100 }], layers: ['fireflies'], cam: [1.5, 1.2, 100, 160] }
  ] },
  { id: 'fragmento_ciudadela', title: 'Fragmento de la Medida', world: 'ciudadela', beats: [
    { scene: 'ciudadela', who: N, line: 'El Coloso se arrodilló y dejó caer su regla de oro. Las torres, una a una, encajaron con las calles. Al fondo se encendió un cristal triangular.', cast: [{ id: 'hero', x: 100 }], layers: ['dust', 'numbers'], cam: [1.1, 1.5, 100, 100], sfx: 'win', fx: ['flash'], music: 'story' },
    { scene: 'ciudadela', who: M, line: 'Tres fragmentos. Ya puedes abrir la puerta del Vacío. Pero no olvides algo, {n}: no te enfrentas a un monstruo, sino a un error enorme. Y los errores se corrigen.', cast: [{ id: 'hero', x: 100 }], layers: ['numbers'], cam: [1.5, 1.3, 100, 150] }
  ] },
  { id: 'final_epilogo', title: 'x = x', world: 'vacio', beats: [
    { scene: 'vacio', who: N, line: 'El Divisor se detuvo. La barra y el cero temblaron, y por primera vez dejaron de tragarse lo demás.', cast: [{ id: 'hero', x: 70 }, { id: 'el_divisor', x: 200 }], layers: ['stars', 'numbers'], cam: [1.1, 1.5, 130, 200], fx: ['flash', 'fade'], music: 'story', sfx: 'swell' },
    { scene: 'vacio', who: 'El Divisor', line: 'No quería destruirlo todo. Solo quería que alguien... me preguntara qué pasó.', cast: [{ id: 'hero', x: 70 }, { id: 'el_divisor', x: 200 }], layers: ['stars', 'numbers'], cam: [1.5, 1.7, 200, 200] },
    { scene: 'vacio', who: H, line: 'Un error no es un final: es un dato. Gracias a ti sabemos que el cero no se divide. Pero sí se puede compartir el trabajo entre todos.', cast: [{ id: 'hero', x: 70 }, { id: 'el_divisor', x: 200 }], layers: ['stars', 'numbers'], cam: [1.7, 1.7, 70, 70] },
    { scene: 'cosmos', who: N, line: 'Los tres fragmentos brillaron a la vez. La barra se volvió un signo igual. El cero, un uno. Y la Ecuación Maestra volvió a decirse a sí misma, en voz alta:', layers: ['stars', 'numbers'], cam: [1, 1.4, 160, 160], fx: ['flash'], sfx: 'win' },
    { scene: 'cosmos', who: N, line: 'x = x.', layers: ['stars', 'numbers'], cam: [1.4, 1.1, 160, 160], sfx: 'swell' },
    { scene: 'academia', who: M, line: 'Lo lograste, {n}. Pero un calculista nunca termina: siempre hay otro problema esperando. Practica en el modo libre, repasa tu cuaderno de errores... y quizá vuelvas a verme en el segundo semestre.', cast: [{ id: 'hero', x: 90 }, { id: 'mentor', x: 200, flip: true }], layers: ['dust'], cam: [1, 1.3, 150, 150], fx: ['fade'], music: 'story' },
    { scene: 'academia', who: N, line: 'FIN DEL PRIMER SEMESTRE.', cast: [{ id: 'hero', x: 90 }, { id: 'mentor', x: 200, flip: true }], layers: ['dust'], cam: [1.3, 1, 150, 150] }
  ] }
];
export const CINE_BY_ID = Object.fromEntries(CINEMATICS.map(c => [c.id, c])) as Record<string, Cinematic>;
/** Cinemática de entrada, justo antes de una zona. */
export const PRE_STORY: Record<string, string[]> = {
  zona_reales: ['mundo_cavernas'], zona_ecuaciones: ['mundo_bosque'], zona_medidas: ['mundo_ciudadela'],
  parcial_cavernas: ['jefe_parcial_cavernas'], parcial_bosque: ['jefe_parcial_bosque'], parcial_ciudadela: ['jefe_parcial_ciudadela'], final: ['mundo_vacio', 'jefe_final']
};
/** Cinemática tras superar la zona. */
export const POST_STORY: Record<string, string> = { parcial_cavernas: 'fragmento_cavernas', parcial_bosque: 'fragmento_bosque', parcial_ciudadela: 'fragmento_ciudadela', final: 'final_epilogo' };

/** Páginas del Diario de la Maestra Aritmia (una por zona principal). */
export const DIARY: Record<string, { title: string; text: string }> = {
  zona_reales: { title: 'Números reales', text: 'Todo número que cabe en la recta es real: enteros, fracciones, raíces, decimales infinitos. Cuando dudes, ubícalo en la recta y compara a simple vista.' },
  zona_porcentajes: { title: 'Porcentajes y variación', text: 'El 10 % es dividir entre 10; el 50 %, entre 2. Un aumento del 20 % es multiplicar por 1,2. Pensar en factores ahorra mucha cuenta.' },
  zona_factorizacion: { title: 'Factorización', text: 'Factorizar es desarmar para entender. Busca primero el factor común; después, la diferencia de cuadrados; al final, el trinomio.' },
  parcial_cavernas: { title: 'Parcial 1', text: 'El Rey Irracional cuidaba un fragmento de la Ecuación. No es el más temible: solo usa muchos temas a la vez. Ve por fases.' },
  zona_ecuaciones: { title: 'Ecuaciones', text: 'Una ecuación es una balanza: lo que haces a un lado, lo haces al otro. Despejar es deshacer operaciones en orden inverso.' },
  zona_funciones: { title: 'Funciones y gráficas', text: 'Una función asigna a cada x una sola y. Si una vertical corta la gráfica dos veces, no es función.' },
  zona_lineal: { title: 'Función lineal', text: 'La pendiente es cuánto sube por cada paso a la derecha. Elévate dividido por recorre: m = Δy / Δx.' },
  zona_sistemas: { title: 'Sistemas de ecuaciones', text: 'Dos rectas que se cruzan comparten un punto: la solución. Sustitución o eliminación, tú eliges; la gráfica te dice si vas bien.' },
  zona_cuadratica: { title: 'Función cuadrática', text: 'La parábola abre hacia arriba si a es positivo, hacia abajo si es negativo. Su vértice es el punto más alto o más bajo.' },
  zona_ecuacionesCuadraticas: { title: 'Ecuaciones cuadráticas', text: 'El discriminante decide: positivo, dos soluciones; cero, una; negativo, ninguna real. La fórmula general siempre funciona.' },
  zona_ondas: { title: 'Ondas (opcional)', text: 'Amplitud es la altura de la cresta, periodo es lo que tarda en repetirse. Todo lo que oscila se parece a un seno.' },
  parcial_bosque: { title: 'Parcial 2', text: 'La Hidra duplica las soluciones. Hallar las dos raíces es cortar las dos cabezas. Respira, comprueba y avanza.' },
  zona_medidas: { title: 'Medidas, áreas y volúmenes', text: 'El perímetro rodea, el área cubre, el volumen llena. No mezcles unidades: si pasas de cm a m, también pasa el cuadrado y el cubo.' },
  zona_pitagoras: { title: 'Pitágoras', text: 'En un triángulo rectángulo, a² + b² = c². La hipotenusa siempre es la más larga. Reconoce tríos pitagóricos: 3-4-5, 5-12-13, 8-15-17.' },
  zona_tales: { title: 'Tales y semejanza', text: 'Rectas paralelas cortan transversales en segmentos proporcionales. Una sombra y un palo bastan para medir una torre.' },
  zona_unidades: { title: 'Sistemas métricos', text: 'Escalera de unidades: cada paso es potencia de 10. Convertir es mover la coma, pero revisa si hay que hacerlo dos o tres veces.' },
  zona_transformaciones: { title: 'Traslación, rotación y reflexión', text: 'Trasladar es sumar el mismo vector a todo. Reflejar sobre x = m cambia la x por 2m − x. Las isometrías no cambian la forma.' },
  zona_plano: { title: 'Plano cartesiano', text: 'El punto (x, y) se ubica primero horizontal y luego vertical. El punto medio es el promedio de cada coordenada.' },
  parcial_ciudadela: { title: 'Parcial 3', text: 'El Coloso mide todo; mídelo tú a él: usa las unidades y cuida los signos. Con orden, nada se escapa.' },
  final: { title: 'El Divisor', text: 'Nunca fue un monstruo: fue un error que nadie corrigió a tiempo. Eso también es matemática: aprender del fallo y seguir.' }
};
