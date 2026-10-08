'use client'

import { useSyncExternalStore } from 'react'
import { circles, compassTotal, stepsDone, trailSteps } from '@/lib/compass'
import type { EntryChoice } from '@/lib/lines'
import { DEFAULT_LION_NAME, withLionName } from '@/lib/names'
import { saveSettings, SETTINGS_KEY } from '@/lib/settings'
import { MAX_LEVEL, slots, slotLevel, type Slot, type SlotId } from '@/lib/upgrades'

// Progress lives in this browser's localStorage, or in memory only when the player turns
// "save on this device" off. Account sync to the database comes later.
//
// One game is in play at a time. Starting a new one does not erase the old one: it is set
// aside as a kept lion, and the player can switch back to it from the title screen.

export type ChatMessage = { role: 'user' | 'todah', text: string }

export type TodahForm = 'cub' | 'nomad' | 'leader'

// One of three kinds of work the four circles could point to: the one closest to where the
// player stands, one next door, and a bigger leap. `goal` is a goal on that path they can take
// as their main goal.
export type PathIdea = { kind: 'near' | 'next' | 'wild', name: string, why: string, goal: string }

// The player chooses whether their lion is a lion or a lioness. It decides part of the
// wardrobe: only a lion grows a mane, and some pieces are only for a lioness.
export type LionSex = 'male' | 'female'

// What one player shares with a friend: a small snapshot that travels inside a link or QR
// code and never touches a server. `at` is when the snapshot was made.
export type PrideCard = {
  id: string
  name: string
  lion: string
  form: TodahForm
  power: number
  max: number
  goal: string
  reached: boolean
  at: string
  // What the lion is wearing (accessory tokens) and how grown its mane is, 0 to 3.
  // Missing on cards made before the wardrobe.
  wear?: string[]
  mane?: number
}

// The four Ikigai circles, in the order of the levels: Heart, Craft, Cause, Coin.
export type Circle = 'heart' | 'craft' | 'cause' | 'coin'

// One circle on the trail map: what the player claims, and which evidence they ticked.
export type CircleEntry = { claim: string, evidence: string[] }

// One piece of real-world outreach the player logged: a LinkedIn connection, an email or
// message about a job, a real conversation, or a job interview landed. RWR cannot see any of
// these, so the log is the player's own word. The note is theirs alone and stays on this device.
export type OutreachKind = 'linkedin' | 'message' | 'talk' | 'interview'

// The lion's wardrobe. One accessory from each category can be worn at a time.
export type AccessoryCategory = 'fur' | 'mane' | 'essentials' | 'hat' | 'shades' | 'ears' | 'neck' | 'body' | 'bag' | 'outfit'
export type Outreach = { id: string, kind: OutreachKind, note: string, at: string }

// Dev tools, for a dev account only (see lib/account.ts): look at any stage of the game without
// playing up to it. Nothing here adds to Pride Power.
export type DevOverrides = {
  // Every accessory counts as owned.
  unlockAll: boolean
  // The mane's size and Todah's form, or null to follow the game.
  mane: number | null
  form: TodahForm | null
}

// The road toward the main goal: the obstacle the player expects, their if-then plan for it,
// and a few small real-world experiments. Each experiment tests one circle. When one is done,
// the player says how it went (`note`) and Todah answers once (`reply`).
export type RoadStep = { circle: Circle, text: string, doneAt: string | null, note: string, reply: string }
export type Road = { obstacle: string, plan: string, steps: RoadStep[] }

// What someone who knows the player said they would come to them for. It arrives in a link
// the friend sends back, like a cheer. `key` stops the same link being counted twice.
export type Witness = { key: string, name: string, text: string, at: string }

// Todah's note: the last thing in the game, written once when the goal is reached. `text` is
// the middle of the note (the game adds the greeting and the paw print). `scripted` means it
// was put together from the player's own words without the AI.
export type Letter = { text: string, at: string, scripted: boolean, rewrites: number }

// A preset cheer a friend sent. `key` stops the same link from being counted twice.
export type CheerReceived = { key: string, name: string, cheer: string, at: string }

export type Progress = {
  // The guide's name in this game. Todah unless the player renamed their lion.
  lionName: string
  lionSex: LionSex
  playerName: string
  entryChoice: EntryChoice | null
  onboardingDone: boolean
  // null until the player answers the consent question before the first AI reply.
  aiConsent: 'yes' | 'no' | null
  onboardingChat: ChatMessage[]
  upgrades: Partial<Record<SlotId, string>>
  goalText: string
  goalAchievedAt: string | null
  // Tips on the upgrades screen that the player has already dismissed in this game.
  tipsSeen: string[]
  // My Pride. cardId names this lion's card (made the first time the page opens), shareGoal
  // says whether the card carries the main goal, and pride holds the friends' cards.
  cardId: string
  shareGoal: boolean
  pride: PrideCard[]
  cheersReceived: CheerReceived[]
  cheersSent: number
  outreach: Outreach[]
  // Accessories bought with sparks, and the one worn in each category (see lib/accessories.ts).
  bought: string[]
  wearing: Partial<Record<AccessoryCategory, string>>
  // The colour option chosen for an accessory, by its id.
  tones: Record<string, string>
  // The trail map (see lib/compass.ts): a claim and its evidence for each circle, the needs
  // the player picked for Cause, and the real-world steps they have done.
  compass: Record<Circle, CircleEntry>
  needs: string[]
  stepsDone: string[]
  // The level interviews (see components/LevelQuest.tsx): what was said in each, and which
  // are finished. Like the Quest 1 chat, this stays on the device.
  levelChat: Partial<Record<Circle, ChatMessage[]>>
  levelsDone: Circle[]
  // What Todah said at the Crossroads, kept so it is asked for once. `for` is the four claims
  // it was about: if they change, it is asked for again.
  crossroads: { text: string, for: string } | null
  // The three paths Todah laid out at the Crossroads, kept so they are asked for once. `for`
  // is the four claims they were built from, and `chosen` the one the player took as a goal.
  paths: { for: string, list: PathIdea[], chosen: PathIdea['kind'] | null } | null
  // What Todah said about the main goal once it was set, kept so it is asked for once. `for`
  // is the goal it was about: a new goal gets new thoughts.
  goalThoughts: { text: string, for: string } | null
  road: Road | null
  witnesses: Witness[]
  letter: Letter | null
  // null in every game except one a dev account has switched dev tools on for.
  dev: DevOverrides | null
}

// A game that was set aside when the player started a new lion.
export type KeptLion = { id: string, keptAt: string, progress: Progress }

const KEY = 'rwr.progress.v1'
const LIONS_KEY = 'rwr.lions.v1'

export const emptyProgress: Progress = {
  lionName: DEFAULT_LION_NAME,
  lionSex: 'male',
  playerName: '',
  entryChoice: null,
  onboardingDone: false,
  aiConsent: null,
  onboardingChat: [],
  upgrades: {},
  goalText: '',
  goalAchievedAt: null,
  tipsSeen: [],
  cardId: '',
  shareGoal: true,
  pride: [],
  cheersReceived: [],
  cheersSent: 0,
  outreach: [],
  bought: [],
  wearing: {},
  tones: {},
  compass: {
    heart: { claim: '', evidence: [] },
    craft: { claim: '', evidence: [] },
    cause: { claim: '', evidence: [] },
    coin: { claim: '', evidence: [] },
  },
  needs: [],
  stepsDone: [],
  levelChat: {},
  levelsDone: [],
  crossroads: null,
  paths: null,
  goalThoughts: null,
  road: null,
  witnesses: [],
  letter: null,
  dev: null,
}

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cached: Progress = emptyProgress

function readRaw(key = KEY): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

// Memory-only mode: nothing about the game is written to this device.
let memory: Progress = emptyProgress
let memoryLions: KeptLion[] = []

function memoryOnly(): boolean {
  try {
    return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}').saveOnDevice === false
  } catch {
    return false
  }
}

function getSnapshot(): Progress {
  if (memoryOnly()) return memory
  const raw = readRaw()
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    cached = raw ? { ...emptyProgress, ...JSON.parse(raw) } : emptyProgress
  } catch {
    cached = emptyProgress
  }
  return cached
}

function getServerSnapshot(): Progress {
  return emptyProgress
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function emit() {
  listeners.forEach((listener) => listener())
}

export function saveProgress(patch: Partial<Progress>) {
  const next = { ...getSnapshot(), ...patch }
  if (memoryOnly()) {
    memory = next
    emit()
    return
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage can be blocked (private windows). The game still runs for this page view.
    cachedRaw = null
    cached = next
  }
  emit()
}

const noLions: KeptLion[] = []
let lionsRaw: string | null = null
let lionsCached: KeptLion[] = noLions

function getLions(): KeptLion[] {
  if (memoryOnly()) return memoryLions
  const raw = readRaw(LIONS_KEY)
  if (raw === lionsRaw) return lionsCached
  lionsRaw = raw
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : []
    lionsCached = Array.isArray(parsed)
      ? (parsed as KeptLion[]).map((lion) => ({ ...lion, progress: { ...emptyProgress, ...lion.progress } }))
      : noLions
  } catch {
    lionsCached = noLions
  }
  return lionsCached
}

function saveLions(next: KeptLion[]) {
  if (memoryOnly()) {
    memoryLions = next
    return
  }
  try {
    window.localStorage.setItem(LIONS_KEY, JSON.stringify(next))
  } catch {
    lionsRaw = null
    lionsCached = next
  }
}

function keep(progress: Progress): KeptLion {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return { id, keptAt: new Date().toISOString(), progress }
}

// A game is worth keeping once the player has given a name, to themselves or to the lion,
// or has friends in its pride.
function worthKeeping(progress: Progress): boolean {
  return hasSavedGame(progress) || progress.lionName !== DEFAULT_LION_NAME || progress.pride.length > 0
}

// Starts a fresh game with a new lion. The game in play is kept, not erased.
export function startNewLion(lionName: string, lionSex: LionSex = 'male') {
  const current = getSnapshot()
  if (worthKeeping(current)) saveLions([...getLions(), keep(current)])
  saveProgress({ ...emptyProgress, lionName, lionSex })
}

// Swaps a kept lion back into play, and keeps the game that was in play.
export function switchToLion(id: string) {
  const lions = getLions()
  const chosen = lions.find((lion) => lion.id === id)
  if (!chosen) return
  const current = getSnapshot()
  const others = lions.filter((lion) => lion.id !== id)
  saveLions(worthKeeping(current) ? [...others, keep(current)] : others)
  saveProgress(chosen.progress)
}

// Removes the game in play and every kept lion from this device.
export function clearProgress() {
  memory = emptyProgress
  memoryLions = []
  try {
    window.localStorage.removeItem(KEY)
    window.localStorage.removeItem(LIONS_KEY)
  } catch {
    cachedRaw = null
    cached = emptyProgress
    lionsRaw = null
    lionsCached = noLions
  }
  emit()
}

// Turning saving off moves the current game and the kept lions into memory and wipes the
// saved copies. Turning it back on writes them to this device again.
export function setSaveOnDevice(on: boolean) {
  const current = getSnapshot()
  const lions = getLions()
  if (on) {
    saveSettings({ saveOnDevice: true })
    saveLions(lions)
    saveProgress(current)
    return
  }
  memory = current
  memoryLions = lions
  try {
    window.localStorage.removeItem(KEY)
    window.localStorage.removeItem(LIONS_KEY)
  } catch {
    // Nothing was saved, so there is nothing to remove.
  }
  saveSettings({ saveOnDevice: false })
  emit()
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useKeptLions(): KeptLion[] {
  return useSyncExternalStore(subscribe, getLions, () => noLions)
}

// Rewrites a canned line so it uses the name of the lion in play.
export function useLionText(): (text: string) => string {
  const { lionName } = useProgress()
  return (text) => withLionName(text, lionName)
}

// A real conversation or an interview is worth more than a message sent.
export const outreachWorth: Record<OutreachKind, number> = { linkedin: 1, message: 1, talk: 2, interview: 2 }

// Cheers that earn sparks. To make farming pointless, a cheer counts only from someone whose
// card is in the pride, and once per friend per day.
export function countedCheers(progress: Progress): number {
  const friends = new Set(progress.pride.map((card) => card.id))
  const counted = new Set<string>()
  for (const cheer of progress.cheersReceived) {
    const sender = cheer.key.split(':')[0]
    if (friends.has(sender)) counted.add(`${sender}:${cheer.at.slice(0, 10)}`)
  }
  return counted.size
}

// The connections behind the Pride slot: friends who joined and outreach logged. Cheers do
// not count here. They earn sparks for the wardrobe instead.
export function connections(progress: Progress): { friends: number, outreach: number, total: number } {
  const friends = progress.pride.length
  const outreach = progress.outreach.reduce((sum, entry) => sum + (outreachWorth[entry.kind] ?? 0), 0)
  return { friends, outreach, total: friends + outreach }
}

// A lion is a career path explored once it has a main goal and some evidence on its trail
// map. Starting a new game is not enough.
export const PATH_EVIDENCE = 3

export function isPath(progress: Progress): boolean {
  return progress.goalText.trim().length > 0 && compassTotal(progress).score >= PATH_EVIDENCE
}

const tally = (count: number) => Array.from({ length: count }, () => 'x').join('\n')

// What a slot is levelled from. Most slots hold what the player typed. Two are tallies, one
// line per thing counted: Pride counts connections, and Den counts the career paths explored
// across every lion (`others` is the progress of the player's other lions).
export function slotContent(progress: Progress, slot: Slot, others: Progress[] = []): string {
  if (slot.id === 'pride') return tally(connections(progress).total)
  if (slot.id === 'den') return tally([progress, ...others].filter(isPath).length)
  return progress.upgrades[slot.id] ?? ''
}

// One-off milestones. The last is the roar itself, and it is worth the most.
export const milestones = [
  { id: 'quest', worth: 1, met: (progress: Progress) => progress.onboardingDone },
  { id: 'goal', worth: 1, met: (progress: Progress) => progress.goalText.trim().length > 0 },
  { id: 'claims', worth: 1, met: (progress: Progress) => circles.every((circle) => progress.compass[circle].claim.trim().length > 0) },
  { id: 'cheer', worth: 1, met: (progress: Progress) => progress.cheersSent > 0 },
  { id: 'roar', worth: 3, met: (progress: Progress) => Boolean(progress.goalAchievedAt) },
] as const

// A real-world trail step is worth more than a level typed at a desk.
export const STEP_WORTH = 2

export type PowerPart = { id: 'slots' | 'map' | 'steps' | 'milestones', level: number, max: number }

// Where Pride Power comes from. With all seven slots live it adds up to 50:
// 21 from upgrade levels, 12 from trail map evidence, 10 from real-world steps (2 each),
// and 7 from milestones (the roar is worth 3).
export function powerParts(progress: Progress, others: Progress[] = []): PowerPart[] {
  const live = slots.filter((slot) => !slot.locked)
  const map = compassTotal(progress)
  return [
    {
      id: 'slots',
      level: live.reduce((sum, slot) => sum + slotLevel(slot, slotContent(progress, slot, others)), 0),
      max: live.length * MAX_LEVEL,
    },
    { id: 'map', level: map.score, max: map.max },
    { id: 'steps', level: stepsDone(progress) * STEP_WORTH, max: trailSteps.length * STEP_WORTH },
    {
      id: 'milestones',
      level: milestones.reduce((sum, milestone) => sum + (milestone.met(progress) ? milestone.worth : 0), 0),
      max: milestones.reduce((sum, milestone) => sum + milestone.worth, 0),
    },
  ]
}

// Pride Power, and the most that can be earned.
export function pridePower(progress: Progress, others: Progress[] = []): { level: number, max: number } {
  const parts = powerParts(progress, others)
  return {
    level: parts.reduce((sum, part) => sum + part.level, 0),
    max: parts.reduce((sum, part) => sum + part.max, 0),
  }
}

export function hasSavedGame(progress: Progress): boolean {
  return progress.playerName.trim().length > 0
}

// Todah's form follows what the player has built, never how much they have chatted.
// Nomad: onboarding done and at least two upgrade slots started.
// Pride Leader: only after the player confirms their main goal is reached.
export function todahForm(progress: Progress, others: Progress[] = []): TodahForm {
  if (progress.dev?.form) return progress.dev.form
  if (progress.goalAchievedAt) return 'leader'
  const started = slots.filter((slot) => slotLevel(slot, slotContent(progress, slot, others)) > 0).length
  if (progress.onboardingDone && started >= 2) return 'nomad'
  return 'cub'
}
