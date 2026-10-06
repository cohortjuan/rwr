import {
  countedCheers,
  pridePower,
  todahForm,
  type AccessoryCategory,
  type Progress,
} from '@/lib/progress'

// The wardrobe: accessories the lion can wear, one from each category at a time.
//
// Sparks buy them. Sparks come from encouragement (a cheer from a friend) and from landing a
// job interview, never from money. A few pieces are gifts for progress instead.
//
// A hat is pulled down between the ears, not balanced on top: its bottom row sits about 6
// cells down, where the head reaches full width, and it is centred on column 25, the middle
// of the face.
//
// Art is drawn on the seated sprite's own grid. One cell is 3 sprite pixels, so the sprite is
// 51 cells wide and 58 tall. `x` and `y` are where the art's top-left cell goes, and `y` can
// be negative for a hat that rises above the head. Each letter in `rows` is a colour from
// `palette`, and a dot is empty.

export type AccessoryArt = { x: number, y: number, rows: string[], palette: Record<string, string> }

export type Accessory = {
  id: string
  category: AccessoryCategory
  // Sparks to buy it. Gifts and the default fur cost nothing.
  price: number
  // A gift: owned as soon as this point in the game is reached.
  gift?: 'quest' | 'nomad' | 'leader'
  // Cannot be bought until Pride Power reaches this.
  needsPower?: number
  // Fur only: a CSS filter that tints the whole lion.
  filter?: string
  art?: AccessoryArt
}

// Cells of headroom above the sprite, for hats.
export const HEADROOM = 6
export const GRID = { width: 51, height: 58 }

export const CHEER_SPARKS = 5
export const INTERVIEW_SPARKS = 25

export const categories: AccessoryCategory[] = ['fur', 'claws', 'hat', 'shades', 'neck']
export const DEFAULT_FUR = 'golden'

const INK = '#1a1226'
const WHITE = '#ffffff'
const GOLD = '#f2c14e'
const GOLD_BRIGHT = '#ffe08a'
const RED = '#c83e52'
const RED_DEEP = '#8f1d2c'
const TEAL = '#2a9d8f'
const PURPLE = '#7b3fe4'

// Three claws on each front paw: two cells wide with a pointed tip.
const claws = (rows: string[], palette: Record<string, string>): AccessoryArt => ({ x: 14, y: 55, rows, palette })
const plainClaws = ['CC.CC.CC......CC.CC.CC', 'CC.CC.CC......CC.CC.CC', '.C..C..C.......C..C..C']

export const accessories: Accessory[] = [
  // Fur and mane. These tint the whole lion: a true two-colour coat needs the mane drawn as
  // its own layer in the sprite art.
  { id: 'golden', category: 'fur', price: 0 },
  { id: 'snow', category: 'fur', price: 20, filter: 'grayscale(1) brightness(1.35) contrast(0.9)' },
  { id: 'shadow', category: 'fur', price: 20, filter: 'grayscale(0.85) brightness(0.55) contrast(1.15)' },
  { id: 'ember', category: 'fur', price: 20, filter: 'hue-rotate(-22deg) saturate(1.5)' },
  { id: 'rose', category: 'fur', price: 20, filter: 'hue-rotate(-60deg) saturate(1.1) brightness(1.05)' },
  { id: 'sky', category: 'fur', price: 30, filter: 'hue-rotate(170deg) saturate(0.9)' },

  { id: 'claws-black', category: 'claws', price: 10, art: claws(plainClaws, { C: INK }) },
  { id: 'claws-gold', category: 'claws', price: 10, art: claws(plainClaws, { C: GOLD_BRIGHT }) },
  { id: 'claws-ruby', category: 'claws', price: 10, art: claws(plainClaws, { C: RED }) },
  { id: 'claws-aqua', category: 'claws', price: 10, art: claws(plainClaws, { C: '#4fd8e8' }) },
  {
    id: 'claws-rainbow',
    category: 'claws',
    price: 20,
    art: claws(['RR.GG.BB......PP.CC.YY', 'RR.GG.BB......PP.CC.YY', '.R..G..B.......P..C..Y'], {
      R: RED,
      G: '#5fcf6a',
      B: '#4f8fe8',
      P: PURPLE,
      C: '#4fd8e8',
      Y: GOLD_BRIGHT,
    }),
  },

  {
    id: 'cap',
    category: 'hat',
    price: 20,
    art: {
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
      palette: { R: RED, D: RED_DEEP, W: WHITE },
    },
  },
  {
    id: 'beanie',
    category: 'hat',
    price: 20,
    art: {
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
      palette: { B: '#3f6fd8', W: WHITE },
    },
  },
  {
    id: 'explorer',
    category: 'hat',
    price: 0,
    gift: 'nomad',
    art: {
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
      palette: { T: '#c9a26b', N: '#7a4a1e' },
    },
  },
  {
    id: 'crown',
    category: 'hat',
    price: 0,
    gift: 'leader',
    art: {
      x: 16,
      y: -1,
      rows: [
        'G...G....G....G...G',
        'G...G....G....G...G',
        'GG.GGG..GGG..GGG.GG',
        'GGGGGGGGGGGGGGGGGGG',
        'GGRGGGGGGBGGGGGGRGG',
        'GGGGGGGGGGGGGGGGGGG',
        'YYYYYYYYYYYYYYYYYYY',
      ],
      palette: { G: GOLD, Y: GOLD_BRIGHT, R: RED, B: '#4f8fe8' },
    },
  },

  {
    id: 'shades',
    category: 'shades',
    price: 15,
    art: {
      x: 11,
      y: 14,
      rows: [
        'KKKKKKKKKKKKKKKKKKKKKKKKKKK',
        'KKKKKKKKKK.......KKKKKKKKKK',
        'KWWKKKKKKK.......KWWKKKKKKK',
        'KWKKKKKKKK.......KWKKKKKKKK',
        'KKKKKKKKKK.......KKKKKKKKKK',
        'KKKKKKKKKK.......KKKKKKKKKK',
        'KKKKKKKKKK.......KKKKKKKKKK',
        '.KKKKKKKK.........KKKKKKKK.',
      ],
      palette: { K: INK, W: WHITE },
    },
  },
  {
    // Same shape as the black pair, with a silver frame. (A gold frame vanished into the fur.)
    id: 'aviators',
    category: 'shades',
    price: 25,
    art: {
      x: 11,
      y: 14,
      rows: [
        'SSSSSSSSSSSSSSSSSSSSSSSSSSS',
        'SKKKKKKKKS.......SKKKKKKKKS',
        'SKWWKKKKKS.......SKWWKKKKKS',
        'SKWKKKKKKS.......SKWKKKKKKS',
        'SKKKKKKKKS.......SKKKKKKKKS',
        'SKKKKKKKKS.......SKKKKKKKKS',
        'SKKKKKKKKS.......SKKKKKKKKS',
        '.SSSSSSSS.........SSSSSSSS.',
      ],
      palette: { S: '#dfe6ff', K: INK, W: WHITE },
    },
  },
  {
    id: 'sunset',
    category: 'shades',
    price: 25,
    art: {
      x: 11,
      y: 14,
      rows: [
        'KKKKKKKKKKKKKKKKKKKKKKKKKKK',
        'KCCCCCCCCK.......KCCCCCCCCK',
        'KCWWCCCCCK.......KCWWCCCCCK',
        'KCCCCCCCCK.......KCCCCCCCCK',
        'KPPPPPPPPK.......KPPPPPPPPK',
        'KPPPPPPPPK.......KPPPPPPPPK',
        'KMMMMMMMMK.......KMMMMMMMMK',
        '.KKKKKKKK.........KKKKKKKK.',
      ],
      palette: { K: INK, C: '#4fd8e8', P: PURPLE, M: '#e84fb0', W: WHITE },
    },
  },
  {
    // Eyeglasses: frames only, so the eyes show through.
    id: 'glasses-round',
    category: 'shades',
    price: 15,
    art: {
      x: 11,
      y: 14,
      rows: [
        '..KKKKKK...........KKKKKK..',
        '.K......K.........K......K.',
        'K........KKKKKKKKK........K',
        'K........K.......K........K',
        'K........K.......K........K',
        'K........K.......K........K',
        '.K......K.........K......K.',
        '..KKKKKK...........KKKKKK..',
      ],
      palette: { K: INK },
    },
  },
  {
    id: 'glasses-square',
    category: 'shades',
    price: 15,
    art: {
      x: 11,
      y: 14,
      rows: [
        'RRRRRRRRRR.......RRRRRRRRRR',
        'R........R.......R........R',
        'R........RRRRRRRRR........R',
        'R........R.......R........R',
        'R........R.......R........R',
        'R........R.......R........R',
        'R........R.......R........R',
        'RRRRRRRRRR.......RRRRRRRRRR',
      ],
      palette: { R: RED },
    },
  },

  {
    id: 'bandana',
    category: 'neck',
    price: 0,
    gift: 'quest',
    art: {
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
      palette: { T: TEAL, W: WHITE },
    },
  },
  {
    id: 'scarf',
    category: 'neck',
    price: 15,
    art: {
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
      palette: { R: RED, D: RED_DEEP },
    },
  },
  {
    id: 'bow-tie',
    category: 'neck',
    price: 15,
    art: {
      x: 20,
      y: 32,
      rows: ['PP.......PP', 'PPPP...PPPP', 'PPPPPKPPPPP', 'PPPP...PPPP', 'PP.......PP'],
      palette: { P: PURPLE, K: INK },
    },
  },
  {
    // Gold on golden fur disappears, so the links carry a dark edge and the pendant is a dark
    // medallion with a lion in side view on it.
    id: 'chain',
    category: 'neck',
    price: 30,
    needsPower: 15,
    art: {
      x: 12,
      y: 31,
      rows: [
        'YG.......................GY',
        'KYG.....................GYK',
        '.KYGG.................GGYK.',
        '..KKYGG.............GGYKK..',
        '....KKYGGG.......GGGYKK....',
        '......KKYGGGGGGGGGYKK......',
        '..........GGGGGGG..........',
        '........GGKKKKKKKGG........',
        '.......GKKKKKMMMMKKG.......',
        '.......GKYKKMMMYYYKG.......',
        '.......GKKYYYMMYKYKG.......',
        '.......GKKYYYYMMYKKG.......',
        '.......GKKYKYKKYKYKG.......',
        '........GGKKKKKKKGG........',
        '..........GGGGGGG..........',
      ],
      palette: { G: GOLD, Y: GOLD_BRIGHT, K: INK, M: '#c9601b' },
    },
  },
]

const byId = new Map(accessories.map((item) => [item.id, item]))

export function accessory(id: string): Accessory | undefined {
  return byId.get(id)
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
export function buyBlock(progress: Progress, item: Accessory, others: Progress[] = []): 'gift' | 'power' | 'sparks' | null {
  if (item.gift) return 'gift'
  if (item.needsPower && pridePower(progress, others).level < item.needsPower) return 'power'
  if (sparks(progress).balance < item.price) return 'sparks'
  return null
}

// The ids of what the lion is wearing, limited to pieces it owns.
export function wornIds(progress: Progress, others: Progress[] = []): string[] {
  return categories
    .map((category) => byId.get(progress.wearing[category] ?? ''))
    .filter((item): item is Accessory => item !== undefined && owns(progress, item, others))
    .map((item) => item.id)
}
