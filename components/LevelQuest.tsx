'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import DialogBox from '@/components/DialogBox'
import { LEVEL_SPARKS } from '@/lib/accessories'
import { circles, circleScore, EVIDENCE_MAX, NEEDS_MAX } from '@/lib/compass'
import { LEVEL_ANSWERS, liveLevels, type LiveLevel } from '@/lib/levels'
import { lines } from '@/lib/lines'
import { withLionName } from '@/lib/names'
import { saveProgress, useProgress, type ChatMessage, type Progress } from '@/lib/progress'
import { useHydrated, useReducedMotion, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import { NAME_TOKEN } from '@/lib/tokens'
import quest from './OnboardingQuest.module.css'
import styles from './LevelQuest.module.css'

// One level of the interview. Todah opens with a scripted question, asks three follow-ups
// (the AI when the player has agreed to it, the script otherwise), and then the talk becomes
// one claim and its evidence. The player checks and corrects that before it is marked on the
// trail map: nothing is saved there that they have not seen.

type Step = 'intro' | 'consent' | 'chat' | 'summing' | 'review' | 'done'

// `capped` is set when the script took over because today's share of AI replies is used up.
type TodahReply = { reply: string, complete: boolean, scripted: boolean, capped?: boolean }
type Summary = { claim: string, evidence: string[], scripted: boolean }

const CLAIM_MAX = 300
const noChat: ChatMessage[] = []
const needIds = Object.keys(lines.map.needs) as (keyof typeof lines.map.needs)[]

const answersIn = (chat: ChatMessage[]) => chat.filter((message) => message.role === 'user').length

// The talk is over once every answer is in and Todah has had the last word.
const isFinished = (chat: ChatMessage[]) =>
  answersIn(chat) >= LEVEL_ANSWERS && chat[chat.length - 1]?.role === 'todah'

function initialStep(progress: Progress, circle: LiveLevel): Step {
  const chat = progress.levelChat[circle] ?? []
  if (progress.levelsDone.includes(circle)) return 'done'
  if (isFinished(chat)) return 'summing'
  if (chat.length > 0) return 'chat'
  return 'intro'
}

// Todah writes a token instead of the player's name, so the name never leaves this device.
function withName(text: string, name: string): string {
  return text.split(NAME_TOKEN).join(name)
}

// Scripted stand-in for the AI: used in demo mode, without consent, or when the AI is down.
function scriptedReply(circle: LiveLevel, history: ChatMessage[]): TodahReply {
  const text = lines.level.circles[circle]
  // The opener is already in the history, so the first follow-up is the second thing Todah says.
  const asked = history.filter((message) => message.role === 'todah').length - 1
  const line = text.scripted[asked]
  return { reply: line ?? text.scriptedClose, complete: !line, scripted: true }
}

// What Todah remembers going into this level: the claims already on the map from the other
// circles and, for the first level, the first thing the player said in Quest 1. It is sent
// only with AI consent, and goes through the same scrubbing as an answer.
function memoryOf(progress: Progress, circle: LiveLevel) {
  const claims = Object.fromEntries(
    circles
      .filter((other) => other !== circle && progress.compass[other].claim.trim())
      .map((other) => [other, { claim: progress.compass[other].claim, evidence: circleScore(progress, other) }]),
  )
  const warmup = circle === 'heart' ? progress.onboardingChat.find((message) => message.role === 'user')?.text : undefined
  // What people who know the player said they would come to them for. Words only, no names.
  const witness = circle === 'craft' ? progress.witnesses.slice(0, 2).map((entry) => entry.text) : undefined
  return { claims, warmup: warmup?.slice(0, 300), witness }
}

async function askTodah(progress: Progress, circle: LiveLevel, history: ChatMessage[], demo: boolean): Promise<TodahReply> {
  // No consent, no AI call: the scripted questions run entirely in the browser.
  if (demo || progress.aiConsent !== 'yes') return scriptedReply(circle, history)
  try {
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'interview', circle, messages: history, ...memoryOf(progress, circle) }),
    })
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}))
      return { ...scriptedReply(circle, history), capped: data.error === 'daily' }
    }
    if (!response.ok) return scriptedReply(circle, history)
    const data = await response.json()
    const reply = String(data.reply ?? '').trim()
    if (!reply) return scriptedReply(circle, history)
    return { reply, complete: Boolean(data.complete), scripted: false }
  } catch {
    return scriptedReply(circle, history)
  }
}

// Without the AI there is no summary, so the form starts from the player's own first answer
// with nothing ticked.
function ownWords(history: ChatMessage[]): Summary {
  const first = history.find((message) => message.role === 'user')?.text ?? ''
  return { claim: first.slice(0, CLAIM_MAX), evidence: [], scripted: true }
}

async function sumUp(progress: Progress, circle: LiveLevel, history: ChatMessage[], demo: boolean): Promise<Summary> {
  if (demo || progress.aiConsent !== 'yes') return ownWords(history)
  try {
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'summary', circle, messages: history }),
    })
    if (!response.ok) return ownWords(history)
    const data = await response.json()
    const claim = String(data.claim ?? '').trim()
    if (!claim) return ownWords(history)
    const known = Object.keys(lines.map.circles[circle].evidence)
    const evidence = Array.isArray(data.evidence) ? known.filter((id) => data.evidence.includes(id)) : []
    return { claim: claim.slice(0, CLAIM_MAX), evidence, scripted: false }
  } catch {
    return ownWords(history)
  }
}

export default function LevelQuest({ circle, demo }: { circle: LiveLevel, demo: boolean }) {
  const hydrated = useHydrated()
  const progress = useProgress()
  // Wait for saved progress so a returning player resumes where they stopped.
  if (!hydrated) return <main className="screen" />
  return <Level circle={circle} demo={demo} progress={progress} startAt={initialStep(progress, circle)} />
}

function Level({ circle, demo, progress, startAt }: { circle: LiveLevel, demo: boolean, progress: Progress, startAt: Step }) {
  const { sound } = useSettings()
  const reducedMotion = useReducedMotion()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step>(startAt)
  const [answerDraft, setAnswerDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [usedScript, setUsedScript] = useState(false)
  const [capped, setCapped] = useState(false)
  const [notice, setNotice] = useState('')
  const [claim, setClaim] = useState('')
  const [evidence, setEvidence] = useState<string[]>([])
  const [ownSummary, setOwnSummary] = useState(false)
  // Length of the chat we last asked Todah to reply to, so each turn is requested once.
  const requestedFor = useRef(-1)
  const summedUp = useRef(false)

  const text = lines.level.circles[circle]
  const mapText = lines.map.circles[circle]
  const chat = progress.levelChat[circle] ?? noChat
  const answers = answersIn(chat)
  const lastTodah = [...chat].reverse().find((message) => message.role === 'todah')
  const awaitingAnswer = chat.length > 0 && chat[chat.length - 1].role === 'todah' && !isFinished(chat)
  const name = progress.playerName || 'traveler'
  const lion = (line: string) => withLionName(line, progress.lionName)
  // The level that follows this one, if there is one.
  const nextLevel = liveLevels[liveLevels.indexOf(circle) + 1]

  const saveChat = useCallback(
    (next: ChatMessage[]) => saveProgress({ levelChat: { ...progress.levelChat, [circle]: next } }),
    [progress.levelChat, circle],
  )

  function go(next: Step) {
    playSfx('select', sound)
    setStep(next)
  }

  // The opening question is scripted, so the level starts without an AI call.
  function begin() {
    saveChat([{ role: 'todah', text: text.opener }])
    summedUp.current = false
    requestedFor.current = -1
    go('chat')
  }

  function start() {
    if (demo || progress.aiConsent) begin()
    else go('consent')
  }

  function chooseConsent(choice: 'yes' | 'no') {
    saveProgress({ aiConsent: choice, levelChat: { ...progress.levelChat, [circle]: [{ role: 'todah', text: text.opener }] } })
    go('chat')
  }

  const requestReply = useCallback(
    async (history: ChatMessage[]) => {
      setPending(true)
      setNotice('')
      const result = await askTodah(progress, circle, history, demo)
      if (result.scripted) setUsedScript(true)
      if (result.capped) setCapped(true)
      saveChat([...history, { role: 'todah', text: result.reply }])
      setPending(false)
      if (result.complete) setStep('summing')
    },
    [progress, circle, demo, saveChat],
  )

  // Todah owes a reply whenever the chat ends on the player's answer. Driving this from the
  // saved chat also resumes cleanly after a reload mid-reply.
  useEffect(() => {
    if (step !== 'chat' || chat.length === 0 || chat[chat.length - 1].role === 'todah') return
    if (requestedFor.current === chat.length) return
    requestedFor.current = chat.length
    void requestReply(chat)
  }, [step, chat, requestReply])

  // A finished talk is summed up once, into a form the player then corrects.
  useEffect(() => {
    if (step !== 'summing' || summedUp.current) return
    summedUp.current = true
    void sumUp(progress, circle, chat, demo).then((summary) => {
      setClaim(summary.claim)
      setEvidence(summary.evidence)
      setOwnSummary(summary.scripted)
      playSfx('complete', sound)
      setStep('review')
    })
  }, [step, progress, circle, chat, demo, sound])

  // Keep the newest line and the answer box in view.
  useEffect(() => {
    const anchor = bottomRef.current
    const content = anchor?.parentElement
    if (!anchor || !content || step === 'intro' || step === 'consent') return
    const follow = () => anchor.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'end' })
    const observer = new ResizeObserver(follow)
    observer.observe(content)
    return () => observer.disconnect()
  }, [step, reducedMotion])

  function submitAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const answer = answerDraft.trim().slice(0, 1000)
    if (!answer) {
      setNotice(lines.errors.emptyAnswer)
      return
    }
    playSfx('select', sound)
    setAnswerDraft('')
    setNotice('')
    saveChat([...chat, { role: 'user', text: answer }])
  }

  // Going back to an earlier answer drops everything said after it, since the later questions
  // were about the old answer. The old words are put back in the box to edit.
  function changeAnswer(index: number) {
    playSfx('select', sound)
    setAnswerDraft(chat[index].text)
    setNotice('')
    summedUp.current = false
    requestedFor.current = -1
    saveChat(chat.slice(0, index))
    setStep('chat')
  }

  function toggleEvidence(id: string) {
    playSfx('select', sound)
    setEvidence(evidence.includes(id) ? evidence.filter((item) => item !== id) : [...evidence, id])
  }

  // Cause also asks which of the world's needs the player cares about most. That is theirs to
  // pick: the AI never chooses it for them.
  function toggleNeed(id: string) {
    const picked = progress.needs.includes(id)
    if (!picked && progress.needs.length >= NEEDS_MAX) return
    playSfx('select', sound)
    saveProgress({ needs: picked ? progress.needs.filter((need) => need !== id) : [...progress.needs, id] })
  }

  // Only what the player has seen and agreed to goes on the map.
  function markMap(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const sentence = claim.trim().slice(0, CLAIM_MAX)
    if (!sentence) {
      setNotice(lines.level.emptyClaim)
      return
    }
    const before = circleScore(progress, circle)
    saveProgress({
      compass: { ...progress.compass, [circle]: { claim: sentence, evidence } },
      levelsDone: progress.levelsDone.includes(circle) ? progress.levelsDone : [...progress.levelsDone, circle],
    })
    playSfx(Math.min(evidence.length, EVIDENCE_MAX) > before ? 'levelUp' : 'complete', sound)
    setNotice('')
    setStep('done')
  }

  // Craft is the one level whose answer is also a line on the resume: the skill named in the
  // claim can be dropped into the Claws upgrade, where the player then gives it proof.
  const skill = progress.compass.craft.claim.trim().replace(/^i\s*(am|'m)\s+good\s+at\s+/i, '').replace(/[.!]+$/, '')
  const claws = progress.upgrades.claws ?? ''
  const inClaws = skill.length > 0 && claws.toLowerCase().includes(skill.toLowerCase())

  function addToClaws() {
    if (!skill || inClaws) return
    playSfx('select', sound)
    saveProgress({ upgrades: { ...progress.upgrades, claws: claws.trim() ? `${claws.trim()}, ${skill}` : skill } })
  }

  // Walking the level again starts a fresh talk. The map keeps what it says until the new
  // talk is marked on it.
  function again() {
    saveProgress({
      levelChat: { ...progress.levelChat, [circle]: [] },
      levelsDone: progress.levelsDone.filter((done) => done !== circle),
    })
    setClaim('')
    setEvidence([])
    setUsedScript(false)
    go('intro')
  }

  if (!progress.onboardingDone && !demo) {
    return (
      <main className="screen">
        <div className="screen-inner">
          <header className={quest.hud}>
            <h1 className={quest.questName}>{text.name}</h1>
          </header>
          <DialogBox text={lion(lines.level.locked)}>
            <Link className="btn" href="/quest">
              {lines.level.toQuest}
            </Link>
          </DialogBox>
        </div>
      </main>
    )
  }

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={quest.hud}>
          <h1 className={quest.questName}>{text.name}</h1>
          <ol className={quest.pips} aria-label={lines.level.progress(Math.min(answers, LEVEL_ANSWERS), LEVEL_ANSWERS)}>
            {Array.from({ length: LEVEL_ANSWERS }, (_, index) => (
              <li key={index} className={index < answers || step === 'done' ? quest.pipOn : quest.pip} />
            ))}
          </ol>
        </header>

        {step === 'intro' && (
          <DialogBox text={text.intro}>
            <button type="button" className="btn" autoFocus onClick={start}>
              {text.start}
            </button>
            <Link className="btn btn-quiet" href="/map">
              {lines.level.toMap}
            </Link>
          </DialogBox>
        )}

        {step === 'consent' && (
          <DialogBox text={lines.onboarding.consent}>
            <button type="button" className="btn" onClick={() => chooseConsent('yes')}>
              {lines.onboarding.consentYes}
            </button>
            <button type="button" className="btn" onClick={() => chooseConsent('no')}>
              {lines.onboarding.consentNo}
            </button>
            <Link className="btn btn-quiet" href="/privacy">
              {lines.onboarding.consentMore}
            </Link>
          </DialogBox>
        )}

        {(step === 'chat' || step === 'summing' || step === 'review') && chat.length > 1 && (
          <ol className={quest.log} aria-label="Earlier in this level">
            {chat.slice(0, awaitingAnswer ? -1 : undefined).map((message, index) => (
              <li key={index} className={message.role === 'user' ? quest.logUser : quest.logTodah}>
                <span className={quest.logWho}>{message.role === 'user' ? name : lion('TODAH')}</span>
                {message.role === 'user' ? message.text : lion(withName(message.text, name))}
                {message.role === 'user' && !pending && step !== 'summing' && (
                  <button
                    type="button"
                    className={quest.change}
                    aria-label={lines.onboarding.changeLabel}
                    title={lines.onboarding.changeLabel}
                    onClick={() => changeAnswer(index)}
                  >
                    {lines.onboarding.change}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}

        {step === 'chat' && (
          <>
            {pending && <DialogBox text={lines.onboarding.thinking} mood="thinking" />}

            {!pending && awaitingAnswer && lastTodah && (
              <DialogBox text={lion(withName(lastTodah.text, name))}>
                <form className={quest.answerForm} onSubmit={submitAnswer}>
                  <label className="sr-only" htmlFor="level-answer">
                    {lines.onboarding.answerLabel}
                  </label>
                  <textarea
                    id="level-answer"
                    className={quest.input}
                    autoFocus
                    rows={3}
                    maxLength={1000}
                    placeholder={lines.onboarding.answerPlaceholder}
                    value={answerDraft}
                    onChange={(event) => setAnswerDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        event.currentTarget.form?.requestSubmit()
                      }
                    }}
                  />
                  <button type="submit" className="btn">
                    {lines.onboarding.send}
                  </button>
                </form>
              </DialogBox>
            )}

            <p className={quest.notice} role="status">
              {notice ||
                (usedScript && !demo && progress.aiConsent === 'yes'
                  ? lion(capped ? lines.errors.aiDaily : lines.errors.aiUnavailable)
                  : '')}
            </p>
          </>
        )}

        {step === 'summing' && <DialogBox text={lion(lines.level.summing)} mood="thinking" />}

        {step === 'review' && (
          <>
            <DialogBox text={ownSummary ? lines.level.reviewScripted(name) : lines.level.review(name)} />
            <form className={`panel ${styles.review}`} onSubmit={markMap}>
              <h2 className={styles.heading}>{lion(lines.level.reviewHeading)}</h2>
              <div className="field">
                <label htmlFor="level-claim">{mapText.question}</label>
                <textarea
                  id="level-claim"
                  rows={2}
                  maxLength={CLAIM_MAX}
                  placeholder={mapText.placeholder}
                  value={claim}
                  onChange={(event) => {
                    setClaim(event.target.value)
                    setNotice('')
                  }}
                />
              </div>
              <p className={styles.small}>{lines.map.evidenceHeading}</p>
              <div className={styles.ticks}>
                {Object.entries(mapText.evidence).map(([id, label]) => {
                  const on = evidence.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      className={on ? styles.tickOn : styles.tick}
                      aria-pressed={on}
                      onClick={() => toggleEvidence(id)}
                    >
                      <span className={styles.box} aria-hidden="true">
                        {on ? 'X' : ''}
                      </span>
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
              {circle === 'cause' && (
                <>
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
                </>
              )}
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
              {circle === 'coin' && <p className={styles.small}>{lion(lines.level.aiNote)}</p>}
              {progress.compass[circle].claim.trim() && <p className={styles.small}>{lines.level.replaceNote}</p>}
              <p className={quest.notice} role="alert">
                {notice}
              </p>
              <div className={styles.buttons}>
                <button type="submit" className="btn">
                  {lines.level.save}
                </button>
                <button type="button" className="btn btn-quiet" onClick={again}>
                  {lines.level.again}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <p className={quest.banner}>{text.banner}</p>
            <p className={styles.sparks}>{lines.level.sparks(LEVEL_SPARKS)}</p>
            <DialogBox
              text={[lines.level.done(name, circleScore(progress, circle), EVIDENCE_MAX), nextLevel ? '' : lines.level.allDone]
                .filter(Boolean)
                .join(' ')}
              mood="happy"
            >
              {nextLevel && (
                <Link className="btn" href={`/level/${nextLevel}`}>
                  {lines.level.next(lines.level.circles[nextLevel].name)}
                </Link>
              )}
              {!nextLevel && (
                <Link className="btn" href="/crossroads">
                  {lines.level.toCrossroads}
                </Link>
              )}
              {circle === 'craft' && skill && (
                <button type="button" className="btn btn-quiet" disabled={inClaws} onClick={addToClaws}>
                  {inClaws ? lines.level.inClaws : lines.level.toClaws}
                </button>
              )}
              <Link className="btn btn-quiet" href="/map">
                {lines.level.toMap}
              </Link>
              <Link className="btn btn-quiet" href="/upgrades">
                {lines.level.toUpgrades}
              </Link>
              <button type="button" className="btn btn-quiet" onClick={again}>
                {lines.level.replay}
              </button>
            </DialogBox>
          </>
        )}

        <div ref={bottomRef} className={quest.bottom} aria-hidden="true" />
      </div>
    </main>
  )
}
