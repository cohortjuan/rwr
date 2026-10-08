'use client'

import { useEffect, useState } from 'react'
import LionAvatar from '@/components/LionAvatar'
import { accessory, auraSize, maneSize, wornIds } from '@/lib/accessories'
import { useKeptLions, useLionText, useProgress } from '@/lib/progress'
import { useReducedMotion } from '@/lib/settings'
import styles from './DialogBox.module.css'

// neutral: blinks, and his mouth moves while the line types out.
// happy: smiling eyes, for wins. thinking: head tilts, and the line appears at once.
export type Mood = 'neutral' | 'happy' | 'thinking'

type Props = {
  text: string
  speaker?: string
  mood?: Mood
  children?: React.ReactNode
}

const CHAR_MS = 22

// Todah's speech box. Text types out like a 16-bit RPG while his mouth moves; click to finish it.
// The choices (children) appear once the line is fully shown.
export default function DialogBox({ text, speaker = 'TODAH', ...rest }: Props) {
  // A renamed lion speaks under its own name.
  const lion = useLionText()
  const line = lion(text)
  // Keying on the text restarts the typewriter for every new line.
  return <TypedBox key={line} text={line} speaker={lion(speaker)} {...rest} />
}

function TypedBox({ text, speaker, mood = 'neutral', children }: Props) {
  const reducedMotion = useReducedMotion()
  const progress = useProgress()
  const keptLions = useKeptLions()
  const wearing = wornIds(
    progress,
    keptLions.map((kept) => kept.progress),
  )
  // A hat sits above the head, so the frame pulls back a little to keep it in view.
  const hasHat = wearing.some((id) => accessory(id)?.category === 'hat')
  const [count, setCount] = useState(0)
  const done = reducedMotion || mood === 'thinking' || count >= text.length

  useEffect(() => {
    if (done) return
    const timer = window.setInterval(() => {
      setCount((current) => current + 1)
    }, CHAR_MS)
    return () => window.clearInterval(timer)
  }, [done])

  function finish() {
    if (!done) setCount(text.length)
  }

  return (
    <section className={styles.box} onClick={finish}>
      <div className={`${styles.portrait} ${styles[mood]}`} aria-hidden="true">
        {/* The same lion as everywhere else, accessories and all, framed on the face. */}
        <LionAvatar
          className={hasHat ? styles.faceWithHat : styles.face}
          wearing={wearing}
          mane={maneSize(progress)}
          aura={auraSize(progress)}
          mood={mood === 'happy' ? 'happy' : 'neutral'}
          talking={!done}
          blink
        />
      </div>
      <div className={styles.body}>
        <p className={styles.speaker}>{speaker}</p>
        {/* Screen readers get the whole line at once instead of letter by letter. */}
        <p className="sr-only" aria-live="polite">
          {text}
        </p>
        <p className={styles.text} aria-hidden="true">
          {done ? text : text.slice(0, count)}
          {!done && <span className={styles.caret}>_</span>}
        </p>
        {done && children && <div className={styles.choices}>{children}</div>}
      </div>
    </section>
  )
}
