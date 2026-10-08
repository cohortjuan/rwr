'use client'

import Link from 'next/link'
import LionAvatar from '@/components/LionAvatar'
import { auraSize, maneSize, wornIds } from '@/lib/accessories'
import { circles, circleScore, EVIDENCE_MAX } from '@/lib/compass'
import { levels } from '@/lib/levels'
import { lines } from '@/lib/lines'
import { useKeptLions, useProgress, type Circle } from '@/lib/progress'
import { useHydrated } from '@/lib/settings'
import quest from './OnboardingQuest.module.css'
import styles from './TrailCardScreen.module.css'

// The trail card: something to keep from the first sitting. Most players stop for the day once
// their goal is set, and the roar may be months away, so this is the ending they actually
// reach. It is their own lion and their own words on one card: the four circles, the path
// they took, their goal and their first step. Nothing on it is written by the AI except the
// name of a path they chose to take.

const levelOf = (circle: Circle) => levels[circles.indexOf(circle)]

export default function TrailCardScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const keptLions = useKeptLions()

  if (!hydrated) return <main className="screen" />

  const name = progress.playerName || lines.card.noName
  const hasGoal = progress.goalText.trim().length > 0
  const path = progress.paths?.chosen ? progress.paths.list.find((idea) => idea.kind === progress.paths?.chosen) : undefined
  const firstStep = progress.road?.steps[0]?.text
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={quest.hud}>
          <Link className={`btn btn-quiet ${quest.back}`} href="/crossroads" aria-label={lines.card.back}>
            {lines.level.back}
          </Link>
          <h1 className={quest.questName}>{lines.card.name}</h1>
        </header>

        {!hasGoal ? (
          <section className="panel">
            <p>{lines.card.locked}</p>
            <Link className="btn" href="/crossroads">
              {lines.card.toCrossroads}
            </Link>
          </section>
        ) : (
          <>
            <article className={styles.card} aria-label={lines.card.alt(name)}>
              <header className={styles.top}>
                <span className={styles.brand}>{lines.card.brand}</span>
                <span className={styles.date}>{today}</span>
              </header>

              <div className={styles.who}>
                <div className={styles.portrait}>
                  <LionAvatar
                    className={styles.lion}
                    wearing={wornIds(
                      progress,
                      keptLions.map((kept) => kept.progress),
                    )}
                    mane={maneSize(progress)}
                    aura={auraSize(progress)}
                    mood="happy"
                  />
                </div>
                <div>
                  <p className={styles.player}>{name}</p>
                  <p className={styles.with}>{lines.card.walkingWith(progress.lionName)}</p>
                </div>
              </div>

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
                    <span>{progress.compass[circle].claim || lines.card.noClaim}</span>
                  </li>
                ))}
              </ul>

              <dl className={styles.facts}>
                {path && (
                  <>
                    <dt>{lines.card.path}</dt>
                    <dd>{path.name}</dd>
                  </>
                )}
                <dt>{lines.card.goal}</dt>
                <dd className={styles.goal}>{progress.goalText}</dd>
                <dt>{lines.card.step}</dt>
                <dd>{firstStep || lines.card.noStep}</dd>
              </dl>

              <footer className={styles.bottom}>{lines.card.footer}</footer>
            </article>

            <p className={styles.fine}>{lines.card.draftNote}</p>
            <div className={styles.buttons}>
              <Link className="btn" href="/road">
                {progress.road ? lines.card.toRoad : lines.card.planRoad}
              </Link>
              <Link className="btn btn-quiet" href="/crossroads">
                {lines.card.back}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
