'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import LionAvatar from '@/components/LionAvatar'
import SealedLetter from '@/components/SealedLetter'
import { auraSize, maneSize, wornIds } from '@/lib/accessories'
import { circles } from '@/lib/compass'
import { levels } from '@/lib/levels'
import { lines } from '@/lib/lines'
import { capsuleDue, countedCheers, saveProgress, useKeptLions, useLionText, useProgress } from '@/lib/progress'
import { setRoaring } from '@/lib/roarSound'
import { LOW_VOLUME, useHydrated, useReducedMotion, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './RoarScreen.module.css'

const ROAR_SOUND = '/audio/roar-reward.mp3'
// How long the player holds to let the roar out.
const HOLD_MS = 1500
const CLIP = 110
// The credits rise slowly enough to read every line: this long for each line, and never
// faster than the shortest roll.
const CREDIT_SECONDS = 7
const CREDITS_SHORTEST = 60
// On the whole screen the lines have further to travel, so their pace is set directly, in
// pixels a second. Larger lettering can move faster than the small window's and still be read.
const CREDITS_PACE = 25
// The scroll wheel changes that pace, between this many times slower and this many faster.
const SLOWEST = 0.25
const FASTEST = 6
// The roll stops on its last screen, holds it there, and then the credits fade away.
const HOLD_CREDIT_MS = 3000
const FADE_CREDITS_MS = 900
// If the roar's sound never reports that it ended, the music comes back after this long.
const ROAR_LONGEST_MS = 10000

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
  const keptLions = useKeptLions()
  const lion = useLionText()
  const { sound, quiet } = useSettings()
  const reducedMotion = useReducedMotion()
  const confirmRef = useRef<HTMLDialogElement>(null)
  const roarRef = useRef<HTMLAudioElement>(null)
  const [goalDraft, setGoalDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [justRoared, setJustRoared] = useState(false)
  // Holding the button fills a meter. Letting go early empties it again.
  const [holding, setHolding] = useState(false)
  const holdTimer = useRef<number | undefined>(undefined)
  // ROLL THE CREDITS fills the screen with them. Any key or a tap anywhere goes back.
  const [rolling, setRolling] = useState(false)
  const creditsRef = useRef<HTMLDialogElement>(null)
  const rollRef = useRef<HTMLDListElement>(null)
  const lastRef = useRef<HTMLDivElement>(null)
  // True while the credits fade out at their end.
  const [fading, setFading] = useState(false)
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

  useEffect(() => {
    const dialog = creditsRef.current
    if (!dialog) return
    if (rolling && !dialog.open) {
      dialog.showModal()
      // Focus goes to the box itself, without scrolling anything, so keys reach it.
      dialog.focus({ preventScroll: true })
    }
    if (!rolling && dialog.open) dialog.close()
    const roll = rollRef.current
    const frame = roll?.parentElement
    // With motion off nothing rises: the lines are a list to scroll (see the stylesheet).
    if (!rolling || !roll || !frame || reducedMotion) return

    // The game moves the lines itself, a little every frame, from just below the window until
    // the last has left the top. A browser animation is not used here: changing its speed
    // while it runs left the picture out of step with where the lines really were.
    // The last screen of the credits is exactly as tall as the window: the lion at its top,
    // the maker's credit at its foot. The roll ends when that screen fills the window, so the
    // lion is whole and nothing is cut off. Its height is set here, before anything is
    // measured.
    const lastScreen = lastRef.current
    if (lastScreen) lastScreen.style.height = `${frame.clientHeight}px`
    const distance = roll.offsetHeight + frame.clientHeight
    const restAt = lastScreen ? frame.clientHeight + lastScreen.offsetTop : distance
    let holdTimer: number | undefined
    let fadeTimer: number | undefined
    // The window must start, and stay, unscrolled: the lines are moved, not the window.
    frame.scrollTop = 0
    let risen = 0
    // `wanted` is the pace the scroll wheel has asked for, as a share of the normal one, and
    // `pace` follows it gradually, so the roll eases faster or slower and never lurches.
    let wanted = 1
    let pace = 1
    let last = performance.now()
    let frameId = 0

    function rise(now: number) {
      // A long gap (a hidden tab, a stalled frame) counts as one short step, not a leap.
      const seconds = Math.min(0.05, (now - last) / 1000)
      last = now
      pace += (wanted - pace) * Math.min(1, seconds * 6)
      risen = Math.min(restAt, risen + CREDITS_PACE * pace * seconds)
      if (roll) roll.style.transform = `translateY(${-risen}px)`
      if (frame && frame.scrollTop !== 0) frame.scrollTop = 0
      if (risen >= restAt) {
        // Hold there for a moment, fade out, and go back to the roar screen.
        holdTimer = window.setTimeout(() => {
          setFading(true)
          fadeTimer = window.setTimeout(() => setRolling(false), FADE_CREDITS_MS)
        }, HOLD_CREDIT_MS)
        return
      }
      frameId = requestAnimationFrame(rise)
    }
    frameId = requestAnimationFrame(rise)

    // The scroll wheel speeds the credits up or slows them down. Listened for directly so
    // the page behind does not scroll too.
    function changePace(event: WheelEvent) {
      event.preventDefault()
      wanted = Math.max(SLOWEST, Math.min(FASTEST, wanted * Math.exp(event.deltaY * 0.0012)))
    }
    dialog.addEventListener('wheel', changePace, { passive: false })
    return () => {
      cancelAnimationFrame(frameId)
      window.clearTimeout(holdTimer)
      window.clearTimeout(fadeTimer)
      setFading(false)
      dialog.removeEventListener('wheel', changePace)
    }
  }, [rolling, reducedMotion])

  // While the roar sounds the music is silent (see MusicPlayer). It is told when the roar
  // starts and when it is over, however it ends.
  const roarTimer = useRef<number | undefined>(undefined)

  function roarOver() {
    window.clearTimeout(roarTimer.current)
    setRoaring(false)
  }

  function playRoar() {
    const audio = roarRef.current
    if (!sound || !audio) return
    audio.currentTime = 0
    audio.volume = quiet ? LOW_VOLUME : 1
    setRoaring(true)
    window.clearTimeout(roarTimer.current)
    roarTimer.current = window.setTimeout(roarOver, ROAR_LONGEST_MS)
    audio.play().catch(roarOver)
  }

  // Leaving the screen mid-roar must not leave the music silenced.
  useEffect(() => roarOver, [])

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
  function credits(): { mark: string, label: string, text: string }[] {
    const say = lines.roar.credits
    const warmup = progress.onboardingChat.find((message) => message.role === 'user')?.text
    const path = progress.paths?.chosen ? progress.paths.list.find((idea) => idea.kind === progress.paths?.chosen) : undefined
    const done = (progress.road?.steps ?? []).filter((step) => step.doneAt)
    const cheers = countedCheers(progress)
    const marks = say.marks
    return [
      { mark: marks.starring, label: say.starring, text: progress.playerName || say.noName },
      { mark: marks.with, label: say.with, text: progress.lionName },
      { mark: marks.began, label: say.began, text: warmup ? clip(warmup) : '' },
      ...circles.map((circle) => ({
        mark: lines.card.marks[circle],
        label: levels[circles.indexOf(circle)].name.toUpperCase(),
        text: clip(progress.compass[circle].claim),
      })),
      { mark: marks.path, label: say.path, text: path?.name ?? '' },
      { mark: marks.goal, label: say.goal, text: progress.goalText },
      { mark: marks.obstacle, label: say.obstacle, text: progress.road?.obstacle ? clip(progress.road.obstacle) : '' },
      ...done.map((step) => ({ mark: marks.experiment, label: say.experiment, text: clip(step.text) })),
      { mark: marks.witnesses, label: say.witnesses, text: progress.witnesses.map((witness) => witness.name).join(', ') },
      { mark: marks.cheers, label: say.cheers, text: cheers > 0 ? say.cheerCount(cheers) : '' },
      {
        mark: marks.reached,
        label: say.reached,
        text: progress.goalAchievedAt
          ? new Date(progress.goalAchievedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : '',
      },
    ].filter((line) => line.text.trim())
  }

  if (!hydrated) return <main className="screen" />

  // The maker's credit. It is shown only when the credits are rolled on the whole screen, at
  // the foot of their last screen, and not in the panel on the roar screen.
  const makerCredit = (
    <div className={`${styles.credit} ${styles.maker}`}>
      <dt>{lines.roar.credits.madeBy}</dt>
      <dd>
        {/* A small local picture, so nothing is fetched from another site. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.makerFace} src="/images/cohortjuan.jpg" alt="" width={96} height={96} />
      </dd>
      <dd>{lines.roar.credits.maker}</dd>
      <dd>
        <a
          className={styles.makerLink}
          href={lines.about.creditUrl}
          target="_blank"
          rel="noopener noreferrer"
          // Kept out of the keyboard's reach: opening the credits would otherwise put focus
          // on this link, and the browser would scroll the window straight to the end to
          // show it. Any key leaves the credits anyway, so it is for a click or a tap.
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
        >
          {lines.roar.credits.makerMore}
        </a>
      </dd>
    </div>
  )

  // The player's lion as he is dressed today, for the end of the credits.
  const creditLion = (className: string) => (
    <LionAvatar
      className={className}
      wearing={wornIds(
        progress,
        keptLions.map((kept) => kept.progress),
      )}
      mane={maneSize(progress)}
      aura={auraSize(progress)}
      mood="happy"
    />
  )

  // The rows of the credits: a label and the player's own words under it.
  const creditRows = credits().map((line, index) => (
    <div key={index} className={styles.credit}>
      <dt>
        <span className={styles.mark} aria-hidden="true">
          {line.mark}
        </span>{' '}
        {line.label}
      </dt>
      <dd>{line.text}</dd>
    </div>
  ))

  // In the panel on the roar screen the rows end on the lion and the last line.
  const creditLines = (
    <>
      {creditRows}
      <div className={styles.credit}>
        <dd>{creditLion(styles.creditLion)}</dd>
        <dd className={styles.end}>{lines.roar.credits.end}</dd>
      </div>
    </>
  )

  return (
    <main className={`screen ${justRoared ? styles.shake : ''} ${holding ? styles.rumble : ''}`}>
      {/* The sun comes up behind everything as the roar goes out. */}
      {justRoared && <div className={styles.sunrise} aria-hidden="true" />}
      {/* Loaded with the screen, so the roar starts the moment the goal is confirmed. */}
      <audio ref={roarRef} src={ROAR_SOUND} preload="auto" onEnded={roarOver} />
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
              <button type="button" className="btn btn-quiet" onClick={() => setRolling(true)}>
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
              <dl
                className={justRoared ? styles.roll : undefined}
                style={{ animationDuration: `${Math.max(CREDITS_SHORTEST, credits().length * CREDIT_SECONDS)}s` }}
              >
                {creditLines}
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

      {/* The credits on the whole screen. They rise from the bottom and leave at the top. Any
          key, a click or a tap stops them and goes back. Left alone, they stop on their last
          screen, hold, fade out, and go back by themselves. */}
      <dialog
        ref={creditsRef}
        tabIndex={-1}
        className={fading ? `${styles.cinema} ${styles.cinemaFading}` : styles.cinema}
        aria-label={lines.roar.credits.heading}
        onClose={() => setRolling(false)}
        onClick={() => setRolling(false)}
        onKeyDown={(event) => {
          event.preventDefault()
          setRolling(false)
        }}
      >
        {rolling && (
          <>
            <p className={styles.cinemaTitle}>{lines.roar.credits.heading}</p>
            <div className={styles.cinemaWindow}>
              <dl ref={rollRef} className={styles.cinemaRoll}>
                {creditRows}
                {/* The last screen: the lion whole at the top, the last line, and the maker's
                    credit at the foot. The roll stops when it fills the window. */}
                <div ref={lastRef} className={styles.lastScreen}>
                  {creditLion(styles.lastLion)}
                  <p className={styles.end}>{lines.roar.credits.end}</p>
                  {makerCredit}
                </div>
              </dl>
            </div>
            <p className={styles.cinemaHint}>{lines.roar.credits.hint}</p>
          </>
        )}
      </dialog>

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
