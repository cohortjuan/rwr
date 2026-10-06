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

// "Heart (what you love)", for prompts and labels.
export function describePhase(phase: Phase): string {
  const level = levels.find((candidate) => candidate.name === phase)
  return level ? `${level.name} (${level.circle})` : 'Crossroads (tensions between the four circles, and the main goal)'
}
