'use client'

import { useSyncExternalStore } from 'react'

// The last screen of the game the player was on. ABOUT, PRIVACY and DEV are reached from the
// bar on every screen, so their BACK button returns to wherever the player came from and not
// to the title.

// Pages that are beside the game, not part of it. They are never remembered as a place to go
// back to, so going from one of them to another still leads back to the game.
const SIDE_PAGES = ['/about', '/privacy', '/dev']
// Kept for the tab's lifetime, so a reload on one of those pages still knows the way back.
const KEY = 'rwr.lastScreen'
// Where BACK goes when nothing is remembered: a first visit that lands on one of those pages.
const START = '/'

let last: string | null = null
let loaded = false
const listeners = new Set<() => void>()

function read(): string {
  if (!loaded) {
    loaded = true
    try {
      const saved = window.sessionStorage.getItem(KEY)
      // Only a path inside the game is ever followed.
      if (saved && saved.startsWith('/') && !saved.startsWith('//')) last = saved
    } catch {
      // Storage is blocked (some private windows): the way back is kept in memory only.
    }
  }
  return last ?? START
}

// Call with the path of every screen as it is shown (see components/LastScreen.tsx).
export function rememberScreen(pathname: string) {
  read()
  if (SIDE_PAGES.includes(pathname) || pathname === last) return
  last = pathname
  try {
    window.sessionStorage.setItem(KEY, pathname)
  } catch {
    // See above.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// The path BACK should lead to. It is the title on the server and on the first paint, and the
// remembered screen straight after.
export function useLastScreen(): string {
  return useSyncExternalStore(subscribe, read, () => START)
}
