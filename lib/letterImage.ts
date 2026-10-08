import {
  drawOrder,
  GRID,
  HEADROOM,
  NATURAL_MANE,
  parseToken,
  pieceImage,
  type Accessory,
  type AccessoryArt,
  type Variant,
} from '@/lib/accessories'
import { applyFilter } from '@/lib/colour'
import { maneArt } from '@/lib/maneArt'

// Draws Todah's note as a picture: a sheet of writing paper on a wooden desk, in handwriting,
// signed with an inked paw print, with a snapshot of the player's own lion taped beside it.
//
// It is the one place the game steps out of its 16-bit look, on purpose, so the last thing a
// player gets feels like a real object. Everything is drawn here in the browser: the wood
// grain, the paper fibres and the ink are made from seeded random strokes, and the lion is the
// player's own pixel lion, smoothed and enlarged (see enlarge). Nothing is uploaded.

export type LetterPicture = {
  dear: string
  paragraphs: string[]
  signoff: string
  lionName: string
  // Written under the snapshot, like a date on the back of a photo.
  caption: string
  credit: string
  // What the lion is wearing and how grown its mane is, as LionAvatar takes them.
  wearing: string[]
  mane: number
  // The CSS font family the note is handwritten in.
  font: string
  // Any text that stays the same for this note, so its grain and ink look the same each time.
  seed: string
}

const WIDTH = 1200
const MARGIN = 70
const PAD = 96
const TEXT = 46
const LINE = 68
const INK = '#22304d'
const STAMP = '#7d1f24'
// The lion is put together at this many screen pixels per grid cell before he is enlarged.
// The sprite is 89 pixels across 51 cells, so 7 per cell draws it at four times its own size.
const CELL = 7

type Context = CanvasRenderingContext2D

// The same seed always gives the same run of numbers, so a note's texture never changes.
function seeded(seed: string): () => number {
  let state = 2166136261
  for (const letter of seed) state = Math.imul(state ^ letter.charCodeAt(0), 16777619)
  return () => {
    state += 0x6d2b79f5
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function sheet(width: number, height: number): { canvas: HTMLCanvasElement, context: Context } {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('canvas')
  return { canvas, context }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image'))
    image.src = src
  })
}

function wrap(context: Context, text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (line && context.measureText(next).width > width) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

// ---------------------------------------------------------------------------------------
// The lion

// One rectangle per run of the same letter in each row, snapped to whole pixels.
function drawArt(context: Context, art: AccessoryArt) {
  const size = (art.cell ?? 1) * CELL
  art.rows.forEach((row, rowIndex) => {
    for (const run of row.matchAll(/([A-Za-z])\1*/g)) {
      const colour = art.palette[run[1]]
      if (!colour) continue
      context.fillStyle = colour
      const left = Math.round(art.x * CELL + (run.index ?? 0) * size)
      const top = Math.round((art.y + HEADROOM) * CELL + rowIndex * size)
      context.fillRect(left, top, Math.max(1, Math.round(run[0].length * size)), Math.max(1, Math.round(size)))
    }
  })
}

// The lion exactly as the game shows it, at its own pixel size: sprite, coat colour, mane and
// accessories.
function composeLion(
  sprite: HTMLImageElement,
  tail: HTMLImageElement,
  pieces: Map<string, HTMLImageElement>,
  picture: LetterPicture,
): HTMLCanvasElement {
  const { canvas, context } = sheet(sprite.width * 4 + 1, Math.round(((GRID.height + HEADROOM) * sprite.width * 4) / GRID.width))
  const chosen = picture.wearing
    .map(parseToken)
    .filter((entry): entry is { item: Accessory, variant?: Variant } => entry !== undefined)
  // A transformation is worn alone: while it is on, only it and the coat are drawn.
  const alone = chosen.some((entry) => entry.item.alone)
  const worn = alone ? chosen.filter((entry) => entry.item.alone || entry.item.category === 'fur') : chosen
  const fur = worn.find((entry) => entry.item.category === 'fur')?.item
  const maneColour = worn.find((entry) => entry.item.category === 'mane')?.item.mane

  context.imageSmoothingEnabled = false
  // His tail is a strip of frames. The first is the tail at rest.
  context.drawImage(tail, 0, 0, sprite.width, sprite.height, 0, canvas.height - sprite.height * 4, sprite.width * 4, sprite.height * 4)
  context.drawImage(sprite, 0, canvas.height - sprite.height * 4, sprite.width * 4, sprite.height * 4)

  // Coat colours are CSS filters on screen. Here the same sums are done pixel by pixel, so the
  // coat comes out right in every browser.
  if (fur?.filter) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    const seen = new Map<number, [number, number, number]>()
    for (let at = 0; at < pixels.data.length; at += 4) {
      if (pixels.data[at + 3] === 0) continue
      const key = (pixels.data[at] << 16) | (pixels.data[at + 1] << 8) | pixels.data[at + 2]
      let tinted = seen.get(key)
      if (!tinted) {
        const hex = applyFilter(`#${key.toString(16).padStart(6, '0')}`, fur.filter)
        const value = parseInt(hex.slice(1), 16)
        tinted = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
        seen.set(key, tinted)
      }
      pixels.data[at] = tinted[0]
      pixels.data[at + 1] = tinted[1]
      pixels.data[at + 2] = tinted[2]
    }
    context.putImageData(pixels, 0, 0)
  }

  if (picture.mane > 0 && !worn.some((entry) => entry.item.hidesMane)) {
    const shape = maneArt[Math.min(picture.mane, maneArt.length - 1)]
    const [base, shade] = maneColour ?? NATURAL_MANE
    drawArt(context, { ...shape, palette: { M: base, D: shade } })
  }
  const drawn = worn.filter((entry) => entry.item.art || entry.item.image)
  drawn.sort((a, b) => drawOrder.indexOf(a.item.category) - drawOrder.indexOf(b.item.category))
  for (const { item, variant } of drawn) {
    // A picture piece covers the whole stage, headroom included.
    const piece = item.image ? pieces.get(pieceImage(item, variant)) : undefined
    if (piece) context.drawImage(piece, 0, 0, canvas.width, canvas.height)
    for (const art of item.art ?? []) drawArt(context, { ...art, palette: { ...art.palette, ...variant?.palette } })
  }
  return canvas
}

// Doubles a picture while rounding off its staircase edges (the "Scale2x" method, with a
// little tolerance so near-identical shades count as the same). Where two neighbours across a
// corner match, the corner is filled with their colour instead of left as a square.
function enlarge(source: HTMLCanvasElement): HTMLCanvasElement {
  const width = source.width
  const height = source.height
  const context = source.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('canvas')
  const from = context.getImageData(0, 0, width, height).data
  const out = sheet(width * 2, height * 2)
  const result = out.context.createImageData(width * 2, height * 2)
  const to = result.data

  const at = (x: number, y: number) => (Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))) * 4
  const same = (a: number, b: number) => {
    const clearA = from[a + 3] < 128
    const clearB = from[b + 3] < 128
    if (clearA || clearB) return clearA && clearB
    return Math.abs(from[a] - from[b]) + Math.abs(from[a + 1] - from[b + 1]) + Math.abs(from[a + 2] - from[b + 2]) < 42
  }
  const put = (x: number, y: number, pixel: number) => {
    const target = (y * width * 2 + x) * 4
    to[target] = from[pixel]
    to[target + 1] = from[pixel + 1]
    to[target + 2] = from[pixel + 2]
    to[target + 3] = from[pixel + 3]
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const centre = at(x, y)
      const up = at(x, y - 1)
      const right = at(x + 1, y)
      const left = at(x - 1, y)
      const down = at(x, y + 1)
      put(x * 2, y * 2, same(left, up) && !same(left, down) && !same(up, right) ? up : centre)
      put(x * 2 + 1, y * 2, same(up, right) && !same(up, left) && !same(right, down) ? right : centre)
      put(x * 2, y * 2 + 1, same(down, left) && !same(down, right) && !same(left, up) ? left : centre)
      put(x * 2 + 1, y * 2 + 1, same(right, down) && !same(right, up) && !same(down, left) ? down : centre)
    }
  }
  out.context.putImageData(result, 0, 0)
  return out.canvas
}

// The lion for the snapshot. He is built at four times size and doubled with his edges rounded, then a
// soft-focus copy is laid under the sharp one so the pixel steps melt into each other the way
// they would in a printed photo, and last he is given light from the top left and shade at the
// bottom right so he has some body to him.
function portraitLion(
  sprite: HTMLImageElement,
  tail: HTMLImageElement,
  pieces: Map<string, HTMLImageElement>,
  picture: LetterPicture,
): HTMLCanvasElement {
  const sharp = enlarge(composeLion(sprite, tail, pieces, picture))
  // Shrinking a picture and stretching it back is a blur every browser can do.
  const small = sheet(Math.round(sharp.width / 7), Math.round(sharp.height / 7))
  small.context.imageSmoothingEnabled = true
  small.context.imageSmoothingQuality = 'high'
  small.context.drawImage(sharp, 0, 0, small.canvas.width, small.canvas.height)

  const { canvas: lion, context } = sheet(sharp.width, sharp.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(small.canvas, 0, 0, lion.width, lion.height)
  context.globalAlpha = 0.5
  context.drawImage(sharp, 0, 0)
  context.globalAlpha = 1

  context.globalCompositeOperation = 'source-atop'
  const light = context.createLinearGradient(0, 0, lion.width, lion.height)
  light.addColorStop(0, 'rgba(255, 244, 214, 0.24)')
  light.addColorStop(0.45, 'rgba(255, 244, 214, 0)')
  light.addColorStop(1, 'rgba(40, 18, 30, 0.28)')
  context.fillStyle = light
  context.fillRect(0, 0, lion.width, lion.height)
  context.globalCompositeOperation = 'source-over'
  return lion
}

// ---------------------------------------------------------------------------------------
// The desk, the paper, the ink

function drawDesk(context: Context, width: number, height: number, random: () => number) {
  const base = context.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, '#9b6b40')
  base.addColorStop(0.5, '#845330')
  base.addColorStop(1, '#6c4225')
  context.fillStyle = base
  context.fillRect(0, 0, width, height)

  // Grain: many thin, slightly wavy strokes, some lighter than the wood and some darker.
  for (let stroke = 0; stroke < 1700; stroke += 1) {
    const y = random() * height
    context.strokeStyle =
      random() < 0.45 ? `rgba(255, 222, 170, ${0.02 + random() * 0.05})` : `rgba(38, 18, 6, ${0.03 + random() * 0.08})`
    context.lineWidth = 0.6 + random() * 2.4
    const sway = 2 + random() * 8
    const pace = 0.002 + random() * 0.004
    const phase = random() * Math.PI * 2
    const start = random() * width * 0.7 - width * 0.1
    const length = width * (0.3 + random() * 0.9)
    context.beginPath()
    for (let x = start; x <= start + length; x += 26) {
      const wavy = y + Math.sin(x * pace + phase) * sway
      if (x === start) context.moveTo(x, wavy)
      else context.lineTo(x, wavy)
    }
    context.stroke()
  }

  // The joins between boards, each with a thin highlight under it.
  const boards = Math.max(2, Math.round(height / 520))
  for (let board = 1; board < boards; board += 1) {
    const y = Math.round((height / boards) * board + (random() - 0.5) * 60)
    context.fillStyle = 'rgba(22, 10, 3, 0.6)'
    context.fillRect(0, y, width, 4)
    context.fillStyle = 'rgba(255, 228, 184, 0.12)'
    context.fillRect(0, y + 4, width, 2)
  }

  // A knot or two in the wood.
  for (let knot = 0; knot < 2; knot += 1) {
    const x = random() < 0.5 ? 40 + random() * 90 : width - 40 - random() * 90
    const y = height * (0.15 + random() * 0.7)
    for (let ring = 6; ring < 46; ring += 5) {
      context.strokeStyle = `rgba(40, 20, 8, ${0.16 - ring * 0.002})`
      context.lineWidth = 1.6
      context.beginPath()
      context.ellipse(x, y, ring * 1.7, ring, 0.2, 0, Math.PI * 2)
      context.stroke()
    }
  }

  // Light from a window up and to the left, and the corners falling into shadow.
  const glow = context.createRadialGradient(width * 0.2, height * 0.1, 0, width * 0.2, height * 0.1, width * 0.9)
  glow.addColorStop(0, 'rgba(255, 240, 205, 0.16)')
  glow.addColorStop(1, 'rgba(255, 240, 205, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)
  const far = Math.hypot(width, height) / 2
  const shade = context.createRadialGradient(width / 2, height / 2, far * 0.45, width / 2, height / 2, far)
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
  context.fillStyle = shade
  context.fillRect(0, 0, width, height)
}

function drawPaper(context: Context, width: number, height: number, random: () => number) {
  context.save()
  context.shadowColor = 'rgba(0, 0, 0, 0.55)'
  context.shadowBlur = 46
  context.shadowOffsetX = 14
  context.shadowOffsetY = 24
  const tone = context.createLinearGradient(0, 0, width, height)
  tone.addColorStop(0, '#fcf7ea')
  tone.addColorStop(1, '#f1e7cf')
  context.fillStyle = tone
  context.fillRect(0, 0, width, height)
  context.restore()

  context.save()
  context.beginPath()
  context.rect(0, 0, width, height)
  context.clip()
  // Fibres in the paper.
  for (let fibre = 0; fibre < 7000; fibre += 1) {
    context.fillStyle = `rgba(${110 + random() * 40}, ${88 + random() * 30}, ${52 + random() * 30}, ${0.025 + random() * 0.05})`
    context.fillRect(random() * width, random() * height, 1 + random() * 3, 1 + random() * 1.4)
  }
  // It was folded in three to be left on the table: two soft creases.
  for (const fold of [height / 3, (height / 3) * 2]) {
    const dip = context.createLinearGradient(0, fold - 34, 0, fold + 34)
    dip.addColorStop(0, 'rgba(90, 70, 40, 0)')
    dip.addColorStop(0.5, 'rgba(90, 70, 40, 0.09)')
    dip.addColorStop(0.52, 'rgba(255, 255, 255, 0.5)')
    dip.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = dip
    context.fillRect(0, fold - 34, width, 68)
  }
  // The edges are a touch darker, as paper is where it has been handled.
  const edge = context.createLinearGradient(0, 0, width, 0)
  edge.addColorStop(0, 'rgba(120, 92, 50, 0.16)')
  edge.addColorStop(0.04, 'rgba(120, 92, 50, 0)')
  edge.addColorStop(0.96, 'rgba(120, 92, 50, 0)')
  edge.addColorStop(1, 'rgba(120, 92, 50, 0.2)')
  context.fillStyle = edge
  context.fillRect(0, 0, width, height)
  context.restore()
}

// A paw pressed in ink: four toes and a pad, with the ink thin in places as a real stamp is.
function inkPaw(size: number, random: () => number): HTMLCanvasElement {
  const { canvas, context } = sheet(size, size)
  context.fillStyle = STAMP
  const blot = (x: number, y: number, across: number, down: number, turn: number) => {
    context.beginPath()
    context.ellipse(x * size, y * size, across * size, down * size, turn, 0, Math.PI * 2)
    context.fill()
  }
  blot(0.19, 0.43, 0.085, 0.115, -0.45)
  blot(0.37, 0.25, 0.09, 0.125, -0.15)
  blot(0.63, 0.25, 0.09, 0.125, 0.15)
  blot(0.81, 0.43, 0.085, 0.115, 0.45)
  blot(0.5, 0.62, 0.2, 0.15, 0)
  blot(0.36, 0.76, 0.15, 0.125, -0.3)
  blot(0.64, 0.76, 0.15, 0.125, 0.3)

  context.globalCompositeOperation = 'destination-out'
  for (let speck = 0; speck < 520; speck += 1) {
    context.fillStyle = `rgba(0, 0, 0, ${0.2 + random() * 0.6})`
    context.beginPath()
    context.arc(random() * size, random() * size, 0.4 + random() * (size / 110), 0, Math.PI * 2)
    context.fill()
  }
  // Pressed harder on one side than the other.
  const press = context.createLinearGradient(0, 0, size, size)
  press.addColorStop(0, 'rgba(0, 0, 0, 0)')
  press.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
  context.fillStyle = press
  context.fillRect(0, 0, size, size)
  context.globalCompositeOperation = 'source-over'
  return canvas
}

// A strip of sticky tape: pale, a little see-through, with torn ends.
function drawTape(context: Context, width: number, height: number, random: () => number) {
  context.fillStyle = 'rgba(238, 224, 178, 0.72)'
  context.beginPath()
  context.moveTo(-width / 2, -height / 2)
  for (let y = -height / 2; y <= height / 2; y += 4) context.lineTo(width / 2 + random() * 5, y)
  for (let y = height / 2; y >= -height / 2; y -= 4) context.lineTo(-width / 2 - random() * 5, y)
  context.closePath()
  context.fill()
  context.fillStyle = 'rgba(255, 255, 255, 0.22)'
  context.fillRect(-width / 2, -height / 2, width, height * 0.3)
}

// The snapshot: a white-bordered photo of the lion at golden hour, taped on at a slight angle.
function drawPhoto(context: Context, lion: HTMLCanvasElement, picture: LetterPicture, width: number, random: () => number): number {
  const height = Math.round(width * 1.12)
  const border = Math.round(width * 0.06)
  const foot = Math.round(width * 0.2)

  context.save()
  context.shadowColor = 'rgba(0, 0, 0, 0.45)'
  context.shadowBlur = 26
  context.shadowOffsetX = 8
  context.shadowOffsetY = 14
  context.fillStyle = '#fdfcf8'
  context.fillRect(-border, -border, width + border * 2, height + border + foot)
  context.restore()

  context.save()
  context.beginPath()
  context.rect(0, 0, width, height)
  context.clip()
  // Sky, sun and grass, out of focus behind him.
  const sky = context.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#f6c66c')
  sky.addColorStop(0.5, '#f3a55a')
  sky.addColorStop(0.7, '#e98a55')
  context.fillStyle = sky
  context.fillRect(0, 0, width, height)
  const sun = context.createRadialGradient(width * 0.72, height * 0.4, 0, width * 0.72, height * 0.4, width * 0.5)
  sun.addColorStop(0, 'rgba(255, 246, 214, 0.95)')
  sun.addColorStop(0.25, 'rgba(255, 232, 170, 0.5)')
  sun.addColorStop(1, 'rgba(255, 232, 170, 0)')
  context.fillStyle = sun
  context.fillRect(0, 0, width, height)
  const grass = context.createLinearGradient(0, height * 0.68, 0, height)
  grass.addColorStop(0, '#8fa24e')
  grass.addColorStop(1, '#3e6a3c')
  context.fillStyle = grass
  context.fillRect(0, height * 0.7, width, height * 0.3)
  for (let blur = 0; blur < 16; blur += 1) {
    context.fillStyle = `rgba(255, 240, 200, ${0.05 + random() * 0.08})`
    context.beginPath()
    context.arc(random() * width, random() * height * 0.75, 8 + random() * 30, 0, Math.PI * 2)
    context.fill()
  }

  // The lion, with the ground shadow he would cast.
  const tall = height * 0.86
  const wide = (tall * lion.width) / lion.height
  const left = (width - wide) / 2
  const top = height - tall - height * 0.03
  context.fillStyle = 'rgba(30, 40, 20, 0.35)'
  context.beginPath()
  context.ellipse(width / 2, top + tall * 0.97, wide * 0.36, tall * 0.045, 0, 0, Math.PI * 2)
  context.fill()
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(lion, left, top, wide, tall)

  // Darker corners and a streak of gloss, as on a printed photo.
  const corners = context.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.85)
  corners.addColorStop(0, 'rgba(0, 0, 0, 0)')
  corners.addColorStop(1, 'rgba(40, 10, 0, 0.38)')
  context.fillStyle = corners
  context.fillRect(0, 0, width, height)
  const gloss = context.createLinearGradient(0, 0, width, height)
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
  gloss.addColorStop(0.35, 'rgba(255, 255, 255, 0)')
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gloss
  context.fillRect(0, 0, width, height)
  context.restore()

  // The date, written on the white strip below.
  context.fillStyle = INK
  context.font = `${Math.round(width * 0.085)}px ${picture.font}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(picture.caption, width / 2, height + foot / 2 + 2)
  context.textAlign = 'left'

  context.save()
  context.translate(width / 2, -border)
  context.rotate(-0.06)
  drawTape(context, width * 0.42, border * 2.2, random)
  context.restore()
  return height + border + foot
}

// ---------------------------------------------------------------------------------------

export async function renderLetter(picture: LetterPicture): Promise<Blob> {
  const font = `${TEXT}px ${picture.font}`
  await Promise.all([document.fonts.load(font), document.fonts.load(`bold ${font}`)]).catch(() => {})
  const [sprite, tail] = await Promise.all([loadImage('/sprites/todah-sit-happy.png'), loadImage('/sprites/todah-tail.png')])
  // The pictures of whatever he is wearing, loaded before he is drawn.
  const paths = picture.wearing
    .map(parseToken)
    .filter((entry): entry is { item: Accessory, variant?: Variant } => entry !== undefined && Boolean(entry.item.image))
    .map((entry) => pieceImage(entry.item, entry.variant))
  const loaded = await Promise.all(paths.map((path) => loadImage(path).catch(() => null)))
  const pieces = new Map<string, HTMLImageElement>()
  loaded.forEach((image, index) => {
    if (image) pieces.set(paths[index], image)
  })
  const random = seeded(picture.seed)
  const lion = portraitLion(sprite, tail, pieces, picture)

  // Lay the note out first, so the paper is as tall as the words need.
  const measure = sheet(10, 10).context
  measure.font = font
  const paperWidth = WIDTH - MARGIN * 2
  const paragraphs = picture.paragraphs.map((paragraph) => wrap(measure, paragraph, paperWidth - PAD * 2))
  const bodyHeight = paragraphs.reduce((sum, lines) => sum + lines.length * LINE + LINE * 0.5, 0)
  const photoWidth = 330
  const bottomHeight = Math.round(photoWidth * 1.12 + photoWidth * 0.26) + 70
  const paperHeight = Math.round(PAD + LINE * 1.7 + bodyHeight + 20 + bottomHeight + PAD * 0.6)

  const { canvas, context } = sheet(WIDTH, paperHeight + MARGIN * 2 + 60)
  drawDesk(context, canvas.width, canvas.height, random)

  // The paper, set down a little askew.
  context.save()
  context.translate(WIDTH / 2, MARGIN + paperHeight / 2)
  context.rotate((-1.3 * Math.PI) / 180)
  context.translate(-paperWidth / 2, -paperHeight / 2)
  drawPaper(context, paperWidth, paperHeight, random)

  // The words, in ink. Each line sits a hair off true, as handwriting does.
  context.fillStyle = INK
  context.textBaseline = 'top'
  const write = (text: string, x: number, y: number) => {
    context.save()
    context.translate(x + (random() - 0.5) * 5, y + (random() - 0.5) * 3)
    context.rotate((random() - 0.5) * 0.007)
    context.fillText(text, 0, 0)
    context.restore()
  }
  let y = PAD
  context.font = `bold ${Math.round(TEXT * 1.12)}px ${picture.font}`
  write(picture.dear, PAD, y)
  context.font = font
  y += LINE * 1.7
  for (const lines of paragraphs) {
    for (const line of lines) {
      write(line, PAD, y)
      y += LINE
    }
    y += LINE * 0.5
  }
  y += 20

  // Bottom left: the sign-off, the paw print, and his name.
  write(picture.signoff, PAD, y + bottomHeight * 0.3)
  const pawSize = 150
  context.save()
  context.translate(PAD + pawSize / 2, y + bottomHeight * 0.3 + LINE + 30 + pawSize / 2)
  context.rotate(-0.16)
  context.globalAlpha = 0.9
  context.drawImage(inkPaw(pawSize * 2, random), -pawSize / 2, -pawSize / 2, pawSize, pawSize)
  context.restore()
  context.font = `bold ${Math.round(TEXT * 1.25)}px ${picture.font}`
  write(picture.lionName, PAD + pawSize + 26, y + bottomHeight * 0.3 + LINE + 30 + pawSize * 0.3)

  // Bottom right: the snapshot.
  context.save()
  context.translate(paperWidth - PAD * 0.75 - photoWidth, y + 36)
  context.rotate((3.5 * Math.PI) / 180)
  drawPhoto(context, lion, picture, photoWidth, random)
  context.restore()
  context.restore()

  // A small credit on the desk, so a shared picture says where it came from.
  context.fillStyle = 'rgba(255, 240, 210, 0.75)'
  context.font = `26px ${picture.font}`
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillText(picture.credit, WIDTH / 2, canvas.height - 34)

  // Textured pictures make very large PNGs, so the note is saved as a JPEG.
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/jpeg', 0.9)
  })
}
