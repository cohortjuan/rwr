// What the player makes in a year now, from all their work, in dollars. It is asked for at
// the Crossroads and is optional. Its one use is to keep the three paths from pointing at work
// that would pay them less.
export const PAY_NOW_MAX = 1000000
export const PAY_NOW_DIGITS = 9

// An occupation is close enough when its median pay is at least this share of what the player
// makes now. Half of the people in it earn more than the median, so an exact match is not
// asked for.
export const PAY_CLOSE = 0.9

// What was typed in the box, as a whole number of dollars: "$45,000" and "45000" are the same.
// Empty, zero, or anything that is not a sensible yearly amount is null, which means not said.
export function readPayNow(value: unknown): number | null {
  const digits = typeof value === 'number' ? String(Math.round(value)) : typeof value === 'string' ? value.split('.')[0].replace(/\D/g, '') : ''
  if (!digits || digits.length > PAY_NOW_DIGITS) return null
  const dollars = Number(digits)
  return dollars > 0 && dollars <= PAY_NOW_MAX ? dollars : null
}

// Whether an occupation's median pay falls short of what the player makes now.
export function paysLess(median: number, payNow: number | null): boolean {
  return payNow !== null && median < payNow * PAY_CLOSE
}
