/* Purrfect Pour — game data.
 * Ingredients, recipes, the cast, the protagonist, recurring guests and décor live here.
 * The story itself (scenes, events, little moments) is in story.js. */
(function () {
  'use strict';

  /* ---------- Ingredients (one list per preparation step) ---------- */
  const steps = [
    { id: 'cup', label: 'Cup' },
    { id: 'base', label: 'Base' },
    { id: 'milk', label: 'Milk' },
    { id: 'syrup', label: 'Syrup' },
    { id: 'topping', label: 'Topping' },
    { id: 'pour', label: 'Pour' },
  ];

  const ingredients = {
    cup: [
      { id: 'mug', name: 'Mug', art: 'items/cup-mug' },
      { id: 'glass', name: 'Tall Glass', art: 'items/cup-glass' },
      { id: 'teacup', name: 'Teacup', art: 'items/cup-teacup' },
    ],
    base: [
      { id: 'espresso', name: 'Espresso', color: '#6b3a2a', art: 'items/base-espresso' },
      { id: 'darkroast', name: 'Dark Roast', color: '#2c1914', art: 'ui/items/beans' },
      { id: 'earlgrey', name: 'Earl Grey', color: '#b8743f', art: 'ui/items/tea-leaves' },
      { id: 'matcha', name: 'Matcha', color: '#86b763', art: 'items/base-matcha' },
    ],
    milk: [
      { id: 'none', name: 'No Milk', color: null, art: 'ui/items/none' },
      { id: 'oat', name: 'Oat Milk', color: '#efdcbc', art: 'items/milk-oat' },
      { id: 'whole', name: 'Whole Milk', color: '#fffaf2', art: 'items/milk-whole' },
    ],
    syrup: [
      { id: 'none', name: 'No Syrup', color: null, art: 'ui/items/none' },
      { id: 'honey', name: 'Honey', color: '#e7b04b', art: 'ui/items/honey' },
      { id: 'vanilla', name: 'Vanilla', color: '#f3d98f', art: 'ui/items/syrup-vanilla' },
      { id: 'strawberry', name: 'Strawberry', color: '#ee6f8c', art: 'items/syrup-strawberry' },
      { id: 'lavender', name: 'Lavender', color: '#b09ae0', art: 'items/syrup-lavender' },
    ],
    topping: [
      { id: 'none', name: 'Nothing', color: null, art: 'ui/items/none' },
      { id: 'cinnamon', name: 'Cinnamon', color: '#9a5a2e', art: 'items/top-cinnamon' },
      { id: 'foam', name: 'Extra Foam', color: '#f6ecdf', art: 'items/top-cream' },
      { id: 'ice', name: 'Ice', color: '#cfeaf5', art: 'items/top-ice' },
      { id: 'sprinkles', name: 'Heart Sprinkles', color: '#f0587a', art: 'ui/hearts/heart-small' },
    ],
  };

  /* ---------- Recipes ----------
   * `secret` recipes stay off the menu until a story moment adds them. */
  const recipes = [
    {
      id: 'honey_oat', art: 'items/drink-heart-latte', name: 'Honey Oat Latte', price: 12,
      cup: 'mug', base: 'espresso', milk: 'oat', syrup: 'honey', topping: 'cinnamon',
      blurb: 'Espresso, oat milk and honey, with exactly as much cinnamon as Rosalie considers “a little.”',
    },
    {
      id: 'iced_americano', art: 'items/drink-iced-latte', name: 'Iced Americano', price: 10,
      cup: 'glass', base: 'espresso', milk: 'none', syrup: 'none', topping: 'ice',
      blurb: 'Espresso over ice and cold water. Best ordered with the seriousness of a peace treaty.',
    },
    {
      id: 'strawberry_latte', art: 'ui/items/mug', name: 'Strawberry Latte', price: 13,
      cup: 'mug', base: 'espresso', milk: 'whole', syrup: 'strawberry', topping: 'foam',
      blurb: 'Pink, sweet, and crowned with extra foam.',
    },
    {
      id: 'lavender_fog', art: 'items/drink-lavender-latte', name: 'Lavender Fog', price: 13,
      cup: 'teacup', base: 'earlgrey', milk: 'whole', syrup: 'lavender', topping: 'none',
      blurb: 'Earl Grey with steamed milk and a floral sweetness.',
    },
    {
      id: 'blossom_matcha', art: 'items/drink-strawberry-matcha', name: 'Blossom Matcha', price: 14,
      cup: 'glass', base: 'matcha', milk: 'oat', syrup: 'vanilla', topping: 'sprinkles',
      blurb: 'Matcha over vanilla oat milk, finished with heart sprinkles.',
    },
    {
      id: 'black_coffee', art: 'items/drink-espresso', name: 'Black Coffee', price: 9,
      cup: 'mug', base: 'darkroast', milk: 'none', syrup: 'none', topping: 'none',
      blurb: 'Dark roast, nothing else. Fuel for exams and long afternoons.',
    },
    {
      id: 'market_special', art: 'ui/items/mug', name: 'Night Market Special', price: 15, secret: true,
      cup: 'teacup', base: 'espresso', milk: 'whole', syrup: 'honey', topping: 'sprinkles',
      blurb: 'The new menu item everyone argued about. Honey, espresso and heart sprinkles.',
    },
  ];

  /* ---------- Affection tiers ---------- */
  const tiers = [
    { min: 0, name: 'Stranger' },
    { min: 10, name: 'Acquaintance' },
    { min: 25, name: 'Friend' },
    { min: 45, name: 'Close Friend' },
    { min: 70, name: 'Crush' },
    { min: 90, name: 'Sweetheart' },
  ];

  /* ---------- The four romance routes (all adults) ----------
   * Order templates: {drink} is the drink's name, {adrink} adds "a"/"an",
   * {Adrink} capitalizes it. `favOrder` replaces `order` for their signature drink. */
  const characters = [
    {
      id: 'milo', name: 'Milo', age: 23, title: 'The person who notices',
      role: 'Rosalie’s weekend barista and an aspiring illustrator', color: '#f6cdd3',
      personality: 'Knows which drawer sticks, which customers need extra time, and exactly how much cinnamon Rosalie considers “a little.” Draws tiny pictures on takeaway cups, and has secretly designed an entire new café menu that he keeps calling “just something silly.”',
      detail: 'His tail curls around his ankle whenever he’s nervous.',
      favorite: 'honey_oat',
      unlockHint: 'Meets you at the door on your first morning.',
      lines: {
        greet: ['On my break. Can I order like a real customer?', 'I finished the dishes. And the other dishes. Hi.', 'Juniper says hi. She said it to the window, but it counts.'],
        order: 'Could I get {adrink}? Only if it’s not too much trouble.',
        favOrder: 'Honey oat latte, please. I’ll know if you skip the cinnamon.',
        happy: ['This tastes like a warm blanket. Thank you.', 'You’re getting good at this. Like, really good.'],
        wrong: ['Oh, that’s okay! It’s… different. I’ll still drink it.', 'It’s fine, really! I’ll draw it a little face.'],
        favHappy: ['Exactly as much cinnamon as Rosalie considers “a little.” How did you know?'],
        favWrong: ['It’s fine! It’s good! ...Was there honey?'],
        gallery: ['I draw everyone who comes in more than three times. That’s the rule.', 'Don’t look at the cups by the register. Or do. No. Don’t.'],
      },
    },
    {
      id: 'riven', name: 'Riven', age: 25, title: 'The person who stays',
      role: 'Record-store employee, musician and late-afternoon regular', color: '#b993b4',
      personality: 'Orders coffee with the seriousness of someone negotiating a peace treaty. Sits near the outlet and claims he likes the café because it’s quiet. Has repaired three chairs, fixed your speaker and labeled the extension cords, and insists none of it means anything.',
      detail: 'His ears turn toward your voice before he looks at you.',
      favorite: 'iced_americano',
      side: { name: 'Strawberry Pastry', price: 5 },
      unlockHint: 'A late-afternoon regular. Turns up in your first week.',
      lines: {
        meet: 'Is that outlet taken? Good. It’s quiet here. I like quiet.',
        greet: ['Same seat. Same outlet. Don’t make it weird.', 'It’s quiet here. That’s the only reason.', 'I fixed the hinge on your back door. Don’t mention it.'],
        order: 'One {drink}. I’ve considered this carefully.',
        favOrder: 'Iced americano. And the strawberry pastry. For later.',
        // once you're close, the pastry stops being for later
        favOrderClose: 'Iced americano. And the strawberry pastry. Two forks.',
        happy: ['...That’s actually perfect.', 'Acceptable. Very acceptable.'],
        wrong: ['Bold choice. Wrong, but bold.', 'I’ll drink it. Out of respect.'],
        favHappy: ['Strong. Cold. Honest. Ten out of ten.'],
        favWrong: ['This is… sweet. I’m going to pretend this never happened.'],
        gallery: ['I like it here because it’s quiet. That’s all.', 'The extension cords were a fire hazard. I did it for the cords.'],
      },
    },
    {
      id: 'atlas', name: 'Atlas', age: 27, title: 'The person who helps',
      role: 'Florist’s delivery assistant and enthusiastic amateur baker', color: '#eab48f',
      personality: 'Your early-morning helper, pastry tester and unofficial protector of the café’s most fragile furniture. Wants to start selling his own baking, but keeps giving everything away instead.',
      detail: 'His tail gives away his excitement long before his face does.',
      favorite: 'strawberry_latte',
      unlockHint: 'Arrives with a delivery that absolutely required two people.',
      lines: {
        meet: 'Can I get a strawberry latte? Extra foam. Carrying things builds an appetite.',
        greet: ['Morning! Have you eaten? You look like you haven’t eaten.', 'I brought scones. They’re for everyone. Mostly you.', 'Noor says hi! Noor says a lot of things, but mainly hi.'],
        order: 'Could I please have {adrink}?',
        favOrder: 'Strawberry latte, please! Extra foam. Extra-extra, if that’s allowed.',
        happy: ['It’s so pretty I don’t want to drink it! ...I’m drinking it.', 'Best. Day. Ever. Thank you!'],
        wrong: ['No problem at all! Everyone makes mistakes!', 'It’s… a surprise! I love surprises. Mostly.'],
        favHappy: ['Look at that foam. LOOK at it.'],
        favWrong: ['Oh! It’s, um, not very pink. That’s okay! I’ll be brave.'],
        gallery: ['I can carry a refrigerator. I probably shouldn’t, but I can.', 'Frosting roses are all in the wrist.'],
      },
    },
    {
      id: 'sora', name: 'Sora', age: 24, title: 'The person who chooses',
      role: 'Fashion stylist and occasional café event planner', color: '#dccdf0',
      personality: 'Enters looking like he has somewhere better to be, then spends forty minutes helping you choose ribbon for the pastry boxes. Feminine, confident, observant and very funny. Enjoys dressing beautifully, and eating cake directly out of the storage container.',
      detail: 'He adjusts his hair bow when he’s trying to buy time.',
      favorite: 'lavender_fog',
      unlockHint: 'Notices cafés that are making an effort. Some décor might help.',
      lines: {
        greet: ['I’m only here for five minutes.', 'Your napkins are folded wrong. I’ll fix it after coffee.', 'Don’t look at my shoes. ...Okay, look at the shoes.'],
        order: 'One {drink}. Make it photogenic.',
        favOrder: 'Lavender fog. You know how I like it.',
        happy: ['Gorgeous. No notes.', 'This is going on my feed. You’re going on my feed.'],
        wrong: ['Hm. Avant-garde. Not what I ordered, but avant-garde.', 'We’ll call this one a rough draft.'],
        favHappy: ['Perfect. I’d say I’m impressed, but I expected it.'],
        favWrong: ['Where’s the lavender? The lavender is the whole personality.'],
        gallery: ['I practice being unbearable. It’s a discipline.', 'Plates are for people with time.'],
      },
    },
  ];

  /* Expressions a scene node's `expr` can use. Each cast member has a bust and a
   * chibi image for every one (assets/characters/<id>/, cut from the sheets in
   * assets/source by tools/slice-art.py). */
  const expressions = ['neutral', 'happy', 'blush', 'flustered', 'surprised', 'sad', 'pensive', 'smirk'];

  /* ---------- Staff tasks (unlocked on day 15) ---------- */
  const staffTasks = {
    milo: { task: 'Prep', desc: 'A wider pink band, so perfect pours are easier.', perfectFrom: 0.72 },
    riven: { task: 'Tickets', desc: 'Orders stay organized, so customers stay patient longer.', patience: 0.6 },
    atlas: { task: 'Counter', desc: 'Sells a pastry with every order: +3 coins each.', perOrder: 3 },
    sora: { task: 'Front of house', desc: 'Everything faces the door. Tips +15%.', tips: 0.15 },
  };

  /* ---------- The protagonist ----------
   * The player picks a look, a name and pronouns. In any line, {name} is the name and
   * {they} {them} {their} {theirs} {themself} {theyre} are pronouns ({They} etc. capitalize).
   * Each look has its own bust expressions; a missing one falls back to the closest match. */
  const player = {
    defaultName: 'Y/N',
    pronouns: [
      { id: 'she', label: 'she/her', they: 'she', them: 'her', their: 'her', theirs: 'hers', themself: 'herself', theyre: 'she’s' },
      { id: 'he', label: 'he/him', they: 'he', them: 'him', their: 'his', theirs: 'his', themself: 'himself', theyre: 'he’s' },
      { id: 'they', label: 'they/them', they: 'they', them: 'them', their: 'their', theirs: 'theirs', themself: 'themself', theyre: 'they’re' },
    ],
    // `frames` is the number of turnaround images (turn-0 faces front); looks without
    // an expression sheet only have a neutral bust.
    looks: [
      { id: 'player-a', label: 'Curly crop', frames: 7,
        expressions: ['neutral', 'content', 'smile', 'talk', 'happy', 'laugh', 'smirk', 'pensive', 'surprised', 'sad', 'blush'] },
      { id: 'player-b', label: 'Soft waves', frames: 7,
        expressions: ['neutral', 'content', 'talk', 'excited', 'smile', 'happy', 'laugh', 'shy', 'sad', 'surprised', 'flustered', 'blush'] },
      { id: 'player-c', label: 'Bouncy bob', frames: 1, expressions: ['neutral'] },
      { id: 'player-d', label: 'Honey curls', frames: 1, expressions: ['neutral'] },
      { id: 'player-e', label: 'Dark curls', frames: 1, expressions: ['neutral'] },
      { id: 'player-f', label: 'Afro & bow', frames: 1, expressions: ['neutral'] },
      { id: 'player-g', label: 'Long braids', frames: 1, expressions: ['neutral'] },
      { id: 'player-h', label: 'Soft curls', frames: 1, expressions: ['neutral'] },
      { id: 'player-i', label: 'Honey swoop', frames: 1, expressions: ['neutral'] },
      { id: 'player-j', label: 'Swept curls', frames: 1, expressions: ['neutral'] },
      { id: 'player-k', label: 'Coils & beard', frames: 1, expressions: ['neutral'] },
      { id: 'player-l', label: 'Braids & beard', frames: 1, expressions: ['neutral'] },
    ],
    fallback: {
      flustered: ['shy', 'blush'], shy: ['blush'], smirk: ['smile'], pensive: ['content', 'neutral'],
      excited: ['laugh', 'happy'], talk: ['smile'], content: ['smile'], laugh: ['happy'],
    },
  };

  /* ---------- Recurring guests ----------
   * Art: assets/characters/<id>/full.webp and bust-<expression>.webp.
   * Each visit can deliver the next story beat once its day has come (`minDay`); the
   * last beat finishes their story. A beat may change the order (`drink`, `order`).
   * `reward`: 'tips' adds +5% tips, 'chairs' restores the Pastel Chairs for free. */
  const guests = [
    {
      id: 'juniper', name: 'Juniper', from: 1, favorite: 'lavender_fog',
      expressions: ['neutral', 'happy', 'content'],
      blurb: 'Writes a novel at her usual table.',
      order: 'My usual, please.',
      beats: [
        { minDay: 1, text: 'My usual, please.' },
        { minDay: 3, text: 'My detective solved the case this morning. Now she has to figure out what to do with the rest of her life.' },
        { minDay: 8, text: 'I wrote a scene set in a café last night. Don’t worry. The owner is very competent.' },
        { minDay: 14, text: 'I finished the draft. Two hundred and twelve pages, and most of them happened at that table by the window.' },
        { minDay: 20, text: 'This is going to sound bold. Could I hold my first reading here? At the Night Market?' },
      ],
      idle: ['The novel is going. Slowly. Like a cat deciding where to sit.', 'Don’t mind me. I’m staring out the window professionally.'],
    },
    {
      id: 'dante', name: 'Dante', from: 1, favorite: 'black_coffee',
      expressions: ['neutral', 'happy', 'content'],
      blurb: 'Studies for a difficult professional exam.',
      order: 'Black coffee. To go. Please.',
      orderDone: '{Adrink}. For here. I live here now.',
      beats: [
        { minDay: 1, text: 'My exam’s in three weeks, which is basically tomorrow. I need caffeine with no personality.' },
        { minDay: 5, text: 'If I sit down, I’ll fall asleep, and if I fall asleep, I’ll dream about tax code.' },
        { minDay: 10, text: 'The library asked me to leave for sighing too loudly. Can I sit here instead?', order: 'Black coffee. For here, actually.' },
        { minDay: 17, text: 'My exam’s tomorrow. Nothing sweet. Sweet is for after.' },
        { minDay: 18, text: 'I passed. I PASSED. I’m going to sit down and do absolutely nothing for an hour.', drink: 'strawberry_latte', order: 'Something with extra foam. For here. I’m celebrating.' },
      ],
      idle: ['Flashcards. Twelve hundred of them. Nine hundred are right.', 'Don’t ask how studying’s going. It’s going.'],
    },
    {
      id: 'mina', name: 'Mina', from: 1, favorite: 'blossom_matcha',
      expressions: ['neutral', 'happy', 'content'],
      blurb: 'Photographs the neighborhood.',
      order: '{Adrink}, please. It photographs beautifully.',
      beats: [
        { minDay: 1, text: 'Do you mind if I take a picture of the counter? At four o’clock the light hits it like a movie set.' },
        { minDay: 5, text: 'I’ve been photographing every doorway on Bellflower Lane. Yours is my favorite. Don’t tell the bakery.' },
        { minDay: 11, text: 'I printed a few. Would it be strange to bring them in? Just to see how they look on a wall.' },
        { minDay: 16, text: 'Okay. Hear me out. A tiny exhibition. Here. Twelve photos, one wall, no pressure.' },
      ],
      idle: ['The light’s wrong today. I’ll have a coffee and wait for it to fix itself.', 'I took forty photos of your door this week. It’s a very good door.'],
    },
    {
      id: 'santiago', name: 'Santiago', from: 2, favorite: 'honey_oat',
      expressions: ['neutral', 'happy', 'content'],
      blurb: 'Brings postcards from places he visited with his spouse.',
      order: '{Adrink}, if you would.',
      beats: [
        { minDay: 2, text: 'Your aunt kept my postcards by the register. Here, this one’s Lisbon. We got lost there on purpose, twice.' },
        { minDay: 6, text: 'Kyoto, in the spring. We missed every train and didn’t mind once.' },
        { minDay: 12, text: 'I have a whole shoebox of these. People keep asking where they’re from. Maybe it’s time they went somewhere new.' },
        { minDay: 19, text: 'I had an idea. A postcard exchange. Everyone on the lane writes one, and we trade at the Night Market. Would you hang a box by the door?' },
      ],
      idle: ['Another postcard for the box. Prague, this time. It rained the whole trip and we laughed the whole time.', 'Rosalie would scold me for being here so early. Don’t tell her.'],
    },
    {
      id: 'noor', name: 'Noor', from: 2, favorite: 'iced_americano', reward: 'tips',
      expressions: ['neutral', 'happy', 'sad'],
      blurb: 'Runs the flower shop on the corner and trades centerpieces for drinks during busy weeks.',
      order: '{Adrink}, quickly, before the shop notices I’m gone.',
      beats: [
        { minDay: 2, text: 'I’m Noor, from the flower shop on the corner. Rosalie and I have an arrangement. Literally. Flowers for coffee.' },
        { minDay: 7, text: 'My delivery assistant tells me he carried your refrigerator. He was very proud. He told the tulips.' },
        { minDay: 13, text: 'Busy weeks are coming. I’ll keep your tables in flowers if you keep me in coffee. That’s the Rosalie deal.' },
        { minDay: 21, text: 'Bellflowers for the Night Market. Every table. On the house. Well, on the house in exchange for coffee until the end of time.' },
      ],
      idle: ['Five minutes. That’s all the shop can spare me.', 'If anyone asks, the petals on my sleeve are a fashion choice.'],
    },
    {
      id: 'beau', name: 'Beau', from: 4, favorite: 'black_coffee', reward: 'chairs',
      expressions: ['neutral', 'happy', 'sad'],
      blurb: 'Quietly repairs old furniture.',
      order: 'Just {adrink}. And maybe five minutes of the quiet.',
      beats: [
        { minDay: 4, text: 'Rosalie’s old chairs are stacked in your storage room. She says they’re beyond saving. I’m Beau. I disagree with Rosalie, respectfully.' },
        { minDay: 8, text: 'Took two of the chairs home. Found a coin from 1998 in a cushion. Yours, technically.' },
        { minDay: 12, text: 'Solid oak under all that paint. Somebody loved these once. Give me a week.' },
        { minDay: 16, text: 'Your chairs are back. Sanded and painted pastel, because someone with a hair bow threatened me. Sit in one. Carefully. Then not carefully.' },
      ],
      idle: ['Sanding today. My arms are tired and my soul is calm.', 'Don’t mind the sawdust. It means things are getting better.'],
    },
    {
      id: 'cleo', name: 'Cleo', from: 5, favorite: 'strawberry_latte',
      expressions: ['neutral', 'happy', 'sad'],
      blurb: 'Hosts a book club with increasingly passionate disagreements about fictional relationships.',
      order: '{Adrink}, please! And a spare napkin. The discussion gets heated.',
      beats: [
        { minDay: 5, text: 'Could I reserve the big table on Thursdays? It’s for my book club. We’re very civilized. Mostly.' },
        { minDay: 9, text: 'We nearly came to blows over whether the pirate deserved forgiveness. He did not. He absolutely did.' },
        { minDay: 14, text: 'New rule: no throwing scones. Old rule, actually. We just had to say it out loud.' },
        { minDay: 19, text: 'We voted to read Juniper’s manuscript next. She cried. Then she made us all sign something.' },
      ],
      idle: ['The club has a new controversy. I’ll spare you. For now.', 'Quick question: is it romantic or concerning if someone waits forty years? Don’t answer. I’m testing the room.'],
    },
    {
      id: 'rowan', name: 'Rowan', from: 8, favorite: 'blossom_matcha',
      expressions: ['neutral', 'happy', 'sad'],
      blurb: 'Designs the Night Market poster and keeps changing its color palette.',
      order: 'Same drink, please. {Adrink}.',
      beats: [
        { minDay: 8, text: 'Hi. I’m doing the Night Market poster. Do you have opinions about teal? Don’t answer. I’ll change it anyway.' },
        { minDay: 12, text: 'New palette. Coral and cream. Same drink, though. The drink is the only thing I’m sure about.' },
        { minDay: 17, text: 'It’s lavender now. Sora said “bold,” which I’ve decided was a compliment.' },
        { minDay: 23, text: 'Final version. Final final. I printed a hundred. Can one go in your window?' },
      ],
      idle: ['Same drink. Different color palette. Don’t ask which.', 'I dreamed about kerning. That’s normal, right?'],
    },
  ];
  const guestLines = {
    happy: ['Perfect. Thank you!', 'Oh, that’s lovely. I’ll be back tomorrow.', 'Exactly right. You’re good at this.'],
    wrong: ['Hmm, not quite what I asked for. That’s okay.', 'That’s… a different drink. Oh well!'],
  };

  /* ---------- Décor upgrades ----------
   * `art` is an image in assets/props/; css/style.css positions it as .prop-<id>. */
  const decor = [
    { id: 'plant', name: 'Potted Monstera', price: 120, bonus: 0.05, art: 'monstera', desc: 'A big leafy friend by the window. Customers relax.' },
    { id: 'chairs', name: 'Pastel Chairs', price: 200, bonus: 0.08, art: 'chair', desc: 'Lavender cushions and a bow, for guests who plan to stay.' },
    { id: 'chalkboard', name: 'Chalkboard Menu', price: 260, bonus: 0.06, art: 'chalkboard', desc: 'A framed sign with a latte-art cat. Milo’s drawings finally get a wall.' },
    { id: 'lamp', name: 'Petal Lamp', price: 320, bonus: 0.08, art: 'pendant-lamp', desc: 'A pink glass pendant that makes every latte look golden.' },
    { id: 'bookshelf', name: 'Corner Bookshelf', price: 420, bonus: 0.06, art: 'bookshelf', desc: 'Secondhand paperbacks and a very small framed cat.' },
    { id: 'tower', name: 'Cat Tower', price: 560, bonus: 0.12, art: 'cat-tower', desc: 'A plush lavender tower for Biscuit, the café’s resident cat.' },
  ];

  window.GAME_DATA = {
    steps, ingredients, recipes, tiers, characters, expressions, staffTasks, player, guests, guestLines, decor,
    economy: {
      startCoins: 30, patienceSeconds: 45, pourRate: 0.62,
      marketDay: 30,   // the Bellflower Night Market (finale)
      confessAt: 50,   // affection needed for a confession at the finale
    },
  };
})();
