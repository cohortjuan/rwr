'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { lines } from '@/lib/lines'
import { saveProgress, useLionText, useProgress } from '@/lib/progress'
import { LOW_VOLUME, useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './RoarScreen.module.css'

const ROAR_SOUND = '/audio/roar-reward.mp3'

// The locked reward. Todah roars only after the player confirms their own goal is reached.
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

  function letHimRoar() {
    saveProgress({ goalAchievedAt: new Date().toISOString() })
    setConfirming(false)
    setJustRoared(true)
    playRoar()
  }

  if (!hydrated) return <main className="screen" />

  return (
    <main className={`screen ${justRoared ? styles.shake : ''}`}>
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
              <Link className="btn btn-quiet" href="/upgrades">
                {lines.roar.back}
              </Link>
            </div>
          </section>
        )}

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
        <div className={styles.buttons}>
          <button type="button" className="btn" onClick={letHimRoar}>
            {lines.roar.confirmYes(progress.lionSex)}
          </button>
          <button type="button" className="btn btn-quiet" autoFocus onClick={() => setConfirming(false)}>
            {lines.roar.confirmNo}
          </button>
        </div>
      </dialog>
    </main>
  )
}
