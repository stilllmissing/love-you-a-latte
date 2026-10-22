"""Cut the café, furniture, drink and regular-customer sheets in assets/source
into the images the game loads.

    pip install pillow numpy scipy
    python3 tools/slice-assets.py

Writes:
  assets/scenes/<name>.webp          backgrounds (interior day/night, storefront, barista counter)
  assets/props/<name>.webp           the counter, furniture and décor
  assets/items/<name>.webp           finished drinks, treats, cups, ingredients and toppings
  assets/characters/<id>/...         regulars: full.webp and bust-<expression>.webp
"""
from pathlib import Path

import numpy as np
import scipy.ndimage as nd
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'source'
OUT = ROOT / 'assets'
SOLID = 160      # alpha that certainly belongs to a figure
SOFT = 40        # alpha of the soft outline we keep
MIN_PART = 200   # loose parts smaller than this are sheet haze, not art

# Sheets are read left to right, top to bottom.
DECOR = [
    'espresso-machine', 'grinder', 'kettle', 'register', 'cake-case',
    'armchair', 'table', 'chair', 'sofa', 'bookshelf',
    'monstera', 'flower-pot', 'cat-tower', 'pendant-lamp', 'chalkboard',
    'sugar-pot', 'napkins', 'tray', 'tip-jar', 'rose-vase',
]
ITEMS = [
    'drink-espresso', 'drink-heart-latte', 'drink-matcha-latte', 'drink-strawberry-matcha', 'drink-lavender-latte', 'drink-iced-latte',
    'treat-croissant', 'treat-cake', 'treat-paw-cookie', 'treat-cinnamon-roll', 'treat-macarons', 'treat-muffin',
    'cup-mug', 'cup-glass', 'cup-teacup', 'tool-pitcher', 'tool-whisk', 'tool-tamper',
    'milk-whole', 'milk-oat', 'syrup-lavender', 'syrup-strawberry', 'base-espresso', 'base-matcha',
    'top-cream', 'top-ice', 'top-strawberries', 'syrup-chocolate', 'top-lavender', 'top-cinnamon',
]
# Regular customers: one column each, full body on top and three busts below.
REGULARS = {
    'regulars-a.png': ['posy', 'theo', 'hana', 'fennick'],
    'regulars-b.png': ['amira', 'kofi', 'clem', 'sky'],
}
REGULAR_BUSTS = {   # third bust differs between the sheets
    'regulars-a.png': ['neutral', 'happy', 'content'],
    'regulars-b.png': ['neutral', 'happy', 'sad'],
}
SCENES = {
    'interior-day.png': 'interior-day', 'interior-night.png': 'interior-night',
    'storefront.png': 'storefront', 'barista-counter.png': 'barista-counter',
}


def write(img, path, max_side=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    if max_side and max(img.size) > max_side:
        s = max_side / max(img.size)
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    img.save(path, 'WEBP', quality=88, alpha_quality=100, method=6)
    print(f'{path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB')


def cut(rgba, mask):
    """Crop to `mask`, keep its soft outline, and recolour the outline from the
    nearest solid pixel so the sheet's coloured haze does not leave a halo."""
    alpha = rgba[:, :, 3]
    m = mask.copy()
    rows = mask.any(1)
    for _ in range(4):
        m |= nd.binary_dilation(m) & (alpha >= SOFT)
    m &= rows[:, None]
    img = rgba.copy()
    img[~m, 3] = 0
    solid = alpha >= 200
    _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
    edge = m & ~solid
    img[edge, :3] = img[iy[edge], ix[edge], :3]
    ys, xs = np.where(m)
    return Image.fromarray(img[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def split(rgba, seeds, reach=60):
    """One mask per seed box (x0, x1, y0, y1). Seeds grow through solid pixels,
    so touching figures part where they meet; detached pieces (a sauce drizzle,
    a stray curl) join the nearest figure if they are close and not just haze."""
    h, w = rgba.shape[:2]
    solid = rgba[:, :, 3] >= SOLID
    owner = np.zeros((h, w), int)
    for i, (x0, x1, y0, y1) in enumerate(seeds):
        owner[y0:y1, x0:x1][solid[y0:y1, x0:x1]] = i + 1
    cross = nd.generate_binary_structure(2, 1)
    while True:
        free = solid & (owner == 0)
        grown = False
        for i in range(1, len(seeds) + 1):
            new = nd.binary_dilation(owner == i, cross) & free
            if new.any():
                owner[new] = i
                free &= ~new
                grown = True
        if not grown:
            break
    # detached solid pieces: keep the sizeable ones near a figure
    lab, n = nd.label(solid & (owner == 0))
    if n:
        sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
        dist, (iy, ix) = nd.distance_transform_edt(owner == 0, return_indices=True)
        for l in range(1, n + 1):
            part = lab == l
            if sizes[l - 1] >= MIN_PART and dist[part].min() <= reach:
                y, x = np.argwhere(part)[0]
                owner[part] = owner[iy[y, x], ix[y, x]]
    return [owner == i for i in range(1, len(seeds) + 1)]


def blob_seeds(rgba, count, shrink=0.3):
    """Seed boxes from the `count` largest solid blobs, in reading order."""
    solid = rgba[:, :, 3] >= SOLID
    lab, n = nd.label(solid)
    sizes = nd.sum(solid, lab, range(1, n + 1))
    boxes = []
    for l in np.argsort(sizes)[::-1][:count] + 1:
        sl = nd.find_objects((lab == l).astype(int))[0]
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        dy, dx = int((y1 - y0) * shrink), int((x1 - x0) * shrink)
        boxes.append((x0 + dx, x1 - dx, y0 + dy, y1 - dy))
    return reading_order(boxes)


def reading_order(boxes, row_gap=120):
    boxes = sorted(boxes, key=lambda b: (b[2] + b[3]) / 2)
    rows, row = [], []
    for b in boxes:
        if row and (b[2] + b[3]) / 2 - (row[-1][2] + row[-1][3]) / 2 > row_gap:
            rows.append(row)
            row = []
        row.append(b)
    rows.append(row)
    return [b for r in rows for b in sorted(r, key=lambda b: b[0])]


def main_body(rgba, mask):
    """Keep the largest solid shape in `mask` and parts that sit within its
    height; drops slivers of a neighbouring row."""
    lab, n = nd.label(mask & (rgba[:, :, 3] >= SOLID))
    if n <= 1:
        return mask
    sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
    main = np.argmax(sizes) + 1
    ys = np.where((lab == main).any(1))[0]
    keep = lab == main
    for l in range(1, n + 1):
        if l == main or sizes[l - 1] < MIN_PART:
            continue
        cy = np.where((lab == l).any(1))[0].mean()
        if ys.min() + 20 < cy < ys.max() - 20:
            keep |= lab == l
    return mask & nd.binary_dilation(keep, iterations=2)


def main(only=None):
    if only == 'regulars':
        return slice_regulars()
    for src, name in SCENES.items():
        write(Image.open(SRC / src).convert('RGB'), OUT / 'scenes' / f'{name}.webp', max_side=1680)

    counter = np.array(Image.open(SRC / 'counter.png').convert('RGBA'))
    write(cut(counter, split(counter, blob_seeds(counter, 1))[0]), OUT / 'props' / 'counter.webp', max_side=1400)

    decor = np.array(Image.open(SRC / 'decor-sheet.png').convert('RGBA'))
    seeds = blob_seeds(decor, 19)
    # the purple chair and the cat tower below it touch: seed them separately
    merged = next(b for b in seeds if b[0] < 700 < b[1] and b[2] < 500 < b[3])
    seeds[seeds.index(merged)] = (620, 720, 380, 520)
    seeds.append((610, 740, 680, 860))
    seeds = reading_order(seeds)
    for name, m in zip(DECOR, split(decor, seeds)):
        write(cut(decor, m), OUT / 'props' / f'{name}.webp')

    items = np.array(Image.open(SRC / 'drinks-sheet.png').convert('RGBA'))
    for name, m in zip(ITEMS, split(items, blob_seeds(items, 30))):
        write(cut(items, m), OUT / 'items' / f'{name}.webp')

    slice_regulars()


def slice_regulars():
    for sheet, ids in REGULARS.items():
        rgba = np.array(Image.open(SRC / sheet).convert('RGBA'))
        h, w = rgba.shape[:2]
        solid = rgba[:, :, 3] >= SOLID
        rows = row_bands(solid, 4)
        cols = [round(w * (2 * i + 1) / 8) for i in range(4)]
        seeds = [(cx - 50, cx + 50, (y0 + y1) // 2 - 25, (y0 + y1) // 2 + 25) for y0, y1 in rows for cx in cols]
        masks = split(rgba, seeds)
        for r, (y0, y1) in enumerate(rows):
            for c, cid in enumerate(ids):
                kind = 'full' if r == 0 else f'bust-{REGULAR_BUSTS[sheet][r - 1]}'
                band = np.zeros((h, w), bool)
                band[y0:y1] = True
                write(cut(rgba, main_body(rgba, masks[r * 4 + c] & band)), OUT / 'characters' / cid / f'{kind}.webp',
                      max_side=900 if r == 0 else None)


def row_bands(solid, count):
    """Split the sheet height into `count` bands at the emptiest rows."""
    h = solid.shape[0]
    rows = solid.sum(1).astype(float)
    cuts = []
    for i in range(1, count):
        guess = round(h * (0.42 + 0.58 * (i - 1) / (count - 1))) if i > 1 else round(h * 0.44)
        lo, hi = guess - 60, guess + 60
        cuts.append(lo + int(np.argmin(rows[lo:hi])))
    edges = [0] + cuts + [h]
    return [(edges[i], edges[i + 1]) for i in range(count)]


if __name__ == '__main__':
    import sys
    main(sys.argv[1] if len(sys.argv) > 1 else None)
