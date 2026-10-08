import { applyFilter } from '@/lib/colour'
import { crownArt } from '@/lib/maneArt'
import {
  countedCheers,
  pridePower,
  todahForm,
  type AccessoryCategory,
  type LionSex,
  type Progress,
} from '@/lib/progress'
import { slotLevel, slots } from '@/lib/upgrades'

// The wardrobe: accessories the lion can wear, one from each category at a time.
//
// Sparks buy them. Sparks come from walking a level of the interview, from doing a real-world
// trail step, from encouragement (a cheer from a friend), and from landing a job interview,
// never from money. Prices are set so that the four levels alone (20 sparks) buy a few pieces
// and a player who also does their trail steps can dress the lion head to foot. A few pieces are gifts for progress instead.
//
// Buying never changes how grown the lion looks. A mane colour changes only the mane's
// colour: its size comes from the Mane upgrade's level (see maneSize).
//
// Fur and mane are separate groups that come in sets: every fur has a mane of the same name.
// The golden cub's mane is his coat's colour turned a step round the colour wheel, deepened
// and strengthened, and each set repeats that same relationship (see setMane), so a set
// always sits together. The two pieces are bought one at a time: a new fur alone leaves the
// mane as it was, and it takes one of each to match.
//
// Art is drawn on the seated sprite's own grid. One cell is 3 sprite pixels, so the sprite is
// 51 cells wide and 58 tall. `x` and `y` are where the art's top-left cell goes, and `y` can
// be negative for a hat that rises above the head. Each letter in `rows` is a colour from
// `palette`, and a dot is empty. `cell` is the size of one art pixel in cells (1 unless the
// art is finer than the grid).
//
// A hat is pulled down between the ears, not balanced on top: its bottom row sits about 6
// cells down, where the head reaches full width, and it is centred on column 25, the middle
// of the face.

export type AccessoryArt = { x: number, y: number, rows: string[], palette: Record<string, string>, cell?: number }

// A colour option. Its palette replaces the matching letters in the art's own.
export type Variant = { id: string, swatch: string, palette: Record<string, string> }

export type Accessory = {
  id: string
  category: AccessoryCategory
  // Sparks to buy it. Gifts and the two defaults cost nothing.
  price: number
  // A gift: owned as soon as this point in the game is reached.
  gift?: 'quest' | 'nomad' | 'leader'
  // Cannot be bought until Pride Power reaches this.
  needsPower?: number
  // Cannot be bought until the mane has grown to this size (see maneSize).
  needsMane?: number
  // Fur only: a CSS filter that tints the coat. The mane is drawn separately and keeps its colour.
  filter?: string
  // Mane only: its colour and its shade.
  mane?: [string, string]
  // Layers of art, drawn in order.
  art?: AccessoryArt[]
  // Colour options, free to switch once the piece is owned. The first is the default.
  variants?: Variant[]
  // Glints that twinkle over the piece, in cells.
  sparkles?: { x: number, y: number }[]
  // A piece that is a picture, not rows of letters: cut from a sheet drawn by an image model
  // (see scripts/wardrobe-from-sheet.py). Its files are in public/wardrobe, one per colour.
  image?: boolean
  // A whole costume with a mane of its own, so the lion's grown mane is not drawn under it.
  hidesMane?: boolean
  // A whole picture of its own: while this is on, it is all that is drawn. Not the lion
  // underneath, not his tail, and nothing else he is wearing.
  alone?: boolean
  // Only for a lion, or only for a lioness. A lion grows a mane and can colour it. A lioness
  // has no mane, and has pieces of her own in its place.
  only?: LionSex
}

// Cells of headroom above the sprite, for hats and the mane's crest.
export const HEADROOM = 6
export const GRID = { width: 51, height: 58 }

export const CHEER_SPARKS = 1
export const INTERVIEW_SPARKS = 25
// A real-world trail step done (see lib/compass.ts): the kind of effort sparks are for.
export const STEP_SPARKS = 3
// Walking a level of the interview, once its claim is marked on the trail map.
export const LEVEL_SPARKS = 5

export const categories: AccessoryCategory[] = ['fur', 'mane', 'essentials', 'hat', 'shades', 'ears', 'neck', 'body', 'bag', 'outfit']
// The order pieces are drawn in, bottom first: a costume under everything, then shoes and
// jackets, what hangs over them, and last what sits on the face and head.
export const drawOrder: AccessoryCategory[] = ['outfit', 'body', 'neck', 'bag', 'shades', 'ears', 'hat', 'essentials']
// What the lion has in a category when nothing else is chosen.
export const defaults: Partial<Record<AccessoryCategory, string>> = { fur: 'golden', mane: 'mane-natural' }
export const NATURAL_MANE: [string, string] = ['#c9601b', '#8f3f12']

const WHITE = '#ffffff'
const GOLD = '#f2c14e'
const GOLD_BRIGHT = '#ffe08a'

// Colour families: a main colour and its shade (or, for metals, its highlight).
const tone = {
  red: ['#c83e52', '#8f1d2c'],
  blue: ['#3f6fd8', '#27468f'],
  green: ['#3f9d5a', '#256b3a'],
  purple: ['#7b3fe4', '#4b2496'],
  teal: ['#2a9d8f', '#17665d'],
  pink: ['#ff8fc0', '#c2578a'],
  black: ['#2a2233', '#120e1a'],
  white: ['#f3f3f7', '#c9c9d6'],
  tan: ['#c9a26b', '#7a4a1e'],
  olive: ['#8a9a5b', '#4f5d2f'],
  grey: ['#a7a7b5', '#5d5d6e'],
  brown: ['#7a4a1e', '#4d2d10'],
  gold: [GOLD, GOLD_BRIGHT],
  silver: ['#c9d1e6', '#f3f6ff'],
  rose: ['#f2a08a', '#ffd0c2'],
} as const

type Tone = keyof typeof tone

// One colour option per tone, with `paint` saying which letters of the art take its two colours.
const options = (tones: Tone[], paint: (main: string, second: string) => Record<string, string>): Variant[] =>
  tones.map((id) => ({ id, swatch: tone[id][0], palette: paint(tone[id][0], tone[id][1]) }))

// The colours a picture piece is sold in. Every picture piece is repainted from one shared set
// of colour ramps (scripts/wardrobe_manifest.py), so a red cap and a red scarf are the same
// red and the blacks, whites and metals sit with all of it. That is what lets any two pieces
// be worn together.
const shades = (ids: Tone[]): Variant[] => ids.map((id) => ({ id, swatch: tone[id][0], palette: {} }))

// Where a picture piece's file is, in the colour chosen.
export function pieceImage(item: Accessory, variant?: Variant): string {
  const colour = variant ?? item.variants?.[0]
  return `/wardrobe/${item.id}${colour ? `--${colour.id}` : ''}.png`
}

// A mane colour can be bought once he has his first hair on top to colour (Mane level 1).
const mane = (id: string, price: number, colours: readonly [string, string]): Accessory => ({
  id: `mane-${id}`,
  category: 'mane',
  price,
  needsMane: 1,
  only: 'male',
  mane: [colours[0], colours[1]],
})

// Fur: the coat's colour. Each tint keeps the sprite's own light-to-dark steps, so a coat
// stays one colour family from highlight to shadow.
const furs: Accessory[] = [
  { id: 'golden', category: 'fur', price: 0 },
  { id: 'snow', category: 'fur', price: 8, filter: 'grayscale(1) brightness(1.35) contrast(0.9)' },
  { id: 'shadow', category: 'fur', price: 8, filter: 'grayscale(0.85) brightness(0.55) contrast(1.15)' },
  { id: 'ember', category: 'fur', price: 8, filter: 'hue-rotate(-22deg) saturate(1.5)' },
  { id: 'rose', category: 'fur', price: 8, filter: 'hue-rotate(-60deg) saturate(1.1) brightness(1.05)' },
  { id: 'sky', category: 'fur', price: 10, filter: 'hue-rotate(170deg) saturate(0.9)' },
]

// The mane that completes a fur's set: the natural mane's two colours put through that fur's
// tint. It stands to its coat exactly as the natural mane stands to the golden coat, and it
// matches the tail tip the tint has already coloured on the sprite.
const setMane = (fur: Accessory): Accessory =>
  mane(fur.id, 6, [applyFilter(NATURAL_MANE[0], fur.filter), applyFilter(NATURAL_MANE[1], fur.filter)])

export const accessories: Accessory[] = [
  ...furs,

  // Mane colours. Only the colour is bought: the size follows the Mane upgrade. The natural
  // mane is the golden coat's partner, then comes one for each other fur, then three that
  // belong to no set: white, and two cool colours that sit opposite the warm coats.
  { id: 'mane-natural', category: 'mane', price: 0, only: 'male', mane: NATURAL_MANE },
  ...furs.filter((fur) => fur.filter).map(setMane),
  mane('white', 6, tone.white),
  mane('purple', 6, tone.purple),
  mane('teal', 6, tone.teal),

  {
    id: 'cap',
    category: 'hat',
    price: 6,
    variants: options(['red', 'blue', 'green', 'black'], (main, shade) => ({ R: main, D: shade })),
    art: [
      {
        x: 14,
        y: -1,
        rows: [
          '.......RRRRRRRRR.......',
          '.....RRRRRRRRRRRRR.....',
          '...RRRRRRRRRRRRRRRRR...',
          '..RRRRRRRRRRRRRRRRRRR..',
          '..RRRRRRRRRWRRRRRRRRR..',
          '..RRRRRRRRRRRRRRRRRRR..',
          '..RRRRRRRRRRRRRRRRRRR..',
          'DDDDDDDDDDDDDDDDDDDDDDD',
          '.DDDDDDDDDDDDDDDDDDDDD.',
        ],
        palette: { R: tone.red[0], D: tone.red[1], W: WHITE },
      },
    ],
  },
  { id: 'beanie', category: 'hat', price: 5, image: true, variants: shades(['blue', 'red', 'green', 'purple', 'black']) },
  {
    id: 'explorer',
    category: 'hat',
    price: 0,
    gift: 'nomad',
    variants: options(['tan', 'olive', 'grey'], (main, shade) => ({ T: main, N: shade })),
    art: [
      {
        x: 10,
        y: -1,
        rows: [
          '.......TTTTTTTTTTTTTTTTT.......',
          '......TTTTTTTTTTTTTTTTTTT......',
          '......TTTTTTTTTTTTTTTTTTT......',
          '......TTTTTTTTTTTTTTTTTTT......',
          '......NNNNNNNNNNNNNNNNNNN......',
          '......NNNNNNNNNNNNNNNNNNN......',
          'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
          '.TTTTTTTTTTTTTTTTTTTTTTTTTTTTT.',
        ],
        palette: { T: tone.tan[0], N: tone.tan[1] },
      },
    ],
  },
  {
    // The crown comes only with the roar, so it is the richest piece: drawn at twice the
    // grid's detail, set with jewels, outlined so it stands out, and it glints.
    id: 'crown',
    category: 'hat',
    price: 0,
    gift: 'leader',
    variants: [
      { id: 'gold', swatch: GOLD, palette: {} },
      { id: 'silver', swatch: tone.silver[0], palette: { G: tone.silver[0], Y: tone.silver[1], S: '#8f97ad' } },
      { id: 'rose', swatch: tone.rose[0], palette: { G: tone.rose[0], Y: tone.rose[1], S: '#c26f5a' } },
    ],
    sparkles: [
      { x: 13, y: -3 },
      { x: 25, y: -5 },
      { x: 36, y: -4 },
      { x: 19, y: 1 },
      { x: 31, y: 0 },
      { x: 25, y: 4 },
    ],
    art: [
      {
        // A touch larger than two pixels per cell, and worn low on the brow.
        x: 12.1,
        y: -6,
        cell: 0.56,
        rows: crownArt,
        palette: {
          O: '#5a3410',
          G: GOLD,
          Y: GOLD_BRIGHT,
          S: '#c98a1b',
          V: '#8f1d2c',
          R: '#e8334a',
          B: '#4f8fe8',
          E: '#3fcf7a',
          P: '#f3f6ff',
          W: WHITE,
        },
      },
    ],
  },

  // Plain shades and the sunset aviators are drawn by scripts/shades-art.py, which finds his
  // eyes on the sprite and centres a lens on each.
  { id: 'shades', category: 'shades', price: 6, image: true, variants: shades(['black', 'brown', 'blue', 'red']) },
  { id: 'aviators', category: 'shades', price: 8, image: true, variants: shades(['silver', 'white', 'pink', 'teal']) },
  {
    // Lenses that fade through three colours.
    id: 'sunset',
    category: 'shades',
    price: 8,
    image: true,
    variants: [
      { id: 'sunset', swatch: '#e84fb0', palette: {} },
      { id: 'fire', swatch: '#f08a2a', palette: {} },
      { id: 'ocean', swatch: '#3f6fd8', palette: {} },
    ],
  },
  // Eyeglasses are frames only, so his eyes show through and still blink.
  { id: 'glasses-round', category: 'shades', price: 5, image: true, variants: shades(['black', 'brown', 'blue', 'white']) },
  { id: 'glasses-square', category: 'shades', price: 5, image: true, variants: shades(['red', 'blue', 'green', 'black']) },

  { id: 'bandana', category: 'neck', price: 0, gift: 'quest', image: true, variants: shades(['teal', 'red', 'purple', 'blue']) },
  { id: 'scarf', category: 'neck', price: 5, image: true, variants: shades(['red', 'blue', 'green', 'purple', 'black']) },
  { id: 'bow-tie', category: 'neck', price: 4, image: true, variants: shades(['purple', 'red', 'black', 'blue']) },
  {
    // A gold chain with a lion's head on the pendant.
    id: 'chain',
    category: 'neck',
    price: 18,
    needsPower: 15,
    image: true,
    variants: shades(['gold', 'silver', 'rose']),
    sparkles: [{ x: 26, y: 42 }],
  },
  { id: 'cuban-chain', category: 'neck', price: 15, image: true, variants: shades(['silver', 'gold', 'rose', 'black']) },

  { id: 'lion-cap', category: 'hat', price: 7, image: true, variants: shades(['black', 'red', 'blue', 'green', 'white']) },
  {
    // Two colours each: the pattern and its ground.
    id: 'head-bandana',
    category: 'hat',
    price: 4,
    image: true,
    variants: [
      { id: 'blue', swatch: tone.gold[0], palette: {} },
      { id: 'red', swatch: tone.red[0], palette: {} },
      { id: 'green', swatch: tone.green[0], palette: {} },
      { id: 'purple', swatch: tone.pink[0], palette: {} },
      { id: 'black', swatch: tone.black[0], palette: {} },
    ],
  },
  { id: 'shield-shades', category: 'shades', price: 9, image: true, variants: shades(['black', 'blue', 'red', 'teal']) },
  { id: 'hoop-earrings', category: 'ears', price: 8, image: true, variants: shades(['gold', 'silver', 'rose']) },
  // One of the pair, worn on one ear.
  { id: 'hoop-earring', category: 'ears', price: 5, image: true, variants: shades(['gold', 'silver', 'rose']) },
  // A lioness's essentials (scripts/essentials-art.py). She has no mane to colour, so this
  // group stands where MANE COLOUR does for a lion. Each is a small thing standing by her paw,
  // on the other side from her bag, and carries a paw mark.
  { id: 'perfume', category: 'essentials', price: 6, only: 'female', image: true, variants: shades(['gold', 'pink', 'purple', 'teal']) },
  { id: 'passport', category: 'essentials', price: 5, only: 'female', image: true, variants: shades(['blue', 'red', 'green', 'black', 'brown']) },
  { id: 'wallet', category: 'essentials', price: 6, only: 'female', image: true, variants: shades(['brown', 'black', 'red', 'green', 'pink']) },
  { id: 'phone', category: 'essentials', price: 8, only: 'female', image: true, variants: shades(['purple', 'black', 'pink', 'teal', 'white']) },

  { id: 'aviator-jacket', category: 'body', price: 15, image: true, variants: shades(['black', 'brown', 'red', 'blue', 'olive']) },
  { id: 'indigo-jacket', category: 'body', price: 12, image: true, variants: shades(['blue', 'black', 'red', 'green', 'brown']) },
  { id: 'micro-bag', category: 'bag', price: 10, only: 'female', image: true, variants: shades(['blue', 'red', 'green', 'purple', 'pink', 'black']) },

  {
    // A transformation, not a piece: a whole picture of a shishi, the guardian lion of East
    // Asia, in the green of the Japanese lion dance. It takes the lion's place entirely while
    // it is on.
    id: 'shishi',
    category: 'outfit',
    price: 30,
    needsPower: 20,
    image: true,
    hidesMane: true,
    alone: true,
  },
]

const byId = new Map(accessories.map((item) => [item.id, item]))

// What the lion wears is passed around as tokens: an accessory's id, or "id~colour" when a
// colour other than its first has been chosen.
export function wornToken(item: Accessory, variant?: string): string {
  const chosen = item.variants?.find((option) => option.id === variant)
  return chosen && chosen !== item.variants?.[0] ? `${item.id}~${chosen.id}` : item.id
}

// The accessory and colour option a token stands for. An unknown colour falls back to the first.
export function parseToken(token: string): { item: Accessory, variant?: Variant } | undefined {
  const [id, variant] = token.split('~')
  const item = byId.get(id)
  if (!item) return undefined
  return { item, variant: item.variants?.find((option) => option.id === variant) ?? item.variants?.[0] }
}

export function accessory(token: string): Accessory | undefined {
  return parseToken(token)?.item
}

// The mane that makes a set with a fur: the one of the same name, or the natural mane for
// the golden coat.
export function partnerMane(fur: Accessory): Accessory | undefined {
  return byId.get(fur.id === defaults.fur ? (defaults.mane ?? '') : `mane-${fur.id}`)
}

// The first upgrade's level, 0 to 3 (dev tools aside). On a lion it is the size of his mane.
// A lioness has no mane: on her the same upgrade is called AURA, and it shows as a glow.
const maneSlot = slots.find((slot) => slot.id === 'mane')

function firstUpgradeLevel(progress: Progress): number {
  if (typeof progress.dev?.mane === 'number') return progress.dev.mane
  return maneSlot ? slotLevel(maneSlot, progress.upgrades.mane ?? '') : 0
}

export function maneSize(progress: Progress): number {
  return progress.lionSex === 'female' ? 0 : firstUpgradeLevel(progress)
}

export function auraSize(progress: Progress): number {
  return progress.lionSex === 'female' ? firstUpgradeLevel(progress) : 0
}

// Sparks earned and spent in this game. The balance never shows below zero.
export function sparks(progress: Progress): {
  cheers: number
  interviews: number
  levels: number
  steps: number
  earned: number
  balance: number
} {
  const cheers = countedCheers(progress)
  const interviews = progress.outreach.filter((entry) => entry.kind === 'interview').length
  const levels = progress.levelsDone.length
  const steps = progress.stepsDone.length
  const earned = cheers * CHEER_SPARKS + interviews * INTERVIEW_SPARKS + levels * LEVEL_SPARKS + steps * STEP_SPARKS
  const spent = progress.bought.reduce((sum, id) => sum + (byId.get(id)?.price ?? 0), 0)
  return { cheers, interviews, levels, steps, earned, balance: Math.max(0, earned - spent) }
}

function giftEarned(item: Accessory, progress: Progress, others: Progress[]): boolean {
  if (item.gift === 'quest') return progress.onboardingDone
  if (item.gift === 'nomad') return todahForm(progress, others) !== 'cub'
  if (item.gift === 'leader') return Boolean(progress.goalAchievedAt)
  return false
}

export function owns(progress: Progress, item: Accessory, others: Progress[] = []): boolean {
  if (progress.dev?.unlockAll) return true
  if (item.gift) return giftEarned(item, progress, others)
  return item.price === 0 || progress.bought.includes(item.id)
}

// Why an accessory cannot be bought right now, or null when it can.
export function buyBlock(
  progress: Progress,
  item: Accessory,
  others: Progress[] = [],
): 'gift' | 'mane' | 'power' | 'sparks' | null {
  if (item.gift) return 'gift'
  if (item.needsMane && maneSize(progress) < item.needsMane) return 'mane'
  if (item.needsPower && pridePower(progress, others).level < item.needsPower) return 'power'
  if (sparks(progress).balance < item.price) return 'sparks'
  return null
}

// Whether a piece is for this lion at all: some are only for a lion, some only for a lioness.
export function fits(item: Accessory, sex: LionSex): boolean {
  return !item.only || item.only === (sex ?? 'male')
}

// The wardrobe groups this lion has. A group with nothing in it for them is left out, so a
// lion sees MANE COLOUR where a lioness sees BAGS.
export function categoriesFor(sex: LionSex): AccessoryCategory[] {
  return categories.filter((category) => accessories.some((item) => item.category === category && fits(item, sex)))
}

// Tokens for what the lion is wearing, limited to pieces it owns, in its chosen colours.
export function wornIds(progress: Progress, others: Progress[] = []): string[] {
  return categories
    .map((category) => byId.get(progress.wearing[category] ?? ''))
    .filter((item): item is Accessory => item !== undefined && fits(item, progress.lionSex) && owns(progress, item, others))
    .map((item) => wornToken(item, progress.tones[item.id]))
}
