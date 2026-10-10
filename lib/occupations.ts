// The real occupations the three paths are picked from, with what each pays, what it takes to
// get in, and its outlook. Server only: the list is large and no screen needs all of it.
// The figures are the U.S. Bureau of Labor Statistics' own, built into data/occupations.json
// by scripts/jobs-data.py. Nothing here comes from the AI.
import data from '@/data/occupations.json'
import { PAY_CLOSE, paysLess } from '@/lib/pay'
import type { PathIdea } from '@/lib/progress'
import { takesMore, type Schooling } from '@/lib/schooling'

export type Occupation = (typeof data.occupations)[number]

// The player is an adult who needs work that pays the bills, so occupations whose median pay
// is under this are never offered. Half of the people in an occupation earn less than its
// median.
export const PAY_FLOOR = 40000
// A list this short goes to the model whole. A longer one is narrowed to a few groups first,
// which keeps the request small enough for the free AI service.
export const POOL_WHOLE = 150
// When the player makes more than nearly every occupation pays, the best-paid are offered
// anyway and marked as paying less.
const POOL_LEAST = 30
export const GROUPS_MOST = 5

// Every occupation the player could be offered: at or above the floor, and paying about what
// they make now or more.
export function poolFor(payNow: number | null): Occupation[] {
  const least = Math.max(PAY_FLOOR, payNow ? payNow * PAY_CLOSE : 0)
  const pool = data.occupations.filter((occupation) => occupation.median >= least)
  if (pool.length >= POOL_LEAST) return pool
  return [...data.occupations].sort((one, other) => other.median - one.median).slice(0, POOL_LEAST)
}

export const groupOf = (occupation: Occupation) => occupation.code.slice(0, 2)

// The groups that have something in the pool, as lines for the model: "35 Food preparation
// and serving related".
export function groupLines(pool: Occupation[]): string {
  return data.groups
    .filter((group) => pool.some((occupation) => groupOf(occupation) === group.code))
    .map((group) => `${group.code} ${group.name}`)
    .join('\n')
}

// The mark on an occupation that typically takes more schooling than the player has finished.
export const MORE_MARK = '+'

// Occupations as lines for the model: "35-1011 Chefs and head cooks". When the player said
// what schooling they have, the ones that typically take more end with the mark. The model
// sees the mark and never the level itself.
export function occupationLines(pool: Occupation[], schooling: Schooling | null): string {
  return pool
    .map((occupation) => `${occupation.code} ${occupation.title}${takesMore(occupation.education, schooling) ? ` ${MORE_MARK}` : ''}`)
    .join('\n')
}

// What a path card shows about an occupation, all of it from the data. `pay` is what the
// lower-paid quarter and the higher-paid quarter earn, so half of all workers fall inside it.
export function factsFor(occupation: Occupation, payNow: number | null, schooling: Schooling | null): Omit<PathIdea, 'kind' | 'why' | 'goal'> {
  return {
    name: occupation.title,
    code: occupation.code,
    pay: { low: occupation.low, high: occupation.high },
    median: occupation.median,
    education: occupation.education,
    experience: occupation.experience,
    training: occupation.training,
    growth: occupation.growth,
    openings: occupation.openings,
    figures: { wageYear: data.source.wageYear, to: data.source.projected.to, allJobsGrowth: data.source.allJobsGrowth },
    ...(paysLess(occupation.median, payNow) ? { less: true } : {}),
    ...(takesMore(occupation.education, schooling) ? { more: true } : {}),
  }
}
