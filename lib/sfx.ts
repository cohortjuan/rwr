'use client'

// Tiny 16-bit style sound effects made with the Web Audio API, so there are no audio files
// to license. Every caller passes the sound setting so the toggle is always respected.

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

let context: AudioContext | null = null

export function playSfx(name: SfxName, soundOn: boolean) {
  if (!soundOn || typeof window === 'undefined') return
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const pattern = patterns[name]
    const now = context.currentTime
    for (const note of pattern.notes) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = note.frequency
      gain.gain.setValueAtTime(pattern.volume, now + note.start)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.length)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now + note.start)
      oscillator.stop(now + note.start + note.length + 0.02)
    }
  } catch {
    // Audio is a nice-to-have. If the browser blocks it, the game carries on silently.
  }
}
