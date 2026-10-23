"""Cut the regulars' walking and sitting sheets (assets/source/regulars-*-poses.png).

    python3 tools/slice-poses.py

Each sheet holds four people, two rows each. Frames 0-1 stand, 2-5 walk, 6-7 sit. The frames touch, so
they are found as separate figures instead of by grid. Output: assets/poses/<id>-<0..7>.webp
"""
import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('slice_ui', ROOT / 'tools' / 'slice-ui.py')
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)

LIMITS = {'regulars-a-poses.png': (120, 260), 'regulars-b-poses.png': (150, 235)}
# the second sheet has seven rows (Cleo only has one), found by eye
FIXED = {'regulars-b-poses.png': [9, 242, 467, 711, 926, 1147, 1352, 1536]}
ROWS = {'regulars-b-poses.png': [('noor', 0), ('noor', 4), ('beau', 0), ('beau', 4), ('cleo', 0), ('rowan', 0), ('rowan', 4)]}
SHEETS = {
    'regulars-a-poses.png': ['juniper', 'dante', 'mina', 'santiago'],
    'regulars-b-poses.png': ['noor', 'beau', 'cleo', 'rowan'],
}

def cut_rows(m, lo, hi, n, lo_len=120, hi_len=260):
    """Split lo..hi into n cells whose cuts fall on the emptiest rows of pixels."""
    dens = np.append(m.sum(axis=1).astype(float), 0.0)
    INF = 1e18
    best = {(0, lo): 0.0}
    back = {}
    for k in range(1, n + 1):
        for y in range(lo + lo_len * k, min(lo + hi_len * k, hi) + 1):
            if k == n and y != hi:
                continue
            cands = [(best[(k - 1, y0)] + (dens[y] if k < n else 0), y0)
                     for y0 in range(y - hi_len, y - lo_len + 1) if (k - 1, y0) in best]
            if cands:
                v, y0 = min(cands)
                best[(k, y)] = v
                back[(k, y)] = y0
    y, cuts = hi, [hi]
    for k in range(n, 0, -1):
        y = back[(k, y)]
        cuts.append(y)
    cuts.reverse()
    return [[cuts[i], cuts[i + 1]] for i in range(n)]


sg_spec = importlib.util.spec_from_file_location('slice_grid', ROOT / 'tools' / 'slice-grid.py')
sg = importlib.util.module_from_spec(sg_spec)
sg_spec.loader.exec_module(sg)

for fname, people in SHEETS.items():
    rgba = np.array(Image.open(ui.SRC / fname).convert('RGBA'))
    mask = rgba[:, :, 3] >= 200
    cols = [c for c in sg.bands(mask, 0, 12) if c[1] - c[0] > 40]
    assert len(cols) == 4, (fname, cols)
    out = ROOT / 'assets' / 'poses'
    out.mkdir(parents=True, exist_ok=True)
    for ci, (x0, x1) in enumerate(cols):
        ys = np.where(mask[:, x0:x1].any(axis=1))[0]
        if fname in FIXED:
            cells = [[FIXED[fname][i], FIXED[fname][i + 1]] for i in range(len(FIXED[fname]) - 1)]
        else:
            cells = cut_rows(mask[:, x0:x1], ys.min(), ys.max() + 1, 8, *LIMITS[fname])
        # each person owns two cells (walk, sit) per column position: rows are people, columns frames
        for ri, (y0, y1) in enumerate(cells):
            person, idx = ROWS.get(fname, [(people[r // 2], (r % 2) * 4) for r in range(8)])[ri][0], ROWS.get(fname, [(people[r // 2], (r % 2) * 4) for r in range(8)])[ri][1] + ci
            cell = rgba[y0:y1, max(0, x0 - 3):x1 + 3].copy()
            cell[cell[:, :, 3] < sg.SOFT, 3] = 0
            groups, n = ui.nd.label(cell[:, :, 3] > 0, structure=np.ones((3, 3)))
            if n > 1:
                sizes = ui.nd.sum(cell[:, :, 3] > 0, groups, range(1, n + 1))
                for lab, size in enumerate(sizes, 1):
                    if size < 0.12 * sizes.max():
                        cell[groups == lab, 3] = 0
            yy, xx = np.where(cell[:, :, 3] > 0)
            Image.fromarray(cell[yy.min():yy.max() + 1, xx.min():xx.max() + 1]).save(
                out / f'{person}-{idx}.webp', 'WEBP', quality=92, alpha_quality=100, method=6)
    print(fname, cols)
