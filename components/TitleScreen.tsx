'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginBox from '@/components/LoginBox'
import { SEATED_SPRITE } from '@/lib/assets'
import { lines } from '@/lib/lines'
import { clearProgress, hasSavedGame, useProgress } from '@/lib/progress'
import { useHydrated, useReducedMotion } from '@/lib/settings'
import { getSupabase } from '@/lib/supabase'
import styles from './TitleScreen.module.css'

// Keys that should never count as "any key": they belong to the browser and to keyboard users.
const ignoredKeys = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'CapsLock'])

export default function TitleScreen() {
  const router = useRouter()
  const hydrated = useHydrated()
  const reducedMotion = useReducedMotion()
  const progress = useProgress()
  const [walkDone, setWalkDone] = useState(false)
  const [boxOpen, setBoxOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  // Reduced motion: the cub starts seated and never walks.
  const seated = walkDone || reducedMotion
  const returning = hydrated && (signedIn || hasSavedGame(progress))

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session))
    })
    return () => {
      active = false
    }
  }, [])

  const enterGame = useCallback(() => {
    router.push(progress.onboardingDone ? '/upgrades' : '/quest')
  }, [router, progress.onboardingDone])

  // First press skips the walk. After that, press start opens the login box.
  // Returning players get the Continue? choices instead, so a stray key does nothing there.
  const advance = useCallback(() => {
    if (!seated) {
      setWalkDone(true)
      return
    }
    if (!returning) setBoxOpen(true)
  }, [seated, returning])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (boxOpen || ignoredKeys.has(event.key)) return
      const target = event.target as HTMLElement | null
      if (target && target.closest('button, a, input, textarea, dialog')) return
      advance()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [advance, boxOpen])

  function newGame() {
    if (!window.confirm(lines.title.newGameConfirm)) return
    clearProgress()
    if (signedIn) router.push('/quest')
    else setBoxOpen(true)
  }

  return (
    <>
      <main className={styles.stage} onClick={advance}>
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.sun} aria-hidden="true" />
        <div className={styles.hills} aria-hidden="true" />
        <div className={styles.ground} aria-hidden="true" />

        {/* The title drops in once the cub has arrived. */}
        {seated && (
          <div className={styles.logo}>
            <h1 className={styles.name}>{lines.title.name}</h1>
            <p className={styles.subtitle}>{lines.title.subtitle}</p>
          </div>
        )}

        {seated && SEATED_SPRITE ? (
          <div
            className={styles.cubFacing}
            style={{ backgroundImage: `url(${SEATED_SPRITE})` }}
            role="img"
            aria-label="Todah, a lion cub, sitting and facing you"
          />
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
          {!seated && <p className={styles.hint}>{lines.title.skipHint}</p>}

          {seated && !returning && (
            <button type="button" className={styles.pressStart} onClick={() => setBoxOpen(true)}>
              {lines.title.pressStart}
            </button>
          )}

          {seated && returning && (
            <div className={styles.continue}>
              <p className={styles.continuePrompt}>{lines.title.continuePrompt}</p>
              <div className={styles.continueButtons}>
                <button type="button" className="btn" onClick={enterGame}>
                  {lines.title.continueYes}
                </button>
                <button type="button" className="btn btn-quiet" onClick={newGame}>
                  {lines.title.continueNew}
                </button>
              </div>
            </div>
          )}
        </div>

      </main>

      <LoginBox open={boxOpen} onClose={() => setBoxOpen(false)} onEnter={enterGame} />
    </>
  )
}
