'use client'

import { useSyncExternalStore } from 'react'

// Whether this browser lets the game make sound yet.
// 'unknown': not tried. 'blocked': the browser refused until the player taps or presses a key
// (every phone, and most desktop browsers on a first visit). 'open': music is allowed.
export type AudioGate = 'unknown' | 'blocked' | 'open'

let gate: AudioGate = 'unknown'
const listeners = new Set<() => void>()

export function setAudioGate(next: AudioGate) {
  if (gate === next) return
  gate = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useAudioGate(): AudioGate {
  return useSyncExternalStore(
    subscribe,
    () => gate,
    () => 'unknown' as AudioGate,
  )
}
