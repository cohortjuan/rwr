// What the player makes in a year now, from all their work, in dollars. It is asked for at
// the Crossroads and is optional. Its one use is to keep the three paths from pointing at work
// that would pay them less.
export const PAY_NOW_MAX = 1000000
export const PAY_NOW_DIGITS = 9

// A path is close enough when the middle of its rough range is at least this share of what
// the player makes now. The ranges are rough, so an exact match is not asked for.
const PAY_CLOSE = 0.9

// What was typed in the box, as a whole number of dollars: "$45,000" and "45000" are the same.
// Empty, zero, or anything that is not a sensible yearly amount is null, which means not said.
export function readPayNow(value: unknown): number | null {
  const digits = typeof value === 'number' ? String(Math.round(value)) : typeof value === 'string' ? value.split('.')[0].replace(/\D/g, '') : ''
  if (!digits || digits.length > PAY_NOW_DIGITS) return null
  const dollars = Number(digits)
  return dollars > 0 && dollars <= PAY_NOW_MAX ? dollars : null
}

// Whether a path's rough range falls short of what the player makes now. A path with no range
// cannot be judged, so it is not called short.
export function paysLess(pay: { low: number, high: number } | null | undefined, payNow: number | null): boolean {
  if (!pay || !payNow) return false
  return (pay.low + pay.high) / 2 < payNow * PAY_CLOSE
}
