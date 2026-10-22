"""Slice the cast sheets in assets/source into per-character images.

    pip install pillow numpy scipy
    python3 tools/slice-art.py

Sheets (left to right: Milo, Riven, Atlas, Lumi):
  cast-fullbody.png    one row of four full-body figures
  cast-bust-chibi.png  top row of four busts, bottom row of four chibis

Writes assets/characters/<id>-full.webp, <id>-bust.webp and <id>-chibi.webp.
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
MAX_H = {'full': 900, 'bust': 560, 'chibi': 360}


def save(rgba, mask, name, kind):
    """Keep only `mask` pixels, crop to them, scale down, write WebP."""
    img = rgba.copy()
    img[~mask, 3] = 0
    ys, xs = np.where(img[:, :, 3] > 0)
    pad = 2
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, img.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, img.shape[1])
    im = Image.fromarray(img[y0:y1, x0:x1])
    if im.height > MAX_H[kind]:
        w = round(im.width * MAX_H[kind] / im.height)
        im = im.resize((w, MAX_H[kind]), Image.LANCZOS)
    path = OUT / f'{name}-{kind}.webp'
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

    for name, m in zip(CAST, split_components(sheet, ~top, 4)):
        save(sheet, m, name, 'chibi')


if __name__ == '__main__':
    main()
