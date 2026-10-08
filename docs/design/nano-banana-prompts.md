# Prompts for the image model

Upload `docs/design/accessory-base.png` with each prompt (made by `scripts/accessory-base.py`). Save what comes back
into `docs/design/incoming/` as PNG, named `poses.png`, `wardrobe-a.png`, `wardrobe-b.png`.

Twelve lions is the most one sheet can hold and still be cut apart cleanly. More than that and
each lion is too small to keep his pixels. So this is three sheets, not one.

## The part that is the same every time

```
Make ONE sprite sheet from the attached image.

LAYOUT
- A grid of 4 columns and 3 rows: 12 equal cells, read left to right, top to bottom.
- The whole sheet is flat pure magenta (#FF00FF). No lines between cells, no borders, no text,
  no labels, no numbers.
- Make the picture as large as you can, in a 4:3 landscape shape.

THE LION
- He is the lion cub in the attached image. Keep his drawing, proportions, colours and
  pixel-art style exactly.
- He is the same size in every cell, centred, with a little magenta space all round him.
- Pixel art: chunky square pixels, hard edges, a dark brown outline, no anti-aliasing, no
  blur, no glow, no shadow on the background.

ONE CHANGE PER CELL
[paste one of the lists below here]

RULES FOR EVERY ITEM
- Same pixel size and same dark outline as the lion. The thinnest line is one lion pixel wide.
- It fits this seated, front-facing lion and stays close to his body.
- His eyes, nose and mouth stay uncovered unless the item is glasses.
- No logos, no brand names, no monograms, no lettering. If an item needs an emblem, use a
  tiny paw print.
- No magenta and no hot pink on any item.
```

## Sheet 1: poses (`poses.png`)

```
Cells 1 to 4 and 12 are the attached lion, unchanged except where it says.
Cells 5 to 11 are the same cub redrawn in a new pose, at the same size on the sheet.
1. No change. An exact copy.
2. Both eyes closed, each a short flat dark line.
3. Both eyes closed in a happy smile, each an upward curve.
4. Eyes open, mouth open as if speaking: a small dark opening with a hint of pink tongue.
5. Side view, walking to the right, walk cycle frame 1: front leg reaching forward.
6. Side view, walking to the right, walk cycle frame 2: legs passing under the body.
7. Side view, walking to the right, walk cycle frame 3: the other front leg reaching forward.
8. Side view, walking to the right, walk cycle frame 4: legs passing under the body.
9. Side view, standing still, facing right.
10. Body still side-on facing right, head turned to look straight at the viewer.
11. Three-quarter view: turning toward the viewer and lowering into a sit.
12. No change. An exact copy.
He has a tail with a darker tuft in every view. Keep his head the same size in every cell.
```

## Sheet 2: the wardrobe we have, redrawn (`wardrobe-a.png`)

```
Every cell is the attached lion, unchanged, wearing ONE item:
1. A bright red baseball cap, worn forwards.
2. A bright red knitted beanie with a white pom-pom.
3. A tan explorer hat with a darker band.
4. A gold crown set with red, blue and green jewels.
5. Classic black sunglasses.
6. Aviator sunglasses with thin silver frames and dark lenses.
7. Sunglasses with lenses that fade from cyan to purple to pink-red.
8. Round eyeglasses with thin black frames and clear lenses.
9. Square eyeglasses with bright red frames and clear lenses.
10. A bright red bandana tied round his neck, the point hanging on his chest.
11. A bright red knitted scarf round his neck, one end hanging down.
12. A bright red bow tie at his neck.
```

## Sheet 3: new pieces (`wardrobe-b.png`)

```
Every cell is the attached lion, unchanged, wearing ONE item:
1. A gold chain with a round gold pendant showing a lion's head.
2. Oversized black wraparound shield sunglasses.
3. A chunky silver Cuban link chain with a plain round pendant.
4. A fitted black puffer vest, zipped up, with a tiny paw-print badge on the chest. It covers
   only his shoulders and chest, comes to a point between his front legs, and wraps a little
   round each side. Both front legs and paws are in front of the vest and fully visible.
5. An open black leather aviator jacket with a cream shearling collar.
6. A small bright blue handbag worn across his body on a thin strap.
7. A pair of small gold hoop earrings, one on each ear.
8. A black baseball cap worn backwards.
9. A gold and blue patterned silk bandana tied round his head.
10. Chunky cream and grey platform sneakers on his two front paws.
11. No change. An exact copy.
12. No change. An exact copy.
```

Items that come in several colours in the game are asked for in bright red. The other colours
are made from that one.

## One piece on its own: the puffer vest

The vest on sheet 3 came out as a box over his whole front, so it is not in the game yet. A
single piece drawn large cuts out more cleanly than one cell of a sheet. Upload
`docs/design/accessory-base.png`, and the green-vest picture as a second image for the fit.
Save the result as `docs/design/incoming/puffer-vest.png`.

```
Edit the first image. Add ONE thing to the lion cub: a black puffer vest.

The fit is the point. Copy the way the green vest sits in the second image:
- It covers only his shoulders and upper chest, like a bib with a collar, with a V at the neck.
- It comes down to a point between his two front legs.
- It wraps a little way round each side of his body.
- BOTH FRONT LEGS AND PAWS ARE IN FRONT OF THE VEST AND FULLY VISIBLE. The vest does not
  cover his legs, his paws, his belly or his back legs.
- Quilted puffer panels, a zip down the middle, a tiny paw-print badge on one side.

Rules:
- Use the lion in the FIRST image. Do not use the lion in the second image.
- Change nothing else. Do not redraw, move, resize or recolour the lion or his tail.
- Keep the background flat pure magenta (#FF00FF). No shadows, no floor, no text.
- Pixel art at the same pixel size as the lion, with a dark outline. The thinnest line is one
  lion pixel wide. No anti-aliasing, no blur.
- No logos or lettering. No magenta or hot pink on the vest.
```
