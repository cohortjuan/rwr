#!/usr/bin/env python3
"""Cuts the lion's poses out of the sheet the image model drew, and writes the game's sprites.

docs/design/source/poses-sheet.jpg has twelve lions on magenta, in four columns:
    1 seated   2 blink      3 happy            4 talking
    5-8        four frames of a walk, side on
    9 standing 10 head turned to us   11 three-quarter sit   12 seated again

From it this writes, into public/sprites:
    todah-sit-blink.png, todah-sit-happy.png, todah-sit-talk.png
        The seated lion (todah-sit.png, made by todah-from-sheet.py) with only the eyes or the
        mouth taken from the sheet, so the three faces sit exactly on the first.
    todah-walk.png   the four walking frames side by side
    todah-turn.png   the two frames of his turn: standing side-on, then half sat at three-quarters
Every frame is read at the lion's own pixel size, repainted in his ten colours, cut out of
the magenta, and given a clean closed outline. All of them are 101 pixels tall with the feet
on the bottom edge, so the game can show them at one size and he never changes scale.

Needs Pillow. Run from the scripts folder:  cd scripts && python3 poses-from-sheet.py
"""
from PIL import Image, ImageFilter

from pixel_tools import STEPS, outline

SHEET = Image.open('../docs/design/source/poses-sheet.jpg').convert('RGB')
SOFT = SHEET.filter(ImageFilter.MedianFilter(3)).load()
BASE = Image.open('../public/sprites/todah-sit.png').convert('RGBA')
PALETTE = sorted({c[:3] for _, c in BASE.getcolors(99999) if c[3]}, key=sum)
TONGUE = (214, 92, 92)
HEIGHT = BASE.height

# Where each lion sits on the sheet (left, top, right, bottom), and how many sheet pixels make
# one sprite pixel for it. The walk was drawn a little smaller than the rest.
BOXES = {
    1: (36, 20, 267, 299), 2: (337, 20, 568, 299), 3: (636, 20, 867, 299), 4: (936, 20, 1167, 299),
    5: (0, 330, 299, 551), 6: (304, 330, 599, 551), 7: (600, 330, 899, 551), 8: (900, 330, 1199, 551),
    9: (4, 612, 295, 879), 10: (300, 607, 599, 879), 11: (622, 602, 881, 883),
}
PITCH = {**{n: 2.772 for n in (1, 2, 3, 4, 9, 10)}, **{n: 2.34 for n in (5, 6, 7, 8)}, 11: 2.80}

magenta = lambda c: c[0] > 150 and c[2] > 150 and c[1] < 0.62 * min(c[0], c[2])
nearest = lambda c, colours: min(colours, key=lambda p: (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2)


def sample(cell, extra=()):
    """One lion off the sheet at the game's pixel size, in the game's colours, on clear."""
    x0, y0, x1, y1 = BOXES[cell]
    pitch = PITCH[cell]
    cols, rows = round((x1 - x0 + 1) / pitch), round((y1 - y0 + 1) / pitch)
    out = Image.new('RGBA', (cols, rows), (0, 0, 0, 0))
    px = out.load()
    colours = PALETTE + list(extra)
    for j in range(rows):
        for i in range(cols):
            c = SOFT[min(SHEET.width - 1, int(x0 + (i + 0.5) * pitch)), min(SHEET.height - 1, int(y0 + (j + 0.5) * pitch))]
            if not magenta(c):
                px[i, j] = nearest(c, colours) + (255,)
    return out


# ---------------------------------------------------------------------------------------
# The three faces

def faces():
    plain = sample(1).load()
    width, height = sample(1).size
    base = BASE.load()
    # Where the sheet's copy of him sits on the game's sprite: the offset where most pixels agree.
    _, dx, dy = max(
        (sum(1 for y in range(height) for x in range(width)
             if 0 <= x + ox < BASE.width and 0 <= y + oy < BASE.height and plain[x, y][3] and base[x + ox, y + oy] == plain[x, y]), ox, oy)
        for ox in range(0, 9) for oy in range(-3, 4)
    )
    # Only the eyes change for a blink or a smile, and only the mouth for talking.
    eyes_area, mouth_area = (16, 16, 68, 37), (30, 34, 56, 58)
    for name, cell, (left, top, right, bottom), extra in (
        ('blink', 2, eyes_area, ()), ('happy', 3, eyes_area, ()), ('talk', 4, mouth_area, (TONGUE,)),
    ):
        drawn = sample(cell, extra).load()
        changed = {(x, y) for y in range(top, bottom) for x in range(left, right) if drawn[x, y][3] and plain[x, y][3] and drawn[x, y] != plain[x, y]}
        # A real change is a patch. A lone pixel of difference is the two copies not quite agreeing.
        patch = {spot for spot in changed if sum((spot[0] + a, spot[1] + b) in changed for a in (-1, 0, 1) for b in (-1, 0, 1)) >= 4}
        patch = {(x + a, y + b) for x, y in patch for a in (-1, 0, 1) for b in (-1, 0, 1)}
        face = BASE.copy()
        px = face.load()
        for x, y in patch:
            if left <= x < right and top <= y < bottom and drawn[x, y][3]:
                px[x + dx, y + dy] = drawn[x, y]
        face.save(f'../public/sprites/todah-sit-{name}.png')
        print(f'todah-sit-{name}.png: {len(patch)} pixels redrawn')


# ---------------------------------------------------------------------------------------
# The walk and the turn

def open_eye(frame, donor):
    """The second walking frame was drawn with its eye shut. Give it the open eye from the first."""
    dark = lambda img, x, y: img.getpixel((x, y))[3] and sum(img.getpixel((x, y))[:3]) < 200

    def blobs(img, area):
        seen, found = set(), []
        for y in range(area[1], area[3]):
            for x in range(area[0], area[2]):
                if (x, y) in seen or not dark(img, x, y):
                    continue
                blob, queue = [], [(x, y)]
                seen.add((x, y))
                while queue:
                    cx, cy = queue.pop()
                    blob.append((cx, cy))
                    for sx, sy in STEPS:
                        nxt = (cx + sx, cy + sy)
                        if 0 <= nxt[0] < img.width and 0 <= nxt[1] < img.height and nxt not in seen and dark(img, *nxt):
                            seen.add(nxt)
                            queue.append(nxt)
                found.append(blob)
        return found

    # The eye is the compact dark blob in the head, which is the top right of a walking frame.
    head = lambda img: (img.width * 5 // 8, 0, img.width - 6, img.height // 2)
    eye = max((b for b in blobs(donor, head(donor)) if 20 <= len(b) <= 90), key=len)
    ex0, ey0 = min(x for x, _ in eye) - 3, min(y for _, y in eye) - 3
    ex1, ey1 = max(x for x, _ in eye) + 4, max(y for _, y in eye) + 4
    patch = donor.crop((ex0, ey0, ex1, ey1))
    # Both frames have the nose at the right edge and the feet at the bottom, so the eye
    # belongs at the same distance from those two edges.
    ox, oy = frame.width - donor.width, frame.height - donor.height
    centre = ((ex0 + ex1) // 2 + ox, (ey0 + ey1) // 2 + oy)
    px = frame.load()
    # Rub out the shut eye: any small dark stroke close to where the eye should be.
    for stroke in blobs(frame, head(frame)):
        cx = sum(x for x, _ in stroke) / len(stroke)
        cy = sum(y for _, y in stroke) / len(stroke)
        if len(stroke) <= 40 and abs(cx - centre[0]) <= 7 and abs(cy - centre[1]) <= 7:
            for x, y in stroke:
                around = [px[x + a, y + b] for a in range(-3, 4) for b in range(-3, 4) if px[x + a, y + b][3] and sum(px[x + a, y + b][:3]) >= 200]
                px[x, y] = max(set(around), key=around.count)
    frame.alpha_composite(patch, (ex0 + ox, ey0 + oy))


def strip(cells, path, fix=None, centred=False):
    frames = []
    for cell in cells:
        frame = sample(cell)
        outline(frame)
        frames.append(frame.crop(frame.getbbox()))
    if fix:
        fix(frames)
    # One size for every frame: as tall as the seated lion, feet on the bottom edge. A walk
    # keeps the nose of each frame in the same place, so he does not slide about as he steps.
    # A turn keeps him in the middle of the frame, since he turns on the spot.
    width = max(frame.width for frame in frames) + 4
    sheet = Image.new('RGBA', (width * len(frames), HEIGHT), (0, 0, 0, 0))
    for n, frame in enumerate(frames):
        if frame.height > HEIGHT:
            frame = frame.crop((0, frame.height - HEIGHT, frame.width, frame.height))
        left = (width - frame.width) // 2 if centred else width - 2 - frame.width
        sheet.alpha_composite(frame, (n * width + left, HEIGHT - frame.height))
    sheet.save(path)
    print(f'{path.split("/")[-1]}: {len(frames)} frames of {width}x{HEIGHT}')
    return width


if __name__ == '__main__':
    faces()
    walk = strip((5, 6, 7, 8), '../public/sprites/todah-walk.png', fix=lambda frames: open_eye(frames[1], frames[0]))
    # Frame 10 (body side-on, head already facing us) is left out of the turn: with it his head
    # came round, went back to three-quarters, then came round again.
    turn = strip((9, 11), '../public/sprites/todah-turn.png', centred=True)
    print(f'frame widths for the title screen: walk {walk}, turn {turn}, seated {BASE.width}, all {HEIGHT} tall')
