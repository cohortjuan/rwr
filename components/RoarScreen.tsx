'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import SealedLetter from '@/components/SealedLetter'
import { circles } from '@/lib/compass'
import { levels } from '@/lib/levels'
import { lines } from '@/lib/lines'
import { capsuleDue, countedCheers, saveProgress, useLionText, useProgress } from '@/lib/progress'
import { LOW_VOLUME, useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './RoarScreen.module.css'

const ROAR_SOUND = '/audio/roar-reward.mp3'
// How long the player holds to let the roar out.
const HOLD_MS = 1500
const CLIP = 110

const clip = (text: string) => {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > CLIP ? `${clean.slice(0, CLIP).trimEnd()}...` : clean
}

// The locked reward. Todah roars only after the player confirms their own goal is reached.
// The player lets the roar out themselves, by pressing and holding. Then the credits roll,
// and every line in them is something the player said or did on the trail.
export default function RoarScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const lion = useLionText()
  const { sound, quiet } = useSettings()
  const confirmRef = useRef<HTMLDialogElement>(null)
  const roarRef = useRef<HTMLAudioElement>(null)
  const [goalDraft, setGoalDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [justRoared, setJustRoared] = useState(false)
  // Holding the button fills a meter. Letting go early empties it again.
  const [holding, setHolding] = useState(false)
  const holdTimer = useRef<number | undefined>(undefined)
  // Counts the times the credits have been started, so they can be rolled again.
  const [creditsRun, setCreditsRun] = useState(0)
  // Read once when the screen is drawn, which is often enough for a date.
  const [now] = useState(() => Date.now())

  const hasGoal = progress.goalText.trim().length > 0
  const achieved = Boolean(progress.goalAchievedAt)

  useEffect(() => {
    const dialog = confirmRef.current
    if (!dialog) return
    if (confirming && !dialog.open) dialog.showModal()
    if (!confirming && dialog.open) dialog.close()
  }, [confirming])

  function playRoar() {
    const audio = roarRef.current
    if (!sound || !audio) return
    audio.currentTime = 0
    audio.volume = quiet ? LOW_VOLUME : 1
    audio.play().catch(() => {})
  }

  function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = goalDraft.trim().slice(0, 200)
    if (!text) return
    playSfx('select', sound)
    saveProgress({ goalText: text })
    setEditing(false)
  }

  function stopHold() {
    window.clearTimeout(holdTimer.current)
    setHolding(false)
  }

  function letHimRoar() {
    stopHold()
    saveProgress({ goalAchievedAt: new Date().toISOString() })
    setConfirming(false)
    setJustRoared(true)
    playRoar()
  }

  function startHold() {
    if (holding) return
    setHolding(true)
    holdTimer.current = window.setTimeout(letHimRoar, HOLD_MS)
  }

  // The credits: every line is the player's own. Lines with nothing to show are left out.
  function credits(): { label: string, text: string }[] {
    const say = lines.roar.credits
    const warmup = progress.onboardingChat.find((message) => message.role === 'user')?.text
    const path = progress.paths?.chosen ? progress.paths.list.find((idea) => idea.kind === progress.paths?.chosen) : undefined
    const done = (progress.road?.steps ?? []).filter((step) => step.doneAt)
    const cheers = countedCheers(progress)
    return [
      { label: say.starring, text: progress.playerName || say.noName },
      { label: say.with, text: progress.lionName },
      { label: say.began, text: warmup ? clip(warmup) : '' },
      ...circles.map((circle) => ({ label: levels[circles.indexOf(circle)].name.toUpperCase(), text: clip(progress.compass[circle].claim) })),
      { label: say.path, text: path?.name ?? '' },
      { label: say.goal, text: progress.goalText },
      { label: say.obstacle, text: progress.road?.obstacle ? clip(progress.road.obstacle) : '' },
      ...done.map((step) => ({ label: say.experiment, text: clip(step.text) })),
      { label: say.witnesses, text: progress.witnesses.map((witness) => witness.name).join(', ') },
      { label: say.cheers, text: cheers > 0 ? say.cheerCount(cheers) : '' },
      {
        label: say.reached,
        text: progress.goalAchievedAt
          ? new Date(progress.goalAchievedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : '',
      },
    ].filter((line) => line.text.trim())
  }

  if (!hydrated) return <main className="screen" />

  return (
    <main className={`screen ${justRoared ? styles.shake : ''} ${holding ? styles.rumble : ''}`}>
      {/* The sun comes up behind everything as the roar goes out. */}
      {justRoared && <div className={styles.sunrise} aria-hidden="true" />}
      {/* Loaded with the screen, so the roar starts the moment the goal is confirmed. */}
      <audio ref={roarRef} src={ROAR_SOUND} preload="auto" />
      <div className="screen-inner">
        <h1 className={achieved ? styles.logoLit : styles.logo}>{lines.title.name}</h1>

        {achieved && (
          <section className={styles.reward}>
            <Image
              className={styles.still}
              src="/images/reward-roar.jpg"
              alt={lion(lines.roar.rewardAlt)}
              width={1408}
              height={768}
              priority
            />
            <h2 className={styles.rewardTitle}>{lines.roar.rewardTitle}</h2>
            <p className={styles.goal}>
              {lines.roar.goalShown} <strong>{progress.goalText}</strong>
            </p>
            <p className={styles.rewardBody}>{lines.roar.rewardBody(progress.playerName)}</p>
            <div className={styles.buttons}>
              <Link className="btn" href="/letter">
                {lion(lines.letter.onRoar)}
              </Link>
              <button type="button" className="btn btn-quiet" onClick={playRoar}>
                {lines.roar.replay}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setCreditsRun(creditsRun + 1)}>
                {lines.roar.credits.again}
              </button>
              <Link className="btn btn-quiet" href="/upgrades">
                {lines.roar.back}
              </Link>
            </div>
          </section>
        )}

        {/* The credits: a window the lines rise through once, then a list to read at leisure. */}
        {achieved && (
          <section className={`panel ${styles.creditsPanel}`} aria-label={lines.roar.credits.heading}>
            <h2 className={styles.heading}>{lines.roar.credits.heading}</h2>
            <div className={styles.credits} tabIndex={0}>
              <dl key={creditsRun} className={justRoared || creditsRun > 0 ? styles.roll : undefined}>
                {credits().map((line, index) => (
                  <div key={index} className={styles.credit}>
                    <dt>{line.label}</dt>
                    <dd>{line.text}</dd>
                  </div>
                ))}
                <div className={styles.credit}>
                  <dd className={styles.end}>{lines.roar.credits.end}</dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {/* A letter the player sealed for this moment, or one whose day has come. */}
        {achieved && progress.capsule && (capsuleDue(progress, now) || progress.capsule.openedAt) && <SealedLetter />}

        {!achieved && (!hasGoal || editing) && (
          <section className="panel">
            <h2 className={styles.heading}>{lines.roar.heading}</h2>
            <p>{lines.roar.noGoal}</p>
            <form onSubmit={saveGoal}>
              <div className="field">
                <label htmlFor="goal">{lines.roar.goalLabel}</label>
                <input
                  id="goal"
                  autoFocus
                  maxLength={200}
                  placeholder={lines.roar.goalPlaceholder}
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value)}
                />
              </div>
              <div className={styles.buttons}>
                <button type="submit" className="btn" disabled={!goalDraft.trim()}>
                  {lines.roar.goalSave}
                </button>
                <Link className="btn btn-quiet" href="/upgrades">
                  {lines.roar.back}
                </Link>
              </div>
            </form>
          </section>
        )}

        {!achieved && hasGoal && !editing && (
          <section className="panel">
            <h2 className={styles.heading}>{lines.roar.heading}</h2>
            <p className={styles.goal}>
              {lines.roar.goalShown} <strong>{progress.goalText}</strong>
            </p>
            <p>{lion(lines.upgrades.leaderLockedBody)}</p>
            <div className={styles.buttons}>
              <button type="button" className="btn" onClick={() => setConfirming(true)}>
                {lines.roar.reachedQuestion}
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setGoalDraft(progress.goalText)
                  setEditing(true)
                }}
              >
                {lines.roar.changeGoal}
              </button>
              <Link className="btn btn-quiet" href="/upgrades">
                {lines.roar.back}
              </Link>
            </div>
          </section>
        )}
      </div>

      <dialog
        ref={confirmRef}
        className={styles.confirm}
        aria-labelledby="roar-confirm"
        onClose={() => setConfirming(false)}
      >
        <h2 id="roar-confirm" className={styles.heading}>
          {lion(lines.roar.confirm)}
        </h2>
        {/* The roar is let out by holding. A plain press is offered too, for anyone who cannot
            hold a button down. */}
        <button
          type="button"
          className={styles.hold}
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onBlur={stopHold}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
              event.preventDefault()
              startHold()
            }
          }}
          onKeyUp={(event) => {
            if (event.key === ' ' || event.key === 'Enter') stopHold()
          }}
        >
          <span className={holding ? styles.meterOn : styles.meter} aria-hidden="true" />
          <span className={styles.holdLabel}>{lines.roar.hold}</span>
        </button>
        <p className={styles.holdHint}>{lines.roar.holdHint}</p>
        <div className={styles.buttons}>
          <button type="button" className="btn btn-quiet" onClick={letHimRoar}>
            {lines.roar.confirmYes(progress.lionSex)}
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            autoFocus
            onClick={() => {
              stopHold()
              setConfirming(false)
            }}
          >
            {lines.roar.confirmNo}
          </button>
        </div>
      </dialog>
    </main>
  )
}
