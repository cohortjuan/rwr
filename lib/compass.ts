import type { Circle, Progress } from '@/lib/progress'

// The trail map: how much evidence the player has in each of the four Ikigai circles.
//
// A circle is scored 0 to 3. The player writes a claim ("I love fixing things") and ticks the
// evidence that is true of it. A claim with no evidence scores 0, so the map rewards proof,
// not confidence. It never names a "best career": it shows the strongest and thinnest
// circles and one small real-world step to test the thinnest.

export const circles: Circle[] = ['heart', 'craft', 'cause', 'coin']
export const EVIDENCE_MAX = 3
export const NEEDS_MAX = 3

// Real-world steps. One tests each circle, and the last is for telling someone.
// Each step done adds one Pride Power.
export const trailSteps = [...circles, 'tell'] as const
export type TrailStep = (typeof trailSteps)[number]

export function circleScore(progress: Progress, circle: Circle): number {
  const entry = progress.compass[circle]
  return entry.claim.trim() ? Math.min(entry.evidence.length, EVIDENCE_MAX) : 0
}

export function compassTotal(progress: Progress): { score: number, max: number } {
  const score = circles.reduce((sum, circle) => sum + circleScore(progress, circle), 0)
  return { score, max: circles.length * EVIDENCE_MAX }
}

// The circle with the most evidence, once there is any.
export function strongestCircle(progress: Progress): Circle | null {
  const best = [...circles].sort((a, b) => circleScore(progress, b) - circleScore(progress, a))[0]
  return circleScore(progress, best) > 0 ? best : null
}

// The circle with the least evidence, or null when every circle is full.
export function thinnestCircle(progress: Progress): Circle | null {
  const worst = [...circles].sort((a, b) => circleScore(progress, a) - circleScore(progress, b))[0]
  return circleScore(progress, worst) < EVIDENCE_MAX ? worst : null
}

export function stepsDone(progress: Progress): number {
  return trailSteps.filter((step) => progress.stepsDone.includes(step)).length
}
