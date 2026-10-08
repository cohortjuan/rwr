'use client'

import { useSyncExternalStore } from 'react'

// Whether the roar is sounding right now. The roar screen sets it and the music player reads
// it, so the music can drop out for the roar and come back softly once it has finished.

let roaring = false
const listeners = new Set<() => void>()

export function setRoaring(next: boolean) {
  if (roaring === next) return
  roaring = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useRoaring(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => roaring,
    () => false,
  )
}
