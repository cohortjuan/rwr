#!/usr/bin/env python3
"""Makes the reference picture an image model needs to draw wardrobe art that fits.

The game's accessories sit on the seated lion sprite. For art made elsewhere to line up, it has
to be drawn over that exact sprite at a known size. This script writes
docs/design/accessory-base.png: the sprite at eight times its size with hard pixel edges,
centred on a plain magenta square, with room above the head for hats. Give that picture to the
image model (the prompts are in docs/design/nano-banana-prompts.md). Because the lion and the
background are known, each accessory can then be cut out by comparing the result with this
picture.

Needs Pillow. Run from the project root:  python3 scripts/accessory-base.py
"""
from PIL import Image

SPRITE = 'public/sprites/todah-sit.png'
OUT = 'docs/design/accessory-base.png'
SCALE = 8            # each sprite pixel becomes an 8 by 8 block
HEADROOM = 10        # sprite pixels above the head, the same share as the game leaves for hats
SIZE = 1024          # image models work best with a square picture about this big
BACKGROUND = (255, 0, 255, 255)   # pure magenta: not used by the lion or by any accessory

sprite = Image.open(SPRITE).convert('RGBA')
# His tail is kept as a separate strip so the game can wag it. The first frame is the tail at rest.
tail = Image.open(SPRITE.replace('todah-sit.png', 'todah-tail.png')).convert('RGBA').crop((0, 0, sprite.width, sprite.height))
sprite.alpha_composite(tail)
big = sprite.resize((sprite.width * SCALE, sprite.height * SCALE), Image.NEAREST)
box = (big.width, big.height + HEADROOM * SCALE)
left, top = (SIZE - box[0]) // 2, (SIZE - box[1]) // 2
canvas = Image.new('RGBA', (SIZE, SIZE), BACKGROUND)
canvas.alpha_composite(big, (left, top + HEADROOM * SCALE))
canvas.convert('RGB').save(OUT)
print(f'{OUT}: {SIZE}x{SIZE}, lion {big.width}x{big.height} at ({left}, {top + HEADROOM * SCALE}), {SCALE} px per sprite pixel')
