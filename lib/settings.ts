'use client'

import { useSyncExternalStore } from 'react'

// Sound and motion preferences, kept per browser.

export type Settings = { sound: boolean, motionOff: boolean }

const KEY = 'rwr.settings.v1'
const defaults: Settings = { sound: true, motionOff: false }

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cached: Settings = defaults

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function getSnapshot(): Settings {
  const raw = readRaw()
  if (raw === cachedRaw) return cached
  cachedRaw = raw
  try {
    cached = raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    cached = defaults
  }
  return cached
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function saveSettings(patch: Partial<Settings>) {
  const next = { ...getSnapshot(), ...patch }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    cachedRaw = null
    cached = next
  }
  listeners.forEach((listener) => listener())
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, () => defaults)
}

const motionQuery = '(prefers-reduced-motion: reduce)'

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia(motionQuery)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

// True when the player turned motion off here or their system asks for reduced motion.
export function useReducedMotion(): boolean {
  const system = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  )
  return useSettings().motionOff || system
}

// False during server render and hydration, true after. Lets screens wait for saved state.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}
