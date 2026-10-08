'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import ConfirmBox from '@/components/ConfirmBox'
import PixelArt from '@/components/PixelArt'
import { lines } from '@/lib/lines'
import { saveSettings, useHydrated, useSettings } from '@/lib/settings'
import { heard, newRecognition, setListening, speechSupported, withSpoken, type Recognition } from '@/lib/speech'
import styles from './MicButton.module.css'

type Props = {
  // What is in the answer box now, how to change it, and the most it may hold.
  value: string
  onChange: (text: string) => void
  maxLength: number
}

const mic = [
  '..###..',
  '..###..',
  '..###..',
  '#.###.#',
  '#.###.#',
  '#.....#',
  '.#####.',
  '...#...',
  '...#...',
  '.#####.',
]

// Stop at once and let go of the recognizer. Nothing it says afterwards is used.
function release(holder: RefObject<Recognition | null>) {
  const recognition = holder.current
  if (!recognition) return
  holder.current = null
  recognition.onresult = null
  recognition.onerror = null
  recognition.onend = null
  recognition.abort()
  setListening(false)
}

// SPEAK, beside an answer box: the player talks and the words are added to what is in the
// box, where they can be changed before they are sent. Typing always works too. Where the
// browser cannot turn speech into words, nothing is drawn.
export default function MicButton({ value, onChange, maxLength }: Props) {
  const hydrated = useHydrated()
  const { mic: agreed } = useSettings()
  const [on, setOn] = useState(false)
  const [asking, setAsking] = useState(false)
  const [problem, setProblem] = useState('')
  const recognitionRef = useRef<Recognition | null>(null)
  // What is in the box now, and the last text this button put there. When they differ, the
  // player has typed or the answer has been sent, and nothing more is added to it.
  const valueRef = useRef(value)
  const placedRef = useRef(value)
  // The parent's newest way to change the box: it may be built from state that has moved on
  // since listening began.
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    valueRef.current = value
    onChangeRef.current = onChange
  }, [value, onChange])

  // If the answer box goes away while the mic is on (the answer was sent), listening ends.
  useEffect(() => () => release(recognitionRef), [])

  function listen() {
    const recognition = newRecognition()
    if (!recognition) return
    const before = value
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return
      if (valueRef.current !== placedRef.current) {
        release(recognitionRef)
        setOn(false)
        return
      }
      const text = withSpoken(before, heard(event), maxLength)
      placedRef.current = text
      valueRef.current = text
      onChangeRef.current(text)
    }
    recognition.onerror = (event) => {
      // Stopped on purpose: not a problem to report.
      if (event.error === 'aborted') return
      setProblem(lines.mic.problems[event.error] ?? lines.mic.problem)
    }
    // The browser ends it by itself after a long silence, or when STOP is pressed.
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      recognitionRef.current = null
      setListening(false)
      setOn(false)
    }
    try {
      recognition.start()
    } catch {
      setProblem(lines.mic.problem)
      return
    }
    recognitionRef.current = recognition
    placedRef.current = before
    setProblem('')
    setListening(true)
    setOn(true)
  }

  function press() {
    if (on) {
      // Let the browser finish the sentence it is on: its last words still arrive.
      recognitionRef.current?.stop()
      setListening(false)
      setOn(false)
      return
    }
    // The first time, say where the sound of the player's voice goes, and ask.
    if (!agreed) {
      setAsking(true)
      return
    }
    listen()
  }

  if (!hydrated || !speechSupported()) return null

  return (
    <div className={styles.mic}>
      <button
        type="button"
        className={on ? `btn ${styles.button}` : `btn btn-quiet ${styles.button}`}
        aria-pressed={on}
        aria-label={on ? lines.mic.stopLabel : lines.mic.startLabel}
        onClick={press}
      >
        <PixelArt rows={mic} className={on ? styles.iconOn : undefined} />
        {on ? lines.mic.stop : lines.mic.start}
      </button>
      <span className={styles.note} role="status">
        {on ? lines.mic.listening : problem}
      </span>

      <ConfirmBox
        open={asking}
        text={lines.mic.ask}
        yes={lines.mic.askYes}
        no={lines.mic.askNo}
        onYes={() => {
          setAsking(false)
          saveSettings({ mic: true })
          listen()
        }}
        onNo={() => setAsking(false)}
      />
    </div>
  )
}
