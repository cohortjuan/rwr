#!/usr/bin/env python3
"""Rebuilds a clean seated Todah from a sheet of lions made by an image model.

The sheet (a JPEG of sixteen lions modelling accessories) has a better-drawn cub than the
game's first sprite, but no lion on it is bare, the picture is small, and JPEG has smeared
its pixels. This script:

1. cuts out two lions that are the same drawing in the same place: one with a clean face
   (he wears a chain) and one with a clean body (he wears sunglasses),
2. resamples each to half the sheet's pixel pitch, which is fine enough to keep the eyes and
   mouth and coarse enough to throw away the JPEG smear,
3. joins the clean face to the clean body along the row where the two agree best,
4. clears the white background and the pale fringe JPEG leaves outside the outline,
5. reduces the colours to a small fixed palette, and removes lone dark specks,
6. sets the lion on a canvas with the game's own proportions (51 wide to 58 tall).

Needs Pillow. Run from the project root:
    cd scripts && python3 todah-from-sheet.py path/to/sheet.jpg ../public/sprites/todah-sit.png

It writes the seated sprite and, beside it, his three other faces (blink, happy, talk).
"""
import sys
from collections import Counter, deque

from PIL import Image, ImageFilter

from pixel_tools import STEPS, outline

PITCH = 2.75            # half of the sheet's 5.5 pixel art pixel
BOX = (236, 284)        # one lion's cell on the sheet
FACE_AT, BODY_AT = (251, 18), (5, 18)   # top-left of the chain lion and the sunglasses lion
SEAM = 49               # rows above come from the clean face, rows from here down from the clean body
COLOURS = 14
CANVAS = (89, 101)


def resample(sheet, corner):
    w, h = BOX
    cell = sheet.crop((corner[0], corner[1], corner[0] + w, corner[1] + h)).filter(ImageFilter.MedianFilter(3))
    src = cell.load()
    cols, rows = int(w / PITCH), int(h / PITCH)
    out = Image.new('RGB', (cols, rows))
    dst = out.load()
    for j in range(rows):
        for i in range(cols):
            dst[i, j] = src[min(w - 1, int((i + 0.5) * PITCH)), min(h - 1, int((j + 0.5) * PITCH))]
    return out


def cut_out(img):
    """True where the picture is background."""
    w, h = img.size
    p = img.load()
    clear = [[False] * w for _ in range(h)]
    queue = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while queue:
        x, y = queue.popleft()
        if not (0 <= x < w and 0 <= y < h) or clear[y][x] or min(p[x, y]) <= 225:
            continue
        clear[y][x] = True
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return clear


def tail(canvas):
    """Gives him his tail back. The sheet's cub was drawn without one.

    It comes up from behind his right hip and ends in a darker tuft beside his shoulder, where
    the first Todah carried his. It is painted only on empty pixels, so his body stays in
    front of it, and it gets the same dark outline as the rest of him.
    """
    px = canvas.load()
    w, h = canvas.size
    shades = sorted({px[x, y] for y in range(h) for x in range(w) if px[x, y][3]}, key=lambda c: sum(c[:3]))
    ink, tuft, shade, fur, light = shades[0], shades[1], shades[2], shades[-3], shades[-2]
    empty = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][3] == 0
    painted = set()

    def dab(x, y, colour):
        if empty(x, y) or (x, y) in painted:
            px[x, y] = colour
            painted.add((x, y))

    # The tail itself: a curve three pixels thick, lit on the upper side.
    start, bend, end = (70.0, 72.0), (84.0, 71.0), (82.0, 57.0)
    for step in range(81):
        t = step / 80
        cx = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * bend[0] + t ** 2 * end[0]
        cy = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * bend[1] + t ** 2 * end[1]
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                dab(round(cx) + dx, round(cy) + dy, shade if (dx == 1 and t > 0.45) or (dy == 1 and t <= 0.45) else fur)

    # The tuft: a flame shape leaning a little outward, darker than his coat.
    rows = {-7: (0, 0), -6: (-1, 1), -5: (-2, 1), -4: (-2, 2), -3: (-3, 2), -2: (-3, 3), -1: (-3, 3), 0: (-3, 3), 1: (-2, 3), 2: (-2, 2), 3: (-1, 1)}
    tx, ty = 82, 52
    for dy, (left, right) in rows.items():
        for dx in range(left, right + 1):
            dab(tx + dx, ty + dy, shade if dx <= left + 1 and -5 <= dy <= 0 else tuft)
    dab(tx - 1, ty - 3, light)

    # The outline: any empty pixel that touches the new tail.
    for x, y in [(x + dx, y + dy) for x, y in painted for dx, dy in STEPS]:
        if empty(x, y):
            px[x, y] = ink


def eyes(canvas):
    """The two eyes: each is the box round one of the big dark blobs in the top half of his face."""
    px = canvas.load()
    w, h = canvas.size
    dark = lambda x, y: px[x, y][3] and sum(px[x, y][:3]) < 200
    seen, found = set(), []
    for y in range(h // 6, h // 2):
        for x in range(w):
            if (x, y) in seen or not dark(x, y):
                continue
            blob, queue = [], [(x, y)]
            seen.add((x, y))
            while queue:
                cx, cy = queue.pop()
                blob.append((cx, cy))
                for dx, dy in STEPS:
                    nxt = (cx + dx, cy + dy)
                    if 0 <= nxt[0] < w and 0 <= nxt[1] < h and nxt not in seen and dark(*nxt):
                        seen.add(nxt)
                        queue.append(nxt)
            xs, ys = [b[0] for b in blob], [b[1] for b in blob]
            box = (min(xs), min(ys), max(xs), max(ys))
            # An eye is a compact blob. The outline is one huge sprawling one.
            if 30 <= len(blob) <= 120 and box[2] - box[0] <= 12 and box[3] - box[1] <= 12:
                found.append(box)
    return sorted(found)[:2]


def faces(canvas):
    """His other three faces, made from the first by redrawing only the eyes or the mouth."""
    px = canvas.load()
    shades = sorted({px[x, y] for y in range(canvas.height) for x in range(canvas.width) if px[x, y][3]}, key=lambda c: sum(c[:3]))
    ink, tongue, lid = shades[0], shades[1], shades[-2]
    boxes = eyes(canvas)
    assert len(boxes) == 2, f'expected two eyes, found {len(boxes)}'

    def shut(curve):
        face = canvas.copy()
        fp = face.load()
        for left, top, right, bottom in boxes:
            for y in range(top, bottom + 1):
                for x in range(left, right + 1):
                    fp[x, y] = lid
            width = right - left
            for x in range(left, right + 1):
                y = (top + bottom) // 2 + curve(x - left, width)
                fp[x, y] = fp[x, y + 1] = ink
        return face

    blink = shut(lambda at, width: 0)
    # A happy eye is an arch: highest in the middle, a pixel or two lower at each end.
    happy = shut(lambda at, width: -1 + round(2.4 * abs(at - width / 2) / (width / 2)) ** 1)

    talk = canvas.copy()
    tp = talk.load()
    # His mouth, open: a small dark oval under the nose with a little tongue in it.
    centre = canvas.width // 2
    nose_bottom = max(y for y in range(canvas.height // 3, canvas.height // 2) for x in (centre - 1, centre) if sum(px[x, y][:3]) < 200)
    for dy, half in enumerate((2, 3, 3, 3, 2)):
        for x in range(centre - half, centre + half):
            tp[x, nose_bottom + 1 + dy] = tongue if dy >= 2 and abs(x - centre + 0.5) < half - 0.5 else ink
    return {'blink': blink, 'happy': happy, 'talk': talk}


def main(sheet_path, out_path):
    sheet = Image.open(sheet_path).convert('RGB')
    face, body = resample(sheet, FACE_AT), resample(sheet, BODY_AT)
    joined = face.copy()
    joined.paste(body.crop((0, SEAM, body.width, body.height)), (0, SEAM))
    clear = cut_out(joined)

    flat = joined.quantize(colors=COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    lion = Image.new('RGBA', joined.size, (0, 0, 0, 0))
    src, dst = flat.load(), lion.load()
    for y in range(joined.height):
        for x in range(joined.width):
            if not clear[y][x]:
                dst[x, y] = src[x, y] + (255,)
    lion = lion.crop(lion.getbbox())
    outline(lion)
    lion = lion.crop(lion.getbbox())

    # A lone dark pixel with no dark neighbour is a smear, not a line.
    px = lion.load()
    dark = lambda c: c[3] and c[0] + c[1] + c[2] < 260
    for y in range(1, lion.height - 1):
        for x in range(1, lion.width - 1):
            if not dark(px[x, y]):
                continue
            around = [px[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx, dy) != (0, 0)]
            if all(c[3] and not dark(c) for c in around):
                px[x, y] = Counter(around).most_common(1)[0][0]

    canvas = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(lion, ((CANVAS[0] - lion.width) // 2, CANVAS[1] - lion.height))
    tail(canvas)
    canvas.save(out_path)
    print(f'{out_path}: lion {lion.width}x{lion.height} on {CANVAS[0]}x{CANVAS[1]}, {len(lion.getcolors(9999)) - 1} colours')
    for name, face in faces(canvas).items():
        face.save(out_path.replace('.png', f'-{name}.png'))
        print(f"{out_path.replace('.png', f'-{name}.png')}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
