/* Purrfect Pour — procedural pixel art for drinks and UI icons.
 * Shapes are drawn into small pixel buffers, auto-outlined, and emitted as crisp SVG. */
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
  const darken = (c, t) => mix(c, '#2a1420', t);
  const lighten = (c, t) => mix(c, '#ffffff', t);

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

  /* ---------- Public: drink cup SVG ---------- */
  const D = window.GAME_DATA;
  const ing = (step, id) => (D.ingredients[step] || []).find((i) => i.id === id);

  function liquidColor(sel) {
    const base = ing('base', sel.base);
    if (!base) return null;
    let c = base.color;
    const milk = ing('milk', sel.milk);
    if (milk && milk.color) c = mix(c, milk.color, 0.5);
    const syr = ing('syrup', sel.syrup);
    if (syr && syr.color) c = mix(c, syr.color, 0.22);
    return c;
  }

  const CUPS = {
    mug: { x0: 6, x1: 21, y0: 10, y1: 28, body: '#fff1e8', band: '#f3a3b0' },
    glass: { x0: 9, x1: 22, y0: 4, y1: 29, body: '#e7f3f6', band: null },
    teacup: { x0: 4, x1: 27, y0: 15, y1: 25, body: '#fff8f4', band: '#b7a8e0' },
  };

  function cup(sel, level = 1, opts = {}) {
    const b = new Buf(32, 32);
    const line = '#4a2b2b';
    const type = CUPS[sel.cup] ? sel.cup : null;
    if (!type) {
      // empty counter spot placeholder: dashed ring
      for (let x = 8; x < 24; x += 2) { b.set(x, 28, '#c9a9b2'); b.set(x + 1, 6, '#c9a9b2'); }
      for (let y = 6; y < 29; y += 2) { b.set(8, y, '#c9a9b2'); b.set(23, y + 1, '#c9a9b2'); }
      return wrapCup(b, opts, false);
    }
    const c = CUPS[type];
    // inner width per row (teacup tapers)
    const rowSpan = (y) => {
      let x0 = c.x0 + 1, x1 = c.x1 - 1;
      if (type === 'teacup') { const t = y - c.y0; if (t > 6) { x0 += t - 6; x1 -= t - 6; } }
      if (type === 'mug' && y === c.y1 - 1) { x0 += 1; x1 -= 1; }
      return [x0, x1];
    };
    // body + interior
    for (let y = c.y0; y < c.y1; y++) {
      const [x0, x1] = rowSpan(y);
      for (let x = x0; x <= x1; x++) b.set(x, y, c.body);
    }
    // liquid
    const top = c.y0 + 1, bottom = c.y1 - 1;
    const rows = bottom - top + 1;
    const filled = Math.round(rows * Math.min(level, 1));
    const lc = liquidColor(sel);
    if (lc && filled > 0) {
      const syr = ing('syrup', sel.syrup), milk = ing('milk', sel.milk), base = ing('base', sel.base);
      for (let i = 0; i < filled; i++) {
        const y = bottom - i;
        let col = lc;
        if (type === 'glass') {
          // layered drinks in a glass
          const frac = i / rows;
          if (syr && syr.color && frac < 0.22) col = syr.color;
          else if (milk && milk.color && frac < 0.7) col = mix(milk.color, base.color, 0.12);
          else col = mix(base.color, milk && milk.color ? milk.color : base.color, 0.25);
        }
        const [x0, x1] = rowSpan(y);
        for (let x = x0; x <= x1; x++) b.set(x, y, col);
        if (type === 'glass') b.set(x0, y, lighten(col, 0.35));
      }
    }
    // glass shine
    if (type === 'glass') for (let y = c.y0 + 3; y < c.y0 + 10; y++) b.set(c.x1 - 3, y, '#ffffff');
    // decorative band
    if (c.band) {
      const by = type === 'mug' ? c.y1 - 6 : c.y0 + 2;
      const [x0] = rowSpan(by);
      b.set(x0, by, c.band); b.set(x0, by + 1, c.band);
      if (type === 'mug') { b.set(x0 + 4, by, c.band); b.set(x0 + 3, by + 1, c.band); b.set(x0 + 5, by + 1, c.band); b.set(x0 + 4, by + 2, c.band); }
    }
    // handle / saucer
    if (type === 'mug') { for (let y = c.y0 + 4; y < c.y0 + 13; y++) { b.set(c.x1 + 2, y, c.body); b.set(c.x1 + 3, y, c.body); } b.set(c.x1 + 1, c.y0 + 4, c.body); b.set(c.x1 + 1, c.y0 + 12, c.body); }
    if (type === 'teacup') { b.rect(1, 26, 30, 2, '#f1e6f7'); b.rect(26, 17, 3, 4, c.body); }

    // overflow drips
    if (lc && level > 1.0) {
      const d = Math.min(6, Math.round((level - 1) * 40));
      for (let i = 0; i < d; i++) { b.set(c.x0 - 1, c.y0 + i, lc); b.set(c.x1 + (type === 'mug' ? 5 : 1), c.y0 + 2 + i, lc); }
    }

    // toppings sit on the liquid surface (or above the rim when full)
    const tp = ing('topping', sel.topping);
    if (tp && tp.id !== 'none' && filled > rows * 0.4) {
      const surf = bottom - filled + 1;
      const [x0, x1] = rowSpan(Math.max(surf, top));
      if (tp.id === 'cream') {
        for (let x = x0; x <= x1; x++) b.set(x, surf - 1, '#fffdf8');
        for (let x = x0 + 1; x < x1; x++) b.set(x, surf - 2, '#fffdf8');
        for (let x = x0 + 3; x < x1 - 2; x++) b.set(x, surf - 3, '#fffdf8');
        b.set(Math.round((x0 + x1) / 2), surf - 4, '#fffdf8');
      }
      if (tp.id === 'foam') {
        for (let x = x0; x <= x1; x++) b.set(x, surf - 1, x % 3 ? '#f6ecdf' : '#fffaf3');
        for (let x = x0 + 1; x < x1; x++) b.set(x, surf - 2, '#f6ecdf');
        for (let x = x0 + 4; x < x1 - 3; x++) b.set(x, surf - 3, '#fffaf3');
      }
      if (tp.id === 'ice') {
        // cubes bob at the surface and sit lower in the drink
        [[x0 + 1, surf], [x1 - 4, surf + 1], [x0 + 4, surf + 5]].forEach(([ix, iy]) => {
          if (iy + 2 > bottom) return;
          b.rect(ix, iy, 3, 3, '#d8f0f8');
          b.set(ix, iy, '#ffffff');
          b.set(ix + 2, iy + 2, '#a9d4e6');
        });
      }
      if (tp.id === 'cinnamon') for (let x = x0 + 1; x < x1; x += 2) b.set(x, surf, '#8a4a22');
      if (tp.id === 'sprinkles') {
        for (let x = x0 + 1; x < x1; x += 3) { b.set(x, surf, '#f0587a'); b.set(x + 1, surf - 1, '#ffd1dc'); }
      }
    }

    b.outline(line);
    // re-open the mouth of the cup so it reads as a container
    if (type === 'glass' && sel.base && sel.topping !== 'cream') {
      // straw
      for (let y = c.y0 - 4; y < c.y0 + 6; y++) b.set(c.x1 - 5, y, y % 2 ? '#ee6f8c' : '#fff1f4');
    }
    return wrapCup(b, opts, !!(lc && sel.cup !== 'glass' && level > 0.3 && opts.steam !== false));
  }

  function wrapCup(b, opts, steam) {
    return `<svg class="cup-svg ${opts.cls || ''}" viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true" focusable="false">` +
      (steam ? '<g class="steam"><rect x="12" y="2" width="1" height="3" fill="#ffffff" opacity=".8"/><rect x="13" y="0" width="1" height="2" fill="#ffffff" opacity=".6"/><rect x="17" y="3" width="1" height="3" fill="#ffffff" opacity=".8"/><rect x="16" y="1" width="1" height="2" fill="#ffffff" opacity=".6"/></g>' : '') +
      b.rects() + '</svg>';
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

  /* Your painted UI art replaces the pixel-grid icons where it exists. */
  const art = (cls, path) => `<img class="icon ${cls}" src="assets/ui/${path}.webp" alt="" draggable="false">`;
  icons.heart = art('i-heart', 'hearts/heart-small');
  icons.heartEmpty = art('i-heart i-empty', 'hearts/heart-empty');
  icons.coin = art('i-coin', 'icons/coin');
  icons.lock = art('i-lock', 'icons/lock');

  window.Sprites = { cup, grid, icons, mix, darken, lighten, liquidColor };
})();
