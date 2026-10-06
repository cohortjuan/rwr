#!/usr/bin/env python3
"""Removes stray light pixels left outside the seated lion's dark outline.

Run from the project root, with nothing to install:

    python3 scripts/clean-sprite-edges.py          # report what would change
    python3 scripts/clean-sprite-edges.py --write  # change the sprite files

The seated sprites were cut out of a larger picture, and a few light pixels of the old
background stayed stuck to the outside of the outline, mostly around the ears. A pixel counts
as a stray when it is not part of the outline and sits in a thin strip between the
transparent outside and the outline: transparent within 2 pixels one way, outline within 3
pixels the other way. Fur is never in that position, because the outline is between it and
the outside. The check repeats until nothing more is found. Specks floating free of the lion
are removed as well.
"""
import struct, sys, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ['todah-sit.png', 'todah-sit-blink.png', 'todah-sit-talk.png', 'todah-sit-happy.png']
LIGHT = 120          # brightness below this is outline
SPECK = 40           # an island smaller than this is a speck, not part of the lion
MOST = 400           # more than this cannot be strays: stop and change nothing


def load(path):
    data = path.read_bytes()
    pos, idat, w, h = 8, b'', 0, 0
    while pos < len(data):
        n, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        pos += 12 + n
        if kind == b'IHDR':
            w, h, depth, colour, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert (depth, colour, interlace) == (8, 6, 0), 'expected an 8-bit RGBA PNG'
        elif kind == b'IDAT':
            idat += body
    raw, stride, rows, prev, p = zlib.decompress(idat), w * 4, [], bytearray(w * 4), 0
    for _ in range(h):
        kind, line = raw[p], bytearray(raw[p + 1:p + 1 + stride])
        p += 1 + stride
        for i in range(stride):
            a = line[i - 4] if i >= 4 else 0
            b = prev[i]
            c = prev[i - 4] if i >= 4 else 0
            if kind == 1: line[i] = (line[i] + a) & 255
            elif kind == 2: line[i] = (line[i] + b) & 255
            elif kind == 3: line[i] = (line[i] + ((a + b) >> 1)) & 255
            elif kind == 4:
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line)
        prev = line
    return w, h, rows


def save(path, w, h, rows):
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))
    raw = b''.join(b'\x00' + bytes(row) for row in rows)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
                     + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def stray(w, h, rows, gone):
    def clear(x, y): return not (0 <= x < w and 0 <= y < h) or rows[y][x * 4 + 3] < 16 or (x, y) in gone
    def dark(x, y):
        if clear(x, y): return False
        r, g, b, _ = rows[y][x * 4:x * 4 + 4]
        return (r * 3 + g * 6 + b) // 10 < LIGHT

    def is_stray(x, y):
        if clear(x, y) or dark(x, y): return False
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            outside = False
            for k in (1, 2):
                if clear(x + dx * k, y + dy * k): outside = True
                if outside or dark(x + dx * k, y + dy * k): break
            if not outside: continue
            for k in (1, 2, 3):
                if dark(x - dx * k, y - dy * k): return True
                if clear(x - dx * k, y - dy * k): break
        return False

    return {(x, y) for y in range(h) for x in range(w) if is_stray(x, y)}


def specks(w, h, rows, gone):
    # Small islands of pixels that are not attached to the lion at all.
    def solid(x, y): return 0 <= x < w and 0 <= y < h and rows[y][x * 4 + 3] >= 16 and (x, y) not in gone
    seen, found = set(), set()
    for y in range(h):
        for x in range(w):
            if not solid(x, y) or (x, y) in seen: continue
            island, todo = {(x, y)}, [(x, y)]
            while todo:
                cx, cy = todo.pop()
                for nx in (cx - 1, cx, cx + 1):
                    for ny in (cy - 1, cy, cy + 1):
                        if solid(nx, ny) and (nx, ny) not in island:
                            island.add((nx, ny)); todo.append((nx, ny))
            seen |= island
            if len(island) < SPECK: found |= island
    return found


write = '--write' in sys.argv
for name in SPRITES:
    path = ROOT / 'public/sprites' / name
    w, h, rows = load(path)
    found = set()
    while True:
        more = stray(w, h, rows, found)
        if not more: break
        found |= more
    found |= specks(w, h, rows, found)
    if len(found) > MOST:
        print(f'{name}: {len(found)} pixels found, which is too many to be strays. Nothing changed.')
        continue
    print(f'{name}: {len(found)} stray pixels' + (' removed' if write else ' found'))
    if '--show' in sys.argv:
        for y in range(h):
            if any(py == y for _, py in found):
                print(f'  row {y:3d}: x = ' + ', '.join(str(x) for x, py in sorted(found) if py == y))
    if write:
        for x, y in found:
            rows[y][x * 4:x * 4 + 4] = b'\x00\x00\x00\x00'
        save(path, w, h, rows)
