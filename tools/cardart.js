/* Ilustraciones animadas de cartas (64x40, 8 cuadros) y marcos de carta (80x112) para Juego Mate.
 * UMD: navegador (window.CardArt) y Node (require). Necesita SpriteGen para los glifos de 5x5. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports && typeof window === 'undefined') module.exports = factory(require('./spritegen.js'));
  else root.CardArt = factory(root.SpriteGen);
})(typeof self !== 'undefined' ? self : this, function (SG) {
  var INK = '#14101f', W = '#ffffff', GOLD = '#e0b84c';
  var TYPES = {
    ataque: { m: '#d9434f', l: '#ff9aa2', d: '#6b1f2a', bg: ['#1a0d17', '#3a1523', '#6b1f2a', '#a8323f'] },
    defensa: { m: '#5f8bff', l: '#b9ceff', d: '#223a7a', bg: ['#0d1224', '#18284f', '#223a7a', '#3d63c4'] },
    utilidad: { m: '#6fcf8f', l: '#c4f5d3', d: '#1f5a37', bg: ['#0b1a14', '#12362a', '#1f5a37', '#3da36a'] },
    riesgo: { m: '#e0b84c', l: '#fff0b0', d: '#6b4f12', bg: ['#1c1408', '#3a2a0c', '#6b4f12', '#b08a28'] },
    reliquia: { m: '#b04fd1', l: '#ecb8ff', d: '#3d1a52', bg: ['#150a1f', '#2a1245', '#3d1a52', '#7a2f9e'] }
  };
  var RARITY = { comun: { n: 1, gem: '#a99fc0' }, rara: { n: 2, gem: '#6fb7ff' }, epica: { n: 3, gem: '#d06bff' }, legendaria: { n: 4, gem: '#f2c14e' } };

  /* fuente 3x5 para números y letras sueltas */
  var NF = {
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '###', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'], '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'], '-': ['...', '...', '###', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'],
    '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'], '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'],
    '=': ['...', '###', '...', '###', '...'], '?': ['###', '..#', '.##', '...', '.#.'], 'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
    'C': ['.##', '#..', '#..', '#..', '.##'], 'x': ['#.#', '#.#', '.#.', '#.#', '#.#'], 'y': ['#.#', '#.#', '.#.', '.#.', '.#.'], 'k': ['#.#', '#.#', '##.', '#.#', '#.#'],
    'm': ['#.#', '###', '###', '#.#', '#.#'], '/': ['..#', '..#', '.#.', '#..', '#..'], ' ': ['..', '..', '..', '..', '..']
  };

  function Art(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null); }
  Art.prototype.p = function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.px[y * this.w + x] = c; };
  Art.prototype.r = function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.p(x + i, y + j, c); };
  Art.prototype.d = function (cx, cy, r, c) { for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) if (x * x + y * y <= r * r + 0.5) this.p(cx + x, cy + y, c); };
  Art.prototype.ring = function (cx, cy, r, c, th) { th = th || 0.7; for (var y = -r - 1; y <= r + 1; y++) for (var x = -r - 1; x <= r + 1; x++) { var dd = Math.hypot(x, y); if (Math.abs(dd - r) <= th) this.p(cx + x, cy + y, c); } };
  Art.prototype.l = function (x0, y0, x1, y1, c) { var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (var i = 0; i <= n; i++) this.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); };
  Art.prototype.tri = function (x0, y0, x1, y1, x2, y2, c) {
    var minx = Math.floor(Math.min(x0, x1, x2)), maxx = Math.ceil(Math.max(x0, x1, x2)), miny = Math.floor(Math.min(y0, y1, y2)), maxy = Math.ceil(Math.max(y0, y1, y2));
    var den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2); if (!den) return;
    for (var y = miny; y <= maxy; y++) for (var x = minx; x <= maxx; x++) {
      var a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / den, b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / den, g = 1 - a - b;
      if (a >= -0.02 && b >= -0.02 && g >= -0.02) this.p(x, y, c);
    }
  };
  Art.prototype.g = function (name, x, y, c, s) { s = s || 1; var rows = SG.GLYPHS[name]; if (!rows) return; for (var j = 0; j < 5; j++) for (var i = 0; i < 5; i++) if (rows[j][i] === '#') this.r(x + i * s, y + j * s, s, s, c); };
  Art.prototype.txt = function (str, x, y, c, s) { s = s || 1; for (var k = 0; k < str.length; k++) { var rows = NF[str[k]] || NF[' ']; var w = rows[0].length; for (var j = 0; j < 5; j++) for (var i = 0; i < w; i++) if (rows[j][i] === '#') this.r(x + i * s, y + j * s, s, s, c); x += (w + 1) * s; } };
  function spark(A, x, y, t, c) { var ph = (t + x) % 4; if (ph < 2) { A.p(x, y, c); A.p(x - 1, y, c); A.p(x + 1, y, c); A.p(x, y - 1, c); A.p(x, y + 1, c); } else if (ph === 2) A.p(x, y, c); }
  function bez(p0, p1, p2, u) { var a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u; return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]; }
  function lerp(a, b, u) { return a + (b - a) * u; }

  function bg(A, C, t) {
    var bay = [[0, 2], [3, 1]];
    for (var y = 0; y < A.h; y++) for (var x = 0; x < A.w; x++) {
      var v = 1 - Math.min(1, Math.hypot((x - 32) / 38, (y - 20) / 26)); v += 0.05 * Math.sin(t * 0.8 + x * 0.25);
      var idx = Math.max(0, Math.min(3, Math.floor(v * 3.2 + (bay[y & 1][x & 1] + 0.5) / 4)));
      A.px[y * A.w + x] = C.bg[idx];
    }
  }

  var P = {};
  P.estocada_basica = function (A, t, C) {
    A.l(14, 33, 34, 12, '#8f98b3'); A.l(15, 33, 35, 12, '#d6dbe8'); A.l(16, 32, 36, 11, W);
    A.l(11, 28, 20, 36, GOLD); A.l(12, 28, 21, 36, '#f2d27a'); A.l(10, 38, 13, 34, '#7a5a3a');
    var head = Math.min(1, (t + 1) / 5);
    for (var u = 0; u <= head; u += 0.02) {
      if (t >= 5 && u < (t - 4) / 4) continue;
      var q = bez([6, 36], [26, 4], [58, 14], u); A.p(q[0], q[1] - 1, C.m); A.p(q[0], q[1], W); A.p(q[0], q[1] + 1, C.l);
    }
    var tip = bez([6, 36], [26, 4], [58, 14], head); spark(A, tip[0], tip[1], t, W);
  };
  P.estocada_pitagorica = function (A, t, C) {
    var q = [12, 32], r = [44, 32], s = [12, 8];
    A.l(q[0], q[1], r[0], r[1], C.l); A.l(q[0], q[1], s[0], s[1], C.l); A.l(r[0], r[1], s[0], s[1], W); A.l(r[0], r[1] - 1, s[0] + 1, s[1], C.m);
    A.r(12, 29, 3, 3, C.m);
    A.txt('4', 26, 34, C.w || W, 1); A.txt('3', 6, 18, W, 1); A.txt('5', 31, 17, GOLD, 1);
    var u = (t + 1) / 9; spark(A, lerp(r[0], s[0], u), lerp(r[1], s[1], u), t, W);
    spark(A, 54, 10, t + 1, C.l); spark(A, 52, 30, t + 2, C.l);
  };
  P.flecha_parabolica = function (A, t, C) {
    A.l(6, 36, 6, 4, C.d); A.l(6, 36, 60, 36, C.d);
    var Y = function (x) { return 34 - 26 * (1 - Math.pow((x - 32) / 24, 2)); };
    for (var x = 8; x <= 56; x += 2) A.p(x, Y(x), C.l);
    A.ring(56, 34, 4, GOLD); A.d(56, 34, 1, '#ff4f79');
    var u = (t + 1) / 9, ax = lerp(8, 56, u), ay = Y(ax), ang = Math.atan2(Y(ax + 1) - Y(ax - 1), 2);
    for (var k = 1; k < 5; k++) { A.p(ax - Math.cos(ang) * k * 2, ay - Math.sin(ang) * k * 2, C.m); }
    for (var i = -3; i <= 3; i++) A.p(ax + Math.cos(ang) * i, ay + Math.sin(ang) * i, W);
    A.p(ax + Math.cos(ang) * 4, ay + Math.sin(ang) * 4, C.l); A.p(ax - Math.cos(ang) * 4, ay - Math.sin(ang) * 4 - 1, C.m); A.p(ax - Math.cos(ang) * 4, ay - Math.sin(ang) * 4 + 1, C.m);
    A.p(32, 8, GOLD); A.p(31, 8, GOLD); A.p(33, 8, GOLD);
  };
  P.rayo_de_raiz = function (A, t, C) {
    A.l(4, 30, 60, 30, C.d);
    for (var x = 12; x <= 52; x++) { var y = 30 - (-(x - 32) * (x - 32) / 14 + 14); A.p(x, y, C.l); A.p(x, y + 1, C.m); }
    [18, 46].forEach(function (rx, i) {
      var cx = rx; for (var y = 0; y < 30; y += 3) { var nx = cx + ((y / 3 + t + i) % 2 ? 2 : -2); A.l(cx, y, nx, y + 3, t % 2 ? W : C.l); cx = nx; }
      A.d(rx, 30, 2, GOLD); if (t % 2 === 0) A.ring(rx, 30, 4, C.l);
    });
    A.g('root', 29, 17, C.l);
  };
  P.golpe_porcentual = function (A, t, C) {
    var off = 2 + (t % 4);
    for (var y = -14; y <= 14; y++) for (var x = -14; x <= 14; x++) {
      if (x * x + y * y > 196) continue; var a = Math.atan2(y, x), inSlice = a < 0 && a > -1.1;
      if (inSlice) A.p(30 + x + off, 22 + y - off + 2, C.l); else A.p(30 + x - 1, 22 + y + 1, x * 0.6 + y * 0.8 > 6 ? C.d : C.m);
    }
    A.g('pct', 48, 6, W, 2); spark(A, 12, 8, t, GOLD); spark(A, 54, 32, t + 2, GOLD);
  };
  P.corte_de_factor = function (A, t, C) {
    var gap = [0, 1, 3, 4, 4, 3, 1, 0][t];
    A.tri(14 - gap, 10 - gap, 38 - gap, 10 - gap, 14 - gap, 30 - gap, C.m); A.tri(40 + gap, 12 + gap, 40 + gap, 32 + gap, 16 + gap, 32 + gap, C.d);
    A.l(14 - gap, 10 - gap, 38 - gap, 10 - gap, C.l); A.l(14 - gap, 10 - gap, 14 - gap, 30 - gap, C.l);
    if (t >= 1 && t <= 3) { A.l(10, 34, 46, 8, W); A.l(11, 34, 47, 8, C.l); }
    A.g('fact', 48, 20, C.l); spark(A, 50, 8, t, W); spark(A, 8, 30, t + 1, C.l);
  };
  P.onda_de_choque = function (A, t, C) {
    for (var x = 2; x < 62; x++) { var y = 20 + 9 * Math.sin((x - t * 5) * 0.25); A.p(x, y, W); A.p(x, y + 1, C.m); A.p(x, y - 1, C.l); }
    var rr = (t * 5) % 40; A.ring(12, 20, rr + 2, C.l); A.ring(12, 20, Math.max(2, rr - 8), C.m);
    A.g('wave', 50, 4, C.l, 1); A.d(12, 20, 3, W);
  };
  P.escudo_de_balanza = function (A, t, C) {
    A.tri(32, 3, 52, 9, 52, 22, C.m); A.tri(32, 3, 12, 9, 12, 22, C.m); A.tri(12, 22, 52, 22, 32, 37, C.m); A.tri(32, 3, 52, 22, 12, 22, C.m);
    A.tri(32, 3, 52, 9, 52, 22, C.m); A.tri(32, 3, 52, 22, 32, 37, C.d);
    A.l(32, 3, 52, 9, C.l); A.l(32, 3, 12, 9, C.l); A.l(12, 9, 12, 22, C.l); A.l(12, 22, 32, 37, C.d); A.l(52, 22, 32, 37, C.d);
    var ang = Math.sin(t * 0.8) * 0.28, cx = 32, cy = 16;
    A.l(cx, cy, cx, 28, W); A.r(28, 28, 8, 2, W);
    var ax = cx - Math.cos(ang) * 9, ay = cy - Math.sin(ang) * 9, bx = cx + Math.cos(ang) * 9, by = cy + Math.sin(ang) * 9;
    A.l(ax, ay, bx, by, W); A.l(ax, ay, ax, ay + 4, C.l); A.l(bx, by, bx, by + 4, C.l); A.r(ax - 3, ay + 4, 7, 1, GOLD); A.r(bx - 3, by + 4, 7, 1, GOLD);
    spark(A, 20, 14, t, W);
  };
  P.espejo_reflejo = function (A, t, C) {
    for (var y = 2; y < 38; y += 4) A.r(32, y, 1, 2, W);
    A.tri(12, 30, 26, 30, 18, 12, C.m); A.l(12, 30, 18, 12, C.l);
    for (var y2 = 12; y2 < 31; y2++) for (var x = 38; x < 53; x++) if ((x + y2) % 2 === 0) { var u = (y2 - 12) / 18, hw = 7 * u; if (Math.abs(x - 45) <= hw + 0.5) A.p(x, y2, C.l); }
    var u2 = (t % 8) / 7; var bx = lerp(24, 40, u2), by = lerp(22, 22, u2) - Math.sin(u2 * 3.14) * 6; A.d(bx, by, 1, W); spark(A, bx, by, t, C.l);
    spark(A, 56, 8, t, W);
  };
  P.barrera_metrica = function (A, t, C) {
    A.r(24, 2, 16, 36, C.d); A.r(24, 2, 16, 1, C.l); A.r(24, 37, 16, 1, C.m);
    for (var y = 4; y < 36; y += 3) A.r(24, y, y % 6 === 4 ? 8 : 4, 1, C.l);
    var sy = 37 - (t * 5) % 35; A.r(25, sy, 14, 2, W); A.r(25, sy + 2, 14, 1, C.l);
    A.g('heart', 46, 8 + (t % 3), '#ff7a8a'); spark(A, 12, 16, t, W); spark(A, 52, 30, t + 2, C.l);
  };
  P.muralla_cartesiana = function (A, t, C) {
    for (var row = 0; row < 6; row++) { var y = 4 + row * 6; A.r(4, y, 56, 1, C.d); for (var x = 4 + (row % 2) * 6; x < 60; x += 12) A.r(x, y, 1, 6, C.d); }
    var gb = (t * 7) % 30; A.r(4 + (gb % 5) * 12, 5 + (gb % 6) * 6, 11, 5, C.m);
    A.l(32, 2, 32, 38, W); A.l(4, 20, 60, 20, W);
    [[44, 12], [20, 28], [50, 28], [14, 10]].forEach(function (q, i) { A.d(q[0], q[1], 1, i % 2 ? GOLD : C.l); });
    spark(A, 32, 20, t, W);
  };
  P.pista_del_sabio = function (A, t, C) {
    A.tri(32, 34, 10, 30, 10, 18, C.l); A.tri(32, 34, 10, 18, 32, 22, C.l); A.tri(32, 34, 54, 30, 54, 18, C.m); A.tri(32, 34, 54, 18, 32, 22, C.m);
    A.l(32, 22, 32, 34, C.d); for (var i = 0; i < 3; i++) { A.l(14, 22 + i * 3, 28, 24 + i * 3, C.d); A.l(36, 24 + i * 3, 50, 22 + i * 3, C.d); }
    for (var k = 0; k < 5; k++) { var a = -1.9 + k * 0.45 + Math.sin(t * 0.5) * 0.05; A.l(32 + Math.cos(a) * 6, 18 + Math.sin(a) * 6, 32 + Math.cos(a) * 14, 18 + Math.sin(a) * 14, k % 2 ? W : C.l); }
    spark(A, 20, 8 - (t % 4), t, W); spark(A, 46, 10 - (t % 3), t + 1, GOLD); A.g('star', 29, 5, GOLD);
  };
  P.conoce_funcion = function (A, t, C) {
    var blink = t === 6 || t === 7 ? (t === 6 ? 5 : 8) : 0;
    for (var y = -10; y <= 10; y++) for (var x = -20; x <= 20; x++) { if ((x * x) / 400 + (y * y) / 100 > 1) continue; if (Math.abs(y) < blink) continue; A.p(32 + x, 20 + y, W); }
    for (var y2 = -8; y2 <= 8; y2++) for (var x2 = -8; x2 <= 8; x2++) if (x2 * x2 + y2 * y2 <= 64 && Math.abs(y2) >= blink) A.p(32 + x2, 20 + y2, Math.hypot(x2, y2) > 6 ? C.d : C.m);
    if (!blink) { A.l(25, 20, 39, 20, W); A.l(32, 13, 32, 27, W); A.d(32, 20, 2, INK); for (var x3 = 26; x3 <= 38; x3++) A.p(x3, 20 - Math.round(((x3 - 32) * (x3 - 32)) / -6 + 4), C.l); }
    A.l(12, 20, 6, 14, C.l); A.l(52, 20, 58, 14, C.l); spark(A, 8, 8, t, W); spark(A, 56, 32, t, C.l);
  };
  P.interseca = function (A, t, C) {
    A.l(6, 34, 58, 6, C.l); A.l(6, 35, 58, 7, C.m); A.l(6, 6, 58, 34, W); A.l(6, 7, 58, 35, C.m);
    A.ring(32, 20, 2 + (t % 4) * 2, C.l); A.d(32, 20, 3, W);
    var a = t * 0.8; spark(A, 32 + Math.cos(a) * 10, 20 + Math.sin(a) * 6, t, GOLD);
  };
  P.recta_guia = function (A, t, C) {
    A.l(6, 36, 6, 4, C.d); A.l(6, 36, 60, 36, C.d);
    A.l(8, 34, 54, 10, W); A.l(8, 35, 54, 11, C.m); A.l(8, 33, 54, 9, C.l);
    for (var k = 0; k < 4; k++) { var u = ((t + k * 2) % 8) / 7; A.d(lerp(8, 54, u), lerp(34, 10, u), 1, GOLD); }
    A.tri(54, 6, 58, 12, 50, 12, W); for (var x = 30; x < 54; x += 3) A.p(x, 28 - 0, C.l); for (var y = 14; y < 30; y += 3) A.p(54, y, C.l);
    A.txt('m', 56, 24, C.l, 1);
  };
  P.sombra_de_tales = function (A, t, C) {
    A.r(0, 36, 64, 2, C.d); A.r(20, 8, 7, 28, C.m); A.r(20, 8, 7, 2, C.l); A.r(36, 26, 3, 10, C.l); A.d(37, 24, 2, C.l);
    var ry = (t % 4) * 0.5; A.d(8, 8, 4, GOLD); for (var k = 0; k < 8; k++) { var a = k * 0.785 + t * 0.1; A.p(8 + Math.cos(a) * (6 + ry), 8 + Math.sin(a) * (6 + ry), '#fff0b0'); }
    A.l(8, 8, 23, 8, C.l); for (var x = 8; x < 54; x += 3) { A.p(x, 8 + Math.round((x - 8) * (28 / 45)), W); }
    for (var x2 = 27; x2 < 56; x2++) A.p(x2, 35, INK); A.r(27, 35, 28, 1, C.d); A.r(37, 35, 14, 1, C.d);
    spark(A, 56, 10, t, W);
  };
  P.cubo_de_volumen = function (A, t, C) {
    A.tri(32, 6, 52, 14, 32, 22, C.l); A.tri(32, 6, 12, 14, 32, 22, C.l);
    A.tri(12, 14, 32, 22, 32, 38, C.m); A.tri(12, 14, 32, 38, 12, 30, C.m); A.tri(52, 14, 32, 22, 32, 38, C.d); A.tri(52, 14, 32, 38, 52, 30, C.d);
    var lv = 38 - 6 - (t % 8) * 2; for (var y = lv; y < 36; y++) for (var x = 13; x < 52; x++) { if (A.px[Math.round(y) * A.w + x] === C.m || A.px[Math.round(y) * A.w + x] === C.d) A.p(x, y, (x < 32 ? '#9af0ff' : '#5fc0d6')); }
    A.l(32, 22, 32, 38, C.l); A.l(12, 14, 32, 22, C.l); A.l(52, 14, 32, 22, C.d);
    A.g('heart', 54, 28 - (t % 8) * 2, '#ff7a8a'); spark(A, 8, 8, t, W);
  };
  P.regla_real = function (A, t, C) {
    A.l(4, 26, 60, 26, W); for (var i = 0; i <= 9; i++) { A.l(6 + i * 5.6, 26, 6 + i * 5.6, i % 3 === 0 ? 31 : 29, C.l); }
    A.txt('0', 5, 33, C.l, 1); A.txt('1', 22, 33, C.l, 1); A.txt('2', 39, 33, C.l, 1);
    A.g('pi', 28, 10, GOLD); A.l(31, 17, 31, 25, GOLD);
    var u = (t % 8) / 7, hx = lerp(6, 50, u); A.d(hx, 24 - Math.sin(u * 3.14 * 3) * 6, 2, C.m); A.p(hx, 22 - Math.sin(u * 3.14 * 3) * 6, W);
    spark(A, 54, 8, t, W);
  };
  P.doble_o_nada = function (A, t, C) {
    var pips = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
    [[10, 6, 0], [34, 10, 3]].forEach(function (d, i) {
      var n = ((t + d[2]) % 6) + 1, dy = d[1] + (t % 2 ? 1 : 0) * (i ? -1 : 1);
      A.r(d[0], dy, 16, 16, C.l); A.r(d[0] + 1, dy + 1, 14, 14, W); A.r(d[0] + 13, dy + 1, 2, 14, '#d9d0ee'); A.r(d[0] + 1, dy + 13, 14, 2, '#d9d0ee');
      pips[n].forEach(function (q) { A.r(d[0] + 3 + q[0] * 4, dy + 3 + q[1] * 4, 3, 3, i ? '#d9434f' : INK); });
    });
    A.txt('x2', 24, 28, GOLD, 2); spark(A, 56, 6, t, W); spark(A, 6, 30, t + 1, GOLD);
  };
  P.anillo_del_cero = function (A, t, C) {
    A.ring(32, 22, 14, GOLD, 1.6); A.ring(32, 22, 13, '#f2d27a', 0.6); A.ring(32, 22, 11, '#a8802a', 0.6);
    A.tri(28, 5, 36, 5, 32, 10, C.l); A.tri(28, 5, 32, 1, 36, 5, C.m); A.p(31, 5, W);
    A.txt('0', 26, 14, C.l, 4); spark(A, 32 + Math.cos(t * 0.8) * 20, 22 + Math.sin(t * 0.8) * 12, t, W);
  };
  P.lente_del_vertice = function (A, t, C) {
    for (var x = 6; x < 58; x++) A.p(x, 12 + ((x - 30) * (x - 30)) / 40, C.d);
    A.l(40, 30, 54, 38, '#7a5a3a'); A.l(41, 30, 55, 38, '#a8802a');
    A.ring(30, 20, 13, GOLD, 1.5);
    for (var x3 = 20; x3 <= 40; x3++) { var yy = 14 + ((x3 - 30) * (x3 - 30)) / 12; A.p(x3, yy, W); A.p(x3, yy + 1, C.l); }
    A.d(30, 14, 2 + (t % 2), GOLD); A.l(22, 11, 26, 8, W); spark(A, 50, 8, t, W);
  };
  P.brujula_de_escala = function (A, t, C) {
    A.d(32, 20, 16, C.d); A.ring(32, 20, 16, GOLD, 1.3); A.ring(32, 20, 13, C.l, 0.5);
    for (var k = 0; k < 16; k++) { var a = k * 0.3927; A.l(32 + Math.cos(a) * 13, 20 + Math.sin(a) * 13, 32 + Math.cos(a) * (k % 4 ? 11 : 9), 20 + Math.sin(a) * (k % 4 ? 11 : 9), W); }
    var ang = -1.4 + t * 0.35;
    A.tri(32 + Math.cos(ang) * 11, 20 + Math.sin(ang) * 11, 32 + Math.cos(ang + 1.6) * 3, 20 + Math.sin(ang + 1.6) * 3, 32 + Math.cos(ang - 1.6) * 3, 20 + Math.sin(ang - 1.6) * 3, '#ff4f79');
    A.tri(32 - Math.cos(ang) * 11, 20 - Math.sin(ang) * 11, 32 + Math.cos(ang + 1.6) * 3, 20 + Math.sin(ang + 1.6) * 3, 32 + Math.cos(ang - 1.6) * 3, 20 + Math.sin(ang - 1.6) * 3, C.l);
    A.d(32, 20, 1, INK); spark(A, 8, 8, t, W); spark(A, 56, 34, t + 2, C.l);
  };
  P.ecuacion_restaurada = function (A, t, C) {
    A.r(12, 4, 40, 30, '#8a8fa6'); A.r(12, 4, 40, 2, '#c8cde0'); A.r(12, 32, 40, 2, '#555b75'); A.r(50, 4, 2, 30, '#555b75');
    var u = Math.min(1, t / 5), e = 1 - Math.pow(1 - u, 2);
    var fr = [[6, 6, 18, 10], [58, 6, 40, 10], [8, 34, 18, 24], [56, 34, 38, 24]];
    fr.forEach(function (f, i) { A.r(lerp(f[0], f[2], e), lerp(f[1], f[3], e), 8, 8, '#a9aec4'); });
    var glow = t >= 5 ? W : C.l; A.r(22, 14, 20, 3, glow); A.r(22, 22, 20, 3, glow);
    if (t >= 5) { A.ring(32, 19, 10 + (t - 5) * 3, C.l); } spark(A, 8, 20, t, C.l); spark(A, 56, 20, t + 2, W);
    A.l(16, 8, 20, 14, '#555b75');
  };

  function art(card, t) {
    var C = TYPES[card.type]; var A = new Art(64, 40);
    bg(A, C, t);
    var fn = P[card.id]; if (fn) fn(A, t % 8, { m: C.m, l: C.l, d: C.d, w: W }); else A.g(card.icon, 27, 15, C.l, 2);
    return A.px;
  }

  /* marco de carta 80x112; ventana de arte en (8,18) 64x40 */
  function frame(type, rarity, icon) {
    var C = TYPES[type], R = RARITY[rarity] || RARITY.comun, F = new Art(80, 112);
    F.r(0, 0, 80, 112, INK);
    F.r(1, 1, 78, 110, C.m);
    F.r(1, 1, 78, 2, C.l); F.r(1, 1, 2, 110, C.l); F.r(1, 109, 78, 2, C.d); F.r(77, 1, 2, 110, C.d);
    F.r(3, 3, 74, 106, '#1b1530');
    for (var y = 3; y < 109; y++) for (var x = 3; x < 77; x++) if (((x + y) & 1) === 0 && y > 60) F.p(x, y, '#211a38');
    [[0, 0], [1, 0], [0, 1], [79, 0], [78, 0], [79, 1], [0, 111], [1, 111], [0, 110], [79, 111], [78, 111], [79, 110]].forEach(function (c) { F.px[c[1] * 80 + c[0]] = null; });
    [[4, 4], [73, 4], [4, 105], [73, 105]].forEach(function (c) { F.r(c[0], c[1], 3, 3, GOLD); F.p(c[0], c[1], '#fff0b0'); F.p(c[0] + 2, c[1] + 2, '#a8802a'); });
    F.r(9, 5, 62, 11, INK); F.r(10, 6, 60, 9, C.d); F.r(10, 6, 60, 1, C.m); F.r(10, 14, 60, 1, INK);
    F.r(7, 17, 66, 42, INK); F.r(7, 17, 66, 1, C.l); F.r(7, 58, 66, 1, C.d);
    for (var i = 0; i < R.n; i++) { var gx = 40 - R.n * 4 + i * 8 + 1, gy = 61; F.tri(gx + 3, gy, gx + 6, gy + 3, gx + 3, gy + 6, R.gem); F.tri(gx + 3, gy, gx, gy + 3, gx + 3, gy + 6, R.gem); F.p(gx + 2, gy + 2, W); }
    F.r(7, 68, 66, 33, INK); F.r(8, 69, 64, 31, '#2a2240'); F.r(8, 69, 64, 1, '#4a3f6b'); F.r(8, 99, 64, 1, '#4a3f6b');
    F.r(7, 103, 66, 6, C.d); F.r(7, 103, 66, 1, C.m);
    F.d(14, 64, 7, INK); F.d(14, 64, 6, C.d); F.ring(14, 64, 6, C.l, 0.8); F.g(icon || 'star', 12, 62, W);
    return F.px;
  }
  /* compone marco + arte + brillo holográfico (rara y superior) */
  function composite(card, t) {
    var f = frame(card.type, card.rarity, card.icon).slice(), a = art(card, t);
    for (var y = 0; y < 40; y++) for (var x = 0; x < 64; x++) f[(18 + y) * 80 + 8 + x] = a[y * 64 + x];
    if (card.rarity !== 'comun') {
      var band = (t * 9) % 56 - 10;
      for (var yy = 1; yy < 111; yy++) for (var xx = 1; xx < 79; xx++) {
        var v = f[yy * 80 + xx]; if (!v) continue; var d = (xx + yy * 0.6) - band * 2;
        if (d > 0 && d < 5 && v !== INK) f[yy * 80 + xx] = lighten(v, card.rarity === 'legendaria' ? 70 : 45);
      }
    }
    return f;
  }
  function lighten(hex, n) {
    var r = Math.min(255, parseInt(hex.slice(1, 3), 16) + n), g = Math.min(255, parseInt(hex.slice(3, 5), 16) + n), b = Math.min(255, parseInt(hex.slice(5, 7), 16) + n);
    return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }
  return { NF: NF, TYPES: TYPES, RARITY: RARITY, art: art, frame: frame, composite: composite, ARTW: 64, ARTH: 40, CW: 80, CH: 112, FRAMES: 8 };
});
