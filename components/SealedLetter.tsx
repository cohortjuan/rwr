'use client'

import { useState } from 'react'
import Link from 'next/link'
import PawPrint from '@/components/PawPrint'
import MicButton from '@/components/MicButton'
import { lines } from '@/lib/lines'
import { capsuleDue, saveProgress, useLionText, useProgress } from '@/lib/progress'
import { useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './SealedLetter.module.css'

// A letter to yourself, sealed until the goal is reached or until a date the player picks. It
// is written when the goal is set, kept on this device, and handed back when its moment
// comes, with one question from Todah.
// Nothing here goes to the AI or to a server. A draft Juan is deciding whether to keep.

const LETTER_MAX = 300
// How long it waits: until the goal is reached, or a number of days.
const waits: ('goal' | number)[] = ['goal', 30, 60, 90]
const DAY_MS = 86_400_000

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

export default function SealedLetter() {
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()
  const [draft, setDraft] = useState('')
  const [wait, setWait] = useState<'goal' | number>('goal')
  // The time is read when the panel is first drawn, which is often enough for a date.
  const [now] = useState(() => Date.now())

  const letter = progress.capsule
  const due = capsuleDue(progress, now)

  function seal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim().slice(0, LETTER_MAX)
    if (!text) return
    playSfx('complete', sound)
    const sealedAt = new Date()
    saveProgress({
      capsule: {
        text,
        sealedAt: sealedAt.toISOString(),
        opensAt: wait === 'goal' ? null : new Date(sealedAt.getTime() + wait * DAY_MS).toISOString(),
        openedAt: null,
      },
    })
    setDraft('')
  }

  function open() {
    if (!letter) return
    playSfx('levelUp', sound)
    saveProgress({ capsule: { ...letter, openedAt: new Date().toISOString() } })
  }

  return (
    <section className={`panel ${styles.panel}`}>
      <h2 className={styles.heading}>{lines.capsule.heading}</h2>

      {/* Nothing sealed yet: write it and choose how long it waits. */}
      {!letter && (
        <form onSubmit={seal}>
          <p>{lion(lines.capsule.intro)}</p>
          <div className="field">
            <label htmlFor="capsule-text">{lines.capsule.label}</label>
            <textarea
              id="capsule-text"
              rows={3}
              maxLength={LETTER_MAX}
              placeholder={lines.capsule.placeholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <MicButton value={draft} onChange={setDraft} maxLength={LETTER_MAX} />
          </div>
          <div className={styles.waits} role="group" aria-label={lines.capsule.waitLabel}>
            <span className={styles.waitLabel}>{lines.capsule.waitLabel}</span>
            {waits.map((option) => (
              <button
                key={option}
                type="button"
                className={wait === option ? 'btn' : 'btn btn-quiet'}
                aria-pressed={wait === option}
                onClick={() => setWait(option)}
              >
                {option === 'goal' ? lines.capsule.atGoal : lines.capsule.days(option)}
              </button>
            ))}
          </div>
          <button type="submit" className="btn" disabled={!draft.trim()}>
            {lines.capsule.seal}
          </button>
          <p className={styles.fine}>{lines.capsule.privacy}</p>
        </form>
      )}

      {/* Sealed and waiting. */}
      {letter && !letter.openedAt && !due && (
        <div className={styles.waiting}>
          <div className={styles.envelope} aria-hidden="true">
            <span className={styles.seal}>
              <PawPrint className={styles.paw} />
            </span>
          </div>
          <div>
            <p className={styles.strong}>{letter.opensAt ? lines.capsule.sealed(day(letter.opensAt)) : lines.capsule.sealedGoal}</p>
            <p>{lion(letter.opensAt ? lines.capsule.keeping : lines.capsule.keepingGoal)}</p>
            <p className={styles.fine}>{lines.capsule.sealedOn(day(letter.sealedAt))}</p>
          </div>
        </div>
      )}

      {/* Its day has come. */}
      {letter && !letter.openedAt && due && (
        <div className={styles.waiting}>
          <div className={`${styles.envelope} ${styles.arrived}`} aria-hidden="true">
            <span className={styles.seal}>
              <PawPrint className={styles.paw} />
            </span>
          </div>
          <div>
            <p className={styles.strong}>{lines.capsule.arrived}</p>
            <p>{lion(lines.capsule.arrivedBody(day(letter.sealedAt)))}</p>
            <button type="button" className="btn" onClick={open}>
              {lines.capsule.open}
            </button>
          </div>
        </div>
      )}

      {/* Opened: their own words back, and one question. */}
      {letter?.openedAt && (
        <>
          <blockquote className={styles.paper}>
            <p className={styles.dated}>{day(letter.sealedAt)}</p>
            <p>{letter.text}</p>
          </blockquote>
          <p>{lion(lines.capsule.after)}</p>
          <div className={styles.buttons}>
            <Link className="btn" href="/road">
              {lines.capsule.toRoad}
            </Link>
            <button type="button" className="btn btn-quiet" onClick={() => saveProgress({ capsule: null })}>
              {lines.capsule.again}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
