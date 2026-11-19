/** Motor pedagógico de diagnóstico de errores conceptuales matemáticos */

export interface DiagnosisReport {
  id: string;
  title: string;
  why: string;
  steps: string[];
  tip: string;
}

function numVal(s: string): number | null {
  const clean = s.replace(/[^\d.,/-]/g, '').replace(',', '.');
  if (!clean) return null;
  if (clean.includes('/')) {
    const [a, b] = clean.split('/').map(Number);
    return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null;
  }
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export function diagnoseMistake(o: { topic: string; template: string; text: string; given: string; answer: string; explain: string }): DiagnosisReport {
  const gNum = numVal(o.given);
  const aNum = numVal(o.answer);

  // 1. Error de signo opuesto
  if (gNum !== null && aNum !== null && aNum !== 0 && Math.abs(gNum + aNum) < 0.01) {
    return {
      id: 'sign_flip',
      title: 'Tropiezo de signo (+ / −)',
      why: `Obtuviste la magnitud exacta (${Math.abs(aNum)}), pero con el signo invertido. Al despejar o multiplicar negativos es muy común cambiar o olvidar un signo.`,
      steps: [
        'Identifica primero todos los signos negativos en la expresión.',
        'Recuerda la regla: (−)·(−) = (+) y al pasar un término al otro lado del igual cambia de operación.',
        `Verifica sustituyendo ${o.answer} en el enunciado original.`
      ],
      tip: '¡Pilas con el signo! Antes de marcar, pregúntate: ¿tiene sentido que sea positivo o negativo?'
    };
  }

  // 2. Diagnóstico especializado por tema matemático
  switch (o.topic) {
    case 'reales':
      return {
        id: 'reales_fraccion',
        title: 'Operación o equivalencia en números reales',
        why: 'En fracciones y raíces el error más frecuente es sumar denominadores directamente o aplicar la raíz término a término.',
        steps: [
          'Si hay fracciones con distinto denominador, busca primero el mínimo común múltiplo (m.c.m.).',
          'Respeta la jerarquía de operaciones: paréntesis → potencias/raíces → multiplicación/división → suma/resta.',
          o.explain
        ],
        tip: 'No mezcles peras con manzanas: para sumar fracciones, primero ponlas en el mismo denominador.'
      };

    case 'porcentajes':
      return {
        id: 'porcentaje_base',
        title: 'Cálculo de porcentaje o variación',
        why: 'Suele confundirse el valor del descuento/aumento con el precio final, o mover mal la coma al pasar de % a decimal.',
        steps: [
          'Convierte el porcentaje dividiendo entre 100 (ej. 20 % = 0,20).',
          'Multiplica ese decimal por la cantidad base.',
          'Revisa si la pregunta pide el cambio (cuánto bajó/subió) o el total final. ' + o.explain
        ],
        tip: 'El 10 % es dividir por 10; desde ahí puedes calcular casi cualquier porcentaje mentalmente.'
      };

    case 'factorizacion':
      return {
        id: 'factor_comun',
        title: 'Factorización o producto notable',
        why: 'Un clásico es olvidar el término del medio en (a+b)² = a² + 2ab + b², o elegir factores que suman bien pero no multiplican al término independiente.',
        steps: [
          'Busca primero si hay un factor común en todos los términos.',
          'Si es trinomio x² + bx + c, busca dos números que sumen b y multipliquen c.',
          'Comprueba multiplicando tu respuesta de vuelta: debe dar la expresión inicial.'
        ],
        tip: 'Factorizar es desarmar una multiplicación: ¡si multiplicas de vuelta y te da igual, vas a la fija!'
      };

    case 'ecuaciones':
    case 'sistemas':
      return {
        id: 'despeje_balanza',
        title: 'Despeje de incógnita (La Balanza)',
        why: 'Al mover un número al otro lado del igual, a veces se cambia el signo cuando en realidad estaba multiplicando (debía pasar a dividir).',
        steps: [
          'Agrupa todos los términos con x en un lado y los números solos en el otro.',
          'Lo que suma pasa a restar; lo que multiplica pasa a dividir conservando su signo.',
          `Reemplaza x = ${o.answer} en la ecuación para comprobar que ambos lados dan lo mismo.`
        ],
        tip: 'Una ecuación es una balanza andina: lo que hagas a un lado, hazlo exacto al otro.'
      };

    case 'lineal':
    case 'funciones':
      return {
        id: 'pendiente_intercepto',
        title: 'Pendiente (m) e intercepto (b)',
        why: 'Es muy común invertir la fórmula de la pendiente (poner Δx/Δy en lugar de Δy/Δx) o confundir el corte con el eje Y con el corte con el eje X.',
        steps: [
          'Recuerda: pendiente m = (y₂ − y₁) / (x₂ − x₁) = cuánto sube dividido cuánto avanza.',
          'El intercepto b es el valor de y cuando x = 0.',
          o.explain
        ],
        tip: 'Pendiente positiva sube hacia la derecha; negativa baja. ¡Mira siempre la dirección!'
      };

    case 'cuadratica':
    case 'ecuacionesCuadraticas':
      return {
        id: 'vertice_raices',
        title: 'Parábola, vértice o raíces cuadráticas',
        why: 'En ax² + bx + c = 0 suele olvidarse el signo menos en x_v = −b/(2a) o confundir las dos raíces de la fórmula general.',
        steps: [
          'Identifica claramente los coeficientes a, b y c (con sus signos).',
          'El vértice siempre está en x = −b / (2a).',
          o.explain
        ],
        tip: 'Si a > 0 la parábola sonríe (abre arriba); si a < 0 abre hacia abajo.'
      };

    case 'pitagoras':
    case 'tales':
    case 'medidas':
    case 'plano':
      return {
        id: 'geometria_formula',
        title: 'Relación geométrica o teorema',
        why: 'En Pitágoras es frecuente sumar los catetos sin elevarlos al cuadrado, o sumar en vez de restar cuando buscas un cateto y ya tienes la hipotenusa.',
        steps: [
          'Haz un dibujo mental e identifica cuál es el lado más largo (la hipotenusa c).',
          'Aplica c² = a² + b²: si buscas c sumas cuadrados; si buscas un cateto, restas.',
          'No olvides sacar la raíz cuadrada al final. ' + o.explain
        ],
        tip: 'La hipotenusa SIEMPRE es el lado más largo frente al ángulo recto de 90°.'
      };

    default:
      return {
        id: 'general_check',
        title: 'Revisión del procedimiento',
        why: `Marcaste «${o.given}», pero el resultado correcto es «${o.answer}». Revisemos el razonamiento paso a paso.`,
        steps: [
          'Lee nuevamente qué dato exacto pregunta el enunciado.',
          o.explain,
          'Repite un ejercicio similar para fijar el patrón.'
        ],
        tip: 'Un error bien analizado vale más que diez aciertos de suerte.'
      };
  }
}

/** Consejo pedagógico contextual sin regalar la respuesta («El Susurro de la Maestra»). */
export function smartHintFor(q: { topic: string; text: string; options: string[]; correct: number }): string {
  const txt = q.text.toLowerCase();
  switch (q.topic) {
    case 'reales':
      if (txt.includes('/')) return 'Para sumar o restar fracciones, busca primero un denominador común (m.c.m.) antes de operar los numeradores.';
      if (txt.includes('√') || txt.includes('raíz')) return 'Busca un cuadrado perfecto que divida al número dentro de la raíz y revisa los signos.';
      return 'Respeta la jerarquía: paréntesis primero, luego potencias/raíces, multiplicación/división y al final sumas o restas.';
    case 'porcentajes':
      return 'Convierte el porcentaje dividiendo entre 100 (ej. 15% = 0,15) y fíjate si preguntan por el descuento o por el valor final.';
    case 'factorizacion':
      return 'Busca primero un factor común. Si es x² + bx + c, encuentra dos números que sumen b y multipliquen c.';
    case 'ecuaciones':
      return 'Mantén la balanza en equilibrio: pasa las x a un lado y los números al otro cambiando su operación (suma ↔ resta, × ↔ ÷).';
    case 'sistemas':
      return 'Despeja una letra en la ecuación más sencilla y sustitúyela en la otra, o busca dónde se cruzan ambas rectas.';
    case 'funciones':
      return 'Recuerda: el dominio son los valores válidos de x (entrada) y el rango los de y (salida). Prueba evaluando x = 0.';
    case 'lineal':
      return 'La pendiente es m = Δy / Δx (cuánto sube entre cuánto avanza). El punto (0, b) es donde corta al eje vertical Y.';
    case 'cuadratica':
      return 'El eje de simetría y vértice están en x_v = −b / (2a). Si a > 0 abre hacia arriba; si a < 0 abre hacia abajo.';
    case 'ecuacionesCuadraticas':
      return 'Iguala la ecuación a 0 y prueba factorizar o revisar qué valores hacen cero cada paréntesis.';
    case 'ondas':
      return 'La amplitud es la altura desde la línea media hasta la cresta; el período es cuánto tarda en completar un ciclo.';
    case 'medidas':
      return 'Verifica si te piden perímetro (suma de bordes), área (base × altura o ÷ 2 en triángulos) o volumen (área base × altura).';
    case 'pitagoras':
      return 'En triángulo rectángulo: c² = a² + b². Si buscas la hipotenusa c, sumas cuadrados; si buscas un cateto, restas al cuadrado de c.';
    case 'tales':
      return 'Plantea una regla de tres proporcional: altura grande / sombra grande = altura pequeña / sombra pequeña.';
    case 'unidades':
      return 'Ten en cuenta los factores de conversión (1 km = 1000 m, 1 h = 3600 s, 1 m² = 10 000 cm²).';
    case 'transformaciones':
      return 'Trasladar suma (dx, dy) a cada punto; reflejar respecto al eje X cambia el signo de y; respecto al eje Y cambia el de x.';
    case 'plano':
      return 'En (x, y), x indica derecha/izquierda e y arriba/abajo. La distancia usa √((x₂−x₁)² + (y₂−y₁)²).';
    default:
      return 'Lee con calma qué pide el enunciado y descarta primero las opciones con signo o magnitud imposible.';
  }
}
