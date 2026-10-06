'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/lib/settings'
import styles from './DialogBox.module.css'

type Props = {
  text: string
  speaker?: string
  children?: React.ReactNode
}

const CHAR_MS = 22

// Todah's speech box. Text types out like a 16-bit RPG while his mouth moves; click to finish it.
// The choices (children) appear once the line is fully shown.
export default function DialogBox(props: Props) {
  // Keying on the text restarts the typewriter for every new line.
  return <TypedBox key={props.text} {...props} />
}

function TypedBox({ text, speaker = 'TODAH', children }: Props) {
  const reducedMotion = useReducedMotion()
  const [count, setCount] = useState(0)
  const done = reducedMotion || count >= text.length

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
      <div className={styles.portrait} aria-hidden="true">
        {/* Mouth-open frame, flapped on and off while the line types out. */}
        {!done && <div className={styles.mouth} />}
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
