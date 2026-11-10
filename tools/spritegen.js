/* Generador procedural de sprites pixel art para Juego Mate.
 * Sirve para el navegador (window.SpriteGen) y para Node (require).
 * Cada criatura se dibuja en una cuadrícula lógica de 32x32 que se escala a 32 o 64 px.
 * Los monstruos miran a la izquierda; los héroes se voltean para mirar a la derecha.
 * Son sprites de trabajo: sirven para probar animaciones y se pueden reemplazar por arte dibujado a mano
 * conservando el mismo atlas (hoja de 5 columnas, una fila por animación). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports && typeof window === 'undefined') module.exports = factory();
  else root.SpriteGen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var OUTLINE = '#14101f';
  var WHITE = '#ffffff';
  var TAU = Math.PI * 2;

  /* ---------- glifos de 5x5: el símbolo matemático de cada tema ---------- */
  var GLYPHS = {
    frac: ['.###.', '.....', '#####', '.....', '.###.'],
    pct: ['##..#', '##.#.', '..#..', '.#.##', '#..##'],
    fact: ['.#.#.', '#...#', '#...#', '#...#', '.#.#.'],
    pi: ['#####', '.#.#.', '.#.#.', '.#.#.', '##.##'],
    eq: ['.....', '#####', '.....', '#####', '.....'],
    axes: ['#....', '#....', '#....', '#....', '#####'],
    slope: ['....#', '...#.', '..#..', '.#...', '#....'],
    cross: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    parab: ['#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
    root: ['..###', '..#..', '#.#..', '.##..', '..#..'],
    wave: ['.#...', '#.#..', '..#.#', '...#.', '.....'],
    vol: ['.####', '#...#', '#####', '#...#', '#####'],
    pyth: ['#....', '##...', '#.#..', '#..#.', '#####'],
    similar: ['....#', '...##', '.#.#.', '.###.', '#####'],
    units: ['#.#.#', '#.#.#', '#####', '.....', '.....'],
    reflect: ['#.#.#', '##.##', '#.#.#', '##.##', '#.#.#'],
    grid: ['#.#.#', '#####', '#.#.#', '#####', '#.#.#'],
    ruler: ['#.#.#', '#####', '.....', '.....', '.....'],
    div: ['..#..', '.....', '#####', '.....', '..#..'],
    star: ['..#..', '.###.', '#####', '.###.', '..#..'],
    heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
    shield: ['#####', '#...#', '#...#', '.#.#.', '..#..'],
    bolt: ['..##.', '.##..', '.###.', '..##.', '.#...'],
    book: ['#####', '#.#.#', '#.#.#', '#.#.#', '#####'],
    sword: ['....#', '...#.', '#.#..', '.#...', '#.#..'],
    chest: ['.###.', '#####', '#.#.#', '#####', '#####'],
    fire: ['..#..', '.##..', '.###.', '#####', '.###.'],
    question: ['.###.', '#...#', '..##.', '.....', '..#..'],
    skull: ['.###.', '#.#.#', '#####', '.###.', '.#.#.']
  };

  /* ---------- cuadrícula con transformación lógica -> píxeles ---------- */
  function Grid(N) {
    this.N = N;
    this.u = N / 32;
    this.k = 1; this.ox = 0; this.oy = 0;
    this.px = new Array(N * N).fill(null);
  }
  Grid.prototype.tx = function (x) { return ((x - 16) * this.k + 16 + this.ox) * this.u; };
  Grid.prototype.ty = function (y) { return ((y - 29) * this.k + 29 + this.oy) * this.u; };
  Grid.prototype.dot = function (x, y, col) {
    if (x < 0 || y < 0 || x >= this.N || y >= this.N) return;
    this.px[y * this.N + x] = col;
  };
  Grid.prototype.rect = function (x0, y0, x1, y1, col) {
    var a = Math.round(this.tx(x0)), b = Math.round(this.ty(y0));
    var c = Math.round(this.tx(x1)), d = Math.round(this.ty(y1));
    if (c <= a) c = a + 1;
    if (d <= b) d = b + 1;
    for (var y = b; y < d; y++) for (var x = a; x < c; x++) this.dot(x, y, col);
  };
  Grid.prototype.ell = function (cx, cy, rx, ry, col) {
    var X = this.tx(cx), Y = this.ty(cy), RX = rx * this.k * this.u, RY = ry * this.k * this.u;
    for (var y = Math.floor(Y - RY); y <= Math.ceil(Y + RY); y++) {
      for (var x = Math.floor(X - RX); x <= Math.ceil(X + RX); x++) {
        var nx = (x + 0.5 - X) / RX, ny = (y + 0.5 - Y) / RY;
        if (nx * nx + ny * ny <= 1) this.dot(x, y, typeof col === 'function' ? col(nx, ny) : col);
      }
    }
  };
  Grid.prototype.tri = function (x0, y0, x1, y1, x2, y2, col) {
    var ax = this.tx(x0), ay = this.ty(y0), bx = this.tx(x1), by = this.ty(y1), cx = this.tx(x2), cy = this.ty(y2);
    var minx = Math.floor(Math.min(ax, bx, cx)), maxx = Math.ceil(Math.max(ax, bx, cx));
    var miny = Math.floor(Math.min(ay, by, cy)), maxy = Math.ceil(Math.max(ay, by, cy));
    var den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (den === 0) return;
    for (var y = miny; y <= maxy; y++) for (var x = minx; x <= maxx; x++) {
      var px = x + 0.5, py = y + 0.5;
      var l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den;
      var l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den;
      var l3 = 1 - l1 - l2;
      if (l1 >= -0.02 && l2 >= -0.02 && l3 >= -0.02) this.dot(x, y, col);
    }
  };
  Grid.prototype.line = function (x0, y0, x1, y1, col, th) {
    th = th || 1;
    var steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * this.u * 2) + 1;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      this.rect(x - th / 2, y - th / 2, x + th / 2, y + th / 2, col);
    }
  };
  Grid.prototype.glyph = function (name, x, y, col, s) {
    s = s || 1;
    var rows = GLYPHS[name]; if (!rows) return;
    for (var j = 0; j < 5; j++) for (var i = 0; i < 5; i++)
      if (rows[j][i] === '#') this.rect(x + i * s, y + j * s, x + (i + 1) * s, y + (j + 1) * s, col);
  };
  function shade(c) {
    return function (nx, ny) {
      var d = nx * 0.55 + ny * 0.85;
      if (d > 0.45) return c.shade;
      if (d < -0.55) return c.light;
      return c.body;
    };
  }
  function eye(g, x, y) {
    g.rect(x, y, x + 2, y + 3, WHITE);
    g.rect(x, y + 1, x + 1, y + 3, OUTLINE);
  }

  /* ---------- arquetipos ---------- */
  var ARCH = {};

  ARCH.slime = function (g, c, p) {
    var b = Math.sin(p.ph), ry = 8.5 - b * 1.3, rx = 11.5 + b * 1.3, cy = 29 - ry;
    g.ell(16, cy, rx, ry, shade(c));
    g.rect(9, cy - ry * 0.6, 13, cy - ry * 0.6 + 1.3, c.light);
    eye(g, 8, cy - 3); eye(g, 14, cy - 3);
    g.rect(9.5, cy + 2, 14.5, cy + 3, OUTLINE);
    g.glyph(c.emblem, 16, cy + 1.2, c.accent);
  };

  function humanoid(g, c, p, o) {
    o = o || {};
    g.k = o.k || 1;
    var b = Math.round(Math.sin(p.ph) * 0.8);
    var sk = c.body, skS = c.shade, cl = c.cloth || c.accent, clS = c.clothShade || c.shade;
    var skin = shade({ body: sk, shade: skS, light: c.light });
    g.rect(20, 15 + b, 23, 21 + b, skS);
    g.rect(12, 22, 15, 29, clS); g.rect(17, 22, 20, 29, clS);
    g.rect(11, 27.5, 15, 29, '#3b2a20'); g.rect(16.5, 27.5, 20.5, 29, '#3b2a20');
    g.rect(11, 14 + b, 21, 23 + b, cl);
    g.rect(18, 14 + b, 21, 23 + b, clS);
    g.rect(11, 21 + b, 21, 22.2 + b, '#3b2a20');
    if (o.hat === 'hood') {
      g.ell(16, 9 + b, 6.4, 6.4, clS);
      g.ell(13.2, 9.6 + b, 3.6, 4.2, skin);
    } else {
      g.ell(15, 9 + b, 5, 5, skin);
    }
    eye(g, 11, 7.5 + b);
    g.rect(10.5, 6.2 + b, 14, 7.2 + b, OUTLINE);
    if (o.hat === 'cap') { g.rect(10, 3 + b, 19, 6 + b, cl); g.rect(7, 5 + b, 11, 6.8 + b, clS); }
    if (o.hat === 'pointy') { g.tri(10, 6 + b, 21, 6 + b, 14, 0.5 + b, cl); g.rect(8, 5.6 + b, 22, 7 + b, clS); }
    if (o.hat === 'helm') {
      g.ell(15, 8 + b, 5.7, 5.7, shade({ body: '#8a82b8', shade: '#5b4e7a', light: '#d6cfe8' }));
      g.rect(8, 8 + b, 14.5, 9.6 + b, OUTLINE);
      g.rect(14, 0.5 + b, 17, 4 + b, c.accent);
    }
    if (o.hat === 'goggles') {
      g.rect(10, 5 + b, 19, 8 + b, '#8a6a3f');
      g.ell(12.4, 6.6 + b, 1.9, 1.9, '#9ae8ff'); g.ell(16.6, 6.6 + b, 1.9, 1.9, '#9ae8ff');
    }
    g.rect(8, 15 + b, 11, 21 + b, sk);
    var pr = o.prop;
    if (pr === 'bow') {
      for (var yy = 8; yy < 24; yy++) g.rect(6.5 - Math.sin((yy - 8) / 16 * Math.PI) * 3, yy, 8 - Math.sin((yy - 8) / 16 * Math.PI) * 3, yy + 1, '#8a5a2f');
      g.rect(7.4, 8, 8, 24, '#f3ead8');
    }
    if (pr === 'sword') {
      g.rect(5, 6 + b, 7.4, 20 + b, '#d6dbe8'); g.rect(5, 6 + b, 6, 20 + b, WHITE);
      g.rect(3, 19 + b, 9.4, 21.2 + b, '#e0b84c');
    }
    if (pr === 'sack') {
      g.ell(6, 21 + b, 4.2, 4.2, shade({ body: '#c4903a', shade: '#8a5f1f', light: '#e8c070' }));
      g.rect(5, 16.5 + b, 8, 18.5 + b, '#8a5f1f');
    }
    if (pr === 'club') {
      g.rect(4.4, 10 + b, 7.2, 24 + b, '#7a5a3a');
      g.ell(5.8, 9 + b, 3.6, 4.2, '#8a6a46');
    }
    if (pr === 'flask') {
      g.ell(6, 20 + b, 3.6, 3.6, c.flask || '#6fe0a0');
      g.rect(5, 14.8 + b, 7.4, 18 + b, '#d6dbe8');
      g.rect(5, 13.6 + b, 7.4, 14.8 + b, '#8a5a2f');
      g.rect(5.4, 12 - p.t * 0.8, 6.6, 13 - p.t * 0.8, c.flask || '#6fe0a0');
    }
    if (pr === 'staff') {
      g.rect(5, 6, 7, 29, '#7a5a3a');
      g.ell(6, 5, 3.4, 3.4, c.orb || c.accent);
      g.rect(4.8, 3.6, 6.2, 5, WHITE);
    }
    if (pr === 'shield') {
      g.ell(7, 19 + b, 5.8, 6.8, '#e0b84c');
      g.ell(7, 19 + b, 4.4, 5.4, c.shield || '#4f7dd9');
      g.rect(6.4, 14.6 + b, 7.6, 23.4 + b, '#e0b84c');
    }
    if (!o.noEmblem && c.emblem) g.glyph(c.emblem, 13.5, 15.4 + b, c.glyph || c.light);
    g.k = 1;
  }
  ARCH.humanoid = humanoid;

  ARCH.twins = function (g, c, p, o) {
    var back = Object.assign({}, c, { body: c.shade, cloth: c.clothShade || c.shade, clothShade: c.shade });
    g.ox = 7;
    humanoid(g, back, { ph: p.ph + Math.PI, t: p.t }, { k: 0.8, hat: 'cap', noEmblem: true });
    g.ox = -4;
    humanoid(g, c, p, { k: 0.8, hat: 'cap', prop: 'sword' });
    g.ox = 0;
  };

  ARCH.siren = function (g, c, p, o) {
    var b = Math.round(Math.sin(p.ph) * 0.8), cl = c.cloth, clS = c.clothShade;
    for (var i = 0; i < 9; i++) {
      var x = 16 + Math.sin(p.ph + i * 0.7) * 3.2 + i * 0.4, y = 21 + i * 1.0;
      g.ell(x, y, 5 - i * 0.42, 2.2, shade({ body: cl, shade: clS, light: c.light }));
    }
    g.tri(18, 28, 27, 25 + Math.sin(p.ph) * 1.5, 25, 29, cl);
    g.rect(11, 14 + b, 21, 22 + b, cl); g.rect(18, 14 + b, 21, 22 + b, clS);
    g.ell(15.5, 9 + b, 5.6, 6, c.accent);
    g.ell(14.5, 9.6 + b, 4.4, 4.6, shade({ body: c.body, shade: c.shade, light: c.light }));
    eye(g, 11.2, 7.8 + b);
    g.rect(8, 15 + b, 11, 21 + b, c.body);
    g.rect(20, 15 + b, 23, 20 + b, c.shade);
    g.glyph(c.emblem, 13.5, 15 + b, c.glyph || c.light);
  };

  ARCH.bat = function (g, c, p) {
    var f = Math.sin(p.ph), tip = 12 + f * 7;
    g.oy = -f * 1.2;
    g.tri(12, 14, 0.5, tip, 8, 24, c.shade); g.tri(20, 14, 31.5, tip, 24, 24, c.shade);
    g.line(12, 14, 0.5, tip, c.light, 1); g.line(20, 14, 31.5, tip, c.light, 1);
    g.ell(16, 17, 5.6, 7, shade(c));
    g.ell(16, 11, 5, 4.6, shade(c));
    g.tri(11.5, 9, 11.5, 3, 15, 8, c.body); g.tri(20.5, 9, 20.5, 3, 17, 8, c.body);
    g.rect(13, 10, 15, 12, '#ff6070'); g.rect(17, 10, 19, 12, '#ff6070');
    g.rect(14, 13.4, 15, 15, WHITE); g.rect(17, 13.4, 18, 15, WHITE);
    g.rect(13, 24, 15, 26, c.shade); g.rect(17, 24, 19, 26, c.shade);
    g.glyph(c.emblem, 13.5, 16.5, c.accent);
  };

  ARCH.ghost = function (g, c, p, o) {
    o = o || {};
    var f = Math.sin(p.ph);
    g.oy = -1 - f * 1.2;
    g.ell(16, 13, 10, 10, shade(c));
    for (var x = 6; x < 26; x++) {
      var bot = 24.5 + Math.sin(x * 0.9 + p.ph) * 2;
      g.rect(x, 13, x + 1, bot, x >= 20 ? c.shade : c.body);
    }
    g.rect(4, 16, 7, 19, c.body); g.rect(25, 16, 28, 19, c.shade);
    eye(g, 9, 10); eye(g, 15, 10);
    g.ell(11, 17.5, 1.8, 2.2, OUTLINE);
    g.glyph(c.emblem, 16, 15.5, c.accent);
    if (o.crown) {
      g.rect(9, 3.6, 23, 6, c.accent);
      g.tri(9, 3.6, 11, 0.6, 13, 3.6, c.accent); g.tri(14, 3.6, 16, 0.2, 18, 3.6, c.accent); g.tri(19, 3.6, 21, 0.6, 23, 3.6, c.accent);
      g.rect(15.4, 4, 16.6, 5.2, '#ff4f79');
    }
  };

  ARCH.serpent = function (g, c, p) {
    var n = 16;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var x = 28 - 22 * t, y = 26 - 15 * Math.pow(t, 1.5) + Math.sin(p.ph + t * 7) * 1.7 * (1 - t * 0.4);
      var r = 1.7 + 2.1 * t;
      g.ell(x, y, r, r * 0.95, shade(c));
      if (i % 3 === 1) g.rect(x - 0.7, y - 0.7, x + 0.7, y + 0.7, c.accent);
    }
    g.ell(5.2, 11.5, 5.4, 3.8, shade(c));
    eye(g, 6.4, 8.4);
    if (p.t % 2 === 0) { g.rect(0, 12, 3, 13, '#ff4f79'); g.rect(0, 11, 1.2, 12, '#ff4f79'); g.rect(0, 13, 1.2, 14, '#ff4f79'); }
    g.glyph(c.emblem, 12.5, 17.5, c.light);
  };

  ARCH.dragon = function (g, c, p, o) {
    o = o || {};
    var f = Math.sin(p.ph);
    for (var i = 0; i < 8; i++) g.ell(24 + i * 0.9, 23 + i * 0.6 - Math.sin(p.ph + i * 0.5) * 0.8, 3.2 - i * 0.3, 2.8 - i * 0.25, shade(c));
    g.tri(15, 13, 25, 2 - f * 3, 27, 16, c.shade); g.line(15, 13, 25, 2 - f * 3, c.light, 1);
    g.ell(17, 20, 8, 6.2, shade(c));
    g.ell(15, 22.6, 5, 3, c.light);
    g.rect(12, 24, 15.5, 29, c.shade); g.rect(19, 24, 22.5, 29, c.shade);
    g.rect(11, 28, 15.5, 29, '#f3ead8'); g.rect(18.5, 28, 23, 29, '#f3ead8');
    g.tri(16, 14, 23, 5 + f * 3, 24, 17, c.body); g.line(16, 14, 23, 5 + f * 3, c.light, 1);
    var heads = o.heads === 2 ? [[7, 11, 11, 16], [13, 4.5, 14, 11]] : [[7, 10, 11, 15]];
    heads.forEach(function (h) {
      g.ell(h[2], h[3], 3.2, 5.5, shade(c));
      g.ell(h[0], h[1], 4.6, 3.6, shade(c));
      g.ell(h[0] - 3.6, h[1] + 1, 3, 2.2, c.body);
      g.tri(h[0] + 1, h[1] - 3, h[0] + 3.4, h[1] - 7, h[0] + 3.8, h[1] - 3, c.accent);
      eye(g, h[0] - 1, h[1] - 3);
      g.rect(h[0] - 6, h[1] + 2.6, h[0] - 2.5, h[1] + 3.5, WHITE);
    });
    g.glyph(c.emblem, 13.5, 19, c.shade === '#4a2370' ? WHITE : c.accent);
  };

  function block(g, c, x0, y0, x1, y1) {
    g.rect(x0, y0, x1, y1, c.body);
    g.rect(x0, y0, x1, y0 + 1.2, c.light);
    g.rect(x0, y1 - 1.2, x1, y1, c.shade);
    g.rect(x1 - 1.2, y0, x1, y1, c.shade);
  }
  ARCH.golem = function (g, c, p) {
    var a = Math.round(Math.sin(p.ph));
    block(g, c, 9, 24, 14, 29); block(g, c, 18, 24, 23, 29);
    block(g, c, 2, 13 + a, 7, 23 + a); block(g, c, 25, 13 - a, 30, 23 - a);
    block(g, c, 8, 12, 24, 24);
    block(g, c, 11, 3, 21, 11);
    g.rect(12.4, 6, 15, 8.6, c.accent); g.rect(17, 6, 19.6, 8.6, c.accent);
    g.rect(13, 9.4, 19, 10.4, OUTLINE);
    g.line(9, 17, 12, 20, c.shade, 1); g.line(22, 14, 20, 17, c.shade, 1);
    g.glyph(c.emblem, 12.5, 15.2, c.accent, 1.4);
  };

  ARCH.cube = function (g, c, p) {
    var f = Math.sin(p.ph), sq = f * 1;
    g.rect(7, 13 + sq, 21, 27.5, c.body);
    g.tri(7, 13 + sq, 11, 9 + sq, 25, 9 + sq, c.light); g.tri(7, 13 + sq, 25, 9 + sq, 21, 13 + sq, c.light);
    g.tri(21, 13 + sq, 25, 9 + sq, 25, 23, c.shade); g.tri(21, 13 + sq, 25, 23, 21, 27.5, c.shade);
    g.ell(14, 21 - f * 1.4, 3.2, 3.2, c.accent);
    g.rect(12.6, 19.2 - f * 1.4, 14, 20.4 - f * 1.4, WHITE);
    eye(g, 9, 15.5 + sq); eye(g, 15, 15.5 + sq);
    g.rect(10, 12 - p.t, 11, 13 - p.t, WHITE);
  };

  ARCH.mirror = function (g, c, p) {
    var f = Math.sin(p.ph);
    g.oy = -1 - f * 1.2;
    g.ell(16, 15, 10, 13.5, shade(c));
    g.ell(16, 15, 7.6, 11, function (nx, ny) {
      var d = nx * 0.7 + ny * 0.7;
      return d < -0.45 ? '#d9fcff' : d > 0.4 ? '#2fa8b0' : c.accent;
    });
    g.rect(11.5, 11, 14, 13.5, WHITE); g.rect(17.5, 11, 20, 13.5, WHITE);
    g.rect(11.5, 12, 12.8, 13.5, OUTLINE); g.rect(17.5, 12, 18.8, 13.5, OUTLINE);
    for (var i = 0; i < 5; i++) g.rect(11 + i * 2, 18 + (i % 2) * 1.3, 12.6 + i * 2, 19.3 + (i % 2) * 1.3, OUTLINE);
    g.line(19.5, 6, 17, 11, WHITE, 0.8);
  };

  ARCH.void = function (g, c, p) {
    var f = Math.sin(p.ph);
    g.oy = -f * 0.8;
    for (var i = 0; i < 8; i++) {
      var ang = i / 8 * TAU;
      for (var s = 0; s < 5; s++) {
        var rr = 10.4 + s * 1.2;
        g.ell(16 + Math.cos(ang) * rr + Math.sin(p.ph + s + i) * 0.8, 15 + Math.sin(ang) * rr + Math.cos(p.ph + s + i) * 0.8, 1.7 - s * 0.22, 1.7 - s * 0.22, c.shade);
      }
    }
    g.ell(16, 15, 11, 11, c.light);
    g.ell(16, 15, 9.8, 9.8, c.shade);
    g.ell(16, 15, 8.4, 8.4, c.body);
    for (var k = 0; k < 10; k++) {
      var a = p.ph * 0.6 + k * 0.63;
      g.rect(16 + Math.cos(a) * 9.1 - 0.5, 15 + Math.sin(a) * 9.1 - 0.5, 16 + Math.cos(a) * 9.1 + 0.5, 15 + Math.sin(a) * 9.1 + 0.5, k % 2 ? c.light : c.accent);
    }
    g.glyph('div', 11, 10, c.accent, 2);
  };

  /* ---------- animaciones ---------- */
  var ANIMS = {
    idle: { frames: 4, fps: 6, loop: true },
    attack: { frames: 4, fps: 10, loop: false },
    hurt: { frames: 2, fps: 8, loop: false },
    die: { frames: 5, fps: 8, loop: false },
    win: { frames: 4, fps: 6, loop: true }
  };
  var XFORM = {
    attack: [{ dx: 2, sx: 0.96, sy: 1.02 }, { dx: -1.5, sx: 1.03, sy: 0.98 }, { dx: -3.5, sx: 1.08, sy: 0.96 }, { dx: -1.5, sx: 1.02, sy: 1 }],
    hurt: [{ dx: 3, flash: 1, sy: 0.95 }, { dx: 1, sy: 0.98 }],
    die: [{ dx: 2, flash: 1, sy: 0.95 }, { dx: 3, sy: 0.78, sx: 1.08, d: 0.12 }, { dx: 3, sy: 0.55, sx: 1.15, d: 0.4 }, { dx: 3, sy: 0.3, sx: 1.2, d: 0.7 }, { dx: 3, sy: 0.12, sx: 1.25, d: 0.92 }],
    win: [{ dy: 0 }, { dy: -3 }, { dy: -5 }, { dy: -3 }]
  };

  function transform(px, N, x) {
    var u = N / 32, dx = (x.dx || 0) * u, dy = (x.dy || 0) * u, sx = x.sx || 1, sy = x.sy || 1;
    var cx = N / 2, ay = N * 29 / 32;
    var out = new Array(N * N).fill(null);
    for (var y = 0; y < N; y++) for (var xx = 0; xx < N; xx++) {
      var sxp = Math.round((xx - cx - dx) / sx + cx), syp = Math.round((y - ay - dy) / sy + ay);
      if (sxp < 0 || syp < 0 || sxp >= N || syp >= N) continue;
      var v = px[syp * N + sxp];
      if (!v) continue;
      if (x.d) {
        var h = (((xx * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
        if (h < x.d) continue;
      }
      out[y * N + xx] = x.flash ? WHITE : v;
    }
    return out;
  }
  function outline(px, N) {
    var out = px.slice();
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      if (px[y * N + x]) continue;
      var n = (x > 0 && px[y * N + x - 1]) || (x < N - 1 && px[y * N + x + 1]) || (y > 0 && px[(y - 1) * N + x]) || (y < N - 1 && px[(y + 1) * N + x]);
      if (n) out[y * N + x] = OUTLINE;
    }
    return out;
  }
  function flipX(px, N) {
    var out = new Array(N * N).fill(null);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) out[y * N + (N - 1 - x)] = px[y * N + x];
    return out;
  }

  /* def = { archetype, size, colors, opts, facing } -> arreglo de N*N colores (hex o null) */
  function frame(def, anim, t) {
    var N = def.size || 32, g = new Grid(N);
    var p = { ph: t / 4 * TAU, t: t, anim: anim };
    ARCH[def.archetype](g, def.colors, p, def.opts || {});
    var px = g.px, xs = XFORM[anim];
    if (xs) px = transform(px, N, xs[Math.min(t, xs.length - 1)]);
    px = outline(px, N);
    if (def.facing === 'right') px = flipX(px, N);
    return px;
  }
  function animsFor(def) {
    var names = ['idle', 'attack', 'hurt', 'die'];
    if (def.kind === 'hero') names.push('win');
    return names;
  }
  var COLS = 5;
  function atlasEntry(def) {
    var names = animsFor(def), anims = {};
    names.forEach(function (n, row) {
      anims[n] = { row: row, start: row * COLS, frames: ANIMS[n].frames, fps: ANIMS[n].fps, loop: ANIMS[n].loop };
    });
    return { frameWidth: def.size, frameHeight: def.size, cols: COLS, rows: names.length, anims: anims };
  }
  /* devuelve RGBA de la hoja completa */
  function hexToRgba(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
  }
  function sheetRGBA(def) {
    var names = animsFor(def), N = def.size, W = COLS * N, H = names.length * N;
    var buf = new Uint8Array(W * H * 4);
    names.forEach(function (n, row) {
      for (var t = 0; t < ANIMS[n].frames; t++) {
        var px = frame(def, n, t);
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
          var v = px[y * N + x]; if (!v) continue;
          var o = ((row * N + y) * W + t * N + x) * 4, rgba = hexToRgba(v);
          buf[o] = rgba[0]; buf[o + 1] = rgba[1]; buf[o + 2] = rgba[2]; buf[o + 3] = 255;
        }
      }
    });
    return { width: W, height: H, data: buf };
  }
  /* dibujo en canvas (navegador) */
  function drawPixels(ctx, px, N, x, y, scale) {
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var v = px[j * N + i]; if (!v) continue;
      ctx.fillStyle = v; ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
    }
  }
  function drawGlyph(ctx, name, x, y, scale, col) {
    var rows = GLYPHS[name]; if (!rows) return;
    ctx.fillStyle = col;
    for (var j = 0; j < 5; j++) for (var i = 0; i < 5; i++) if (rows[j][i] === '#') ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
  }

  return { GLYPHS: GLYPHS, ANIMS: ANIMS, COLS: COLS, frame: frame, animsFor: animsFor, atlasEntry: atlasEntry, sheetRGBA: sheetRGBA, drawPixels: drawPixels, drawGlyph: drawGlyph, OUTLINE: OUTLINE };
});
