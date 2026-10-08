'use client'

import { LEVEL_UP_SOUND, LEVEL_UP_VOLUME } from '@/lib/assets'

// 16-bit style sound effects. Most are made with the Web Audio API, so there are no audio
// files to license. A few can be recordings instead (see `samples`). Every caller passes the
// sound setting so the toggle is always respected.

export type SfxName = 'select' | 'levelUp' | 'complete'

type Note = { frequency: number, start: number, length: number }

const patterns: Record<SfxName, { volume: number, notes: Note[] }> = {
  select: {
    volume: 0.06,
    notes: [
      { frequency: 523, start: 0, length: 0.05 },
      { frequency: 784, start: 0.05, length: 0.07 },
    ],
  },
  levelUp: {
    volume: 0.07,
    notes: [
      { frequency: 523, start: 0, length: 0.08 },
      { frequency: 659, start: 0.08, length: 0.08 },
      { frequency: 784, start: 0.16, length: 0.08 },
      { frequency: 1047, start: 0.24, length: 0.18 },
    ],
  },
  complete: {
    volume: 0.07,
    notes: [
      { frequency: 523, start: 0, length: 0.1 },
      { frequency: 523, start: 0.12, length: 0.1 },
      { frequency: 784, start: 0.24, length: 0.14 },
      { frequency: 659, start: 0.4, length: 0.1 },
      { frequency: 1047, start: 0.52, length: 0.32 },
    ],
  },
}

type Sample = { url: string, volume: number }

// Effects that play a recording. If the file is missing or fails to load, the pattern above
// with the same name plays instead.
const samples: Partial<Record<SfxName, Sample>> = LEVEL_UP_SOUND
  ? { levelUp: { url: LEVEL_UP_SOUND, volume: LEVEL_UP_VOLUME } }
  : {}

const downloads = new Map<string, Promise<ArrayBuffer>>()
const decoded = new Map<string, AudioBuffer>()

function download(url: string): Promise<ArrayBuffer> {
  let pending = downloads.get(url)
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Could not load ${url}`)
      return response.arrayBuffer()
    })
    // A failed download is forgotten, so the next play tries again.
    pending.catch(() => downloads.delete(url))
    downloads.set(url, pending)
  }
  return pending
}

// Fetches the recordings ahead of time, so the first one plays without a pause.
export function preloadSfx() {
  if (typeof window === 'undefined') return
  for (const sample of Object.values(samples)) void download(sample.url).catch(() => {})
}

let context: AudioContext | null = null

// How loud effects play, as a share of full: 1, or less on the low sound setting.
let loudness = 1

export function setSfxLoudness(value: number) {
  loudness = value
}

function playPattern(audio: AudioContext, name: SfxName) {
  const pattern = patterns[name]
  const now = audio.currentTime
  for (const note of pattern.notes) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = 'square'
    oscillator.frequency.value = note.frequency
    gain.gain.setValueAtTime(pattern.volume * loudness, now + note.start)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.length)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start(now + note.start)
    oscillator.stop(now + note.start + note.length + 0.02)
  }
}

async function playSample(audio: AudioContext, sample: Sample) {
  let buffer = decoded.get(sample.url)
  if (!buffer) {
    // Decoding empties the data it is given, so it gets a copy and the download stays whole.
    buffer = await audio.decodeAudioData((await download(sample.url)).slice(0))
    decoded.set(sample.url, buffer)
  }
  const source = audio.createBufferSource()
  const gain = audio.createGain()
  source.buffer = buffer
  gain.gain.value = sample.volume * loudness
  source.connect(gain)
  gain.connect(audio.destination)
  source.start()
}

export function playSfx(name: SfxName, soundOn: boolean) {
  if (!soundOn || typeof window === 'undefined') return
  try {
    context ??= new AudioContext()
    const audio = context
    if (audio.state === 'suspended') void audio.resume()
    const sample = samples[name]
    if (sample) {
      playSample(audio, sample).catch(() => {
        try {
          playPattern(audio, name)
        } catch {
          // Silent, for the same reason as below.
        }
      })
      return
    }
    playPattern(audio, name)
  } catch {
    // Audio is a nice-to-have. If the browser blocks it, the game carries on silently.
  }
}
