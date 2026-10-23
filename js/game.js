/* Purrfect Pour — game engine: screens, the 30-day calendar, café shifts, drink making,
 * story scenes, relationships and save data. Content lives in data.js and story.js. */
(function () {
  'use strict';

  const D = window.GAME_DATA, S = window.Sprites;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const charById = Object.fromEntries(D.characters.map((c) => [c.id, c]));
  const guestById = Object.fromEntries(D.guests.map((g) => [g.id, g]));
  const recipeById = Object.fromEntries(D.recipes.map((r) => [r.id, r]));
  const decorById = Object.fromEntries(D.decor.map((d) => [d.id, d]));
  const lookById = Object.fromEntries(D.player.looks.map((l) => [l.id, l]));
  const isCast = (id) => !!charById[id];
  const person = (id) => charById[id] || guestById[id];
  const ingName = (step, id) => (D.ingredients[step].find((i) => i.id === id) || {}).name || '—';
  const RECIPE_KEYS = ['cup', 'base', 'milk', 'syrup', 'topping'];
  const assetSrc = (path) => `assets/${path}.webp`;
  const artImg = (path, cls = '') => (path ? `<img class="item ${cls}" src="${assetSrc(path)}" alt="" draggable="false">` : '');
  const withArticle = (name) => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;

  /* ---------- Save data ---------- */
  const SAVE_KEY = 'purrfect-pour:save:v2';
  const SET_KEY = 'purrfect-pour:settings:v1';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: play continues unsaved */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  function freshSave() {
    return {
      v: 2, day: 1, coins: D.economy.startCoins, decor: [], met: {}, affection: {}, scenesSeen: {}, chats: {}, flags: {},
      guests: {}, seenMoments: {}, seenEvents: {}, momentDay: 0, route: null, usual: null, menuName: null, helper: null,
      lastShift: null, finished: false, phase: 'intro', player: null, newBadges: [],
      totals: { served: 0, perfect: 0, earned: 0 },
    };
  }
  function loadSave() {
    const s = store.get(SAVE_KEY);
    if (!s || s.v !== 2) return null;
    const base = freshSave();
    Object.keys(base).forEach((k) => { if (s[k] === undefined) s[k] = base[k]; });
    s.decor = s.decor.filter((id) => decorById[id]);
    if (s.phase === 'shift') s.phase = 'hub';   // an interrupted shift resumes from the closed café
    return s;
  }
  let save = loadSave();
  const settings = Object.assign({ sound: true, music: true, textSpeed: 'normal', reduceMotion: false }, store.get(SET_KEY) || {});
  const persist = () => { if (save) store.set(SAVE_KEY, save); };
  const persistSettings = () => store.set(SET_KEY, settings);

  /* ---------- Runtime state ---------- */
  const G = { screen: 'title', returnTo: 'title', phase: 'hub', shift: null, drink: null, dlg: null, modal: null, create: null };

  /* ---------- Relationships ---------- */
  const aff = (id) => (save && save.affection[id]) || 0;
  const tierOf = (a) => D.tiers.reduce((t, x) => (a >= x.min ? x : t), D.tiers[0]);
  const nextTier = (a) => D.tiers.find((t) => t.min > a);
  const isMet = (id) => !!(save && save.met[id]);
  const decorBonus = () => (save ? save.decor.reduce((s, id) => s + decorById[id].bonus, 0) : 0);

  function closest() {
    let best = null, bv = -1;
    D.characters.forEach((c) => { if (isMet(c.id) && aff(c.id) > bv) { bv = aff(c.id); best = c.id; } });
    return best;
  }
  const routeChar = (type) => (save && save.route && save.route.type === type ? save.route.char : null);

  function addAffection(id, n) {
    const before = aff(id);
    const after = clamp(before + n, 0, 100);
    save.affection[id] = after;
    const tb = tierOf(before), ta = tierOf(after);
    if (ta !== tb && after > before) {
      setTimeout(() => toast(`${charById[id].name} now sees you as a <b>${ta.name}</b>`, 'heart'), 500);
    }
    return after - before;
  }

  function meet(id) {
    if (save.met[id]) return;
    save.met[id] = true;
    if (!save.newBadges.includes(id)) save.newBadges.push(id);
    Sfx.play('unlock');
    toast(`New character unlocked: <b>${charById[id].name}</b>`, 'unlock');
  }

  /* ---------- Recurring guests ---------- */
  const guestState = (id) => (save.guests[id] || (save.guests[id] = { beat: 0, met: false }));
  const guestDone = (id) => guestState(id).beat >= guestById[id].beats.length;
  const guestsDone = () => D.guests.filter((g) => guestDone(g.id) && guestState(g.id).met).length;
  const guestDue = (g) => { const b = g.beats[guestState(g.id).beat]; return b && b.minDay <= save.day ? b : null; };

  /* ---------- Menu ---------- */
  const menu = () => D.recipes.filter((r) => !r.secret || save.menuName);
  const recipeName = (id) => (id === 'market_special' && save && save.menuName ? save.menuName : recipeById[id].name);

  /* ---------- Player: name, pronouns, look ---------- */
  const playerLook = () => lookById[(save && save.player && save.player.look) || D.player.looks[0].id];
  const playerName = () => (save && save.player && save.player.name) || D.player.defaultName;
  const pron = () => D.player.pronouns.find((p) => p.id === (save && save.player && save.player.pronouns)) || D.player.pronouns[2];
  const nameOf = (id) => (id && person(id) ? person(id).name : 'someone');

  /* {name} {NAME} {they} {them} {their} {theirs} {themself} {theyre} (capitalize to capitalize),
   * {closest} {partner} {waiting} {helper} {usual} {ausual}. */
  function fill(text) {
    const p = pron();
    const usual = save && save.usual ? recipeName(save.usual) : 'your usual';
    const T = {
      name: playerName(), NAME: playerName().toUpperCase(),
      closest: nameOf(closest()), partner: nameOf(routeChar('dating')), waiting: nameOf(routeChar('waiting')),
      helper: nameOf(save && save.lastShift && save.lastShift.helper), usual, ausual: withArticle(usual),
    };
    return String(text).replace(/\{(\w+)\}/g, (m, k) => {
      if (k in T) return T[k];
      const lk = k.charAt(0).toLowerCase() + k.slice(1);
      if (k !== lk && lk in T) return cap(T[lk]);
      if (k in p && typeof p[k] === 'string' && k !== 'id' && k !== 'label') return p[k];
      const lower = k.charAt(0).toLowerCase() + k.slice(1);
      if (lower in p && k !== lower) return cap(p[lower]);
      return m;
    });
  }
  const drinkTokens = (tpl, id) => {
    const n = recipeName(id);
    return tpl.replace(/\{drink\}/g, n).replace(/\{adrink\}/g, withArticle(n)).replace(/\{Adrink\}/g, cap(withArticle(n)));
  };

  /* ---------- Art ---------- */
  /* Cast art lives in assets/characters/<id>/: a large bust and full body, eight bust and
   * eight chibi expressions, an eight-frame turnaround. Guests have a full body and three
   * bust expressions (the closest match is used for the rest). */
  const artSrc = (id, file) => `assets/characters/${id}/${file}.webp`;
  const artFile = (kind, expr) => (kind === 'chibi' || kind === 'talk' || kind === 'counter'
    ? `${kind === 'chibi' ? 'chibi' : 'bust'}-${D.expressions.includes(expr) ? expr : 'neutral'}`
    : kind);
  const GUEST_FALLBACK = {
    happy: ['content'], content: ['happy'], blush: ['happy', 'content'], smirk: ['happy'], flustered: ['sad'],
    surprised: ['happy'], sad: ['neutral'], pensive: ['content'],
  };
  function guestFile(id, kind, expr) {
    if (kind === 'full') return 'full';
    const has = guestById[id].expressions;
    return 'bust-' + [expr, ...(GUEST_FALLBACK[expr] || []), 'neutral'].find((e) => has.includes(e));
  }
  function portrait(who, { kind = 'bust', expr = 'neutral', locked = false } = {}) {
    const file = guestById[who] ? guestFile(who, kind, expr) : artFile(kind, expr);
    return `<img class="art art-${kind}${locked ? ' silhouette' : ''}" src="${artSrc(who, file)}" alt="" draggable="false">`;
  }
  /* Chibi faces are small at café size, so reactions there also get an emote. */
  const EMOTES = { happy: '♪', blush: '♡', flustered: '!!', surprised: '!', sad: '…', smirk: '✧' };
  const emote = (expr) => (EMOTES[expr] ? `<span class="emote emote-${expr}" aria-hidden="true">${EMOTES[expr]}</span>` : '');
  function posed(who, kind, expr) {
    return `<div class="pose expr-${expr}">${portrait(who, { kind, expr })}${kind === 'chibi' || kind === 'counter' ? emote(expr) : ''}</div>`;
  }
  function playerExpr(look, expr) {
    const tries = [expr, ...(D.player.fallback[expr] || []), 'neutral'];
    return tries.find((e) => look.expressions.includes(e));
  }
  function playerPortrait(expr = 'neutral', look = playerLook()) {
    return `<img class="art art-player" src="${artSrc(look.id, `bust-${playerExpr(look, expr)}`)}" alt="" draggable="false">`;
  }
  function preload(id, files) { files.forEach((f) => { new Image().src = artSrc(id, f); }); }
  const whoName = (who) => person(who).name;

  /* ---------- Screens ---------- */
  function moodFor(name) {
    if (name === 'drink') return 'busy';
    if (name === 'cafe') return (G.shift && save.phase === 'shift') ? 'busy' : 'light';
    if (name === 'dialogue') {
      const d = G.dlg;
      if (d && d.sc.mood) return d.sc.mood;
      const id = (d && d.id) || '';
      if (/confession|ending/.test(id)) return 'romance';
      if (/rain|haunt|ghost/.test(id)) return 'mystery';
      if (/dream|hidden/.test(id)) return 'dream';
      const bg = d && d.sc.bg;
      return bg === 'cafe-night' || bg === 'dusk' || bg === 'stars' ? 'reflect' : 'light';
    }
    return name === 'title' ? 'light' : 'reflect';
  }

  function show(name) {
    if ((name === 'gallery' || name === 'shop') && G.screen !== 'gallery' && G.screen !== 'shop') G.returnTo = G.screen;
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    G.screen = name;
    document.body.dataset.screen = name;
    if (name !== 'gallery' && name !== 'shop') Sfx.music(moodFor(name));
    Sfx.ambience(name === 'cafe' || name === 'drink');
    placeToasts();
    const el = $('#screen-' + name);
    el.scrollTop = 0;
    const f = el.querySelector('[data-autofocus]') || el.querySelector('.btn-primary:not([disabled])');
    if (f) requestAnimationFrame(() => f.focus({ preventScroll: true }));
  }

  /* ---------- Café scene: your painted interior, counter and décor ---------- */
  function renderDecor() {
    $('#decor-back').innerHTML = (save ? save.decor : []).map((id) => decorById[id])
      .map((d) => `<img class="prop prop-${d.id}" src="assets/props/${d.art}.webp" alt="" draggable="false">`).join('');
  }

  /* ---------- Toasts & FX ---------- */
  function toast(html, kind = 'info') {
    const icon = kind === 'heart' ? S.icons.heart : kind === 'coin' ? S.icons.coin : kind === 'unlock' ? S.icons.star : S.icons.paw;
    const t = document.createElement('div');
    t.className = 'toast toast-' + kind;
    t.innerHTML = `<span class="toast-ico">${icon}</span><span>${html}</span>`;
    $('#toasts').appendChild(t);
    requestAnimationFrame(placeToasts);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  }

  /* In the café, toasts sit just above the panel. Its position changes with the panel's
   * height, so a ResizeObserver keeps a CSS variable current instead of measuring once. */
  function placeToasts() {
    const r = $('#cafe-panel').getBoundingClientRect();
    document.documentElement.style.setProperty('--toast-gap', Math.max(8, window.innerHeight - r.top + 8) + 'px');
  }
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(placeToasts);
    ro.observe($('#cafe-panel'));
    ro.observe($('#cafe-scene'));
  }
  window.addEventListener('resize', placeToasts);

  function floatFx(container, html, x, y, cls = '') {
    const el = document.createElement('div');
    el.className = 'float-fx ' + cls;
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.innerHTML = html;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  const fxImg = (name, cls = '') => `<img class="fx-spr ${cls}" src="assets/fx/${name}.webp" alt="" draggable="false">`;
  function burstHearts(container, n = 6, x = 50, y = 40) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => floatFx(container, fxImg('heart-' + (1 + (i % 3))), x + (Math.random() * 30 - 15), y + Math.random() * 10, 'fx-heart'), i * 90);
    }
  }
  function sparkleAt(container, x, y) {
    floatFx(container, fxImg('sparkle-3'), x, y, 'fx-sparkle');
    setTimeout(() => floatFx(container, fxImg('sparkle-2'), x + 10, y - 8, 'fx-sparkle'), 160);
  }

  /* Regulars you've served this shift stay on to sit and sip. */
  const SIT = { cleo: [2, 3] };
  function seatsHtml() {
    const sh = G.shift;
    if (!sh || !sh.seated || !sh.seated.length) return '';
    return sh.seated.slice(-2).map((id, i) => {
      const [a, b] = SIT[id] || [6, 7];
      return `<div class="seat seat-${i}"><img class="seat-img" data-a="${a}" data-b="${b}" data-id="${id}" src="assets/poses/${id}-${a}.webp" alt="" draggable="false"></div>`;
    }).join('');
  }
  /* The staff member helping today, at the machine. */
  function helperHtml(pose = 'idle') {
    const id = G.shift && G.shift.helper;
    if (!id) return '';
    return `<div class="helper helper-${pose}"><img class="helper-img" data-id="${id}" data-pose="${pose}" src="assets/work/${id}-${pose}-0.webp" alt="" draggable="false"></div>`;
  }
  let animTick = 0;
  setInterval(() => {
    animTick++;
    $$('.helper-img').forEach((el) => { el.src = `assets/work/${el.dataset.id}-${el.dataset.pose}-${animTick % 4}.webp`; });
    $$('.seat-img').forEach((el) => { el.src = `assets/poses/${el.dataset.id}-${animTick % 6 < 5 ? el.dataset.a : el.dataset.b}.webp`; });
  }, 520);

  /* ---------- HUD ---------- */
  function coinHtml(n) { return `${S.icons.coin}<span>${n}</span>`; }
  function renderHud() {
    $('#hud-day').textContent = `Day ${save.day}`;
    $('#hud-coins').innerHTML = coinHtml(save.coins);
    $('#hud-coins').setAttribute('aria-label', `${save.coins} coins`);
    const q = $('#hud-queue');
    if (G.shift && G.phase !== 'hub') {
      q.hidden = false;
      const i = Math.min(G.shift.index + 1, G.shift.customers.length), n = G.shift.customers.length;
      q.textContent = `Guest ${i}/${n}`;
      q.setAttribute('aria-label', `Customer ${i} of ${n}`);
    } else q.hidden = true;
  }

  /* ---------- Title ---------- */
  function renderTitle() {
    const cast = $('#title-cast');
    // only people you've met stand in front of the café; the rest stay a surprise
    cast.innerHTML = D.characters.filter((c) => isMet(c.id)).map((c, i) =>
      `<div class="title-sprite" style="--i:${i}">${portrait(c.id, { kind: 'chibi', expr: 'happy' })}</div>`).join('');
    cast.hidden = !cast.innerHTML;
    $('#btn-continue').disabled = !save;
    $('#btn-start').textContent = !save ? 'Start Day' : save.phase === 'evening' ? 'Continue Evening' : `Start Day ${save.day}`;
    $('#title-save').innerHTML = save
      ? `Saved: Day ${save.day} of ${D.economy.marketDay} · ${coinHtml(save.coins)} · ${Object.keys(save.met).length} of ${D.characters.length} met`
      : 'New café. Fresh beans. Thirty days until the Night Market.';
  }

  /* ---------- Story context (what scene conditions and text can ask) ---------- */
  function decorLine() {
    if (!save.decor.length) return 'The café looks the way Rosalie left it: pink seats, cozy shelves, and slightly dusty corners that nobody minds.';
    const names = save.decor.map((id) => decorById[id].name.toLowerCase());
    const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
    return `Your upgrades show: the ${list} make the café look like somewhere people planned to be.`;
  }
  function serviceLine() {
    const { served, perfect } = save.totals;
    return `You’ve served ${served} drinks this month, ${perfect} of them perfect. ` +
      (perfect * 2 >= served ? 'Guests keep mentioning how steady your hands are.' : 'Guests keep mentioning how warm the place feels, even when the foam isn’t perfect.');
  }
  function storyCtx() {
    return {
      day: save.day, met: isMet, aff, closest,
      decorCount: save.decor.length, usual: save.usual, last: save.lastShift,
      helper: save.lastShift && save.lastShift.helper,
      guestMet: (id) => !!(save.guests[id] && save.guests[id].met),
      guestBeat: (id) => (save.guests[id] && save.guests[id].beat) || 0,
      guestDone: (id) => guestDone(id) && guestState(id).met, guestsDone,
      flag: (f) => !!save.flags[f], waiting: () => routeChar('waiting'),
      decorLine, serviceLine,
    };
  }

  /* ---------- Calendar: morning, shift, evening ---------- */
  function pickMoment(at) {
    if (save.momentDay === save.day) return null;
    const ctx = storyCtx();
    return D.moments.find((m) => m.at === at && !save.seenMoments[m.id] && m.when(ctx)) || null;
  }
  function playMoment(m, onEnd) {
    save.seenMoments[m.id] = true;
    save.momentDay = save.day;
    persist();
    playScene(m.scene, onEnd);
  }

  /* The closed café before a shift: morning scenes first, then the hub. */
  function enterHub() {
    save.phase = 'hub';
    persist();
    G.phase = 'hub';
    G.shift = null;
    renderDecor();
    const next = () => { show('cafe'); renderCafe(); };
    const ev = D.events.find((e) => e.at === 'morning' && e.day === save.day && !save.seenEvents[e.id]);
    if (ev) {
      save.seenEvents[ev.id] = true;
      if (ev.meet) meet(ev.meet);
      persist();
      playScene(ev.scene, next);
      return;
    }
    const mo = pickMoment('morning');
    if (mo) { playMoment(mo, next); return; }
    next();
  }

  function enterEvening() {
    save.phase = 'evening';
    persist();
    G.phase = 'hub';
    const ev = D.events.find((e) => e.at === 'evening' && e.day === save.day && !save.seenEvents[e.id]);
    if (ev) {
      save.seenEvents[ev.id] = true;
      persist();
      if (ev.finale) playFinale(); else playScene(ev.scene, finishDay);
      return;
    }
    const mo = pickMoment('evening');
    if (mo) { playMoment(mo, showEveningPick); return; }
    showEveningPick();
  }

  function finishDay() {
    save.day += 1;
    persist();
    enterHub();
    toast(`Day ${save.day} begins. Rested, caffeinated, ready.`, 'info');
  }

  /* ---------- Café: shift flow ---------- */
  function buildShift() {
    const day = save.day, ctx = storyCtx();
    const rush = day === D.rush.day;
    const target = rush ? D.rush.count : 4 + Math.min(3, Math.floor((day - 1) / 3));
    const scripted = D.scripted.filter((s) => (s.day === day) || (s.when && s.when(ctx)));
    const used = new Set(scripted.map((s) => s.who));

    const makeCast = (id) => {
      const ch = charById[id];
      const drink = Math.random() < 0.7 ? ch.favorite : pick(menu()).id;
      return { who: id, drink, side: id === 'riven' && drink === ch.favorite ? ch.side : null };
    };
    const makeGuest = (id) => {
      const g = guestById[id], b = guestDue(g);
      const drink = (b && b.drink) || (Math.random() < 0.8 ? g.favorite : pick(menu()).id);
      return { who: id, guest: true, drink, beat: b };
    };

    const castPool = D.characters.filter((c) => isMet(c.id) && !used.has(c.id)).map((c) => c.id);
    const guestsAvail = D.guests.filter((g) => g.from <= day && !used.has(g.id));
    const pool = [];
    shuffle(guestsAvail.filter(guestDue)).slice(0, 2).forEach((g) => pool.push(g.id));
    shuffle(castPool.slice()).forEach((id) => { if (Math.random() < 0.75) pool.push(id); });
    if (!pool.some(isCast) && castPool.length) pool.push(pick(castPool));
    shuffle(guestsAvail.filter((g) => !pool.includes(g.id))).forEach((g) => pool.push(g.id));
    shuffle(castPool.filter((id) => !pool.includes(id))).forEach((id) => pool.push(id));

    const slots = Math.max(0, target - scripted.length);
    const list = shuffle(pool.slice(0, slots).map((id) => (isCast(id) ? makeCast(id) : makeGuest(id))));

    scripted.slice().sort((a, b) => a.slot - b.slot).forEach((s) => {
      const base = isCast(s.who) ? makeCast(s.who) : makeGuest(s.who);
      const c = Object.assign(base, { drink: s.drink || base.drink }, {
        intro: s.intro, outro: s.outro, orderLine: s.orderLine, firstVisit: s.firstVisit,
      });
      if (s.beat !== undefined && guestById[s.who]) c.beat = guestById[s.who].beats[s.beat];
      if (c.who === 'riven' && c.drink === charById.riven.favorite) c.side = charById.riven.side;
      list.splice(Math.min(s.slot, list.length), 0, c);
    });
    return list.map((c) => Object.assign(c, { patience: 1 }));
  }

  /* Staff effects chosen in the morning (unlocked after day 15's rush). */
  const helperTask = () => (G.shift && G.shift.helper ? D.staffTasks[G.shift.helper] : null);
  const perfectFrom = () => (helperTask() && helperTask().perfectFrom) || 0.82;
  const drainFactor = () => {
    let f = 1;
    if (G.shift) {
      if (G.shift.rush) f *= D.rush.patience;
      if (G.shift.assist) f *= 0.75;
      if (helperTask() && helperTask().patience) f *= helperTask().patience;
    }
    return f;
  };

  function beginShift() {
    save.phase = 'shift';
    persist();
    G.shift = {
      customers: buildShift(), index: 0, sales: 0, tips: 0, sat: [], perfect: 0, correct: 0, imperfect: 0, affGain: {},
      rush: save.day === D.rush.day, helper: save.flags.staff_tasks && save.helper && isMet(save.helper) ? save.helper : null,
    };
    G.shift.customers.forEach((c) => {
      preload(c.who, isCast(c.who) ? D.expressions.map((e) => `bust-${e}`) : person(c.who).expressions.map((e) => `bust-${e}`));
    });
    renderDecor();
    show('cafe');
    nextCustomer(true);
  }

  const current = () => (G.shift ? G.shift.customers[G.shift.index] : null);

  function nextCustomer(first) {
    const go = () => {
      G.advancing = false;
      if (G.shift.index >= G.shift.customers.length) { endShift(); return; }
      G.phase = 'arrive';
      Sfx.file('bell', 0.5);
      const c = current();
      c.patience = 1;
      renderCafe('walk-in');
      Sfx.play('tap');
      if (c.intro && !c.introDone) {
        setTimeout(() => { if (current() === c && G.phase === 'arrive' && !c.introDone) playIntro(c); }, 800);
      }
    };
    if (first) go();
    else {
      const el = $('.cust');
      $('#cafe-bubble').hidden = true;
      if (el && !settings.reduceMotion) {
        el.classList.add('walk-out');
        setTimeout(go, 420);
      } else go();
    }
  }

  /* A customer's own scene plays as they arrive and ends with their order. */
  function playIntro(c) {
    c.introDone = true;
    if (isCast(c.who) && !isMet(c.who)) meet(c.who);
    playScene(c.intro, () => { G.phase = 'ordered'; show('cafe'); renderCafe(); });
  }

  function advanceCustomer(fromScene) {
    if (G.advancing && fromScene !== true) return;   // ignore a second tap while the next customer walks in
    G.advancing = true;
    const c = current();
    if (c.outro && !c.outroDone) {
      c.outroDone = true;
      playScene(c.outro, () => { show('cafe'); advanceCustomer(true); });
      return;
    }
    G.shift.index++;
    const sh = G.shift;
    if (sh.rush && !sh.rushDone && sh.index === D.rush.after + 1 && sh.index < sh.customers.length) {
      sh.rushDone = true;
      playScene(D.rush.scene, () => { sh.assist = true; show('cafe'); nextCustomer(true); });
      return;
    }
    nextCustomer(false);
  }

  function greetLine(c) {
    if (c.guest) return c.beat ? c.beat.text : pick(guestById[c.who].idle);
    const ch = charById[c.who];
    return c.firstVisit && ch.lines.meet ? ch.lines.meet : pick(ch.lines.greet);
  }
  function orderLine(c) {
    if (c.orderLine) return fill(c.orderLine);
    let tpl;
    if (c.guest) {
      const g = guestById[c.who];
      tpl = guestDone(c.who) && g.orderDone ? g.orderDone : (c.beat && c.beat.order) || g.order;
    } else {
      const ch = charById[c.who];
      if (c.drink === ch.favorite) tpl = c.who === 'riven' && aff('riven') >= 45 ? ch.lines.favOrderClose : ch.lines.favOrder;
      else tpl = ch.lines.order;
    }
    return fill(drinkTokens(tpl, c.drink));
  }
  function reactLine(c, ok) {
    if (c.guest) return pick(D.guestLines[ok ? 'happy' : 'wrong']);
    const ch = charById[c.who];
    const fav = c.drink === ch.favorite && ch.lines[ok ? 'favHappy' : 'favWrong'];
    return pick(fav || ch.lines[ok ? 'happy' : 'wrong']);
  }

  function renderCafe(anim) {
    renderHud();
    const cust = $('#cafe-customers');
    const bubble = $('#cafe-bubble');
    const panel = $('#cafe-panel');
    const c = current();

    $('#screen-cafe').classList.toggle('is-hub', G.phase === 'hub' || !c);
    if (G.phase === 'hub' || !c) {
      const idle = isMet('milo') ? `<div class="cust idle"><div class="cust-sprite">${posed('milo', 'counter', 'happy')}</div></div>` : '';
      cust.innerHTML = staffHtml() + idle;
      bubble.hidden = true;
      panel.innerHTML = hubHtml();
      return;
    }

    const recipe = recipeById[c.drink];
    const expr = G.phase === 'served' ? c.reaction : isCast(c.who) && !isMet(c.who) ? 'blush' : 'neutral';
    const cheer = G.phase === 'served' && anim === 'react' ? (c.result.correct ? 'cheer' : 'oops') : '';
    cust.innerHTML = seatsHtml() + helperHtml(G.phase === 'served' && anim === 'react' ? 'serve' : G.phase === 'ordered' ? 'note' : 'idle') + staffHtml(cheer) + `<div class="cust ${anim || ''}"><div class="cust-sprite">${posed(c.who, 'counter', expr)}</div></div>`;

    let line;
    if (G.phase === 'arrive') line = c.intro && !c.introDone ? '' : (c.greetLine || (c.greetLine = fill(greetLine(c))));
    else if (G.phase === 'ordered') line = c.orderText || (c.orderText = orderLine(c));
    else line = c.reactText;
    bubble.hidden = !line;
    bubble.innerHTML = `<b>${esc(whoName(c.who))}</b>${esc(line || '')}`;
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');

    const tierTag = !isCast(c.who) ? '<span class="tag">Regular</span>'
      : isMet(c.who) ? `<span class="tag tag-heart">${S.icons.heart}${tierOf(aff(c.who)).name}</span>` : '<span class="tag tag-new">New face</span>';
    const patience = `<div class="patience" role="img" aria-label="Patience"><span class="patience-fill"></span></div>`;
    const rushTag = G.shift && G.shift.rush ? '<span class="tag tag-rush">Rush hour</span>' : '';

    if (G.phase === 'arrive') {
      const waiting = c.intro && !c.introDone;
      panel.innerHTML = `
        <div class="panel-head"><h2>${esc(whoName(c.who))}</h2><span class="tags">${rushTag}${tierTag}</span></div>
        ${patience}
        <p class="panel-text">${waiting ? 'Someone is approaching the counter…' : 'A customer is waiting at the counter.'}</p>
        <button class="btn btn-primary btn-lg btn-block" data-action="take-order" ${waiting ? 'disabled' : ''}>Take Order</button>`;
    } else if (G.phase === 'ordered') {
      panel.innerHTML = `
        <div class="panel-head"><h2>${esc(whoName(c.who))}</h2><span class="tags">${rushTag}${tierTag}</span></div>
        ${patience}
        ${ticketHtml(c, true)}
        <button class="btn btn-primary btn-lg btn-block" data-action="make-drink">Make Drink</button>`;
    } else {
      const r = c.result;
      const last = G.shift.index >= G.shift.customers.length - 1;
      panel.innerHTML = `
        <div class="result ${r.correct ? 'ok' : 'bad'}">
          <div class="result-badge">${r.correct ? '✓' : '✗'}</div>
          <div class="result-body">
            <h2>${r.correct ? (r.pour === 'perfect' ? 'Perfect order!' : 'Order correct!') : 'Not quite right'}</h2>
            <p>${r.correct ? esc(pourText(r.pour)) : 'Expected ' + r.wrong.map((k) => `<b>${esc(ingName(k, recipe[k]))}</b> (you used ${esc(ingName(k, r.sel[k]))})`).join(', ')}</p>
          </div>
        </div>
        <div class="chips">
          <span class="chip">${S.icons.coin}+${r.coins} sale</span>
          <span class="chip">${S.icons.coin}+${r.tip} tip</span>
          ${isCast(c.who) ? `<span class="chip ${r.aff < 0 ? 'chip-down' : 'chip-heart'}">${S.icons.heart}${r.aff >= 0 ? '+' : ''}${r.aff}</span>` : ''}
        </div>
        <button class="btn btn-primary btn-lg btn-block" data-action="next-customer">${last ? 'Close Up for the Day' : 'Next Customer'}</button>`;
    }
    updatePatience();
  }

  /* The closed café: countdown, hints and (after day 15) who's helping today. */
  function hubHtml() {
    const left = D.economy.marketDay - save.day;
    const status = save.finished
      ? 'The Night Market came and went, and the café is as busy as ever.'
      : left > 0 ? `${left} ${left === 1 ? 'day' : 'days'} until the Bellflower Night Market.` : 'The Bellflower Night Market is tonight.';
    const hints = [];
    const cheapest = D.decor.filter((d) => !save.decor.includes(d.id)).sort((a, b) => a.price - b.price)[0];
    if (cheapest) hints.push(save.coins >= cheapest.price ? `You can afford the ${cheapest.name}. Visit Upgrades!` : `Next décor: ${cheapest.name} for ${cheapest.price} coins.`);
    let staff = '';
    if (save.flags.staff_tasks) {
      const options = D.characters.filter((c) => isMet(c.id));
      const cur = save.helper && isMet(save.helper) ? save.helper : null;
      staff = `<div class="staff-pick" role="group" aria-label="Who is helping today">
        <p class="staff-title">Who’s helping today?</p>
        <div class="staff-opts">
          ${options.map((c) => `<button class="staff-btn ${cur === c.id ? 'on' : ''}" data-action="set-helper" data-id="${c.id}" aria-pressed="${cur === c.id}">
            <span class="staff-face">${portrait(c.id)}</span><span class="staff-name">${c.name}</span><span class="staff-task">${D.staffTasks[c.id].task}</span></button>`).join('')}
        </div>
        <p class="staff-desc">${cur ? esc(D.staffTasks[cur].desc) : 'Pick someone for a bonus today, or work the shift on your own.'}</p>
      </div>`;
    }
    return `
      <div class="panel-head"><h2>The Velvet Paw</h2><span class="tag">Closed</span></div>
      <p class="panel-text">${esc(status)} ${isMet('milo') ? 'Milo is wiping down the counter.' : ''}</p>
      ${staff}
      <button class="btn btn-primary btn-lg btn-block" data-action="open-cafe">Open Café · Day ${save.day}</button>
      ${staff ? '' : hints.map((h) => `<p class="hint">${h}</p>`).join('')}`;
  }

  /* You, at the espresso machine. */
  function staffHtml(mood = '') {
    if (!save || !save.player) return '';
    return `<div class="staff ${mood}"><img class="art" src="${artSrc(playerLook().id, 'turn-0')}" alt="" draggable="false"></div>`;
  }

  function ticketHtml(c, showBlurb) {
    const recipe = recipeById[c.drink];
    return `<div class="order-card">
      <div class="order-cup">${artImg(recipe.art)}</div>
      <div class="order-info">
        <div class="order-name">${esc(recipeName(recipe.id))} <span class="order-price">${S.icons.coin}${recipe.price}</span></div>
        ${c.side ? `<div class="order-side">+ ${esc(c.side.name)} <span>${S.icons.coin}${c.side.price}</span></div>` : ''}
        ${showBlurb ? `<p class="order-blurb">${esc(recipe.blurb)}</p>` : ''}
        <ul class="recipe-list">${RECIPE_KEYS.map((k) => `<li data-k="${k}">${esc(ingName(k, recipe[k]))}</li>`).join('')}</ul>
      </div></div>`;
  }

  function pourText(p) {
    return { perfect: 'A perfect pour, right in the pink band.', good: 'A nice pour. A little more precision earns bigger tips.', light: 'The cup looked a bit empty.', spill: 'A little spilled over the rim.' }[p];
  }

  function updatePatience() {
    const c = current();
    if (!c) return;
    $$('.patience-fill').forEach((el) => {
      el.style.width = (c.patience * 100).toFixed(1) + '%';
      el.parentElement.classList.toggle('low', c.patience < 0.3);
    });
  }

  function takeOrder() {
    G.phase = 'ordered';
    Sfx.play('select');
    renderCafe();
  }

  /* ---------- Drink making ---------- */
  function openDrink() {
    G.drink = { sel: {}, step: 0, level: 0, pouring: false, pouredOnce: false };
    Sfx.play('tap');
    show('drink');
    renderDrink();
  }

  function renderDrink() {
    const c = current();
    const recipe = recipeById[c.drink];
    const d = G.drink;
    const stepId = D.steps[d.step].id;
    $('#drink-ticket').innerHTML = `
      <div class="ticket-who"><div class="mini-head">${portrait(c.who)}</div>
        <div><div class="ticket-label">Order for ${esc(whoName(c.who))}</div><div class="ticket-drink">${esc(recipeName(recipe.id))}</div>${c.side ? `<div class="ticket-side">+ ${esc(c.side.name)}</div>` : ''}</div></div>
      <ul class="recipe-list recipe-inline">${RECIPE_KEYS.map((k) => `<li class="${k === stepId ? 'now' : ''}">${esc(ingName(k, recipe[k]))}</li>`).join('')}</ul>
      <div class="patience" role="img" aria-label="Patience"><span class="patience-fill"></span></div>`;
    updatePatience();

    $('#drink-steps').innerHTML = D.steps.map((s, i) => {
      const done = s.id === 'pour' ? d.pouredOnce : d.sel[s.id] !== undefined;
      const val = s.id === 'pour' ? (d.pouredOnce ? Math.round(d.level * 100) + '%' : '') : d.sel[s.id] ? ingName(s.id, d.sel[s.id]) : '';
      const reachable = i <= firstOpenStep();
      return `<li><button class="step ${i === d.step ? 'current' : ''} ${done ? 'done' : ''}" data-action="goto-step" data-step="${i}" ${reachable ? '' : 'disabled'} aria-current="${i === d.step ? 'step' : 'false'}">
        <span class="step-n">${i + 1}</span><span class="step-l">${s.label}</span>${val ? `<span class="step-v">${esc(val)}</span>` : ''}</button></li>`;
    }).join('');

    renderCup();

    const opts = $('#drink-options');
    const gauge = $('#pour-gauge');
    gauge.classList.toggle('active', stepId === 'pour');
    gauge.style.setProperty('--zlo', (perfectFrom() / 1.15 * 100).toFixed(1) + '%');
    gauge.style.setProperty('--zh', ((1 - perfectFrom()) / 1.15 * 100).toFixed(1) + '%');
    if (stepId === 'pour') {
      const ready = RECIPE_KEYS.every((k) => d.sel[k] !== undefined);
      opts.innerHTML = `
        <p class="pour-hint" id="pour-hint">${d.pouredOnce ? esc(pourLabel(d.level)) : 'Hold the button and release inside the pink band.'}</p>
        <button class="btn btn-hold btn-lg btn-block" id="hold-pour" ${ready ? '' : 'disabled'} aria-describedby="pour-hint">Hold to Pour <kbd>Space</kbd></button>
        <div class="row">
          <button class="btn btn-soft" data-action="restart-drink">Start Over</button>
          <button class="btn btn-primary" data-action="serve" id="btn-serve" ${d.level >= 0.3 && ready ? '' : 'disabled'}>Serve ♥</button>
        </div>`;
      bindHold($('#hold-pour'));
    } else {
      const list = D.ingredients[stepId];
      opts.innerHTML = `<p class="opt-title">Choose ${stepId === 'cup' ? 'a cup' : stepId === 'base' ? 'a base' : 'the ' + stepId}</p>
        <div class="opt-grid">${list.map((o, i) => `
          <button class="opt ${d.sel[stepId] === o.id ? 'picked' : ''}" data-action="pick" data-id="${o.id}" aria-pressed="${d.sel[stepId] === o.id}">
            <span class="opt-art">${artImg(o.art)}</span>
            <span class="opt-name">${esc(o.name)}</span><kbd class="opt-key">${i + 1}</kbd>
          </button>`).join('')}</div>`;
    }
  }

  function firstOpenStep() {
    const i = RECIPE_KEYS.findIndex((k) => G.drink.sel[k] === undefined);
    return i === -1 ? 5 : i;
  }

  /* Your cups, with the drink rising inside. Bowl-shaped cups (mug, teacup) fill the
   * ellipse of their opening; the glass fills its inner rectangle in layers. Geometry is
   * in percent of the cup image. */
  /* The cup fills through your staged drink art: empty, three stages, finished. */
  const ingr = (step, id) => D.ingredients[step].find((i) => i.id === id);
  function stageSet(sel) {
    if (sel.cup === 'glass') return sel.base === 'matcha' ? 'a-glass-berry' : 'a-glass-iced';
    if (sel.cup === 'teacup') return 'a-tea-lavender';
    return sel.base === 'matcha' ? 'a-mug-matcha' : 'a-mug-latte';
  }
  const streamFor = (set, sel) => (set === 'a-glass-berry' ? 'stream-berry' : set === 'a-glass-iced' ? 'stream-coffee'
    : set === 'a-mug-latte' ? 'stream-coffee' : 'stream-milk');
  function stageFrame(level) {
    const pf = perfectFrom();
    if (level >= pf) return 4;
    if (level >= pf * 0.7) return 3;
    if (level >= pf * 0.35) return 2;
    return level >= 0.06 ? 1 : 0;
  }
  const stepImg = (name, cls) => {
    const dim = (window.ART_DIMS || {})[name];
    const w = dim ? `style="width:${Math.round(dim[0] / 1.7)}px"` : '';
    return `<img class="${cls}" ${w} src="${assetSrc('steps/' + name)}" alt="" draggable="false">`;
  };
  function renderCup() {
    const d = G.drink;
    const stage = $('#cup-stage');
    const cup = D.ingredients.cup.find((x) => x.id === d.sel.cup);
    if (!cup) { stage.innerHTML = '<p class="cup-hint">Pick a cup to start</p>'; $('#mise').innerHTML = ''; return; }
    const set = stageSet(d.sel);
    const frame = d.sel.base ? stageFrame(d.level) : 0;
    const spill = d.level > 1.0;
    const stream = streamFor(set, d.sel);
    const sf = 1 + (Math.floor(performance.now() / 110) % 3);
    stage.innerHTML = `<div class="cup-wrap cup-${cup.id}">
        ${stepImg(`${set}-${frame}`, 'cup-img')}
        ${d.pouring && !spill ? `<div class="pitcher" aria-hidden="true">${artImg('items/tool-pitcher')}</div>
          <img class="pour-stream" src="${assetSrc(`fx/${stream}-${sf}`)}" alt="" draggable="false">` : ''}
        ${spill ? `<img class="spill-fx" src="${assetSrc('fx/splash-' + (set.includes('matcha') || set.includes('berry') ? 'milk' : 'coffee') + '-3')}" alt="" draggable="false">` : ''}
      </div>`;
    // what you've added so far, laid out beside the cup
    $('#mise').innerHTML = ['base', 'milk', 'syrup', 'topping']
      .map((k) => ingr(k, d.sel[k])).filter((i) => i && i.id !== 'none').map((i) => artImg(i.art, 'mise-item')).join('');
    $('#gauge-fill').style.height = clamp(d.level / 1.15, 0, 1) * 100 + '%';
  }

  function pickOption(id) {
    const d = G.drink;
    const stepId = D.steps[d.step].id;
    d.sel[stepId] = id;
    if (stepId === 'base' && d.level > 0) d.level = 0;
    Sfx.play('select');
    d.step = Math.min(firstOpenStep(), 5);
    renderDrink();
    const stage = $('#cup-stage');
    stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump');
    const focusTarget = $('#drink-options .opt') || $('#hold-pour');
    if (focusTarget && document.activeElement && document.activeElement.closest('#drink-options, #drink-steps')) focusTarget.focus({ preventScroll: true });
  }

  function pourLabel(l) {
    if (l > 1.0) return 'Oops, it spilled over! Serve anyway or start over.';
    if (l >= perfectFrom()) return 'Perfect pour! Serve it while it\'s pretty.';
    if (l >= 0.6) return 'Nice pour. A touch more reaches the pink band.';
    if (l >= 0.3) return 'Keep going, it\'s looking a bit light.';
    return 'Hold to pour a little more.';
  }
  const pourGrade = (l) => (l > 1.0 ? 'spill' : l >= perfectFrom() ? 'perfect' : l >= 0.6 ? 'good' : 'light');

  function bindHold(btn) {
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } startPour(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, stopPour));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function startPour() {
    const d = G.drink;
    if (!d || d.pouring || D.steps[d.step].id !== 'pour') return;
    if (!RECIPE_KEYS.every((k) => d.sel[k] !== undefined)) return;
    d.pouring = true;
    Sfx.hold(d.sel.base === 'matcha' ? 'whisk' : d.sel.base === 'espresso' ? 'pour-coffee' : 'pour-milk');
    const b = $('#hold-pour'); if (b) b.classList.add('holding');
  }
  function stopPour() {
    const d = G.drink;
    if (!d || !d.pouring) return;
    d.pouring = false;
    Sfx.release();
    d.pouredOnce = true;
    const b = $('#hold-pour'); if (b) b.classList.remove('holding');
    const h = $('#pour-hint'); if (h) h.textContent = pourLabel(d.level);
    const s = $('#btn-serve'); if (s) s.disabled = d.level < 0.3;
    renderCup();
    if (pourGrade(d.level) === 'perfect') Sfx.play('select');
    const stepVal = $$('#drink-steps .step')[5];
    if (stepVal) { stepVal.classList.add('done'); }
  }

  /* A guest's story beat counts once you've served them; finishing it can pay off. */
  function advanceGuest(c) {
    const g = guestById[c.who], st = guestState(c.who);
    const first = !st.met;
    st.met = true;
    if (first) { toast(`New regular: <b>${g.name}</b>`, 'unlock'); Sfx.play('unlock'); }
    if (c.beat && g.beats[st.beat] === c.beat) {
      st.beat += 1;
      if (st.beat >= g.beats.length) {
        if (g.reward === 'tips') save.flags.reward_tips = true;
        if (g.reward === 'chairs' && !save.decor.includes('chairs')) save.decor.push('chairs');
        setTimeout(() => toast(`${g.name}’s story is complete.${g.reward === 'tips' ? ' Tips +5%.' : g.reward === 'chairs' ? ' The Pastel Chairs are yours again.' : ''}`, 'heart'), 700);
      }
    }
  }

  function serve() {
    const d = G.drink, c = current();
    if (!d || d.level < 0.3) return;
    const recipe = recipeById[c.drink];
    const wrong = RECIPE_KEYS.filter((k) => d.sel[k] !== recipe[k]);
    const correct = wrong.length === 0;
    const pour = pourGrade(d.level);
    const pat = c.patience;
    const task = helperTask();
    let coins = correct ? recipe.price : Math.round(recipe.price * 0.5);
    if (task && task.perOrder) coins += task.perOrder;
    if (correct && c.side) coins += c.side.price;
    let tip = 0;
    if (correct) {
      tip = 2 + 6 * pat + (pour === 'perfect' ? 3 : 0) - (pour === 'spill' ? 2 : 0) - (pour === 'light' ? 1 : 0);
      const bonus = 1 + decorBonus() + (save.flags.reward_tips ? 0.05 : 0) + (task && task.tips ? task.tips : 0);
      tip = Math.max(0, Math.round(tip * bonus));
    }
    const sat = correct ? clamp(0.6 + 0.25 * pat + (pour === 'perfect' ? 0.15 : pour === 'good' ? 0.08 : 0), 0, 1) : 0.25 + 0.15 * ((5 - wrong.length) / 5);
    let affDelta = 0;
    if (isCast(c.who)) {
      if (!isMet(c.who)) meet(c.who);
      const raw = correct ? 3 + (pour === 'perfect' ? 1 : 0) + (c.drink === charById[c.who].favorite ? 1 : 0) : -1;
      affDelta = addAffection(c.who, raw);
      G.shift.affGain[c.who] = (G.shift.affGain[c.who] || 0) + affDelta;
    } else advanceGuest(c);
    save.coins += coins + tip;
    G.shift.sales += coins; G.shift.tips += tip; G.shift.sat.push(sat);
    if (correct) G.shift.correct++;
    if (correct && pour === 'perfect') G.shift.perfect++;
    if (!correct || pour === 'spill' || pour === 'light') G.shift.imperfect++;
    c.result = { correct, wrong, pour, coins, tip, aff: affDelta, sel: Object.assign({}, d.sel), level: d.level };
    const fav = person(c.who).favorite;
    c.reaction = correct ? (isCast(c.who) && pour !== 'perfect' && c.drink === fav ? (c.who === 'riven' ? 'smirk' : 'blush') : 'happy') : 'sad';
    c.reactText = fill(reactLine(c, correct));
    G.phase = 'served';
    if (c.guest) { const sh = G.shift; sh.seated = (sh.seated || []).filter((x) => x !== c.who).concat(c.who); }
    G.drink = null;
    persist();

    show('cafe');
    renderCafe('react');
    const fx = $('#cafe-fx');
    const cupEl = document.createElement('div');
    cupEl.className = 'served-cup';
    // a correct order is the finished drink; a wrong one is just the cup you made
    const cupArt = correct ? recipe.art : (D.ingredients.cup.find((x) => x.id === c.result.sel.cup) || {}).art;
    cupEl.innerHTML = artImg(cupArt) + (correct ? fxImg('steam-2', 'steam') : '');
    fx.appendChild(cupEl);
    setTimeout(() => cupEl.remove(), 2600);
    if (correct) {
      Sfx.play('coin');
      floatFx(fx, `${fxImg('coin-0', 'coin-spin')}+${coins + tip}`, 50, 30, 'fx-coin');
      if (c.result.pour === 'perfect') sparkleAt(fx, 50, 40);
      if (affDelta > 0) { setTimeout(() => Sfx.play('heart'), 250); burstHearts(fx, 5, 50, 22); }
    } else {
      Sfx.play('wrong');
      floatFx(fx, `${S.icons.coin}+${coins}`, 50, 30, 'fx-coin');
    }
  }

  function endShift() {
    const sh = G.shift;
    const satAvg = sh.sat.reduce((a, b) => a + b, 0) / Math.max(1, sh.sat.length);
    const stars = clamp(Math.round(satAvg * 5), 1, 5);
    save.totals.served += sh.customers.length;
    save.totals.perfect += sh.perfect;
    save.totals.earned += sh.sales + sh.tips;
    save.lastShift = {
      day: save.day, served: sh.customers.length, allCorrect: sh.correct === sh.customers.length,
      imperfect: sh.imperfect > 0, helper: sh.helper,
    };
    save.phase = 'evening';
    persist();
    G.phase = 'hub';
    G.lastSummary = { satAvg, stars, sh };
    renderResults();
    show('results');
  }

  function renderResults() {
    const { satAvg, stars, sh } = G.lastSummary;
    const affRows = Object.entries(sh.affGain).map(([id, g]) => {
      const a = aff(id);
      return `<li class="aff-row">
        <div class="mini-head">${portrait(id)}</div>
        <div class="aff-main"><div class="aff-top"><b>${charById[id].name}</b><span class="${g >= 0 ? 'up' : 'down'}">${g >= 0 ? '+' : ''}${g} ♥</span></div>
        <div class="meter"><span style="--to:${a}%"></span></div><div class="aff-tier">${tierOf(a).name} · ${a}/100</div></div></li>`;
    }).join('');
    $('#results-card').innerHTML = `
      <p class="eyebrow">Day ${save.day} complete${sh.rush ? ' · Rush hour' : ''}</p>
      <h2 id="results-heading">Closing Time</h2>
      <div class="stars" aria-label="${stars} out of 5 stars">${[1, 2, 3, 4, 5].map((i) => `<span class="star" style="--i:${i}">${i <= stars ? S.icons.star : S.icons.starEmpty}</span>`).join('')}</div>
      <p class="sat">Customer satisfaction <b>${Math.round(satAvg * 100)}%</b></p>
      <dl class="stats">
        <div><dt>Orders served</dt><dd>${sh.customers.length} <small>(${sh.correct} correct)</small></dd></div>
        <div><dt>Perfect pours</dt><dd>${sh.perfect}</dd></div>
        <div><dt>Sales</dt><dd>${coinHtml(`<span data-count="${sh.sales}">0</span>`)}</dd></div>
        <div><dt>Tips${decorBonus() ? ` <small>(décor +${Math.round(decorBonus() * 100)}%)</small>` : ''}</dt><dd>${coinHtml(`<span data-count="${sh.tips}">0</span>`)}</dd></div>
        <div class="total"><dt>Earned today</dt><dd>${coinHtml(`<span data-count="${sh.sales + sh.tips}">0</span>`)}</dd></div>
        <div><dt>Coins in the register</dt><dd>${coinHtml(save.coins)}</dd></div>
      </dl>
      ${affRows ? `<h3>Affection</h3><ul class="aff-list">${affRows}</ul>` : ''}
      <button class="btn btn-primary btn-lg btn-block" data-action="results-continue">Continue to Evening</button>`;
    countUp($('#results-card'));
  }

  function countUp(root) {
    $$('[data-count]', root).forEach((el) => {
      const to = +el.dataset.count;
      if (settings.reduceMotion) { el.textContent = to; return; }
      const t0 = performance.now();
      const step = (t) => {
        const p = clamp((t - t0) / 900, 0, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Evening ---------- */
  function nextSceneFor(id) {
    const route = D.routes[id] || [];
    const seen = save.scenesSeen[id] || 0;
    const r = route[seen];
    if (r && aff(id) >= r.min && save.day >= (r.day || 0)) return { scene: r.scene, isNew: true };
    const chats = D.chats[id];
    return { scene: chats[(save.chats[id] || 0) % chats.length], isNew: false, lockedAt: r ? r.min : null, lockedDay: r && r.day > save.day ? r.day : null };
  }

  function showEveningPick() {
    save.phase = 'evening';
    persist();
    const met = D.characters.filter((c) => isMet(c.id));
    $('#evening-inner').innerHTML = `
      <p class="eyebrow">Day ${save.day} · After hours</p>
      <h2 id="evening-heading">Who will you spend the evening with?</h2>
      <p class="sheet-note">The lamps are low and the chairs are stacked. Someone is still hanging around.</p>
      <div class="evening-list">${met.map((c) => {
        const n = nextSceneFor(c.id);
        const a = aff(c.id);
        const note = n.isNew ? `<span class="tag tag-new">New story</span> ${esc(D.scenes[n.scene].title)}`
          : `Casual chat${n.lockedDay ? ` · next story on day ${n.lockedDay}` : n.lockedAt != null ? ` · next story at ♥${n.lockedAt}` : ''}`;
        return `<article class="eve-card" style="--accent:${c.color}">
          <div class="eve-portrait">${portrait(c.id)}</div>
          <div class="eve-info">
            <h3>${c.name} <small>${c.age}</small></h3>
            <div class="meter meter-sm"><span style="--to:${a}%"></span></div>
            <p class="eve-tier">${S.icons.heart} ${tierOf(a).name} · ${a}/100</p>
            <p class="eve-scene">${note}</p>
            <button class="btn ${n.isNew ? 'btn-primary' : ''} btn-block" data-action="evening-pick" data-id="${c.id}">Spend time with ${c.name}</button>
          </div></article>`;
      }).join('')}</div>
      <button class="btn btn-soft btn-block" data-action="evening-skip">Head home early</button>`;
    show('evening');
  }

  /* ---------- The Night Market finale ---------- */
  function playFinale() {
    playScene('night_market', () => {
      const c = closest();
      if (c && aff(c) >= D.economy.confessAt) playScene(c + '_confession', endingScene);
      else endingScene();
    });
  }
  function endingScene() {
    const r = save.route;
    const id = r && r.type === 'dating' ? 'ending_' + r.char : 'ending_friends';
    playScene(id, finishGame);
  }
  function finishGame() {
    save.finished = true;
    save.day += 1;
    save.phase = 'hub';
    persist();
    const c = closest(), r = save.route;
    const line = r && r.type === 'dating' ? `You and ${charById[r.char].name} are writing a new chapter of the café together.`
      : r && r.type === 'waiting' ? `${charById[r.char].name} is waiting on your answer, and in no hurry.`
      : 'The café has become the place everyone wants to come back to.';
    // show the café under the end card; the next morning's scenes wait until you've closed it
    G.phase = 'hub'; G.shift = null;
    renderDecor();
    show('cafe'); renderCafe();
    openModal(`
      <p class="eyebrow">Thirty days on Bellflower Lane</p>
      <h2 id="modal-title">The End</h2>
      <p>${esc(line)}</p>
      <dl class="detail-dl">
        <div><dt>Drinks served</dt><dd>${save.totals.served} (${save.totals.perfect} perfect)</dd></div>
        <div><dt>Closest friend</dt><dd>${c ? esc(charById[c].name) + ' · ' + tierOf(aff(c)).name : '—'}</dd></div>
        <div><dt>Regulars with a finished story</dt><dd>${guestsDone()} of ${D.guests.length}</dd></div>
      </dl>
      <p class="set-help">“Make somewhere people want to come back to.” Same time tomorrow?</p>
      <div class="row">
        <button class="btn btn-soft" data-action="go-title-modal">Title Screen</button>
        <button class="btn btn-primary" data-action="close-modal">Keep the café open</button>
      </div>`);
  }

  /* ---------- Dialogue ---------- */
  const TEXT_SPEED = { slow: 42, normal: 22, instant: 0 };
  /* Painted backgrounds for the story; other settings (dusk, stars) are gradients. */
  const SCENE_ART = { 'cafe-day': 'interior-day', 'cafe-night': 'interior-night', morning: 'storefront' };

  function setSceneBg(bg) {
    $('#dlg-bg').className = 'dlg-bg bg-' + bg;
    const img = $('#dlg-img');
    img.hidden = !SCENE_ART[bg];
    if (SCENE_ART[bg]) img.src = `assets/scenes/${SCENE_ART[bg]}.webp`;
  }

  function playScene(id, onEnd) {
    const sc = D.scenes[id];
    G.dlg = { id, sc, node: null, onEnd, typing: false, timer: null, focus: null, expr: null, full: '', opts: [], meterChar: isCast(sc.char) ? sc.char : null };
    setSceneBg(sc.bg);
    $('#dlg-portrait').innerHTML = '';
    $('#dlg-face').hidden = true;
    show('dialogue');
    renderMeter();
    goNode('start');
    $('#dlg-box').focus({ preventScroll: true });
  }

  function renderMeter(pulse) {
    const m = $('#dlg-meter');
    const id = G.dlg && G.dlg.meterChar;
    m.hidden = !id;
    if (!id) return;
    const ch = charById[id];
    const a = aff(id);
    const nt = nextTier(a);
    m.innerHTML = `${S.icons.heart}<div class="dm-main"><div class="dm-top"><b>${ch.name}</b><span>${tierOf(a).name}</span></div>
      <div class="meter meter-sm"><span style="--to:${a}%"></span></div></div><span class="dm-num">${a}${nt ? `<small>/${nt.min}</small>` : ''}</span>`;
    if (pulse) { m.classList.remove('pulse'); void m.offsetWidth; m.classList.add('pulse'); }
  }

  function setPortrait(id, expr) {
    const d = G.dlg;
    if (d.focus === id && d.expr === expr) return;
    d.focus = id; d.expr = expr;
    $('#dlg-portrait').innerHTML = posed(id, 'talk', expr);
  }

  function applySet(set) {
    if (!set) return;
    if (set.flag) save.flags[set.flag] = true;
    if (set.usual) save.usual = set.usual;
    if (set.menuName) save.menuName = set.menuName;
    if (set.route) save.route = { char: G.dlg.sc.char, type: set.route };
  }

  function goNode(nid) {
    const d = G.dlg;
    for (let guard = 0; guard < 60; guard++) {
      const ctx = storyCtx();
      const node = d.sc.nodes[nid];
      if (!node) { endScene(); return; }
      if (node.if && !node.if(ctx)) {
        if (node.next) { nid = node.next; continue; }
        endScene(); return;
      }
      if (node.branch) {
        const hit = node.branch.find((b) => (b.flag ? save.flags[b.flag] : b.if ? b.if(ctx) : false));
        nid = hit ? hit.next : node.next;
        if (!nid) { endScene(); return; }
        continue;
      }
      showNode(node, ctx);
      return;
    }
    endScene();
  }

  /* who: 'narr', 'player' (your own line, echoed from a choice) or a cast/guest id. */
  function showNode(node, ctx = storyCtx()) {
    const d = G.dlg;
    d.node = node;
    if (node.bg) setSceneBg(node.bg);
    applySet(node.set);
    const narr = node.who === 'narr', mine = node.who === 'player';
    const focus = !narr && !mine ? node.who : narr ? node.show : null;
    if (focus) setPortrait(focus, node.expr || 'neutral');
    $('#dlg-portrait').classList.toggle('dim', (narr && !node.show) || mine);
    const nameEl = $('#dlg-name');
    nameEl.hidden = narr;
    nameEl.textContent = narr ? '' : mine ? playerName() : whoName(node.who);
    const face = $('#dlg-face');
    face.hidden = !mine;
    if (mine) face.innerHTML = playerPortrait(node.expr);
    $('#dlg-box').classList.toggle('narr', narr);
    $('#dlg-box').classList.toggle('mine', mine);
    d.opts = (node.choices || []).filter((c) => (!c.met || isMet(c.met)) && (!c.if || c.if(ctx)));
    $('#dlg-choices').innerHTML = '';
    $('#screen-dialogue').classList.remove('choosing');
    $('#dlg-next').hidden = true;
    typewrite(fill(typeof node.text === 'function' ? node.text(ctx) : node.text));
  }

  function typewrite(text) {
    const d = G.dlg;
    clearInterval(d.timer);
    const el = $('#dlg-text');
    const speed = TEXT_SPEED[settings.textSpeed];
    d.full = text;
    if (!speed) { el.textContent = text; d.typing = false; onTyped(); return; }
    d.typing = true;
    let i = 0;
    el.textContent = '';
    d.timer = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);
      if (i % 3 === 0 && text[i - 1] !== ' ') Sfx.play('blip');
      if (i >= text.length) { clearInterval(d.timer); d.typing = false; onTyped(); }
    }, speed);
  }

  function onTyped() {
    const d = G.dlg;
    if (d.opts.length) {
      const box = $('#dlg-choices');
      $('#screen-dialogue').classList.add('choosing');
      box.innerHTML = d.opts.map((c, i) => `<button class="btn choice" data-action="choose" data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(fill(c.text))}</span></button>`).join('');
      const first = box.querySelector('button');
      if (first) first.focus({ preventScroll: true });
    } else {
      $('#dlg-next').hidden = false;
    }
  }

  function advance() {
    const d = G.dlg;
    if (!d) return;
    if (d.typing) { clearInterval(d.timer); $('#dlg-text').textContent = d.full; d.typing = false; onTyped(); return; }
    if (d.opts.length) return;
    Sfx.play('tap');
    if (d.node.end || !d.node.next) endScene();
    else goNode(d.node.next);
  }

  function resolveTarget(to, sc) {
    if (to === 'closest') return closest();
    if (to === 'helper') return save.lastShift && save.lastShift.helper;
    return to || sc.affTo || sc.char;
  }

  function choose(i) {
    const d = G.dlg;
    if (!d || d.typing || !d.opts.length) return;
    const c = d.opts[i];
    if (!c) return;
    if (c.flag) save.flags[c.flag] = true;
    applySet(c.set);
    if (c.aff) {
      const target = resolveTarget(c.to, d.sc);
      if (isCast(target)) {
        const got = addAffection(target, c.aff);
        d.meterChar = target;
        const fx = $('#dlg-fx');
        if (got > 0) { Sfx.play('heart'); floatFx(fx, `${S.icons.heart}+${got}`, 50, 34, 'fx-aff'); burstHearts(fx, 4, 50, 40); }
        else if (got < 0) { Sfx.play('wrong'); floatFx(fx, `${S.icons.heartEmpty}${got}`, 50, 34, 'fx-aff down'); }
        renderMeter(true);
      } else Sfx.play('tap');
    } else Sfx.play('tap');
    persist();
    if (c.say === false) { goNode(c.next); } else {
      // you say the line you picked, then the scene carries on
      const tone = c.you || (c.aff >= 6 ? 'blush' : c.aff >= 4 ? 'happy' : c.aff >= 1 ? 'smile' : c.aff < 0 ? 'sad' : 'neutral');
      showNode({ who: 'player', expr: tone, text: c.text, next: c.next });
    }
    $('#dlg-box').focus({ preventScroll: true });
  }

  function endScene() {
    const d = G.dlg;
    clearInterval(d.timer);
    G.dlg = null;
    const sc = d.sc;
    if (sc.aff) {
      const target = resolveTarget(sc.affTo, sc);
      if (isCast(target)) addAffection(target, sc.aff);
    }
    persist();
    if (d.onEnd) d.onEnd(d);
  }

  /* ---------- Gallery ---------- */
  function renderGallery() {
    $('#gallery-grid').innerHTML = D.characters.map((c) => {
      const met = isMet(c.id);
      const a = aff(c.id);
      const isNew = save && save.newBadges.includes(c.id);
      return `<button class="g-card ${met ? '' : 'locked'}" data-action="char-detail" data-id="${c.id}" style="--accent:${c.color}" aria-label="${met ? c.name + ', ' + tierOf(a).name : 'Locked character'}">
        ${isNew ? '<span class="badge-new">NEW</span>' : ''}
        <div class="g-portrait">${portrait(c.id, { locked: !met })}${met ? '' : `<span class="g-lock">${S.icons.lock}</span>`}</div>
        <div class="g-name">${met ? `${c.name} <small>${c.age}</small>` : '???'}</div>
        <div class="g-sub">${met ? esc(c.title) : esc(c.unlockHint)}</div>
        ${met ? `<div class="meter meter-sm"><span style="--to:${a}%"></span></div><div class="g-tier">${tierOf(a).name}</div>` : ''}
      </button>`;
    }).join('');
    $('#guest-grid').innerHTML = D.guests.map((g) => {
      const met = save && guestState(g.id).met;
      const st = save ? guestState(g.id) : { beat: 0 };
      const total = g.beats.length;
      return `<button class="g-card ${met ? '' : 'locked'}" data-action="guest-detail" data-id="${g.id}" aria-label="${met ? g.name : 'Unmet regular'}">
        <div class="g-portrait guest">${portrait(g.id, { kind: 'full', locked: !met })}${met ? '' : `<span class="g-lock">${S.icons.lock}</span>`}</div>
        <div class="g-name">${met ? g.name : '???'}</div>
        <div class="g-sub">${met ? esc(g.blurb) : `Visits the café from day ${g.from}.`}</div>
        ${met ? `<div class="g-tier">Story ${Math.min(st.beat, total)}/${total}</div>` : ''}
      </button>`;
    }).join('');
  }

  function openGuest(id) {
    const g = guestById[id];
    const st = guestState(id);
    if (!st.met) {
      openModal(`
        <h2 id="modal-title">Unmet regular</h2>
        <div class="detail-portrait locked">${portrait(id, { kind: 'full', locked: true })}</div>
        <p class="detail-hint">${S.icons.lock} Someone from Bellflower Lane. They start dropping by on day ${g.from}.</p>
        <button class="btn btn-primary btn-block" data-action="close-modal">Close</button>`);
      return;
    }
    const total = g.beats.length;
    const heard = g.beats.slice(0, Math.min(st.beat, total));
    openModal(`
      <div class="detail-head" style="--accent:#f6cdd3">
        <div class="detail-portrait" id="detail-portrait">${portrait(id, { kind: 'full' })}</div>
      </div>
      <h2 id="modal-title">${esc(g.name)}</h2>
      <p class="detail-title">Regular of Bellflower Lane</p>
      <p>${esc(g.blurb)}</p>
      <dl class="detail-dl">
        <div><dt>Favorite</dt><dd class="fav">${artImg(recipeById[g.favorite].art)}<span>${esc(recipeName(g.favorite))}</span></dd></div>
        <div><dt>Story</dt><dd>${Math.min(st.beat, total)} of ${total} chapters${guestDone(id) ? ' · complete' : ''}</dd></div>
      </dl>
      ${heard.length ? `<blockquote class="quote">“${esc(fill(heard[heard.length - 1].text))}”</blockquote>` : ''}
      <button class="btn btn-primary btn-block" data-action="close-modal">Close</button>`);
  }

  let turnTimer = null;
  function startTurnaround(id) {
    let frame = 0;
    const show = () => { const p = $('#detail-portrait'); if (p) p.innerHTML = portrait(id, { kind: `turn-${frame}` }); frame = (frame + 1) % 8; };
    preload(id, Array.from({ length: 8 }, (_, i) => `turn-${i}`));
    show();
    turnTimer = setInterval(show, settings.reduceMotion ? 1200 : 420);
  }
  function stopTurnaround() { clearInterval(turnTimer); turnTimer = null; }
  function markDetailChip(el) {
    $$('#modal-card .chip-btn').forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-pressed', String(b === el)); });
    Sfx.play('tap');
  }

  function openCharacter(id) {
    const c = charById[id];
    const met = isMet(id);
    if (save && save.newBadges.includes(id)) { save.newBadges = save.newBadges.filter((x) => x !== id); persist(); renderGallery(); }
    if (!met) {
      openModal(`
        <h2 id="modal-title">Locked character</h2>
        <div class="detail-portrait locked">${portrait(id, { kind: 'full', locked: true })}</div>
        <p class="detail-hint">${S.icons.lock} ${esc(c.unlockHint)}</p>
        <button class="btn btn-primary btn-block" data-action="close-modal">Close</button>`);
      return;
    }
    const a = aff(id);
    const nt = nextTier(a);
    const fav = recipeById[c.favorite];
    const route = D.routes[id] || [];
    const seen = Math.min(save.scenesSeen[id] || 0, route.length);
    openModal(`
      <div class="detail-head" style="--accent:${c.color}">
        <div class="detail-portrait" id="detail-portrait">${portrait(id, { kind: 'full' })}</div>
        <div class="expr-row" role="group" aria-label="Artwork">${[['full', 'Full body'], ['bust', 'Portrait'], ['turn', 'Turnaround ↻'], ['chibi', 'Chibi']].map(([k, l]) => `<button class="chip-btn ${k === 'full' ? 'on' : ''}" data-action="detail-art" data-id="${id}" data-kind="${k}" aria-pressed="${k === 'full'}">${l}</button>`).join('')}</div>
        <div class="expr-row" role="group" aria-label="Expressions">${D.expressions.map((e) => `<button class="chip-btn chip-sm" data-action="detail-expr" data-id="${id}" data-expr="${e}" aria-pressed="false">${e}</button>`).join('')}</div>
      </div>
      <h2 id="modal-title">${c.name} <small>· ${c.age}</small></h2>
      <p class="detail-title">${esc(c.title)}</p>
      <p>${esc(c.role)}.</p>
      <p>${esc(c.personality)}</p>
      <p class="detail-note">${esc(c.detail)}</p>
      <dl class="detail-dl">
        <div><dt>Favorite order</dt><dd class="fav">${artImg(fav.art)}<span>${esc(recipeName(fav.id))}</span></dd></div>
        <div><dt>Story</dt><dd>${seen} of ${route.length} evenings seen</dd></div>
      </dl>
      <div class="detail-aff">${S.icons.heart}<div class="meter"><span style="--to:${a}%"></span></div><span>${a}/100</span></div>
      <p class="detail-tier">${tierOf(a).name}${nt ? ` · ${nt.min - a} more to ${nt.name}` : ' · max level'}</p>
      <blockquote class="quote" id="detail-quote">"${esc(pick(c.lines.gallery))}"</blockquote>
      <div class="row">
        <button class="btn btn-soft" data-action="detail-line" data-id="${id}">Another line</button>
        <button class="btn btn-primary" data-action="close-modal">Close</button>
      </div>`);
  }

  /* ---------- Shop ---------- */
  function renderShop() {
    $('#shop-coins').innerHTML = coinHtml(save.coins);
    $('#shop-note').textContent = `Décor makes the café cozier: every piece raises your tips. Current bonus: +${Math.round(decorBonus() * 100)}%. ` +
      (isMet('sora') ? '' : 'Someone with an eye for presentation notices cafés that make an effort.');
    $('#shop-list').innerHTML = D.decor.map((d) => {
      const owned = save.decor.includes(d.id);
      const can = save.coins >= d.price;
      return `<article class="shop-item ${owned ? 'owned' : ''}">
        <div class="shop-art ${d.card ? 'has-card' : ''}" data-preview="${d.id}">${d.card
          ? `<img class="shop-card" src="assets/ui/shop/${d.card}-${owned ? 'owned' : can ? 'normal' : 'locked'}.webp" alt="" draggable="false">`
          : `<img src="assets/props/${d.art}.webp" alt="" draggable="false">`}</div>
        <div class="shop-info"><h3>${esc(d.name)}</h3><p>${esc(d.desc)}</p><span class="tag">+${Math.round(d.bonus * 100)}% tips</span></div>
        <button class="btn ${owned ? '' : can ? 'btn-primary' : ''} shop-buy" data-action="buy" data-id="${d.id}" ${owned || !can ? 'disabled' : ''}>
          ${owned ? 'Placed ✓' : can ? `Buy ${S.icons.coin}${d.price}` : `${S.icons.coin}${d.price}<small>need ${d.price - save.coins}</small>`}
        </button></article>`;
    }).join('');
  }

  function buy(id) {
    const d = decorById[id];
    if (!d || save.decor.includes(id) || save.coins < d.price) return;
    save.coins -= d.price;
    save.decor.push(id);
    persist();
    Sfx.play('coin');
    toast(`${d.name} placed in the café!`, 'coin');
    renderDecor();
    renderShop();
    const btn = $(`[data-preview="${id}"]`);
    if (btn) { const item = btn.closest('.shop-item'); item.classList.add('bought'); }
  }

  /* ---------- Modal ---------- */
  function openModal(html, onClose) {
    const m = $('#modal');
    G.modal = { onClose, restore: document.activeElement };
    $('#modal-card').innerHTML = html;
    m.hidden = false;
    const f = $('#modal-card').querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (f) f.focus({ preventScroll: true });
  }
  function closeModal() {
    if (!G.modal) return;
    const { onClose, restore } = G.modal;
    G.modal = null;
    stopTurnaround();
    $('#modal').hidden = true;
    if (onClose) onClose();
    if (restore && restore.focus && document.contains(restore)) restore.focus({ preventScroll: true });
  }

  function openSettings() {
    const speedBtn = (v, l) => `<button class="seg ${settings.textSpeed === v ? 'on' : ''}" data-action="set-speed" data-v="${v}" aria-pressed="${settings.textSpeed === v}">${l}</button>`;
    const toggle = (k, l) => `<button class="toggle" data-action="toggle-setting" data-k="${k}" role="switch" aria-checked="${!!settings[k]}"><span>${l}</span><img class="toggle-img" src="assets/ui/settings/toggle-${settings[k] ? 'on' : 'off'}.webp" alt="" draggable="false"></button>`;
    openModal(`
      <h2 id="modal-title">Settings</h2>
      <div class="set-list">
        ${toggle('music', 'Music')}
        ${toggle('sound', 'Sound effects')}
        ${toggle('reduceMotion', 'Reduce motion')}
        <div class="set-row"><span>Text speed</span><div class="segs" role="group" aria-label="Text speed">${speedBtn('slow', 'Slow')}${speedBtn('normal', 'Normal')}${speedBtn('instant', 'Instant')}</div></div>
      </div>
      <p class="set-help">Controls: tap buttons, or use the keyboard. <kbd>Enter</kbd>/<kbd>Space</kbd> advance dialogue, <kbd>1</kbd>–<kbd>4</kbd> pick options and choices, hold <kbd>Space</kbd> to pour, <kbd>Esc</kbd> goes back.</p>
      ${save && save.player ? `<button class="btn btn-block" data-action="edit-player">${playerPortrait('smile').replace('art-player', 'art-player art-inline')} Change name, look or pronouns</button>` : ''}
      <div class="row">
        <button class="btn btn-soft" data-action="go-title-modal">Title Screen</button>
        <button class="btn btn-primary" data-action="close-modal">Done</button>
      </div>
      <details class="danger">
        <summary>Reset save data</summary>
        <p>This erases your coins, décor, affection and story progress. Settings are kept.</p>
        <button class="btn btn-danger btn-block" data-action="reset-save" ${save ? '' : 'disabled'}>Erase save and restart</button>
      </details>`);
  }

  function applySettings() {
    Sfx.setEnabled(settings.sound);
    Sfx.setMusic(settings.music);
    document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
  }

  /* ---------- Create / edit the protagonist ---------- */
  let createTimer = null;
  function openCreate({ onDone, onCancel, edit = false }) {
    const cur = (save && save.player) || { name: '', look: D.player.looks[0].id, pronouns: 'they' };
    G.create = { onDone, onCancel, look: cur.look, pronouns: cur.pronouns || 'they' };
    $('#create-heading').textContent = edit ? 'Change your name, look or pronouns' : 'Who’s minding the café?';
    $('#create-submit').textContent = edit ? 'Save' : 'Open the café';
    $('#player-name').value = cur.name || '';
    $('#look-options').innerHTML = D.player.looks.map((l) => `
      <label class="look-card">
        <input type="radio" name="look" value="${l.id}" ${l.id === cur.look ? 'checked' : ''}>
        <span class="look-art">${playerPortrait('smile', l)}</span>
        <span class="look-name">${esc(l.label)}</span>
      </label>`).join('');
    $('#pronoun-options').innerHTML = D.player.pronouns.map((p) => `
      <label class="pron-chip"><input type="radio" name="pron" value="${p.id}" ${p.id === G.create.pronouns ? 'checked' : ''}><span>${esc(p.label)}</span></label>`).join('');
    D.player.looks.forEach((l) => preload(l.id, Array.from({ length: l.frames }, (_, i) => `turn-${i}`)));
    previewLook();
    show('create');
  }
  function previewLook() {
    clearInterval(createTimer);
    let frame = 0;
    const look = lookById[G.create.look];
    const draw = () => {
      $('#create-preview').innerHTML = `<img class="art" src="${artSrc(look.id, `turn-${frame}`)}" alt="">`;
      frame = (frame + 1) % look.frames;
    };
    draw();
    if (!settings.reduceMotion && look.frames > 1) createTimer = setInterval(draw, 520);
  }
  function closeCreate(cb) {
    clearInterval(createTimer);
    const c = G.create;
    G.create = null;
    if (cb) cb.call(null, c);
  }
  $('#look-options').addEventListener('change', (e) => {
    if (e.target.name !== 'look') return;
    G.create.look = e.target.value;
    Sfx.play('select');
    previewLook();
  });
  $('#pronoun-options').addEventListener('change', (e) => {
    if (e.target.name !== 'pron') return;
    G.create.pronouns = e.target.value;
    Sfx.play('tap');
  });
  $('#create-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#player-name').value.replace(/[{}<>]/g, '').trim().slice(0, 16);
    if (!save) save = freshSave();
    save.player = { name, look: G.create.look, pronouns: G.create.pronouns };
    persist();
    Sfx.play('unlock');
    closeCreate((c) => c.onDone && c.onDone());
  });

  /* ---------- Top-level flow ---------- */
  function startDay() {
    if (!save || !save.player) {
      openCreate({ onDone: startDay, onCancel: () => { renderTitle(); show('title'); } });
      return;
    }
    continueGame();
  }

  function continueGame() {
    if (!save) return;
    if (save.phase === 'intro') {
      meet('milo');
      playScene('opening', () => { save.phase = 'hub'; persist(); enterHub(); });
      return;
    }
    if (save.phase === 'evening') { enterEvening(); return; }
    enterHub();
  }

  function goTitle() {
    if (G.dlg) { clearInterval(G.dlg.timer); G.dlg = null; }
    if (G.shift && save && save.phase === 'shift') {
      // leaving mid-shift ends the shift without the remaining customers
      save.phase = 'hub'; persist(); G.shift = null; G.phase = 'hub';
    }
    renderTitle();
    show('title');
  }

  /* ---------- Input ---------- */
  const actions = {
    'start-day': startDay,
    continue: continueGame,
    'open-gallery': () => { renderGallery(); show('gallery'); },
    'open-shop': () => { if (!save) return; renderShop(); show('shop'); },
    'open-settings': openSettings,
    'go-title': goTitle,
    'go-title-modal': () => { closeModal(); goTitle(); },
    'create-cancel': () => closeCreate((c) => c.onCancel && c.onCancel()),
    'edit-player': () => {
      const back = G.screen;
      closeModal();
      openCreate({
        edit: true,
        onDone: () => { show(back); if (back === 'cafe') renderCafe(); toast(`Nice to meet you, <b>${esc(playerName())}</b>.`, 'heart'); },
        onCancel: () => show(back),
      });
    },
    back: () => {
      const to = G.returnTo || 'title';
      if (to === 'title') renderTitle();
      if (to === 'cafe') renderCafe();
      if (to === 'evening') showEveningPick();
      else show(to);
    },
    'open-cafe': beginShift,
    'set-helper': (el) => {
      save.helper = save.helper === el.dataset.id ? null : el.dataset.id;
      persist(); Sfx.play('select'); renderCafe();
    },
    'take-order': takeOrder,
    'make-drink': openDrink,
    'next-customer': advanceCustomer,
    pick: (el) => pickOption(el.dataset.id),
    'goto-step': (el) => { G.drink.step = +el.dataset.step; Sfx.play('tap'); renderDrink(); },
    'restart-drink': () => { G.drink = { sel: {}, step: 0, level: 0, pouring: false, pouredOnce: false }; Sfx.play('tap'); renderDrink(); },
    serve,
    'results-continue': enterEvening,
    'evening-pick': (el) => {
      const id = el.dataset.id;
      const n = nextSceneFor(id);
      playScene(n.scene, () => {
        if (n.isNew) save.scenesSeen[id] = (save.scenesSeen[id] || 0) + 1;
        else save.chats[id] = (save.chats[id] || 0) + 1;
        finishDay();
      });
    },
    'evening-skip': finishDay,
    choose: (el) => choose(+el.dataset.i),
    'char-detail': (el) => openCharacter(el.dataset.id),
    'guest-detail': (el) => openGuest(el.dataset.id),
    'detail-art': (el) => {
      const { id, kind } = el.dataset;
      stopTurnaround();
      if (kind === 'turn') startTurnaround(id);
      else $('#detail-portrait').innerHTML = portrait(id, { kind, expr: 'happy' });
      markDetailChip(el);
    },
    'detail-expr': (el) => {
      stopTurnaround();
      $('#detail-portrait').innerHTML = portrait(el.dataset.id, { kind: 'talk', expr: el.dataset.expr });
      markDetailChip(el);
    },
    'detail-line': (el) => { $('#detail-quote').textContent = `"${pick(charById[el.dataset.id].lines.gallery)}"`; Sfx.play('blip'); },
    buy: (el) => buy(el.dataset.id),
    'close-modal': closeModal,
    'toggle-setting': (el) => {
      const k = el.dataset.k;
      settings[k] = !settings[k];
      el.setAttribute('aria-checked', String(settings[k]));
      const ti = el.querySelector('.toggle-img'); if (ti) ti.src = `assets/ui/settings/toggle-${settings[k] ? 'on' : 'off'}.webp`;
      persistSettings(); applySettings(); Sfx.play('tap');
    },
    'set-speed': (el) => {
      settings.textSpeed = el.dataset.v;
      $$('.segs .seg').forEach((b) => { b.classList.toggle('on', b === el); b.setAttribute('aria-pressed', String(b === el)); });
      persistSettings(); Sfx.play('tap');
    },
    'reset-save': () => {
      store.del(SAVE_KEY);
      save = null; G.shift = null; G.phase = 'hub';
      closeModal();
      goTitle();
      toast('Save data erased. A fresh start awaits.', 'info');
    },
  };

  document.addEventListener('click', (e) => {
    if (e.target === $('#modal')) { closeModal(); return; }
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) fn(el);
  });

  $('#dlg-box').addEventListener('click', advance);
  $('#screen-dialogue').addEventListener('click', (e) => {
    // tapping anywhere on the scene (outside choices/buttons) advances the text
    if (e.target.closest('button, .dlg-box')) return;
    advance();
  });

  document.addEventListener('keydown', (e) => {
    if (G.modal) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      if (e.key === 'Tab') {
        const f = $$('#modal-card button:not([disabled]), #modal-card summary');
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
      return;
    }
    const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
    if (G.screen === 'create') return;
    if (G.screen === 'dialogue') {
      if ((e.key === 'Enter' || e.key === ' ') && !onButton) { e.preventDefault(); advance(); return; }
      if (/^[1-4]$/.test(e.key)) { choose(+e.key - 1); return; }
    }
    if (G.screen === 'drink' && G.drink) {
      const stepId = D.steps[G.drink.step].id;
      if (stepId === 'pour' && e.key === ' ') { e.preventDefault(); if (!e.repeat) startPour(); return; }
      if (stepId !== 'pour' && /^[1-5]$/.test(e.key)) {
        const o = D.ingredients[stepId][+e.key - 1];
        if (o) pickOption(o.id);
        return;
      }
      if (e.key === 'Enter' && stepId === 'pour' && !onButton) { serve(); return; }
    }
    if (e.key === 'Escape') {
      if (G.screen === 'gallery' || G.screen === 'shop') actions.back();
      else openSettings();
    }
  });
  document.addEventListener('keyup', (e) => { if (e.key === ' ' && G.screen === 'drink') stopPour(); });
  window.addEventListener('blur', stopPour);

  /* ---------- Main loop: patience + pouring ---------- */
  let last = performance.now(), pourSfx = 0;
  function tick(t) {
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const c = current();
    if (c && !G.modal && (G.phase === 'arrive' || G.phase === 'ordered') && (G.screen === 'cafe' || G.screen === 'drink')) {
      c.patience = Math.max(0, c.patience - (dt / D.economy.patienceSeconds) * drainFactor());
      updatePatience();
    }
    const d = G.drink;
    if (d && d.pouring) {
      d.level = Math.min(1.15, d.level + dt * D.economy.pourRate);
      renderCup();
      if (d.level >= 1.15) stopPour();
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Boot ---------- */
  D.characters.forEach((c) => preload(c.id, ['bust', 'chibi-neutral', 'chibi-happy']));
  applySettings();
  renderTitle();
  show('title');
  requestAnimationFrame(tick);

  // Handy for testing and tinkering from the console: window.PP.skipTo(day)
  window.PP = {
    get save() { return save; },
    evening() { enterEvening(); },
    skipTo(day) { if (!save) return; save.day = day; persist(); enterHub(); },
    storyCtx, fill,
    recipe() { const c = current(); return c ? recipeById[c.drink] : null; },
    customers() { return G.shift ? G.shift.customers.map((c) => c.who + ':' + c.drink) : []; },
  };
})();
