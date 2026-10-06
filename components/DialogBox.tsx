'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './DialogBox.module.css'

type Props = {
  text: string
  speaker?: string
  children?: React.ReactNode
}

const CHAR_MS = 22

// Todah's speech box. Text types out like a 16-bit RPG; click or press a key to finish it.
// The choices (children) appear once the line is fully shown.
export default function DialogBox(props: Props) {
  // Keying on the text restarts the typewriter for every new line.
  return <TypedBox key={props.text} {...props} />
}

function TypedBox({ text, speaker = 'TODAH', children }: Props) {
  const reducedMotion = useReducedMotion()
  const { sound } = useSettings()
  const [count, setCount] = useState(0)
  const done = reducedMotion || count >= text.length

  useEffect(() => {
    if (done) return
    const timer = window.setInterval(() => {
      setCount((current) => current + 1)
    }, CHAR_MS)
    return () => window.clearInterval(timer)
  }, [done])

  // A soft blip every few letters while the line types out.
  useEffect(() => {
    if (!done && count % 3 === 1) playSfx('blip', sound)
  }, [count, done, sound])

  function finish() {
    if (!done) setCount(text.length)
  }

  return (
    <section className={styles.box} onClick={finish}>
      <div className={styles.portrait} aria-hidden="true" />
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
