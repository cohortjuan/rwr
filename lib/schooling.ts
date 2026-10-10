// The most schooling the player has finished, if they chose to say. It is asked for at the
// Crossroads beside what they make now, and like that it is optional. It keeps the nearest of
// the three paths to work they could step into with what they have, and lets a card say when
// an occupation typically takes more.
//
// The levels are in order, lowest first, and line up with the Bureau of Labor Statistics'
// "typical education needed for entry", so the two can be compared. The order is a
// simplification: a certificate is not "more" than some college in any deep sense.
export const schoolingLevels = ['none', 'hs', 'some', 'cert', 'assoc', 'bach', 'master', 'doctor'] as const
export type Schooling = (typeof schoolingLevels)[number]

// What the player studied or trained in, in their own words.
export const FIELD_MAX = 60

// BLS's wording for what an occupation typically takes, as one of the levels above.
const typical: Record<string, Schooling> = {
  'No formal educational credential': 'none',
  'High school diploma or equivalent': 'hs',
  'Some college, no degree': 'some',
  'Postsecondary nondegree award': 'cert',
  "Associate's degree": 'assoc',
  "Bachelor's degree": 'bach',
  "Master's degree": 'master',
  'Doctoral or professional degree': 'doctor',
}

export function readSchooling(value: unknown): Schooling | null {
  return schoolingLevels.includes(value as Schooling) ? (value as Schooling) : null
}

// Whether an occupation typically takes more schooling than the player has finished. Unknown
// on either side is never called more.
export function takesMore(education: string, has: Schooling | null): boolean {
  const needs = typical[education]
  if (!has || !needs) return false
  return schoolingLevels.indexOf(needs) > schoolingLevels.indexOf(has)
}
