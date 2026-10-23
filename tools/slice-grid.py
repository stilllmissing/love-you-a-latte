"""Cut the animation / frame sheets in assets/source into numbered frames.

    python3 tools/slice-grid.py            # every sheet below
    python3 tools/slice-grid.py fx-steam   # one

Each sheet is a grid of frames. Rows are found from gaps in the artwork, then frames
within a row from gaps (or evenly if the artwork touches). Output goes to
assets/<folder>/<name>-<row>-<col>.webp (row and col start at 0), cropped to the artwork.
"""
import sys
from pathlib import Path

import numpy as np
import scipy.ndimage as nd
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'source'
SOFT = 40

# key: (file, folder, prefix per row (list) or None, rows, cols)
SHEETS = {
    'fx-coins':   ('fx-coins-hearts-sparkles.png', 'fx', ['coin', 'heart', 'sparkle', 'paw'], 6),
    'fx-steam':   ('fx-steam-foam.png', 'fx', ['steam', 'foam', 'steam-matcha', 'foam-splash'], 6),
    'fx-splash':  ('fx-splashes.png', 'fx', ['splash-coffee', 'splash-milk', 'splash-matcha', 'spill-mug'], 6),
    'pour':       ('pour-streams.png', 'fx', ['stream-coffee', 'stream-milk', 'stream-water', 'stream-berry'], 6),
    'steps-a':    ('drink-steps-a.png', 'steps', ['a-mug-latte', 'a-mug-matcha', 'a-glass-berry', 'a-tea-lavender', 'a-glass-iced'], 5),
    'steps-b':    ('drink-steps-b.png', 'steps', ['b-mug-latte', 'b-mug-matcha', 'b-glass-berry', 'b-tea-lavender', 'b-glass-iced'], 5),
    'finish':     ('drink-finishing-steps.png', 'steps', ['f-mug-latte', 'f-mug-matcha', 'f-glass-iced', 'f-tea-lavender'], 6),
    'machines':   ('machines.png', 'machines', ['espresso', 'grinder', 'kettle', 'matcha'], 4),
    'work-milo':  ('milo-work.png', 'work', ['milo-idle', 'milo-note', 'milo-pour', 'milo-serve'], 4),
    'work-riven': ('riven-work.png', 'work', ['riven-idle', 'riven-note', 'riven-pour', 'riven-serve'], 4),
    'work-atlas': ('atlas-work.png', 'work', ['atlas-idle', 'atlas-note', 'atlas-pour', 'atlas-serve'], 4),
    'work-sora':  ('sora-work.png', 'work', ['sora-idle', 'sora-note', 'sora-pour', 'sora-serve'], 4),
    'poses-a':    ('regulars-a-poses.png', 'poses', ['juniper-walk', 'juniper-sit', 'dante-walk', 'dante-sit', 'mina-walk', 'mina-sit', 'santiago-walk', 'santiago-sit'], 4),
    'poses-b':    ('regulars-b-poses.png', 'poses', ['noor-walk', 'noor-sit', 'beau-walk', 'beau-sit', 'cleo-walk', 'cleo-sit', 'rowan-walk', 'rowan-sit'], 4),
}


def bands(mask, axis, min_gap):
    """Runs of artwork along an axis, joined when the gap between them is below min_gap."""
    proj = mask.any(axis=axis)
    runs, start = [], None
    for i, v in enumerate(np.append(proj, False)):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append([start, i])
            start = None
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < min_gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return merged


def evenly(lo, hi, n, mask=None, axis=1, reach=30):
    """n equal cells; with a mask, each cut slides to the emptiest line within `reach` px."""
    step = (hi - lo) / n
    cuts = [int(lo + k * step) for k in range(n + 1)]
    if mask is not None:
        density = mask.sum(axis=axis)
        for k in range(1, n):
            a, b = max(cuts[k] - reach, 0), min(cuts[k] + reach, len(density) - 1)
            cuts[k] = a + int(np.argmin(density[a:b + 1]))
    return [[cuts[k], cuts[k + 1]] for k in range(n)]


def slice_sheet(key):
    fname, folder, names, cols = SHEETS[key]
    rgba = np.array(Image.open(SRC / fname).convert('RGBA'))
    mask = rgba[:, :, 3] >= 200
    rows = bands(mask, 1, 14)
    rows = [r for r in rows if r[1] - r[0] > 25]
    if len(rows) != len(names):
        rows = evenly(rows[0][0], rows[-1][1], len(names), mask, 1)
    out = ROOT / 'assets' / folder
    out.mkdir(parents=True, exist_ok=True)
    for ri, (y0, y1) in enumerate(rows):
        sub = mask[y0:y1]
        cs = [c for c in bands(sub, 0, 10) if c[1] - c[0] > 10]
        if len(cs) != cols:
            cs = evenly(cs[0][0], cs[-1][1], cols, sub, 0)
        for ci, (x0, x1) in enumerate(cs):
            pad = 3
            cell = rgba[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad].copy()
            cell[cell[:, :, 3] < SOFT, 3] = 0
            # drop slivers of neighbouring frames that fell inside this cell
            groups, n = nd.label(cell[:, :, 3] > 0, structure=np.ones((3, 3)))
            if n > 1:
                sizes = nd.sum(cell[:, :, 3] > 0, groups, range(1, n + 1))
                for lab, size in enumerate(sizes, 1):
                    if size < 0.04 * sizes.max():
                        cell[groups == lab, 3] = 0
            ys, xs = np.where(cell[:, :, 3] > 0)
            if not len(ys):
                continue
            img = Image.fromarray(cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
            path = out / f'{names[ri]}-{ci}.webp'
            img.save(path, 'WEBP', quality=92, alpha_quality=100, method=6)
        print(f'{key} row {ri}: {names[ri]} {len(cs)} frames')


if __name__ == '__main__':
    for key in (sys.argv[1:] or SHEETS):
        slice_sheet(key)
