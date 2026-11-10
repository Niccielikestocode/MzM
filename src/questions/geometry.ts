import { Gen, fmt, frac, gcd, pack, packN, pt } from './helpers';
import { randInt as ri, pick, shuffle } from '../core/rng';

const M = '−';
const PI = 3.14;

export const medidas: Record<string, Gen> = {
  'perimetro': r => {
    const k = ri(r, 0, 3);
    if (k === 0) { const l = ri(r, 3, 15), w = ri(r, 2, 12); return packN(r, 2 * (l + w), [l * w, l + w, 2 * l + w], ' cm', `P = 2(l + w) = 2(${l} + ${w}) = ${2 * (l + w)}.`, { text: `Perímetro de un rectángulo de ${l} cm por ${w} cm.` }); }
    if (k === 1) { const a = ri(r, 3, 14); return packN(r, 4 * a, [a * a, 2 * a, 3 * a], ' cm', `P = 4·${a} = ${4 * a}.`, { text: `Perímetro de un cuadrado de lado ${a} cm.` }); }
    if (k === 2) { const a = ri(r, 3, 12), b = ri(r, 4, 12), c = ri(r, Math.abs(a - b) + 1, a + b - 1); return packN(r, a + b + c, [(a + b + c) / 2, 2 * (a + b + c), a + b], ' cm', `Se suman los tres lados: ${a} + ${b} + ${c}.`, { text: `Perímetro de un triángulo de lados ${a} cm, ${b} cm y ${c} cm.` }); }
    const rad = ri(r, 2, 10); return packN(r, 2 * PI * rad, [PI * rad * rad, PI * rad, 2 * PI * rad * rad], ' cm', `P = 2πr = 2·3,14·${rad} = ${fmt(2 * PI * rad)}.`, { text: `Perímetro de una circunferencia de radio ${rad} cm (π = 3,14).` });
  },
  'area-figuras': r => {
    const k = ri(r, 0, 3);
    if (k === 0) { const b = ri(r, 3, 14), h = ri(r, 2, 10); return packN(r, b * h, [2 * (b + h), b + h, (b * h) / 2], ' cm²', `A = b·h = ${b}·${h}.`, { text: `Área de un rectángulo de base ${b} cm y altura ${h} cm.` }); }
    if (k === 1) { const b = 2 * ri(r, 2, 8), h = ri(r, 3, 10); return packN(r, (b * h) / 2, [b * h, b + h, (b + h) / 2], ' cm²', `A = b·h/2 = ${b}·${h}/2.`, { text: `Área de un triángulo de base ${b} cm y altura ${h} cm.` }); }
    if (k === 2) { const B = ri(r, 8, 14), b = ri(r, 3, 7), h = 2 * ri(r, 2, 5); return packN(r, ((B + b) * h) / 2, [(B + b) * h, B * h, ((B - b) * h) / 2], ' cm²', `A = (B + b)·h/2 = (${B} + ${b})·${h}/2.`, { text: `Área de un trapecio de bases ${B} cm y ${b} cm y altura ${h} cm.` }); }
    const rad = ri(r, 2, 9); return packN(r, PI * rad * rad, [2 * PI * rad, PI * rad, PI * 2 * rad * rad], ' cm²', `A = πr² = 3,14·${rad}² = ${fmt(PI * rad * rad)}.`, { text: `Área de un círculo de radio ${rad} cm (π = 3,14).` });
  },
  'volumen-solidos': r => {
    const k = ri(r, 0, 3);
    if (k === 0) { const a = ri(r, 2, 9); return packN(r, a ** 3, [a * a, 6 * a * a, 3 * a], ' cm³', `V = a³ = ${a}³.`, { text: `Volumen de un cubo de arista ${a} cm.` }); }
    if (k === 1) { const l = ri(r, 2, 9), w = ri(r, 2, 8), h = ri(r, 2, 8); return packN(r, l * w * h, [l + w + h, 2 * (l * w + l * h + w * h), l * w], ' cm³', `V = l·w·h = ${l}·${w}·${h}.`, { text: `Volumen de un prisma de ${l} cm × ${w} cm × ${h} cm.` }); }
    if (k === 2) { const rad = ri(r, 2, 6), h = ri(r, 3, 10); return packN(r, PI * rad * rad * h, [PI * rad * h, 2 * PI * rad * h, (PI * rad * rad * h) / 3], ' cm³', `V = πr²h = 3,14·${rad}²·${h}.`, { text: `Volumen de un cilindro de radio ${rad} cm y altura ${h} cm (π = 3,14).` }); }
    const l = 3 * ri(r, 1, 4), h = ri(r, 3, 9); return packN(r, (l * l * h) / 3, [l * l * h, (l * h) / 3, (l * l * h) / 2], ' cm³', `V = (área de la base · h)/3 = ${l}²·${h}/3.`, { text: `Volumen de una pirámide de base cuadrada de lado ${l} cm y altura ${h} cm.` });
  },
  'area-superficie': r => {
    const k = ri(r, 0, 2);
    if (k === 0) { const a = ri(r, 2, 9); return packN(r, 6 * a * a, [a * a, 4 * a * a, a ** 3 * 6], ' cm²', `Seis caras iguales: 6·${a}².`, { text: `Área total de un cubo de arista ${a} cm.` }); }
    if (k === 1) { const l = ri(r, 2, 8), w = ri(r, 2, 7), h = ri(r, 2, 7); return packN(r, 2 * (l * w + l * h + w * h), [l * w * h, l * w + l * h + w * h, 2 * (l + w + h)], ' cm²', `A = 2(lw + lh + wh).`, { text: `Área total de un prisma de ${l} cm × ${w} cm × ${h} cm.` }); }
    const rad = ri(r, 2, 6), h = ri(r, 3, 9); return packN(r, 2 * PI * rad * (rad + h), [2 * PI * rad * h, PI * rad * rad * h, PI * rad * (rad + h)], ' cm²', `A = 2πr(r + h) = 2·3,14·${rad}·(${rad} + ${h}).`, { text: `Área total de un cilindro de radio ${rad} cm y altura ${h} cm (π = 3,14).` });
  }
};

const TRIPLES: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20]];
export const pitagoras: Record<string, Gen> = {
  'hipotenusa': r => {
    const [a, b, c] = pick(r, TRIPLES);
    return packN(r, c, [a + b, a * a + b * b, c + 1, b - a], '', `c² = ${a}² + ${b}² = ${a * a + b * b}, así que c = ${c}.`, { text: `Un triángulo rectángulo tiene catetos de ${a} y ${b}. ¿Cuánto mide la hipotenusa?` });
  },
  'cateto': r => {
    const [a, b, c] = pick(r, TRIPLES), sw = r() < 0.5, k = sw ? a : b, u = sw ? b : a;
    return packN(r, u, [c - k, c * c - k * k, Math.round(Math.sqrt(c * c + k * k)), u + 1], '', `x² = ${c}² ${M} ${k}² = ${c * c - k * k}, así que x = ${u}.`, { text: `La hipotenusa mide ${c} y un cateto mide ${k}. ¿Cuánto mide el otro cateto?` });
  },
  'problema-escalera': r => {
    const T = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13]]), sw = r() < 0.5, a = sw ? T[1] : T[0], b = sw ? T[0] : T[1], c = T[2];
    const vals = [c, a + b, c + 1, c - 1];
    const base = pack(r, `${c} m`, [`${a + b} m`, `${c + 1} m`, `${c - 1} m`], `${a}² + ${b}² = ${a * a + b * b} = ${c}², así que la escalera mide ${c} m.`, { text: '' });
    const optVals = base.options.map(o => vals.find(v => `${v} m` === o) as number);
    return { ...base, text: `Un muro de ${a} m de alto. La escalera se apoya a ${b} m de su base. ¿Cuánto debe medir para llegar justo al borde?`, stage: { id: 'ladder', meta: { a, b, c, optVals } } };
  },
  'terna': r => {
    const [a, b, c] = pick(r, TRIPLES), s = (x: number[]) => `${x[0]}, ${x[1]}, ${x[2]}`, wr: string[] = [];
    while (wr.length < 3) { const w = [a, b, c + ri(r, 1, 2)]; const x = [a + ri(r, 0, 1), b + ri(r, 1, 2), c]; const cand = r() < 0.5 ? w : x; if (cand[0] ** 2 + cand[1] ** 2 !== cand[2] ** 2 && !wr.includes(s(cand))) wr.push(s(cand)); }
    return pack(r, s([a, b, c]), wr, `${a}² + ${b}² = ${a * a + b * b} = ${c}². Las otras no cumplen a² + b² = c².`, { text: `¿Cuál de estas ternas puede ser los lados de un triángulo rectángulo?` });
  }
};

export const tales: Record<string, Gen> = {
  'proporcion-segmentos': r => {
    const p = ri(r, 2, 5), q = ri(r, 2, 6), s = ri(r, 1, 3), t = ri(r, 2, 4), a = q * s, b = p * s, c = q * t, x = p * t;
    if (p === q) return tales['proporcion-segmentos'](r, 1);
    return packN(r, x, [(a * c) / b, c + (b - a), c - a + b - 1 + 2, (b * c) / (a + 1)], ' cm', `Por Tales ${a}/${b} = ${c}/x → x = ${b}·${c}/${a} = ${x}.`.replace(`${a}/${b}`, `${a}/${b}`),
      { text: `Dos paralelas cortan a dos transversales. Del mismo lado, los segmentos miden ${a} cm y ${b} cm en una transversal, y ${c} cm y x en la otra. ¿Cuánto mide x?` });
  },
  'altura-por-sombra': r => {
    const h = pick(r, [1, 2, 3]) * 0 + ri(r, 1, 2), s1 = ri(r, 1, 3), m = ri(r, 3, 9), s2 = s1 * m, H = h * m;
    return packN(r, H, [s2 - s1 + h, h * s2, (s2 * s1) / h, H + h], ' m', `h/${s1} = H/${s2}: H = ${h}·${s2}/${s1} = ${H}.`,
      { text: `Una vara de ${h} m proyecta una sombra de ${s1} m. A la misma hora, un árbol proyecta una sombra de ${s2} m. ¿Cuánto mide el árbol?` });
  },
  'semejanza-triangulos': r => {
    const a = ri(r, 2, 6), k = pick(r, [2, 3, 1.5, 2.5]), A = a * k, b = 2 * ri(r, 2, 6), B = b * k;
    return packN(r, B, [b + (A - a), (b * a) / A, b * 2, B + 1], ' cm', `La razón de semejanza es ${a}→${fmt(A)}, o sea ×${fmt(k)}; entonces ${b}·${fmt(k)} = ${fmt(B)}.`,
      { text: `Dos triángulos son semejantes. En el primero, el lado de ${a} cm corresponde a uno de ${fmt(A)} cm en el segundo. ¿Cuánto mide en el segundo el lado que en el primero mide ${b} cm?` });
  }
};

export const unidades: Record<string, Gen> = {
  'conversion-longitud': r => {
    const k = ri(r, 0, 3);
    const defs = [['km', 'm', 1000], ['m', 'cm', 100], ['cm', 'mm', 10], ['m', 'mm', 1000]] as const;
    const [u, v, f] = defs[k], n = pick(r, [2, 3, 4, 5, 7, 12, 2.5, 0.5, 3.5]);
    return packN(r, n * f, [n * f * 10, n * f / 10, n / f, n * f * 100], ` ${v}`, `1 ${u} = ${f} ${v}, así que ${fmt(n)} ${u} = ${fmt(n * f)} ${v}.`, { text: `Convierte ${fmt(n)} ${u} a ${v}.`, units: `1 ${u} = ${f} ${v}` });
  },
  'conversion-volumen-masa': r => {
    const defs = [['L', 'mL', 1000], ['kg', 'g', 1000], ['t', 'kg', 1000], ['m³', 'L', 1000]] as const;
    const [u, v, f] = pick(r, defs), n = pick(r, [2, 3, 4, 5, 1.5, 0.5, 2.5, 6]);
    return packN(r, n * f, [n * f * 10, n * f / 10, n / f, n * f * 100], ` ${v}`, `1 ${u} = ${f} ${v}, así que ${fmt(n)} ${u} = ${fmt(n * f)} ${v}.`, { text: `Convierte ${fmt(n)} ${u} a ${v}.`, units: `1 ${u} = ${f} ${v}` });
  },
  'escalas': r => {
    const sc = pick(r, [25000, 50000, 100000]), cm = pick(r, [2, 4, 5, 8, 10]), km = (cm * sc) / 100000;
    return packN(r, km, [km * 10, km / 10, km * 100, (cm * sc) / 1000], ' km', `${cm} cm · ${fmt(sc)} = ${fmt(cm * sc)} cm = ${fmt(km)} km.`, { text: `En un mapa a escala 1:${fmt(sc)}, dos ciudades están a ${cm} cm. ¿Qué distancia real hay entre ellas?` });
  },
  'cadena-conversion': r => {
    if (r() < 0.5) { const v = 18 * ri(r, 2, 8), ms = v / 3.6; return packN(r, ms, [v * 3.6, v / 60, v * 1000, v / 3600], ' m/s', `${v} km/h · 1000 m/km ÷ 3600 s/h = ${fmt(ms)} m/s (se divide entre 3,6).`, { text: `Un auto va a ${v} km/h. ¿Cuántos metros por segundo recorre?` }); }
    const ms = ri(r, 3, 15), kmh = ms * 3.6;
    return packN(r, kmh, [ms / 3.6, ms * 60, ms * 1000, ms * 3.6 * 10], ' km/h', `${ms} m/s · 3600 s/h ÷ 1000 m/km = ${fmt(kmh)} km/h (se multiplica por 3,6).`, { text: `Un ciclista va a ${ms} m/s. ¿Cuántos kilómetros por hora son?` });
  }
};

export const transformaciones: Record<string, Gen> = {
  'traslacion-coord': r => {
    const ax = ri(r, 1, 3), ay = ri(r, 1, 2), dx = ri(r, 2, 5), dy = ri(r, 0, 2), ok: [number, number] = [ax + dx, ay + dy];
    const cand: [number, number][] = [[ax + dy, ay + dx], [ax + dx, ay], [ax, ay + dy], [ax + dx + 1, ay + dy], [ax + dx, ay + dy + 1], [ax + dx - 1, ay + dy]];
    const seen = new Set([ok.join()]), wr: [number, number][] = [];
    cand.forEach(c => { if (c[0] >= 0 && c[0] <= 9 && c[1] >= 0 && c[1] <= 5 && !seen.has(c.join()) && wr.length < 3) { seen.add(c.join()); wr.push(c); } });
    const base = pack(r, pt(...ok), wr.map(c => pt(...c)), `Cada vértice se mueve (+${dx}, +${dy}): A (${ax}, ${ay}) → A' (${ok[0]}, ${ok[1]}).`, { text: '' });
    const optPts = base.options.map(o => [ok, ...wr].find(c => pt(...c) === o));
    return { ...base, text: `El triángulo ABC con A (${ax}, ${ay}) se traslada ${dx} a la derecha y ${dy} arriba. ¿Dónde queda A'?`, stage: { id: 'translate', meta: { ax, ay, dx, dy, optPts } } };
  },
  'reflexion-eje': (r, d) => {
    if (d <= 2 && r() < 0.7) {
      const m = ri(r, 4, 5), ax = Math.min(ri(r, 1, 2), m - 3), ay = ri(r, 1, 2), ok: [number, number] = [2 * m - ax, ay];
      const cand: [number, number][] = [[m + ax, ay], [2 * m - ax + 1, ay], [2 * m - ax, ay + 1], [ax, 2 * m - ax], [2 * m - ax - 1, ay]];
      const seen = new Set([ok.join()]), wr: [number, number][] = [];
      cand.forEach(c => { if (c[0] >= 0 && c[0] <= 11 && c[1] >= 0 && c[1] <= 6 && !seen.has(c.join()) && wr.length < 3) { seen.add(c.join()); wr.push(c); } });
      const base = pack(r, pt(...ok), wr.map(c => pt(...c)), `A está a ${m - ax} de la recta; su reflejo queda ${m - ax} al otro lado: A' ${pt(...ok)}.`, { text: '' });
      const optPts = base.options.map(o => [ok, ...wr].find(c => pt(...c) === o));
      return { ...base, text: `El triángulo ABC con A (${ax}, ${ay}) se refleja sobre la recta x = ${m}. ¿Dónde queda A'?`, stage: { id: 'reflect', meta: { m, ax, ay, optPts } } };
    }
    const a = ri(r, -6, 6) || 2, b = ri(r, -6, 6) || 3, eje = pick(r, ['X', 'Y']);
    const ok = eje === 'X' ? pt(a, -b) : pt(-a, b);
    return pack(r, ok, [pt(-a, -b), pt(b, a), eje === 'X' ? pt(-a, b) : pt(a, -b)], eje === 'X' ? 'Al reflejar sobre el eje X cambia el signo de y.' : 'Al reflejar sobre el eje Y cambia el signo de x.', { text: `Refleja el punto ${pt(a, b)} sobre el eje ${eje}.` });
  },
  'rotacion-90': r => {
    const a = ri(r, -6, 6) || 2, b = ri(r, -6, 6) || 3, k = ri(r, 0, 2);
    const names = ['90° en sentido antihorario', '90° en sentido horario', '180°'], res = [pt(-b, a), pt(b, -a), pt(-a, -b)];
    return pack(r, res[k], res.filter((_, i) => i !== k).concat([pt(b, a)]), k === 0 ? '(x, y) → (−y, x).' : k === 1 ? '(x, y) → (y, −x).' : '(x, y) → (−x, −y).', { text: `Gira el punto ${pt(a, b)} ${names[k]} alrededor del origen.` });
  },
  'composicion': r => {
    const a = ri(r, 1, 5), b = ri(r, 1, 5), dx = ri(r, 1, 4), dy = ri(r, -3, 3), eje = pick(r, ['X', 'Y']);
    const t = [a + dx, b + dy], ok = eje === 'X' ? pt(t[0], -t[1]) : pt(-t[0], t[1]);
    const rev = eje === 'X' ? pt(a + dx, -b + dy) : pt(-a + dx, b + dy);
    return pack(r, ok, [rev, pt(-t[0], -t[1]), pt(t[0], t[1])], `Primero se traslada: ${pt(t[0], t[1])}. Luego se refleja sobre el eje ${eje}: ${ok}.`, { text: `El punto ${pt(a, b)} se traslada (${dx >= 0 ? '+' : M}${Math.abs(dx)}, ${dy >= 0 ? '+' : M}${Math.abs(dy)}) y luego se refleja sobre el eje ${eje}. ¿Dónde queda?` });
  }
};

export const plano: Record<string, Gen> = {
  'ubicar-puntos': r => {
    const x = ri(r, 2, 9), y = ri(r, 1, 5);
    return { text: `El Caballero Coordenado se esconde en la niebla, en el punto (${x}, ${y}). Toca esa intersección en el plano.`, options: [], correct: -1, explain: `Punto (${x}, ${y}): ${x} pasos a la derecha y ${y} hacia arriba. Primero x (horizontal), luego y (vertical).`, clickTarget: { x, y }, stage: { id: 'clickpoint', meta: { tx: x, ty: y } } };
  },
  'punto-medio': r => {
    const x1 = ri(r, -6, 4) * 2, y1 = ri(r, -4, 4) * 2, x2 = ri(r, -6, 6) * 2, y2 = ri(r, -4, 6) * 2, ok = pt((x1 + x2) / 2, (y1 + y2) / 2);
    return pack(r, ok, [pt(x1 + x2, y1 + y2), pt((x2 - x1) / 2, (y2 - y1) / 2), pt((x1 + x2) / 2, (y1 - y2) / 2), pt(x2 - x1, y2 - y1)], `Se promedian las coordenadas: ((${x1} + ${x2})/2, (${y1} + ${y2})/2) = ${ok}.`.replace(/\+ -/g, `${M} `), { text: `¿Cuál es el punto medio entre ${pt(x1, y1)} y ${pt(x2, y2)}?` });
  },
  'distancia-puntos': r => {
    const [a, b, c] = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13]]), x1 = ri(r, -4, 3), y1 = ri(r, -4, 3), sx = r() < 0.5 ? 1 : -1, sy = r() < 0.5 ? 1 : -1;
    return packN(r, c, [a + b, a * a + b * b, c + 1, Math.abs(a - b)], '', `d = √((${a})² + (${b})²) = √${a * a + b * b} = ${c}.`, { text: `¿Cuál es la distancia entre ${pt(x1, y1)} y ${pt(x1 + sx * a, y1 + sy * b)}?` });
  },
  'area-poligono': r => {
    const b = ri(r, 3, 8), h = 2 * ri(r, 2, 4), ox = ri(r, -3, 2), oy = ri(r, -3, 2), px = ri(r, 1, b - 1);
    return packN(r, (b * h) / 2, [b * h, b + h, (b + h) / 2, b * h / 3], ' u²', `Base ${b} y altura ${h}: A = ${b}·${h}/2 = ${(b * h) / 2}.`, { text: `¿Cuál es el área del triángulo de vértices ${pt(ox, oy)}, ${pt(ox + b, oy)} y ${pt(ox + px, oy + h)}?` });
  }
};
void frac; void gcd; void shuffle;
