#!/usr/bin/env python3
"""Cleans the four walking frames so the side view matches the seated lion.

The walking cub came from early artwork saved with tens of thousands of slightly different
colours and a smear round its outline. For each frame this script:

1. finds the art's own pixel grid (each art pixel is about 5.86 sprite pixels) and reads one
   colour per art pixel,
2. repaints it in the seated lion's ten colours, so the two are the same golds and browns,
3. shaves off anything outside the dark outline and closes gaps in it,
4. doubles it with rounded corners, so its pixels are closer in size to the seated lion's.

It writes the frames and the four-frame strip the title screen plays. Needs Pillow.
Run from the project root:  PYTHONPATH=scripts python3 scripts/clean-walk.py
"""
from PIL import Image

from pixel_tools import outline, scale2x

PITCH = 5.86
SEATED = 'public/sprites/todah-sit.png'
# The frames as first drawn are kept in docs/design/source, so this can be run again.
SOURCES = ['docs/design/source/old-todah-walk-%d.png' % n for n in range(4)]
FRAMES = ['public/sprites/todah-walk-%d.png' % n for n in range(4)]
STRIP = 'public/sprites/todah-walk.png'


def grid_start(px, w, h, axis):
    """Where the art's pixel grid begins along one axis: the offset that lines up with the most edges."""
    lum = lambda x, y: (0.3 * px[x, y][0] + 0.59 * px[x, y][1] + 0.11 * px[x, y][2]) if px[x, y][3] > 128 else 255
    if axis == 0:
        edges = [sum(abs(lum(x, y) - lum(x - 1, y)) for y in range(h)) for x in range(1, w)]
    else:
        edges = [sum(abs(lum(x, y) - lum(x, y - 1)) for x in range(w)) for y in range(1, h)]
    best = (0, 0.0)
    for k in range(60):
        phase = PITCH * k / 60
        score, count, t = 0.0, 0, phase
        while t < len(edges) - 1:
            i = int(t)
            score += edges[i] * (1 - (t - i)) + edges[i + 1] * (t - i)
            count += 1
            t += PITCH
        best = max(best, (score / count, phase))
    start = 1 + best[1]
    while start - PITCH >= 0:
        start -= PITCH
    return start


def regrid(frame):
    w, h = frame.size
    px = frame.load()
    gx, gy = grid_start(px, w, h, 0), grid_start(px, w, h, 1)
    cols, rows = round(w / PITCH), round(h / PITCH)
    out = Image.new('RGBA', (cols, rows), (0, 0, 0, 0))
    dst = out.load()
    for j in range(rows):
        for i in range(cols):
            xs = [x for x in range(int(gx + i * PITCH + 1.5), int(gx + (i + 1) * PITCH - 0.5)) if 0 <= x < w]
            ys = [y for y in range(int(gy + j * PITCH + 1.5), int(gy + (j + 1) * PITCH - 0.5)) if 0 <= y < h]
            samples = [px[x, y] for y in ys for x in xs]
            solid = [s for s in samples if s[3] > 128]
            if not samples or len(solid) * 2 < len(samples):
                continue
            dst[i, j] = tuple(sorted(s[c] for s in solid)[len(solid) // 2] for c in range(3)) + (255,)
    return out


def repaint(img, palette):
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = min(palette, key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2) + (255,)


seated = Image.open(SEATED).convert('RGBA')
palette = sorted({c[:3] for _, c in seated.getcolors(99999) if c[3]}, key=sum)
print(f'{len(palette)} colours taken from {SEATED}')
cleaned = []
for source, path in zip(SOURCES, FRAMES):
    frame = regrid(Image.open(source).convert('RGBA'))
    repaint(frame, palette)
    outline(frame)
    frame = scale2x(frame)
    frame.save(path)
    cleaned.append(frame)
    print(f'{path}: {frame.width}x{frame.height}')
strip = Image.new('RGBA', (cleaned[0].width * len(cleaned), cleaned[0].height), (0, 0, 0, 0))
for n, frame in enumerate(cleaned):
    strip.alpha_composite(frame, (n * frame.width, 0))
strip.save(STRIP)
print(f'{STRIP}: {strip.width}x{strip.height}')
