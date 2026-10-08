#!/usr/bin/env python3
"""Makes the reference picture an image model needs to draw new wardrobe art that fits.

The game's accessories sit on the seated lion sprite. For art made elsewhere to line up, it has
to be drawn over that exact sprite at a known size. This script writes
docs/design/accessory-base.png: the sprite enlarged with hard pixel edges, centred on a plain
magenta square, with room above the head for hats. Give that picture to the image model and
ask it to add one accessory and change nothing else. Because the lion and the background are
known, the accessory can then be cut out by comparing the result with this picture.

Standard library only. Run from the project root:  python3 scripts/accessory-base.py
"""
import struct
import zlib

SPRITE = 'public/sprites/todah-sit.png'
OUT = 'docs/design/accessory-base.png'
HEADROOM = 18        # sprite pixels above the head (6 cells of 3 pixels), as in the game
SCALE = 5            # each sprite pixel becomes a 5 by 5 block
SIZE = 1024          # image models work best with a square picture about this big
BACKGROUND = (255, 0, 255, 255)   # pure magenta: not used by the lion or by any accessory


def read_png(path):
    data = open(path, 'rb').read()
    pos, header, packed = 8, None, b''
    while pos < len(data):
        length, = struct.unpack('>I', data[pos:pos + 4])
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b'IHDR':
            header = struct.unpack('>IIBBBBB', body)
        if kind == b'IDAT':
            packed += body
    width, height, depth, colour = header[:4]
    assert depth == 8 and colour == 6, 'expected an 8-bit RGBA sprite'
    raw, stride, rows, prev, at = zlib.decompress(packed), width * 4, [], bytearray(width * 4), 0
    for _ in range(height):
        kind, line = raw[at], bytearray(raw[at + 1:at + 1 + stride])
        at += 1 + stride
        for x in range(stride):
            a = line[x - 4] if x >= 4 else 0
            b = prev[x]
            c = prev[x - 4] if x >= 4 else 0
            if kind == 1:
                line[x] = (line[x] + a) & 255
            elif kind == 2:
                line[x] = (line[x] + b) & 255
            elif kind == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line)
        prev = line
    return width, height, rows


def write_png(path, width, height, rows):
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes(row) for row in rows)
    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


width, height, sprite = read_png(SPRITE)
box_w, box_h = width * SCALE, (height + HEADROOM) * SCALE
left, top = (SIZE - box_w) // 2, (SIZE - box_h) // 2
canvas = [bytearray(BACKGROUND * SIZE) for _ in range(SIZE)]
for y in range(height):
    for x in range(width):
        pixel = sprite[y][x * 4:x * 4 + 4]
        if pixel[3] < 128:
            continue
        for dy in range(SCALE):
            row = canvas[top + (y + HEADROOM) * SCALE + dy]
            for dx in range(SCALE):
                at = (left + x * SCALE + dx) * 4
                row[at:at + 4] = bytes((pixel[0], pixel[1], pixel[2], 255))
write_png(OUT, SIZE, SIZE, canvas)
print(f'{OUT}: {SIZE}x{SIZE}, lion {box_w}x{height * SCALE} at ({left}, {top + HEADROOM * SCALE}), {SCALE} px per sprite pixel')
