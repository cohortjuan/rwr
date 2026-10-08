"""Draws the two pairs of sunglasses that are made here and not cut from a sheet.

- shades: plain dark sunglasses with a heavy frame, in four lens colours.
- sunset: thin-framed aviators whose lenses fade through three colours.

Both are placed from the lion's own eyes: the script finds the two dark eyes on the sprite and
centres a lens on each, so they sit right whatever the sprite. If the sprite is redrawn, run
this again.

Run from this folder:  python3 shades-art.py
Writes public/wardrobe/<id>--<colour>.png on the same 89 x 111 grid as every other wardrobe
picture (the sprite, with 10 rows of headroom above it).
"""
import os

from PIL import Image

from wardrobe_manifest import FADES, RAMPS

OUT = '../public/wardrobe'
SPRITE = Image.open('../public/sprites/todah-sit.png').convert('RGBA')
WIDTH, HEAD = SPRITE.width, 10
HEIGHT = SPRITE.height + HEAD
INK = (26, 18, 38)

hexrgb = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


def eyes():
    """The centre of each eye, in picture pixels: the two big dark blobs in the top half of his face."""
    dark = min((c for n, c in SPRITE.getcolors(9999) if c[3]), key=lambda c: c[0] + c[1] + c[2])
    spots = {(x, y) for y in range(SPRITE.height // 2) for x in range(WIDTH) if SPRITE.getpixel((x, y)) == dark}
    blobs = []
    while spots:
        stack, blob = [spots.pop()], []
        while stack:
            x, y = stack.pop()
            blob.append((x, y))
            for near in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if near in spots:
                    spots.remove(near)
                    stack.append(near)
        blobs.append(blob)
    # The eyes are the two roundest big blobs: about as wide as they are tall.
    round_ones = [b for b in blobs if len(b) > 40 and abs((max(x for x, _ in b) - min(x for x, _ in b)) - (max(y for _, y in b) - min(y for _, y in b))) <= 2]
    pair = sorted(sorted(round_ones, key=len)[-2:], key=lambda b: min(x for x, _ in b))
    centre = lambda b: ((min(x for x, _ in b) + max(x for x, _ in b)) / 2, (min(y for _, y in b) + max(y for _, y in b)) / 2 + HEAD)
    return [centre(b) for b in pair]


def lens(cx, cy, half_w, half_h, power, taper=0.0):
    """The pixels of one lens: a rounded shape, optionally narrowing towards the bottom."""
    spots = set()
    for y in range(int(cy - half_h - 1), int(cy + half_h + 2)):
        for x in range(int(cx - half_w - 1), int(cx + half_w + 2)):
            dy = (y - cy) / half_h
            width = half_w * (1 - taper * max(0.0, dy))
            if abs((x - cx) / width) ** power + abs(dy) ** power <= 1:
                spots.add((x, y))
    return spots


def rim(spots):
    return {(x, y) for x, y in spots if any(n not in spots for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))}


def line(px, start, end, colour):
    (x0, y0), (x1, y1) = start, end
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(steps + 1):
        px[round(x0 + (x1 - x0) * i / steps), round(y0 + (y1 - y0) * i / steps)] = colour + (255,)


def blend(a, b, t):
    return tuple(round(a[c] + (b[c] - a[c]) * t) for c in range(3))


def plain(colour):
    """Heavy dark sunglasses: one bar across the brow, two solid lenses, a glint on each."""
    ramp = [hexrgb(h) for h in RAMPS[colour]]
    picture = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    px = picture.load()
    (lx, ly), (rx, ry) = eyes()
    top = round(ly - 6.5)
    for cx, cy in ((lx, ly), (rx, ry)):
        spots = lens(cx, cy, 8.4, 6.9, 3.4)
        edge = rim(spots)
        for x, y in spots:
            # Lit from the upper left: the lower right of each lens is a shade darker.
            lower = (x - cx) / 8.4 + (y - cy) / 6.9 > 0.55
            px[x, y] = (INK if (x, y) in edge else ramp[0] if lower else ramp[1]) + (255,)
        px[round(cx - 4.5), round(cy - 3.5)] = (255, 255, 255, 255)
        px[round(cx - 3.5), round(cy - 3.5)] = (255, 255, 255, 255)
        px[round(cx - 4.5), round(cy - 2.5)] = (255, 255, 255, 255)
    # The bar across the brow, and the arms running back along his head.
    for y in (top, top + 1):
        line(px, (round(lx - 7), y), (round(rx + 7), y), INK)
    line(px, (round(lx - 9), top + 1), (round(lx - 16), top), INK)
    line(px, (round(rx + 9), top + 1), (round(rx + 16), top), INK)
    return picture


def fading(stops):
    """Thin-framed aviators. Each lens fades from the first colour at the top to the third at the bottom."""
    picture = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    px = picture.load()
    (lx, ly), (rx, ry) = eyes()
    top = round(ly - 6.5)
    for cx, cy in ((lx, ly), (rx, ry)):
        spots = lens(cx, cy, 8.4, 7.4, 2.7, taper=0.14)
        edge = rim(spots)
        for x, y in spots:
            if (x, y) in edge:
                px[x, y] = INK + (255,)
                continue
            # Seven bands down the lens, tilted a little so the fade runs on a slant.
            t = max(0.0, min(1.0, (y - cy + 7.4) / 14.8 + 0.1 * (x - cx) / 8.4))
            t = round(t * 6) / 6
            low, high, part = (stops[0], stops[1], t * 2) if t < 0.5 else (stops[1], stops[2], t * 2 - 1)
            px[x, y] = blend(low, high, part) + (255,)
        # A streak of light across the upper left of the glass.
        for dx, dy in ((-5, -2), (-4, -3), (-3, -4)):
            spot = (round(cx + dx), round(cy + dy))
            px[spot] = blend(px[spot][:3], (255, 255, 255), 0.6) + (255,)
    # A double bridge, and thin arms.
    line(px, (round(lx + 8), top + 1), (round(rx - 8), top + 1), INK)
    line(px, (round(lx + 8), top + 4), (round(rx - 8), top + 4), INK)
    line(px, (round(lx - 9), top + 2), (round(lx - 16), top + 1), INK)
    line(px, (round(rx + 9), top + 2), (round(rx + 16), top + 1), INK)
    return picture


# The first pair's lenses as they were first drawn: cyan, purple, pink.
SUNSET = ['#2fe6dc', '#8d6fd6', '#e8336f']

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for colour in ('black', 'brown', 'blue', 'red'):
        plain(colour).save(f'{OUT}/shades--{colour}.png')
    for name in ('sunset', 'fire', 'ocean'):
        fading([hexrgb(h) for h in (FADES[name] or SUNSET)]).save(f'{OUT}/sunset--{name}.png')
    print('eyes at', eyes())
