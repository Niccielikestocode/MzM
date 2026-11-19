/** Formateador tipográfico de expresiones matemáticas para preguntas y opciones */

export function formatMath(text: string): string {
  if (!text) return '';

  let out = text;

  // Reemplazar signos comunes
  out = out.replace(/\+\-/g, '±');
  out = out.replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/!=/g, '≠');
  out = out.replace(/\s\*\s/g, ' · ');

  // Raíces cuadradas: sqrt(expr) o √(expr)
  out = out.replace(/sqrt\(([^)]+)\)/gi, '√<span class="m-sqrt">$1</span>');
  out = out.replace(/√([0-9a-zA-Z]+)/g, '√<span class="m-sqrt">$1</span>');

  // Exponentes: x^2, x^n, (expr)^2, 10^-3
  out = out.replace(/([0-9a-zA-Z\)])\^(-?[0-9a-zA-Z]+)/g, '$1<sup>$2</sup>');

  // Subíndices: x_1, y_2
  out = out.replace(/([a-zA-Z])_([0-9a-zA-Z]+)/g, '$1<sub>$2</sub>');

  return out;
}

/** Renderiza texto matemático dentro de un elemento seguro */
export function renderMathText(el: HTMLElement, rawText: string): void {
  // Limpiamos contenido
  el.replaceChildren();

  // Si contiene formato que transformamos a HTML seguro
  const formatted = formatMath(rawText);
  if (formatted.includes('<sup>') || formatted.includes('<sub>') || formatted.includes('class="m-sqrt"')) {
    el.innerHTML = formatted;
  } else {
    el.textContent = formatted;
  }
}
