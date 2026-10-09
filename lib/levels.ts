// The four levels of the Ikigai trail, one per circle. Change a name here and it changes
// everywhere (prompts, the server route, and Todah's lines).
//
// Passion, Mission, Vocation, and Profession are deliberately not level names: in the
// Ikigai diagram they are the overlaps between two circles.

export const levels = [
  { number: 1, name: 'Heart', circle: 'what you love' },
  { number: 2, name: 'Craft', circle: 'what you are good at' },
  { number: 3, name: 'Cause', circle: 'what the world needs' },
  { number: 4, name: 'Coin', circle: 'what you can be paid for' },
] as const

export type LevelName = (typeof levels)[number]['name']

// A phase of the interview: one of the four levels, then the Crossroads that ties them together.
export type Phase = LevelName | 'Crossroads'

export const phases: Phase[] = [...levels.map((level) => level.name), 'Crossroads']

// A level's interview is a scripted opening question and then this many follow-ups from the
// AI (or from the script), so this many answers plus one end it.
export const LEVEL_FOLLOW_UPS = 3
export const LEVEL_ANSWERS = LEVEL_FOLLOW_UPS + 1
// One of the follow-ups is a quick round with nothing to type: the game asks it itself, once
// this many answers are in, and the player taps the answer that fits. It breaks up the
// typing, and it asks about the third kind of evidence the level looks for. The other
// follow-ups are Todah's own.
export const LEVEL_TAP_AFTER = 2
export const LEVEL_TYPED_FOLLOW_UPS = LEVEL_FOLLOW_UPS - 1

// The circles whose level interview is built, in the order the levels are walked.
export const liveLevels = ['heart', 'craft', 'cause', 'coin'] as const
export type LiveLevel = (typeof liveLevels)[number]

// "Heart (what you love)", for prompts and labels.
export function describePhase(phase: Phase): string {
  const level = levels.find((candidate) => candidate.name === phase)
  return level ? `${level.name} (${level.circle})` : 'Crossroads (tensions between the four circles, and the main goal)'
}
