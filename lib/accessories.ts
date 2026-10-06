import { crownArt, lionPendant } from '@/lib/maneArt'
import {
  countedCheers,
  pridePower,
  todahForm,
  type AccessoryCategory,
  type Progress,
} from '@/lib/progress'
import { slotLevel, slots } from '@/lib/upgrades'

// The wardrobe: accessories the lion can wear, one from each category at a time.
//
// Sparks buy them. Sparks come from encouragement (a cheer from a friend) and from landing a
// job interview, never from money. A few pieces are gifts for progress instead.
//
// Buying never changes how grown the lion looks. A mane colour changes only the mane's
// colour: its size comes from the Mane upgrade's level (see maneSize).
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
}

// Cells of headroom above the sprite, for hats and the mane's crest.
export const HEADROOM = 6
export const GRID = { width: 51, height: 58 }

export const CHEER_SPARKS = 1
export const INTERVIEW_SPARKS = 25

export const categories: AccessoryCategory[] = ['fur', 'mane', 'hat', 'shades', 'neck']
// What the lion has in a category when nothing else is chosen.
export const defaults: Partial<Record<AccessoryCategory, string>> = { fur: 'golden', mane: 'mane-natural' }
export const NATURAL_MANE: [string, string] = ['#c9601b', '#8f3f12']

const INK = '#1a1226'
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

// Two lenses over the eyes and a bar across the top. F is the frame, L the lens, W a glint.
const shadesRows = [
  'FFFFFFFFFFFFFFFFFFFFFFFFFFF',
  'FLLLLLLLLF.......FLLLLLLLLF',
  'FLWWLLLLLF.......FLWWLLLLLF',
  'FLWLLLLLLF.......FLWLLLLLLF',
  'FLLLLLLLLF.......FLLLLLLLLF',
  'FLLLLLLLLF.......FLLLLLLLLF',
  'FLLLLLLLLF.......FLLLLLLLLF',
  '.FFFFFFFF.........FFFFFFFF.',
]

// A mane colour can be bought once he has his first hair on top to colour (Mane level 1).
const mane = (id: string, price: number, colours: readonly [string, string]): Accessory => ({
  id: `mane-${id}`,
  category: 'mane',
  price,
  needsMane: 1,
  mane: [colours[0], colours[1]],
})

export const accessories: Accessory[] = [
  // Fur: the coat's colour. The mane is drawn on top in its own colour, so the two combine.
  { id: 'golden', category: 'fur', price: 0 },
  { id: 'snow', category: 'fur', price: 25, filter: 'grayscale(1) brightness(1.35) contrast(0.9)' },
  { id: 'shadow', category: 'fur', price: 25, filter: 'grayscale(0.85) brightness(0.55) contrast(1.15)' },
  { id: 'ember', category: 'fur', price: 25, filter: 'hue-rotate(-22deg) saturate(1.5)' },
  { id: 'rose', category: 'fur', price: 25, filter: 'hue-rotate(-60deg) saturate(1.1) brightness(1.05)' },
  { id: 'sky', category: 'fur', price: 35, filter: 'hue-rotate(170deg) saturate(0.9)' },

  // Mane colours. Only the colour is bought: the size follows the Mane upgrade.
  { id: 'mane-natural', category: 'mane', price: 0, mane: NATURAL_MANE },
  mane('black', 25, tone.black),
  mane('white', 25, tone.white),
  mane('red', 25, tone.red),
  mane('blue', 25, tone.blue),
  mane('purple', 25, tone.purple),
  mane('teal', 25, tone.teal),
  mane('pink', 25, tone.pink),

  {
    id: 'cap',
    category: 'hat',
    price: 25,
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
  {
    id: 'beanie',
    category: 'hat',
    price: 25,
    variants: options(['blue', 'red', 'green', 'purple'], (main) => ({ B: main })),
    art: [
      {
        x: 15,
        y: -2,
        rows: [
          '.........WWW.........',
          '........WWWWW........',
          '......BBBBBBBBB......',
          '....BBBBBBBBBBBBB....',
          '..BBBBBBBBBBBBBBBBB..',
          '.BBBBBBBBBBBBBBBBBBB.',
          'BBBBBBBBBBBBBBBBBBBBB',
          'BWBBWBBWBBWBBWBBWBBWB',
          'BWBBWBBWBBWBBWBBWBBWB',
        ],
        palette: { B: tone.blue[0], W: WHITE },
      },
    ],
  },
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

  // Every pair shares one shape (shadesRows), so they all sit over the eyes the same way.
  {
    id: 'shades',
    category: 'shades',
    price: 20,
    variants: [
      { id: 'black', swatch: INK, palette: { L: INK } },
      { id: 'brown', swatch: '#5a3a22', palette: { L: '#5a3a22' } },
      { id: 'blue', swatch: tone.blue[1], palette: { L: tone.blue[1] } },
      { id: 'red', swatch: tone.red[1], palette: { L: tone.red[1] } },
    ],
    art: [{ x: 11, y: 14, rows: shadesRows, palette: { F: INK, L: INK, W: WHITE } }],
  },
  {
    // A light frame. (A gold frame vanished into the fur.)
    id: 'aviators',
    category: 'shades',
    price: 30,
    variants: options(['silver', 'white', 'pink', 'teal'], (main) => ({ F: main })),
    art: [{ x: 11, y: 14, rows: shadesRows, palette: { F: tone.silver[0], L: INK, W: WHITE } }],
  },
  {
    id: 'sunset',
    category: 'shades',
    price: 30,
    variants: [
      { id: 'sunset', swatch: '#e84fb0', palette: { A: '#4fd8e8', B: '#7b3fe4', C: '#e84fb0' } },
      { id: 'fire', swatch: '#f08a2a', palette: { A: '#ffe08a', B: '#f08a2a', C: '#c83e52' } },
      { id: 'ocean', swatch: '#3f6fd8', palette: { A: '#7fe0d0', B: '#3f6fd8', C: '#27468f' } },
    ],
    art: [
      {
        x: 11,
        y: 14,
        rows: [
          'KKKKKKKKKKKKKKKKKKKKKKKKKKK',
          'KAAAAAAAAK.......KAAAAAAAAK',
          'KAWWAAAAAK.......KAWWAAAAAK',
          'KAAAAAAAAK.......KAAAAAAAAK',
          'KBBBBBBBBK.......KBBBBBBBBK',
          'KBBBBBBBBK.......KBBBBBBBBK',
          'KCCCCCCCCK.......KCCCCCCCCK',
          '.KKKKKKKK.........KKKKKKKK.',
        ],
        palette: { K: INK, A: '#4fd8e8', B: '#7b3fe4', C: '#e84fb0', W: WHITE },
      },
    ],
  },
  {
    // Eyeglasses: frames only, so the eyes show through.
    id: 'glasses-round',
    category: 'shades',
    price: 20,
    variants: options(['black', 'brown', 'blue', 'white'], (main) => ({ F: main })),
    art: [
      {
        x: 11,
        y: 14,
        rows: [
          '..FFFFFF...........FFFFFF..',
          '.F......F.........F......F.',
          'F........FFFFFFFFF........F',
          'F........F.......F........F',
          'F........F.......F........F',
          'F........F.......F........F',
          '.F......F.........F......F.',
          '..FFFFFF...........FFFFFF..',
        ],
        palette: { F: tone.black[0] },
      },
    ],
  },
  {
    id: 'glasses-square',
    category: 'shades',
    price: 20,
    variants: options(['red', 'blue', 'green', 'black'], (main) => ({ F: main })),
    art: [
      {
        x: 11,
        y: 14,
        rows: [
          'FFFFFFFFFF.......FFFFFFFFFF',
          'F........F.......F........F',
          'F........FFFFFFFFF........F',
          'F........F.......F........F',
          'F........F.......F........F',
          'F........F.......F........F',
          'F........F.......F........F',
          'FFFFFFFFFF.......FFFFFFFFFF',
        ],
        palette: { F: tone.red[0] },
      },
    ],
  },

  {
    id: 'bandana',
    category: 'neck',
    price: 0,
    gift: 'quest',
    variants: options(['teal', 'red', 'purple', 'blue'], (main) => ({ T: main })),
    art: [
      {
        x: 12,
        y: 31,
        rows: [
          'TTTTTTTTTTTTTTTTTTTTTTTTTTT',
          '.TTTTWTTTTTTTWTTTTTTTWTTTT.',
          '...TTTTTTTTTTTTTTTTTTTTT...',
          '.....TTTTTTTTWTTTTTTTT.....',
          '.......TTTTTTTTTTTTT.......',
          '.........TTTTWTTTT.........',
          '...........TTTTT...........',
          '.............T.............',
        ],
        palette: { T: tone.teal[0], W: WHITE },
      },
    ],
  },
  {
    id: 'scarf',
    category: 'neck',
    price: 20,
    variants: options(['red', 'blue', 'green', 'purple'], (main, shade) => ({ R: main, D: shade })),
    art: [
      {
        x: 12,
        y: 31,
        rows: [
          '.RRRRRRRRRRRRRRRRRRRRRRRRR.',
          'RRDRRDRRDRRDRRDRRDRRDRRDRRR',
          '.RRRRRRRRRRRRRRRRRRRRRRRRR.',
          '................RRRR.......',
          '................RDRR.......',
          '................RRRR.......',
          '................R.RR.......',
        ],
        palette: { R: tone.red[0], D: tone.red[1] },
      },
    ],
  },
  {
    id: 'bow-tie',
    category: 'neck',
    price: 20,
    variants: options(['purple', 'red', 'black', 'blue'], (main) => ({ P: main })),
    art: [
      {
        x: 20,
        y: 32,
        rows: ['PP.......PP', 'PPPP...PPPP', 'PPPPPKPPPPP', 'PPPP...PPPP', 'PP.......PP'],
        palette: { P: tone.purple[0], K: INK },
      },
    ],
  },
  {
    // Gold on golden fur disappears, so the links carry a dark edge, and the pendant is a dark
    // medallion with a lion's head in side view, drawn at twice the grid's detail.
    id: 'chain',
    category: 'neck',
    price: 35,
    needsPower: 15,
    variants: options(['gold', 'silver', 'rose'], (main, bright) => ({ G: main, Y: bright, R: main })),
    sparkles: [{ x: 21, y: 38 }],
    art: [
      {
        x: 12,
        y: 31,
        rows: [
          'YG.......................GY',
          'KYG.....................GYK',
          '.KYGG.................GGYK.',
          '..KKYGG.............GGYKK..',
          '....KKYGGG.......GGGYKK....',
          '......KKYGGGGGGGGGYKK......',
        ],
        palette: { G: GOLD, Y: GOLD_BRIGHT, K: INK },
      },
      {
        x: 19.5,
        y: 36.5,
        cell: 0.5,
        rows: lionPendant,
        // R rim, K field, M and D mane, G and Y face, E eye, nose and mouth.
        palette: { R: GOLD, K: INK, M: '#c9601b', D: '#8f3f12', G: GOLD, Y: GOLD_BRIGHT, E: INK },
      },
    ],
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

// The mane's size, 0 to 3. It follows the Mane upgrade's level and nothing else.
const maneSlot = slots.find((slot) => slot.id === 'mane')

export function maneSize(progress: Progress): number {
  return maneSlot ? slotLevel(maneSlot, progress.upgrades.mane ?? '') : 0
}

// Sparks earned and spent in this game. The balance never shows below zero.
export function sparks(progress: Progress): { cheers: number, interviews: number, earned: number, balance: number } {
  const cheers = countedCheers(progress)
  const interviews = progress.outreach.filter((entry) => entry.kind === 'interview').length
  const earned = cheers * CHEER_SPARKS + interviews * INTERVIEW_SPARKS
  const spent = progress.bought.reduce((sum, id) => sum + (byId.get(id)?.price ?? 0), 0)
  return { cheers, interviews, earned, balance: Math.max(0, earned - spent) }
}

function giftEarned(item: Accessory, progress: Progress, others: Progress[]): boolean {
  if (item.gift === 'quest') return progress.onboardingDone
  if (item.gift === 'nomad') return todahForm(progress, others) !== 'cub'
  if (item.gift === 'leader') return Boolean(progress.goalAchievedAt)
  return false
}

export function owns(progress: Progress, item: Accessory, others: Progress[] = []): boolean {
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

// Tokens for what the lion is wearing, limited to pieces it owns, in its chosen colours.
export function wornIds(progress: Progress, others: Progress[] = []): string[] {
  return categories
    .map((category) => byId.get(progress.wearing[category] ?? ''))
    .filter((item): item is Accessory => item !== undefined && owns(progress, item, others))
    .map((item) => wornToken(item, progress.tones[item.id]))
}
