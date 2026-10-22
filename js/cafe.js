/* Purrfect Pour — the Velvet Paw café, painted on a 160×120 pixel canvas.
 * Background (wall, window, shelves, décor) and foreground (the counter that hides
 * customers' lower halves) are separate canvases so DOM sprites can sit between them. */
(function () {
  'use strict';

  const CW = 160, CH = 120;
  const C = {
    wall: '#fbe2e1', stripe: '#f6d2d6', wains: '#a8a4d0', wainsLine: '#8d88bb', trim: '#fff4ea',
    floor: '#c99779', floorDark: '#b3826a', cocoa: '#6b4136', cocoaDark: '#4a2b2b',
    cream: '#fff6ec', coral: '#ef7f8a', pink: '#f7b7c2', lav: '#b9a7e0', mint: '#a9dcc4', gold: '#f2c14e',
    leaf: '#5fa46e', leafDark: '#3f7d52', leafLight: '#8fcf8f',
  };

  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  /* ---------- Décor pieces (also used for shop previews) ---------- */
  const decor = {
    plant(ctx, ox, oy) {
      // pot
      px(ctx, ox + 3, oy + 34, 12, 12, C.coral); px(ctx, ox + 2, oy + 33, 14, 3, '#f59ca5');
      px(ctx, ox + 3, oy + 45, 12, 1, '#c9566a'); px(ctx, ox + 6, oy + 39, 6, 1, C.cream);
      // stems + monstera leaves
      px(ctx, ox + 8, oy + 18, 1, 16, C.leafDark); px(ctx, ox + 10, oy + 12, 1, 22, C.leafDark);
      const leaf = (x, y, w, h) => { px(ctx, x, y, w, h, C.leaf); px(ctx, x + 1, y + 1, w - 2, 1, C.leafLight); px(ctx, x + Math.floor(w / 2), y + 2, 1, h - 3, C.leafDark); };
      leaf(ox, oy + 16, 9, 7); leaf(ox + 9, oy + 8, 9, 8); leaf(ox + 2, oy + 6, 8, 7); leaf(ox + 8, oy + 22, 9, 7); leaf(ox + 5, oy, 7, 6);
    },
    chairs(ctx, ox, oy) {
      // table
      px(ctx, ox + 14, oy + 8, 14, 3, C.cream); px(ctx, ox + 13, oy + 9, 16, 1, '#f1dccb');
      px(ctx, ox + 20, oy + 11, 2, 11, C.cocoa); px(ctx, ox + 16, oy + 21, 10, 2, C.cocoa);
      px(ctx, ox + 19, oy + 5, 3, 3, C.pink); px(ctx, ox + 20, oy + 4, 1, 1, C.leaf);
      // mint chair (left)
      px(ctx, ox + 1, oy, 3, 14, C.mint); px(ctx, ox + 1, oy + 11, 10, 3, C.mint); px(ctx, ox + 2, oy + 14, 1, 9, '#7fb59c'); px(ctx, ox + 9, oy + 14, 1, 9, '#7fb59c');
      px(ctx, ox + 1, oy, 3, 1, '#d4f0e2');
      // pink chair (right)
      px(ctx, ox + 38, oy, 3, 14, C.pink); px(ctx, ox + 31, oy + 11, 10, 3, C.pink); px(ctx, ox + 32, oy + 14, 1, 9, '#d98a9a'); px(ctx, ox + 39, oy + 14, 1, 9, '#d98a9a');
      px(ctx, ox + 38, oy, 3, 1, '#ffe0e6');
    },
    tower(ctx, ox, oy, t = 0) {
      px(ctx, ox + 6, oy + 6, 3, 50, '#d9c1a3'); px(ctx, ox + 7, oy + 6, 1, 50, '#c4a586');
      for (let y = oy + 10; y < oy + 56; y += 4) px(ctx, ox + 6, y, 3, 1, '#b8936f');
      px(ctx, ox, oy + 4, 16, 4, C.lav); px(ctx, ox, oy + 7, 16, 1, '#8f7cc0');
      px(ctx, ox + 2, oy + 28, 14, 4, C.pink); px(ctx, ox + 2, oy + 31, 14, 1, '#d98a9a');
      px(ctx, ox - 1, oy + 54, 18, 4, C.lav);
      // Biscuit the cat, asleep on top
      px(ctx, ox + 2, oy - 2, 11, 6, '#f2b277'); px(ctx, ox + 3, oy - 3, 4, 1, '#f2b277');
      px(ctx, ox + 3, oy - 5, 1, 2, '#f2b277'); px(ctx, ox + 6, oy - 5, 1, 2, '#f2b277');
      px(ctx, ox + 4, oy - 1, 1, 1, C.cocoaDark); px(ctx, ox + 6, oy - 1, 1, 1, C.cocoaDark);
      px(ctx, ox + 8, oy - 2, 1, 6, '#d98f55'); px(ctx, ox + 10, oy - 2, 1, 6, '#d98f55');
      const flick = Math.sin(t / 400) > 0.6 ? -1 : 0;
      px(ctx, ox + 13, oy + 1 + flick, 3, 2, '#f2b277'); px(ctx, ox + 15, oy + 3 + flick, 1, 3, '#f2b277');
    },
    neon(ctx, ox, oy, t = 0) {
      const glow = 0.25 + 0.1 * Math.sin(t / 300);
      ctx.fillStyle = `rgba(255,120,160,${glow})`; ctx.fillRect(ox - 3, oy - 3, 24, 20);
      const H = ['.xx..xx.', 'x..xx..x', 'x......x', '.x....x.', '..x..x..', '...xx...'];
      H.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'x') { px(ctx, ox + 1 + x * 2, oy + 1 + y * 2, 2, 2, '#ff8fb1'); px(ctx, ox + 1 + x * 2, oy + 1 + y * 2, 1, 1, '#ffe3ec'); } }));
    },
    lights(ctx, ox, oy, t = 0, w = 40) {
      const cols = ['#ffd36b', '#ff9fb8', '#b9e2ff', '#c9b6ff'];
      for (let i = 0; i <= w; i++) {
        const y = oy + Math.round(Math.sin((i / w) * Math.PI) * 4);
        px(ctx, ox + i, y, 1, 1, '#6b5a4a');
        if (i % 5 === 2) {
          const on = (Math.floor(t / 350) + i) % 3 !== 0;
          const c = cols[(i / 5 | 0) % cols.length];
          if (on) { ctx.fillStyle = c + '66'; ctx.fillRect(ox + i - 1, y, 3, 3); }
          px(ctx, ox + i, y + 1, 1, 2, on ? c : '#9b8e86');
        }
      }
    },
  };

  /* ---------- Room ---------- */
  function drawBackground(ctx, owned, mode, t) {
    const night = mode === 'night';
    // wall + stripes
    px(ctx, 0, 0, CW, 70, C.wall);
    for (let x = 4; x < CW; x += 10) px(ctx, x, 0, 2, 70, C.stripe);
    for (let x = 9; x < CW; x += 20) for (let y = 6; y < 66; y += 12) px(ctx, x, y, 1, 1, '#f3b9c4');
    // wainscot + floor
    px(ctx, 0, 62, CW, 2, C.trim);
    px(ctx, 0, 64, CW, 18, C.wains);
    for (let x = 6; x < CW; x += 16) { px(ctx, x, 67, 12, 12, '#b5b1da'); px(ctx, x, 67, 12, 1, C.wainsLine); }
    px(ctx, 0, 82, CW, 38, C.floor);
    for (let y = 86; y < CH; y += 5) px(ctx, 0, y, CW, 1, C.floorDark);

    // window
    const wx = 18, wy = 10, ww = 36, wh = 38;
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    if (night) { sky.addColorStop(0, '#2f2b57'); sky.addColorStop(1, '#6b4c7f'); }
    else { sky.addColorStop(0, '#cfe4f4'); sky.addColorStop(1, '#fbd5df'); }
    px(ctx, wx - 2, wy - 2, ww + 4, wh + 4, C.cocoa);
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    if (night) { [[22, 14], [40, 18], [30, 24], [48, 13]].forEach(([x, y]) => px(ctx, x, y, 1, 1, '#fff6c8')); px(ctx, 44, 16, 4, 4, '#fff1c1'); px(ctx, 45, 16, 3, 3, '#2f2b57'); }
    else { px(ctx, 24, 16, 8, 2, '#ffffff'); px(ctx, 26, 15, 4, 1, '#ffffff'); px(ctx, 40, 22, 6, 2, '#ffffff'); }
    // rooftops outside
    const roof = night ? '#4a3b66' : '#c7b9df';
    px(ctx, wx, wy + 28, 10, 10, roof); px(ctx, wx + 12, wy + 24, 8, 14, roof); px(ctx, wx + 22, wy + 30, 14, 8, roof);
    if (night) { px(ctx, wx + 14, wy + 27, 2, 2, '#ffd36b'); px(ctx, wx + 3, wy + 31, 2, 2, '#ffd36b'); }
    px(ctx, wx + ww / 2 - 1, wy, 2, wh, C.cocoa); px(ctx, wx, wy + wh / 2 - 1, ww, 2, C.cocoa);
    px(ctx, wx - 3, wy + wh + 2, ww + 6, 3, C.trim);

    // chalkboard menu
    const bx = 62, by = 8;
    px(ctx, bx - 2, by - 2, 38, 30, '#8a5a44'); px(ctx, bx, by, 34, 26, '#3d3a4a');
    px(ctx, bx + 4, by + 3, 12, 1, '#f4e8e8'); px(ctx, bx + 4, by + 3, 1, 3, '#f4e8e8');
    for (let i = 0; i < 4; i++) { px(ctx, bx + 4, by + 8 + i * 4, 14 + (i % 2) * 4, 1, '#e8dcdc'); px(ctx, bx + 26, by + 8 + i * 4, 4, 1, '#f7a8b8'); }
    [[0, 1], [1, 0], [2, 1], [3, 0], [4, 1], [1, 2], [2, 3], [3, 2]].forEach(([x, y]) => px(ctx, bx + 24 + x, by + 2 + y, 1, 1, '#f7a8b8'));

    // shelves
    for (const sy of [16, 34]) {
      px(ctx, 104, sy, 36, 2, C.cocoa); px(ctx, 106, sy + 2, 2, 3, C.cocoaDark); px(ctx, 136, sy + 2, 2, 3, C.cocoaDark);
    }
    px(ctx, 106, 8, 5, 8, C.lav); px(ctx, 106, 7, 5, 1, '#8f7cc0'); px(ctx, 113, 10, 4, 6, C.pink); px(ctx, 113, 9, 4, 1, '#d98a9a');
    px(ctx, 120, 11, 6, 5, C.cream); px(ctx, 126, 12, 1, 2, C.cream); px(ctx, 129, 9, 3, 7, C.coral); px(ctx, 132, 10, 3, 6, C.mint); px(ctx, 135, 8, 2, 8, C.lav);
    px(ctx, 107, 28, 6, 6, '#e9a26b'); px(ctx, 108, 25, 4, 3, C.leaf); px(ctx, 106, 26, 2, 2, C.leafLight); px(ctx, 112, 24, 2, 3, C.leaf);
    px(ctx, 117, 30, 5, 4, C.cream); px(ctx, 117, 27, 5, 3, C.cream); px(ctx, 117, 26, 5, 1, '#f1dccb');
    px(ctx, 126, 29, 9, 5, '#f7d36b'); px(ctx, 127, 30, 7, 3, '#fbe8a8'); px(ctx, 128, 31, 5, 1, C.cocoa);

    // pendant lamps
    for (const lx of [48, 116]) {
      px(ctx, lx, 0, 1, 6, '#6b5a4a');
      px(ctx, lx - 4, 6, 9, 3, C.coral); px(ctx, lx - 5, 9, 11, 1, '#c9566a');
      const g = ctx.createRadialGradient(lx + 0.5, 12, 1, lx + 0.5, 12, night ? 30 : 20);
      g.addColorStop(0, night ? 'rgba(255,214,140,0.55)' : 'rgba(255,230,180,0.35)'); g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - 30, 0, 61, 50);
      px(ctx, lx - 1, 10, 3, 1, '#fff2c2');
    }

    if (owned.has('neon')) decor.neon(ctx, 120, 44, t);
    if (owned.has('chairs')) decor.chairs(ctx, 98, 58);
    if (owned.has('plant')) decor.plant(ctx, 0, 40);
    if (owned.has('tower')) decor.tower(ctx, 143, 30, t);
    if (owned.has('lights')) { decor.lights(ctx, wx - 3, wy - 6, t, ww + 6); decor.lights(ctx, 64, 1, t + 500, 90); }

    if (night) { ctx.fillStyle = 'rgba(52,36,92,0.32)'; ctx.fillRect(0, 0, CW, CH); }
  }

  function drawCounter(ctx, mode, t) {
    ctx.clearRect(0, 0, CW, CH);
    // espresso machine
    px(ctx, 6, 66, 26, 24, '#9b9fc8'); px(ctx, 6, 66, 26, 3, '#c9cce6'); px(ctx, 8, 70, 22, 1, '#7c80ad');
    px(ctx, 10, 74, 18, 8, '#7c80ad'); px(ctx, 12, 76, 4, 4, '#e8e9f5'); px(ctx, 22, 76, 4, 4, '#e8e9f5');
    px(ctx, 13, 77, 2, 2, C.coral); px(ctx, 23, 77, 2, 2, C.mint);
    px(ctx, 16, 82, 6, 2, '#4a4a63'); px(ctx, 17, 84, 4, 4, C.cream);
    px(ctx, 4, 64, 30, 2, '#7c80ad');
    const s = Math.floor(t / 250) % 3;
    px(ctx, 18, 60 - s, 1, 3, 'rgba(255,255,255,0.7)'); px(ctx, 20, 58 + s, 1, 3, 'rgba(255,255,255,0.5)');
    // cups stack + tip jar
    px(ctx, 38, 82, 8, 6, C.cream); px(ctx, 39, 78, 6, 4, C.pink); px(ctx, 40, 74, 4, 4, C.cream);
    px(ctx, 100, 80, 10, 10, 'rgba(214,236,244,0.85)'); px(ctx, 100, 80, 10, 1, '#9fc3dd');
    px(ctx, 102, 85, 3, 3, C.gold); px(ctx, 105, 86, 3, 2, '#d9a530'); px(ctx, 103, 83, 2, 2, C.gold);
    // cake dome
    px(ctx, 122, 72, 30, 18, 'rgba(225,240,248,0.55)'); px(ctx, 124, 70, 26, 2, 'rgba(225,240,248,0.55)');
    px(ctx, 136, 67, 2, 3, '#c9d6e6');
    px(ctx, 125, 82, 10, 7, '#fbe3c8'); px(ctx, 125, 80, 10, 2, C.pink); px(ctx, 129, 78, 2, 2, '#e04a64');
    px(ctx, 138, 83, 10, 6, '#7a4b3a'); px(ctx, 138, 81, 10, 2, C.cream); px(ctx, 142, 79, 2, 2, '#e04a64');
    px(ctx, 122, 72, 1, 18, 'rgba(255,255,255,0.8)');
    // counter top + front
    px(ctx, 0, 90, CW, 5, '#fff3ec'); px(ctx, 0, 90, CW, 1, '#ffffff');
    px(ctx, 20, 92, 14, 1, '#e3d6ef'); px(ctx, 80, 93, 18, 1, '#e3d6ef'); px(ctx, 130, 91, 10, 1, '#e3d6ef');
    px(ctx, 0, 95, CW, 25, '#7a4b3a'); px(ctx, 0, 95, CW, 2, C.coral);
    for (let x = 6; x < CW; x += 38) { px(ctx, x, 101, 30, 15, '#6a3f31'); px(ctx, x, 101, 30, 1, '#8e5c48'); }
    // little heart plaque
    [[0, 0], [1, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]].forEach(([x, y]) => px(ctx, 78 + x, 106 + y, 1, 1, C.pink));
    if (mode === 'night') { ctx.fillStyle = 'rgba(52,36,92,0.32)'; ctx.fillRect(0, 60, CW, 60); }
  }

  /* ---------- Live scene ---------- */
  class Scene {
    constructor(bgCanvas, fgCanvas) {
      this.bg = bgCanvas; this.fg = fgCanvas;
      [bgCanvas, fgCanvas].forEach((c) => { c.width = CW; c.height = CH; });
      this.bctx = bgCanvas.getContext('2d'); this.fctx = fgCanvas.getContext('2d');
      this.owned = new Set(); this.mode = 'day'; this.running = false; this.last = 0;
    }
    set(owned, mode) { this.owned = new Set(owned); this.mode = mode || 'day'; this.draw(performance.now()); }
    draw(t) { drawBackground(this.bctx, this.owned, this.mode, t); drawCounter(this.fctx, this.mode, t); }
    start() {
      if (this.running) return;
      this.running = true;
      const loop = (t) => {
        if (!this.running) return;
        if (t - this.last > 140) { this.last = t; this.draw(t); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    stop() { this.running = false; }
  }

  /* Static one-off render (dialogue backgrounds). */
  function still(canvas, owned, mode) {
    canvas.width = CW; canvas.height = CH;
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, new Set(owned), mode, 0);
    const tmp = document.createElement('canvas'); tmp.width = CW; tmp.height = CH;
    drawCounter(tmp.getContext('2d'), mode, 0);
    ctx.drawImage(tmp, 0, 0);
  }

  /* Small preview of one décor item for the shop. */
  function preview(canvas, id) {
    const sizes = { plant: [20, 48, 1, 1], chairs: [44, 26, 1, 1], tower: [20, 62, 2, 7], neon: [24, 18, 3, 3], lights: [44, 10, 1, 1] };
    const [w, h, ox, oy] = sizes[id];
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (id === 'lights') decor.lights(ctx, ox + 1, oy, 400, 40);
    else decor[id](ctx, ox, oy, 0);
  }

  window.Cafe = { Scene, still, preview, W: CW, H: CH };
})();
