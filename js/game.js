/* Purrfect Pour — game engine: screens, café shift, drink making, story scenes, save data. */
(function () {
  'use strict';

  const D = window.GAME_DATA, S = window.Sprites;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const charById = Object.fromEntries(D.characters.map((c) => [c.id, c]));
  const regById = Object.fromEntries(D.regulars.map((r) => [r.id, r]));
  const treatById = Object.fromEntries(D.treats.map((t) => [t.id, t]));
  const isCast = (id) => !!charById[id];
  const person = (id) => charById[id] || regById[id];
  const itemSrc = (art) => `assets/items/${art}.webp`;
  const propSrc = (art) => `assets/props/${art}.webp`;
  const sceneSrc = (name) => `assets/scenes/${name}.webp`;
  const itemImg = (art, cls = '') => (art ? `<img class="item ${cls}" src="${itemSrc(art)}" alt="" draggable="false">` : '');
  const recipeById = Object.fromEntries(D.recipes.map((r) => [r.id, r]));
  const decorById = Object.fromEntries(D.decor.map((d) => [d.id, d]));
  const ingName = (step, id) => (step === 'treat' ? (treatById[id] || {}).name : (D.ingredients[step].find((i) => i.id === id) || {}).name) || '—';
  const RECIPE_KEYS = ['cup', 'base', 'milk', 'syrup', 'topping'];

  /* ---------- Save data ---------- */
  const SAVE_KEY = 'purrfect-pour:save:v1';
  const SET_KEY = 'purrfect-pour:settings:v1';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: play continues unsaved */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  function freshSave() {
    return {
      v: 1, day: 1, coins: D.economy.startCoins, decor: [], met: {}, affection: {}, scenesSeen: {}, flags: {},
      phase: 'intro', totals: { served: 0, perfect: 0, earned: 0 }, newBadges: [],
    };
  }
  let save = store.get(SAVE_KEY);
  if (!save || save.v !== 1) save = null;
  if (save && save.phase === 'shift') save.phase = 'hub'; // an interrupted shift resumes from the closed café
  if (save) save.decor = save.decor.filter((id) => D.decor.some((d) => d.id === id)); // décor from older versions
  const settings = Object.assign({ sound: true, textSpeed: 'normal', reduceMotion: false }, store.get(SET_KEY) || {});
  const persist = () => { if (save) store.set(SAVE_KEY, save); };
  const persistSettings = () => store.set(SET_KEY, settings);

  /* ---------- Runtime state ---------- */
  const G = { screen: 'title', returnTo: 'title', phase: 'hub', shift: null, drink: null, dlg: null, modal: null };

  /* ---------- Relationship helpers ---------- */
  const aff = (id) => (save && save.affection[id]) || 0;
  const tierOf = (a) => D.tiers.reduce((t, x) => (a >= x.min ? x : t), D.tiers[0]);
  const nextTier = (a) => D.tiers.find((t) => t.min > a);
  const isMet = (id) => !!(save && save.met[id]);
  const decorBonus = () => (save ? save.decor.reduce((s, id) => s + decorById[id].bonus, 0) : 0);

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

  /* Character art lives in assets/characters/<id>/. Cast: a large bust and full body,
   * eight bust and eight chibi expressions, an eight-frame turnaround. Regulars: full
   * body and three bust expressions (closest match is used for the rest). */
  const artSrc = (id, file) => `assets/characters/${id}/${file}.webp`;
  // 'talk' and 'counter' use the expression busts, 'chibi' the chibi expressions
  const artFile = (kind, expr) => (kind === 'chibi' || kind === 'talk' || kind === 'counter'
    ? `${kind === 'chibi' ? 'chibi' : 'bust'}-${D.expressions.includes(expr) ? expr : 'neutral'}`
    : kind);
  const REGULAR_FALLBACK = { happy: ['happy'], blush: ['happy', 'content'], smirk: ['happy'], flustered: ['happy'], surprised: ['happy'], sad: ['sad', 'neutral'], pensive: ['content', 'neutral'] };
  function portrait(who, { kind = 'bust', expr = 'neutral', locked = false } = {}) {
    let file;
    if (regById[who]) {
      const has = regById[who].expressions;
      file = kind === 'full' ? 'full' : `bust-${[...(REGULAR_FALLBACK[expr] || []), 'neutral'].find((e) => has.includes(e))}`;
    } else file = artFile(kind, expr);
    return `<img class="art art-${kind}${locked ? ' silhouette' : ''}" src="${artSrc(who, file)}" alt="" draggable="false">`;
  }
  /* Chibi faces are small at café size, so reactions there also get an emote. */
  const EMOTES = { happy: '♪', blush: '♡', flustered: '!!', surprised: '!', sad: '…', smirk: '✧' };
  const emote = (expr) => (EMOTES[expr] ? `<span class="emote emote-${expr}" aria-hidden="true">${EMOTES[expr]}</span>` : '');
  function posed(who, kind, expr) {
    return `<div class="pose expr-${expr}">${portrait(who, { kind, expr })}${kind === 'chibi' || kind === 'counter' ? emote(expr) : ''}</div>`;
  }
  /* ---------- The protagonist ---------- */
  const lookById = Object.fromEntries(D.player.looks.map((l) => [l.id, l]));
  const playerLook = () => lookById[(save && save.player && save.player.look) || D.player.looks[0].id];
  const playerName = () => (save && save.player && save.player.name) || D.player.defaultName;
  const fill = (text) => String(text).replace(/\{name\}/g, playerName());
  function playerExpr(look, expr) {
    const tries = [expr, ...(D.player.fallback[expr] || []), 'neutral'];
    return tries.find((e) => look.expressions.includes(e));
  }
  function playerPortrait(expr = 'neutral', look = playerLook()) {
    return `<img class="art art-player" src="${artSrc(look.id, `bust-${playerExpr(look, expr)}`)}" alt="" draggable="false">`;
  }

  function preload(id, files) { files.forEach((f) => { new Image().src = artSrc(id, f); }); }
  const whoName = (who) => person(who).name;

  /* ---------- Café scene: your interior, counter and décor ---------- */
  function renderDecor() {
    const owned = save ? save.decor.map((id) => decorById[id]) : [];
    ['back', 'front'].forEach((layer) => {
      $(`#decor-${layer}`).innerHTML = owned.filter((d) => d.layer === layer)
        .map((d) => `<img class="prop ${d.spot}" src="${propSrc(d.art)}" alt="" draggable="false">`).join('');
    });
  }
  const sellsTreats = () => !!(save && save.decor.some((id) => decorById[id].treats));

  /* ---------- Screens ---------- */
  function show(name) {
    if ((name === 'gallery' || name === 'shop') && G.screen !== 'gallery' && G.screen !== 'shop') G.returnTo = G.screen;
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    G.screen = name;
    document.body.dataset.screen = name;
    const el = $('#screen-' + name);
    el.scrollTop = 0;
    const f = el.querySelector('[data-autofocus]') || el.querySelector('.btn-primary:not([disabled])');
    if (f) requestAnimationFrame(() => f.focus({ preventScroll: true }));
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

  function placeToasts() {
    const box = $('#toasts');
    if (G.screen === 'cafe') {
      // keep the speech bubble and the result panel readable: float over the counter
      const r = $('#cafe-scene').getBoundingClientRect();
      box.style.top = 'auto';
      box.style.bottom = Math.max(8, window.innerHeight - r.bottom + 10) + 'px';
    } else { box.style.top = ''; box.style.bottom = ''; }
  }

  function floatFx(container, html, x, y, cls = '') {
    const el = document.createElement('div');
    el.className = 'float-fx ' + cls;
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.innerHTML = html;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  function burstHearts(container, n = 6, x = 50, y = 40) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => floatFx(container, S.icons.heart, x + (Math.random() * 30 - 15), y + Math.random() * 10, 'fx-heart'), i * 90);
    }
  }

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
    cast.innerHTML = D.characters.map((c, i) => {
      const met = isMet(c.id);
      return `<div class="title-sprite" style="--i:${i}">${portrait(c.id, { kind: 'chibi', expr: met ? 'happy' : 'neutral', locked: !met })}</div>`;
    }).join('');
    const cont = $('#btn-continue');
    cont.disabled = !save;
    $('#btn-start').textContent = !save ? 'Start Day' : save.phase === 'evening' ? 'Continue Evening' : `Start Day ${save.day}`;
    $('#title-save').innerHTML = save
      ? `Saved: Day ${save.day} · ${coinHtml(save.coins)} · ${Object.keys(save.met).length} of ${D.characters.length} met`
      : 'New café. Fresh beans. No save yet.';
  }

  /* ---------- Café: shift flow ---------- */
  function buildShift() {
    const withTreat = (c) => {
      if (sellsTreats() && !c.treat && Math.random() < 0.5) {
        c.treat = Math.random() < 0.7 ? person(c.who).treat : pick(D.treats).id;
      }
      return c;
    };
    if (save.day === 1) return D.firstShift.map((x) => withTreat(Object.assign({}, x)));
    // Everyone you've met drops by (plus a newcomer the café has unlocked), mostly
    // for their favorite; regulars from the neighborhood fill the rest of the day.
    const n = 4 + Math.min(2, Math.floor((save.day - 1) / 2));
    const cast = D.characters.filter((c) => isMet(c.id)).map((c) => c.id);
    D.characters.forEach((c) => {
      if (!isMet(c.id) && c.unlock.type === 'decor' && save.decor.length >= c.unlock.count) cast.push(c.id);
    });
    const newcomers = cast.filter((id) => !isMet(id));
    const known = shuffle(cast.filter(isMet)).slice(0, Math.max(0, n - 1 - newcomers.length));
    const order = (id) => ({ who: id, drink: Math.random() < 0.7 ? person(id).favorite : pick(D.recipes).id });
    const list = known.map(order);
    const locals = shuffle(D.regulars.map((r) => r.id));
    while (list.length < n - newcomers.length) list.push(order(locals.pop()));
    shuffle(list);
    // newcomers arrive first so they get their introduction
    return newcomers.map(order).concat(list).map(withTreat);
  }

  function beginShift() {
    save.phase = 'shift';
    persist();
    G.shift = {
      customers: buildShift().map((c) => Object.assign(c, { patience: 1 })),
      index: 0, sales: 0, tips: 0, sat: [], perfect: 0, correct: 0, affGain: {},
    };
    G.shift.customers.forEach((c) => preload(c.who, isCast(c.who) ? D.expressions.map((e) => `bust-${e}`) : person(c.who).expressions.map((e) => `bust-${e}`)));
    renderDecor();
    show('cafe');
    nextCustomer(true);
  }

  const current = () => (G.shift ? G.shift.customers[G.shift.index] : null);

  function nextCustomer(first) {
    const go = () => {
      if (G.shift.index >= G.shift.customers.length) { endShift(); return; }
      G.phase = 'arrive';
      const c = current();
      c.patience = 1;
      renderCafe('walk-in');
      Sfx.play('tap');
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

  function customerLine(c, kind) { return fill(rawCustomerLine(c, kind)); }
  function rawCustomerLine(c, kind) {
    const drink = recipeById[c.drink].name;
    if (!isCast(c.who)) {
      const r = regById[c.who];
      if (kind === 'greet') return pick(r.lines.greet);
      if (kind === 'order') return (c.treat ? D.regularLines.orderTreat : D.regularLines.order).replace('{drink}', drink).replace('{treat}', c.treat ? treatById[c.treat].name : '');
      return pick(D.regularLines[kind]);
    }
    const ch = charById[c.who];
    if (kind === 'order' && c.treat) return `${ch.lines.order.replace('{drink}', drink)} Oh, and a ${treatById[c.treat].name}!`;
    if (kind === 'greet') return c.again ? ch.lines.again : isMet(c.who) ? pick(ch.lines.greet) : ch.lines.meet;
    if (kind === 'order') return ch.lines.order.replace('{drink}', recipeById[c.drink].name);
    // reactions to their usual can mention it; anything else gets a general line
    const fav = c.drink === ch.favorite && ch.lines[kind === 'happy' ? 'favHappy' : 'favWrong'];
    return pick(fav || ch.lines[kind]);
  }

  function renderCafe(anim) {
    renderHud();
    const cust = $('#cafe-customers');
    const bubble = $('#cafe-bubble');
    const panel = $('#cafe-panel');
    const c = current();

    if (G.phase === 'hub' || !c) {
      const idle = isMet('milo') ? `<div class="cust idle"><div class="cust-sprite">${posed('milo', 'counter', 'happy')}</div></div>` : '';
      cust.innerHTML = staffHtml() + idle;
      bubble.hidden = true;
      const lumi = charById.lumi;
      const hints = [];
      if (!isMet('lumi')) hints.push(save.decor.length >= lumi.unlock.count
        ? 'Someone very stylish has been peeking through the window. Maybe tomorrow…'
        : `Rumor has it a fashionable regular only visits cafés with ${lumi.unlock.count}+ décor pieces. You have ${save.decor.length}.`);
      const cheapest = D.decor.filter((d) => !save.decor.includes(d.id)).sort((a, b) => a.price - b.price)[0];
      if (cheapest) hints.push(save.coins >= cheapest.price ? `You can afford the ${cheapest.name}. Visit Upgrades!` : `Next décor: ${cheapest.name} for ${cheapest.price} coins.`);
      panel.innerHTML = `
        <div class="panel-head"><h2>The Velvet Paw</h2><span class="tag">Closed</span></div>
        <p class="panel-text">${isMet('milo') ? 'Milo is wiping down the counter and humming. ' : ''}The sign on the door is waiting to be flipped.</p>
        ${hints.map((h) => `<p class="hint">${h}</p>`).join('')}
        <button class="btn btn-primary btn-lg btn-block" data-action="open-cafe">Open Café · Day ${save.day}</button>`;
      return;
    }

    const recipe = recipeById[c.drink];
    const expr = G.phase === 'served' ? c.reaction : isCast(c.who) && !isMet(c.who) ? 'blush' : 'neutral';
    const cheer = G.phase === 'served' && anim === 'react' ? (c.result.correct ? 'cheer' : 'oops') : '';
    cust.innerHTML = staffHtml(cheer) + `<div class="cust ${anim || ''}"><div class="cust-sprite">${posed(c.who, 'counter', expr)}</div></div>`;

    let line;
    if (G.phase === 'arrive') line = c.greetLine || (c.greetLine = customerLine(c, 'greet'));
    else if (G.phase === 'ordered') line = c.orderLine || (c.orderLine = customerLine(c, 'order'));
    else line = c.reactLine;
    bubble.hidden = false;
    bubble.innerHTML = `<b>${esc(whoName(c.who))}</b>${esc(line)}`;
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');

    const tierTag = !isCast(c.who) ? '<span class="tag">Regular</span>'
      : isMet(c.who) ? `<span class="tag tag-heart">${S.icons.heart}${tierOf(aff(c.who)).name}</span>` : '<span class="tag tag-new">New face</span>';
    const patience = `<div class="patience" role="img" aria-label="Patience"><span class="patience-fill"></span></div>`;

    if (G.phase === 'arrive') {
      panel.innerHTML = `
        <div class="panel-head"><h2>${esc(whoName(c.who))}</h2>${tierTag}</div>
        ${patience}
        <p class="panel-text">A customer is waiting at the counter.</p>
        <button class="btn btn-primary btn-lg btn-block" data-action="take-order">Take Order</button>`;
    } else if (G.phase === 'ordered') {
      panel.innerHTML = `
        <div class="panel-head"><h2>${esc(whoName(c.who))}</h2>${tierTag}</div>
        ${patience}
        ${ticketHtml(recipe, true, c.treat)}
        <button class="btn btn-primary btn-lg btn-block" data-action="make-drink">Make Drink</button>`;
    } else {
      const r = c.result;
      const last = G.shift.index >= G.shift.customers.length - 1;
      panel.innerHTML = `
        <div class="result ${r.correct ? 'ok' : 'bad'}">
          <div class="result-badge">${r.correct ? '✓' : '✗'}</div>
          <div class="result-body">
            <h2>${r.correct ? (r.pour === 'perfect' ? 'Perfect order!' : 'Order correct!') : 'Not quite right'}</h2>
            <p>${r.correct ? esc(pourText(r.pour)) : 'Expected ' + r.wrong.map((k) => `<b>${esc(ingName(k, k === 'treat' ? c.treat : recipe[k]))}</b> (you used ${esc(ingName(k, r.sel[k]))})`).join(', ')}</p>
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

  /* You, behind the register. */
  function staffHtml(mood = '') {
    if (!save || !save.player) return '';
    const expr = mood === 'cheer' ? 'happy' : mood === 'oops' ? 'sad' : 'smile';
    return `<div class="staff ${mood}">${playerPortrait(expr)}</div>`;
  }

  function ticketHtml(recipe, showBlurb, treat) {
    const t = treat && treatById[treat];
    return `<div class="order-card">
      <div class="order-cup">${itemImg(recipe.art)}${t ? itemImg(t.art, 'order-treat') : ''}</div>
      <div class="order-info">
        <div class="order-name">${esc(recipe.name)} <span class="order-price">${S.icons.coin}${recipe.price + (t ? t.price : 0)}</span></div>
        ${t ? `<div class="order-plus">+ ${esc(t.name)}</div>` : ''}
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

  /* Steps for the current order: the treat step only appears when they asked for one. */
  const drinkSteps = () => D.steps.filter((st) => !st.optional || (st.id === 'treat' && current().treat));
  const neededKeys = () => drinkSteps().map((st) => st.id).filter((k) => k !== 'pour');
  const stepOptions = (stepId) => (stepId === 'treat' ? D.treats : D.ingredients[stepId]);
  const allPicked = () => neededKeys().every((k) => G.drink.sel[k] !== undefined);

  function renderDrink() {
    const c = current();
    const recipe = recipeById[c.drink];
    const d = G.drink;
    const steps = drinkSteps();
    const stepId = steps[d.step].id;
    const want = (k) => (k === 'treat' ? c.treat : recipe[k]);
    $('#drink-ticket').innerHTML = `
      <div class="ticket-who"><div class="mini-head">${portrait(c.who, { kind: isCast(c.who) ? 'bust' : 'counter' })}</div>
        <div class="ticket-main"><div class="ticket-label">Order for ${esc(whoName(c.who))}</div><div class="ticket-drink">${esc(recipe.name)}${c.treat ? ` <small>+ ${esc(treatById[c.treat].name)}</small>` : ''}</div></div>
        <div class="ticket-goal">${itemImg(recipe.art)}</div></div>
      <ul class="recipe-list recipe-inline">${neededKeys().map((k) => `<li class="${k === stepId ? 'now' : ''}">${esc(ingName(k, want(k)))}</li>`).join('')}</ul>
      <div class="patience" role="img" aria-label="Patience"><span class="patience-fill"></span></div>`;
    updatePatience();

    $('#drink-steps').style.setProperty('--n', steps.length);
    $('#drink-steps').innerHTML = steps.map((st, i) => {
      const done = st.id === 'pour' ? d.pouredOnce : d.sel[st.id] !== undefined;
      const val = st.id === 'pour' ? (d.pouredOnce ? Math.round(d.level * 100) + '%' : '') : d.sel[st.id] ? ingName(st.id, d.sel[st.id]) : '';
      const reachable = i <= firstOpenStep();
      return `<li><button class="step ${i === d.step ? 'current' : ''} ${done ? 'done' : ''}" data-action="goto-step" data-step="${i}" ${reachable ? '' : 'disabled'} aria-current="${i === d.step ? 'step' : 'false'}">
        <span class="step-n">${i + 1}</span><span class="step-l">${st.label}</span>${val ? `<span class="step-v">${esc(val)}</span>` : ''}</button></li>`;
    }).join('');

    renderCup();

    const opts = $('#drink-options');
    $('#pour-gauge').classList.toggle('active', stepId === 'pour');
    if (stepId === 'pour') {
      const ready = allPicked();
      opts.innerHTML = `
        <p class="pour-hint" id="pour-hint">${d.pouredOnce ? esc(pourLabel(d.level)) : 'Hold the button and release inside the pink band.'}</p>
        <button class="btn btn-hold btn-lg btn-block" id="hold-pour" ${ready ? '' : 'disabled'} aria-describedby="pour-hint">Hold to Pour <kbd>Space</kbd></button>
        <div class="row">
          <button class="btn btn-soft" data-action="restart-drink">Start Over</button>
          <button class="btn btn-primary" data-action="serve" id="btn-serve" ${d.level >= 0.3 && ready ? '' : 'disabled'}>Serve ♥</button>
        </div>`;
      bindHold($('#hold-pour'));
    } else {
      const label = { cup: 'a cup', base: 'a base', treat: 'the treat' }[stepId] || 'the ' + stepId;
      opts.innerHTML = `<p class="opt-title">Choose ${label}</p>
        <div class="opt-grid">${stepOptions(stepId).map((o, i) => `
          <button class="opt ${d.sel[stepId] === o.id ? 'picked' : ''}" data-action="pick" data-id="${o.id}" aria-pressed="${d.sel[stepId] === o.id}">
            <span class="opt-art">${o.art ? itemImg(o.art) : '<span class="swatch none" aria-hidden="true"></span>'}</span>
            <span class="opt-name">${esc(o.name)}</span><kbd class="opt-key">${i + 1}</kbd>
          </button>`).join('')}</div>`;
    }
  }

  function firstOpenStep() {
    const i = neededKeys().findIndex((k) => G.drink.sel[k] === undefined);
    return i === -1 ? drinkSteps().length - 1 : i;
  }

  /* Liquid tint for the cup while pouring, from the chosen ingredients. */
  function liquidColor(sel) {
    const find = (k) => D.ingredients[k].find((i) => i.id === sel[k]);
    const base = find('base');
    if (!base) return null;
    let col = base.color;
    const milk = find('milk'), syrup = find('syrup');
    if (milk && milk.color) col = S.mix(col, milk.color, 0.5);
    if (syrup && syrup.color) col = S.mix(col, syrup.color, 0.22);
    return col;
  }

  /* The cup you picked, filling with a tint of the drink; added ingredients sit beside it. */
  function renderCup() {
    const d = G.drink;
    const cup = D.ingredients.cup.find((x) => x.id === d.sel.cup);
    const col = liquidColor(d.sel);
    const fillLevel = clamp(Math.max(d.level, d.sel.base ? 0.15 : 0), 0, 1);
    const added = neededKeys().filter((k) => k !== 'cup' && d.sel[k] && d.sel[k] !== 'none')
      .map((k) => (stepOptions(k).find((o) => o.id === d.sel[k]) || {}).art).filter(Boolean);
    $('#cup-stage').innerHTML = cup
      ? `<div class="cup-wrap" style="--cup:url('${itemSrc(cup.art)}'); --fill:${fillLevel}; --liquid:${col || 'transparent'}">
           ${itemImg(cup.art, 'cup-img')}<span class="cup-liquid" aria-hidden="true"></span>
           ${d.level > 1 ? '<span class="cup-spill" aria-hidden="true"></span>' : ''}
         </div>
         ${d.pouring ? `<div class="pitcher" aria-hidden="true">${itemImg('tool-pitcher')}<span class="stream" style="--liquid:${col}"></span></div>` : ''}
         <div class="added">${added.map((a) => itemImg(a)).join('')}</div>`
      : '<div class="cup-placeholder">Pick a cup</div>';
    $('#gauge-fill').style.height = clamp(d.level / 1.15, 0, 1) * 100 + '%';
  }

  function pickOption(id) {
    const d = G.drink;
    const stepId = drinkSteps()[d.step].id;
    d.sel[stepId] = id;
    if (stepId === 'base' && d.level > 0) d.level = 0;
    Sfx.play('select');
    d.step = firstOpenStep();
    renderDrink();
    const stage = $('#cup-stage');
    stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump');
    const focusTarget = $('#drink-options .opt') || $('#hold-pour');
    if (focusTarget && document.activeElement && document.activeElement.closest('#drink-options, #drink-steps')) focusTarget.focus({ preventScroll: true });
  }

  function pourLabel(l) {
    if (l > 1.0) return 'Oops, it spilled over! Serve anyway or start over.';
    if (l >= 0.82) return 'Perfect pour! Serve it while it\'s pretty.';
    if (l >= 0.6) return 'Nice pour. A touch more reaches the pink band.';
    if (l >= 0.3) return 'Keep going, it\'s looking a bit light.';
    return 'Hold to pour a little more.';
  }
  const pourGrade = (l) => (l > 1.0 ? 'spill' : l >= 0.82 ? 'perfect' : l >= 0.6 ? 'good' : 'light');

  function bindHold(btn) {
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } startPour(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, stopPour));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function startPour() {
    const d = G.drink;
    if (!d || d.pouring || drinkSteps()[d.step].id !== 'pour') return;
    if (!allPicked()) return;
    d.pouring = true;
    const b = $('#hold-pour'); if (b) b.classList.add('holding');
  }
  function stopPour() {
    const d = G.drink;
    if (!d || !d.pouring) return;
    d.pouring = false;
    d.pouredOnce = true;
    const b = $('#hold-pour'); if (b) b.classList.remove('holding');
    const h = $('#pour-hint'); if (h) h.textContent = pourLabel(d.level);
    const s = $('#btn-serve'); if (s) s.disabled = d.level < 0.3;
    renderCup();
    if (pourGrade(d.level) === 'perfect') Sfx.play('select');
    const stepVal = $$('#drink-steps .step').pop();
    if (stepVal) { stepVal.classList.add('done'); }
  }

  function serve() {
    const d = G.drink, c = current();
    if (!d || d.level < 0.3) return;
    const recipe = recipeById[c.drink];
    const wrong = neededKeys().filter((k) => d.sel[k] !== (k === 'treat' ? c.treat : recipe[k]));
    const correct = wrong.length === 0;
    const pour = pourGrade(d.level);
    const pat = c.patience;
    const treatPrice = c.treat && d.sel.treat === c.treat ? treatById[c.treat].price : 0;
    const coins = (correct ? recipe.price : Math.round(recipe.price * 0.5)) + treatPrice;
    let tip = 0;
    if (correct) {
      tip = 2 + 6 * pat + (pour === 'perfect' ? 3 : 0) - (pour === 'spill' ? 2 : 0) - (pour === 'light' ? 1 : 0);
      tip = Math.max(0, Math.round(tip * (1 + decorBonus())));
    }
    const n = neededKeys().length;
    const sat = correct ? clamp(0.6 + 0.25 * pat + (pour === 'perfect' ? 0.15 : pour === 'good' ? 0.08 : 0), 0, 1) : 0.25 + 0.15 * ((n - wrong.length) / n);
    let affDelta = 0;
    if (isCast(c.who)) {
      if (!isMet(c.who)) meet(c.who);
      const raw = correct ? 3 + (pour === 'perfect' ? 1 : 0) + (c.drink === charById[c.who].favorite ? 1 : 0) : -1;
      affDelta = addAffection(c.who, raw);
      G.shift.affGain[c.who] = (G.shift.affGain[c.who] || 0) + affDelta;
    }
    save.coins += coins + tip;
    G.shift.sales += coins; G.shift.tips += tip; G.shift.sat.push(sat);
    if (correct) G.shift.correct++;
    if (correct && pour === 'perfect') G.shift.perfect++;
    c.result = { correct, wrong, pour, coins, tip, aff: affDelta, sel: Object.assign({}, d.sel), level: d.level };
    c.reaction = correct ? (pour === 'perfect' || c.drink === person(c.who).favorite ? (c.who === 'riven' ? 'smirk' : 'blush') : 'happy') : 'sad';
    if (correct && pour === 'perfect') c.reaction = 'happy';
    c.reactLine = customerLine(c, correct ? 'happy' : 'wrong');
    G.phase = 'served';
    G.drink = null;

    show('cafe');
    renderCafe('react');
    const fx = $('#cafe-fx');
    const cupEl = document.createElement('div');
    cupEl.className = 'served-cup';
    // a correct order is the finished drink; a wrong one is just the cup you made
    const cupArt = correct ? recipe.art : (D.ingredients.cup.find((x) => x.id === c.result.sel.cup) || {}).art;
    cupEl.innerHTML = itemImg(cupArt) + (c.treat && d.sel.treat ? itemImg(treatById[d.sel.treat].art, 'served-treat') : '');
    fx.appendChild(cupEl);
    setTimeout(() => cupEl.remove(), 2600);
    if (correct) {
      Sfx.play('coin');
      floatFx(fx, `${S.icons.coin}+${coins + tip}`, 50, 30, 'fx-coin');
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
      <p class="eyebrow">Day ${save.day} complete</p>
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
    if (seen < route.length && aff(id) >= route[seen].min) return { scene: route[seen].scene, isNew: true };
    return { scene: id + '_chat', isNew: false, lockedAt: route[seen] ? route[seen].min : null };
  }

  function renderEvening() {
    const met = D.characters.filter((c) => isMet(c.id));
    $('#evening-inner').innerHTML = `
      <p class="eyebrow">Day ${save.day} · After hours</p>
      <h2 id="evening-heading">Who will you spend the evening with?</h2>
      <p class="sheet-note">The lamps are low and the chairs are stacked. Someone is still hanging around.</p>
      <div class="evening-list">${met.map((c) => {
        const n = nextSceneFor(c.id);
        const a = aff(c.id);
        return `<article class="eve-card" style="--accent:${c.color}">
          <div class="eve-portrait">${portrait(c.id)}</div>
          <div class="eve-info">
            <h3>${c.name} <small>${c.age}</small></h3>
            <div class="meter meter-sm"><span style="--to:${a}%"></span></div>
            <p class="eve-tier">${S.icons.heart} ${tierOf(a).name} · ${a}/100</p>
            <p class="eve-scene">${n.isNew ? `<span class="tag tag-new">New story</span> ${esc(D.scenes[n.scene].title)}` : `Casual chat${n.lockedAt != null ? ` · next story at ♥${n.lockedAt}` : ''}`}</p>
            <button class="btn ${n.isNew ? 'btn-primary' : ''} btn-block" data-action="evening-pick" data-id="${c.id}">Spend time with ${c.name}</button>
          </div></article>`;
      }).join('')}</div>
      <button class="btn btn-soft btn-block" data-action="evening-skip">Head home early</button>`;
  }

  function finishDay() {
    save.day += 1;
    save.phase = 'hub';
    persist();
    G.phase = 'hub';
    G.shift = null;
    renderDecor();
    show('cafe');
    renderCafe();
    toast(`Day ${save.day} begins. Rested, caffeinated, ready.`, 'info');
  }

  /* ---------- Dialogue ---------- */
  const TEXT_SPEED = { slow: 42, normal: 22, instant: 0 };

  function playScene(id, onEnd) {
    const sc = D.scenes[id];
    preload(sc.char, D.expressions.map((e) => `bust-${e}`));
    G.dlg = { id, sc, node: null, onEnd, typing: false, timer: null, expr: null, full: '' };
    const bg = $('#dlg-bg');
    bg.className = 'dlg-bg bg-' + sc.bg;
    // painted backgrounds for scenes at the café; gradients for places elsewhere in town
    const img = $('#dlg-img');
    const painted = { 'cafe-day': 'interior-day', 'cafe-night': 'interior-night', storefront: 'storefront' }[sc.bg];
    img.hidden = !painted;
    if (painted) img.src = sceneSrc(painted);
    $('#dlg-portrait').innerHTML = '';
    show('dialogue');
    renderMeter();
    goNode('start');
    $('#dlg-box').focus({ preventScroll: true });
  }

  function renderMeter(pulse) {
    const ch = charById[G.dlg.sc.char];
    const a = aff(ch.id);
    const nt = nextTier(a);
    $('#dlg-meter').innerHTML = `${S.icons.heart}<div class="dm-main"><div class="dm-top"><b>${ch.name}</b><span>${tierOf(a).name}</span></div>
      <div class="meter meter-sm"><span style="--to:${a}%"></span></div></div><span class="dm-num">${a}${nt ? `<small>/${nt.min}</small>` : ''}</span>`;
    if (pulse) { const m = $('#dlg-meter'); m.classList.remove('pulse'); void m.offsetWidth; m.classList.add('pulse'); }
  }

  function setExpr(expr) {
    const d = G.dlg;
    if (d.expr === expr) return;
    d.expr = expr;
    const p = $('#dlg-portrait');
    p.innerHTML = posed(d.sc.char, 'talk', expr);
  }

  function goNode(nid) {
    const d = G.dlg;
    let node = d.sc.nodes[nid];
    while (node && node.branch) {
      const hit = node.branch.find((b) => save.flags[b.flag]);
      node = d.sc.nodes[hit ? hit.next : node.next];
    }
    showNode(node);
  }

  /* who: 'narr', 'player' (your own line, echoed from a choice) or a character id. */
  function showNode(node) {
    G.dlg.node = node;
    const narr = node.who === 'narr', mine = node.who === 'player';
    if (node.expr && !mine) setExpr(node.expr);
    $('#dlg-portrait').classList.toggle('dim', narr || mine);
    const nameEl = $('#dlg-name');
    nameEl.hidden = narr;
    nameEl.textContent = narr ? '' : mine ? playerName() : charById[node.who].name;
    const face = $('#dlg-face');
    face.hidden = !mine;
    if (mine) face.innerHTML = playerPortrait(node.expr);
    $('#dlg-box').classList.toggle('narr', narr);
    $('#dlg-box').classList.toggle('mine', mine);
    $('#dlg-choices').innerHTML = '';
    $('#screen-dialogue').classList.remove('choosing');
    $('#dlg-next').hidden = true;
    typewrite(fill(node.text));
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
    const node = G.dlg.node;
    if (node.choices) {
      const box = $('#dlg-choices');
      $('#screen-dialogue').classList.add('choosing');
      box.innerHTML = node.choices.map((c, i) => `<button class="btn choice" data-action="choose" data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(fill(c.text))}</span></button>`).join('');
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
    if (d.node.choices) return;
    Sfx.play('tap');
    if (d.node.end) endScene();
    else goNode(d.node.next);
  }

  function choose(i) {
    const d = G.dlg;
    if (!d || d.typing || !d.node.choices) return;
    const c = d.node.choices[i];
    if (!c) return;
    if (c.flag) save.flags[c.flag] = true;
    if (c.aff) {
      const got = addAffection(d.sc.char, c.aff);
      d.gained = (d.gained || 0) + got;
      const fx = $('#dlg-fx');
      if (got > 0) { Sfx.play('heart'); floatFx(fx, `${S.icons.heart}+${got}`, 50, 34, 'fx-aff'); burstHearts(fx, 4, 50, 40); }
      else if (got < 0) { Sfx.play('wrong'); floatFx(fx, `${S.icons.heartEmpty}${got}`, 50, 34, 'fx-aff down'); }
      renderMeter(true);
    } else Sfx.play('tap');
    persist();
    // you say the line you picked, then the scene carries on
    const tone = c.you || (c.aff >= 6 ? 'blush' : c.aff >= 4 ? 'happy' : c.aff >= 1 ? 'smile' : c.aff < 0 ? 'sad' : 'neutral');
    showNode({ who: 'player', expr: tone, text: c.text, next: c.next });
    $('#dlg-box').focus({ preventScroll: true });
  }

  function endScene() {
    const d = G.dlg;
    clearInterval(d.timer);
    G.dlg = null;
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
      <p class="detail-title">${esc(c.title)} · ${esc(c.role)}</p>
      <p>${esc(c.personality)}</p>
      <dl class="detail-dl">
        <div><dt>Likes</dt><dd>${esc(c.likes)}</dd></div>
        <div><dt>Favorite order</dt><dd class="fav">${itemImg(fav.art)}<span>${esc(fav.name)}</span></dd></div>
        <div><dt>Story</dt><dd>${seen} of ${route.length} scenes seen</dd></div>
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
    const lumi = charById.lumi;
    $('#shop-note').textContent = `Décor makes the café cozier: every piece raises your tips. Current bonus: +${Math.round(decorBonus() * 100)}%.` +
      (!isMet('lumi') ? ` A stylish customer is waiting for ${lumi.unlock.count} pieces (${save.decor.length}/${lumi.unlock.count}).` : '');
    $('#shop-list').innerHTML = D.decor.map((d) => {
      const owned = save.decor.includes(d.id);
      const can = save.coins >= d.price;
      return `<article class="shop-item ${owned ? 'owned' : ''}">
        <div class="shop-art" data-preview="${d.id}"><img src="${propSrc(d.art)}" alt="" draggable="false"></div>
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
    if (d.treats) setTimeout(() => toast('Customers can now add treats to their orders.', 'unlock'), 400);
    const lumi = charById.lumi;
    if (!isMet('lumi') && save.decor.length === lumi.unlock.count) setTimeout(() => toast('Word is spreading… someone fashionable might visit on your next shift.', 'unlock'), 600);
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
    const toggle = (k, l) => `<button class="toggle" data-action="toggle-setting" data-k="${k}" role="switch" aria-checked="${!!settings[k]}"><span>${l}</span><span class="knob" aria-hidden="true"></span></button>`;
    openModal(`
      <h2 id="modal-title">Settings</h2>
      <div class="set-list">
        ${toggle('sound', 'Sound effects')}
        ${toggle('reduceMotion', 'Reduce motion')}
        <div class="set-row"><span>Text speed</span><div class="segs" role="group" aria-label="Text speed">${speedBtn('slow', 'Slow')}${speedBtn('normal', 'Normal')}${speedBtn('instant', 'Instant')}</div></div>
      </div>
      <p class="set-help">Controls: tap buttons, or use the keyboard. <kbd>Enter</kbd>/<kbd>Space</kbd> advance dialogue, <kbd>1</kbd>–<kbd>4</kbd> pick options and choices, hold <kbd>Space</kbd> to pour, <kbd>Esc</kbd> goes back.</p>
      ${save ? `<button class="btn btn-block" data-action="edit-player">${playerPortrait('smile').replace('art-player', 'art-player art-inline')} Change name or look</button>` : ''}
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
    document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
  }

  /* ---------- Create / edit the protagonist ---------- */
  let createTimer = null;
  function openCreate({ onDone, onCancel, edit = false }) {
    const current = (save && save.player) || { name: '', look: D.player.looks[0].id };
    G.create = { onDone, onCancel, look: current.look };
    $('#create-heading').textContent = edit ? 'Change your name or look' : 'Who\'s taking over the café?';
    $('#create-submit').textContent = edit ? 'Save' : 'Open the café';
    $('#player-name').value = current.name || '';
    $('#look-options').innerHTML = D.player.looks.map((l) => `
      <label class="look-card">
        <input type="radio" name="look" value="${l.id}" ${l.id === current.look ? 'checked' : ''}>
        <span class="look-art">${playerPortrait('smile', l)}</span>
        <span class="look-name">${esc(l.label)}</span>
      </label>`).join('');
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
  $('#create-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#player-name').value.replace(/[{}<>]/g, '').trim().slice(0, 16);
    const look = G.create.look;
    if (!save) save = freshSave();
    save.player = { name, look };
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
    if (save.phase === 'intro') {
      meet('milo');
      playScene('intro', () => { save.phase = 'hub'; persist(); beginShift(); });
      return;
    }
    if (save.phase === 'evening') { renderEvening(); show('evening'); return; }
    beginShift();
  }

  function continueGame() {
    if (!save) return;
    if (save.phase === 'intro') { startDay(); return; }
    if (save.phase === 'evening') { renderEvening(); show('evening'); return; }
    G.phase = 'hub'; G.shift = null;
    renderDecor();
    show('cafe');
    renderCafe();
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
      if (to === 'evening') renderEvening();
      show(to);
    },
    'open-cafe': beginShift,
    'take-order': takeOrder,
    'make-drink': openDrink,
    'next-customer': () => { G.shift.index++; nextCustomer(false); },
    pick: (el) => pickOption(el.dataset.id),
    'goto-step': (el) => { G.drink.step = +el.dataset.step; Sfx.play('tap'); renderDrink(); },
    'restart-drink': () => { G.drink = { sel: {}, step: 0, level: 0, pouring: false, pouredOnce: false }; Sfx.play('tap'); renderDrink(); },
    serve,
    'results-continue': () => { renderEvening(); show('evening'); },
    'evening-pick': (el) => {
      const id = el.dataset.id;
      const n = nextSceneFor(id);
      playScene(n.scene, () => {
        if (n.isNew) save.scenesSeen[id] = (save.scenesSeen[id] || 0) + 1;
        finishDay();
      });
    },
    'evening-skip': finishDay,
    choose: (el) => choose(+el.dataset.i),
    'char-detail': (el) => openCharacter(el.dataset.id),
    'detail-art': (el) => {
      const { id, kind } = el.dataset;
      stopTurnaround();
      if (kind === 'turn') startTurnaround(id);
      else $('#detail-portrait').innerHTML = portrait(id, { kind: kind === 'chibi' ? 'chibi' : kind, expr: 'happy' });
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
    if (G.screen === 'dialogue') {
      if ((e.key === 'Enter' || e.key === ' ') && !onButton) { e.preventDefault(); advance(); return; }
      if (/^[1-3]$/.test(e.key)) { choose(+e.key - 1); return; }
    }
    if (G.screen === 'drink' && G.drink) {
      const stepId = drinkSteps()[G.drink.step].id;
      if (stepId === 'pour' && e.key === ' ') { e.preventDefault(); if (!e.repeat) startPour(); return; }
      if (stepId !== 'pour' && /^[1-9]$/.test(e.key)) {
        const o = stepOptions(stepId)[+e.key - 1];
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
      c.patience = Math.max(0, c.patience - dt / D.economy.patienceSeconds);
      updatePatience();
    }
    const d = G.drink;
    if (d && d.pouring) {
      d.level = Math.min(1.15, d.level + dt * D.economy.pourRate);
      renderCup();
      pourSfx += dt;
      if (pourSfx > 0.09) { pourSfx = 0; Sfx.play('pour'); }
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
})();
