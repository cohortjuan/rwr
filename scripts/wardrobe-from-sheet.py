#!/usr/bin/env python3
"""Cuts wardrobe pieces out of a sheet the image model drew, and writes them as overlays.

Each cell of a wardrobe sheet is the seated lion wearing one thing, on magenta. For every
cell listed in SHEETS this script:

1. finds exactly where that cell's lion sits and how big it was drawn, by sliding the game's
   own lion over it until their outlines agree (the model redraws him a little differently
   every time, so each cell is measured on its own),
2. reads the cell at the game's pixel size,
3. keeps only what is not lion: pixels whose colour cannot be found at that spot, or next to
   it, on the game's lion,
4. tidies the result (drops specks, completes the dark outline, limits the colours),
5. writes a clear picture the size of the lion's stage with only the piece on it: one for each
   colour the piece comes in, repainted from the shared ramps in wardrobe_manifest.py
   (public/wardrobe/<id>--<colour>.png), or a single public/wardrobe/<id>.png.

Needs Pillow. Run from the scripts folder:  cd scripts && python3 wardrobe-from-sheet.py
"""
import colorsys
import json
import os
import sys

from PIL import Image, ImageFilter

from pixel_tools import STEPS

SPRITE = Image.open('../public/sprites/todah-sit.png').convert('RGBA')
TAIL = Image.open('../public/sprites/todah-tail.png').convert('RGBA').crop((0, 0, SPRITE.width, SPRITE.height))
HEAD = 10                                  # clear rows above his head, for hats
WIDTH, HEIGHT = SPRITE.width, SPRITE.height + HEAD
OUT = '../public/wardrobe'

# The game's lion with his tail at rest, on the stage the overlays share.
LION = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
LION.alpha_composite(TAIL, (0, HEAD))
LION.alpha_composite(SPRITE, (0, HEAD))
BASE = LION.load()

magenta = lambda c: c[0] > 150 and c[2] > 150 and c[1] < 0.62 * min(c[0], c[2])
far = lambda a, b: abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])
# Where the lion meets the magenta, JPEG leaves a purple smear. Unless a piece really is
# purple or pink, anything tinted that way is background, not the piece.
smear = lambda c: c[0] - c[1] > 34 and c[2] - c[1] > 34


def register(soft, box):
    """Where this cell's lion sits: (left, top, pitch across, pitch down) in sheet pixels.

    Tries a range of sizes and positions and keeps the one where the game's outline best
    matches the edge between lion and magenta in the cell.
    """
    edge, outside = [], []
    for y in range(HEIGHT):
        for x in range(WIDTH):
            if not BASE[x, y][3]:
                continue
            for dx, dy in STEPS:
                nx, ny = x + dx, y + dy
                if not (0 <= nx < WIDTH and 0 <= ny < HEIGHT) or not BASE[nx, ny][3]:
                    edge.append((x, y))
                    if 0 <= nx < WIDTH and 0 <= ny < HEIGHT:
                        outside.append((nx, ny))
                    break
    edge, outside = edge[::2], outside[::2]
    x0, y0, x1, y1 = box
    solid = lambda sx, sy: x0 <= sx <= x1 and y0 <= sy <= y1 and not magenta(soft[int(sx), int(sy)])
    best = (-1, 0, 0, 0, 0)
    # He stands on the bottom of his cell, so the fit is anchored there and at the middle.
    for pitch_x in [2.60 + 0.02 * n for n in range(18)]:
        for pitch_y in [2.60 + 0.02 * n for n in range(18)]:
            if abs(pitch_x - pitch_y) > 0.09:
                continue
            for shift_x in range(-6, 7, 2):
                for shift_y in range(-4, 5, 2):
                    left = (x0 + x1) / 2 - WIDTH * pitch_x / 2 + shift_x
                    top = y1 - HEIGHT * pitch_y + shift_y
                    score = sum(solid(left + (x + 0.5) * pitch_x, top + (y + 0.5) * pitch_y) for x, y in edge)
                    score += sum(not solid(left + (x + 0.5) * pitch_x, top + (y + 0.5) * pitch_y) for x, y in outside)
                    if score > best[0]:
                        best = (score, left, top, pitch_x, pitch_y)
    return best[1:], best[0] / (len(edge) + len(outside))


def extract(sheet, soft, box, areas, whole=False, pinks=False):
    (left, top, pitch_x, pitch_y), fit = register(soft, box)
    read = lambda x, y: soft[min(sheet.width - 1, max(0, int(left + (x + 0.5) * pitch_x))), min(sheet.height - 1, max(0, int(top + (y + 0.5) * pitch_y)))]
    inside = lambda x, y: any(a[0] <= x < a[2] and a[1] + HEAD <= y < a[3] + HEAD for a in areas)
    piece = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    px = piece.load()

    def unlike(x, y, colour, reach):
        # True when nothing like this colour is at this spot on the lion, or within `reach` of it.
        for dy in range(-reach, reach + 1):
            for dx in range(-reach, reach + 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < WIDTH and 0 <= ny < HEIGHT and BASE[nx, ny][3] and far(colour, BASE[nx, ny]) < 95:
                    return False
        return True

    chosen = set()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            colour = read(x, y)
            if magenta(colour) or (areas and not inside(x, y)) or (smear(colour) and not pinks):
                continue
            if whole or unlike(x, y, colour, 1):
                chosen.add((x, y))
    if not whole:
        # Fill in pixels the strict test left out: ones that sit among chosen pixels and are
        # still clearly not the lion's own colour right there.
        for _ in range(6):
            grown = set()
            for y in range(HEIGHT):
                for x in range(WIDTH):
                    if (x, y) in chosen or not inside(x, y):
                        continue
                    colour = read(x, y)
                    near = sum((x + dx, y + dy) in chosen for dx in (-1, 0, 1) for dy in (-1, 0, 1))
                    if magenta(colour) or near < 3 or (smear(colour) and not pinks):
                        continue
                    if not BASE[x, y][3] or far(colour, BASE[x, y]) > 60 or (sum(colour) < 150 and near >= 2):
                        grown.add((x, y))
            chosen |= grown
        # Drop specks: small islands are the two drawings of the lion not quite agreeing.
        seen = set()
        for start in list(chosen):
            if start in seen:
                continue
            island, queue = [], [start]
            seen.add(start)
            while queue:
                x, y = queue.pop()
                island.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nxt = (x + dx, y + dy)
                        if nxt in chosen and nxt not in seen:
                            seen.add(nxt)
                            queue.append(nxt)
            if len(island) < 14:
                chosen -= set(island)
    for x, y in chosen:
        px[x, y] = read(x, y) + (255,)
    # A small fixed set of colours takes out what JPEG smeared.
    flat = piece.convert('RGB').quantize(colors=14, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB').load()
    for x, y in chosen:
        px[x, y] = flat[x, y] + (255,)
    return piece, fit


def fit_vest(piece):
    """Reshapes a boxy vest into a fitted one, the way Juan asked for it to sit.

    The sheet's vest covers the whole torso and the front legs. A fitted one covers his
    shoulders and chest, comes to a point between his front legs, and wraps a little round
    each side, so both front legs come out in front of it.
    """
    px = piece.load()
    middle, shoulder, point = 44, 62 + HEAD, 85 + HEAD
    kept = set()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            if not px[x, y][3]:
                continue
            off = abs(x + 0.5 - middle)
            chest = y < shoulder or off <= 22 * (point - y) / (point - shoulder)
            side = off >= 17 and y <= 75 + HEAD
            if chest or side:
                kept.add((x, y))
    dark = min((px[x, y] for x, y in kept), key=lambda c: sum(c[:3]))
    cut = {(x, y) for y in range(HEIGHT) for x in range(WIDTH) if px[x, y][3] and (x, y) not in kept}
    for x, y in cut:
        px[x, y] = (0, 0, 0, 0)
    # The new edges get the vest's own dark line.
    for x, y in kept:
        if any((x + dx, y + dy) in cut for dx, dy in STEPS):
            px[x, y] = dark


FITS = {'vest': fit_vest}

hexrgb = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


def painted(colour, rule):
    """Whether a pixel is part of what takes the colour, by the piece's `paint` rule."""
    h, s, v = colorsys.rgb_to_hsv(colour[0] / 255, colour[1] / 255, colour[2] / 255)
    if rule == 'dark':
        return v <= 0.55 and s <= 0.45
    if rule == 'light':
        return v >= 0.5 and s <= 0.4
    if rule == 'grey':
        return s <= 0.22
    return rule[0] <= h * 360 <= rule[1] and s >= 0.22


def repaint(piece, rules, names, ramps):
    """The piece in another colour: each painted pixel keeps its place from dark to light, on the new ramp."""
    out = piece.copy()
    px = out.load()
    for rule, name in zip(rules, names):
        ramp = [hexrgb(h) for h in ramps[name]]
        spots = [(x, y) for y in range(HEIGHT) for x in range(WIDTH) if px[x, y][3] and painted(piece.getpixel((x, y)), rule)]
        if not spots:
            continue
        light = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
        levels = sorted(light(piece.getpixel(spot)) for spot in spots)
        # Each pixel's place among the painted pixels, darkest to lightest, decides its step on
        # the ramp. The shares are fixed, so every piece comes out mostly its main colour with
        # a dark edge and a little highlight, however light or dark it was drawn.
        shares = (0.04, 0.14, 0.5, 0.88) if rule == 'light' else (0.1, 0.42, 0.86, 0.97)
        for x, y in spots:
            value = light(piece.getpixel((x, y)))
            below = sum(1 for level in levels if level < value)
            same = sum(1 for level in levels if level == value)
            place = (below + same / 2) / len(levels)
            px[x, y] = ramp[sum(place >= share for share in shares)] + (255,)
    return out


if __name__ == '__main__':
    from wardrobe_manifest import RAMPS, SHEETS
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for path, cells in SHEETS.items():
        sheet = Image.open(path).convert('RGB')
        soft = sheet.filter(ImageFilter.MedianFilter(3)).load()
        for item in cells:
            if only and item['id'] not in only:
                continue
            piece, fit = extract(sheet, soft, item['box'], item.get('areas', []), item.get('whole', False), item.get('pinks', False))
            if item.get('fit'):
                FITS[item['fit']](piece)
            colours = item.get('colours', [])
            if not colours:
                piece.save(f"{OUT}/{item['id']}.png")
            # One picture per colour. The first is repainted too, so every colour of every piece
            # comes from the same ramps and the same reds, blues and blacks turn up everywhere.
            for colour in colours:
                names = colour if isinstance(colour, tuple) else (colour,)
                repaint(piece, item['paint'], names, RAMPS).save(f"{OUT}/{item['id']}--{names[-1]}.png")
            count = sum(n for n, c in piece.getcolors(99999) if c[3])
            print(f"{item['id']}: {count} pixels, outline fit {fit:.0%}")
