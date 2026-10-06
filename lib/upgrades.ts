// Lion upgrade slots: the resume builder, dressed as an RPG equipment screen.
// Each slot levels up from the thing it stands for, never from chatting alone.
//
// Levels are earned by what an entry says, not by how long it is. Each level asks for one
// more kind of proof (what you did, what came of it), which is also what makes a resume line
// stronger. The checks are simple on purpose and say plainly what they look for.

export type SlotId = 'mane' | 'claws' | 'paws' | 'tracks' | 'instincts' | 'den' | 'pride'

// One level of a slot: the rule shown to the player, and the test for it.
export type Check = { rule: string, met: (content: string) => boolean }

export type Slot = {
  id: SlotId
  name: string
  resumeTerm: string
  locked: boolean
  // What the player types.
  prompt: string
  placeholder: string
  // One check per level, in order. A level counts only once the ones before it are met.
  checks: [Check, Check, Check]
  // What visibly changes on Todah (the overlay art comes later).
  growth: string
  suggestions: string[]
  // A slot with its own page opens that page instead of the typing sheet.
  page?: string
  // A tally slot is counted, not typed: its sheet shows what is counted and has no text box.
  tally?: boolean
}

export const MAX_LEVEL = 3

// Connections needed for each level of the Pride slot. The last one is meant to take weeks
// of steady outreach, not an afternoon.
export const PRIDE_LEVELS = [3, 10, 25]

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length
const sentences = (text: string) => text.split(/[.!?]+/).filter((part) => words(part) >= 3).length
// Skills are separated by commas or new lines. A comma inside brackets belongs to the proof.
const chips = (content: string) => content.split(/,(?![^(]*\))|\n/).map((s) => s.trim()).filter(Boolean)
const entries = (content: string) => content.split('\n').map((s) => s.trim()).filter(Boolean)

// A number that measures something. Years (1990, 2024) are dates, not results.
const hasResult = (text: string) => /\d/.test(text.replace(/\b(19|20)\d{2}\b/g, ''))
const hasYear = (text: string) => /\b(19|20)\d{2}\b/.test(text)
// Proof in brackets after a skill, such as "SQL (weekly sales reports)".
const hasProof = (text: string) => /\([^)]*\S+\s+\S+[^)]*\)/.test(text)
const proven = (content: string) => chips(content).filter(hasProof).length
// A full job line names the role and place and gives the years.
const fullJob = (line: string) => hasYear(line) && words(line) >= 4
const count = (content: string, test: (line: string) => boolean) => entries(content).filter(test).length

export const slots: Slot[] = [
  {
    id: 'mane',
    name: 'MANE',
    resumeTerm: 'Headline and summary',
    locked: false,
    prompt: 'Who are you at work, in a sentence or three?',
    placeholder: 'Support specialist moving into UX research...',
    checks: [
      { rule: 'Say who you are at work in one full sentence.', met: (content) => words(content) >= 5 },
      { rule: 'Add a second sentence on where you are headed.', met: (content) => sentences(content) >= 2 },
      { rule: 'Add one proof with a number in it, like "cut wait times by 30%".', met: hasResult },
    ],
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
    placeholder: 'Spreadsheets, SQL (weekly sales reports), Figma (redesigned our intake form)',
    checks: [
      { rule: 'List three skills.', met: (content) => chips(content).length >= 3 },
      { rule: 'Back two of them with proof in brackets, like "SQL (weekly sales reports)".', met: (content) => proven(content) >= 2 },
      { rule: 'List five skills, with proof for three.', met: (content) => chips(content).length >= 5 && proven(content) >= 3 },
    ],
    growth: 'The claws sharpen and start to glow.',
    suggestions: [
      'Tools you use weekly, software you could teach a friend, anything you hold a certificate for.',
      'Proof can be small: a thing you built, fixed, or were trusted with.',
    ],
  },
  {
    id: 'paws',
    name: 'PAWS',
    resumeTerm: 'Work experience',
    locked: false,
    prompt: 'One job per line: role, place, years. Then what you did and what came of it.',
    placeholder: 'Shift lead, Corner Cafe, 2022-2024. Trained 6 new starters.',
    checks: [
      { rule: 'Add two jobs, each with role, place and years.', met: (content) => count(content, fullJob) >= 2 },
      { rule: 'On both, say what you did there.', met: (content) => count(content, (line) => words(line) >= 10) >= 2 },
      { rule: 'Give two jobs a result with a number, like "trained 6 new starters".', met: (content) => count(content, hasResult) >= 2 },
    ],
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
    placeholder: 'Google UX Certificate, 2025. Ran my first usability test.',
    checks: [
      { rule: 'Add two courses, degrees or certificates, each with its year.', met: (content) => count(content, hasYear) >= 2 },
      { rule: 'On two of them, say what it lets you do now.', met: (content) => count(content, (line) => words(line) >= 8) >= 2 },
      {
        rule: 'Add a third, with its year and what it lets you do.',
        met: (content) => count(content, (line) => hasYear(line) && words(line) >= 8) >= 3,
      },
    ],
    growth: 'A longer trail of prints behind him.',
    suggestions: [
      '[Credential], [School or provider], [Year]. Now I can [what it lets you do].',
      'Short courses and self-taught study belong here too.',
    ],
  },
  {
    id: 'instincts',
    name: 'INSTINCTS',
    resumeTerm: 'Soft skills and communication',
    locked: false,
    prompt: 'List your soft skills, each with a moment that shows it.',
    placeholder: 'Patience (calmed an upset caller), Clear writing (rewrote our help page)',
    checks: [
      { rule: 'List two soft skills.', met: (content) => chips(content).length >= 2 },
      { rule: 'Back one with a moment in brackets, like "Patience (calmed an upset caller)".', met: (content) => proven(content) >= 1 },
      { rule: 'List three soft skills, with a moment for two of them.', met: (content) => chips(content).length >= 3 && proven(content) >= 2 },
    ],
    growth: 'Eyes and ears sharpen.',
    suggestions: [
      'Think of a time someone thanked you. What did you do that helped?',
      'A moment is one short story: what happened and what you did.',
    ],
  },
  {
    // Levelled from the career paths explored across the player's lions (see slotContent).
    id: 'den',
    name: 'DEN',
    resumeTerm: 'Career paths explored',
    locked: false,
    prompt: '',
    placeholder: '',
    checks: [
      { rule: 'Explore one path: a lion with a main goal and evidence on its trail map.', met: (content) => entries(content).length >= 1 },
      { rule: 'Explore a second path with another lion.', met: (content) => entries(content).length >= 2 },
      { rule: 'Explore three paths, so you can compare them side by side.', met: (content) => entries(content).length >= 3 },
    ],
    growth: 'The den fills in behind him.',
    suggestions: [],
    tally: true,
  },
  {
    // Levelled from connections: friends, outreach logged, cheers received (see slotContent).
    id: 'pride',
    name: 'PRIDE',
    resumeTerm: 'References and network',
    locked: false,
    prompt: '',
    placeholder: '',
    checks: [
      { rule: `Make ${PRIDE_LEVELS[0]} connections.`, met: (content) => entries(content).length >= PRIDE_LEVELS[0] },
      { rule: `Reach ${PRIDE_LEVELS[1]} connections.`, met: (content) => entries(content).length >= PRIDE_LEVELS[1] },
      { rule: `Reach ${PRIDE_LEVELS[2]} connections.`, met: (content) => entries(content).length >= PRIDE_LEVELS[2] },
    ],
    growth: 'Companion lions appear.',
    suggestions: [],
    page: '/pride',
  },
]

// How many levels in a row are earned, starting from the first.
export function slotLevel(slot: Slot, content: string): number {
  if (slot.locked) return 0
  const firstMissed = slot.checks.findIndex((check) => !check.met(content))
  return firstMissed === -1 ? slot.checks.length : firstMissed
}
