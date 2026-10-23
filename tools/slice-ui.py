"""Cut the UI sheets in assets/source into individual images.

    pip install pillow numpy scipy
    python3 tools/slice-ui.py            # every sheet below
    python3 tools/slice-ui.py icons      # just one

Each sheet is a grid of separate pieces with a faint coloured haze around them.
Pieces are found by growing the solid pixels a little so that parts of one piece
(sparkles, a ribbon tail) stay together, then read in reading order and named from
the lists below. The haze is dropped and soft edges are recoloured from the nearest
solid pixel so nothing shows a red or magenta halo. Output: assets/ui/<sheet>/<name>.webp
"""
import sys
from pathlib import Path

import numpy as np
import scipy.ndimage as nd
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'source'
OUT = ROOT / 'assets' / 'ui'
SOLID, SOFT = 160, 40

STATES = ['normal', 'pressed', 'focus', 'disabled']
CARD = ['milo', 'riven', 'atlas', 'sora']

# sheet file -> (output folder, merge distance in pixels, names in reading order)
SHEETS = {
    'icons': ('ui-icons.png', 6, [
        'home', 'cafe', 'couple', 'heart-ribbon', 'gear', 'shop',
        'recipes', 'calendar', 'clipboard', 'wallet', 'gift', 'armchair',
        'pause', 'play', 'arrow-left', 'arrow-right', 'close', 'check',
        'lock', 'unlock', 'coin', 'bell', 'bag', 'speech']),
    'hearts': ('ui-hearts.png', 14, [
        'meter-0', 'meter-1', 'meter-2', 'meter-3',
        'heart-empty', 'heart-half', 'heart-full', 'heart-sparkle',
        'act-chat', 'act-cheers', 'act-gift', 'act-hearts',
        'heart-small', 'hearts-pair', 'love-letter', 'locket']),
    'items': ('ui-item-icons.png', 6, [
        'mug', 'teacup', 'iced-glass', 'espresso-cup', 'takeaway', 'tray',
        'beans', 'espresso-shot', 'matcha-bowl', 'tea-leaves', 'teapot', 'tea-bag',
        'milk-bottle', 'oat-carton', 'creamer', 'whipped-cream', 'ice', 'sugar',
        'syrup-strawberry', 'syrup-lavender', 'syrup-vanilla', 'syrup-caramel', 'syrup-chocolate', 'honey',
        'strawberry', 'lavender', 'cocoa', 'cinnamon', 'chocolate-shavings', 'none']),
    'cards': ('ui-portrait-frames.png', 10, [f'{k}-{c}' for k in ('normal', 'hover', 'locked') for c in CARD]),
    'badges': ('ui-badges.png', 8, [
        'stars-1', 'stars-2', 'stars-3', 'stars-4', 'stars-5',
        'medal-cup', 'medal-heart', 'medal-coin', 'medal-service', 'medal-sparkle',
        'ribbon-pink', 'ribbon-lavender', 'ribbon-green', 'ribbon-gold', 'ribbon-red',
        'medal-cat', 'medal-check', 'medal-drop', 'medal-tipjar', 'medal-moon']),
    'dialogue': ('ui-dialogue-boxes.png', 10, [
        'box-pink', 'box-lavender', 'bar-pink', 'bar-lavender', 'tag-pink', 'tag-lavender', 'speech-pink', 'speech-lavender']),
    'buttons': ('ui-buttons.png', 10, [f'{k}-{s}' for k in ('pink', 'cream', 'plate', 'pink2') for s in STATES]),
    'frames': ('ui-frames.png', 10, [
        'ticket-a', 'ticket-b', 'ticket-done', 'namecard-cream', 'namecard-lavender', 'namecard-red',
        'catframe-pink', 'catframe-lavender', 'catframe-locked', 'ticket-cup', 'hourglass', 'tray-cup']),
    'settings': ('ui-settings.png', 10, [
        'toggle-off', 'toggle-on', 'toggle-off-focus', 'toggle-on-focus',
        'slider-0', 'slider-1', 'slider-2', 'slider-3',
        'check-empty', 'check-on', 'check-focus', 'check-disabled',
        'btn-music', 'btn-sound', 'btn-mute', 'btn-reset']),
}


def find_pieces(rgba, merge, count):
    alpha = rgba[:, :, 3]
    solid = alpha >= SOLID
    # grow until parts of one piece join; if two real pieces join too, grow less
    for m in range(merge, 1, -2):
        groups, n = nd.label(nd.binary_dilation(solid, iterations=m))
        sizes = nd.sum(solid, groups, range(1, n + 1))
        if (sizes > 1500).sum() >= count:
            break
    keep = list(np.argsort(sizes)[::-1][:count] + 1)
    if len(keep) < count:
        raise SystemExit(f'found {len(keep)} pieces, expected {count}')
    boxes = {l: nd.find_objects((groups == l).astype(int))[0] for l in keep}
    centre = {l: ((b[0].start + b[0].stop) / 2, (b[1].start + b[1].stop) / 2) for l, b in boxes.items()}
    heights = sorted(b[0].stop - b[0].start for b in boxes.values())
    gap = heights[len(heights) // 2] * 0.6
    order, row = [], []
    for l in sorted(keep, key=lambda l: centre[l][0]):
        if row and centre[l][0] - np.mean([centre[r][0] for r in row]) > gap:
            order += sorted(row, key=lambda r: centre[r][1])
            row = []
        row.append(l)
    order += sorted(row, key=lambda r: centre[r][1])
    return groups, order


def cut_piece(rgba, region):
    alpha = rgba[:, :, 3]
    m = region & (alpha >= SOFT)
    img = rgba.copy()
    img[~m, 3] = 0
    solid = alpha >= 200
    _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
    edge = m & ~solid
    img[edge, :3] = img[iy[edge], ix[edge], :3]
    ys, xs = np.where(m)
    return Image.fromarray(img[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def slice_sheet(key):
    fname, merge, names = SHEETS[key]
    rgba = np.array(Image.open(SRC / fname).convert('RGBA'))
    groups, order = find_pieces(rgba, merge, len(names))
    folder = OUT / key
    folder.mkdir(parents=True, exist_ok=True)
    for name, label in zip(names, order):
        region = nd.binary_dilation(groups == label, iterations=2)
        img = cut_piece(rgba, region)
        path = folder / f'{name}.webp'
        img.save(path, 'WEBP', quality=90, alpha_quality=100, method=6)
        print(f'{path.relative_to(ROOT)}  {img.width}x{img.height}')


if __name__ == '__main__':
    for key in (sys.argv[1:] or SHEETS):
        slice_sheet(key)
