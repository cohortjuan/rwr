'use client'

import Link from 'next/link'
import IkigaiWheel from '@/components/IkigaiWheel'
import {
  circles,
  circleScore,
  compassTotal,
  EVIDENCE_MAX,
  NEEDS_MAX,
  strongestCircle,
  thinnestCircle,
  trailSteps,
  type TrailStep,
} from '@/lib/compass'
import { levels } from '@/lib/levels'
import { lines } from '@/lib/lines'
import { saveProgress, useLionText, useProgress, type Circle } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './TrailMapScreen.module.css'

// The circles follow the levels: Heart, Craft, Cause, Coin.
const levelOf = (circle: Circle) => levels[circles.indexOf(circle)]
const circleName = (circle: Circle) => levelOf(circle).name
const needIds = Object.keys(lines.map.needs) as (keyof typeof lines.map.needs)[]

const stepText = (step: TrailStep) => (step === 'tell' ? lines.map.tellStep : lines.map.circles[step].step)

function Pips({ score }: { score: number }) {
  return (
    <span className={styles.pips} aria-hidden="true">
      {Array.from({ length: EVIDENCE_MAX }, (_, index) => (
        <span key={index} className={index < score ? styles.pipOn : styles.pip} />
      ))}
    </span>
  )
}

// A box that is ticked or not, drawn in the game's own style.
function Tick({ on, label, onToggle, disabled }: { on: boolean, label: string, onToggle: () => void, disabled?: boolean }) {
  return (
    <button type="button" className={on ? styles.tickOn : styles.tick} aria-pressed={on} disabled={disabled} onClick={onToggle}>
      <span className={styles.box} aria-hidden="true">
        {on ? 'X' : ''}
      </span>
      <span>{label}</span>
    </button>
  )
}

// Evidence for each Ikigai circle, and one small real-world step for the thinnest one.
export default function TrailMapScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()

  if (!hydrated) return <main className="screen" />

  const total = compassTotal(progress)
  const strongest = strongestCircle(progress)
  const thinnest = thinnestCircle(progress)
  const questAnswers = progress.onboardingChat.filter((message) => message.role === 'user')

  function setClaim(circle: Circle, claim: string) {
    saveProgress({ compass: { ...progress.compass, [circle]: { ...progress.compass[circle], claim } } })
  }

  function toggleEvidence(circle: Circle, id: string) {
    const entry = progress.compass[circle]
    const evidence = entry.evidence.includes(id) ? entry.evidence.filter((item) => item !== id) : [...entry.evidence, id]
    playSfx('select', sound)
    saveProgress({ compass: { ...progress.compass, [circle]: { ...entry, evidence } } })
  }

  function toggleNeed(id: string) {
    const picked = progress.needs.includes(id)
    if (!picked && progress.needs.length >= NEEDS_MAX) return
    playSfx('select', sound)
    saveProgress({ needs: picked ? progress.needs.filter((need) => need !== id) : [...progress.needs, id] })
  }

  function toggleStep(step: TrailStep) {
    const done = progress.stepsDone.includes(step)
    // A step done is Pride Power earned, so it gets the level-up sound.
    playSfx(done ? 'select' : 'levelUp', sound)
    saveProgress({ stepsDone: done ? progress.stepsDone.filter((item) => item !== step) : [...progress.stepsDone, step] })
  }

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={styles.header}>
          <h1 className={styles.heading}>{lines.map.heading}</h1>
          <p className={styles.intro}>{lines.map.intro}</p>
        </header>

        <section className={`panel ${styles.summary}`}>
          <div className={styles.wheel}>
            <IkigaiWheel focus="all" />
          </div>
          <div>
            <p className={styles.total}>{lines.map.score(total.score, total.max)}</p>
            <ul className={styles.scores}>
              {circles.map((circle) => (
                <li key={circle}>
                  <span className={styles.scoreName}>{circleName(circle).toUpperCase()}</span>
                  <Pips score={circleScore(progress, circle)} />
                  <span className={styles.scoreNumber}>
                    {lines.map.circleScore(circleScore(progress, circle), EVIDENCE_MAX)}
                  </span>
                </li>
              ))}
            </ul>
            {total.score === 0 ? (
              <p className={styles.read}>{lines.map.empty}</p>
            ) : (
              <>
                {strongest && <p className={styles.read}>{lines.map.strongest(circleName(strongest))}</p>}
                <p className={styles.read}>{thinnest ? lines.map.thinnest(circleName(thinnest)) : lines.map.full}</p>
              </>
            )}
            {thinnest && total.score > 0 && !progress.stepsDone.includes(thinnest) && (
              <div className={styles.next}>
                <p className={styles.nextLabel}>{lines.map.nextStep}</p>
                <p className={styles.nextText}>{stepText(thinnest)}</p>
                <button type="button" className="btn" onClick={() => toggleStep(thinnest)}>
                  {lines.map.stepDone}
                </button>
              </div>
            )}
          </div>
        </section>

        <div className={styles.circles}>
          {circles.map((circle) => {
            const entry = progress.compass[circle]
            const text = lines.map.circles[circle]
            const hasClaim = entry.claim.trim().length > 0
            return (
              <section key={circle} className="panel">
                <h2 className={styles.circleHeading}>
                  {circleName(circle).toUpperCase()}
                  <Pips score={circleScore(progress, circle)} />
                </h2>
                <p className={styles.circleMeaning}>{levelOf(circle).circle}</p>

                {circle === 'heart' && questAnswers.length > 0 && (
                  <div className={styles.quotes}>
                    <p className={styles.small}>{lion(lines.map.fromQuest)}</p>
                    <ul>
                      {questAnswers.map((answer, index) => (
                        <li key={index}>{answer.text}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {circle === 'cause' && (
                  <div className={styles.needs}>
                    <p className={styles.small}>{lines.map.needsHeading(NEEDS_MAX)}</p>
                    <div className={styles.chips}>
                      {needIds.map((id) => {
                        const picked = progress.needs.includes(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            className={picked ? styles.chipOn : styles.chip}
                            aria-pressed={picked}
                            disabled={!picked && progress.needs.length >= NEEDS_MAX}
                            onClick={() => toggleNeed(id)}
                          >
                            {lines.map.needs[id]}
                          </button>
                        )
                      })}
                    </div>
                    <p className={styles.fine}>{lines.map.needsSource}</p>
                  </div>
                )}

                <div className="field">
                  <label htmlFor={`claim-${circle}`}>{text.question}</label>
                  <textarea
                    id={`claim-${circle}`}
                    rows={2}
                    maxLength={300}
                    placeholder={text.placeholder}
                    value={entry.claim}
                    onChange={(event) => setClaim(circle, event.target.value)}
                  />
                </div>

                <p className={styles.small}>{hasClaim ? lines.map.evidenceHeading : lines.map.claimHint}</p>
                <div className={styles.ticks}>
                  {Object.entries(text.evidence).map(([id, label]) => (
                    <Tick
                      key={id}
                      on={entry.evidence.includes(id)}
                      label={label}
                      disabled={!hasClaim}
                      onToggle={() => toggleEvidence(circle, id)}
                    />
                  ))}
                </div>

                {(circle === 'cause' || circle === 'coin') && (
                  <div className={styles.sources}>
                    <p className={styles.small}>{lines.map.outsideHeading}</p>
                    <ul>
                      {lines.map.sources[circle].map((source) => (
                        <li key={source.label}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.fine}>{lines.map.outsideNote}</p>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <section className={`panel ${styles.steps}`}>
          <h2 className={styles.circleHeading}>{lines.map.stepsHeading}</h2>
          <p className={styles.small}>{lines.map.stepsIntro}</p>
          <ul className={styles.stepList}>
            {trailSteps.map((step) => (
              <li key={step}>
                <Tick on={progress.stepsDone.includes(step)} label={stepText(step)} onToggle={() => toggleStep(step)} />
                <span className={styles.fine}>
                  {step === 'tell' ? lines.map.stepForAll : lines.map.stepFor(circleName(step))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className={styles.footer}>
          <Link className="btn btn-quiet" href="/upgrades">
            {lines.map.back}
          </Link>
        </p>
      </div>
    </main>
  )
}
