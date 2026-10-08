'use client'

import { useState } from 'react'
import Link from 'next/link'
import ConfirmBox from '@/components/ConfirmBox'
import DialogBox from '@/components/DialogBox'
import { circles, circleScore } from '@/lib/compass'
import { levels } from '@/lib/levels'
import { lines } from '@/lib/lines'
import { saveProgress, useLionText, useProgress, type Circle, type Progress, type RoadStep } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import { NAME_TOKEN } from '@/lib/tokens'
import quest from './OnboardingQuest.module.css'
import level from './LevelQuest.module.css'
import styles from './RoadScreen.module.css'

// The road toward the main goal. First the player names what is most likely to get in the
// way and settles an if-then plan for it. Then come three small experiments, one per circle,
// to try in the real world. When one is done they tell Todah how it went, and decide for
// themselves whether anything on the map has changed.
//
// With AI consent, one call drafts the plan and the experiments from the player's own words,
// and each check-in gets one reply. Without it, the draft comes from the trail map's own
// steps and Todah answers from his notes. Either way the player edits before anything is kept.

// `care` is set when the player's words sounded like distress: planning stops and Todah
// responds to that instead.
type Draft = { plan: string, steps: { circle: Circle, text: string }[], scripted: boolean, care?: boolean }

const STEPS = 3
const PLAN_MAX = 200
const STEP_MAX = 200
const levelOf = (circle: Circle) => levels[circles.indexOf(circle)]
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// The circles with the least evidence first: they are the ones most worth testing.
const thinnestFirst = (progress: Progress) => [...circles].sort((a, b) => circleScore(progress, a) - circleScore(progress, b))

// A draft built from the trail map alone: its own step for each of the thinnest circles, and
// a plan left for the player to write.
function scriptedDraft(progress: Progress): Draft {
  return {
    plan: '',
    steps: thinnestFirst(progress)
      .slice(0, STEPS)
      .map((circle) => ({ circle, text: lines.map.circles[circle].step })),
    scripted: true,
  }
}

async function draftRoad(progress: Progress, obstacle: string): Promise<Draft> {
  // No consent, no AI call.
  if (progress.aiConsent !== 'yes') return scriptedDraft(progress)
  try {
    const claims = Object.fromEntries(
      circles.map((circle) => [circle, { claim: progress.compass[circle].claim, evidence: circleScore(progress, circle) }]),
    )
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'road', claims, goal: progress.goalText, obstacle }),
    })
    if (!response.ok) return scriptedDraft(progress)
    const data = await response.json()
    if (data.care === true) return { ...scriptedDraft(progress), care: true }
    const steps: Draft['steps'] = (Array.isArray(data.steps) ? data.steps : [])
      .filter((step: { circle?: unknown, text?: unknown }) => circles.includes(step.circle as Circle) && typeof step.text === 'string')
      .map((step: { circle: Circle, text: string }) => ({ circle: step.circle, text: step.text.slice(0, STEP_MAX) }))
      .slice(0, STEPS)
    const plan = String(data.plan ?? '').slice(0, PLAN_MAX)
    if (!plan && steps.length === 0) return scriptedDraft(progress)
    // Any gap is filled from the map, so there are always three experiments to start from.
    for (const spare of scriptedDraft(progress).steps) {
      if (steps.length >= STEPS) break
      if (!steps.some((step) => step.circle === spare.circle)) steps.push(spare)
    }
    return { plan, steps, scripted: false }
  } catch {
    return scriptedDraft(progress)
  }
}

async function checkIn(progress: Progress, step: RoadStep, note: string): Promise<string> {
  if (progress.aiConsent !== 'yes') return lines.road.checkinScripted
  try {
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'checkin', circle: step.circle, step: step.text, goal: progress.goalText, note }),
    })
    if (!response.ok) return lines.road.checkinScripted
    const data = await response.json()
    return String(data.reply ?? '').trim() || lines.road.checkinScripted
  } catch {
    return lines.road.checkinScripted
  }
}

export default function RoadScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()
  const [obstacle, setObstacle] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [thinking, setThinking] = useState(false)
  const [notice, setNotice] = useState('')
  // Which experiment the player is reporting on, and what they have typed about it.
  const [reporting, setReporting] = useState<number | null>(null)
  const [report, setReport] = useState('')
  const [listening, setListening] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!hydrated) return <main className="screen" />

  const name = progress.playerName || 'traveler'
  const road = progress.road
  const hasGoal = progress.goalText.trim().length > 0

  async function plan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = obstacle.trim().slice(0, 300)
    if (!text) {
      setNotice(lines.road.obstacleEmpty)
      return
    }
    playSfx('select', sound)
    setNotice('')
    setThinking(true)
    setDraft(await draftRoad(progress, text))
    setThinking(false)
  }

  function editStep(index: number, text: string) {
    if (!draft) return
    setDraft({ ...draft, steps: draft.steps.map((step, at) => (at === index ? { ...step, text } : step)) })
    setNotice('')
  }

  // Only what the player has read and agreed to becomes their road.
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    const steps = draft.steps
      .map((step) => ({ circle: step.circle, text: step.text.trim().slice(0, STEP_MAX), doneAt: null, note: '', reply: '' }))
      .filter((step) => step.text)
    const sentence = draft.plan.trim().slice(0, PLAN_MAX)
    if (!sentence || steps.length === 0) {
      setNotice(lines.road.saveBlocked)
      return
    }
    playSfx('complete', sound)
    saveProgress({ road: { obstacle: obstacle.trim().slice(0, 300), plan: sentence, steps } })
    setDraft(null)
    setNotice('')
  }

  async function tell(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!road || reporting === null) return
    const step = road.steps[reporting]
    const note = report.trim().slice(0, 1000)
    if (!note) {
      setNotice(lines.road.howEmpty)
      return
    }
    setNotice('')
    setListening(true)
    const reply = await checkIn(progress, step, note)
    const steps = road.steps.map((entry, at) =>
      at === reporting ? { ...entry, doneAt: new Date().toISOString(), note, reply } : entry,
    )
    // A real-world step for a circle is a trail step done, and earns its Pride Power once.
    const firstForCircle = !progress.stepsDone.includes(step.circle)
    saveProgress({
      road: { ...road, steps },
      stepsDone: firstForCircle ? [...progress.stepsDone, step.circle] : progress.stepsDone,
    })
    playSfx(firstForCircle ? 'levelUp' : 'complete', sound)
    setListening(false)
    setReporting(null)
    setReport('')
  }

  function toggleEvidence(circle: Circle, id: string) {
    const entry = progress.compass[circle]
    const evidence = entry.evidence.includes(id) ? entry.evidence.filter((item) => item !== id) : [...entry.evidence, id]
    playSfx('select', sound)
    saveProgress({ compass: { ...progress.compass, [circle]: { ...entry, evidence } } })
  }

  function planAgain() {
    setConfirming(false)
    setObstacle('')
    setDraft(null)
    setReporting(null)
    saveProgress({ road: null })
  }

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={quest.hud}>
          <Link className={`btn btn-quiet ${quest.back}`} href="/crossroads" aria-label={lines.road.toCrossroads}>
            {lines.level.back}
          </Link>
          <h1 className={quest.questName}>{lines.road.name}</h1>
        </header>

        {!hasGoal && (
          <DialogBox text={lines.road.noGoal}>
            <Link className="btn" href="/crossroads">
              {lines.road.toCrossroads}
            </Link>
          </DialogBox>
        )}

        {hasGoal && <p className={styles.goal}>{lines.road.goal(progress.goalText)}</p>}

        {hasGoal && !road && !draft && !thinking && (
          <DialogBox text={lines.road.askObstacle(name)}>
            <form className={quest.answerForm} onSubmit={plan}>
              <label className="sr-only" htmlFor="road-obstacle">
                {lines.road.obstacleLabel}
              </label>
              <textarea
                id="road-obstacle"
                className={quest.input}
                rows={2}
                maxLength={300}
                placeholder={lines.road.obstaclePlaceholder}
                value={obstacle}
                onChange={(event) => {
                  setObstacle(event.target.value)
                  setNotice('')
                }}
              />
              <button type="submit" className="btn">
                {lines.road.obstacleSend}
              </button>
              <p className={quest.notice} role="alert">
                {notice}
              </p>
            </form>
          </DialogBox>
        )}

        {thinking && <DialogBox text={lion(lines.road.thinking)} mood="thinking" />}

        {hasGoal && !road && draft?.care && (
          <DialogBox text={lines.road.care(name)}>
            <Link className="btn" href="/upgrades">
              {lines.road.careLater}
            </Link>
            <button type="button" className="btn btn-quiet" onClick={() => setDraft({ ...draft, care: false })}>
              {lines.road.careAnyway}
            </button>
          </DialogBox>
        )}

        {hasGoal && !road && draft && !draft.care && (
          <>
            <DialogBox text={draft.scripted ? lines.road.reviewScripted(name) : lines.road.review(name)} />
            <form className={`panel ${styles.panel}`} onSubmit={save}>
              <h2 className={styles.heading}>{lines.road.planHeading}</h2>
              <div className="field">
                <label htmlFor="road-plan">{lines.road.planLabel}</label>
                <textarea
                  id="road-plan"
                  rows={2}
                  maxLength={PLAN_MAX}
                  placeholder={lines.road.planPlaceholder}
                  aria-describedby="road-plan-hint"
                  value={draft.plan}
                  onChange={(event) => {
                    setDraft({ ...draft, plan: event.target.value })
                    setNotice('')
                  }}
                />
                <span id="road-plan-hint" className="note">
                  {lines.road.planHint}
                </span>
              </div>

              <h2 className={styles.heading}>{lines.road.stepsHeading}</h2>
              <p className={styles.small}>{lines.road.stepsIntro}</p>
              {draft.steps.map((step, index) => (
                <div key={step.circle} className="field">
                  <label htmlFor={`road-step-${index}`}>{lines.road.stepLabel(index + 1, levelOf(step.circle).name)}</label>
                  <textarea
                    id={`road-step-${index}`}
                    rows={2}
                    maxLength={STEP_MAX}
                    value={step.text}
                    onChange={(event) => editStep(index, event.target.value)}
                  />
                </div>
              ))}
              <p className={quest.notice} role="alert">
                {notice}
              </p>
              <button type="submit" className="btn">
                {lines.road.save}
              </button>
            </form>
          </>
        )}

        {hasGoal && road && (
          <>
            {road.steps.every((step) => !step.doneAt) && reporting === null && <DialogBox text={lines.road.set(name)} />}

            <section className={`panel ${styles.panel}`}>
              <h2 className={styles.heading}>{lines.road.planHeading}</h2>
              <p className={styles.plan}>{road.plan}</p>
            </section>

            <section className={`panel ${styles.panel}`}>
              <h2 className={styles.heading}>{lines.road.stepsHeading}</h2>
              <ol className={styles.steps}>
                {road.steps.map((step, index) => {
                  const mapText = lines.map.circles[step.circle]
                  const claimed = progress.compass[step.circle].claim.trim().length > 0
                  return (
                    <li key={index} className={step.doneAt ? styles.stepDone : styles.step}>
                      <p className={styles.stepText}>{step.text}</p>
                      <p className={styles.fine}>
                        {lines.road.tests(levelOf(step.circle).name)}
                        {step.doneAt && ` · ${lines.road.doneOn(shortDate(step.doneAt))}`}
                      </p>

                      {!step.doneAt && reporting !== index && (
                        <button
                          type="button"
                          className="btn"
                          disabled={listening}
                          onClick={() => {
                            playSfx('select', sound)
                            setReporting(index)
                            setReport('')
                            setNotice('')
                          }}
                        >
                          {lines.road.did}
                        </button>
                      )}

                      {reporting === index && (
                        <form className={styles.report} onSubmit={tell}>
                          <label htmlFor="road-report">{lion(lines.road.howHeading)}</label>
                          <textarea
                            id="road-report"
                            className={quest.input}
                            rows={3}
                            maxLength={1000}
                            placeholder={lines.road.howPlaceholder}
                            value={report}
                            onChange={(event) => {
                              setReport(event.target.value)
                              setNotice('')
                            }}
                          />
                          <p className={quest.notice} role="status">
                            {listening ? lion(lines.road.listening) : notice}
                          </p>
                          <div className={styles.buttons}>
                            <button type="submit" className="btn" disabled={listening}>
                              {lion(lines.road.howSend)}
                            </button>
                            <button type="button" className="btn btn-quiet" disabled={listening} onClick={() => setReporting(null)}>
                              {lines.road.howCancel}
                            </button>
                          </div>
                        </form>
                      )}

                      {step.doneAt && (
                        <div className={styles.after}>
                          <p className={styles.fine}>{lines.road.youSaid}</p>
                          <p className={styles.said}>{step.note}</p>
                          <p className={styles.reply}>
                            <span className={styles.who}>{lion('TODAH')}</span>
                            {lion(step.reply.split(NAME_TOKEN).join(name))}
                          </p>
                          {claimed && (
                            <>
                              <p className={styles.small}>{lines.road.mapChanged(levelOf(step.circle).name)}</p>
                              <div className={level.ticks}>
                                {Object.entries(mapText.evidence).map(([id, label]) => {
                                  const on = progress.compass[step.circle].evidence.includes(id)
                                  return (
                                    <button
                                      key={id}
                                      type="button"
                                      className={on ? level.tickOn : level.tick}
                                      aria-pressed={on}
                                      onClick={() => toggleEvidence(step.circle, id)}
                                    >
                                      <span className={level.box} aria-hidden="true">
                                        {on ? 'X' : ''}
                                      </span>
                                      <span>{label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>

            <div className={styles.buttons}>
              <Link className="btn" href="/upgrades">
                {lines.road.toUpgrades}
              </Link>
              <Link className="btn btn-quiet" href="/map">
                {lines.road.toMap}
              </Link>
              <Link className="btn btn-quiet" href="/roar">
                {lines.road.toRoar}
              </Link>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirming(true)}>
                {lines.road.again}
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmBox
        open={confirming}
        text={lines.road.againConfirm}
        yes={lines.road.againYes}
        no={lines.road.againNo}
        onYes={planAgain}
        onNo={() => setConfirming(false)}
      />
    </main>
  )
}
