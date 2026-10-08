"""Shared steps for cleaning pixel art that came out of an image model or a JPEG.

Used by todah-from-sheet.py (the seated lion) and clean-walk.py (the walking one).
"""

STEPS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def outline(lion):
    """Leaves nothing outside the dark outline, and no gap in it.

    JPEG smears a pale-to-tan fringe just outside the line, and here and there the line itself
    came through brown instead of dark. Working from the edge inwards:
    - a patch of fringe that the dark line already separates from the lion is removed whole,
    - where a lighter pixel is all that stands between the lion's inside and the background,
      it is part of the line that lost its colour, so it is made dark,
    - a loose strand that hangs off such a pixel is removed.
    It repeats until only dark pixels face the background.
    """
    w, h = lion.size
    px = lion.load()
    ink = min((px[x, y] for y in range(h) for x in range(w) if px[x, y][3]), key=lambda c: sum(c[:3]))
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][3] > 0
    dark = lambda x, y: sum(px[x, y][:3]) < 200
    removed = sealed = 0
    while True:
        # How far each pixel is from the background, counted in steps.
        depth = {}
        ring = [(x, y) for y in range(h) for x in range(w) if solid(x, y) and any(not solid(x + dx, y + dy) for dx, dy in STEPS)]
        level = 1
        while ring:
            for spot in ring:
                depth[spot] = level
            ring = list({(x + dx, y + dy) for x, y in ring for dx, dy in STEPS if solid(x + dx, y + dy) and (x + dx, y + dy) not in depth})
            level += 1
        facing = [(x, y) for (x, y), d in depth.items() if d == 1 and not dark(x, y)]
        if not facing:
            break
        # Patches of lighter pixels joined edge to edge.
        patch_of, patches = {}, []
        for start in ((x, y) for y in range(h) for x in range(w) if solid(x, y) and not dark(x, y)):
            if start in patch_of:
                continue
            patch, queue = [], [start]
            patch_of[start] = len(patches)
            while queue:
                x, y = queue.pop()
                patch.append((x, y))
                for dx, dy in STEPS:
                    nxt = (x + dx, y + dy)
                    if solid(*nxt) and not dark(*nxt) and nxt not in patch_of:
                        patch_of[nxt] = len(patches)
                        queue.append(nxt)
            patches.append(patch)
        # A patch that reaches well inside is part of the lion. One that does not is fringe.
        inside = [any(depth[spot] >= 4 for spot in patch) for patch in patches]
        for x, y in facing:
            if not inside[patch_of[(x, y)]]:
                px[x, y] = (0, 0, 0, 0)
                removed += 1
            elif any(solid(x + dx, y + dy) and not dark(x + dx, y + dy) and depth[(x + dx, y + dy)] > 1 for dx, dy in STEPS):
                px[x, y] = ink
                sealed += 1
            else:
                px[x, y] = (0, 0, 0, 0)
                removed += 1
    print(f'outline: {removed} pixels shaved off outside it, {sealed} gaps in it closed')


def scale2x(img):
    """Doubles pixel art while rounding its staircase corners (the Scale2x method).

    Where two neighbours across a corner are the same colour, the corner takes that colour
    instead of staying square. Chunky art comes out with finer steps and the same shapes.
    """
    w, h = img.size
    src = img.load()
    out = img.resize((w * 2, h * 2))
    dst = out.load()
    at = lambda x, y: src[min(w - 1, max(0, x)), min(h - 1, max(0, y))]
    for y in range(h):
        for x in range(w):
            centre, up, right, left, down = at(x, y), at(x, y - 1), at(x + 1, y), at(x - 1, y), at(x, y + 1)
            dst[x * 2, y * 2] = up if left == up and left != down and up != right else centre
            dst[x * 2 + 1, y * 2] = right if up == right and up != left and right != down else centre
            dst[x * 2, y * 2 + 1] = left if down == left and down != right and left != up else centre
            dst[x * 2 + 1, y * 2 + 1] = down if right == down and right != up and down != left else centre
    return out
