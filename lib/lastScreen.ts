'use client'

import { useSyncExternalStore } from 'react'

// Where the player has been, so every screen can offer the way back.
//
// Two things are kept, both for the tab's lifetime so a reload does not lose them:
// - the trail: the screens walked through, in order. The back arrow in the corner of every
//   screen returns to the one before (see components/SettingsToggles.tsx).
// - the last screen of the game itself. ABOUT, PRIVACY and DEV are beside the game and are
//   reached from every screen, so their own BACK button returns there.

// Pages that are beside the game, not part of it. They are never remembered as the game
// screen to go back to, so going from one of them to another still leads back to the game.
const SIDE_PAGES = ['/about', '/privacy', '/dev']
const KEY = 'rwr.lastScreen'
const TRAIL_KEY = 'rwr.trail'
// More than anyone walks in one sitting. Older steps fall off the far end.
const TRAIL_MAX = 40
// Where the way back leads when nothing is remembered.
const START = '/'

// The screen above each screen. The back arrow goes here when there is no earlier screen to
// return to: a first visit that lands in the middle of the game, say from a bookmark.
const PARENTS: Record<string, string> = {
  '/quest': '/',
  '/upgrades': '/',
  '/map': '/upgrades',
  '/wardrobe': '/upgrades',
  '/lookbook': '/wardrobe',
  '/pride': '/upgrades',
  '/witness': '/map',
  '/crossroads': '/map',
  '/road': '/crossroads',
  '/card': '/crossroads',
  '/roar': '/upgrades',
  '/letter': '/roar',
}

let last: string | null = null
let trail: string[] = []
// True once the browser's own back or forward button has moved the page and the screen it
// led to has not been noted yet.
let popping = false
// When the back arrow was last pressed. The next screen noted soon after is a step back.
let steppedAt = 0
// A press that leads nowhere (the page did not move) is forgotten after this long.
const STEP_MS = 3000
let loaded = false
const listeners = new Set<() => void>()

// Only a path inside the game is ever followed.
const inGame = (path: unknown): path is string => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')

function load() {
  if (loaded) return
  loaded = true
  try {
    const saved = window.sessionStorage.getItem(KEY)
    if (inGame(saved)) last = saved
    const walked: unknown = JSON.parse(window.sessionStorage.getItem(TRAIL_KEY) ?? '[]')
    if (Array.isArray(walked)) trail = walked.filter(inGame).slice(-TRAIL_MAX)
  } catch {
    // Storage is blocked (some private windows): the way back is kept in memory only.
  }
}

function save() {
  try {
    if (last) window.sessionStorage.setItem(KEY, last)
    window.sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail))
  } catch {
    // See above.
  }
}

// Call with the path of every screen as it is shown (see components/LastScreen.tsx).
export function rememberScreen(pathname: string) {
  load()
  const wasPopping = popping
  const wasStepping = Date.now() - steppedAt < STEP_MS
  popping = false
  steppedAt = 0
  if (pathname === trail[trail.length - 1]) return
  // Going back takes the last step off the trail. Anything else adds one.
  if (wasStepping) {
    trail = trail.slice(0, -1)
    // With no earlier screen the arrow led to the screen above, which starts the trail anew.
    if (pathname !== trail[trail.length - 1]) trail = [...trail, pathname]
  } else if (wasPopping && pathname === trail[trail.length - 2]) trail = trail.slice(0, -1)
  else trail = [...trail, pathname].slice(-TRAIL_MAX)
  if (!SIDE_PAGES.includes(pathname)) last = pathname
  save()
  listeners.forEach((listener) => listener())
}

// Call when the browser reports a move through its history (its `popstate` event).
export function noteHistoryMove() {
  load()
  // A move within one screen, such as a pride card's link, is not a step on the trail.
  if (window.location.pathname !== trail[trail.length - 1]) popping = true
}

// Where the back arrow leads when the trail holds no earlier screen.
function parentOf(pathname: string): string {
  if (SIDE_PAGES.includes(pathname)) return last ?? START
  if (pathname.startsWith('/level/')) return '/map'
  return PARENTS[pathname] ?? START
}

// The screen the back arrow leads to from this one: the one the player was on before it, or
// the screen above it when there was none.
export function screenBefore(pathname: string): string {
  load()
  const earlier = trail[trail.length - 1] === pathname ? trail[trail.length - 2] : undefined
  return earlier ?? parentOf(pathname)
}

// Call when the back arrow is pressed, just before going to screenBefore().
export function noteStepBack() {
  steppedAt = Date.now()
}

// The parts of the browser's Navigation API that are read below. Not every browser has it.
type HistoryEntries = {
  currentEntry: { index: number } | null
  entries: () => { url: string | null, sameDocument: boolean }[]
}

// Whether one step back through the browser's own history lands on `target` without loading
// the page afresh. When it does, the back arrow takes that step, and the earlier screen
// comes back scrolled to where it was left. When it does not (after a reload, in a tab
// opened from another, or in a browser that cannot say), the arrow goes to `target` as a
// link would, so it can never lead out of the game.
export function historyLeadsTo(target: string): boolean {
  try {
    const history = (window as unknown as { navigation?: HistoryEntries }).navigation
    const index = history?.currentEntry?.index
    if (!history || index === undefined || index < 1) return false
    const entry = history.entries()[index - 1]
    return Boolean(entry?.sameDocument && entry.url && new URL(entry.url).pathname === target)
  } catch {
    return false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readLast(): string {
  load()
  return last ?? START
}

// The path BACK should lead to on ABOUT, PRIVACY and DEV. It is the title on the server and
// on the first paint, and the remembered screen straight after.
export function useLastScreen(): string {
  return useSyncExternalStore(subscribe, readLast, () => START)
}
