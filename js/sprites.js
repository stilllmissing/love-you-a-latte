/* Purrfect Pour — small UI icons (coin, heart, star, lock, paw) drawn from text grids
 * into pixel buffers and emitted as crisp SVG, plus a colour-mixing helper. */
(function () {
  'use strict';

  /* ---------- Colour helpers ---------- */
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }

  /* ---------- Pixel buffer ---------- */
  class Buf {
    constructor(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
    set(x, y, c) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.p[y * this.w + x] = c;
    }
    get(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      return this.p[y * this.w + x];
    }
    rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
    ellipse(cx, cy, rx, ry, c, keep) {
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
        for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1 && (!keep || keep(x, y))) this.set(x, y, c);
        }
      }
    }
    tri(a, b, d, c) {
      const minX = Math.floor(Math.min(a[0], b[0], d[0])), maxX = Math.ceil(Math.max(a[0], b[0], d[0]));
      const minY = Math.floor(Math.min(a[1], b[1], d[1])), maxY = Math.ceil(Math.max(a[1], b[1], d[1]));
      const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const pt = [x + 0.5, y + 0.5];
          const d1 = s(pt, a, b), d2 = s(pt, b, d), d3 = s(pt, d, a);
          const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
          if (!(neg && pos)) this.set(x, y, c);
        }
      }
    }
    /* Adds a 1px outline around every filled region. */
    outline(c) {
      const src = this.p.slice();
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (src[y * this.w + x]) continue;
          const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const xx = x + dx, yy = y + dy;
            return xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && src[yy * this.w + xx];
          });
          if (n) this.p[y * this.w + x] = c;
        }
      }
      return this;
    }
    map(fn) { this.p = this.p.map((c) => (c ? fn(c) : c)); return this; }
    /* Row-run-length rects keep the SVG small. */
    rects() {
      let s = '';
      for (let y = 0; y < this.h; y++) {
        let x = 0;
        while (x < this.w) {
          const c = this.p[y * this.w + x];
          if (!c) { x++; continue; }
          let run = 1;
          while (x + run < this.w && this.p[y * this.w + x + run] === c) run++;
          s += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
          x += run;
        }
      }
      return s;
    }
  }

  /* ---------- Public: tiny icons from text grids ---------- */
  function grid(rows, pal, cls = '') {
    const h = rows.length, w = rows[0].length;
    const b = new Buf(w, h);
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) b.set(x, y, pal[ch]); }));
    return `<svg class="icon ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${b.rects()}</svg>`;
  }

  const STAR = [
    '....o....',
    '...owo...',
    '...oyo...',
    'ooooyoooo',
    'oyyyyyyyo',
    '.oyyyyyo.',
    '..oyyyo..',
    '.oyyoyyo.',
    '.ooo.ooo.',
  ];
  const icons = {
    heart: grid([
      '.oo.oo.',
      'ohhooxo',
      'ohxxxxo',
      '.oxxxo.',
      '..oxo..',
      '...o...',
    ], { o: '#7a2338', x: '#ee6f8c', h: '#ffd1dc' }, 'i-heart'),
    heartEmpty: grid([
      '.oo.oo.',
      'oxxooxo',
      'oxxxxxo',
      '.oxxxo.',
      '..oxo..',
      '...o...',
    ], { o: '#9a7f90', x: '#e8dde6' }, 'i-heart'),
    coin: grid([
      '..oooo..',
      '.oyyyyo.',
      'oywyyyyo',
      'oyyddyyo',
      'oyyddyyo',
      'oyyyyyyo',
      '.oyyyyo.',
      '..oooo..',
    ], { o: '#8a5a12', y: '#f2c14e', w: '#fff3c4', d: '#c99520' }, 'i-coin'),
    star: grid(STAR, { o: '#8a5a12', y: '#f2c14e', w: '#fff3c4' }, 'i-star'),
    starEmpty: grid(STAR, { o: '#b9a3b3', y: '#efe4ea', w: '#efe4ea' }, 'i-star'),
    paw: grid([
      '..oo..oo..',
      '..oo..oo..',
      'oo......oo',
      'oo..oo..oo',
      '...oooo...',
      '..oooooo..',
      '..oooooo..',
      '...oooo...',
    ], { o: '#b9475b' }, 'i-paw'),
    lock: grid([
      '..ooo..',
      '.o...o.',
      '.o...o.',
      'ooooooo',
      'oyyoyyo',
      'oyyyyyo',
      'ooooooo',
    ], { o: '#4a2b2b', y: '#f2c14e' }, 'i-lock'),
  };

  window.Sprites = { grid, icons, mix };
})();
