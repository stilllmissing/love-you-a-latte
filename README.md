# Purrfect Pour

A cozy café-management and romance visual-novel prototype. You've inherited **The Velvet Paw**, a neighborhood cat café. Brew drinks for the regulars, decorate the café, and get to know its catboy cast. All characters are adults (21+), and the romance stays sweet and non-explicit.

## Run it

There's no build step and there are no dependencies. Serve the folder with any static server and open it on a phone or in a narrow browser window:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from disk also works. The Google Fonts pixel and body faces are optional: without a connection the game falls back to system fonts.

## How to play

1. **Start Day.** A short intro with Milo, then the café opens.
2. **Take Order.** Read the ticket. It names the cup, base, milk, syrup and topping.
3. **Make Drink.** Pick each ingredient, then **hold to pour** and let go inside the pink band. A perfect pour and a quick serve earn bigger tips.
4. **Serve.** The ticket is checked: correct orders pay full price plus a tip, and cast members gain affection.
5. **Closing Time.** See earnings, tips, satisfaction stars and affection changes.
6. **Evening.** Spend time with someone. Story scenes unlock as affection grows, and your choices raise or lower affection and change later dialogue.
7. **Upgrades.** Spend coins on décor. Each piece shows up in the café and raises tips. Owning two pieces brings in a new character.

### Controls

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Buttons | Tap | Tab to focus, Enter or Space |
| Pick an ingredient | Tap an option | `1` to `4` |
| Pour | Press and hold **Hold to Pour** | Hold `Space` |
| Serve | **Serve ♥** | `Enter` |
| Advance dialogue | Tap the scene or text box | `Enter` or `Space` |
| Dialogue choice | Tap a choice | `1` to `3` |
| Back / settings | Back button, ⚙ | `Esc` |

Settings (⚙) has sound, reduce motion, text speed, and **Reset save data** (tucked inside a disclosure).

## Cast

| Character | Age | Style | Favorite order | Unlock |
| --- | --- | --- | --- | --- |
| Milo | 24 | Shy, soft-colored sketcher | Oat Milk Latte | Intro |
| Riven | 26 | Emo musician, secretly tender | Midnight Double | Visits on day 1 |
| Atlas | 29 | Big, warm, easily flustered baker | Strawberry Cloud | Visits on day 1 |
| Lumi | 25 | Fashion-forward stylist | Blossom Matcha | Own 2 décor pieces |

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Screen markup: title, café, drink station, results, evening, dialogue, gallery, upgrades |
| `css/style.css` | All styling, animation and responsive rules |
| `js/data.js` | **Game content**: ingredients, recipes, cast, regulars, décor, story scenes, routes, first-day shift |
| `assets/characters/` | Cast art per character: `<id>-bust.webp` (dialogue, gallery, evening cards), `<id>-full.webp` (profile), `<id>-chibi.webp` (café counter, title) |
| `assets/source/` | The original character sheets |
| `tools/slice-art.py` | Re-slices the sheets into `assets/characters/` (`pip install pillow numpy scipy`, then `python3 tools/slice-art.py`) |
| `js/sprites.js` | Procedural pixel art for the non-romanceable regulars, cups and icons, output as SVG |
| `js/cafe.js` | The café scene on a 160×120 pixel canvas, plus décor drawing reused for shop previews |
| `js/audio.js` | Small synthesized sound effects (Web Audio, no files) |
| `js/game.js` | Engine: screens, shift loop, drink making, scoring, dialogue runner, gallery, shop, save/load |

### Adding content

- **Recipe:** add an entry to `recipes` in `js/data.js` using ingredient ids from `ingredients`.
- **Character:** add to `characters` with `lines` and a `routes` entry, and put `<id>-bust.webp`, `<id>-full.webp` and `<id>-chibi.webp` in `assets/characters/`. A scene node's `expr` (`happy`, `blush`, `flustered`, `sad`, `smirk`) plays a pose and an emote over the art.
- **Scene:** add to `scenes`. Nodes support `who`, `expr`, `text`, `next`, `end`, `choices` (`{ text, aff, flag, next }`) and `branch` (`[{ flag, next }]`, where the first matching flag wins).
- **Décor:** add to `decor`, then draw it in `js/cafe.js` (the `decor` object, `drawBackground`, and the `preview` sizes).

Progress saves to `localStorage` under `purrfect-pour:save:v1`. Settings save separately, so resetting the save keeps them.
