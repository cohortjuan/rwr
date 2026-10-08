"""Draws the lioness's essentials: perfume, passport, wallet and phone.

Each is a small object standing on the ground beside her paw, on the other side from where her
bag hangs, so both can be worn together. They are drawn here by hand, pixel by pixel, in the
wardrobe's shared colour ramps, and each carries a plain paw mark and no brand.

Run from this folder:  python3 essentials-art.py
Writes public/wardrobe/<id>--<colour>.png, one picture per colour, on the same 89 x 111 grid as
every other wardrobe picture.
"""
import os

from PIL import Image

from wardrobe_manifest import RAMPS

OUT = '../public/wardrobe'
WIDTH, HEIGHT = 89, 111

hexrgb = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))

# Colours that stay the same whatever colour the piece is.
FIXED = {
    'g': '#f2c14e',  # gold
    'G': '#ffe08a',  # gold, lit
    'd': '#8a5a10',  # gold, in shadow
    'c': '#fff3c4',  # cream
    's': '#e3e8f5',  # glass, lit
    'S': '#a9b4cc',  # glass
    'k': '#1c1824',  # camera
    'w': '#c9d1e6',  # lens
}

# Each piece: where its left edge stands, its colours, and its rows. In the rows `.` is empty,
# `0` to `4` are the steps of the piece's colour from dark to light, and letters are FIXED.
PIECES = {
    'perfume': {
        'left': 2,
        'colours': ['gold', 'pink', 'purple', 'teal'],
        'rows': [
            '....ddddd....',
            '....dGggd....',
            '....dGggd....',
            '....ddddd....',
            '.....0S0.....',
            '.00000000000.',
            '0sssssssssSS0',
            '0s433333332S0',
            '0s433333332S0',
            '0s4ccccccc2S0',
            '0s4cc1c1cc2S0',
            '0s4c1ccc1c2S0',
            '0s4cc111cc2S0',
            '0s4cc111cc2S0',
            '0s4ccccccc2S0',
            '0s433333332S0',
            '0s422222222S0',
            '0SSSSSSSSSSS0',
            '.00000000000.',
        ],
    },
    'passport': {
        'left': 2,
        'colours': ['blue', 'red', 'green', 'black', 'brown'],
        'rows': [
            '.0000000000.',
            '012222222230',
            '012gggggg230',
            '012222222230',
            '012222222230',
            '0122g2g22230',
            '012g222g2230',
            '0122ggg22230',
            '0122ggg22230',
            '012222222230',
            '012222222230',
            '0122gggg2230',
            '012222222230',
            '011111111120',
            '.0000000000.',
        ],
    },
    'wallet': {
        'left': 1,
        'colours': ['brown', 'black', 'red', 'green', 'pink'],
        'rows': [
            '.000000000000.',
            '03333333333330',
            '02222222222220',
            '022c2c22201110',
            '02c222c2201GG0',
            '022ccc22201Gg0',
            '022ccc22201110',
            '02222222200000',
            '02222222222220',
            '01111111111110',
            '.000000000000.',
        ],
    },
    'phone': {
        'left': 4,
        'colours': ['purple', 'black', 'pink', 'teal', 'white'],
        'rows': [
            '.0000000.',
            '033333330',
            '0kkk22220',
            '0kwk22220',
            '0kkk22220',
            '022222220',
            '022222220',
            '022424220',
            '024222420',
            '022444220',
            '022444220',
            '022222220',
            '022222220',
            '022222220',
            '022222220',
            '011111110',
            '.0000000.',
        ],
    },
}


def draw(piece, colour):
    ramp = [hexrgb(h) for h in RAMPS[colour]]
    rows = piece['rows']
    assert len({len(row) for row in rows}) == 1, 'every row of a piece is the same width'
    picture = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    px = picture.load()
    # The piece stands on the ground: its last row is the picture's last row.
    top = HEIGHT - len(rows)
    for y, row in enumerate(rows):
        for x, letter in enumerate(row):
            if letter == '.':
                continue
            px[piece['left'] + x, top + y] = (ramp[int(letter)] if letter.isdigit() else hexrgb(FIXED[letter])) + (255,)
    return picture


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, piece in PIECES.items():
        for colour in piece['colours']:
            draw(piece, colour).save(f'{OUT}/{name}--{colour}.png')
        print(f"{name}: {len(piece['rows'][0])} x {len(piece['rows'])}, {len(piece['colours'])} colours")
