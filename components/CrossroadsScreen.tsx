'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import DialogBox from '@/components/DialogBox'
import { circles, circleScore, EVIDENCE_MAX, strongestCircle, thinnestCircle } from '@/lib/compass'
import { levels } from '@/lib/levels'
import { lines } from '@/lib/lines'
import { isNameAllowed } from '@/lib/names'
import { saveProgress, useLionText, useProgress, type Circle, type PathIdea, type Progress } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import { NAME_TOKEN } from '@/lib/tokens'
import quest from './OnboardingQuest.module.css'
import styles from './CrossroadsScreen.module.css'

// The Crossroads: the four circles side by side, one thing Todah notices across them, three
// paths to test if the player asks for them, and then the player's own main goal, which is the
// goal the roar waits for. Taking a path sets its milestone as that goal. Writing their own is
// always there too, and Todah says what he thinks of the goal either way.

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

const claimsOf = (progress: Progress) =>
  Object.fromEntries(circles.map((circle) => [circle, { claim: progress.compass[circle].claim, evidence: circleScore(progress, circle) }]))

// Three paths from the AI: the list, `care` when the player's words showed distress, or
// nothing when it could not be reached or its answer was not three whole paths.
async function askPaths(progress: Progress): Promise<{ list: PathIdea[], care: boolean }> {
  try {
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'paths', claims: claimsOf(progress) }),
    })
    if (!response.ok) return { list: [], care: false }
    const data = await response.json()
    return { list: Array.isArray(data.paths) ? (data.paths as PathIdea[]) : [], care: data.care === true }
  } catch {
    return { list: [], care: false }
  }
}

// What Todah thinks of the goal. Empty when the AI is off or down: the game then says its
// written line instead.
async function askAboutGoal(progress: Progress, goal: string): Promise<string> {
  if (progress.aiConsent !== 'yes') return ''
  try {
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'goal', goal, claims: claimsOf(progress) }),
    })
    if (!response.ok) return ''
    const data = await response.json()
    return String(data.reply ?? '').trim()
  } catch {
    return ''
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
  // The three paths: asked for only when the player taps for them.
  const [pathsState, setPathsState] = useState<'idle' | 'asking' | 'failed' | 'care'>('idle')
  const thoughtsFor = useRef('')
  const [thinking, setThinking] = useState(false)

  const name = progress.playerName || 'traveler'
  const missing = circles.filter((circle) => !progress.compass[circle].claim.trim())
  const ready = hydrated && missing.length === 0
  // The four claims Todah's words are about. If any of them changes, he looks again.
  const about = circles.map((circle) => `${progress.compass[circle].claim.trim()}|${circleScore(progress, circle)}`).join('~')
  const noticed = progress.crossroads?.for === about ? progress.crossroads.text : ''
  const hasGoal = progress.goalText.trim().length > 0
  const paths = progress.paths?.for === about ? progress.paths : null
  const aiOn = progress.aiConsent === 'yes'
  const thoughts = progress.goalThoughts?.for === progress.goalText ? progress.goalThoughts.text : ''

  useEffect(() => {
    if (!ready || noticed || requestedFor.current === about) return
    requestedFor.current = about
    void askTodah(progress).then((text) => saveProgress({ crossroads: { text, for: about } }))
  }, [ready, noticed, about, progress])

  // Once a goal is set, Todah says what he thinks of it, once per goal.
  useEffect(() => {
    const goal = progress.goalText
    if (!ready || !goal.trim() || !aiOn || progress.goalThoughts?.for === goal || thoughtsFor.current === goal) return
    thoughtsFor.current = goal
    setThinking(true)
    void askAboutGoal(progress, goal).then((text) => {
      // An empty answer is kept too, so a goal is asked about once and the written line shows.
      saveProgress({ goalThoughts: { text, for: goal } })
      setThinking(false)
    })
  }, [ready, aiOn, progress])

  async function showPaths() {
    playSfx('select', sound)
    setPathsState('asking')
    const answer = await askPaths(progress)
    if (answer.care) {
      setPathsState('care')
      return
    }
    if (answer.list.length !== 3) {
      setPathsState('failed')
      return
    }
    saveProgress({ paths: { for: about, list: answer.list, chosen: null } })
    setPathsState('idle')
  }

  // Taking a path makes its milestone the main goal. The words can still be changed after.
  function takePath(path: PathIdea) {
    const goal = path.goal.trim().slice(0, GOAL_MAX)
    if (!isNameAllowed(goal)) {
      setGoalDraft(goal)
      setNotice(lines.errors.nameBlocked)
      return
    }
    playSfx('complete', sound)
    saveProgress({ goalText: goal, paths: paths ? { ...paths, chosen: path.kind } : null })
    setNotice('')
    setEditing(false)
  }

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
    // A goal in the player's own words is no longer the path's milestone.
    saveProgress({ goalText: goal, paths: paths && goal !== progress.goalText ? { ...paths, chosen: null } : paths })
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

            {noticed && (!hasGoal || editing) && (
              <section className={`panel ${styles.goal}`}>
                <h2 className={styles.heading}>{lines.crossroads.pathsHeading}</h2>
                {pathsState === 'care' ? (
                  <p>{lines.crossroads.pathsCare}</p>
                ) : paths ? (
                  <>
                    <ul className={styles.paths}>
                      {paths.list.map((path) => (
                        <li key={path.kind} className={paths.chosen === path.kind ? styles.pathChosen : styles.path}>
                          <span className={styles.pathKind}>{lines.crossroads.pathsKinds[path.kind]}</span>
                          <span className={styles.pathName}>{path.name}</span>
                          <span>{path.why}</span>
                          <span>
                            <span className={styles.pathLabel}>{lines.crossroads.pathsGoal}</span> {path.goal}
                          </span>
                          {/* Pay and what the work takes are never stated here. The player looks them up. */}
                          <a
                            className={styles.pathCheck}
                            href={`https://www.onetonline.org/find/quick?s=${encodeURIComponent(path.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {lines.crossroads.pathsCheck}
                          </a>
                          <button type="button" className="btn" onClick={() => takePath(path)}>
                            {lines.crossroads.pathsChoose}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.fine}>{lines.crossroads.pathsCheckNote}</p>
                    <p className={styles.fine}>{lines.crossroads.pathsAfter}</p>
                  </>
                ) : aiOn && pathsState !== 'failed' ? (
                  <>
                    <p>{lion(lines.crossroads.pathsIntro)}</p>
                    {pathsState === 'asking' ? (
                      <p role="status">{lion(lines.crossroads.pathsThinking)}</p>
                    ) : (
                      <button type="button" className="btn" onClick={showPaths}>
                        {lines.crossroads.pathsAsk}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* The AI is off or down: three questions to find the paths by hand. */}
                    {pathsState === 'failed' && <p>{lion(lines.crossroads.pathsFailed)}</p>}
                    <ul className={styles.own}>
                      {lines.crossroads.pathsOwn.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}

            {noticed && (
              <section className={`panel ${styles.goal}`}>
                <h2 className={styles.heading}>{lines.crossroads.goalHeading}</h2>
                {hasGoal && !editing ? (
                  <>
                    <p className={styles.goalText}>{lines.crossroads.goalSet(progress.goalText)}</p>
                    {/* What Todah thinks of it: his own words with the AI on, the written line
                        when it is off, down, or still thinking. */}
                    {thinking ? (
                      <p role="status">{lion(lines.crossroads.goalThinking)}</p>
                    ) : thoughts ? (
                      <p>
                        {thoughts.split(NAME_TOKEN).join(name)} {lines.crossroads.goalNext}
                      </p>
                    ) : (
                      <p>{lion(lines.crossroads.done(name))}</p>
                    )}
                    <div className={styles.buttons}>
                      <Link className="btn" href="/road">
                        {lines.crossroads.toRoad}
                      </Link>
                      <Link className="btn btn-quiet" href="/upgrades">
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
