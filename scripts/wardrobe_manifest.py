"""Which lion is which on each wardrobe sheet, and the colours each piece comes in.

`box` is the cell's lion on the sheet (left, top, right, bottom), with room for the piece.
`areas` are the parts of the lion the piece can be on, in the lion's own pixels (left, top,
right, bottom, measured from the top-left of his sprite, so a hat can start above zero).
Anything that differs from the game's lion outside those areas is ignored. `whole` takes the
entire drawing: a costume, not a piece. `fit` names a reshaping step (see wardrobe-from-sheet.py).

`paint` says which pixels of the piece take the colour: 'dark' (blacks and dark greys),
'light' (creams and whites), 'grey' (silver), or a (from, to) range of hue in degrees. A
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
}

GOLD, BLUE = (22, 68), (195, 262)

SHEETS = {
    '../docs/design/source/wardrobe-b.jpg': [
        {'id': 'chain', 'box': (5, 6, 295, 294), 'areas': [(20, 44, 70, 84)],
         'paint': [GOLD], 'colours': ['gold', 'silver', 'rose']},
        {'id': 'shield-shades', 'box': (305, 6, 595, 294), 'areas': [(6, 12, 84, 42)],
         'paint': ['dark'], 'colours': ['black', 'blue', 'red', 'teal']},
        {'id': 'cuban-chain', 'box': (605, 6, 895, 294), 'areas': [(20, 44, 70, 86)],
         'paint': ['grey'], 'colours': ['silver', 'gold', 'rose', 'black']},
        {'id': 'puffer-vest', 'box': (905, 6, 1195, 294), 'areas': [(8, 42, 82, 100)], 'fit': 'vest',
         'paint': ['dark'], 'colours': ['black', 'red', 'blue', 'green', 'purple', 'white']},
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
        {'id': 'shishi', 'box': (905, 607, 1195, 892), 'areas': [(0, -3, 89, 101)], 'whole': True},
    ],
}
