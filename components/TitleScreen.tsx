'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmBox from '@/components/ConfirmBox'
import LionAvatar from '@/components/LionAvatar'
import LionsBox from '@/components/LionsBox'
import LoginBox from '@/components/LoginBox'
import NameLionBox from '@/components/NameLionBox'
import { Birds, Horizon, Stars } from '@/components/Savannah'
import TvStatic from '@/components/TvStatic'
import { useAccountEmail } from '@/lib/account'
import { wornIds } from '@/lib/accessories'
import { MUSIC_TRACK, SEATED_SPRITE } from '@/lib/assets'
import { useAudioGate } from '@/lib/audioGate'
import { lines } from '@/lib/lines'
import { hasSavedGame, startNewLion, switchToLion, useKeptLions, useProgress } from '@/lib/progress'
import { useHydrated, useReducedMotion, useSettings } from '@/lib/settings'
import styles from './TitleScreen.module.css'

// How long to wait to learn whether the browser allows sound before starting anyway.
const AUDIO_CHECK_MS = 1000

// Keys that should never count as "any key": they belong to the browser and to keyboard users.
const ignoredKeys = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'CapsLock'])

export default function TitleScreen() {
  const router = useRouter()
  const hydrated = useHydrated()
  const reducedMotion = useReducedMotion()
  const progress = useProgress()
  const [walkDone, setWalkDone] = useState(false)
  const [boxOpen, setBoxOpen] = useState(false)
  const email = useAccountEmail()
  const signedIn = Boolean(email)
  const keptLions = useKeptLions()
  const [confirmingNew, setConfirmingNew] = useState(false)
  const [namingLion, setNamingLion] = useState(false)
  const [lionsOpen, setLionsOpen] = useState(false)
  const { sound } = useSettings()
  const audioGate = useAudioGate()
  const [poweredOn, setPoweredOn] = useState(false)
  const [audioCheckDone, setAudioCheckDone] = useState(false)

  // Browsers block sound until the player interacts. When that happens the screen starts
  // "switched off" and asks for one tap, so the walk-in can play with its music.
  const wantsMusic = sound && Boolean(MUSIC_TRACK)
  const needsPowerOn = hydrated && wantsMusic && audioGate === 'blocked' && !poweredOn
  const checkingAudio = wantsMusic && audioGate === 'unknown' && !audioCheckDone
  const started = hydrated && !needsPowerOn && !checkingAudio

  useEffect(() => {
    const timer = window.setTimeout(() => setAudioCheckDone(true), AUDIO_CHECK_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // Reduced motion: the cub starts seated and never walks.
  const seated = walkDone || reducedMotion
  const returning = hydrated && (signedIn || hasSavedGame(progress) || keptLions.length > 0)

  const enterGame = useCallback(() => {
    router.push(progress.onboardingDone ? '/upgrades' : '/quest')
  }, [router, progress.onboardingDone])

  // First press skips the walk. After that, press start opens the login box.
  // Returning players get the Continue? choices instead, so a stray key does nothing there.
  const advance = useCallback(() => {
    if (!started) {
      // The same tap also starts the music (see MusicPlayer).
      if (needsPowerOn) setPoweredOn(true)
      return
    }
    if (!seated) {
      setWalkDone(true)
      return
    }
    if (!returning) setBoxOpen(true)
  }, [started, needsPowerOn, seated, returning])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (boxOpen || confirmingNew || namingLion || lionsOpen || ignoredKeys.has(event.key)) return
      const target = event.target as HTMLElement | null
      if (target && target.closest('button, a, input, textarea, dialog')) return
      advance()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [advance, boxOpen, confirmingNew, namingLion, lionsOpen])

  // A new game never erases the one in play: that lion is kept and a fresh one starts.
  // With nothing to keep, there is nothing to confirm, so it goes straight to the name.
  function askNewGame() {
    if (hasSavedGame(progress)) setConfirmingNew(true)
    else setNamingLion(true)
  }

  function newGame(lionName: string) {
    setNamingLion(false)
    startNewLion(lionName)
    if (signedIn) router.push('/quest')
    else setBoxOpen(true)
  }

  function playLion(id: string) {
    switchToLion(id)
    setLionsOpen(false)
  }

  return (
    <>
      <main className={poweredOn ? styles.stagePoweringOn : styles.stage} onClick={advance}>
        <div className={styles.sky} aria-hidden="true" />
        <Stars />
        <div className={styles.sun} aria-hidden="true" />
        {/* After the sun and before the hills, so the birds cross its face and pass behind the hills. */}
        {started && <Birds />}
        <div className={styles.hills} aria-hidden="true" />
        {started && <Horizon />}
        <div className={styles.ground} aria-hidden="true" />

        {/* The title drops in once the cub has arrived. */}
        {started && seated && (
          <div className={styles.logo}>
            <h1 className={styles.name}>{lines.title.name}</h1>
            <p className={styles.subtitle}>{lines.title.subtitle}</p>
          </div>
        )}

        {!started ? null : seated && SEATED_SPRITE ? (
          <div className={styles.cubFacing} role="img" aria-label="Todah, a lion cub, sitting and facing you">
            <LionAvatar
              wearing={wornIds(
                progress,
                keptLions.map((kept) => kept.progress),
              )}
              blink
            />
          </div>
        ) : (
          <div
            className={seated ? styles.cubSeated : styles.cubWalking}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setWalkDone(true)
            }}
            role="img"
            aria-label="Todah, a lion cub"
          >
            <div className={seated ? styles.spriteStill : styles.spriteWalk} />
          </div>
        )}

        <div className={styles.prompt} onClick={(event) => event.stopPropagation()}>
          {started && !seated && <p className={styles.hint}>{lines.title.skipHint}</p>}

          {started && seated && !returning && (
            <button type="button" className={styles.pressStart} onClick={() => setBoxOpen(true)}>
              {lines.title.pressStart}
            </button>
          )}

          {started && seated && returning && (
            <div className={styles.continue}>
              <p className={styles.continuePrompt}>{lines.title.continuePrompt}</p>
              <div className={styles.continueButtons}>
                <button type="button" className="btn" onClick={enterGame}>
                  {lines.title.continueYes}
                </button>
                <button type="button" className="btn btn-quiet" onClick={askNewGame}>
                  {lines.title.continueNew}
                </button>
                {keptLions.length > 0 && (
                  <button type="button" className="btn btn-quiet" onClick={() => setLionsOpen(true)}>
                    {lines.title.continueLions}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {needsPowerOn && (
          <div className={styles.powerOff}>
            <TvStatic />
            <button type="button" className={styles.powerOn} onClick={() => setPoweredOn(true)}>
              {lines.title.powerOn}
            </button>
            <p className={styles.powerHint}>{lines.title.powerOnHint}</p>
          </div>
        )}
      </main>

      <ConfirmBox
        open={confirmingNew}
        text={lines.title.newGameConfirm(progress.lionName)}
        yes={lines.title.newGameYes}
        no={lines.title.newGameNo}
        onYes={() => {
          setConfirmingNew(false)
          setNamingLion(true)
        }}
        onNo={() => setConfirmingNew(false)}
      />

      <NameLionBox open={namingLion} onName={newGame} onCancel={() => setNamingLion(false)} />

      <LionsBox open={lionsOpen} lions={keptLions} onPlay={playLion} onClose={() => setLionsOpen(false)} />

      <LoginBox open={boxOpen} onClose={() => setBoxOpen(false)} onEnter={enterGame} />
    </>
  )
}
