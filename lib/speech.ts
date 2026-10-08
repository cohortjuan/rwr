'use client'

import { useSyncExternalStore } from 'react'

// Speaking an answer in place of typing it, with the browser's own speech recognition (the
// Web Speech API). It is free and needs no key. RWR never receives the sound: the browser
// turns it into words, and in most browsers that means sending the sound to the browser
// maker's speech service. So the player is told where it goes before the first use (see
// components/MicButton.tsx), and a browser without it simply shows no mic.

// The parts of the browser's recognizer the game uses. TypeScript does not know it yet.
export type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export type RecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type RecognitionMaker = new () => Recognition

function maker(): RecognitionMaker | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as { SpeechRecognition?: RecognitionMaker, webkitSpeechRecognition?: RecognitionMaker }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return maker() !== null
}

// A recognizer set up for the game, or null where the browser has none.
export function newRecognition(): Recognition | null {
  const Maker = maker()
  if (!Maker) return null
  const recognition = new Maker()
  // The game is written in American English, and so are the answers it can read.
  recognition.lang = 'en-US'
  // Words appear as they are spoken, and are corrected as the sentence takes shape.
  recognition.interimResults = true
  // Keep listening through a pause for thought, until STOP is pressed. Chrome on Android is
  // known to repeat words when left listening this way, so there it takes one stretch of
  // speech at a time and the player presses SPEAK again to add more.
  recognition.continuous = !/Android/i.test(window.navigator.userAgent)
  return recognition
}

// Everything heard so far in one go of listening, as one line of text.
export function heard(event: RecognitionEvent): string {
  let text = ''
  for (let index = 0; index < event.results.length; index++) text += event.results[index][0].transcript
  return text.replace(/\s+/g, ' ').trim()
}

// What was already in the box, then what was said, cut to the box's limit. The first word
// spoken takes a capital when it starts the answer or follows the end of a sentence.
export function withSpoken(before: string, spoken: string, max: number): string {
  if (!spoken) return before
  const start = before.trimEnd()
  const fresh = !start || /[.!?]$/.test(start)
  const said = fresh ? spoken.charAt(0).toUpperCase() + spoken.slice(1) : spoken
  return (start ? `${start} ${said}` : said).slice(0, max)
}

// Whether a mic is listening right now. The music goes quiet while one is, so the browser
// hears the player and not the tune (see components/MusicPlayer.tsx).
let listening = false
const listeners = new Set<() => void>()

export function setListening(next: boolean) {
  if (listening === next) return
  listening = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useListening(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => listening,
    () => false,
  )
}
