"""Cuts the lioness's essentials off their sheet: perfume, passport, wallet and phone.

They come from docs/design/source/essentials-sheet.jpg, a sheet of single objects drawn by an
image model. Each is used exactly as drawn, at the sheet's own detail: nothing is redrawn,
shrunk to the lion's coarse pixels, or relabelled. Only the white paper round it is removed.

Because they keep the sheet's detail, their pictures are finer than the lion's: six picture
pixels to one of his. The game stretches every wardrobe picture over the same box, so they
still land in the right place, and it draws these ones smoothly instead of as hard pixels.

Each also comes in a few other colours. Those are the same drawing with its main colour
turned to another hue, so every line of the design stays where it was.

Run from this folder:  python3 essentials-art.py
Writes public/wardrobe/<id>--<colour>.png. A piece stands on the ground at the left, by her
hind paw. The game moves it to another spot on the floor when more than one is out.
"""
import colorsys
import os

from PIL import Image

from wardrobe_manifest import RAMPS

SHEET = '../docs/design/source/essentials-sheet.jpg'
OUT = '../public/wardrobe'
# Sheet pixels to one of the lion's pixels: how big the pieces are beside him. Smaller is bigger.
FINE = 6
WIDTH, HEIGHT = 89 * FINE, 111 * FINE
# Where a piece's left edge stands, in the lion's pixels. lib/accessories.ts repeats this and
# each piece's width, to move pieces between spots on the floor.
LEFT = 1

hexrgb = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))
hsv = lambda c: colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)
light = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

# Each piece:
#   box     where it is on the sheet
#   body    what takes a new colour: hue from, hue to, least strength, least brightness, most
#           brightness. Lighter details (a gold crest, a pale monogram) are left as drawn.
#   part    only this share of the piece is repainted (left, top, right, bottom), or None
#   drawn   the name of the colour it was drawn in, which is kept exactly as it is
PIECES = {
    'wallet': {'box': (296, 646, 435, 765), 'body': (5, 40, 0.3, 0.14, 0.6), 'part': None,
               'colours': ['brown', 'black', 'red', 'green', 'pink'], 'drawn': 'brown'},
    'passport': {'box': (792, 627, 913, 781), 'body': (5, 40, 0.3, 0.14, 0.6), 'part': None,
                 'colours': ['brown', 'blue', 'red', 'green', 'black'], 'drawn': 'brown'},
    'perfume': {'box': (62, 871, 182, 1036), 'body': (8, 48, 0.14, 0.3, 1.0), 'part': (0.08, 0.42, 0.92, 0.95),
                'colours': ['gold', 'pink', 'purple', 'teal'], 'drawn': 'gold'},
    'phone': {'box': (806, 871, 903, 1035), 'body': (245, 300, 0.14, 0.28, 1.0), 'part': None,
              'colours': ['purple', 'black', 'pink', 'teal', 'white'], 'drawn': 'purple'},
}


def cut(piece):
    """The piece off the sheet with the paper round it made clear, and nothing else touched."""
    source = Image.open(SHEET).convert('RGB').crop(piece['box'])
    w, h = source.size
    px = source.load()
    # Paper is whatever white can be reached from the edge. White inside the piece (glass, a
    # glint) is part of the piece.
    paper = lambda c: min(c) >= 205 and max(c) - min(c) <= 40
    outside, stack = set(), [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        if (x, y) in outside or not (0 <= x < w and 0 <= y < h) or not paper(px[x, y]):
            continue
        outside.add((x, y))
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    dark = min((px[x, y] for x in range(w) for y in range(h)), key=light)
    near = lambda x, y, reach: any((x + dx, y + dy) in outside for dx in range(-reach, reach + 1) for dy in range(-reach, reach + 1))
    for y in range(h):
        for x in range(w):
            if (x, y) in outside:
                continue
            colour = px[x, y]
            if near(x, y, 2) and light(colour) > 70:
                # The soft edge where the dark outline fades into the paper: keep it as the
                # outline's own colour fading out, so no pale rim is left round the piece.
                out.putpixel((x, y), dark + (max(0, min(255, round((215 - light(colour)) * 255 / 145))),))
            else:
                out.putpixel((x, y), colour + (255,))
    return out


def recoloured(cutout, piece, ramp):
    """The same drawing with its main colour turned to another: every line stays where it was."""
    h0, h1, strength, low, high = piece['body']
    w, h = cutout.size
    part = piece['part'] or (0, 0, 1, 1)
    spots = [(x, y) for y in range(int(part[1] * h), int(part[3] * h)) for x in range(int(part[0] * w), int(part[2] * w))]
    px = cutout.load()
    body = []
    for spot in spots:
        r, g, b, a = px[spot]
        hh, s, v = hsv((r, g, b))
        if a == 255 and h0 <= hh * 360 <= h1 and s >= strength and low <= v <= high:
            body.append((spot, s, v))
    mid_s = sorted(s for _, s, _ in body)[len(body) // 2]
    mid_v = sorted(v for _, _, v in body)[len(body) // 2]
    to_h, to_s, to_v = hsv(ramp[2])
    out = cutout.copy()
    for spot, s, v in body:
        # Its place between dark and light, and between dull and strong, is kept: only the
        # middle it is measured from moves to the new colour.
        new = colorsys.hsv_to_rgb(to_h, max(0.0, min(1.0, s * to_s / mid_s)), max(0.0, min(1.0, v * to_v / mid_v)))
        out.putpixel(spot, tuple(round(c * 255) for c in new) + (255,))
    return out


def picture(cutout):
    out = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    out.alpha_composite(cutout, (LEFT * FINE, HEIGHT - cutout.height))
    return out


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, piece in PIECES.items():
        cutout = cut(piece)
        for colour in piece['colours']:
            shown = cutout if colour == piece['drawn'] else recoloured(cutout, piece, [hexrgb(h) for h in RAMPS[colour]])
            picture(shown).save(f'{OUT}/{name}--{colour}.png', optimize=True)
        print(f"{name}: {cutout.width / FINE:.1f} x {cutout.height / FINE:.1f} of the lion's pixels, {len(piece['colours'])} colours")
