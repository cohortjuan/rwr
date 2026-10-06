'use client'

import { useSyncExternalStore } from 'react'
import type { EntryChoice } from '@/lib/lines'
import { slots, slotLevel, type SlotId } from '@/lib/upgrades'

// Guest progress lives in this browser's localStorage. Account sync to the database comes later.

export type ChatMessage = { role: 'user' | 'todah', text: string }

export type Progress = {
  playerName: string
  entryChoice: EntryChoice | null
  onboardingDone: boolean
  onboardingChat: ChatMessage[]
  upgrades: Partial<Record<SlotId, string>>
  goalText: string
  goalAchievedAt: string | null
}

export type TodahForm = 'cub' | 'nomad' | 'leader'

const KEY = 'rwr.progress.v1'

export const emptyProgress: Progress = {
  playerName: '',
  entryChoice: null,
  onboardingDone: false,
  onboardingChat: [],
  upgrades: {},
  goalText: '',
  goalAchievedAt: null,
}

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cached: Progress = emptyProgress

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function getSnapshot(): Progress {
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
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage can be blocked (private windows). The game still runs for this page view.
    cachedRaw = null
    cached = next
  }
  emit()
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    cachedRaw = null
    cached = emptyProgress
  }
  emit()
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function hasSavedGame(progress: Progress): boolean {
  return progress.playerName.trim().length > 0
}

// Todah's form follows what the player has built, never how much they have chatted.
// Nomad: onboarding done and at least two upgrade slots started.
// Pride Leader: only after the player confirms their main goal is reached.
export function todahForm(progress: Progress): TodahForm {
  if (progress.goalAchievedAt) return 'leader'
  const started = slots.filter((slot) => slotLevel(slot, progress.upgrades[slot.id] ?? '') > 0).length
  if (progress.onboardingDone && started >= 2) return 'nomad'
  return 'cub'
}
