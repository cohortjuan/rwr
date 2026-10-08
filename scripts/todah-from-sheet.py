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
    python3 scripts/todah-from-sheet.py path/to/sheet.jpg docs/design/new-todah/todah-sit.png
"""
import sys
from collections import Counter, deque

from PIL import Image, ImageFilter

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
    # The fringe: JPEG leaves a smear just outside the outline, tan next to the background and
    # paler behind it. It is at most two pixels deep, so it is peeled in two steps and no more:
    # first anything lighter than the outline's browns that touches the background, then only
    # the pale pixels that the first step uncovered. The outline's own dark and mid browns stop it.
    touches = lambda x, y: any(
        0 <= x + dx < w and 0 <= y + dy < h and clear[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
    )
    removed = 0
    for limit in (400, 560):
        fringe = [(x, y) for y in range(h) for x in range(w) if not clear[y][x] and sum(p[x, y]) >= limit and touches(x, y)]
        removed += len(fringe)
        for x, y in fringe:
            clear[y][x] = True
    print(f'fringe pixels peeled: {removed}')
    return clear


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
    canvas.save(out_path)
    print(f'{out_path}: lion {lion.width}x{lion.height} on {CANVAS[0]}x{CANVAS[1]}, {len(lion.getcolors(9999)) - 1} colours')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
