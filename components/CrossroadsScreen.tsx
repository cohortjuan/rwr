'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import DialogBox from '@/components/DialogBox'
import { circles, circleScore, EVIDENCE_MAX, strongestCircle, thinnestCircle } from '@/lib/compass'
import { levels } from '@/lib/levels'
import { lines } from '@/lib/lines'
import { isNameAllowed } from '@/lib/names'
import { saveProgress, useLionText, useProgress, type Circle, type Progress } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import { NAME_TOKEN } from '@/lib/tokens'
import quest from './OnboardingQuest.module.css'
import styles from './CrossroadsScreen.module.css'

// The Crossroads: the four circles side by side, one thing Todah notices across them, and
// then the player's own main goal. It is where the levels turn into something to walk toward.

const GOAL_MAX = 200
const levelOf = (circle: Circle) => levels[circles.indexOf(circle)]

// What Todah notices when the AI is off or down: read straight from the map.
function scriptedNotice(progress: Progress): string {
  const strongest = strongestCircle(progress)
  if (!strongest) return lines.crossroads.scriptedEmpty
  const thinnest = thinnestCircle(progress)
  return lines.crossroads.scripted(levelOf(strongest).name, thinnest ? levelOf(thinnest).name : null)
}

async function askTodah(progress: Progress): Promise<string> {
  // No consent, no AI call.
  if (progress.aiConsent !== 'yes') return scriptedNotice(progress)
  try {
    const claims = Object.fromEntries(
      circles.map((circle) => [circle, { claim: progress.compass[circle].claim, evidence: circleScore(progress, circle) }]),
    )
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'crossroads', claims }),
    })
    if (!response.ok) return scriptedNotice(progress)
    const data = await response.json()
    return String(data.reply ?? '').trim() || scriptedNotice(progress)
  } catch {
    return scriptedNotice(progress)
  }
}

export default function CrossroadsScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()
  const [goalDraft, setGoalDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const requestedFor = useRef('')

  const name = progress.playerName || 'traveler'
  const missing = circles.filter((circle) => !progress.compass[circle].claim.trim())
  const ready = hydrated && missing.length === 0
  // The four claims Todah's words are about. If any of them changes, he looks again.
  const about = circles.map((circle) => `${progress.compass[circle].claim.trim()}|${circleScore(progress, circle)}`).join('~')
  const noticed = progress.crossroads?.for === about ? progress.crossroads.text : ''
  const hasGoal = progress.goalText.trim().length > 0

  useEffect(() => {
    if (!ready || noticed || requestedFor.current === about) return
    requestedFor.current = about
    void askTodah(progress).then((text) => saveProgress({ crossroads: { text, for: about } }))
  }, [ready, noticed, about, progress])

  function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const goal = goalDraft.trim().slice(0, GOAL_MAX)
    if (!goal) {
      setNotice(lines.crossroads.goalBlocked)
      return
    }
    // The goal can travel on the pride card, so it goes through the same filter as names.
    if (!isNameAllowed(goal)) {
      setNotice(lines.errors.nameBlocked)
      return
    }
    playSfx('complete', sound)
    saveProgress({ goalText: goal })
    setNotice('')
    setEditing(false)
  }

  if (!hydrated) return <main className="screen" />

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={quest.hud}>
          <Link className={`btn btn-quiet ${quest.back}`} href="/map" aria-label={lines.crossroads.toMap}>
            {lines.level.back}
          </Link>
          <h1 className={quest.questName}>{lines.crossroads.name}</h1>
        </header>

        {!ready && (
          <DialogBox text={lines.crossroads.locked}>
            {missing.map((circle) => (
              <Link key={circle} className="btn" href={`/level/${circle}`}>
                {lines.crossroads.walk(lines.level.circles[circle].name)}
              </Link>
            ))}
          </DialogBox>
        )}

        {ready && (
          <>
            <section className="panel">
              <h2 className={styles.heading}>{lines.crossroads.circlesHeading}</h2>
              <ul className={styles.circles}>
                {circles.map((circle) => (
                  <li key={circle}>
                    <span className={styles.circleName}>
                      {levelOf(circle).name.toUpperCase()}
                      <span className={styles.pips} aria-label={lines.map.circleScore(circleScore(progress, circle), EVIDENCE_MAX)}>
                        {Array.from({ length: EVIDENCE_MAX }, (_, index) => (
                          <span key={index} className={index < circleScore(progress, circle) ? styles.pipOn : styles.pip} />
                        ))}
                      </span>
                    </span>
                    <span className={styles.meaning}>{levelOf(circle).circle}</span>
                    <span>{progress.compass[circle].claim}</span>
                  </li>
                ))}
              </ul>
            </section>

            {!noticed && <DialogBox text={lion(lines.crossroads.thinking)} mood="thinking" />}
            {noticed && <DialogBox text={[lines.crossroads.intro(name), noticed.split(NAME_TOKEN).join(name)].join(' ')} />}

            {noticed && (
              <section className={`panel ${styles.goal}`}>
                <h2 className={styles.heading}>{lines.crossroads.goalHeading}</h2>
                {hasGoal && !editing ? (
                  <>
                    <p className={styles.goalText}>{lines.crossroads.goalSet(progress.goalText)}</p>
                    <p>{lion(lines.crossroads.done(name))}</p>
                    <div className={styles.buttons}>
                      <Link className="btn" href="/upgrades">
                        {lines.crossroads.toUpgrades}
                      </Link>
                      <Link className="btn btn-quiet" href="/roar">
                        {lines.crossroads.toRoar}
                      </Link>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        onClick={() => {
                          setGoalDraft(progress.goalText)
                          setEditing(true)
                        }}
                      >
                        {lines.crossroads.goalChange}
                      </button>
                    </div>
                  </>
                ) : (
                  <form onSubmit={saveGoal}>
                    <p>{lion(lines.crossroads.beforeGoal)}</p>
                    <p>{lion(lines.crossroads.goalIntro)}</p>
                    <div className="field">
                      <label htmlFor="crossroads-goal">{lines.crossroads.goalLabel}</label>
                      <input
                        id="crossroads-goal"
                        maxLength={GOAL_MAX}
                        placeholder={lines.crossroads.goalPlaceholder}
                        value={goalDraft}
                        onChange={(event) => {
                          setGoalDraft(event.target.value)
                          setNotice('')
                        }}
                      />
                    </div>
                    <p className={quest.notice} role="alert">
                      {notice}
                    </p>
                    <button type="submit" className="btn">
                      {lines.crossroads.goalSave}
                    </button>
                  </form>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
