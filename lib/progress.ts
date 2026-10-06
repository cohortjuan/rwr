'use client'

import { useSyncExternalStore } from 'react'
import type { EntryChoice } from '@/lib/lines'
import { saveSettings, SETTINGS_KEY } from '@/lib/settings'
import { slots, slotLevel, type SlotId } from '@/lib/upgrades'

// Progress lives in this browser's localStorage, or in memory only when the player turns
// "save on this device" off. Account sync to the database comes later.

export type ChatMessage = { role: 'user' | 'todah', text: string }

export type Progress = {
  playerName: string
  entryChoice: EntryChoice | null
  onboardingDone: boolean
  // null until the player answers the consent question before the first AI reply.
  aiConsent: 'yes' | 'no' | null
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
  aiConsent: null,
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

// Memory-only mode: nothing about the game is written to this device.
let memory: Progress = emptyProgress

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

export function clearProgress() {
  memory = emptyProgress
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    cachedRaw = null
    cached = emptyProgress
  }
  emit()
}

// Turning saving off moves the current game into memory and wipes the saved copy.
// Turning it back on writes the current game to this device again.
export function setSaveOnDevice(on: boolean) {
  const current = getSnapshot()
  if (on) {
    saveSettings({ saveOnDevice: true })
    saveProgress(current)
    return
  }
  memory = current
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing was saved, so there is nothing to remove.
  }
  saveSettings({ saveOnDevice: false })
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
