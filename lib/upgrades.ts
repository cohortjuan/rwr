// Lion upgrade slots: the resume builder, dressed as an RPG equipment screen.
// Each slot levels up from the thing it stands for, never from chatting alone.

export type SlotId = 'mane' | 'claws' | 'paws' | 'tracks' | 'instincts' | 'den' | 'pride'

export type Slot = {
  id: SlotId
  name: string
  resumeTerm: string
  locked: boolean
  // What the player types and how it is counted toward a level.
  prompt: string
  placeholder: string
  levelRule: string
  thresholds: [number, number, number]
  count: (content: string) => number
  // What visibly changes on Todah (the overlay art comes later).
  growth: string
  suggestions: string[]
}

const words = (content: string) => content.trim().split(/\s+/).filter(Boolean).length
const chips = (content: string) => content.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).length
const entries = (content: string) => content.split('\n').map((s) => s.trim()).filter(Boolean).length

export const MAX_LEVEL = 3

export const slots: Slot[] = [
  {
    id: 'mane',
    name: 'MANE',
    resumeTerm: 'Headline and summary',
    locked: false,
    prompt: 'Who are you at work, in a sentence or three?',
    placeholder: 'Support specialist moving into UX research...',
    levelRule: 'Grows with the words in your summary (1, 15, 30).',
    thresholds: [1, 15, 30],
    count: words,
    growth: 'The mane grows through three sizes.',
    suggestions: [
      '[Current role] moving toward [target role], with a track record of [one strength].',
      'I help [who] do [what] by [how]. Now looking for [kind of work].',
    ],
  },
  {
    id: 'claws',
    name: 'CLAWS',
    resumeTerm: 'Hard skills',
    locked: false,
    prompt: 'List your hard skills, separated by commas.',
    placeholder: 'Spreadsheets, SQL, Figma',
    levelRule: 'Sharpens with each skill you list (1, 3, 6).',
    thresholds: [1, 3, 6],
    count: chips,
    growth: 'The claws sharpen and start to glow.',
    suggestions: [
      'Tools you use weekly, software you could teach a friend, anything you hold a certificate for.',
    ],
  },
  {
    id: 'paws',
    name: 'PAWS',
    resumeTerm: 'Work experience',
    locked: false,
    prompt: 'One job per line: role, place, years.',
    placeholder: 'Shift lead, Corner Cafe, 2022-2024',
    levelRule: 'Steadier with each job you add (1, 2, 3).',
    thresholds: [1, 2, 3],
    count: entries,
    growth: 'Bigger, steadier paws for the ground you have covered.',
    suggestions: [
      '[Role], [Employer], [Years]. Did [action] which led to [result].',
      'Unpaid and volunteer work counts. So does caring for family.',
    ],
  },
  {
    id: 'tracks',
    name: 'TRACKS',
    resumeTerm: 'Education and certifications',
    locked: false,
    prompt: 'One course, degree, or certificate per line.',
    placeholder: 'Google UX Certificate, 2025',
    levelRule: 'A longer trail with each one you add (1, 2, 3).',
    thresholds: [1, 2, 3],
    count: entries,
    growth: 'A longer trail of prints behind him.',
    suggestions: [
      '[Credential], [School or provider], [Year].',
      'Short courses and self-taught study belong here too.',
    ],
  },
  {
    id: 'instincts',
    name: 'INSTINCTS',
    resumeTerm: 'Soft skills and communication',
    locked: true,
    prompt: '',
    placeholder: '',
    levelRule: '',
    thresholds: [1, 2, 3],
    count: chips,
    growth: 'Eyes and ears sharpen.',
    suggestions: [],
  },
  {
    id: 'den',
    name: 'DEN',
    resumeTerm: 'Projects and portfolio',
    locked: true,
    prompt: '',
    placeholder: '',
    levelRule: '',
    thresholds: [1, 2, 3],
    count: entries,
    growth: 'The den fills in behind him.',
    suggestions: [],
  },
  {
    id: 'pride',
    name: 'PRIDE',
    resumeTerm: 'References and network',
    locked: true,
    prompt: '',
    placeholder: '',
    levelRule: '',
    thresholds: [1, 2, 3],
    count: entries,
    growth: 'Companion lions appear.',
    suggestions: [],
  },
]

export function slotLevel(slot: Slot, content: string): number {
  if (slot.locked) return 0
  const n = slot.count(content)
  return slot.thresholds.filter((t) => n >= t).length
}
