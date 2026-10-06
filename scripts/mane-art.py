#!/usr/bin/env python3
"""Draws the lion's mane, the chain's pendant and the crown, and writes them into the game.

Run from the project root, with nothing to install:

    python3 scripts/mane-art.py

It reads public/sprites/todah-sit.png to learn the lion's outline, then writes
lib/maneArt.ts (the art the game draws) and docs/design/mane-progression.html (a sheet
showing every mane level). Change the shapes here, never in those two files.

The sprite is treated as a grid of cells, 3 sprite pixels to a cell: 51 cells wide and 58
tall, with 6 more rows of headroom above for hair that rises over the head.
"""
import base64, json, math, re, struct, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPRITE = ROOT / 'public/sprites/todah-sit.png'

def load(path):
    d = open(path,'rb').read()
    pos = 8; idat = b''; w = h = 0
    while pos < len(d):
        n, typ = struct.unpack('>I4s', d[pos:pos+8]); body = d[pos+8:pos+8+n]; pos += 12+n
        if typ == b'IHDR': w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', body); assert (bd, ct, il) == (8, 6, 0)
        elif typ == b'IDAT': idat += body
    raw = zlib.decompress(idat); bpp = 4; stride = w*bpp; rows = []; prev = bytearray(stride); p = 0
    for y in range(h):
        f = raw[p]; line = bytearray(raw[p+1:p+1+stride]); p += 1+stride
        for i in range(stride):
            a = line[i-bpp] if i >= bpp else 0; b = prev[i]; c = prev[i-bpp] if i >= bpp else 0
            if f == 1: line[i] = (line[i]+a) & 255
            elif f == 2: line[i] = (line[i]+b) & 255
            elif f == 3: line[i] = (line[i]+((a+b)>>1)) & 255
            elif f == 4:
                pa, pb, pc = abs(b-c), abs(a-c), abs(a+b-2*c)
                line[i] = (line[i]+(a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return w, h, rows

w, h, rows = load(str(SPRITE))

CW, CH, TOP = 51, 58, 6
def solid(cx, cy):
    if cx < 0 or cy < 0 or cx >= CW or cy >= CH: return False
    n = a = 0
    for y in range(cy*3, min(cy*3+3, h)):
        for x in range(cx*3, min(cx*3+3, w)):
            a += rows[y][x*4+3]; n += 1
    return n > 0 and a / n > 110
S = [[solid(x, y) for x in range(CW)] for y in range(CH)]
def edges(y):
    xs = [x for x in range(CW) if S[y][x]]
    return (min(xs), max(xs)) if xs else None
def top_edge(x, limit=8):
    for y in range(limit):
        if S[y][x]: return y
    return None
CX = 24.5

# The lock of hair on his forehead, as a filled shape that follows the one drawn on the
# sprite: hanging from the hairline, swept to his left, ending in a point.
LOCK = ["MMMMMMMM", "DMMMMMMD", "DMMMMMMD", "DDMMMMMD", ".DDMMMMD", "..DDMMMD", "...DDMMD", "....DDD."]
LOCK_X, LOCK_Y = 19, 4

def lock(cells, joined):
    for dy, row in enumerate(LOCK):
        for dx, c in enumerate(row):
            if c != '.': cells[(LOCK_X + dx, LOCK_Y + dy)] = c
    if joined:
        # run the hair on top down into the lock, so they are one piece
        for x in range(LOCK_X, LOCK_X + 8):
            top = top_edge(x) or 0
            for y in range(top, LOCK_Y):
                cells.setdefault((x, y), 'M')

def growing(size):
    cells = {}
    def put(x, y, c):
        if 0 <= x < CW and -TOP <= y < CH: cells[(x, y)] = c
    crest = {0: (3, 1, 1), 1: (4, 5, 3), 2: (10, 4, 2)}[size]
    half, height, dip = crest
    for x in range(int(CX-half), int(CX+half)+1):
        t = abs(x - CX) / (half + 0.5)
        top = top_edge(x)
        if top is None: top = 4
        up = round(height * (1 - t*t))
        if (x % 2 == 0) and up > 1: up -= 1
        for y in range(top - up, top + dip + (0 if x % 3 else 1)):
            put(x, y, 'D' if y == top - up else 'M')
    ruff = {0: None, 1: None, 2: (14, 28, 4, 2)}[size]
    if ruff:
        y0, y1, out, inn = ruff
        for y in range(y0, y1 + 1):
            e = edges(y)
            if not e: continue
            grow = min(1.0, (y - y0 + 1) / 4); fade = min(1.0, (y1 - y + 1) / 3)
            o = round(out * grow * fade)
            for side, edge in ((-1, e[0]), (1, e[1])):
                for k in range(-o, inn):
                    x = edge + (k if side == -1 else -k)
                    c = 'D' if k == -o and o > 0 else 'M'
                    if k < 0 and x % 3 == 0 and y % 5 != 0: c = 'D'
                    put(x, y, c)
    bib = {0: None, 1: None, 2: (31, 36, 9)}[size]
    if bib:
        y0, y1, half = bib
        for y in range(y0, y1 + 1):
            t = (y - y0) / (y1 - y0 + 1); hw = half * (1 - t) ** 0.8
            for x in range(int(CX - hw), int(CX + hw) + 1):
                if (x % 2 == 0) and y == y1: continue
                edge = abs(x - CX) > hw - 1 or y == y1
                strand = x % 4 == 0 and y > y0 + 1 and y % 6 != 0
                put(x, y, 'D' if edge or strand else 'M')
    lock(cells, joined=size >= 1)
    return cells

def regal():
    # The full mane: it frames the whole face, swallows all but the tips of the ears, rises in
    # a crown of points, and falls wide over the chest and shoulders.
    cells = {}
    FY = 19.5                       # the face it frames
    def face(x, y):  return ((x + 0.5 - CX - 0.5) / 14.2) ** 2 + ((y + 0.5 - FY) / 12.3) ** 2 < 1
    def ear(x, y):
        for ex in (7.5, 42.0):
            if ((x + 0.5 - ex) / 3.6) ** 2 + ((y + 0.5 - 8.0) / 4.6) ** 2 < 1: return True
        return False
    def outer(x, y):
        dx, dy = x + 0.5 - CX - 0.5, y + 0.5 - 17.0
        ang = math.atan2(dy, dx)
        # points all the way round, longer on top like a crown
        spike = 0.5 + 0.5 * math.cos(ang * 12)
        up = max(0.0, -math.sin(ang))
        rx, ry = 27.5 + 1.2 * spike, 20.5 + 2.6 * spike * (0.4 + up)
        if dy > 0: ry = 26.0 + 1.5 * spike          # it hangs below the chin, over the chest
        if dy > 0: rx = 27.5 - 9.5 * min(1.0, dy / 30.0) + 1.5 * spike   # and narrows to the chest
        return (dx / rx) ** 2 + (dy / ry) ** 2 < 1
    def inside(x, y):
        if not (0 <= x < CW and -TOP <= y < 44): return False
        if not outer(x, y) or face(x, y) or ear(x, y): return False
        if y >= 30 and x >= 44: return False        # leave the tail alone
        return True
    for y in range(-TOP, 44):
        for x in range(CW):
            if not inside(x, y): continue
            dx, dy = x + 0.5 - CX - 0.5, y + 0.5 - 17.0
            ang = math.atan2(dy, dx)
            rim = not all(inside(x + ax, y + ay) or face(x + ax, y + ay) or ear(x + ax, y + ay)
                          for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            # strands flowing out from the face, darker underneath where hair overlaps
            # thin strands flowing out from the face
            strand = int((ang + math.pi) * 26 / math.pi) % 4 == 0
            near_face = any(face(x + ax, y + ay) for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            cells[(x, y)] = 'D' if rim or (strand and not near_face) else 'M'
    lock(cells, joined=True)
    return cells

def art(cells):
    xs = [x for x, _ in cells]; ys = [y for _, y in cells]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    return {'x': x0, 'y': y0, 'rows': [''.join(cells.get((x, y), '.') for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]}

def regal_b():
    # A second take on the full mane. Hair falls from the crown of the head instead of
    # fanning out from the face: a high rounded top, a long pointed fall over the chest that
    # ends in separate locks, and a darker ruff under the chin, as grown lions have.
    cells = {}
    FY = 19.5
    def face(x, y): return ((x - 24.5) / 14.2) ** 2 + ((y + 0.5 - FY) / 12.3) ** 2 < 1
    def ear(x, y):
        for ex in (7.5, 42.0):
            if ((x + 0.5 - ex) / 3.6) ** 2 + ((y + 0.5 - 8.0) / 4.6) ** 2 < 1: return True
        return False
    def tri(v): return 1 - 4 * abs((v % 1) - 0.5)            # +1 mid-lock, -1 between locks
    def outer(x, y):
        dx, dy = x - 24.5, y + 0.5 - 17.0
        if dy <= 0:
            ang = math.atan2(dy, dx)
            tuft = 0.5 + 0.5 * math.cos(ang * 10)
            ry = 21.0 + 2.2 * tuft * max(0.0, -math.sin(ang))
            return (dx / 27.5) ** 2 + (dy / ry) ** 2 < 1
        if abs(dx) >= 26: return False
        fall = 30.0 * (1 - abs(dx) / 26.0) ** (1 / 1.7)        # long in the middle, short at the sides
        return dy < fall + 1.6 * tri(dx / 3.4)                 # each lock ends in a point
    def inside(x, y):
        if not (0 <= x < CW and -TOP <= y < 48): return False
        if not outer(x, y) or face(x, y) or ear(x, y): return False
        if y >= 30 and x >= 44: return False                   # leave the tail alone
        return True
    def lock_of(x, y): return math.floor(math.atan2(y + 0.5 - 3.0, x - 24.5) * 21 / math.pi)
    for y in range(-TOP, 48):
        for x in range(CW):
            if not inside(x, y): continue
            dx, dy = x - 24.5, y + 0.5 - 17.0
            rim = not all(inside(x + ax, y + ay) or face(x + ax, y + ay) or ear(x + ax, y + ay)
                          for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            # a thin line wherever one lock meets the next
            parting = lock_of(x, y) != lock_of(x + 1, y) and y > 4
            near_face = any(face(x + ax, y + ay) for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            # the darker ruff under the chin
            ruff = dy > 13 and abs(dx) < 10.5 * (1 - (dy - 13) / 19.0)
            dark = rim or (parting and not near_face)
            if ruff: dark = not parting and not near_face or rim
            cells[(x, y)] = 'D' if dark else 'M'
    lock(cells, joined=True)
    return cells

SEAM = 18    # the row where the two halves of the combined mane meet, level with the eyes

def regal_c():
    # The chosen full mane: the top of the first design (points rising like a crown, strands
    # fanning from the face) over the bottom of the second (a long fall of pointed locks and
    # a darker ruff under the chin).
    top, bottom = regal(), regal_b()
    cells = {spot: c for spot, c in top.items() if spot[1] < SEAM}
    cells.update({spot: c for spot, c in bottom.items() if spot[1] >= SEAM})
    def face(x, y): return ((x - 24.5) / 14.2) ** 2 + ((y + 0.5 - 19.5) / 12.3) ** 2 < 1
    def ear(x, y):
        return any(((x + 0.5 - ex) / 3.6) ** 2 + ((y + 0.5 - 8.0) / 4.6) ** 2 < 1 for ex in (7.5, 42.0))
    # where the halves meet, redraw the dark edge so the outline stays unbroken
    for (x, y) in list(cells):
        if y in (SEAM - 1, SEAM):
            around = ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
            if any(spot not in cells and not face(*spot) and not ear(*spot) for spot in around):
                cells[(x, y)] = 'D'
    return cells

# Level 3 went through two candidates, A and B. C joins the top of A to the bottom of B.
# FULL_MANE picks the one the game uses.
full_manes = {'A': art(regal()), 'B': art(regal_b()), 'C': art(regal_c())}
FULL_MANE = 'C'
sizes = [art(growing(0)), art(growing(1)), art(growing(2)), full_manes[FULL_MANE]]

# The chain's pendant: a lion's head in side view on a round medallion, two art pixels per cell.
# R rim, K field, M and D mane, G and Y face, E eye, nose and mouth.
head = [
 "......MMMMMM........",
 "....MMMMMMMMMM......",
 "...MMMMMMMMGGGG.....",
 "..MMMMMMMMGGGGGG....",
 "..MMMMMMMGGYYYGGG...",
 ".MMMMMMMMGYYYYYGGG..",
 ".MMMMMMMGGYYEYYYGG..",
 ".MMMMMMMGGYYYYYYYGG.",
 ".MMMMMMMGGYYYYYYYYEE",
 ".MMMMMMMMGGYYYYYYYYE",
 ".MMMMMMMMGGYYYYYYYY.",
 "..MMMMMMMMGGYYYEEEE.",
 "..MMMMMMMMGGGYYYYY..",
 "...MMMMMMMMGGGYYY...",
 "...MMMMMMMMMGGG.....",
 "....MMMMMMMMMM......",
 ".....MMMMMMMM.......",
 ".......MMMM.........",
]

def pendant():
    W, H = 24, 22
    out = []
    for y in range(H):
        line = ''
        for x in range(W):
            d = ((x + 0.5 - W / 2) / (W / 2)) ** 2 + ((y + 0.5 - H / 2) / (H / 2)) ** 2
            c = '.' if d > 1 else ('R' if d > 0.74 else 'K')
            hx, hy = x - 2, y - 2
            if c == 'K' and 0 <= hy < len(head) and 0 <= hx < 20 and head[hy][hx] != '.':
                c = head[hy][hx]
                if c == 'M' and (hx + 2 * hy) % 5 == 0: c = 'D'
            line += c
        out.append(line)
    return out

# The crown: the gift for the roar, at two art pixels per cell like the pendant. Five points
# with a ruby on the tallest and pearls on the rest, velvet showing between them, and a band
# set with an emerald, rubies and sapphires. O outline, G Y S gold and its light and shade,
# V velvet, R B E jewels, P pearl, W glint.
def crown():
    W, H = 44, 21
    g = [['.'] * W for _ in range(H)]
    band_top = 15
    # the band
    for y in range(band_top, H):
        for x in range(1, W - 1):
            g[y][x] = 'Y' if y == band_top else 'S' if y == H - 1 else 'G'
    # five points: the middle one tallest
    points = [(4, 8), (13, 11), (21.5, 15), (30, 11), (39, 8)]
    for cx, height in points:
        for k in range(height):
            y = band_top - 1 - k
            half = 4.2 * (1 - k / height) + 0.6
            for x in range(W):
                d = x + 0.5 - cx - 0.5 if cx != 21.5 else x + 0.5 - 22
                if abs(d) <= half:
                    g[y][x] = 'Y' if d < -half * 0.35 else 'S' if d > half * 0.45 else 'G'
    # velvet showing between the points
    for y in range(8, band_top):
        for x in range(3, W - 3):
            if g[y][x] == '.':
                arch = 8 + 3.0 * abs((x - 21.5) / 19.0) ** 2
                if y >= arch: g[y][x] = 'V'
    # a jewel on each tip, the middle one larger
    for cx, height in points:
        top = band_top - height
        x0 = int(cx - 0.5) if cx != 21.5 else 21
        big = cx == 21.5
        c = 'R' if big else 'P'
        for dy in range(-1, 2 if big else 1):
            for dx in range(-1, 3 if big else 2):
                y, x = top + dy, x0 + dx
                if 0 <= y < H and 0 <= x < W: g[y][x] = c
        if big:
            g[top][x0] = 'W'
    # jewels set in the band: an emerald in the middle, rubies and sapphires beside it
    def gem(x0, w, c):
        for y in range(band_top + 1, H - 1):
            for x in range(x0, x0 + w):
                g[y][x] = c
        g[band_top + 1][x0] = 'W'
    gem(20, 4, 'E'); gem(12, 3, 'R'); gem(29, 3, 'R'); gem(5, 3, 'B'); gem(36, 3, 'B')
    for x in (9, 10, 16, 17, 26, 27, 33, 34):
        g[band_top + 2][x] = 'P'; g[band_top + 3][x] = 'P'
    # a dark outline all the way round, so it stands out against fur and sky alike
    out = [['.'] * (W + 2) for _ in range(H + 2)]
    for y in range(H):
        for x in range(W):
            out[y + 1][x + 1] = g[y][x]
    for y in range(H + 2):
        for x in range(W + 2):
            if out[y][x] != '.': continue
            if any(0 <= y + ay < H + 2 and 0 <= x + ax < W + 2 and out[y + ay][x + ax] not in '.O'
                   for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = 'O'
    return [''.join(r) for r in out]

# ---- lib/maneArt.ts
ts = """// Generated by scripts/mane-art.py. Do not edit by hand: change the script and run it again.
//
// maneArt holds the mane at four sizes, on the sprite's grid (one cell is 3 sprite pixels).
// Size 0 is the cub's own bump of hair on top of the head. Size 1 is his first real hair: a
// narrow crest on top, like a mohawk. Size 2 widens it and adds ruffs beside the jaw and a
// small one on the chest. Size 3 is the full mane: it frames the whole face, leaves only the
// ears showing, rises in points on top, and falls over the chest. The size follows the Mane
// upgrade's level. M is the mane colour and D its shade.
//
// Every size includes the lock of hair on his forehead as a filled shape, joined to the hair
// on top, so the whole of it takes the mane's colour together.
//
// lionPendant is the chain's medallion, a lion's head in side view, and crownArt is the crown
// given for the roar. Both are at twice the grid's detail (two art pixels per cell).

export const maneArt: { x: number, y: number, rows: string[] }[] = [
"""
for size in sizes:
    ts += f"  {{\n    x: {size['x']},\n    y: {size['y']},\n    rows: [\n" + ''.join(f"      '{row}',\n" for row in size['rows']) + "    ],\n  }},\n"
ts += "]\n\nexport const lionPendant: string[] = [\n" + ''.join(f"  '{row}',\n" for row in pendant()) + "]\n"
ts += "\nexport const crownArt: string[] = [\n" + ''.join(f"  '{row}',\n" for row in crown()) + "]\n"
(ROOT / 'lib/maneArt.ts').write_text(ts.replace('{{', '{').replace('}}', '}'))

# ---- docs/design/mane-progression.html
png = base64.b64encode(SPRITE.read_bytes()).decode()
HEAD = TOP

def rects(shape, palette):
    out = ''
    for y, row in enumerate(shape['rows']):
        for m in re.finditer(r"([A-Za-z])\1*", row):
            out += f'<rect x="{shape["x"] + m.start()}" y="{shape["y"] + HEAD + y}" width="{len(m.group(0))}" height="1" fill="{palette[m.group(1)]}"/>'
    return out

def lion(size, colours, draw=True):
    svg = rects(sizes[size], {'M': colours[0], 'D': colours[1]}) if draw else ''
    return f'<div class="stage"><div class="sprite"></div><svg viewBox="0 0 51 64" shape-rendering="crispEdges" preserveAspectRatio="none">{svg}</svg></div>'

notes = {
    0: 'The cub as he starts. Nothing is drawn over him.',
    1: 'His first hair on top: a narrow crest, like a mohawk, running down into the lock on his forehead.',
    2: 'A wider crest, ruffs beside the jaw, and a small ruff on the chest.',
    3: 'The full mane: points rising like a crown, only the ears showing, and a long fall of locks over the chest with a darker ruff under the chin.',
}
rows = [('Natural (free)', ('#c9601b', '#8f3f12'), True),
        ('Black (bought, from level 1)', ('#2a2233', '#120e1a'), False),
        ('White (bought, from level 1)', ('#f3f3f7', '#c9c9d6'), False),
        ('Blue (bought, from level 1)', ('#3f6fd8', '#27468f'), False)]
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RWR: mane progression</title>
<style>
  /* A design sheet, generated from lib/maneArt.ts. Regenerate it when the mane art changes. */
  body {{ margin: 0; padding: 24px 16px; font-family: system-ui, sans-serif; color: #f6e4b0; background: #0f0c29; }}
  h1 {{ font-size: 1.3rem; margin: 0 0 6px; color: #ffe08a; }}
  h2 {{ font-size: 1rem; margin: 28px 0 10px; color: #ffe08a; }}
  p.lead {{ margin: 0 0 8px; max-width: 60ch; }}
  .row {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }}
  figure {{ margin: 0; padding: 12px; background: #123f3d; border: 3px solid #f2c14e; }}
  figcaption {{ margin-top: 8px; font-size: 0.85rem; }}
  figcaption strong {{ display: block; color: #ffe08a; letter-spacing: 0.05em; }}
  .stage {{ position: relative; aspect-ratio: 51 / 64; background: #1f5b57; }}
  .sprite {{ position: absolute; left: 0; right: 0; bottom: 0; height: calc(100% * 58 / 64);
            background: url(data:image/png;base64,{png}) center / 100% 100% no-repeat; image-rendering: pixelated; }}
  svg {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
</style>
</head>
<body>
<h1>Mane progression</h1>
<p class="lead">The mane's size comes only from the Mane upgrade's level. Buying a colour changes the colour and nothing else, and colours unlock at level 1, when he has hair on top to colour.</p>
"""
for title, colours, natural in rows:
    html += f'<h2>{title}</h2>\n<div class="row">\n'
    for size in range(4):
        draw = size > 0
        note = notes[size] if natural else ('Mane colours are locked until level 1.' if size == 0 else '')
        html += f'<figure>{lion(size, colours, draw)}<figcaption><strong>LEVEL {size}</strong>{note}</figcaption></figure>\n'
    html += '</div>\n'
html += '<h2>Level 3 candidates</h2>\n<p class="lead">A fans out from the face. B falls from the crown, ends in pointed locks, and has a darker ruff under the chin. C is the top of A over the bottom of B.</p>\n<div class="row">\n'
for key, shape in full_manes.items():
    for title, colours, _ in (rows[:3] if key == FULL_MANE else rows[:1]):
        svg = rects(shape, {'M': colours[0], 'D': colours[1]})
        used = ' (in the game now)' if key == FULL_MANE else ''
        html += f'<figure><div class="stage"><div class="sprite"></div><svg viewBox="0 0 51 64" shape-rendering="crispEdges" preserveAspectRatio="none">{svg}</svg></div><figcaption><strong>{key}{used}</strong>{title.split(" (")[0]}</figcaption></figure>\n'
html += '</div>\n'
html += '</body>\n</html>\n'
(ROOT / 'docs/design/mane-progression.html').write_text(html)
print('wrote lib/maneArt.ts and docs/design/mane-progression.html')
