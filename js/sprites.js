/* Purrfect Pour — procedural pixel art.
 * Characters are drawn into small pixel buffers, auto-outlined, and emitted as
 * crisp SVG with separate groups for the tail and each ear so CSS can animate them. */
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

  /* ---------- Character look defaults ---------- */
  function completeLook(l) {
    const look = Object.assign({
      hairStyle: 'fluffy', ear: 'pointy', eyeStyle: 'soft', build: 'average', outfit: 'sweater',
      eyes: '#4b3a3a', line: '#3a2228',
    }, l);
    look.skinShade = look.skinShade || darken(look.skin, 0.14);
    look.hairShade = look.hairShade || darken(look.hair, 0.22);
    look.hairLight = look.hairLight || lighten(look.hair, 0.28);
    look.earInner = look.earInner || '#f3aebd';
    look.cloth = look.cloth || '#c9b6e4';
    look.clothShade = look.clothShade || darken(look.cloth, 0.16);
    look.clothLight = look.clothLight || lighten(look.cloth, 0.35);
    look.tail = look.tail || look.hair;
    look.tailTip = look.tailTip || look.hairShade;
    return look;
  }

  const W = 40, H = 48;

  /* ---------- Parts ---------- */
  function drawTail(look) {
    const b = new Buf(W, H);
    const p0 = [30, 47], p1 = [40, 43], p2 = [35, 28];
    const r = look.thickTail ? 2.3 : 1.7;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
      const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
      let c = t > 0.78 ? look.tailTip : look.tail;
      if (look.tailStripes && t < 0.78 && Math.floor(t * 14) % 3 === 0) c = look.tailStripes;
      b.ellipse(x, y, r, r, c);
    }
    return b.outline(look.line);
  }

  function drawEar(look, side) {
    const b = new Buf(W, H);
    const m = (pt) => (side === 'r' ? [40 - pt[0], pt[1]] : pt);
    const kind = look.ear;
    if (kind === 'round') {
      b.ellipse(m([14, 8])[0], 8, 4.6, 4.8, look.hair);
      b.ellipse(m([14.4, 8.6])[0], 8.6, 2.6, 2.8, look.earInner);
      if (look.earStripes) { b.set(m([12.5, 0])[0], 5, look.hairShade); b.set(m([13.5, 0])[0], 4, look.hairShade); }
    } else {
      const tipY = kind === 'tall' ? 0.5 : kind === 'fold' ? 4 : 2;
      const tipX = kind === 'fold' ? 11.5 : 12.5;
      const baseX = look.earStripes ? 9 : 10.5;
      b.tri(m([baseX, 15]), m([tipX, tipY]), m([19.5, 9]), look.hair);
      b.tri(m([13, 12.5]), m([tipX + 1.2, tipY + 3.5]), m([17.2, 9.6]), look.earInner);
      if (look.earStripes) [[11, 9], [12, 9], [11, 12], [12, 6]].forEach(([x, y]) => b.set(m([x + 0.5, 0])[0], y, look.hairShade));
      if (kind === 'fold') { b.set(m([11, 0])[0], 4, look.hairShade); b.set(m([12, 0])[0], 4, look.hairShade); b.set(m([11, 0])[0], 5, look.hairShade); }
    }
    b.outline(look.line);
    if (look.accessory === 'choker') { b.set(m([12, 0])[0], 9, '#d9dbe8'); b.set(m([12, 0])[0], 11, '#d9dbe8'); }
    return b;
  }

  function hairFringe(style, x) {
    switch (style) {
      case 'emo':
        if (x <= 13) return 22;
        return Math.min(23, 12 + Math.round((x - 13) * 0.85)) + (x % 2);
      case 'short':
        if (x <= 12 || x >= 27) return 15;
        return 12 + [0, 1, 0, 2][x % 4];
      case 'long': {
        const d = Math.abs(x - 19.5);
        if (d >= 7) return 30;
        return 11 + Math.round(d * 0.55);
      }
      default: /* fluffy */
        if (x <= 12 || x >= 27) return 21;
        return 13 + [1, 2, 1, 0][x % 4];
    }
  }

  function drawBody(look) {
    const b = new Buf(W, H);
    const half = look.build === 'broad' ? 14 : look.build === 'slim' ? 9 : 10;
    const isSkin = (x, y) => { const c = b.get(x, y); return c === look.skin || c === look.skinShade; };

    // long hair behind the shoulders
    if (look.hairStyle === 'long') b.ellipse(20, 23, 11.5, 13, look.hairShade);
    if (look.outfit === 'hoodie') b.ellipse(20, 29, 9, 3, look.clothShade);

    // neck
    b.rect(18, 23, 4, 6, look.skinShade);

    // torso
    const skinTorso = look.outfit === 'apron' || look.outfit === 'blouse';
    for (let y = 28; y < H; y++) {
      let hw = half;
      if (y === 28) hw -= 4; else if (y === 29) hw -= 2; else if (y === 30) hw -= 1;
      for (let x = 20 - hw; x < 20 + hw; x++) b.set(x, y, skinTorso ? look.skin : look.cloth);
    }
    const armL = 20 - half + 3, armR = 19 + half - 3;

    if (look.outfit === 'sweater') {
      for (let y = 33; y < H; y++) { b.set(armL, y, look.clothShade); b.set(armR, y, look.clothShade); }
      b.rect(16, 28, 8, 1, look.clothLight); b.set(17, 29, look.clothLight); b.set(18, 29, look.clothLight);
      b.set(21, 29, look.clothLight); b.set(22, 29, look.clothLight);
      b.set(19, 28, look.skinShade); b.set(20, 28, look.skinShade);
      b.rect(20 - half, 46, half * 2, 2, look.clothShade);
      for (let x = 20 - half; x < 20 + half; x += 2) b.set(x, 46, look.clothLight);
    } else if (look.outfit === 'hoodie') {
      for (let y = 33; y < H; y++) { b.set(armL, y, look.clothShade); b.set(armR, y, look.clothShade); }
      for (let y = 30; y < 36; y++) { b.set(18, y, '#cfc6d6'); b.set(21, y, '#cfc6d6'); }
      b.set(18, 36, '#9aa0b8'); b.set(21, 36, '#9aa0b8');
      b.rect(15, 41, 10, 1, look.clothShade); b.rect(15, 42, 1, 5, look.clothShade); b.rect(24, 42, 1, 5, look.clothShade);
      b.set(25, 33, look.clothLight); b.set(26, 33, look.clothLight); b.set(25, 34, look.clothLight);
    } else if (look.outfit === 'apron') {
      // tank top over skin, apron over tank, visible strong shoulders
      for (let y = 29; y < H; y++) for (let x = armL + 2; x <= armR - 2; x++) b.set(x, y, look.cloth);
      for (let y = 32; y < H; y++) { b.set(armL, y, look.skinShade); b.set(armR, y, look.skinShade); }
      b.set(armL - 1, 31, look.skinShade); b.set(armR + 1, 31, look.skinShade);
      b.rect(17, 29, 6, 1, look.skinShade); b.rect(18, 30, 4, 1, look.skinShade);
      b.rect(16, 34, 8, 6, look.apron);
      b.rect(13, 40, 14, 8, look.apron);
      b.set(15, 33, look.apronShade); b.set(14, 32, look.apronShade); b.set(13, 31, look.apronShade);
      b.set(24, 33, look.apronShade); b.set(25, 32, look.apronShade); b.set(26, 31, look.apronShade);
      b.rect(17, 42, 6, 4, look.apronShade);
      b.set(19, 43, '#fff3f5'); b.set(21, 43, '#fff3f5'); b.rect(19, 44, 3, 1, '#fff3f5'); b.set(20, 45, '#fff3f5');
    } else if (look.outfit === 'blouse') {
      for (let y = 31; y < H; y++) for (let x = 20 - half; x < 20 + half; x++) b.set(x, y, look.cloth);
      for (let x = 20 - half; x < 20 + half; x++) b.set(x, 31, x % 2 ? look.clothShade : look.clothLight);
      for (let y = 32; y < H; y++) { b.set(armL, y, look.clothShade); b.set(armR, y, look.clothShade); }
      b.set(19, 30, '#e0607a'); b.set(20, 30, '#e0607a');
      b.set(18, 34, '#e86f88'); b.set(21, 34, '#e86f88'); b.set(19, 34, '#c94b6a'); b.set(20, 34, '#c94b6a');
      b.set(18, 35, '#e86f88'); b.set(21, 35, '#e86f88');
    }

    // head
    b.ellipse(20, 17.5, 8.6, 8.6, look.skin);

    // hair cap
    const cap = new Buf(W, H);
    cap.ellipse(20, 16, 9.7, 9.5, look.hair, (x, y) => y < hairFringe(look.hairStyle, x));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!cap.get(x, y)) continue;
      let c = look.hair;
      if (!cap.get(x, y + 1)) c = look.hairShade;
      else if ((y === 9 && x >= 14 && x <= 17) || (y === 10 && x >= 13 && x <= 15)) c = look.hairLight;
      b.set(x, y, c);
    }
    if (look.hairStyle === 'long') {
      for (let y = 18; y < 37; y++) {
        const tip = y > 33 && look.hairTip ? look.hairTip : look.hair;
        b.set(10, y, tip); b.set(11, y, tip); b.set(12, y, y > 26 ? tip : b.get(12, y) === look.skin ? look.hair : tip);
        b.set(29, y, tip); b.set(28, y, tip); b.set(27, y, y > 26 ? tip : look.hair);
      }
      for (let y = 20; y < 37; y += 4) { b.set(11, y, look.hairShade); b.set(28, y, look.hairShade); }
    }
    if (look.hairStyle === 'short') { b.set(17, 5, look.hair); b.set(18, 4, look.hair); b.set(22, 5, look.hair); }

    b.outline(look.line);
    return { b, isSkin };
  }

  function drawFace(b, isSkin, look, expr) {
    const lash = look.eyeStyle === 'liner' ? '#120a12' : look.line;
    const dk = darken(look.eyes, 0.35);
    const put = (x, y, c) => { if (isSkin(x, y) || b.get(x, y) === '#fbc7d0' || b.get(x, y) === '#f6a0b2') b.set(x, y, c); };
    const blushC = '#f6a0b2', blushL = '#fbc7d0';

    function openEye(x0, hiX, lidded) {
      const top = lidded ? 18 : 17;
      const outer = x0 < 20 ? x0 - 1 : x0 + 2;
      [x0, x0 + 1, outer].forEach((x) => put(x, top, lash));
      put(x0, top + 1, lidded ? look.eyes : (hiX === x0 ? '#ffffff' : look.eyes));
      put(x0 + 1, top + 1, lidded ? look.eyes : (hiX === x0 + 1 ? '#ffffff' : look.eyes));
      if (!lidded) { put(x0, 19, look.eyes); put(x0 + 1, 19, look.eyes); }
      put(x0, 20, dk); put(x0 + 1, 20, dk);
    }
    const L = 15, R = 23;
    const closedArc = () => {
      [[14, 19], [15, 18], [16, 18], [17, 19], [22, 19], [23, 18], [24, 18], [25, 19]].forEach(([x, y]) => put(x, y, lash));
    };

    // brows
    const brow = look.hairStyle === 'short' ? look.hairShade : darken(look.hair, 0.3);
    if (expr === 'sad' || expr === 'flustered') {
      put(14, 16, brow); put(15, 15, brow); put(16, 15, brow); put(23, 15, brow); put(24, 15, brow); put(25, 16, brow);
    } else {
      put(14, 15, brow); put(15, 15, brow); put(16, 15, brow); put(23, 15, brow); put(24, 15, brow); put(25, 15, brow);
      if (look.eyeStyle === 'bright') { put(15, 14, brow); put(24, 14, brow); }
    }

    // eyes
    if (expr === 'happy') closedArc();
    else if (expr === 'flustered') {
      [[14, 17], [15, 18], [16, 19], [15, 20], [14, 21]].forEach(([x, y]) => put(x, y, lash));
      [[25, 17], [24, 18], [23, 19], [24, 20], [25, 21]].forEach(([x, y]) => put(x, y, lash));
    } else {
      const lidded = expr === 'blush' || expr === 'smirk';
      openEye(L, L, lidded);
      openEye(R, R, lidded);
    }

    // eye style extras
    if (expr !== 'flustered') {
      if (look.eyeStyle === 'liner') { put(13, 17, lash); put(12, 16, lash); put(26, 17, lash); put(27, 16, lash); }
      if (look.eyeStyle === 'lashes') {
        put(13, 17, lash); put(13, 16, lash); put(26, 17, lash); put(26, 16, lash);
        put(15, 16, '#e6a9c4'); put(16, 16, '#e6a9c4'); put(23, 16, '#e6a9c4'); put(24, 16, '#e6a9c4');
      }
    }

    // nose
    put(20, 21, look.skinShade);

    // blush
    if (expr === 'blush' || expr === 'flustered') {
      [13, 14, 15, 16].forEach((x) => { put(x, 21, blushC); put(x, 22, x % 2 ? blushC : blushL); });
      [23, 24, 25, 26].forEach((x) => { put(x, 21, blushC); put(x, 22, x % 2 ? blushL : blushC); });
    } else if (look.blush || expr === 'happy') {
      put(14, 21, blushL); put(15, 21, blushL); put(24, 21, blushL); put(25, 21, blushL);
    }

    // mouth
    const mouth = look.lips || '#9c4b57';
    if (expr === 'happy') {
      put(18, 22, look.line); put(21, 22, look.line); put(19, 23, mouth); put(20, 23, mouth);
      if (look.fang) put(20, 24, '#ffffff');
    } else if (expr === 'sad') {
      put(18, 24, mouth); put(19, 23, mouth); put(20, 23, mouth); put(21, 24, mouth);
    } else if (expr === 'flustered') {
      put(18, 24, mouth); put(19, 23, mouth); put(20, 24, mouth); put(21, 23, mouth);
      b.set(29, 13, '#9fd3f0'); b.set(29, 14, '#bfe4f7'); b.set(28, 14, '#9fd3f0');
    } else if (expr === 'smirk') {
      put(19, 23, mouth); put(20, 23, mouth); put(21, 22, mouth);
      if (look.fang) put(20, 24, '#ffffff');
    } else if (expr === 'blush') {
      put(19, 23, mouth); put(20, 23, mouth);
    } else {
      put(19, 23, mouth); put(20, 23, mouth);
    }

    // accessories drawn over the body
    if (look.accessory === 'choker') { for (let x = 18; x < 22; x++) b.set(x, 26, '#120a12'); b.set(20, 27, '#d9dbe8'); }
    if (look.accessory === 'pencil') { b.set(25, 34, '#f2c14e'); b.set(25, 35, '#f2c14e'); b.set(25, 33, '#f39aaa'); b.rect(23, 36, 5, 4, look.clothShade); }
    if (look.accessory === 'bow') {
      [[11, 8], [12, 9], [11, 10], [14, 8], [13, 9], [14, 10]].forEach(([x, y]) => b.set(x, y, '#ee6f8c'));
      b.set(12, 9, '#c94b6a');
      b.set(10, 24, '#f2c14e'); b.set(29, 24, '#f2c14e');
    }
  }

  /* ---------- Public: character SVG ---------- */
  const cache = new Map();
  const EXPRS = ['neutral', 'happy', 'blush', 'flustered', 'sad', 'smirk'];

  function character(lookIn, expr = 'neutral', opts = {}) {
    if (!EXPRS.includes(expr)) expr = 'neutral';
    const key = JSON.stringify([lookIn, expr, opts.silhouette || '']);
    if (cache.has(key)) return cache.get(key);
    const look = completeLook(lookIn);
    const tail = drawTail(look);
    const earL = drawEar(look, 'l');
    const earR = drawEar(look, 'r');
    const { b, isSkin } = drawBody(look);
    drawFace(b, isSkin, look, expr);
    if (opts.silhouette) {
      const s = opts.silhouette;
      [tail, earL, earR, b].forEach((buf) => buf.map(() => s));
    }
    const svg = `<svg class="sprite expr-${expr}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">` +
      `<g class="part tail">${tail.rects()}</g>` +
      `<g class="part ear ear-l">${earL.rects()}</g>` +
      `<g class="part ear ear-r">${earR.rects()}</g>` +
      `<g class="part body">${b.rects()}</g></svg>`;
    cache.set(key, svg);
    return svg;
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

  window.Sprites = { character, cup, grid, icons, mix, darken, lighten, liquidColor, EXPRS };
})();
