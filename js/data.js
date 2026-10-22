/* Purrfect Pour — game data.
 * Everything the game reads (ingredients, recipes, cast, décor, dialogue) lives here,
 * so new content can be added without touching the engine in game.js. */
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
      { id: 'mug', name: 'Mug' },
      { id: 'glass', name: 'Tall Glass' },
      { id: 'teacup', name: 'Teacup' },
    ],
    base: [
      { id: 'espresso', name: 'Espresso', color: '#6b3a2a' },
      { id: 'darkroast', name: 'Dark Roast', color: '#2c1914' },
      { id: 'earlgrey', name: 'Earl Grey', color: '#b8743f' },
      { id: 'matcha', name: 'Matcha', color: '#86b763' },
    ],
    milk: [
      { id: 'none', name: 'No Milk', color: null },
      { id: 'oat', name: 'Oat Milk', color: '#efdcbc' },
      { id: 'whole', name: 'Whole Milk', color: '#fffaf2' },
    ],
    syrup: [
      { id: 'none', name: 'No Syrup', color: null },
      { id: 'vanilla', name: 'Vanilla', color: '#f3d98f' },
      { id: 'strawberry', name: 'Strawberry', color: '#ee6f8c' },
      { id: 'lavender', name: 'Lavender', color: '#b09ae0' },
    ],
    topping: [
      { id: 'none', name: 'Nothing', color: null },
      { id: 'cream', name: 'Whipped Cream', color: '#fffdf8' },
      { id: 'cinnamon', name: 'Cinnamon', color: '#9a5a2e' },
      { id: 'sprinkles', name: 'Heart Sprinkles', color: '#f0587a' },
    ],
  };

  /* ---------- Recipes ---------- */
  const recipes = [
    {
      id: 'oat_latte', name: 'Oat Milk Latte', price: 12, hot: true,
      cup: 'mug', base: 'espresso', milk: 'oat', syrup: 'none', topping: 'cinnamon',
      blurb: 'Mellow espresso, toasty oat milk, a dusting of cinnamon.',
    },
    {
      id: 'midnight', name: 'Midnight Double', price: 11, hot: true,
      cup: 'mug', base: 'darkroast', milk: 'none', syrup: 'none', topping: 'none',
      blurb: 'Dark roast, nothing else. Strong enough to have opinions.',
    },
    {
      id: 'strawberry_cloud', name: 'Strawberry Cloud', price: 14, hot: false,
      cup: 'glass', base: 'espresso', milk: 'whole', syrup: 'strawberry', topping: 'cream',
      blurb: 'Pink layers, a shot of espresso and a pillow of cream.',
    },
    {
      id: 'lavender_fog', name: 'Lavender Fog', price: 13, hot: true,
      cup: 'teacup', base: 'earlgrey', milk: 'whole', syrup: 'lavender', topping: 'none',
      blurb: 'Earl Grey with steamed milk and a floral sweetness.',
    },
    {
      id: 'blossom_matcha', name: 'Blossom Matcha', price: 15, hot: false,
      cup: 'glass', base: 'matcha', milk: 'oat', syrup: 'vanilla', topping: 'sprinkles',
      blurb: 'Matcha over vanilla oat milk, finished with heart sprinkles.',
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

  /* ---------- Cast (all romanceable characters are adults) ---------- */
  const characters = [
    {
      id: 'milo', name: 'Milo', age: 24, title: 'The Shy Sketcher',
      role: 'Morning barista', color: '#f6cdd3',
      personality: 'Gentle, soft-spoken and observant. Hides in oversized cardigans, blushes easily, apologizes too much, and notices everything.',
      likes: 'Sketchbooks, rainy windows, oat milk lattes',
      favorite: 'oat_latte',
      unlockHint: 'Already works at the café.',
      unlock: { type: 'intro' },
      lines: {
        meet: 'Oh! Um, hi again, boss. I\'m on my break. Could I order like a real customer?',
        greet: ['Morning! I mean, hi. It\'s afternoon. Hi.', 'Is it okay if I sit by the window again?', 'I drew the latte art queue. Want to see later?'],
        order: 'Could I get an {drink}, please? Only if it\'s not too much trouble.',
        happy: ['It\'s perfect. You remembered the cinnamon.', 'This tastes like a warm blanket. Thank you.'],
        wrong: ['Oh, that\'s okay! It\'s… different. I\'ll still drink it.', 'It\'s fine, really! ...Was there cinnamon?'],
        gallery: ['I keep a sketch of every regular. Yours is my favorite. Don\'t tell anyone.', 'Rainy days are for drawing. Sunny days too, I guess.'],
      },
    },
    {
      id: 'riven', name: 'Riven', age: 26, title: 'The Midnight Regular',
      role: 'Night-owl musician', color: '#b993b4',
      personality: 'Dry humor, a magenta streak, a choker and too many buckles. Pretends not to care, then remembers your birthday.',
      likes: 'Vinyl, fire escapes, coffee strong enough to stand a spoon in',
      favorite: 'midnight',
      unlockHint: 'Drops by on your first day.',
      unlock: { type: 'visit' },
      lines: {
        meet: 'So you\'re the new owner. Cool. Don\'t ruin the coffee.',
        greet: ['Hey. Don\'t make it weird that I\'m here again.', 'It\'s too bright out. Your café is the correct amount of dim.', 'I wrote a song about your espresso machine. It\'s sad.'],
        order: 'A {drink}. Black as my soul. Or, you know, the recipe.',
        happy: ['...That\'s actually perfect. Don\'t tell anyone I smiled.', 'Strong. Bitter. Honest. Ten out of ten.'],
        wrong: ['This is… sweet. I\'m going to pretend this never happened.', 'Bold choice. Wrong, but bold.'],
        gallery: ['The eyeliner takes twelve minutes. Worth it.', 'If you tell people I\'m nice, I\'ll deny it.'],
      },
    },
    {
      id: 'atlas', name: 'Atlas', age: 29, title: 'The Gentle Giant',
      role: 'Moving-company muscle, secret baker', color: '#eab48f',
      personality: 'Huge, warm and earnest. Looks like he could bench-press the counter. Gets flustered by compliments.',
      likes: 'Sweet drinks, frosting roses, being helpful',
      favorite: 'strawberry_cloud',
      unlockHint: 'Drops by on your first day.',
      unlock: { type: 'visit' },
      lines: {
        meet: 'Hi! Sorry, I know I\'m blocking the doorway. I always am. Is the pink drink still on the menu?',
        greet: ['Boss! Hi! I carried your delivery in, hope that\'s okay.', 'I did leg day. I deserve something pink.', 'Your plant looks happy. I talked to it.'],
        order: 'Could I please have a {drink}? Extra cloud if that\'s allowed!',
        happy: ['It\'s so pretty I don\'t want to drink it! ...I\'m drinking it.', 'Best. Day. Ever. Thank you!'],
        wrong: ['Oh! It\'s, um, very brown. That\'s okay! I\'ll be brave.', 'No problem at all! Everyone makes mistakes!'],
        gallery: ['I can lift a piano, but I can\'t lift my eyes when you smile at me. Wait. Did I say that out loud?', 'Frosting roses are all in the wrist.'],
      },
    },
    {
      id: 'lumi', name: 'Lumi', age: 25, title: 'The Runway Darling',
      role: 'Fashion stylist and trendsetter', color: '#dccdf0',
      personality: 'Confident, glamorous and teasing, with a soft heart under the lip gloss. Notices good taste immediately.',
      likes: 'Ribbons, window displays, matcha with heart sprinkles',
      favorite: 'blossom_matcha',
      unlockHint: 'Only visits stylish cafés. Own 2 décor items.',
      unlock: { type: 'decor', count: 2 },
      lines: {
        meet: 'So this is the café everyone\'s whispering about. Cute lights. I approve, darling.',
        greet: ['Darling! Your window could use more ribbon. Later.', 'Don\'t look at my shoes, look at my eyes. ...Okay, look at the shoes too.', 'I brought you a sticker. It\'s a heart. Obviously.'],
        order: 'One {drink}, darling. Make it photogenic.',
        happy: ['Gorgeous. Ten out of ten, no notes.', 'This is going on my feed. You\'re going on my feed.'],
        wrong: ['Hm. Avant-garde. Not what I ordered, but avant-garde.', 'We\'ll call this one a rough draft, darling.'],
        gallery: ['Fashion is a love letter you wear.', 'I always fix my hair before I come in. You noticed? Good.'],
      },
    },
  ];

  /* Character art lives in assets/characters/<id>-{bust,full,chibi}.webp
   * (sliced from the sheets in assets/source by tools/slice-art.py). */
  const artKinds = ['bust', 'full', 'chibi'];

  /* ---------- Neighborhood regulars (non-romanceable customers) ----------
   * Regulars have no illustrations yet, so they use procedural pixel sprites. */
  const regulars = [
    { id: 'juniper', name: 'Juniper', look: { skin: '#f4d2bd', hair: '#7a5a8c', hairStyle: 'long', cloth: '#9ec9b3', outfit: 'sweater', eyes: '#4b6b8a', ear: 'pointy' } },
    { id: 'pip', name: 'Pip', look: { skin: '#e8b996', hair: '#3d2b25', hairStyle: 'fluffy', cloth: '#f2b880', outfit: 'hoodie', eyes: '#3d6b4a', ear: 'pointy' } },
    { id: 'hazel', name: 'Hazel', look: { skin: '#fbe2d4', hair: '#b06a4a', hairStyle: 'short', cloth: '#c7b5e8', outfit: 'sweater', eyes: '#6b4a2b', ear: 'round' } },
    { id: 'mochi', name: 'Mochi', look: { skin: '#a8724f', hair: '#f5ece0', hairStyle: 'fluffy', cloth: '#f4a6b4', outfit: 'blouse', eyes: '#3b2a24', ear: 'fold' } },
    { id: 'sable', name: 'Sable', look: { skin: '#7a4f3a', hair: '#1f1a1a', hairStyle: 'long', cloth: '#f1d27a', outfit: 'hoodie', eyes: '#c58b3a', ear: 'tall' } },
  ];

  const regularLines = {
    greet: ['Hello! First time here since the new owner. It smells amazing.', 'The cat tower rumors are true, I hope?', 'Long day. I need something cozy.', 'My friend said the lattes here are magic.'],
    order: 'Could I get a {drink}, please?',
    happy: ['Lovely! I\'ll be back tomorrow.', 'Oh, that\'s exactly right. Thank you!'],
    wrong: ['Hmm, not quite what I asked for, but thanks.', 'That\'s… a different drink. Oh well!'],
  };

  /* ---------- Décor upgrades ---------- */
  const decor = [
    { id: 'plant', name: 'Potted Monstera', price: 40, bonus: 0.05, desc: 'A big leafy friend by the window. Customers relax.' },
    { id: 'chairs', name: 'Pastel Chairs', price: 70, bonus: 0.08, desc: 'Mint and pink seats with a tiny round table.' },
    { id: 'lights', name: 'Fairy Lights', price: 90, bonus: 0.1, desc: 'Twinkling strings across the window and ceiling.' },
    { id: 'neon', name: 'Neon Heart Sign', price: 110, bonus: 0.1, desc: 'A soft pink glow that says "open, and in love".' },
    { id: 'tower', name: 'Cat Tower', price: 150, bonus: 0.12, desc: 'A plush tower for Biscuit, the café\'s resident cat.' },
  ];

  /* ---------- Story scenes ----------
   * Node fields: who ('narr' | character id), expr, text, next, end,
   * choices [{ text, aff, flag, next }], branch [{ flag, next }] (first match wins, else next). */
  const scenes = {
    intro: {
      title: 'The Velvet Paw', char: 'milo', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', text: 'A brass key, a recipe box, and a note in your aunt\'s looping handwriting: "The Velvet Paw is yours now. Be kind to the regulars. They\'re softer than they look."', next: 'n2' },
        n2: { who: 'narr', text: 'The café smells like cinnamon and old wood. Sunlight spills over mismatched cups and a very sleepy espresso machine.', next: 'n3' },
        n3: { who: 'milo', expr: 'flustered', text: 'Oh! You must be the new owner. I\'m Milo. I open the café most mornings. Sorry, I\'m not great at first impressions.', next: 'n4' },
        n4: { who: 'milo', expr: 'neutral', text: 'Every order comes with a ticket. Pick the cup, the base, milk, syrup and topping. The recipe is written right on it.', next: 'n5' },
        n5: { who: 'milo', expr: 'happy', text: 'Then hold to pour and let go inside the pink band. Customers notice a perfect pour. They tip for it, too.', next: 'c1' },
        c1: {
          who: 'milo', expr: 'blush', text: 'Um. Any questions, boss?',
          choices: [
            { text: 'I\'m lucky you\'re here, Milo.', aff: 4, next: 'r1' },
            { text: 'Any tips for a total beginner?', aff: 2, next: 'r2' },
            { text: 'Let\'s open up!', aff: 1, next: 'r3' },
          ],
        },
        r1: { who: 'milo', expr: 'flustered', text: 'L-lucky? Me? Okay. I\'ll do my best to keep being… lucky. For you. For the café!', next: 'end' },
        r2: { who: 'milo', expr: 'happy', text: 'Watch their faces, not the clock. And regulars always order their favorite. You\'ll learn them fast.', next: 'end' },
        r3: { who: 'milo', expr: 'happy', text: 'Right! Yes! Opening! I\'ll flip the sign.', next: 'end' },
        end: { who: 'milo', expr: 'neutral', text: 'The first customer\'s already at the door. Good luck. You\'ve got this.', end: true },
      },
    },

    milo_1: {
      title: 'Sketches After Closing', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', expr: 'neutral', text: 'After closing, you find Milo at the corner table, bent over a sketchbook. Pencil shavings, an empty oat latte cup.', next: 'n2' },
        n2: { who: 'milo', expr: 'flustered', text: 'Ah! I didn\'t hear you. I was just… it\'s nothing. Doodles.', next: 'c1' },
        c1: {
          who: 'narr', expr: 'blush', text: 'He hugs the sketchbook to his chest. His tail curls around the chair leg.',
          choices: [
            { text: 'Can I see?', aff: 5, next: 'a1' },
            { text: 'Doodles can still be beautiful.', aff: 3, next: 'b1' },
            { text: 'Shouldn\'t you head home?', aff: -2, next: 'x1' },
          ],
        },
        a1: { who: 'milo', expr: 'blush', text: '…Okay. Only because it\'s you. Please don\'t laugh.', next: 'show' },
        b1: { who: 'milo', expr: 'happy', text: 'That\'s what my art teacher used to say. You\'d have gotten along. Here, you can look.', next: 'show' },
        x1: { who: 'milo', expr: 'sad', text: 'Oh. Right. Sorry, I\'ll get out of your way.', next: 'x2' },
        x2: {
          who: 'narr', expr: 'sad', text: 'He packs up slowly, ears drooping.',
          choices: [
            { text: 'Wait, stay. I didn\'t mean it like that.', aff: 4, next: 'x3' },
            { text: 'See you tomorrow, Milo.', aff: 0, next: 'cold' },
          ],
        },
        x3: { who: 'milo', expr: 'blush', text: '…Okay. Five more minutes. Do you, um, want to see what I was drawing?', next: 'show' },
        show: { who: 'narr', expr: 'blush', text: 'The pages are full of the café: steam curling off cups, Atlas mid-laugh, Riven scowling at the rain. And a small, careful drawing of you behind the counter.', next: 'c2' },
        c2: {
          who: 'milo', expr: 'flustered', text: 'I can explain that last one. Actually, I can\'t.',
          choices: [
            { text: 'You drew me? It\'s lovely.', aff: 6, flag: 'milo_drew_you', next: 'd1' },
            { text: 'These belong on the café walls.', aff: 5, flag: 'milo_gallery', next: 'd2' },
            { text: 'You made my hair look great.', aff: 3, next: 'd3' },
          ],
        },
        d1: { who: 'milo', expr: 'blush', text: 'I draw things I like looking at. That came out wrong. Or… maybe it came out right.', next: 'end' },
        d2: { who: 'milo', expr: 'happy', text: 'In the café? Like a real gallery? …I\'d like that. A lot.', next: 'end' },
        d3: { who: 'milo', expr: 'happy', text: 'It\'s easy when the model has good hair. Oh no. I said that out loud.', next: 'end' },
        cold: { who: 'milo', expr: 'neutral', text: 'Goodnight, boss. Lock the back door, it sticks.', end: true },
        end: { who: 'milo', expr: 'happy', text: 'Thank you for tonight, boss. I mean, you know what I mean. Goodnight!', end: true },
      },
    },

    milo_2: {
      title: 'A Date at the Gallery', char: 'milo', bg: 'dusk',
      nodes: {
        start: { who: 'narr', expr: 'blush', text: 'Milo slid a ticket across the counter this morning: the Lantern Street gallery, Sunday evening. "If you\'re free," he\'d said, ears pink.', next: 'br' },
        br: { branch: [{ flag: 'milo_gallery', next: 'g1' }, { flag: 'milo_drew_you', next: 'g2' }], next: 'g3' },
        g1: { who: 'milo', expr: 'happy', text: 'I kept thinking about what you said, about my drawings on the wall. I wanted to see what a real wall looks like. With you.', next: 'n2' },
        g2: { who: 'milo', expr: 'blush', text: 'I finished the drawing of you. It\'s in my bag. I\'ll show you after. If I\'m brave enough.', next: 'n2' },
        g3: { who: 'milo', expr: 'flustered', text: 'I\'ve never asked anyone to an art gallery before. Is this weird? It\'s weird.', next: 'n2' },
        n2: { who: 'narr', expr: 'neutral', text: 'You wander between watercolors. He stops at a small painting of a café window in the rain.', next: 'n3' },
        n3: { who: 'milo', expr: 'neutral', text: 'This one\'s why I started drawing. It made a rainy day feel safe.', next: 'c1' },
        c1: {
          who: 'narr', expr: 'blush', text: 'He glances at you, then back at the painting.',
          choices: [
            { text: 'Your drawings make me feel that way too.', aff: 7, next: 'a1' },
            { text: 'What makes you feel safe now?', aff: 6, next: 'b1' },
            { text: 'Want to get dessert after?', aff: 4, next: 'c1r' },
          ],
        },
        a1: { who: 'milo', expr: 'flustered', text: 'You can\'t just say things like that. My tail is doing a thing.', next: 'end' },
        b1: { who: 'milo', expr: 'blush', text: 'Honestly? Mornings at the café. With you.', next: 'end' },
        c1r: { who: 'milo', expr: 'happy', text: 'Yes! There\'s a crêpe place with the strawberry ones. I\'ve been saving it for a special occasion.', next: 'end' },
        end: { who: 'narr', expr: 'blush', text: 'On the walk back, his hand brushes yours. Neither of you mentions it. Neither of you lets go.', end: true },
      },
    },

    riven_1: {
      title: 'Rooftop Static', char: 'riven', bg: 'stars',
      nodes: {
        start: { who: 'narr', expr: 'neutral', text: 'Taking the trash out after closing, you find Riven on the fire escape, headphones around his neck, watching the city lights.', next: 'n2' },
        n2: { who: 'riven', expr: 'smirk', text: 'Relax, I\'m not breaking in. Your aunt let me sit up here. Guess I should ask the new management.', next: 'c1' },
        c1: {
          who: 'narr', expr: 'neutral', text: 'He raises one perfectly lined eyebrow.',
          choices: [
            { text: 'Stay as long as you like.', aff: 5, next: 'a1' },
            { text: 'Only if you share what you\'re listening to.', aff: 6, flag: 'riven_music', next: 'b1' },
            { text: 'Isn\'t it cold up here?', aff: 2, next: 'c1r' },
          ],
        },
        a1: { who: 'riven', expr: 'blush', text: '…Huh. Okay. Thanks.', next: 'n3' },
        b1: { who: 'riven', expr: 'smirk', text: 'Bold. Fine. It\'s a band you\'ve never heard of. That\'s the point. He holds out one earbud.', next: 'n3' },
        c1r: { who: 'riven', expr: 'neutral', text: 'Cold\'s honest. It doesn\'t pretend to be anything else.', next: 'n3' },
        n3: { who: 'narr', expr: 'neutral', text: 'The city hums. For a while neither of you speaks, and it isn\'t awkward.', next: 'n4' },
        n4: { who: 'riven', expr: 'sad', text: 'Everyone thinks the eyeliner means I\'m scary. Mostly it means I\'m tired.', next: 'c2' },
        c2: {
          who: 'narr', expr: 'neutral', text: 'His tail flicks once against the railing.',
          choices: [
            { text: 'You don\'t seem scary. You seem kind.', aff: 7, next: 'd1' },
            { text: 'Tired of what?', aff: 5, next: 'd2' },
            { text: 'The eyeliner looks good on you.', aff: 4, next: 'd3' },
          ],
        },
        d1: { who: 'riven', expr: 'flustered', text: 'Don\'t spread that around. I have a reputation.', next: 'end' },
        d2: { who: 'riven', expr: 'blush', text: 'Of being the guy people expect. At your counter, nobody expects anything. It\'s nice.', next: 'end' },
        d3: { who: 'riven', expr: 'smirk', text: 'Obviously. …But thanks.', next: 'end' },
        end: { who: 'riven', expr: 'happy', text: 'Your coffee\'s too strong, by the way. Don\'t ever change it.', end: true },
      },
    },

    riven_2: {
      title: 'Spin Records', char: 'riven', bg: 'dusk',
      nodes: {
        start: { who: 'narr', expr: 'neutral', text: 'Riven texts you a single word, "records?", and an address. The shop is narrow, dusty and perfect.', next: 'br' },
        br: { branch: [{ flag: 'riven_music', next: 'm1' }], next: 'm2' },
        m1: { who: 'riven', expr: 'blush', text: 'I found that song from the rooftop on vinyl. Figured you should hear it properly. With both earbuds. Metaphorically.', next: 'c1' },
        m2: { who: 'riven', expr: 'neutral', text: 'This shop\'s been here longer than I have. The owner saves the weird stuff for me.', next: 'c1' },
        c1: {
          who: 'riven', expr: 'smirk', text: 'So. Want me to judge your taste in music?',
          choices: [
            { text: 'Pick a record for me.', aff: 6, next: 'a1' },
            { text: 'Let me pick one for you.', aff: 5, next: 'b1' },
            { text: 'Do you play anything?', aff: 6, next: 'c1r' },
          ],
        },
        a1: { who: 'riven', expr: 'happy', text: 'This one\'s soft. Don\'t tell anyone I own soft music.', next: 'n2' },
        b1: { who: 'riven', expr: 'flustered', text: 'A love song compilation? You\'re terrible. …I\'m buying it.', next: 'n2' },
        c1r: { who: 'riven', expr: 'blush', text: 'Bass. Badly. Maybe I\'ll play for you sometime. Badly.', next: 'n2' },
        n2: { who: 'riven', expr: 'blush', text: 'Hey. I don\'t really do this. The hanging-out thing. But I like doing it with you.', next: 'c2' },
        c2: {
          who: 'narr', expr: 'neutral', text: 'He fidgets with the ring on his thumb.',
          choices: [
            { text: 'I like it too.', aff: 6, next: 'e1' },
            { text: 'Is this a date, Riven?', aff: 7, next: 'e2' },
          ],
        },
        e1: { who: 'riven', expr: 'happy', text: 'Good. Then it\'s a thing now. Our thing.', end: true },
        e2: { who: 'riven', expr: 'flustered', text: 'Maybe. Possibly. …Yes. Don\'t make it weird.', end: true },
      },
    },

    atlas_1: {
      title: 'Heavy Lifting', char: 'atlas', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', expr: 'neutral', text: 'A delivery of flour sacks arrives late. Before you can work out how to move them, Atlas lifts three at once.', next: 'n2' },
        n2: { who: 'atlas', expr: 'happy', text: 'Where d\'you want these, boss? Oh, sorry. Is it okay if I call you boss?', next: 'c1' },
        c1: {
          who: 'narr', expr: 'neutral', text: 'He waits, sacks balanced on one shoulder like they\'re pillows.',
          choices: [
            { text: 'Boss is fine. Thank you, Atlas!', aff: 4, next: 'a1' },
            { text: 'Wow. You\'re really strong.', aff: 6, next: 'b1' },
            { text: 'You didn\'t have to do that.', aff: 3, next: 'c1r' },
          ],
        },
        a1: { who: 'atlas', expr: 'happy', text: 'Anytime! I like being useful.', next: 'n3' },
        b1: { who: 'atlas', expr: 'flustered', text: 'I- it\'s just flour! It\'s not that impressive! …Is it impressive?', next: 'n3' },
        c1r: { who: 'atlas', expr: 'blush', text: 'I wanted to. People usually think I\'m here to fix the shelves, not to drink pink lattes.', next: 'n3' },
        n3: { who: 'narr', expr: 'happy', text: 'Afterward he sits on an upturned crate, sipping the last Strawberry Cloud of the night with visible joy.', next: 'n4' },
        n4: { who: 'atlas', expr: 'blush', text: 'Can I tell you something embarrassing? I bake. Little cakes. With frosting flowers.', next: 'c2' },
        c2: {
          who: 'narr', expr: 'flustered', text: 'His ears go flat, waiting for you to laugh.',
          choices: [
            { text: 'Bring some in! We\'ll sell them.', aff: 7, flag: 'atlas_bake', next: 'd1' },
            { text: 'That\'s adorable.', aff: 5, next: 'd2' },
            { text: 'Teach me sometime?', aff: 6, flag: 'atlas_teach', next: 'd3' },
          ],
        },
        d1: { who: 'atlas', expr: 'happy', text: 'R-really? In the display case? With my name on the little tag?', next: 'end' },
        d2: { who: 'atlas', expr: 'flustered', text: 'I\'m six foot five. I\'m not adorable. …Okay, maybe the frosting is.', next: 'end' },
        d3: { who: 'atlas', expr: 'happy', text: 'Yes! Saturday mornings. Bring an apron. Bring two, it gets messy.', next: 'end' },
        end: { who: 'atlas', expr: 'happy', text: 'Thanks for not laughing. Most people laugh. Goodnight, boss!', end: true },
      },
    },

    atlas_2: {
      title: 'Flour & Frosting', char: 'atlas', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', expr: 'happy', text: 'Saturday morning. Atlas arrives with a box of piping tips and his favorite apron, the one with the heart pin.', next: 'br' },
        br: { branch: [{ flag: 'atlas_bake', next: 'b1' }, { flag: 'atlas_teach', next: 'b2' }], next: 'b3' },
        b1: { who: 'atlas', expr: 'happy', text: 'I made a batch for the display case! Look, a tag! "Atlas\'s Blossom Cakes"!', next: 'n2' },
        b2: { who: 'atlas', expr: 'happy', text: 'You remembered! Okay, first lesson: the frosting knows when you\'re nervous.', next: 'n2' },
        b3: { who: 'atlas', expr: 'blush', text: 'I brought the good piping tips. Want to bake with me?', next: 'n2' },
        n2: { who: 'narr', expr: 'happy', text: 'Flour gets everywhere. Especially on Atlas\'s nose.', next: 'c1' },
        c1: {
          who: 'narr', expr: 'neutral', text: 'He has no idea.',
          choices: [
            { text: 'Wipe the flour off his nose.', aff: 7, next: 'a1' },
            { text: 'Tell him about the flour.', aff: 4, next: 'a2' },
            { text: 'Let him finish his frosting rose.', aff: 5, next: 'a3' },
          ],
        },
        a1: { who: 'atlas', expr: 'flustered', text: 'Y-you- thank you. I\'m going to need a minute.', next: 'n3' },
        a2: { who: 'atlas', expr: 'happy', text: 'Ha! I\'m leaving it. It\'s a badge of honor.', next: 'n3' },
        a3: { who: 'atlas', expr: 'happy', text: 'Here. First rose is for you. That\'s the rule. I just made the rule.', next: 'n3' },
        n3: { who: 'atlas', expr: 'blush', text: 'I used to think I had to look tough all the time. Around you I forget to.', next: 'c2' },
        c2: {
          who: 'narr', expr: 'blush', text: 'His tail sways slowly behind him.',
          choices: [
            { text: 'You don\'t have to be tough here.', aff: 6, next: 'e1' },
            { text: 'I like the soft version of you best.', aff: 7, next: 'e2' },
          ],
        },
        e1: { who: 'atlas', expr: 'happy', text: 'Then this is my favorite place in the whole city. Okay. Second lesson: hugs. For the frosting. I mean. Never mind.', end: true },
        e2: { who: 'atlas', expr: 'flustered', text: 'That\'s. That\'s a lot of feelings for nine in the morning. Can I hug you? Is that allowed?', end: true },
      },
    },

    lumi_1: {
      title: 'Window Display', char: 'lumi', bg: 'dusk',
      nodes: {
        start: { who: 'narr', expr: 'neutral', text: 'Your newest regular, Lumi, has been studying your front window for ten minutes, tapping a pen against glossy lips.', next: 'n2' },
        n2: { who: 'lumi', expr: 'smirk', text: 'Darling, the café is lovely, but this window is begging for a theme. May I?', next: 'c1' },
        c1: {
          who: 'narr', expr: 'happy', text: 'A roll of ribbon has already appeared in his hand.',
          choices: [
            { text: 'Go wild.', aff: 6, next: 'a1' },
            { text: 'What theme are you thinking?', aff: 5, next: 'a2' },
            { text: 'Only if I get to help.', aff: 7, flag: 'lumi_help', next: 'a3' },
          ],
        },
        a1: { who: 'lumi', expr: 'happy', text: 'Oh, I\'m going to. Hand me the ribbon.', next: 'n3' },
        a2: { who: 'lumi', expr: 'neutral', text: 'Spring romance. Blossoms, lace, little paper hearts. Your café has a soft heart. Let\'s show it off.', next: 'n3' },
        a3: { who: 'lumi', expr: 'blush', text: 'A collaborator? Mm. I like you more every minute.', next: 'n3' },
        n3: { who: 'narr', expr: 'happy', text: 'An hour later the window glows with paper blossoms and ribbon. People slow down on the sidewalk to look.', next: 'n4' },
        n4: { who: 'lumi', expr: 'blush', text: 'People think fashion is shallow. It isn\'t. It\'s how I tell people who I am before I say a word.', next: 'c2' },
        c2: {
          who: 'narr', expr: 'neutral', text: 'He tucks a strand of lavender hair behind one ear.',
          choices: [
            { text: 'So what does today\'s outfit say?', aff: 6, next: 'd1' },
            { text: 'It says you\'re wonderful.', aff: 7, next: 'd2' },
            { text: 'I\'d like to know you without the outfit too.', aff: 5, next: 'd3' },
          ],
        },
        d1: { who: 'lumi', expr: 'smirk', text: '"I\'m here to be adored, and also to fix your window." Accurate, no?', next: 'end' },
        d2: { who: 'lumi', expr: 'flustered', text: '…Oh. That landed. Give me a second.', next: 'end' },
        d3: { who: 'lumi', expr: 'blush', text: 'The version in pajamas with a face mask on? You\'ll have to earn that, darling.', next: 'end' },
        end: { who: 'lumi', expr: 'happy', text: 'Same time next week. Bring snacks. Strawberry ones.', end: true },
      },
    },

    /* Short repeatable evening chats, used when no new story scene is available. */
    milo_chat: {
      title: 'Quiet Evening', char: 'milo', bg: 'cafe-night', chat: true,
      nodes: {
        start: { who: 'milo', expr: 'happy', text: 'I tried a new pencil today. It\'s very… pencil-y. In a good way.', next: 'c1' },
        c1: {
          who: 'milo', expr: 'blush', text: 'Sorry, that was a boring story.',
          choices: [
            { text: 'Tell me everything about the pencil.', aff: 3, next: 'a' },
            { text: 'Nothing about you is boring.', aff: 4, next: 'b' },
          ],
        },
        a: { who: 'milo', expr: 'happy', text: 'It\'s a 4B. It smudges like a cloud. You\'re the only person who ever asks.', end: true },
        b: { who: 'milo', expr: 'flustered', text: 'Oh. Oh no. I\'m going to think about that all night.', end: true },
      },
    },
    riven_chat: {
      title: 'Last Call', char: 'riven', bg: 'stars', chat: true,
      nodes: {
        start: { who: 'riven', expr: 'smirk', text: 'Closing time already? Your clock is a liar.', next: 'c1' },
        c1: {
          who: 'narr', expr: 'neutral', text: 'He doesn\'t move toward the door.',
          choices: [
            { text: 'One more cup, on the house.', aff: 3, next: 'a' },
            { text: 'Walk me to the corner?', aff: 4, next: 'b' },
          ],
        },
        a: { who: 'riven', expr: 'happy', text: 'Careful. Keep spoiling me and I\'ll start showing up in daylight.', end: true },
        b: { who: 'riven', expr: 'blush', text: '…Yeah. Sure. It\'s on my way. It isn\'t on my way.', end: true },
      },
    },
    atlas_chat: {
      title: 'Closing Shift', char: 'atlas', bg: 'cafe-night', chat: true,
      nodes: {
        start: { who: 'atlas', expr: 'happy', text: 'I stacked all the chairs! And then I unstacked one, so you have somewhere to sit.', next: 'c1' },
        c1: {
          who: 'atlas', expr: 'blush', text: 'Is that weird? That might be weird.',
          choices: [
            { text: 'It\'s thoughtful. Sit with me?', aff: 4, next: 'a' },
            { text: 'Did you save me a cake too?', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'atlas', expr: 'flustered', text: 'I\'ll unstack another one! Right now! Very fast!', end: true },
        b: { who: 'atlas', expr: 'happy', text: 'Always. It\'s in the fridge with a little heart on the box.', end: true },
      },
    },
    lumi_chat: {
      title: 'Golden Hour', char: 'lumi', bg: 'dusk', chat: true,
      nodes: {
        start: { who: 'lumi', expr: 'smirk', text: 'Golden hour, darling. Stand right there. The light loves you.', next: 'c1' },
        c1: {
          who: 'narr', expr: 'neutral', text: 'He frames you with his fingers like a camera.',
          choices: [
            { text: 'Strike a pose.', aff: 3, next: 'a' },
            { text: 'Get in the picture with me.', aff: 4, next: 'b' },
          ],
        },
        a: { who: 'lumi', expr: 'happy', text: 'Iconic. You\'re a natural. I\'m only slightly jealous.', end: true },
        b: { who: 'lumi', expr: 'blush', text: 'Together? …Fine. But I\'m keeping this one to myself.', end: true },
      },
    },
  };

  /* Story progression per character: scenes play in order once affection reaches `min`. */
  const routes = {
    milo: [{ scene: 'milo_1', min: 0 }, { scene: 'milo_2', min: 20 }],
    riven: [{ scene: 'riven_1', min: 0 }, { scene: 'riven_2', min: 20 }],
    atlas: [{ scene: 'atlas_1', min: 0 }, { scene: 'atlas_2', min: 20 }],
    lumi: [{ scene: 'lumi_1', min: 0 }],
  };

  /* First day is hand-authored so every player meets the core cast. */
  const firstShift = [
    { who: 'juniper', drink: 'lavender_fog' },
    { who: 'atlas', drink: 'strawberry_cloud' },
    { who: 'milo', drink: 'oat_latte' },
    { who: 'riven', drink: 'midnight' },
  ];

  window.GAME_DATA = {
    steps, ingredients, recipes, tiers, characters, artKinds, regulars, regularLines, decor, scenes, routes, firstShift,
    economy: { startCoins: 25, patienceSeconds: 45, pourRate: 0.62 },
  };
})();
