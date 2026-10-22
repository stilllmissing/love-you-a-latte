/* Purrfect Pour — the story.
 * Thirty days on Bellflower Lane, ending at the Bellflower Night Market.
 *
 * Scene format
 *   { title, char, bg, aff, affTo, nodes }   char: cast or guest id shown first (optional)
 *   bg: 'cafe-day' | 'cafe-night' | 'morning' | 'dusk' | 'stars'
 *   aff: affection given to `affTo` (default `char`) when the scene finishes
 * Node format
 *   who: 'narr' | 'player' | cast id | guest id      expr: expression for that speaker
 *   show: character to display during narration      bg: change the background
 *   text: string, or a function of the story context  next / end: what follows
 *   choices: [{ text, aff, to, flag, set, next, say, you, met, if }]
 *     to: who gets the affection ('closest', 'helper' or an id; default: the scene's char)
 *     say: false for actions that aren't spoken; met: only offered once you've met them
 *   branch: [{ flag | if, next }] first match wins, else `next`
 *   if: skip this node unless the function returns true
 *   set: { flag, route, usual, menuName } effects when the node (or choice) happens
 * Text tokens: {name} {NAME} {they} {them} {their} {theirs} {themself} {theyre}
 * (capitalize for {They} etc.), {closest} {partner} {waiting} {helper} {usual} {ausual}.
 *
 * Scenes marked "foundation" use the story foundation's dialogue as written.
 * Scenes marked "new" were written to connect them and can be replaced freely. */
(function () {
  'use strict';

  const CAST = ['milo', 'riven', 'atlas', 'sora'];

  /* ---------- Scheduled story events ---------- */
  const events = [
    { id: 'atlas_arrival', day: 2, at: 'morning', scene: 'atlas_arrival', meet: 'atlas' },
    { id: 'rain_check', day: 10, at: 'evening', scene: 'rain_check' },
    { id: 'better_system', day: 15, at: 'evening', scene: 'better_system' },
    { id: 'night_market', day: 30, at: 'evening', scene: 'night_market', finale: true },
  ];

  /* Customers with a scene of their own. `slot` is their place in the day's line.
   * intro plays instead of the usual greeting; outro plays after you serve them. */
  const scripted = [
    { day: 1, slot: 0, who: 'juniper', drink: 'lavender_fog', beat: 0, intro: 'your_usual', outro: 'your_usual_after', orderLine: 'Lavender fog. Rosalie always remembered.' },
    { day: 2, slot: 0, who: 'atlas', drink: 'strawberry_latte' },
    { day: 3, slot: 2, who: 'riven', drink: 'iced_americano', outro: 'the_speaker', firstVisit: true },
    { when: (c) => !c.met('sora') && (c.day >= 6 || (c.day >= 4 && c.decorCount >= 1)), slot: 1, who: 'sora', drink: 'lavender_fog',
      intro: 'presentation_matters', orderLine: 'And I’ll have that. The lavender fog.', firstVisit: true },
  ];

  /* Day 15: a guest's post brings a rush. After the third order, someone finds you in the back. */
  const rush = { day: 15, count: 7, patience: 1.45, after: 2, scene: 'too_many_orders' };

  /* Evening scenes per character, in order. Each needs `min` affection and day `day`. */
  const routes = {
    milo: [{ scene: 'milo_1', min: 0 }, { scene: 'milo_2', min: 22, day: 6 }, { scene: 'milo_3', min: 38, day: 11 }],
    riven: [{ scene: 'riven_1', min: 0 }, { scene: 'riven_2', min: 22, day: 6 }, { scene: 'riven_3', min: 38, day: 11 }],
    atlas: [{ scene: 'atlas_1', min: 0 }, { scene: 'atlas_2', min: 22, day: 6 }, { scene: 'atlas_3', min: 38, day: 11 }],
    sora: [{ scene: 'sora_1', min: 0 }, { scene: 'sora_2', min: 22, day: 6 }, { scene: 'sora_3', min: 38, day: 11 }],
  };
  /* Short repeatable evenings for when the next route scene isn't ready yet. */
  const chats = {
    milo: ['milo_chat_1', 'milo_chat_2', 'milo_chat_3'],
    riven: ['riven_chat_1', 'riven_chat_2', 'riven_chat_3'],
    atlas: ['atlas_chat_1', 'atlas_chat_2', 'atlas_chat_3'],
    sora: ['sora_chat_1', 'sora_chat_2', 'sora_chat_3'],
  };

  /* Little moments between bigger scenes. At most one a day, each only once.
   * `at`: 'morning' (before opening) or 'evening' (after closing). */
  const moments = [
    { id: 'usual', at: 'evening', scene: 'moment_usual', when: (c) => c.day >= 4 && c.met('milo') && !c.usual },
    { id: 'crown', at: 'evening', scene: 'moment_crown', when: (c) => c.day >= 2 && c.met('milo') && c.last && c.last.allCorrect && c.last.served >= 4 },
    { id: 'haunted', at: 'evening', scene: 'moment_haunted', when: (c) => c.day >= 7 && c.met('riven') && c.met('sora') },
    { id: 'latte_photo', at: 'evening', scene: 'moment_latte_photo', when: (c) => c.day >= 5 && c.guestMet('mina') && c.last && c.last.imperfect },
    { id: 'container', at: 'morning', scene: 'moment_container', when: (c) => c.aff('atlas') >= 30 },
    { id: 'ribbon', at: 'morning', scene: 'moment_ribbon', when: (c) => c.aff('sora') >= 30 },
    { id: 'remembered', at: 'evening', scene: 'moment_usual_remembered', when: (c) => c.day >= 14 && c.usual && c.guestBeat('juniper') >= 3 },
    { id: 'asleep', at: 'evening', scene: 'moment_asleep', when: (c) => c.day >= 17 && c.last && c.last.helper },
    { id: 'name_drink', at: 'evening', scene: 'moment_name_drink', when: (c) => c.day >= 18 && CAST.every((id) => c.met(id)) },
    { id: 'our_cafe', at: 'evening', scene: 'moment_our_cafe', when: (c) => c.day >= 24 && c.aff(c.closest()) >= 55 },
  ];

  /* Night Market guest lines, for each regular whose story is complete. */
  const marketGuests = {
    juniper: 'Juniper reads chapter one to a crowd that keeps growing. When she reaches the café scene, half the room turns to look at you.',
    dante: 'Dante brings his whole study group, orders far too many lattes, and makes a toast to “the table by the outlet.”',
    mina: 'Mina’s photographs fill the wall by the window: doorways, rain, your hands on the espresso machine. She takes one more of all of you and says it’s her favorite.',
    santiago: 'Santiago’s postcard box is full by nine o’clock. Someone writes one to Rosalie. Someone writes one to the café.',
    noor: 'Noor’s bellflowers sit on every table, and Atlas makes sure everyone knows he carried them.',
    beau: 'Every chair Beau restored is taken. He stands at the back anyway, watching people sit in them.',
    cleo: 'Cleo’s book club claims the big table and argues, loudly and lovingly, about whether you and {closest} are “a slow burn or just slow.”',
    rowan: 'Rowan’s poster is on every lamppost on the lane. The final version is teal, the very first color they tried.',
  };

  function guestNodes() {
    const ids = Object.keys(marketGuests);
    const nodes = {};
    ids.forEach((id, i) => {
      nodes['g_' + id] = {
        who: 'narr', show: id, expr: 'happy', text: marketGuests[id],
        if: (c) => c.guestDone(id), next: i + 1 < ids.length ? 'g_' + ids[i + 1] : 'g_none',
      };
    });
    nodes.g_none = {
      who: 'narr', text: 'Somewhere in the crowd, a few of your regulars are telling strangers which table is the best one.',
      if: (c) => c.guestsDone() === 0, next: 'service',
    };
    return nodes;
  }

  const scenes = {
    /* ================= Main story ================= */

    // foundation: 1. Opening, “The Keys” (prologue lines from the setting)
    opening: {
      title: 'The Keys', char: 'milo', bg: 'morning',
      nodes: {
        start: { who: 'narr', text: 'Your aunt Rosalie has run The Velvet Paw for twenty years. Now she’s finally taking the long trip she keeps postponing, and you have the keys for a month.', next: 'p2' },
        p2: { who: 'narr', text: 'She gave you three instructions: “Water the plants. Pay the suppliers. And don’t let anyone convince you the espresso machine is haunted.”', next: 'p3' },
        p3: { who: 'narr', text: 'The Bellflower Night Market is thirty days away, and the café hosts its evening gathering. This year, that’s up to you.', next: 'k1' },
        k1: { who: 'narr', text: 'You arrive carrying a suitcase and a paper bag containing a breakfast you’ve already crushed.', next: 'k2' },
        k2: { who: 'narr', text: 'The key catches in the lock.', next: 'k3' },
        k3: { who: 'player', expr: 'smirk', text: 'Good start.', next: 'k4' },
        k4: { who: 'narr', text: 'Someone speaks behind you.', next: 'k5' },
        k5: { who: 'milo', expr: 'neutral', text: 'Lift the handle first.', next: 'k6' },
        k6: { who: 'narr', text: 'You turn. A pink-cardigan catboy stands beside two grocery bags.', next: 'k7' },
        k7: { who: 'milo', expr: 'flustered', text: 'Sorry. I wasn’t watching you struggle.', next: 'k8' },
        k8: { who: 'narr', text: 'A pause.', next: 'k9' },
        k9: { who: 'milo', expr: 'smirk', text: 'For very long.', next: 'k10' },
        k10: { who: 'narr', text: 'You lift the handle. The door opens.', next: 'k11' },
        k11: { who: 'narr', bg: 'cafe-day', text: 'Inside, sunlight falls across pink seats, dusty shelves, and a folded apron.', next: 'k12' },
        k12: { who: 'narr', text: 'On the counter is Rosalie’s note: “The coffee beans arrive Tuesday. Milo knows everything. Please remember to eat.”', next: 'k13' },
        k13: { who: 'milo', expr: 'happy', text: 'I’m Milo. I work weekends. And, apparently, today.', next: 'c1' },
        c1: {
          who: 'narr', show: 'milo', expr: 'neutral', text: 'Milo sets the grocery bags on the counter and waits.',
          choices: [
            { text: 'Then I guess you’re in charge.', aff: 3, next: 'a1' },
            { text: 'Please tell me you know how the machine works.', aff: 3, next: 'b1' },
            { text: 'Did she leave instructions for the eating part?', aff: 4, next: 'c2' },
          ],
        },
        a1: { who: 'narr', show: 'milo', expr: 'happy', text: 'Milo laughs and helps you settle in.', next: 'a2' },
        a2: { who: 'milo', expr: 'happy', text: 'Every order gets a ticket with the recipe on it. Hold to pour, and let go in the pink band. That’s most of it.', next: 'end' },
        b1: { who: 'milo', expr: 'flustered', text: 'Yes! Mostly. Okay. Every order gets a ticket, and the recipe’s right on it. Cup, base, milk, syrup, topping.', next: 'b2' },
        b2: { who: 'milo', expr: 'neutral', text: 'Then you hold to pour and let go in the pink band. Not above it. The machine judges you.', next: 'b3' },
        b3: { who: 'milo', expr: 'blush', text: 'It doesn’t. It’s not haunted. Rosalie made me promise to say that.', next: 'end' },
        c2: { who: 'narr', show: 'milo', expr: 'happy', text: 'He produces a second breakfast from his bag.', next: 'c3' },
        c3: { who: 'milo', expr: 'blush', text: 'I thought you might forget.', next: 'c4' },
        c4: { who: 'milo', expr: 'neutral', text: 'Recipes are on the tickets, by the way. Hold to pour, and let go in the pink band.', next: 'end' },
        end: { who: 'narr', text: 'At nine o’clock, Milo flips the sign to Open.', end: true },
      },
    },

    // foundation: 2. First shift, “Your Usual”
    your_usual: {
      title: 'Your Usual', char: 'juniper', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', show: 'juniper', expr: 'neutral', text: 'Juniper approaches the counter.', next: 'n2' },
        n2: { who: 'juniper', expr: 'happy', text: 'My usual, please.', next: 'n3' },
        n3: { who: 'narr', show: 'milo', expr: 'neutral', text: 'You look at Milo.', next: 'n4' },
        n4: { who: 'narr', show: 'milo', expr: 'surprised', text: 'Milo looks at you.', next: 'n5' },
        n5: { who: 'player', expr: 'smile', text: 'An ambitious opening order.', next: 'n6' },
        n6: { who: 'narr', show: 'juniper', expr: 'happy', text: 'Juniper smiles.', next: 'n7' },
        n7: { who: 'juniper', expr: 'content', text: 'Lavender fog. Rosalie always remembered.', next: 'n8' },
        n8: { who: 'narr', show: 'milo', expr: 'neutral', text: 'Milo quietly slides the recipe book toward you.', end: true },
      },
    },
    your_usual_after: {
      title: 'Your Usual', char: 'juniper', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', show: 'juniper', expr: 'neutral', text: 'Juniper notices your nervous expression.', next: 'n2' },
        n2: { who: 'juniper', expr: 'happy', text: 'You can ask next time, sweetheart. Knowing someone takes practice.', next: 'n3' },
        n3: { who: 'narr', text: 'Later, inside the cover of Rosalie’s recipe book, under a cinnamon stain, you find a fourth instruction: “Make somewhere people want to come back to.”', end: true },
      },
    },

    // foundation: 3. Atlas’s arrival, “Heavy Lifting”
    atlas_arrival: {
      title: 'Heavy Lifting', char: 'atlas', bg: 'morning',
      nodes: {
        start: { who: 'narr', text: 'A large delivery blocks the café door.', next: 'n2' },
        n2: { who: 'narr', text: 'From behind it:', next: 'n3' },
        n3: { who: 'atlas', expr: 'happy', text: 'Before you ask, yes, this is the right address.', next: 'n4' },
        n4: { who: 'narr', text: 'He sets the refrigerator down and straightens.', next: 'n5' },
        n5: { who: 'player', expr: 'surprised', text: 'You carried that yourself?', next: 'n6' },
        n6: { who: 'atlas', expr: 'happy', text: 'Only from the van.', next: 'n7' },
        n7: { who: 'player', expr: 'neutral', text: 'Where’s the van?', next: 'n8' },
        n8: { who: 'narr', text: 'He points halfway down the street.', next: 'n9' },
        n9: { who: 'narr', show: 'atlas', expr: 'pensive', text: 'His ears lower.', next: 'n10' },
        n10: {
          who: 'atlas', expr: 'flustered', text: 'It looked closer when I started.',
          choices: [
            { text: 'You’ve earned breakfast.', aff: 4, next: 'a1' },
            { text: 'Next time, ask me to help.', aff: 3, next: 'b1' },
            { text: 'Do you deliver all your refrigerators this charmingly?', aff: 5, next: 'c1' },
          ],
        },
        a1: { who: 'narr', show: 'atlas', expr: 'happy', text: 'His tail starts going long before his face catches up.', next: 'a2' },
        a2: { who: 'atlas', expr: 'happy', text: 'I never say no to breakfast. That’s sort of my whole problem.', next: 'end' },
        b1: { who: 'atlas', expr: 'surprised', text: 'Ask you? You’d take the other end?', next: 'b2' },
        b2: { who: 'atlas', expr: 'happy', text: 'Okay. Deal. Next refrigerator, you’re on the other end.', next: 'end' },
        c1: { who: 'atlas', expr: 'flustered', text: 'I—usually there’s paperwork.', next: 'c2' },
        c2: { who: 'narr', show: 'atlas', expr: 'flustered', text: 'He looks down at the delivery form.', next: 'c3' },
        c3: { who: 'atlas', expr: 'flustered', text: 'There is paperwork. Right. Great.', next: 'end' },
        end: { who: 'atlas', expr: 'happy', text: 'I’m Atlas, by the way. I deliver for Noor’s flower shop. And sometimes refrigerators, apparently.', end: true },
      },
    },

    // foundation: 4. Riven’s arrival, “The Speaker”
    the_speaker: {
      title: 'The Speaker', char: 'riven', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', text: 'The café speaker makes a terrible crackling noise.', next: 'n2' },
        n2: { who: 'narr', show: 'riven', expr: 'neutral', text: 'Riven looks up from his coffee.', next: 'n3' },
        n3: { who: 'riven', expr: 'neutral', text: 'That cable’s dying.', next: 'n4' },
        n4: { who: 'player', expr: 'smirk', text: 'So is the atmosphere.', next: 'n5' },
        n5: { who: 'narr', text: 'He holds out a hand.', next: 'n6' },
        n6: { who: 'riven', expr: 'neutral', text: 'Give me a minute.', next: 'n7' },
        n7: { who: 'narr', text: 'A few minutes later, music fills the café cleanly.', next: 'n8' },
        n8: { who: 'player', expr: 'happy', text: 'Can I pay you?', next: 'n9' },
        n9: { who: 'riven', expr: 'smirk', text: 'You could stop calling that playlist ‘Jazz, Probably.’', next: 'n10' },
        n10: { who: 'narr', text: 'You stare at him.', next: 'n11' },
        n11: { who: 'player', expr: 'surprised', text: 'You read the name?', next: 'n12' },
        n12: {
          who: 'riven', expr: 'neutral', text: 'It was on the screen.',
          choices: [
            { text: 'Pick the next song.', aff: 5, next: 'a1' },
            { text: 'Your next coffee is free.', aff: 3, next: 'b1' },
            { text: 'So you’ve been paying attention to me?', aff: 5, next: 'c1' },
          ],
        },
        a1: { who: 'riven', expr: 'pensive', text: '...Fine. One song. Then it’s your problem again.', next: 'a2' },
        a2: { who: 'narr', show: 'riven', expr: 'blush', text: 'He picks something slow, and pretends not to watch you listen.', end: true },
        b1: { who: 'riven', expr: 'smirk', text: 'Then I’m ordering the large.', end: true },
        c1: { who: 'riven', expr: 'neutral', text: 'To the equipment.', next: 'c2' },
        c2: { who: 'narr', show: 'riven', expr: 'flustered', text: 'His ears turn pink.', end: true },
      },
    },

    // foundation: 5. Sora’s arrival, “Presentation Matters”
    presentation_matters: {
      title: 'Presentation Matters', char: 'sora', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', show: 'sora', expr: 'neutral', text: 'Sora studies the pastry display.', next: 'n2' },
        n2: { who: 'sora', expr: 'neutral', text: 'Can I move something?', next: 'n3' },
        n3: { who: 'player', expr: 'smirk', text: 'That depends how expensive the suggestion is.', next: 'n4' },
        n4: { who: 'narr', text: 'He turns a cake stand, folds a napkin, and moves one vase.', next: 'n5' },
        n5: { who: 'narr', text: 'The display suddenly looks intentional.', next: 'n6' },
        n6: { who: 'player', expr: 'surprised', text: 'That was upsettingly effective.', next: 'n7' },
        n7: { who: 'sora', expr: 'smirk', text: 'Thank you. I practice being unbearable.', next: 'n8' },
        n8: { who: 'narr', text: 'He points to the lavender fog.', next: 'n9' },
        n9: {
          who: 'sora', expr: 'happy', text: 'And I’ll have that.',
          choices: [
            { text: 'You should help with the Night Market.', aff: 4, next: 'a1' },
            { text: 'Teach me how you did that.', aff: 4, next: 'b1' },
            { text: 'Do you improve everything you touch?', aff: 5, next: 'c1' },
          ],
        },
        a1: { who: 'sora', expr: 'smirk', text: 'I’m very expensive.', next: 'a2' },
        a2: { who: 'sora', expr: 'happy', text: 'For this café, I’ll accept payment in cake.', next: 'end' },
        b1: { who: 'sora', expr: 'happy', text: 'Lesson one: everything wants to face the door. Lesson two: so do people.', next: 'end' },
        c1: { who: 'sora', expr: 'smirk', text: 'Careful. I’ll start thinking you’re flirting.', next: 'end' },
        end: { who: 'sora', expr: 'neutral', text: 'Sora. Write it on the cup. Spell it right.', end: true },
      },
    },

    // foundation: 6. Group scene, “Rain Check” (day 10). The four private conversations are new.
    rain_check: {
      title: 'Rain Check', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'A downpour traps everyone inside.', next: 'n2' },
        n2: { who: 'narr', show: 'atlas', expr: 'happy', text: 'Atlas brings out a batch of slightly uneven cookies. Milo starts sketching the rain. Sora claims the most comfortable seat. Riven gets the music working.', next: 'n3' },
        n3: { who: 'narr', text: 'You turn the sign to Closed.', next: 'n4' },
        n4: { who: 'player', expr: 'smile', text: 'We could probably all go home if we ran.', next: 'n5' },
        n5: { who: 'sora', expr: 'smirk', text: 'I could also ruin my shoes deliberately. Neither sounds appealing.', next: 'n6' },
        n6: { who: 'atlas', expr: 'happy', text: 'There are cookies.', next: 'n7' },
        n7: { who: 'riven', expr: 'neutral', text: 'Strong argument.', next: 'sit' },
        sit: {
          who: 'narr', text: 'Everyone has settled in somewhere. Who do you sit beside?',
          choices: [
            { text: 'Milo, by the rainy window', say: false, met: 'milo', to: 'milo', aff: 5, next: 'm1' },
            { text: 'Riven, by the speaker', say: false, met: 'riven', to: 'riven', aff: 5, next: 'r1' },
            { text: 'Atlas, by the cookies', say: false, met: 'atlas', to: 'atlas', aff: 5, next: 'a1' },
            { text: 'Sora, in the good armchair', say: false, met: 'sora', to: 'sora', aff: 5, next: 's1' },
          ],
        },
        m1: { who: 'narr', show: 'milo', expr: 'blush', text: 'Milo tilts his sketchbook so you can see: rain on the window, the lamp, and the edge of someone’s sleeve.', next: 'm2' },
        m2: { who: 'milo', expr: 'blush', text: 'That’s you. Well. That’s your elbow. I haven’t earned the rest yet.', next: 'm3' },
        m3: { who: 'player', expr: 'laugh', text: 'My elbow is honored.', next: 'm4' },
        m4: { who: 'milo', expr: 'happy', text: 'It has very good posture.', next: 'end' },
        r1: { who: 'narr', show: 'riven', expr: 'neutral', text: 'Riven hands you one side of his headphones without looking up.', next: 'r2' },
        r2: { who: 'riven', expr: 'neutral', text: 'Rain playlist. Don’t read the name.', next: 'r3' },
        r3: { who: 'narr', text: 'You read the name. It’s called “Not for Anyone.”', next: 'r4' },
        r4: { who: 'riven', expr: 'flustered', text: '...It’s for you now. Don’t make it weird.', next: 'end' },
        a1: { who: 'narr', show: 'atlas', expr: 'happy', text: 'Atlas pushes the plate toward you. The best cookie is suspiciously close to your side.', next: 'a2' },
        a2: { who: 'atlas', expr: 'flustered', text: 'They’re uneven. The oven has a hot corner. I’m not making excuses, I’m just explaining the oven.', next: 'a3' },
        a3: { who: 'player', expr: 'happy', text: 'They’re perfect.', next: 'a4' },
        a4: { who: 'narr', show: 'atlas', expr: 'blush', text: 'His tail thumps the chair leg twice before he can stop it.', next: 'end' },
        s1: { who: 'narr', show: 'sora', expr: 'smirk', text: 'Sora shifts over exactly enough for you to fit on the arm of the good chair.', next: 's2' },
        s2: { who: 'sora', expr: 'smirk', text: 'You get this seat because you’re in charge. Not because I like you. I want that on the record.', next: 's3' },
        s3: { who: 'player', expr: 'smirk', text: 'Noted.', next: 's4' },
        s4: { who: 'sora', expr: 'blush', text: 'Good. ...I like you a little. Also on the record.', next: 'end' },
        end: { who: 'narr', text: 'The rain doesn’t let up until nearly midnight. Nobody seems to mind.', next: 'sketch' },
        sketch: { who: 'narr', show: 'milo', expr: 'happy', text: 'At the end, Milo pins his sketch beside the register.', next: 'sketch2' },
        sketch2: { who: 'narr', text: 'It’s the first picture of all five of you together.', set: { flag: 'group_sketch' }, end: true },
      },
    },

    // foundation: 7. Midpoint, “Too Many Orders” (day 15, mid-shift). The reply is new.
    too_many_orders: {
      title: 'Too Many Orders', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', text: 'A guest’s post brings an unexpected rush.', next: 'n2' },
        n2: { who: 'narr', text: 'Orders pile up. You make a mistake, lose track of a ticket, and finally step into the back room.', next: 'n3' },
        n3: { who: 'narr', text: 'Someone follows you in.', next: 'who' },
        who: {
          branch: [
            { if: (c) => c.closest() === 'riven', next: 'r' },
            { if: (c) => c.closest() === 'atlas', next: 'a' },
            { if: (c) => c.closest() === 'sora', next: 's' },
          ],
          next: 'm',
        },
        m: { who: 'milo', expr: 'pensive', text: 'Tell me which part you want me to take.', next: 'reply' },
        r: { who: 'riven', expr: 'neutral', text: 'The tickets are out of order. We can fix that.', next: 'reply' },
        a: { who: 'atlas', expr: 'pensive', text: 'Sit for a minute. I’ve got the counter.', next: 'reply' },
        s: { who: 'sora', expr: 'neutral', text: 'Let’s make one decision at a time.', next: 'reply' },
        reply: {
          who: 'narr', text: 'You take one breath. Then another.',
          choices: [
            { text: 'Okay. Together.', to: 'closest', aff: 4, next: 'out' },
            { text: 'Thank you. I didn’t know how to ask.', to: 'closest', aff: 5, next: 'out' },
          ],
        },
        out: { who: 'narr', text: 'You go back out together. {closest} stays at your side for the rest of the rush.', end: true },
      },
    },

    // new: the evening after the rush; the group builds the staff-task system
    better_system: {
      title: 'A Better System', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'After closing, the five of you sit around the big table with a stack of crumpled tickets.', next: 'n2' },
        n2: { who: 'sora', expr: 'smirk', text: 'Tonight, we make a system. I brought sticky notes in four colors.', next: 'n3' },
        n3: { who: 'riven', expr: 'neutral', text: 'I brought a ticket rail that actually holds tickets.', next: 'n4' },
        n4: { who: 'atlas', expr: 'happy', text: 'I brought snacks. That’s also a system.', next: 'n5' },
        n5: { who: 'milo', expr: 'blush', text: 'I made a chart.', next: 'n6' },
        n6: { who: 'narr', show: 'milo', expr: 'flustered', text: 'Milo’s chart has illustrations.', next: 'n7' },
        n7: { who: 'milo', expr: 'flustered', text: 'Small ones.', next: 'n8' },
        n8: { who: 'narr', text: 'By midnight, there’s a plan. From now on, before you open, you choose who’s helping.', next: 'n9' },
        n9: { who: 'narr', text: 'Milo on prep makes perfect pours easier. Riven on tickets keeps customers patient. Atlas on the counter sells a pastry with every order. Sora out front means better tips.', next: 'n10' },
        n10: { who: 'player', expr: 'happy', text: 'Rosalie would love this.', next: 'n11' },
        n11: { who: 'sora', expr: 'smirk', text: 'Rosalie would laminate this.', set: { flag: 'staff_tasks' }, end: true },
      },
    },

    /* ================= Milo ================= */

    // new: the secret menu
    milo_1: {
      title: 'Just Something Silly', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'Closing up, you find a folder wedged behind the register. Inside is a whole café menu, hand-lettered, with a tiny illustration beside every drink.', next: 'n2' },
        n2: { who: 'milo', expr: 'surprised', text: 'Oh. That’s— that’s just something silly.', next: 'n3' },
        n3: { who: 'player', expr: 'smile', text: 'Milo. There’s a drawing of the espresso machine with a little face.', next: 'n4' },
        n4: { who: 'milo', expr: 'flustered', text: 'It looked lonely.', next: 'c1' },
        c1: {
          who: 'narr', show: 'milo', expr: 'blush', text: 'His tail has curled all the way around his ankle.',
          choices: [
            { text: 'This is better than our real menu.', aff: 5, next: 'a1' },
            { text: 'Can we use it?', aff: 5, flag: 'milo_menu', next: 'b1' },
            { text: 'Why hide it?', aff: 4, next: 'c2' },
          ],
        },
        a1: { who: 'milo', expr: 'blush', text: 'Our real menu is a laminated sheet with a coffee stain shaped like a duck.', next: 'a2' },
        a2: { who: 'milo', expr: 'happy', text: '...But thank you.', next: 'end' },
        b1: { who: 'milo', expr: 'surprised', text: 'Use it? Like, in public? Where people can see it?', next: 'b2' },
        b2: { who: 'milo', expr: 'happy', text: '...Maybe. Let me fix the lettering first. And the croissant. The croissant’s wrong.', next: 'end' },
        c2: { who: 'milo', expr: 'pensive', text: 'If I don’t show anyone, it can stay good in my head.', next: 'c3' },
        c3: { who: 'player', expr: 'neutral', text: 'And if you show someone?', next: 'c4' },
        c4: { who: 'milo', expr: 'sad', text: 'Then it’s just good or not good. That’s scarier.', next: 'end' },
        end: { who: 'milo', expr: 'smirk', text: 'Goodnight. Don’t tell the espresso machine I gave it a face.', end: true },
      },
    },

    // foundation: Milo, “The Cup You Kept” (the three replies are new)
    milo_2: {
      title: 'The Cup You Kept', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'You find a row of takeaway cups behind the counter. Each has a small drawing.', next: 'n2' },
        n2: { who: 'narr', text: 'One shows you fighting the front-door lock.', next: 'n3' },
        n3: { who: 'player', expr: 'surprised', text: 'Is this how you saw me on my first day?', next: 'n4' },
        n4: { who: 'milo', expr: 'smirk', text: 'The original had more panic.', next: 'n5' },
        n5: { who: 'narr', text: 'You find another: you asleep over the recipe book.', next: 'n6' },
        n6: { who: 'narr', text: 'Then another: you laughing.', next: 'n7' },
        n7: { who: 'player', expr: 'smile', text: 'You draw me a lot.', next: 'n8' },
        n8: { who: 'narr', show: 'milo', expr: 'flustered', text: 'Milo reaches for the cups.', next: 'n9' },
        n9: {
          who: 'milo', expr: 'flustered', text: 'You don’t have to keep those.',
          choices: [
            { text: 'This one’s going on my desk.', aff: 6, next: 'a1' },
            { text: 'Will you draw something with me?', aff: 6, next: 'b1' },
            { text: 'Can I keep the artist company too?', aff: 7, next: 'c1' },
          ],
        },
        a1: { who: 'milo', expr: 'blush', text: 'Your desk is the counter.', next: 'a2' },
        a2: { who: 'player', expr: 'smile', text: 'Then everyone will see it.', next: 'a3' },
        a3: { who: 'milo', expr: 'flustered', text: '...Okay. Yes. That’s fine. That’s— fine.', end: true },
        b1: { who: 'narr', show: 'milo', expr: 'happy', text: 'He hands you a cup and a pen. You draw a cat. It looks like a potato with opinions.', next: 'b2' },
        b2: { who: 'milo', expr: 'happy', text: 'I love it. I’m keeping it. I’m keeping it forever.', end: true },
        c1: { who: 'milo', expr: 'flustered', text: 'That’s— you can’t just— yes.', next: 'c2' },
        c2: { who: 'narr', show: 'milo', expr: 'blush', text: 'His tail curls around his ankle so fast he nearly trips over it.', end: true },
      },
    },

    // new: the unfinished exhibition application
    milo_3: {
      title: 'Eighty Percent', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'Milo’s laptop is open on the counter. On the screen: Bellflower Illustration Exhibition. Application 80% complete.', next: 'n2' },
        n2: { who: 'milo', expr: 'pensive', text: 'It’s been eighty percent complete for six weeks.', next: 'n3' },
        n3: { who: 'player', expr: 'neutral', text: 'What’s the last twenty?', next: 'n4' },
        n4: { who: 'milo', expr: 'sad', text: 'The part where I press submit and someone decides whether my work is worth looking at.', next: 'br' },
        br: { branch: [{ flag: 'milo_menu', next: 'menu' }], next: 'c1' },
        menu: { who: 'milo', expr: 'pensive', text: 'People keep asking about the drawings on the new menu. Someone wanted to buy the duck one. I didn’t know what to say.', next: 'c1' },
        c1: {
          who: 'narr', show: 'milo', expr: 'pensive', text: 'His cursor hovers over the button. It doesn’t move.',
          choices: [
            { text: 'It’s worth looking at. I’ve been looking.', aff: 6, next: 'a1' },
            { text: 'Show it at the Night Market first. Here.', aff: 6, next: 'b1' },
            { text: 'Want to press it together?', aff: 7, next: 'c2' },
          ],
        },
        a1: { who: 'milo', expr: 'blush', text: '...You can’t say things like that while I’m holding a mouse.', next: 'a2' },
        a2: { who: 'narr', text: 'He presses submit. Then he puts his head down on the counter for a full minute.', set: { flag: 'milo_applied' }, next: 'end' },
        b1: { who: 'milo', expr: 'surprised', text: 'Here? In the café?', next: 'b2' },
        b2: { who: 'player', expr: 'smile', text: 'A practice audience. The same people who already love your cups.', next: 'b3' },
        b3: { who: 'milo', expr: 'happy', text: '...Okay. Okay. A practice exhibition.', next: 'end' },
        c2: { who: 'narr', text: 'You put your hand over his on the mouse. He presses.', set: { flag: 'milo_applied' }, next: 'c3' },
        c3: { who: 'milo', expr: 'flustered', text: 'I did it. Oh no. I did it.', next: 'end' },
        end: { who: 'milo', expr: 'happy', text: 'Thank you for noticing. That’s usually my job.', set: { flag: 'milo_ready' }, end: true },
      },
    },

    // foundation: Milo’s confession (the three replies are new)
    milo_confession: {
      title: 'You Kept Ending Up in the Picture', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', show: 'milo', expr: 'blush', text: 'After his first exhibition, Milo gives you a small framed illustration of the café.', next: 'n2' },
        n2: { who: 'narr', text: 'Your figure stands in the doorway.', next: 'n3' },
        n3: { who: 'milo', expr: 'pensive', text: 'I kept trying to draw what made this place feel different.', next: 'n4' },
        n4: { who: 'narr', show: 'milo', expr: 'blush', text: 'He looks at you.', next: 'n5' },
        n5: {
          who: 'milo', expr: 'blush', text: 'You kept ending up in the picture.',
          choices: [
            { text: 'I’d like to keep ending up in your pictures.', set: { route: 'dating' }, you: 'blush', next: 'yes' },
            { text: 'Can I have a little time with this?', set: { route: 'waiting' }, you: 'pensive', next: 'wait' },
            { text: 'You’re one of my best friends, Milo.', set: { route: 'friends' }, you: 'smile', next: 'friend' },
          ],
        },
        yes: { who: 'milo', expr: 'flustered', text: 'Oh. Oh. Okay. I need to sit down. Will you sit down with me?', end: true },
        wait: { who: 'milo', expr: 'happy', text: 'Of course. I’m good at waiting for the right light.', end: true },
        friend: { who: 'milo', expr: 'pensive', text: '...That’s a really good picture too.', end: true },
      },
    },

    /* ================= Riven ================= */

    // new: the labeled cords and repaired chairs
    riven_1: {
      title: 'Doesn’t Mean Anything', char: 'riven', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'Every extension cord in the café is labeled now. COUNTER. SPEAKER. DO NOT UNPLUG (MILO).', next: 'n2' },
        n2: { who: 'player', expr: 'surprised', text: 'Did you do this?', next: 'n3' },
        n3: { who: 'riven', expr: 'neutral', text: 'Somebody had to. Your setup was a fire with a playlist.', next: 'n4' },
        n4: { who: 'narr', text: 'The wobbly chair by the window doesn’t wobble anymore. Neither do the other two.', next: 'n5' },
        n5: { who: 'player', expr: 'smile', text: 'And the chairs?', next: 'n6' },
        n6: {
          who: 'riven', expr: 'neutral', text: 'They were annoying me. It doesn’t mean anything.',
          choices: [
            { text: 'Thank you. Really.', aff: 5, next: 'a1' },
            { text: 'It means a little something.', aff: 6, next: 'b1' },
            { text: 'I’m putting you on payroll.', aff: 5, next: 'c1' },
          ],
        },
        a1: { who: 'riven', expr: 'blush', text: '...Yeah. Sure. You’re welcome.', next: 'a2' },
        a2: { who: 'narr', show: 'riven', expr: 'blush', text: 'His ears turn toward you before he does.', end: true },
        b1: { who: 'riven', expr: 'smirk', text: 'It means I like sitting down without falling over.', next: 'b2' },
        b2: { who: 'riven', expr: 'blush', text: '...And maybe I like it here.', end: true },
        c1: { who: 'riven', expr: 'smirk', text: 'You can’t afford me.', next: 'c2' },
        c2: { who: 'player', expr: 'smirk', text: 'I’ll pay you in iced americanos.', next: 'c3' },
        c3: { who: 'riven', expr: 'pensive', text: '...You can afford me.', end: true },
      },
    },

    // foundation: Riven, “One More Song” (what follows each choice is new)
    riven_2: {
      title: 'One More Song', char: 'riven', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'You hear music upstairs after closing.', next: 'n2' },
        n2: { who: 'narr', show: 'riven', expr: 'surprised', text: 'Riven stops playing when you enter.', next: 'n3' },
        n3: { who: 'player', expr: 'smile', text: 'You can keep going.', next: 'n4' },
        n4: { who: 'riven', expr: 'pensive', text: 'It’s unfinished.', next: 'n5' },
        n5: { who: 'player', expr: 'smile', text: 'I can listen to unfinished.', next: 'n6' },
        n6: {
          who: 'narr', show: 'riven', expr: 'pensive', text: 'He studies you, then starts again.',
          choices: [
            { text: 'Sit quietly and listen', say: false, aff: 6, next: 'a1' },
            { text: 'Ask about the song afterward', say: false, aff: 6, next: 'b1' },
            { text: 'Offer to help set up a small performance', say: false, aff: 6, flag: 'riven_set', next: 'c1' },
          ],
        },
        a1: { who: 'narr', text: 'You sit on the top step. He plays it through twice. The second time, he doesn’t stop where he stopped before.', next: 'a2' },
        a2: { who: 'riven', expr: 'blush', text: '...That’s the first time anyone’s heard the end.', end: true },
        b1: { who: 'player', expr: 'neutral', text: 'What’s it about?', next: 'b2' },
        b2: { who: 'riven', expr: 'pensive', text: 'Staying somewhere longer than you planned.', next: 'b3' },
        b3: { who: 'player', expr: 'neutral', text: 'Is it a sad song?', next: 'b4' },
        b4: { who: 'riven', expr: 'blush', text: 'It was. I keep rewriting the ending.', end: true },
        c1: { who: 'player', expr: 'smile', text: 'What if you played it downstairs? A few stools, a lamp, me in the front row.', next: 'c2' },
        c2: { who: 'riven', expr: 'surprised', text: 'A performance. Here.', next: 'c3' },
        c3: { who: 'riven', expr: 'blush', text: '...You’d have to promise not to clap weird.', end: true },
      },
    },

    // new: his old band, and deciding to play alone
    riven_3: {
      title: 'No Excuses', char: 'riven', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'Riven is restringing a bass at the window table, very carefully, the way people do things when they’re avoiding something.', next: 'n2' },
        n2: { who: 'player', expr: 'neutral', text: 'You’re quiet. Quieter.', next: 'n3' },
        n3: { who: 'riven', expr: 'sad', text: 'My old band’s playing the Night Market. Different bassist. They didn’t tell me. I saw the poster.', next: 'br' },
        br: { branch: [{ flag: 'riven_set', next: 'set' }], next: 'noset' },
        set: { who: 'riven', expr: 'pensive', text: 'You said a small performance. Here. I haven’t stopped thinking about it.', next: 'n4' },
        noset: { who: 'player', expr: 'neutral', text: 'Then play here. Your own set.', next: 'noset2' },
        noset2: { who: 'riven', expr: 'surprised', text: 'Alone?', next: 'n4' },
        n4: {
          who: 'riven', expr: 'pensive', text: 'If I play alone and it’s bad, there’s nobody else to blame.',
          choices: [
            { text: 'And if it’s good, there’s nobody else to thank.', aff: 6, next: 'a1' },
            { text: 'I’ll be there either way.', aff: 7, next: 'b1' },
            { text: 'You don’t need an excuse this time.', aff: 7, next: 'c1' },
          ],
        },
        a1: { who: 'riven', expr: 'smirk', text: '...That’s annoyingly good.', next: 'end' },
        b1: { who: 'riven', expr: 'blush', text: 'That’s the problem. I want you to be.', next: 'end' },
        c1: { who: 'riven', expr: 'pensive', text: 'No excuse.', next: 'c2' },
        c2: { who: 'riven', expr: 'happy', text: 'Okay. I want to play. That’s the whole sentence.', next: 'end' },
        end: { who: 'narr', show: 'riven', expr: 'neutral', text: 'He writes a set list on a napkin: four songs. The last one doesn’t have a title yet.', set: { flag: 'riven_ready' }, end: true },
      },
    },

    // foundation: Riven’s confession (the three replies are new)
    riven_confession: {
      title: 'Terrible Plan', char: 'riven', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', show: 'riven', expr: 'neutral', text: 'After his first solo café set, he finds you stacking chairs.', next: 'n2' },
        n2: { who: 'riven', expr: 'neutral', text: 'There was something I left out.', next: 'n3' },
        n3: { who: 'player', expr: 'neutral', text: 'Of the song?', next: 'n4' },
        n4: { who: 'riven', expr: 'pensive', text: 'No.', next: 'n5' },
        n5: { who: 'narr', show: 'riven', expr: 'pensive', text: 'He takes a breath.', next: 'n6' },
        n6: { who: 'riven', expr: 'blush', text: 'I keep staying until closing because I want to walk you home.', next: 'n7' },
        n7: { who: 'player', expr: 'smile', text: 'I live upstairs.', next: 'n8' },
        n8: {
          who: 'riven', expr: 'flustered', text: 'I know. Terrible plan.',
          choices: [
            { text: 'Then walk me upstairs.', set: { route: 'dating' }, you: 'blush', next: 'yes' },
            { text: 'Can you keep staying until closing while I figure this out?', set: { route: 'waiting' }, you: 'pensive', next: 'wait' },
            { text: 'You’re one of my favorite people. As a friend.', set: { route: 'friends' }, you: 'smile', next: 'friend' },
          ],
        },
        yes: { who: 'riven', expr: 'blush', text: 'It’s a very short walk. I’m going to take it slowly.', end: true },
        wait: { who: 'riven', expr: 'pensive', text: 'I was going to anyway.', end: true },
        friend: { who: 'riven', expr: 'smirk', text: '...Yeah. I can work with “favorite.”', end: true },
      },
    },

    /* ================= Atlas ================= */

    // new: giving his baking away
    atlas_1: {
      title: 'Twelve Cinnamon Rolls', char: 'atlas', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'Atlas turns up after closing with two paper bags.', next: 'n2' },
        n2: { who: 'atlas', expr: 'happy', text: 'For tomorrow morning! Have you eaten today? You haven’t. I can tell. You’ve got your “I’ll eat later” face.', next: 'n3' },
        n3: { who: 'player', expr: 'surprised', text: 'I don’t have a face for that.', next: 'n4' },
        n4: { who: 'atlas', expr: 'smirk', text: 'You do. It’s this one.', next: 'n5' },
        n5: { who: 'narr', text: 'He does an impression. It’s terrible, and extremely accurate.', next: 'n6' },
        n6: { who: 'narr', text: 'Inside the bags: cinnamon rolls. Twelve of them.', next: 'n7' },
        n7: { who: 'player', expr: 'laugh', text: 'Atlas, there are twelve.', next: 'n8' },
        n8: {
          who: 'atlas', expr: 'flustered', text: 'Eleven are for other people! Noor, the mail carrier, the guy with the very small dog...',
          choices: [
            { text: 'You should be selling these.', aff: 5, flag: 'atlas_sell', next: 'a1' },
            { text: 'Save one for yourself.', aff: 5, next: 'b1' },
            { text: 'Have one with me now.', aff: 6, next: 'c1' },
          ],
        },
        a1: { who: 'atlas', expr: 'surprised', text: 'Selling them? For money?', next: 'a2' },
        a2: { who: 'atlas', expr: 'pensive', text: '...People would pay for these?', end: true },
        b1: { who: 'atlas', expr: 'pensive', text: 'I usually forget that part.', next: 'b2' },
        b2: { who: 'narr', show: 'atlas', expr: 'happy', text: 'He takes one. Then, after a moment, the biggest one.', end: true },
        c1: { who: 'atlas', expr: 'blush', text: 'With you? Now?', next: 'c2' },
        c2: { who: 'narr', show: 'atlas', expr: 'happy', text: 'His tail is already going.', end: true },
      },
    },

    // foundation: Atlas, “The Last Strawberry”
    atlas_2: {
      title: 'The Last Strawberry', char: 'atlas', bg: 'cafe-night', aff: 6,
      nodes: {
        start: { who: 'narr', text: 'Atlas asks you to taste a pastry he wants to enter into the Night Market showcase.', next: 'n2' },
        n2: { who: 'narr', show: 'atlas', expr: 'neutral', text: 'He watches you take a bite.', next: 'n3' },
        n3: { who: 'atlas', expr: 'pensive', text: 'Too sweet?', next: 'n4' },
        n4: { who: 'player', expr: 'laugh', text: 'You asked before I swallowed.', next: 'n5' },
        n5: { who: 'atlas', expr: 'flustered', text: 'Sorry.', next: 'n6' },
        n6: { who: 'player', expr: 'smile', text: 'It’s good.', next: 'n7' },
        n7: { who: 'atlas', expr: 'pensive', text: 'You can be honest.', next: 'n8' },
        n8: { who: 'player', expr: 'smirk', text: 'Atlas.', next: 'n9' },
        n9: { who: 'atlas', expr: 'blush', text: 'Right. Accepting the compliment.', next: 'n10' },
        n10: { who: 'narr', show: 'atlas', expr: 'happy', text: 'The two of you finish decorating the batch. He saves the best strawberry for yours.', end: true },
      },
    },

    // new: learning to sell instead of give away
    atlas_3: {
      title: 'Price Tags', char: 'atlas', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'This afternoon, Atlas handed out a whole tray of free scones to the line outside. They were his showcase practice batch.', next: 'n2' },
        n2: { who: 'atlas', expr: 'flustered', text: 'They looked hungry!', next: 'n3' },
        n3: { who: 'narr', text: 'Now he’s in the back with a stack of blank price tags, staring at them like they might bite.', next: 'br' },
        br: { branch: [{ flag: 'atlas_sell', next: 'remember' }], next: 'n4' },
        remember: { who: 'atlas', expr: 'pensive', text: 'You said people would pay for my cinnamon rolls. I keep thinking about it. It’s very loud in here.', next: 'n4' },
        n4: {
          who: 'atlas', expr: 'sad', text: 'Everyone else’s stuff is worth something. Mine’s just... stuff I make because I like making it.',
          choices: [
            { text: 'That’s exactly why it’s worth something.', aff: 6, next: 'a1' },
            { text: 'Write a price. I’ll hold your hand.', aff: 7, next: 'b1' },
            { text: 'You take care of everyone. Let someone take care of you.', aff: 7, next: 'c1' },
          ],
        },
        a1: { who: 'atlas', expr: 'blush', text: '...Okay. Say that again. Slower.', next: 'end' },
        b1: { who: 'narr', text: 'He writes four coins. Crosses it out. Writes three. You take the pen and write five.', next: 'b2' },
        b2: { who: 'atlas', expr: 'happy', text: 'Five! Okay! Five!', next: 'end' },
        c1: { who: 'atlas', expr: 'blush', text: '...That’s a lot to hear before dinner.', next: 'end' },
        end: { who: 'narr', show: 'atlas', expr: 'happy', text: 'His first price tag is in very careful handwriting. He draws a tiny strawberry next to it.', set: { flag: 'atlas_ready' }, end: true },
      },
    },

    // foundation: Atlas’s confession (the three replies are new)
    atlas_confession: {
      title: 'Properly', char: 'atlas', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', show: 'atlas', expr: 'neutral', text: 'You discover he has written your favorite pastry into his recipe notebook.', next: 'n2' },
        n2: { who: 'narr', text: 'Beside it: Ask {them} to dinner. Properly.', next: 'n3' },
        n3: { who: 'atlas', expr: 'flustered', text: 'That wasn’t the page I meant to show you.', next: 'n4' },
        n4: { who: 'player', expr: 'smile', text: 'What does ‘properly’ mean?', next: 'n5' },
        n5: {
          who: 'atlas', expr: 'blush', text: 'A reservation. No deliveries. Me telling you how nice you look instead of thinking it really loudly.',
          choices: [
            { text: 'Then ask me properly.', set: { route: 'dating' }, you: 'blush', next: 'yes' },
            { text: 'Could we start with breakfast?', set: { route: 'waiting' }, you: 'pensive', next: 'wait' },
            { text: 'I love having you in my life, Atlas. As my friend.', set: { route: 'friends' }, you: 'smile', next: 'friend' },
          ],
        },
        yes: { who: 'atlas', expr: 'flustered', text: 'Will you have dinner with me? Properly? Also, you look really nice. I said it out loud. Wow.', end: true },
        wait: { who: 'atlas', expr: 'happy', text: 'Breakfast I can do. Breakfast is my best meal.', end: true },
        friend: { who: 'atlas', expr: 'pensive', text: '...Then I’m still bringing you breakfast. Friends get breakfast.', end: true },
      },
    },

    /* ================= Sora ================= */

    // new: forty minutes of ribbon
    sora_1: {
      title: 'Forty Minutes of Ribbon', char: 'sora', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'Sora said he’d stop by for five minutes. Forty minutes later, you’re both surrounded by ribbon samples for the pastry boxes.', next: 'n2' },
        n2: { who: 'sora', expr: 'neutral', text: 'Not that one. That pink is lying to you.', next: 'n3' },
        n3: { who: 'player', expr: 'surprised', text: 'How can a pink lie?', next: 'n4' },
        n4: { who: 'sora', expr: 'smirk', text: 'It pretends to be soft. It’s actually very aggressive. Like me.', next: 'n5' },
        n5: { who: 'narr', show: 'sora', expr: 'happy', text: 'When you look up, he’s eating cake directly out of the storage container.', next: 'n6' },
        n6: {
          who: 'sora', expr: 'smirk', text: 'Don’t judge me. Plates are for people with time.',
          choices: [
            { text: 'Pass me a fork.', aff: 6, next: 'a1' },
            { text: 'That’s the Night Market cake.', aff: 4, next: 'b1' },
            { text: 'You’re very funny, you know.', aff: 5, next: 'c1' },
          ],
        },
        a1: { who: 'sora', expr: 'happy', text: 'Oh, I like you.', end: true },
        b1: { who: 'sora', expr: 'surprised', text: 'Then I’m quality control.', end: true },
        c1: { who: 'sora', expr: 'blush', text: 'I know. But it’s nice to hear it from someone who means it.', end: true },
      },
    },

    // foundation: Sora, “Off the Record” (what follows each choice is new)
    sora_2: {
      title: 'Off the Record', char: 'sora', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'Sora invites you to help sort outfits for an upcoming shoot.', next: 'n2' },
        n2: { who: 'narr', show: 'sora', expr: 'smirk', text: 'At first, he models everything dramatically.', next: 'n3' },
        n3: { who: 'narr', text: 'Later, surrounded by rejected clothes and empty takeaway boxes, he finally talks about the job offer.', next: 'n4' },
        n4: { who: 'sora', expr: 'pensive', text: 'Everyone keeps congratulating me.', next: 'n5' },
        n5: { who: 'player', expr: 'neutral', text: 'Have you decided?', next: 'n6' },
        n6: { who: 'narr', show: 'sora', expr: 'pensive', text: 'He shakes his head.', next: 'n7' },
        n7: {
          who: 'sora', expr: 'sad', text: 'I wish someone would ask what I want before telling me how lucky I am.',
          choices: [
            { text: 'What would a good ordinary day look like?', aff: 7, flag: 'sora_ordinary', next: 'a1' },
            { text: 'What would you miss if you left?', aff: 7, next: 'b1' },
            { text: 'You don’t have to decide tonight.', aff: 6, next: 'c1' },
          ],
        },
        a1: { who: 'sora', expr: 'pensive', text: 'Coffee somewhere I’m known. Work I’m proud of. Someone who notices when I’m buying time.', next: 'a2' },
        a2: { who: 'narr', show: 'sora', expr: 'blush', text: 'He touches his hair bow, and catches himself doing it.', end: true },
        b1: { who: 'sora', expr: 'pensive', text: 'The lane. The light at four o’clock. Atlas’s uneven cookies.', next: 'b2' },
        b2: { who: 'sora', expr: 'blush', text: '...That’s not the whole list.', end: true },
        c1: { who: 'sora', expr: 'surprised', text: '...Nobody’s said that to me.', next: 'c2' },
        c2: { who: 'sora', expr: 'happy', text: 'Okay. Not tonight.', end: true },
      },
    },

    // new: his decision
    sora_3: {
      title: 'Ordinary Days', char: 'sora', bg: 'stars',
      nodes: {
        start: { who: 'narr', text: 'Sora is waiting on the bench outside when you lock up.', next: 'n2' },
        n2: { who: 'sora', expr: 'neutral', text: 'I made a decision. I’m telling you first, which is either very meaningful or very inconvenient.', next: 'n3' },
        n3: { who: 'player', expr: 'smile', text: 'Which is it?', next: 'n4' },
        n4: { who: 'sora', expr: 'smirk', text: 'Yes.', next: 'n5' },
        n5: { who: 'sora', expr: 'pensive', text: 'I told them no. The job. I said it out loud, to a person, on the phone, and I didn’t improve the sentence.', next: 'br' },
        br: { branch: [{ flag: 'sora_ordinary', next: 'ord' }], next: 'c' },
        ord: { who: 'sora', expr: 'blush', text: 'You asked what a good ordinary day looks like. It looks like this. Annoyingly.', next: 'c' },
        c: {
          who: 'narr', show: 'sora', expr: 'neutral', text: 'The streetlight hums. He waits for you to say something.',
          choices: [
            { text: 'How do you feel?', aff: 6, next: 'a1' },
            { text: 'I’m glad you’re staying.', aff: 7, next: 'b1' },
            { text: 'Was it the right choice?', aff: 6, next: 'c1' },
          ],
        },
        a1: { who: 'sora', expr: 'happy', text: 'Terrified. Light. Like I finally put down a very nice bag I didn’t want to carry.', next: 'end' },
        b1: { who: 'sora', expr: 'smirk', text: 'Careful. I’ll start thinking you’re glad I’m staying.', next: 'end' },
        c1: { who: 'sora', expr: 'pensive', text: 'It was mine. That’s the part I’m proud of.', next: 'end' },
        end: { who: 'narr', show: 'sora', expr: 'happy', text: 'He reaches for his hair bow, then leaves it alone.', set: { flag: 'sora_ready' }, end: true },
      },
    },

    // foundation: Sora’s confession (the three replies are new)
    sora_confession: {
      title: 'Not Improving the Sentence', char: 'sora', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', show: 'sora', expr: 'neutral', text: 'Sora arrives after closing in a simple sweater, his hair loosely tied back.', next: 'n2' },
        n2: { who: 'sora', expr: 'neutral', text: 'I planned something very charming to say.', next: 'n3' },
        n3: { who: 'player', expr: 'smile', text: 'What happened?', next: 'n4' },
        n4: { who: 'sora', expr: 'flustered', text: 'I got nervous.', next: 'n5' },
        n5: { who: 'narr', show: 'sora', expr: 'happy', text: 'He laughs softly.', next: 'n6' },
        n6: {
          who: 'sora', expr: 'blush', text: 'I like you. I’d like to take you on a date. I’m trying very hard not to improve that sentence.',
          choices: [
            { text: 'Don’t improve it. Yes.', set: { route: 'dating' }, you: 'blush', next: 'yes' },
            { text: 'Can I answer you after a few more ordinary days?', set: { route: 'waiting' }, you: 'pensive', next: 'wait' },
            { text: 'You mean a lot to me, Sora. As a friend.', set: { route: 'friends' }, you: 'smile', next: 'friend' },
          ],
        },
        yes: { who: 'sora', expr: 'happy', text: 'Good. Because the date is already planned, and it is extremely charming.', end: true },
        wait: { who: 'sora', expr: 'pensive', text: 'Take all the ordinary days you want. I’ll be here. That’s sort of the point now.', end: true },
        friend: { who: 'sora', expr: 'smirk', text: '...Then I’ll keep being unbearable at you. Platonically.', end: true },
      },
    },

    /* ================= The finale ================= */

    // foundation: “Bellflower Night Market”. How each person’s evening goes depends on their story.
    night_market: {
      title: 'Bellflower Night Market', bg: 'cafe-night',
      nodes: Object.assign({
        start: { who: 'narr', text: 'By sunset, Bellflower Lane is strung with lanterns, and the café door hasn’t closed in an hour.', next: 'look' },
        look: { who: 'narr', text: (c) => c.decorLine(), next: 'milo' },
        milo: { branch: [{ flag: 'milo_ready', next: 'milo_a' }], next: 'milo_b' },
        milo_a: { who: 'narr', show: 'milo', expr: 'happy', text: 'Milo exhibits his illustrations along the wall: the cups, the rain, the front-door lock. People stand in front of them longer than he expected.', next: 'milo_a2' },
        milo_a2: { who: 'milo', expr: 'flustered', text: 'Someone asked if they’re for sale. I panicked and said “emotionally, no.”', next: 'riven' },
        milo_b: { who: 'narr', show: 'milo', expr: 'blush', text: 'Milo pinned three of his illustrations beside the register and has been standing guard over them all night.', next: 'riven' },
        riven: { branch: [{ flag: 'riven_ready', next: 'riven_a' }], next: 'riven_b' },
        riven_a: { who: 'narr', show: 'riven', expr: 'pensive', text: 'When the lanterns dim, Riven performs a short set from a stool by the window. Four songs. The last one has a title now.', next: 'atlas' },
        riven_b: { who: 'narr', show: 'riven', expr: 'neutral', text: 'Riven keeps every speaker on the lane alive and, near the end, plays one song nobody asked for. Nobody talks through it.', next: 'atlas' },
        atlas: { branch: [{ flag: 'atlas_ready', next: 'atlas_a' }], next: 'atlas_b' },
        atlas_a: { who: 'narr', show: 'atlas', expr: 'happy', text: 'Atlas sells his pastries from a stall by the door. They’re gone in forty minutes. Every price tag has a tiny strawberry on it.', next: 'atlas_a2' },
        atlas_a2: { who: 'atlas', expr: 'happy', text: 'They paid! People paid me! On purpose!', next: 'sora' },
        atlas_b: { who: 'narr', show: 'atlas', expr: 'flustered', text: 'Atlas tries to give his pastries away. Bellflower Lane insists on paying him anyway.', next: 'sora' },
        sora: { who: 'narr', show: 'sora', expr: 'smirk', text: 'Sora styles the café and coordinates the evening from a clipboard with a ribbon on it. Everything faces the door. Including the people.', next: 'sora2' },
        sora2: { branch: [{ flag: 'sora_ready', next: 'sora_a' }], next: 'guests' },
        sora_a: { who: 'sora', expr: 'happy', text: 'You know what’s nice about staying? You get to see how things turn out.', next: 'guests' },
        guests: { who: 'narr', text: 'Your regulars bring neighbors, flowers, photographs, and far too many opinions.', next: 'g_juniper' },
        service: { who: 'narr', text: (c) => c.serviceLine(), next: 'late' },
        late: { who: 'narr', text: 'It’s past midnight when the last guest leaves.', next: 'post' },
        post: { who: 'narr', text: 'Tucked under the register, you find a postcard from Rosalie.', next: 'post2' },
        post2: { who: 'narr', text: '“Milo sent a photograph. You moved my chair. Good. I was hoping you would.”', end: true },
      }, guestNodes()),
    },

    // foundation: the romance ending (“clean up together, then share a quiet first moment”), written out per partner
    ending_milo: {
      title: 'A Quiet First Moment', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', show: 'milo', expr: 'blush', text: 'You and Milo clean up together. Every few minutes, he stops wiping a table to look at you, like he’s memorizing it.', next: 'n2' },
        n2: { who: 'milo', expr: 'blush', text: 'I’m not going to draw this one. I just want to remember it.', next: 'n3' },
        n3: { who: 'narr', show: 'milo', expr: 'happy', text: 'When you finally sit down together in the café you helped build, his tail curls around your ankle instead of his own.', next: 'final' },
        final: { who: 'player', expr: 'happy', text: 'Same time tomorrow?', next: 'sign' },
        sign: { who: 'narr', text: 'Someone turns the sign around.', next: 'bye' },
        bye: { who: 'narr', text: 'See you soon.', end: true },
      },
    },
    ending_riven: {
      title: 'A Quiet First Moment', char: 'riven', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', show: 'riven', expr: 'neutral', text: 'You and Riven clean up together. When the last chair is stacked, he puts on a record. Something slow.', next: 'n2' },
        n2: { who: 'riven', expr: 'blush', text: 'Dance with me. Badly. It’s the only way I know how.', next: 'n3' },
        n3: { who: 'narr', show: 'riven', expr: 'happy', text: 'His ears turn toward you when you laugh, and then the rest of him does too.', next: 'final' },
        final: { who: 'player', expr: 'happy', text: 'Same time tomorrow?', next: 'sign' },
        sign: { who: 'narr', text: 'Someone turns the sign around.', next: 'bye' },
        bye: { who: 'narr', text: 'See you soon.', end: true },
      },
    },
    ending_atlas: {
      title: 'A Quiet First Moment', char: 'atlas', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', show: 'atlas', expr: 'happy', text: 'You and Atlas clean up together. He washes, you dry. He keeps handing you plates before you’re ready, and you keep laughing.', next: 'n2' },
        n2: { who: 'atlas', expr: 'blush', text: 'I was going to say something smooth. I forgot it. You look really nice. That’s what I had.', next: 'n3' },
        n3: { who: 'narr', show: 'atlas', expr: 'happy', text: 'His tail gives him away completely. He doesn’t even try to hide it.', next: 'final' },
        final: { who: 'player', expr: 'happy', text: 'Same time tomorrow?', next: 'sign' },
        sign: { who: 'narr', text: 'Someone turns the sign around.', next: 'bye' },
        bye: { who: 'narr', text: 'See you soon.', end: true },
      },
    },
    ending_sora: {
      title: 'A Quiet First Moment', char: 'sora', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', show: 'sora', expr: 'smirk', text: 'You and Sora clean up together, which mostly means you clean and he narrates. Then he kicks off his shoes and sits on the counter, which Rosalie would hate.', next: 'n2' },
        n2: { who: 'sora', expr: 'happy', text: 'Our first date is going to be very elegant. Tonight doesn’t count. Tonight is just this.', next: 'n3' },
        n3: { who: 'narr', show: 'sora', expr: 'blush', text: 'He doesn’t touch his hair bow once.', next: 'final' },
        final: { who: 'player', expr: 'happy', text: 'Same time tomorrow?', next: 'sign' },
        sign: { who: 'narr', text: 'Someone turns the sign around.', next: 'bye' },
        bye: { who: 'narr', text: 'See you soon.', end: true },
      },
    },
    // foundation: the friendship ending (the group photo lines are new)
    ending_friends: {
      title: 'Beneath the Sketch', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'The whole group stays to celebrate.', next: 'n2' },
        n2: { who: 'atlas', expr: 'happy', text: 'Photo! Everyone squish in!', next: 'n3' },
        n3: { who: 'riven', expr: 'neutral', text: 'I’m not squishing.', next: 'n4' },
        n4: { who: 'sora', expr: 'smirk', text: 'You’re squishing. Chin up.', next: 'n5' },
        n5: { who: 'milo', expr: 'happy', text: 'Three, two—', next: 'n6' },
        n6: { who: 'narr', text: (c) => (c.flag('group_sketch') ? 'You take a new photograph beneath Milo’s original sketch.' : 'You take a new photograph by the register, and Milo pins it up before anyone can argue.'), next: 'br' },
        br: { branch: [{ if: (c) => !!c.waiting(), next: 'wait' }], next: 'final' },
        wait: { who: 'narr', text: '{waiting} stands next to you in the picture. Close enough that it means something, or might soon.', next: 'final' },
        final: { who: 'player', expr: 'happy', text: 'Same time tomorrow?', next: 'sign' },
        sign: { who: 'narr', text: 'Someone turns the sign around.', next: 'bye' },
        bye: { who: 'narr', text: 'See you soon.', end: true },
      },
    },

    /* ================= Evening chats (new, repeatable) ================= */

    milo_chat_1: {
      title: 'Quiet Evening', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: { who: 'milo', expr: 'happy', text: 'I tried a new pencil today. It’s very... pencil-y. In a good way.', next: 'c1' },
        c1: {
          who: 'milo', expr: 'blush', text: 'Sorry. That was a boring story.',
          choices: [
            { text: 'Tell me everything about the pencil.', aff: 3, next: 'a' },
            { text: 'Nothing about you is boring.', aff: 4, next: 'b' },
          ],
        },
        a: { who: 'milo', expr: 'happy', text: 'It’s a 4B. It smudges like a cloud. You’re the only person who ever asks.', end: true },
        b: { who: 'milo', expr: 'flustered', text: 'Oh. Oh no. I’m going to think about that all night.', end: true },
      },
    },
    milo_chat_2: {
      title: 'The Usual', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'milo', expr: 'pensive', text: 'Juniper asked for “the usual” today, and I made it before she sat down. Is that weird? That might be weird.',
          choices: [
            { text: 'It’s a superpower.', aff: 3, next: 'a' },
            { text: 'So what’s my usual?', aff: 4, next: 'b' },
          ],
        },
        a: { who: 'milo', expr: 'happy', text: 'A very small superpower. Like a cat that can only open one specific door.', end: true },
        b: { branch: [{ if: (c) => !!c.usual, next: 'b1' }], next: 'b2' },
        b1: { who: 'milo', expr: 'blush', text: '{usual}. And you always say thank you twice.', end: true },
        b2: { who: 'milo', expr: 'smirk', text: 'You don’t have one yet. I’m watching, though. Respectfully.', end: true },
      },
    },
    milo_chat_3: {
      title: 'This Light', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'milo', expr: 'blush', text: 'Can I draw you? You can keep doing whatever you’re doing. Just... do it in this light.',
          choices: [
            { text: 'Only if I get to see it.', aff: 4, next: 'a' },
            { text: 'Should I pose?', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'milo', expr: 'blush', text: 'When it’s done. Maybe. Probably. If it’s good.', end: true },
        b: { who: 'milo', expr: 'happy', text: 'Please don’t. You’ll do the face.', end: true },
      },
    },
    riven_chat_1: {
      title: 'Last Call', char: 'riven', bg: 'stars',
      nodes: {
        start: {
          who: 'riven', expr: 'smirk', text: 'Closing time already? Your clock is a liar.',
          choices: [
            { text: 'One more cup, on the house.', aff: 3, next: 'a' },
            { text: 'Walk me to the corner?', aff: 4, next: 'b' },
          ],
        },
        a: { who: 'riven', expr: 'smirk', text: 'Careful. Keep spoiling me and I’ll start showing up in daylight.', end: true },
        b: { who: 'riven', expr: 'blush', text: '...Yeah. Sure. It’s on my way. It isn’t on my way.', end: true },
      },
    },
    riven_chat_2: {
      title: 'Small Things', char: 'riven', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'riven', expr: 'neutral', text: 'I fixed the drip tray. Don’t make a thing of it.',
          choices: [
            { text: 'I’m making a thing of it.', aff: 4, next: 'a' },
            { text: 'What else have you fixed around here?', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'riven', expr: 'blush', text: '...It’s a very small thing. Make it small.', end: true },
        b: { who: 'riven', expr: 'smirk', text: 'The speaker. The chairs. The cords. The vibe, arguably.', end: true },
      },
    },
    riven_chat_3: {
      title: 'The Café Guy', char: 'riven', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'riven', expr: 'pensive', text: 'Someone at the record store asked if I was “the café guy.” I said no. Then I said “kind of.”',
          choices: [
            { text: 'You’re definitely the café guy.', aff: 4, next: 'a' },
            { text: 'What does “kind of” mean?', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'riven', expr: 'flustered', text: 'Don’t tell anyone. I have a reputation.', end: true },
        b: { who: 'riven', expr: 'neutral', text: 'It means I’m here a lot. For the outlet.', next: 'b2' },
        b2: { who: 'narr', show: 'riven', expr: 'blush', text: 'His ears turn toward you anyway.', end: true },
      },
    },
    atlas_chat_1: {
      title: 'Closing Shift', char: 'atlas', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'atlas', expr: 'happy', text: 'I stacked all the chairs! Then I unstacked one, so you have somewhere to sit.',
          choices: [
            { text: 'That’s thoughtful. Sit with me?', aff: 4, next: 'a' },
            { text: 'Did you save me a pastry too?', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'atlas', expr: 'flustered', text: 'I’ll unstack another one! Right now! Very fast!', end: true },
        b: { who: 'atlas', expr: 'happy', text: 'Always. It’s in the fridge, in a box with a little heart on it.', end: true },
      },
    },
    atlas_chat_2: {
      title: 'Owed Money', char: 'atlas', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'atlas', expr: 'pensive', text: 'Noor says I hold flowers like they owe me money.',
          choices: [
            { text: 'Show me how you hold them.', aff: 4, next: 'a' },
            { text: 'Do they owe you money?', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'narr', show: 'atlas', expr: 'happy', text: 'He demonstrates with a tea towel. He does hold it like it owes him money.', end: true },
        b: { who: 'atlas', expr: 'smirk', text: 'The tulips might.', end: true },
      },
    },
    atlas_chat_3: {
      title: 'Real Food', char: 'atlas', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'atlas', expr: 'neutral', text: 'Have you eaten today? Real food. Cookies don’t count. Cookies count a little.',
          choices: [
            { text: 'Not yet.', aff: 4, next: 'a' },
            { text: 'Yes, Atlas.', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'narr', show: 'atlas', expr: 'happy', text: 'Five minutes later there’s a sandwich in front of you, cut diagonally, because Atlas believes in that.', end: true },
        b: { who: 'atlas', expr: 'flustered', text: 'Okay. Good. Great. Eat this sandwich anyway.', end: true },
      },
    },
    sora_chat_1: {
      title: 'Good Light', char: 'sora', bg: 'stars',
      nodes: {
        start: {
          who: 'sora', expr: 'smirk', text: 'Stand right there. That streetlight is doing wonderful things for you. I’m only slightly jealous.',
          choices: [
            { text: 'Strike a pose.', aff: 3, next: 'a' },
            { text: 'Get in the picture with me.', aff: 4, next: 'b' },
          ],
        },
        a: { who: 'sora', expr: 'happy', text: 'Iconic. You’re a natural. I’m furious.', end: true },
        b: { who: 'sora', expr: 'blush', text: 'Together? ...Fine. But I’m keeping this one.', end: true },
      },
    },
    sora_chat_2: {
      title: 'The Cape', char: 'sora', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'sora', expr: 'neutral', text: 'Someone asked me today if I’m “really a stylist.” I was wearing a cape.',
          choices: [
            { text: 'The cape spoke for itself.', aff: 4, next: 'a' },
            { text: 'What did you say?', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'sora', expr: 'smirk', text: 'Thank you. The cape is very articulate.', end: true },
        b: { who: 'sora', expr: 'smirk', text: 'I said yes, and “nice shoes, though.” They were not nice shoes.', end: true },
      },
    },
    sora_chat_3: {
      title: 'Bow or No Bow', char: 'sora', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'sora', expr: 'pensive', text: 'I need your honest opinion. Bow, or no bow?',
          choices: [
            { text: 'Bow.', aff: 4, next: 'a' },
            { text: 'No bow.', aff: 3, next: 'b' },
          ],
        },
        a: { who: 'sora', expr: 'happy', text: 'Correct answer. You may continue being my friend.', end: true },
        b: { who: 'narr', show: 'sora', expr: 'neutral', text: 'He takes the bow off. Thirty seconds later, he puts it back on.', next: 'b2' },
        b2: { who: 'sora', expr: 'blush', text: 'I tried. It didn’t feel like me.', end: true },
      },
    },

    /* ================= Little moments (from the foundation’s list) ================= */

    // “A guest remembers your usual drink.” Part one: Milo asks what yours is.
    moment_usual: {
      title: 'Your Usual', char: 'milo', bg: 'cafe-night',
      nodes: {
        start: {
          who: 'milo', expr: 'neutral', text: 'You make everyone’s drinks and never your own. What’s your usual?',
          choices: [
            { text: 'Honey oat latte.', set: { usual: 'honey_oat' }, aff: 2, next: 'end' },
            { text: 'Iced americano.', set: { usual: 'iced_americano' }, aff: 2, next: 'end' },
            { text: 'Strawberry latte.', set: { usual: 'strawberry_latte' }, aff: 2, next: 'end' },
            { text: 'Lavender fog.', set: { usual: 'lavender_fog' }, aff: 2, next: 'end' },
          ],
        },
        end: { who: 'milo', expr: 'happy', text: 'Noted. Not written down. Just noted.', end: true },
      },
    },
    // Part two: a regular remembers it.
    moment_usual_remembered: {
      title: 'Knowing Someone', char: 'juniper', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', show: 'juniper', expr: 'happy', text: 'Just before closing, Juniper comes back to the counter.', next: 'n2' },
        n2: { who: 'juniper', expr: 'happy', text: 'One more, please. {Ausual}, for {name}. Knowing someone takes practice. I’ve been practicing.', next: 'n3' },
        n3: { who: 'narr', text: 'She pays for it before you can argue.', end: true },
      },
    },
    // “Milo draws your character with a tiny crown after a perfect shift.”
    moment_crown: {
      title: 'Perfect Shift', char: 'milo', bg: 'cafe-night', aff: 2,
      nodes: {
        start: { who: 'narr', show: 'milo', expr: 'happy', text: 'Milo slides a takeaway cup across the counter. On it: you, behind the register, wearing a tiny crown.', next: 'n2' },
        n2: { who: 'milo', expr: 'smirk', text: 'Every order right. It’s the law. You get a crown.', end: true },
      },
    },
    // Rosalie’s third instruction.
    moment_haunted: {
      title: 'Definitely Not Haunted', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'At closing, the espresso machine lets out a long, low groan.', next: 'n2' },
        n2: { who: 'sora', expr: 'surprised', text: 'It’s haunted.', next: 'n3' },
        n3: { who: 'riven', expr: 'neutral', text: 'It’s the pressure valve.', next: 'n4' },
        n4: { who: 'sora', expr: 'smirk', text: 'A haunted pressure valve.', next: 'n5' },
        n5: { who: 'narr', text: 'You remember Rosalie’s third instruction and say nothing at all.', end: true },
      },
    },
    // “A badly shaped latte-art heart gets kept as a photograph.”
    moment_latte_photo: {
      title: 'The Best Bad Heart', char: 'mina', bg: 'cafe-day',
      nodes: {
        start: { who: 'narr', show: 'mina', expr: 'happy', text: 'One of today’s latte-art hearts came out lopsided. Before you can fix it, Mina’s camera clicks.', next: 'n2' },
        n2: { who: 'mina', expr: 'happy', text: 'Don’t fix it. That’s the best bad heart I’ve ever seen.', next: 'n3' },
        n3: { who: 'narr', text: 'The photo ends up taped beside the register.', end: true },
      },
    },
    // “Atlas brings a container labeled with your name so nobody eats your breakfast.”
    moment_container: {
      title: 'Labeled', char: 'atlas', bg: 'morning', aff: 2,
      nodes: {
        start: { who: 'narr', show: 'atlas', expr: 'happy', text: 'There’s a new container in the café fridge. The label says, in large careful letters: {NAME}’S BREAKFAST. DO NOT EAT. THIS MEANS YOU.', next: 'n2' },
        n2: { who: 'atlas', expr: 'flustered', text: 'It’s so nobody eats your breakfast. You keep forgetting to have it, and then other people find it.', next: 'n3' },
        n3: { who: 'atlas', expr: 'happy', text: 'It’s cinnamon rolls. Obviously.', end: true },
      },
    },
    // “Sora leaves a ribbon on the register that matches your outfit.”
    moment_ribbon: {
      title: 'Coincidence', char: 'sora', bg: 'morning', aff: 2,
      nodes: {
        start: { who: 'narr', text: 'There’s a ribbon tied around the register this morning. It matches your outfit exactly.', next: 'n2' },
        n2: { who: 'sora', expr: 'smirk', text: 'Coincidence.', next: 'n3' },
        n3: { who: 'narr', show: 'sora', expr: 'blush', text: 'It is not a coincidence.', end: true },
      },
    },
    // “Someone falls asleep at the window table after helping all day.”
    moment_asleep: {
      title: 'The Window Table', bg: 'cafe-night', aff: 2, affTo: 'helper',
      nodes: {
        start: {
          branch: [
            { if: (c) => c.helper === 'riven', next: 'r' },
            { if: (c) => c.helper === 'atlas', next: 'a' },
            { if: (c) => c.helper === 'sora', next: 's' },
          ],
          next: 'm',
        },
        m: { who: 'narr', show: 'milo', expr: 'pensive', text: 'After helping all day, Milo has fallen asleep at the window table with a pencil still in his hand.', next: 'm2' },
        m2: { who: 'milo', expr: 'flustered', text: '...I wasn’t asleep. I was resting my sketchbook.', end: true },
        r: { who: 'narr', show: 'riven', expr: 'pensive', text: 'After helping all day, Riven has fallen asleep at the window table with his headphones still on.', next: 'r2' },
        r2: { who: 'riven', expr: 'blush', text: '...I was listening to something. With my eyes closed. Professionally.', end: true },
        a: { who: 'narr', show: 'atlas', expr: 'happy', text: 'After helping all day, Atlas has fallen asleep at the window table, one arm around a box of pastries like he’s guarding it.', next: 'a2' },
        a2: { who: 'atlas', expr: 'flustered', text: 'I’m awake! The pastries are safe!', end: true },
        s: { who: 'narr', show: 'sora', expr: 'neutral', text: 'After helping all day, Sora has fallen asleep at the window table. Even asleep, he looks styled.', next: 's2' },
        s2: { who: 'sora', expr: 'smirk', text: 'I was not asleep. I was being photographed by no one.', end: true },
      },
    },
    // “The group argues over what to name a new menu item.”
    moment_name_drink: {
      title: 'Naming Rights', bg: 'cafe-night',
      nodes: {
        start: { who: 'narr', text: 'Tonight’s experiment works: espresso, honey, steamed milk and heart sprinkles, in Rosalie’s best teacup. It needs a name for the menu.', next: 'n2' },
        n2: { who: 'milo', expr: 'happy', text: 'The Tiny Crown.', next: 'n3' },
        n3: { who: 'riven', expr: 'neutral', text: 'Encore.', next: 'n4' },
        n4: { who: 'atlas', expr: 'happy', text: 'The Big Hug!', next: 'n5' },
        n5: { who: 'sora', expr: 'smirk', text: 'Bellflower Bloom. Obviously. Everything else is wrong.', next: 'pick' },
        pick: {
          who: 'narr', text: 'Everyone looks at you.',
          choices: [
            { text: 'Tiny Crown.', set: { menuName: 'Tiny Crown' }, to: 'milo', aff: 2, next: 'end' },
            { text: 'Encore.', set: { menuName: 'Encore' }, to: 'riven', aff: 2, next: 'end' },
            { text: 'Big Hug.', set: { menuName: 'Big Hug' }, to: 'atlas', aff: 2, next: 'end' },
            { text: 'Bellflower Bloom.', set: { menuName: 'Bellflower Bloom' }, to: 'sora', aff: 2, next: 'end' },
          ],
        },
        end: { who: 'narr', text: 'It goes on the menu tomorrow. The losing side demands a recount.', end: true },
      },
    },
    // “Your chosen partner begins saying ‘our café’, then pauses to see how you react.”
    moment_our_cafe: {
      title: 'Our Café', bg: 'cafe-night',
      nodes: {
        start: {
          branch: [
            { if: (c) => c.closest() === 'riven', next: 'r' },
            { if: (c) => c.closest() === 'atlas', next: 'a' },
            { if: (c) => c.closest() === 'sora', next: 's' },
          ],
          next: 'm',
        },
        m: { who: 'milo', expr: 'pensive', text: 'We should get more mugs for our ca— for the café. The café.', next: 'm2' },
        m2: { who: 'narr', show: 'milo', expr: 'blush', text: 'He pauses, waiting to see how you react.', next: 'reply' },
        r: { who: 'riven', expr: 'neutral', text: 'The speaker in our caf— in the café needs a new cable.', next: 'r2' },
        r2: { who: 'narr', show: 'riven', expr: 'blush', text: 'He pauses. His ears are already turned toward you.', next: 'reply' },
        a: { who: 'atlas', expr: 'happy', text: 'I was thinking we could do pastries on weekends at our ca— at your café.', next: 'a2' },
        a2: { who: 'narr', show: 'atlas', expr: 'flustered', text: 'He pauses. Even his tail stops moving while he waits.', next: 'reply' },
        s: { who: 'sora', expr: 'smirk', text: 'Our café needs better napkins.', next: 's2' },
        s2: { who: 'narr', show: 'sora', expr: 'blush', text: 'He hears it a second after he says it. He pauses, and doesn’t take it back.', next: 'reply' },
        reply: {
          who: 'narr', text: 'The word sits between you, warm as a fresh cup.',
          choices: [
            { text: '“Our café” sounds right.', to: 'closest', aff: 3, next: 'yes' },
            { text: 'Say it again.', to: 'closest', aff: 3, next: 'again' },
          ],
        },
        yes: { who: 'narr', text: 'It does.', end: true },
        again: { who: 'narr', text: 'He does. Slower, this time.', end: true },
      },
    },
  };

  Object.assign(window.GAME_DATA, { events, scripted, rush, routes, chats, moments, scenes, castIds: CAST });
})();
