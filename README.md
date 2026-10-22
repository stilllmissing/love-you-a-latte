# Purrfect Pour

*Some people take their coffee sweet. Others take a little time.*

A cozy café-management and romance visual novel. You're minding **The Velvet Paw**, a tiny café on Bellflower Lane, for thirty days while your aunt Rosalie takes the trip she keeps postponing. The neighborhood's Bellflower Night Market is on day 30, the café hosts it, and four catboys keep finding reasons to stay after closing. All characters are adults (21+). Romance is sweet and non-explicit, and every route is open whatever your protagonist's gender.

## Run it

No build step and no dependencies. Serve the folder with any static server and open it on a phone or in a narrow browser window:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` from disk also works. The Google Fonts faces are optional; without a connection the game falls back to system fonts.

## How a day works

1. **Morning.** Story scenes and little moments play first. After day 15 you also choose who's helping that day (see below).
2. **Shift.** Customers walk up. Take the order, then make the drink: pick cup, base, milk, syrup and topping, then **hold to pour** and let go inside the pink band. Correct orders pay the price plus a tip, and cast members gain affection. Some customers have scenes of their own as they arrive or leave.
3. **Closing time.** Earnings, tips, satisfaction stars, affection.
4. **Evening.** A story event if the calendar has one, otherwise spend time with someone. Each person has a run of story evenings (unlocked by affection and day) and short repeatable chats in between.
5. **Upgrades.** Spend coins on décor. It appears in the café and raises tips.

### The calendar

| Day | What happens |
| --- | --- |
| 1 | “The Keys”: Rosalie’s note, Milo at the door. First shift: Juniper’s “Your Usual” |
| 2 | Atlas delivers a refrigerator (“Heavy Lifting”) |
| 3 | Riven fixes the speaker (“The Speaker”) |
| 4–6 | Sora walks in (“Presentation Matters”), after a few days or once you own some décor |
| 10 | “Rain Check”: a downpour traps everyone; pick who to sit beside |
| 15 | “Too Many Orders”: a rush hour; whoever is closest to you follows you into the back room. That evening the group builds a staff system |
| 16+ | Choose a helper each morning: Milo (wider pink band), Riven (customers wait longer), Atlas (a pastry with every order), Sora (+15% tips) |
| 30 | The Bellflower Night Market, then a private confession from whoever you're closest to (if affection is high enough), then the ending |

Endings: **romance** (a quiet first moment with your partner), **waiting** (you asked for more time) or **friendship** (the group photo). All end with “Same time tomorrow?” and you can keep the café open afterward.

### The cast

| | Age | Role | Signature drink |
| --- | --- | --- | --- |
| Milo | 23 | Weekend barista, aspiring illustrator | Honey oat latte |
| Riven | 25 | Record-store clerk and musician | Iced americano (plus a strawberry pastry “for later”) |
| Atlas | 27 | Florist’s delivery assistant, amateur baker | Strawberry latte, extra foam |
| Sora | 24 | Fashion stylist, event planner | Lavender fog |

Eight neighborhood **regulars** each carry a small story across the month: Juniper, Dante, Mina, Santiago, Noor, Beau, Cleo and Rowan. Serve them to hear the next chapter; finishing one can pay off (Noor adds tips, Beau restores the Pastel Chairs), and the finished ones show up at the Night Market.

## Controls

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Buttons | Tap | Tab to focus, Enter or Space |
| Pick an ingredient | Tap an option | `1`–`5` |
| Pour | Press and hold **Hold to Pour** | Hold `Space` |
| Serve | **Serve ♥** | `Enter` |
| Advance dialogue | Tap the scene or text box | `Enter` or `Space` |
| Dialogue choice | Tap a choice | `1`–`4` |
| Back / settings | Back button, ⚙ | `Esc` |

⚙ Settings has sound, reduce motion, text speed, **Change name, look or pronouns**, and **Reset save data** (tucked in a disclosure). Progress saves to `localStorage`.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Screen markup |
| `css/style.css` | All styling, animation and responsive rules |
| `js/data.js` | Ingredients, recipes, cast, protagonist (looks, pronouns), recurring guests, staff tasks, décor, economy |
| `js/story.js` | **The story**: every scene, the calendar of events, scripted customers, little moments |
| `js/game.js` | Engine: screens, calendar, shifts, drink making, scene runner, relationships, gallery, shop, save/load |
| `js/cafe.js` | The café scene on a 160×120 pixel canvas, plus décor drawing |
| `js/sprites.js` | Drink cups and UI icons drawn from pixel grids |
| `js/audio.js` | Small synthesized sound effects (Web Audio) |
| `assets/characters/<id>/` | Cast: `bust.webp`, `full.webp`, `bust-<expression>.webp`, `chibi-<expression>.webp`, `turn-0…7.webp`. Guests: `full.webp` and three busts. Player looks: `player-a…l` |
| `assets/source/` | The original art sheets |
| `tools/slice-art.py` | Re-slices the cast and protagonist sheets (`pip install pillow numpy scipy`, then `python3 tools/slice-art.py`) |
| `tools/slice-assets.py` | Re-slices the regulars sheets (`python3 tools/slice-assets.py`) |

Console helpers for testing: `PP.skipTo(day)`, `PP.evening()`, `PP.save`.

### Writing story

Scenes are objects in `js/story.js`. Their text is plain data, so a writer can edit lines without touching the engine.

```js
my_scene: {
  title: 'Doesn’t Mean Anything', char: 'riven', bg: 'cafe-night',   // bg: cafe-day, cafe-night, morning, dusk, stars
  aff: 2,                                // affection given to `char` when the scene ends
  nodes: {
    start: { who: 'narr', show: 'riven', expr: 'neutral', text: 'He labels the cords.', next: 'n2' },
    n2: { who: 'riven', expr: 'smirk', text: 'It doesn’t mean anything, {name}.', next: 'c1' },
    c1: {
      who: 'narr', text: 'He waits.',
      choices: [
        { text: 'Thank you.', aff: 5, next: 'end' },                       // you say this line
        { text: 'Sit beside him', say: false, flag: 'sat', next: 'end' },   // an action: not spoken
      ],
    },
    end: { who: 'riven', expr: 'blush', text: '...You’re welcome.', end: true },
  },
},
```

- **Speakers:** `who` is `narr`, `player` or a cast/guest id. `show` puts a character on screen during narration. `expr` is `neutral, happy, blush, flustered, surprised, sad, pensive` or `smirk` for the cast (guests fall back to the closest of their three).
- **Branching:** `branch: [{ flag: 'x', next }, { if: (c) => c.aff('milo') > 30, next }]` (first match wins, else `next`). Any node can have `if` to be skipped. Choices can have `met: 'sora'` or `if`.
- **Effects:** `set: { flag, usual, menuName, route }` on a node or choice. Choices can aim affection with `to: 'closest' | 'helper' | '<id>'`.
- **Text tokens:** `{name}` `{NAME}` `{they}` `{them}` `{their}` `{theirs}` `{themself}` `{theyre}` (capitalize for sentence starts), `{closest}` `{partner}` `{waiting}` `{helper}` `{usual}` `{ausual}`. Text can also be a function of the story context.
- **Scheduling:** add to `events` (a day and `morning`/`evening`), `scripted` (a customer with an `intro`/`outro` scene), `routes` (a character's evening scenes), `chats`, or `moments` (little scenes gated by a `when` function).

Content in `data.js` is similar: add a recipe to `recipes`, a regular to `guests` (art folder plus a list of `beats`), or décor to `decor` (and draw it in `js/cafe.js`).
