'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import DialogBox from '@/components/DialogBox'
import { lines, type EntryChoice } from '@/lib/lines'
import { saveProgress, useProgress, type ChatMessage, type Progress } from '@/lib/progress'
import { NAME_TOKEN } from '@/lib/tokens'
import { useHydrated, useReducedMotion, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './OnboardingQuest.module.css'

type Step = 'hello' | 'intro' | 'explain' | 'name' | 'entry' | 'reaction' | 'consent' | 'chat' | 'done'

// The live quest is a warm-up question plus two follow-ups.
const ANSWERS_NEEDED = 3

type TodahReply = { reply: string, complete: boolean, scripted: boolean }

function initialStep(progress: Progress): Step {
  if (progress.onboardingDone) return 'done'
  if (progress.entryChoice && progress.onboardingChat.length > 0) return 'chat'
  if (progress.playerName) return 'entry'
  return 'hello'
}

// Scripted stand-in for the AI: used in demo mode, with no key set, or when the AI is down.
function scriptedReply(history: ChatMessage[]): TodahReply {
  const asked = history.filter((message) => message.role === 'todah').length
  const line = lines.scriptedFollowUps[asked]
  return { reply: line ?? '', complete: !line, scripted: true }
}

// Todah writes a token instead of the player's name, so the name never leaves this device.
function withName(text: string, name: string): string {
  return text.split(NAME_TOKEN).join(name)
}

async function askTodah(progress: Progress, history: ChatMessage[], demo: boolean): Promise<TodahReply> {
  // No consent, no AI call: the scripted trail notes run entirely in the browser.
  if (demo || progress.aiConsent !== 'yes') return scriptedReply(history)
  try {
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'onboarding',
        entryChoice: progress.entryChoice,
        messages: history,
      }),
    })
    if (response.status === 429) return { reply: lines.errors.aiCap, complete: true, scripted: false }
    if (!response.ok) return scriptedReply(history)
    const data = await response.json()
    return { reply: String(data.reply ?? ''), complete: Boolean(data.complete), scripted: false }
  } catch {
    return scriptedReply(history)
  }
}

export default function OnboardingQuest({ demo }: { demo: boolean }) {
  const hydrated = useHydrated()
  const progress = useProgress()
  // Wait for saved progress so a returning player resumes where they stopped.
  if (!hydrated) return <main className="screen" />
  return <Quest demo={demo} progress={progress} startAt={initialStep(progress)} />
}

function Quest({ demo, progress, startAt }: { demo: boolean, progress: Progress, startAt: Step }) {
  const { sound } = useSettings()
  const reducedMotion = useReducedMotion()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState<Step>(startAt)
  const [nameDraft, setNameDraft] = useState('')
  const [answerDraft, setAnswerDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [usedScript, setUsedScript] = useState(false)
  const [notice, setNotice] = useState('')
  // Length of the chat we last asked Todah to reply to, so each turn is requested once.
  const requestedFor = useRef(-1)

  const chat = progress.onboardingChat
  const answers = chat.filter((message) => message.role === 'user').length
  const lastTodah = [...chat].reverse().find((message) => message.role === 'todah')
  const awaitingAnswer = chat.length > 0 && chat[chat.length - 1].role === 'todah'

  function go(next: Step) {
    playSfx('select', sound)
    setStep(next)
  }

  const requestReply = useCallback(
    async (history: ChatMessage[]) => {
      setPending(true)
      setNotice('')
      const result = await askTodah(progress, history, demo)
      if (result.scripted) setUsedScript(true)
      const nextChat: ChatMessage[] = result.reply ? [...history, { role: 'todah', text: result.reply }] : history
      if (result.complete) {
        saveProgress({ onboardingChat: nextChat, onboardingDone: true })
        playSfx('complete', sound)
        setStep('done')
      } else {
        saveProgress({ onboardingChat: nextChat })
      }
      setPending(false)
    },
    [progress, demo, sound],
  )

  // Todah owes a reply when the chat is empty (the warm-up question) or ends on the player's
  // answer. Driving this from the saved chat also resumes cleanly after a reload mid-reply.
  useEffect(() => {
    if (step !== 'chat' || awaitingAnswer || requestedFor.current === chat.length) return
    requestedFor.current = chat.length
    void requestReply(chat)
  }, [step, awaitingAnswer, chat, requestReply])

  // Keep the newest line and the answer box in view. Watching the page's height (instead of
  // the message count) also catches the answer box appearing once Todah finishes typing.
  useEffect(() => {
    const anchor = bottomRef.current
    const content = anchor?.parentElement
    if (!anchor || !content || (step !== 'chat' && step !== 'done')) return
    const follow = () => anchor.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'end' })
    const observer = new ResizeObserver(follow)
    observer.observe(content)
    return () => observer.disconnect()
  }, [step, reducedMotion])

  function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = nameDraft.trim().slice(0, 40)
    if (!name) return
    saveProgress({ playerName: name })
    go('entry')
  }

  function chooseConsent(choice: 'yes' | 'no') {
    saveProgress({ aiConsent: choice })
    go('chat')
  }

  function chooseEntry(choice: EntryChoice) {
    saveProgress({ entryChoice: choice })
    go('reaction')
  }

  function submitAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = answerDraft.trim().slice(0, 1000)
    if (!text) {
      setNotice(lines.errors.emptyAnswer)
      return
    }
    playSfx('select', sound)
    setAnswerDraft('')
    saveProgress({ onboardingChat: [...chat, { role: 'user', text }] })
  }

  const name = progress.playerName || 'traveler'

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={styles.hud}>
          <h1 className={styles.questName}>{lines.onboarding.questName}</h1>
          <ol className={styles.pips} aria-label={`Trail progress: ${Math.min(answers, ANSWERS_NEEDED)} of ${ANSWERS_NEEDED}`}>
            {Array.from({ length: ANSWERS_NEEDED }, (_, index) => (
              <li key={index} className={index < answers || step === 'done' ? styles.pipOn : styles.pip} />
            ))}
          </ol>
        </header>

        {step === 'hello' && (
          <DialogBox text={lines.onboarding.hello}>
            <button type="button" className="btn" autoFocus onClick={() => go('intro')}>
              {lines.onboarding.next}
            </button>
          </DialogBox>
        )}

        {step === 'intro' && (
          <DialogBox text={lines.onboarding.questIntro}>
            <button type="button" className="btn" autoFocus onClick={() => go('name')}>
              {lines.onboarding.startQuest}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => go('explain')}>
              {lines.onboarding.whatIsThis}
            </button>
          </DialogBox>
        )}

        {step === 'explain' && (
          <DialogBox text={lines.onboarding.explain}>
            <button type="button" className="btn" autoFocus onClick={() => go('name')}>
              {lines.onboarding.explainContinue}
            </button>
          </DialogBox>
        )}

        {step === 'name' && (
          <DialogBox text={lines.onboarding.askName}>
            <form className={styles.inlineForm} onSubmit={submitName}>
              <label className="sr-only" htmlFor="player-name">
                {lines.onboarding.nameLabel}
              </label>
              <input
                id="player-name"
                className={styles.input}
                autoFocus
                maxLength={40}
                autoComplete="nickname"
                placeholder={lines.onboarding.namePlaceholder}
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
              />
              <button type="submit" className="btn" disabled={!nameDraft.trim()}>
                {lines.onboarding.nameSubmit}
              </button>
            </form>
          </DialogBox>
        )}

        {step === 'entry' && (
          <DialogBox text={lines.onboarding.askEntry(name)}>
            {lines.onboarding.entryChoices.map((choice) => (
              <button key={choice.id} type="button" className="btn" onClick={() => chooseEntry(choice.id)}>
                {choice.label}
              </button>
            ))}
          </DialogBox>
        )}

        {step === 'reaction' && progress.entryChoice && (
          <DialogBox text={lines.onboarding.reactions[progress.entryChoice]}>
            <button
              type="button"
              className="btn"
              autoFocus
              onClick={() => go(demo || progress.aiConsent ? 'chat' : 'consent')}
            >
              {lines.onboarding.reactionContinue}
            </button>
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

        {step === 'chat' && (
          <>
            {chat.length > 1 && (
              <ol className={styles.log} aria-label="Earlier in this quest">
                {chat.slice(0, lastTodah && awaitingAnswer ? -1 : undefined).map((message, index) => (
                  <li key={index} className={message.role === 'user' ? styles.logUser : styles.logTodah}>
                    <span className={styles.logWho}>{message.role === 'user' ? name : 'TODAH'}</span>
                    {withName(message.text, name)}
                  </li>
                ))}
              </ol>
            )}

            {pending && <DialogBox text={lines.onboarding.thinking} mood="thinking" />}

            {!pending && awaitingAnswer && lastTodah && (
              <DialogBox text={withName(lastTodah.text, name)}>
                <form className={styles.answerForm} onSubmit={submitAnswer}>
                  <label className="sr-only" htmlFor="answer">
                    {lines.onboarding.answerLabel}
                  </label>
                  <textarea
                    id="answer"
                    className={styles.input}
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

            <p className={styles.notice} role="status">
              {notice || (usedScript && !demo && progress.aiConsent === 'yes' ? lines.errors.aiUnavailable : '')}
            </p>
          </>
        )}

        {step === 'done' && (
          <>
            <p className={styles.banner}>{lines.onboarding.completeBanner}</p>
            <DialogBox text={lines.onboarding.complete(name)} mood="happy">
              <Link className="btn" href="/upgrades">
                {lines.onboarding.toUpgrades}
              </Link>
              <Link className="btn btn-quiet" href="/">
                {lines.onboarding.toTitle}
              </Link>
            </DialogBox>
          </>
        )}

        <div ref={bottomRef} className={styles.bottom} aria-hidden="true" />
      </div>
    </main>
  )
}
