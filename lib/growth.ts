import { liveLevels } from '@/lib/levels'
import type { Progress } from '@/lib/progress'
import { slotLevel, slots } from '@/lib/upgrades'

// How grown the lion is: the size of a lion's mane, or the glow of a lioness's aura, 0 to 3.
//
// Typing a strong headline into the MANE upgrade is not enough on its own, or the mane would
// be full a minute into the game. Each size needs two things: the MANE upgrade at that level,
// and the matching stretch of the journey behind it. The size is the lower of the two, so
// the mane grows as the player walks the trail, never ahead of them.
//
// The roar grows him up whatever else is true: once the goal is reached the mane is full.
// Nothing here is stored. It is read from the saved game every time.

// Experiments on the road (see components/RoadScreen.tsx) done before the full mane.
export const ROAD_EXPERIMENTS = 2

export type GrowthGate = { id: 'quest' | 'levels' | 'road', met: (progress: Progress) => boolean }

export function experimentsDone(progress: Progress): number {
  return progress.road?.steps.filter((step) => step.doneAt).length ?? 0
}

// One stretch of the journey per size, in order.
export const growthGates: GrowthGate[] = [
  { id: 'quest', met: (progress) => progress.onboardingDone },
  { id: 'levels', met: (progress) => liveLevels.every((circle) => progress.levelsDone.includes(circle)) },
  {
    id: 'road',
    met: (progress) => progress.goalText.trim().length > 0 && experimentsDone(progress) >= ROAD_EXPERIMENTS,
  },
]

export const GROWTH_MAX = growthGates.length

// Todah becomes a Nomad when he reaches this size: halfway along the trail.
export const NOMAD_GROWTH = 2

const maneSlot = slots.find((slot) => slot.id === 'mane')

export function headlineLevel(progress: Progress): number {
  return maneSlot ? slotLevel(maneSlot, progress.upgrades.mane ?? '') : 0
}

// How many stretches of the journey are behind the player, counted in order.
export function journeyStage(progress: Progress): number {
  const firstMissed = growthGates.findIndex((gate) => !gate.met(progress))
  return firstMissed === -1 ? growthGates.length : firstMissed
}

// The size the player has earned. Dev tools can show another (see lionLook), but never here.
export function growth(progress: Progress): number {
  if (progress.goalAchievedAt) return GROWTH_MAX
  return Math.min(headlineLevel(progress), journeyStage(progress))
}
