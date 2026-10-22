"""Slice the cast sheets in assets/source into per-character images.

    pip install pillow numpy scipy
    python3 tools/slice-art.py

Group sheets (left to right: Milo, Riven, Atlas, Lumi):
  cast-fullbody.png    one row of four full-body figures      -> <id>/full.webp
  cast-bust-chibi.png  top row of four large busts             -> <id>/bust.webp
                       (its bottom row of chibis is superseded by the sheets below)

Character sheets, <id>-sheet.png, a 4x6 grid:
  rows 1-2  eight-direction turnaround                         -> <id>/turn-0.webp ... turn-7.webp
  rows 3-4  chibi expressions                                  -> <id>/chibi-<expression>.webp
  rows 5-6  bust expressions                                   -> <id>/bust-<expression>.webp

Everything is written under assets/characters/.
"""
from pathlib import Path

import numpy as np
import scipy.ndimage as nd
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'source'
OUT = ROOT / 'assets' / 'characters'
CAST = ['milo', 'riven', 'atlas', 'lumi']
ALPHA = 40          # pixels fainter than this count as background
MAX_H = {'full': 900, 'bust': 560}

# Order of the poses on each character sheet, left to right, top to bottom.
TURN = 8   # turn-0 faces the viewer, turn-2 faces right, turn-4 faces away, turn-6 faces left
CHIBI_EXPRESSIONS = ['neutral', 'pensive', 'smirk', 'blush', 'sad', 'surprised', 'flustered', 'happy']
BUST_EXPRESSIONS = ['neutral', 'happy', 'blush', 'sad', 'pensive', 'surprised', 'flustered', 'smirk']


def save(rgba, mask, name, kind, max_h=None, defringe=False):
    """Keep only `mask` pixels, crop to them, scale down, write WebP to <name>/<kind>.webp."""
    img = rgba.copy()
    img[~mask, 3] = 0
    if defringe:
        # Soft edge pixels carry the sheet's coloured haze (a red or magenta halo).
        # Give them the colour of the nearest solid pixel instead.
        solid = img[:, :, 3] >= 200
        _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
        edge = mask & ~solid
        img[edge, :3] = img[iy[edge], ix[edge], :3]
    ys, xs = np.where(img[:, :, 3] > 0)
    pad = 2
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, img.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, img.shape[1])
    im = Image.fromarray(img[y0:y1, x0:x1])
    max_h = max_h or MAX_H.get(kind)
    if max_h and im.height > max_h:
        im = im.resize((round(im.width * max_h / im.height), max_h), Image.LANCZOS)
    (OUT / name).mkdir(parents=True, exist_ok=True)
    path = OUT / name / f'{kind}.webp'
    im.save(path, 'WEBP', quality=90, alpha_quality=100, method=6)
    print(f'{path.relative_to(ROOT)}  {im.width}x{im.height}  {path.stat().st_size // 1024} KB')


def split_components(rgba, region, count):
    """Split figures that do not touch: the `count` largest opaque blobs, left to right."""
    solid = (rgba[:, :, 3] > ALPHA) & region
    lab, n = nd.label(solid)
    sizes = nd.sum(solid, lab, range(1, n + 1))
    main = sorted(np.argsort(sizes)[::-1][:count] + 1,
                  key=lambda l: nd.center_of_mass(lab == l)[1])
    # soft edges and detached specks join the nearest figure
    _, (iy, ix) = nd.distance_transform_edt(~np.isin(lab, main), return_indices=True)
    owner = lab[iy, ix]
    keep = (rgba[:, :, 3] > 8) & region
    return [keep & (owner == l) for l in main]


# Column ranges (in sheet pixels) that certainly belong to each bust. Their
# sleeves, tails and arms overlap the neighbours, so the seeds stop short of them.
BUST_SEEDS = [(40, 380), (470, 700), (790, 1100), (1200, 1480)]


def _lum(rgb):
    return (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]) / 255


def _tan_or_brown(rgb):
    hsv = np.array(Image.fromarray(rgb.astype(np.uint8)).convert('HSV')).astype(float)
    hue = hsv[..., 0] * 360 / 255
    return (hue > 5) & (hue < 38) & (hsv[..., 1] > 90) & (hsv[..., 2] < 220)


# Where busts overlap, pixels go to whichever character's colours they match.
# (x0, x1, y0, y1, left index, right index, test that is True for the left character)
BUST_OVERLAPS = [
    (380, 432, 200, 618, 0, 1, lambda rgb, x: _lum(rgb) > 0.45),   # Milo's pink sweater / Riven's black jacket
    (700, 772, 200, 618, 1, 2, lambda rgb, x: (_lum(rgb) < 0.42) & ~_tan_or_brown(rgb)),  # Riven's dark sleeve / Atlas's arm
    (1130, 1205, 200, 618, 2, 3, lambda rgb, x: _tan_or_brown(rgb) | (x < 1158)),         # Atlas's arm, sleeve and tail / Lumi
]


def resolve_overlaps(rgba, masks, overlaps):
    for x0, x1, y0, y1, left, right, is_left in overlaps:
        zone = np.zeros(masks[0].shape, bool)
        zone[y0:y1, x0:x1] = True
        zone &= masks[left] | masks[right]
        rgb = rgba[y0:y1, x0:x1, :3].astype(float)
        xs = np.broadcast_to(np.arange(x0, x1)[None, :], rgb.shape[:2])
        vote = is_left(rgb, xs).astype(float)
        vote = nd.median_filter(vote, size=7) > 0.5   # keep outlines with their colour block
        to_left = np.zeros(zone.shape, bool)
        to_left[y0:y1, x0:x1] = vote
        masks[left] = (masks[left] & ~zone) | (zone & to_left)
        masks[right] = (masks[right] & ~zone) | (zone & ~to_left)
    return [main_shape(rgba, m) for m in masks]


def main_shape(rgba, mask):
    """Drop fragments that are not attached to the character's main shape."""
    lab, n = nd.label(mask & (rgba[:, :, 3] > ALPHA))
    if n <= 1:
        return mask
    sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
    body = nd.binary_dilation(lab == np.argmax(sizes) + 1, iterations=3)
    return mask & body


def split_by_seeds(rgba, region, seeds):
    """Split figures that touch: seed each one in its column range and grow the
    seeds through opaque pixels only, so a tail or sleeve stays with the figure
    it is attached to."""
    h, w = rgba.shape[:2]
    count = len(seeds)
    solid = (rgba[:, :, 3] > ALPHA) & region
    owner = np.zeros((h, w), int)
    for i, (x0, x1) in enumerate(seeds):
        band = np.zeros((h, w), bool)
        band[:, x0:x1] = True
        owner[solid & band] = i + 1
    cross = nd.generate_binary_structure(2, 1)
    while True:
        grown = False
        free = solid & (owner == 0)
        for i in range(1, count + 1):
            new = nd.binary_dilation(owner == i, cross) & free
            if new.any():
                owner[new] = i
                free &= ~new
                grown = True
        if not grown:
            break
    # soft edges and specks join the nearest figure
    _, (iy, ix) = nd.distance_transform_edt(owner == 0, return_indices=True)
    owner = owner[iy, ix]
    keep = (rgba[:, :, 3] > 8) & region
    return [keep & (owner == i) for i in range(1, count + 1)]


# Protagonist sheet: two looks side by side. Each half has a 7-frame turnaround on
# top, then three rows of busts. (y0, y1, bust count) per row, per look.
PLAYER_LOOKS = {
    'player-a': {'x': (0, 768), 'busts': [(390, 614, 4), (614, 800, 3), (800, 992, 4)]},
    'player-b': {'x': (768, 1536), 'busts': [(390, 614, 4), (614, 800, 4), (800, 992, 4)]},
}
PLAYER_BUSTS = {   # busts left to right, top to bottom -> expression (keep in sync with js/data.js)
    'player-a': ['neutral', 'content', 'smile', 'talk', 'happy', 'laugh', 'smirk', 'pensive', 'surprised', 'sad', 'blush'],
    'player-b': ['neutral', 'content', 'talk', 'excited', 'smile', 'happy', 'laugh', 'shy', 'sad', 'surprised', 'flustered', 'blush'],
}


def split_row(rgba, x0, x1, y0, y1, count):
    """Split one row of `count` touching figures: cut at the emptiest columns
    near even spacing, then grow each figure from its own column range."""
    region = np.zeros(rgba.shape[:2], bool)
    region[y0:y1, x0:x1] = True
    cols = ((rgba[y0:y1, x0:x1, 3] > ALPHA).sum(0)).astype(float)
    width = x1 - x0
    cuts = []
    for i in range(1, count):
        guess = round(width * i / count)
        lo, hi = guess - width // (3 * count), guess + width // (3 * count)
        cuts.append(lo + int(np.argmin(cols[lo:hi])))
    edges = [0] + cuts + [width]
    seeds = [(x0 + edges[i] + 25, x0 + edges[i + 1] - 25) for i in range(count)]
    return split_by_seeds(rgba, region, seeds)


def slice_player_sheet():
    rgba = np.array(Image.open(SRC / 'player-sheet.png').convert('RGBA'))
    for look, spec in PLAYER_LOOKS.items():
        x0, x1 = spec['x']
        top = np.zeros(rgba.shape[:2], bool)
        top[:388, x0:x1] = True
        for i, m in enumerate(split_components(rgba, top, 7)):
            save(rgba, m, look, f'turn-{i}', max_h=10_000, defringe=True)
        n = 0
        names = PLAYER_BUSTS[look]
        for y0, y1, count in spec['busts']:
            for m in split_row(rgba, x0, x1, y0, y1, count):
                kind = f'bust-{names[n]}' if n < len(names) and names[n] else f'bust-{n:02d}'
                save(rgba, main_shape(rgba, m), look, kind, max_h=10_000, defringe=True)
                n += 1


# Extra protagonist looks: two rows of five front-facing figures, left to right.
EXTRA_LOOKS = ['player-c', 'player-d', 'player-e', 'player-f', 'player-g',
               'player-h', 'player-i', 'player-j', 'player-k', 'player-l']


def slice_player_looks():
    """player-looks.png: each look gets turn-0 (full body) and bust-neutral (head and shoulders)."""
    rgba = np.array(Image.open(SRC / 'player-looks.png').convert('RGBA'))
    h = rgba.shape[0]
    top = np.zeros(rgba.shape[:2], bool)
    top[:h // 2] = True
    figures = split_components(rgba, top, 5) + split_components(rgba, ~top, 5)
    for look, m in zip(EXTRA_LOOKS, figures):
        save(rgba, m, look, 'turn-0', max_h=10_000, defringe=True)
        ys = np.where(m.any(1))[0]
        head = m.copy()
        head[ys.min() + round((ys.max() - ys.min()) * 0.34):] = False
        save(rgba, head, look, 'bust-neutral', max_h=10_000, defringe=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    full = np.array(Image.open(SRC / 'cast-fullbody.png').convert('RGBA'))
    everything = np.ones(full.shape[:2], bool)
    for name, m in zip(CAST, split_components(full, everything, 4)):
        save(full, m, name, 'full')

    sheet = np.array(Image.open(SRC / 'cast-bust-chibi.png').convert('RGBA'))
    h, w = sheet.shape[:2]
    top = np.zeros((h, w), bool)
    top[:618] = True

    busts = resolve_overlaps(sheet, split_by_seeds(sheet, top, BUST_SEEDS), BUST_OVERLAPS)
    for name, m in zip(CAST, busts):
        save(sheet, m, name, 'bust')

    for name in CAST:
        slice_character_sheet(name)


def slice_character_sheet(name):
    """Cut the 24 poses out of <name>-sheet.png. Each pose is a separate solid
    shape; the faint coloured haze around them is dropped."""
    rgba = np.array(Image.open(SRC / f'{name}-sheet.png').convert('RGBA'))
    alpha = rgba[:, :, 3]
    solid = alpha >= 160
    lab, n = nd.label(solid)
    sizes = nd.sum(solid, lab, range(1, n + 1))
    poses = list(np.argsort(sizes)[::-1][:24] + 1)
    centre = {l: nd.center_of_mass(lab == l) for l in poses}
    poses.sort(key=lambda l: centre[l][0])
    grid = [sorted(poses[i:i + 4], key=lambda l: centre[l][1]) for i in range(0, 24, 4)]
    cells = [l for row in grid for l in row]
    soft = alpha >= ALPHA
    names = [f'turn-{i}' for i in range(TURN)] + \
        [f'chibi-{e}' for e in CHIBI_EXPRESSIONS] + [f'bust-{e}' for e in BUST_EXPRESSIONS]
    for kind, l in zip(names, cells):
        m = lab == l
        for _ in range(4):   # take back the soft outline, but not the haze around it
            m |= nd.binary_dilation(m) & soft
        save(rgba, m, name, kind, max_h=10_000, defringe=True)


if __name__ == '__main__':
    import sys
    if sys.argv[1:] == ['player']:
        slice_player_sheet()
        slice_player_looks()
    else:
        main()
        slice_player_sheet()
        slice_player_looks()
