"""Which lion is which on each wardrobe sheet, and the colours each piece comes in.

`box` is the cell's lion on the sheet (left, top, right, bottom), with room for the piece.
`areas` are the parts of the lion the piece can be on, in the lion's own pixels (left, top,
right, bottom, measured from the top-left of his sprite, so a hat can start above zero).
Anything that differs from the game's lion outside those areas is ignored. `whole` takes the
entire drawing: a costume, not a piece. `fit` names a reshaping step (see wardrobe-from-sheet.py).

`anchor` says which end of the lion is whole in his cell: 'bottom' (the default: his feet are
on the box's bottom edge) or 'top' (his feet are cut off, so the top of his head is used).
`pitch` is roughly how many sheet pixels one of his pixels is, across and down. `keep` drops everything but
the frame of a pair of glasses, so his own eyes show through the lenses and still blink.
`match` gives the rows of the lion to line up on (his head, for a hat) when the rest of him
was drawn out of proportion. `pinks` says the piece really is purple or pink, so that colour is not treated as smear.

`paint` says which pixels of the piece take the colour: 'dark' (blacks and dark greys),
'light' (creams and whites), 'grey' (silver), 'silver' (only the light greys), 'fade' (a
lens that fades through three colours), or a (from, to) range of hue in degrees, which can
also say how strong and how bright a pixel must be to count: (from, to, strength, brightness).
`drawn` names the colour the piece was drawn in, which is then kept exactly as drawn. A
piece with two painted parts lists two. `colours` are the colours it is sold in, the first
being the one it was drawn in. Each is a name from RAMPS, or a pair of names for a
two-part piece.
"""

# One wardrobe, one set of colours. Every piece is repainted from these ramps and nothing
# else, which is what lets any two pieces be worn together: a red cap and red sneakers are
# the same red, and the neutrals (black, white, the metals) sit with all of it.
# Each ramp runs dark to light: outline, shade, main, light, highlight.
RAMPS = {
    'black': ['#0e0b14', '#1c1824', '#2a2433', '#3b3447', '#544c63'],
    'white': ['#8f8a99', '#c9c9d6', '#e6e6ee', '#f3f3f7', '#ffffff'],
    'red': ['#5e0f1c', '#8f1d2c', '#c83e52', '#e0647a', '#f29aa8'],
    'blue': ['#16295c', '#27468f', '#3f6fd8', '#6b93e8', '#a3bff5'],
    'green': ['#12401f', '#256b3a', '#3f9d5a', '#69bd80', '#a6dcb4'],
    'purple': ['#2a1260', '#4b2496', '#7b3fe4', '#9d70ee', '#c6aaf6'],
    'teal': ['#0b3d38', '#17665d', '#2a9d8f', '#57bdb0', '#9adcd3'],
    'pink': ['#7a2f57', '#c2578a', '#ff8fc0', '#ffb3d4', '#ffd6e8'],
    'gold': ['#6b4310', '#c98a1b', '#f2c14e', '#ffe08a', '#fff3c4'],
    'silver': ['#4e556b', '#8f97ad', '#c9d1e6', '#e3e8f5', '#ffffff'],
    'rose': ['#7a3a2c', '#c26f5a', '#f2a08a', '#ffd0c2', '#ffe9e2'],
    'brown': ['#2e1a09', '#4d2d10', '#7a4a1e', '#a06a36', '#c9a26b'],
    'olive': ['#2c3418', '#4f5d2f', '#8a9a5b', '#aab77e', '#cfd8ab'],
    'tan': ['#5c3f1e', '#7a4a1e', '#c9a26b', '#dcc090', '#f0e0bc'],
    'grey': ['#3a3a48', '#5d5d6e', '#a7a7b5', '#c8c8d4', '#e8e8f0'],
    # A stronger yellow than the lion's own gold, so a yellow shishi mane stands off his coat.
    'yellow': ['#6e4400', '#b87a00', '#f0b400', '#ffd633', '#fff0a0'],
}

# Lenses that fade through three colours, top to bottom of the fade.
FADES = {
    'sunset': None,                              # as drawn: cyan, purple, pink
    'fire': ['#ffe08a', '#f08a2a', '#c83e52'],
    'ocean': ['#7fe0d0', '#3f6fd8', '#27468f'],
}

GOLD, BLUE = (22, 68), (195, 262)
RED = (335, 22)          # a range that wraps round the top of the colour wheel
KHAKI = (15, 70)

# Shelved: the puffer vest from wardrobe-b.jpg (the cell at box (905, 6, 1195, 294)). The
# sheet drew it as a box over his whole front, and reshaping it by rule did not look right.
# It needs drawing again to fit: see the vest prompt in docs/design/nano-banana-prompts.md.
SHEETS = {
    # The cap, explorer hat, crown and plain shades on this sheet did not cut out cleanly (gold
    # and tan on a gold lion are hard to tell from him), so the game keeps its drawn ones.
    '../docs/design/source/wardrobe-a.jpg': [
        {'id': 'beanie', 'box': (305, 2, 595, 298), 'pitch': (2.68, 2.5), 'match': (12, 52), 'areas': [(8, -10, 82, 20)],
         'paint': [RED], 'colours': ['blue', 'red', 'green', 'purple', 'black']},
        {'id': 'aviators', 'box': (305, 330, 595, 598), 'anchor': 'top', 'pitch': (2.88, 2.66), 'areas': [(8, 14, 82, 42)],
         'paint': ['silver'], 'colours': ['silver', 'white', 'pink', 'teal']},
        {'id': 'sunset', 'box': (605, 330, 895, 598), 'anchor': 'top', 'pitch': (2.88, 2.66), 'areas': [(12, 16, 78, 40)], 'pinks': True,
         'paint': ['fade'], 'colours': ['sunset', 'fire', 'ocean']},
        {'id': 'glasses-round', 'box': (905, 330, 1195, 598), 'anchor': 'top', 'pitch': (2.88, 2.66), 'areas': [(8, 14, 84, 42)], 'keep': 'dark',
         'paint': ['dark'], 'colours': ['black', 'brown', 'blue', 'white']},
        {'id': 'glasses-square', 'box': (5, 636, 295, 895), 'anchor': 'top', 'pitch': (2.86, 2.64), 'areas': [(6, 14, 84, 42)], 'keep': RED,
         'paint': [RED], 'colours': ['red', 'blue', 'green', 'black']},
        {'id': 'bandana', 'box': (305, 636, 595, 895), 'anchor': 'top', 'pitch': (2.86, 2.64), 'areas': [(18, 50, 78, 82)],
         'paint': [RED], 'colours': ['teal', 'red', 'purple', 'blue']},
        {'id': 'scarf', 'box': (605, 636, 895, 895), 'anchor': 'top', 'pitch': (2.86, 2.64), 'areas': [(16, 50, 74, 70), (48, 66, 74, 96)],
         'paint': [RED], 'colours': ['red', 'blue', 'green', 'purple', 'black']},
        {'id': 'bow-tie', 'box': (905, 636, 1195, 895), 'anchor': 'top', 'pitch': (2.86, 2.64), 'areas': [(26, 51, 64, 68)],
         'paint': [RED], 'colours': ['purple', 'red', 'black', 'blue']},
    ],
    '../docs/design/source/wardrobe-b.jpg': [
        {'id': 'chain', 'box': (5, 6, 295, 294), 'areas': [(20, 44, 70, 84)],
         'paint': [GOLD], 'colours': ['gold', 'silver', 'rose']},
        {'id': 'shield-shades', 'box': (305, 6, 595, 294), 'areas': [(6, 12, 84, 42)],
         'paint': ['dark'], 'colours': ['black', 'blue', 'red', 'teal']},
        {'id': 'cuban-chain', 'box': (605, 6, 895, 294), 'areas': [(20, 44, 70, 86)],
         'paint': ['grey'], 'colours': ['silver', 'gold', 'rose', 'black']},
        {'id': 'aviator-jacket', 'box': (5, 306, 295, 596), 'areas': [(2, 40, 88, 100)],
         'paint': ['dark'], 'colours': ['black', 'brown', 'red', 'blue', 'olive']},
        {'id': 'micro-bag', 'box': (305, 306, 595, 596), 'areas': [(14, 42, 82, 98)],
         'paint': [BLUE], 'colours': ['blue', 'red', 'green', 'purple', 'pink', 'black']},
        {'id': 'hoop-earrings', 'box': (605, 306, 895, 596), 'areas': [(0, 10, 16, 42), (72, 10, 89, 42)],
         'paint': [GOLD], 'colours': ['gold', 'silver', 'rose']},
        {'id': 'lion-cap', 'box': (905, 301, 1195, 596), 'areas': [(4, -9, 86, 24)],
         'paint': ['dark'], 'colours': ['black', 'red', 'blue', 'green', 'white']},
        {'id': 'head-bandana', 'box': (5, 606, 295, 892), 'areas': [(0, -4, 89, 38)],
         'paint': [GOLD, BLUE], 'colours': [('gold', 'blue'), ('white', 'red'), ('gold', 'green'), ('pink', 'purple'), ('white', 'black')]},
        {'id': 'sneakers', 'box': (305, 608, 595, 892), 'areas': [(12, 82, 78, 101)],
         'paint': ['light'], 'colours': ['white', 'black', 'red', 'blue', 'green']},
        {'id': 'indigo-jacket', 'box': (605, 608, 895, 892), 'areas': [(4, 42, 86, 100)],
         'paint': [BLUE], 'colours': ['blue', 'black', 'red', 'green', 'brown']},
        # The colours of the lion dance: red, gold and black are the three lions of the southern
        # Chinese dance (Guan Gong, Liu Bei, Zhang Fei), and green is the cloth of the Japanese one.
        {'id': 'shishi', 'box': (905, 607, 1195, 892), 'areas': [(0, -3, 89, 101)], 'whole': True,
         'paint': [(335, 22, 0.45, 0.42)], 'drawn': 'red', 'colours': ['red', 'yellow', 'black', 'green']},
    ],
}
