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


def register(soft, box, anchor='bottom', hint=(2.82, 2.8), rows=None):
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
    if rows:
        # A hat sits on his head, and the model does not always keep his head and body in the
        # same proportion. So for a hat only his head is matched, wherever his feet end up.
        edge = [spot for spot in edge if rows[0] + HEAD <= spot[1] < rows[1] + HEAD]
        outside = [spot for spot in outside if rows[0] + HEAD <= spot[1] < rows[1] + HEAD]
    else:
        edge, outside = edge[::2], outside[::2]
    x0, y0, x1, y1 = box
    solid = lambda sx, sy: x0 <= sx <= x1 and y0 <= sy <= y1 and not magenta(soft[int(sx), int(sy)])
    best = (-1, 0, 0, 0, 0)
    # The fit is anchored at the middle of the cell, and at whichever end of him is whole: his
    # feet on the bottom edge, or the top of his head when his feet are cut off.
    # The model does not keep his proportions exactly: on one sheet he came out 6 percent wider
    # than tall. So width and height are fitted separately, each near its own rough size.
    reach = 14 if rows else 4
    for pitch_x in [hint[0] - 0.1 + 0.02 * n for n in range(11)]:
        for pitch_y in [hint[1] - (0.2 if rows else 0.1) + 0.02 * n for n in range(21 if rows else 11)]:
            for shift_x in range(-6, 7, 2):
                for shift_y in range(-reach, reach + 1, 2):
                    left = (x0 + x1) / 2 - WIDTH * pitch_x / 2 + shift_x
                    top = (y1 - HEIGHT * pitch_y if anchor == 'bottom' else y0 - HEAD * pitch_y) + shift_y
                    score = sum(solid(left + (x + 0.5) * pitch_x, top + (y + 0.5) * pitch_y) for x, y in edge)
                    score += sum(not solid(left + (x + 0.5) * pitch_x, top + (y + 0.5) * pitch_y) for x, y in outside)
                    if score > best[0]:
                        best = (score, left, top, pitch_x, pitch_y)
    return best[1:], best[0] / (len(edge) + len(outside))


def extract(sheet, soft, item):
    box, areas = item['box'], item.get('areas', [])
    whole, pinks, keep = item.get('whole', False), item.get('pinks', False), item.get('keep')
    if whole:
        # A whole drawing takes the lion's place, so it is not fitted to him. It is read at its
        # own proportions: as tall as he is, standing on the same line, centred.
        pitch_x = pitch_y = (box[3] - box[1] + 1) / SPRITE.height
        left, top, fit = (box[0] + box[2] + 1) / 2 - WIDTH * pitch_x / 2, box[1] - HEAD * pitch_y, 1.0
    else:
        (left, top, pitch_x, pitch_y), fit = register(soft, box, item.get('anchor', 'bottom'), item.get('pitch', (2.82, 2.8)), item.get('match'))
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
            if whole and top + (y + 0.5) * pitch_y < box[1]:
                # Above the drawing is the cell over it on the sheet.
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
    if keep:
        # Glasses: only the frame is kept, so his own eyes show through and still blink. The
        # eyes the model drew behind the lenses are dark too, so anything lying on the game's
        # own dark pixels (his eyes) is left out.
        chosen = {
            (x, y) for x, y in chosen
            if (painted(read(x, y), keep) or painted(read(x, y), 'ink')) and not (BASE[x, y][3] and sum(BASE[x, y][:3]) < 200)
        }
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


def jade(piece):
    """The shishi as a jade guardian lion: a green body, gold curls and a dark green outline.

    He was drawn as a gold lion with red curls. His curls are the red pixels and the orange
    lines among them. The rest of him is body. Each takes its new ramp by its place from dark
    to light, so the shading he was drawn with is kept.
    """
    from wardrobe_manifest import RAMPS
    src = piece.copy().load()
    px = piece.load()
    hsv = lambda c: colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)
    spots = [(x, y) for y in range(HEIGHT) for x in range(WIDTH) if src[x, y][3]]
    ink = {s for s in spots if hsv(src[s])[2] <= 0.4}
    curls = {s for s in spots if s not in ink and not 15 < hsv(src[s])[0] * 360 < 335}
    for _ in range(2):
        curls |= {
            (x, y) for x, y in spots
            if (x, y) not in ink and (x, y) not in curls and 15 < hsv(src[x, y])[0] * 360 <= 25
            and sum((x + dx, y + dy) in curls for dx in (-1, 0, 1) for dy in (-1, 0, 1)) >= 3
        }
    body = [s for s in spots if s not in ink and s not in curls]
    light = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

    def paint(part, name, shares):
        ramp = [hexrgb(h) for h in RAMPS[name]]
        levels = sorted(light(src[s]) for s in part)
        for s in part:
            value = light(src[s])
            place = (sum(l < value for l in levels) + sum(l == value for l in levels) / 2) / len(levels)
            px[s] = ramp[sum(place >= share for share in shares)] + (255,)

    paint(body, 'green', (0.06, 0.3, 0.72, 0.93))
    paint(sorted(curls), 'gold', (0.1, 0.42, 0.86, 0.97))
    for s in ink:
        px[s] = (12, 42, 21, 255)
    # His eyes stay gold, so they are not lost in a green face.
    for left, top, right, bottom in ((21, 39, 28, 45), (51, 39, 60, 45)):
        for y in range(top, bottom):
            for x in range(left, right):
                if (x, y) in set(body) and light(src[x, y]) >= 190:
                    px[x, y] = hexrgb(RAMPS['gold'][3]) + (255,)


FITS = {'vest': fit_vest, 'jade': jade}
FADES = {}

hexrgb = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


def painted(colour, rule):
    """Whether a pixel is part of what takes the colour, by the piece's `paint` rule."""
    h, s, v = colorsys.rgb_to_hsv(colour[0] / 255, colour[1] / 255, colour[2] / 255)
    if rule == 'ink':
        return v <= 0.3
    if rule == 'dark':
        return v <= 0.55 and s <= 0.45
    if rule == 'silver':
        return s <= 0.22 and v >= 0.45
    if rule == 'fade':
        return s >= 0.35 and v >= 0.3
    if rule == 'light':
        return v >= 0.5 and s <= 0.4
    if rule == 'grey':
        return s <= 0.22
    hue = h * 360
    # A range such as (335, 22) wraps round through red.
    within = rule[0] <= hue <= rule[1] if rule[0] <= rule[1] else hue >= rule[0] or hue <= rule[1]
    strength, brightness = (rule[2], rule[3]) if len(rule) > 2 else (0.22, 0.0)
    return within and s >= strength and v >= brightness


def repaint(piece, rules, names, ramps):
    """The piece in another colour: each painted pixel keeps its place from dark to light, on the new ramp."""
    out = piece.copy()
    px = out.load()
    for rule, name in zip(rules, names):
        if rule == 'fade':
            fade = FADES[name]
            if fade:
                # A lens that runs cyan to purple to pink: each pixel's place in that run picks
                # its place in the new three-colour fade.
                stops = [hexrgb(h) for h in fade]
                for y in range(HEIGHT):
                    for x in range(WIDTH):
                        colour = piece.getpixel((x, y))
                        if not colour[3] or not painted(colour, 'fade'):
                            continue
                        hue = colorsys.rgb_to_hsv(colour[0] / 255, colour[1] / 255, colour[2] / 255)[0] * 360
                        t = max(0.0, min(1.0, (hue - 175) / 165)) * 2
                        low, part = stops[min(1, int(t))], t - min(1, int(t))
                        high = stops[min(2, int(t) + 1)]
                        px[x, y] = tuple(round(low[c] + (high[c] - low[c]) * part) for c in range(3)) + (255,)
            continue
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
    from wardrobe_manifest import FADES as fades, RAMPS, SHEETS
    FADES.update(fades)
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for path, cells in SHEETS.items():
        sheet = Image.open(path).convert('RGB')
        soft = sheet.filter(ImageFilter.MedianFilter(3)).load()
        for item in cells:
            if only and item['id'] not in only:
                continue
            piece, fit = extract(sheet, soft, item)
            if item.get('fit'):
                FITS[item['fit']](piece)
            colours = item.get('colours', [])
            if not colours:
                piece.save(f"{OUT}/{item['id']}.png")
            # One picture per colour. The first is repainted too, so every colour of every piece
            # comes from the same ramps and the same reds, blues and blacks turn up everywhere.
            for colour in colours:
                names = colour if isinstance(colour, tuple) else (colour,)
                shown = piece if colour == item.get('drawn') else repaint(piece, item['paint'], names, RAMPS)
                shown.save(f"{OUT}/{item['id']}--{names[-1]}.png")
                if item.get('single'):
                    # One of a pair, sold as its own piece: the same picture with only the
                    # side on the left of the screen kept.
                    one = shown.copy()
                    one.paste((0, 0, 0, 0), (WIDTH // 2, 0, WIDTH, HEIGHT))
                    one.save(f"{OUT}/{item['single']}--{names[-1]}.png")
            count = sum(n for n, c in piece.getcolors(99999) if c[3])
            print(f"{item['id']}: {count} pixels, outline fit {fit:.0%}")
