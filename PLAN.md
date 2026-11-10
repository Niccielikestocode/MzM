# Plan de construcción de Juego Mate

Decisión de motor: se mantiene Vite + TypeScript + PWA, pero el render es Canvas 2D propio en lugar de Phaser. Todo el arte ya se genera por código (SpriteGen, CardArt) y los retos animados ya están probados en Canvas 2D; Phaser añadiría 1 MB y una capa que aquí no aporta. La interfaz (pregunta, respuestas, mano) es DOM responsive.

## Hitos
1. Andamiaje: Vite, TS estricto, vite-plugin-pwa, Vitest.
2. Preguntas: generador por plantilla para los 16 temas (4 opciones, distractores por error típico, explicación, metadatos para retos animados).
3. Núcleo puro y testeable: RNG con semilla, dominio de temas, generador de niveles (aprendizaje y libre), combate (reglas de cartas y reliquias), recompensas, logros, guardado.
4. Render: fondos por mundo, actores animados, retos animados (proyectil, rampa, escalera, plano, traslación, reflexión), gráficas de funciones.
5. Pantallas: título, perfil, mapa de campaña, aprendizaje, libre, sala (diálogo, combate, tesoro, descanso), cartas, logros, libro de errores, ajustes.
6. PWA, sonido sintetizado, pruebas de humo en navegador, build.

## Alcance de esta primera versión jugable
Incluye los tres modos, los 16 temas, 24 niveles de campaña, cartas, reliquias, logros, libro de errores y guardado local. Las respuestas son de opción múltiple; la entrada libre (números, expresiones) y el arte dibujado a mano quedan para la siguiente iteración.
