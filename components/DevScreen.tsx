'use client'

import Link from 'next/link'
import LionAvatar from '@/components/LionAvatar'
import { maneSize, wornIds } from '@/lib/accessories'
import { useAccount } from '@/lib/account'
import { lines } from '@/lib/lines'
import {
  saveProgress,
  todahForm,
  useKeptLions,
  useLionText,
  useProgress,
  type DevOverrides,
  type TodahForm,
} from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './DevScreen.module.css'

type ScreenPath = keyof typeof lines.dev.screens

const noOverrides: DevOverrides = { unlockAll: false, mane: null, form: null }
const maneSizes = [0, 1, 2, 3]
const forms: TodahForm[] = ['cub', 'nomad', 'leader']
const formLabel: Record<TodahForm, string> = {
  cub: lines.upgrades.formCub,
  nomad: lines.upgrades.formNomad,
  leader: lines.upgrades.formLeader,
}
const screens = Object.keys(lines.dev.screens) as ScreenPath[]

// Dev tools, for a dev account only: see any stage of the lion and open any screen without
// playing up to it. Everything here is kept with the lion in play and can be switched off.
export default function DevScreen() {
  const hydrated = useHydrated()
  const account = useAccount()
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()
  const keptLions = useKeptLions()

  if (!hydrated) return <main className="screen" />

  if (!account.dev) {
    return (
      <main className="screen">
        <div className="screen-inner">
          <h1 className={styles.heading}>{lines.dev.heading}</h1>
          <p className={styles.intro}>{account.checked ? lines.dev.locked : lines.dev.checking}</p>
          <Link className="btn btn-quiet" href="/">
            {lines.privacy.back}
          </Link>
        </div>
      </main>
    )
  }

  const others = keptLions.map((kept) => kept.progress)
  const dev = progress.dev ?? noOverrides
  const achieved = Boolean(progress.goalAchievedAt)

  function set(patch: Partial<DevOverrides>) {
    playSfx('select', sound)
    saveProgress({ dev: { ...dev, ...patch } })
  }

  // The roar is real progress, not a look, so it is switched on the game itself.
  function toggleRoar() {
    playSfx('select', sound)
    saveProgress({
      goalAchievedAt: achieved ? null : new Date().toISOString(),
      goalText: progress.goalText.trim() || lines.dev.demoGoal,
    })
  }

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={styles.header}>
          <h1 className={styles.heading}>{lines.dev.heading}</h1>
          <p className={styles.intro}>{lines.dev.intro}</p>
        </header>

        <section className={`panel ${styles.top}`}>
          <div className={styles.look}>
            <LionAvatar
              className={styles.preview}
              wearing={wornIds(progress, others)}
              mane={maneSize(progress)}
              blink
            />
            <p className={styles.formName}>{lion(lines.upgrades.todahLabel(formLabel[todahForm(progress, others)]))}</p>
          </div>

          <div className={styles.controls}>
            <h2 className={styles.subheading}>{lines.dev.lookHeading}</h2>
            <button type="button" className="btn" aria-pressed={dev.unlockAll} onClick={() => set({ unlockAll: !dev.unlockAll })}>
              {dev.unlockAll ? lines.dev.unlockOn : lines.dev.unlockOff}
            </button>

            <h2 className={styles.subheading}>{lines.dev.maneHeading}</h2>
            <div className={styles.choices} role="group" aria-label={lines.dev.maneHeading}>
              <button
                type="button"
                className={dev.mane === null ? 'btn' : 'btn btn-quiet'}
                aria-pressed={dev.mane === null}
                onClick={() => set({ mane: null })}
              >
                {lines.dev.auto}
              </button>
              {maneSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={dev.mane === size ? 'btn' : 'btn btn-quiet'}
                  aria-pressed={dev.mane === size}
                  onClick={() => set({ mane: size })}
                >
                  {lines.dev.maneLevel(size)}
                </button>
              ))}
            </div>

            <h2 className={styles.subheading}>{lines.dev.formHeading}</h2>
            <div className={styles.choices} role="group" aria-label={lines.dev.formHeading}>
              <button
                type="button"
                className={dev.form === null ? 'btn' : 'btn btn-quiet'}
                aria-pressed={dev.form === null}
                onClick={() => set({ form: null })}
              >
                {lines.dev.auto}
              </button>
              {forms.map((form) => (
                <button
                  key={form}
                  type="button"
                  className={dev.form === form ? 'btn' : 'btn btn-quiet'}
                  aria-pressed={dev.form === form}
                  onClick={() => set({ form })}
                >
                  {formLabel[form].toUpperCase()}
                </button>
              ))}
            </div>

            <h2 className={styles.subheading}>{lines.dev.roarHeading}</h2>
            <button type="button" className="btn" aria-pressed={achieved} onClick={toggleRoar}>
              {achieved ? lines.dev.roarOn : lines.dev.roarOff}
            </button>
            <p className={styles.fine}>{lines.dev.roarNote}</p>
          </div>
        </section>

        <section className={styles.group}>
          <h2 className={styles.subheading}>{lines.dev.screensHeading}</h2>
          <div className={styles.choices}>
            {screens.map((path) => (
              <Link key={path} className="btn btn-quiet" href={path}>
                {lines.dev.screens[path]}
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.group}>
          <button
            type="button"
            className="btn btn-quiet"
            disabled={progress.dev === null}
            onClick={() => {
              playSfx('select', sound)
              saveProgress({ dev: null })
            }}
          >
            {lines.dev.off}
          </button>
          <p className={styles.fine}>{lines.dev.offNote}</p>
        </section>
      </div>
    </main>
  )
}
