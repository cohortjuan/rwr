'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DialogBox from '@/components/DialogBox'
import LionAvatar from '@/components/LionAvatar'
import PawPrint from '@/components/PawPrint'
import { auraSize, maneSize, wornIds } from '@/lib/accessories'
import { circles, circleScore } from '@/lib/compass'
import { renderLetter } from '@/lib/letterImage'
import { lines } from '@/lib/lines'
import { saveProgress, useKeptLions, useLionText, useProgress, type Progress } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import { NAME_TOKEN } from '@/lib/tokens'
import quest from './OnboardingQuest.module.css'
import styles from './LetterScreen.module.css'

// Todah's note: the final gift, left on the table once the player says their goal is reached.
// It is made of what they said along the way. With AI consent, Todah writes it in his own
// voice and adds his two cents, so no two are alike. Without it, the note is put together from
// the player's own words. Either way it is written once and kept with the lion, and it can be
// saved as a picture or sent to someone.

// How many times the player may ask Todah to write it again.
const REWRITES = 2
const QUOTE_MAX = 120

const clip = (text: string) => {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > QUOTE_MAX ? `${clean.slice(0, QUOTE_MAX).trimEnd()}...` : clean
}

// The note without the AI: the player's own words, in the order they said them.
function ownWordsNote(progress: Progress): string {
  const say = lines.letter.scripted
  const warmup = progress.onboardingChat.find((message) => message.role === 'user')?.text
  const heart = progress.compass.heart.claim.trim()
  const witness = progress.witnesses[0]
  const tried = progress.road?.steps.find((step) => step.doneAt && step.note)
  const first = [warmup ? say.startWarmup(clip(warmup)) : say.startPlain, heart ? say.heart(clip(heart)) : ''].filter(Boolean)
  const second = [
    say.goal(clip(progress.goalText)),
    progress.road?.obstacle ? say.obstacle(clip(progress.road.obstacle)) : '',
    tried ? say.experiment(clip(tried.note)) : '',
    witness ? say.witness(witness.name, clip(witness.text)) : '',
  ].filter(Boolean)
  return [first.join(' '), second.join(' '), say.close, say.sendoff].join('\n\n')
}

async function writeNote(progress: Progress): Promise<{ text: string, scripted: boolean }> {
  // No consent, no AI call.
  if (progress.aiConsent !== 'yes') return { text: ownWordsNote(progress), scripted: true }
  try {
    const claims = Object.fromEntries(
      circles
        .filter((circle) => progress.compass[circle].claim.trim())
        .map((circle) => [circle, { claim: progress.compass[circle].claim, evidence: circleScore(progress, circle) }]),
    )
    const response = await fetch('/api/todah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'letter',
        warmup: progress.onboardingChat.find((message) => message.role === 'user')?.text.slice(0, 300),
        claims,
        witness: progress.witnesses.slice(0, 2).map((witness) => witness.text),
        goal: progress.goalText,
        obstacle: progress.road?.obstacle,
        plan: progress.road?.plan,
        experiments: (progress.road?.steps ?? []).filter((step) => step.doneAt).map((step) => ({ step: step.text, note: step.note })),
      }),
    })
    if (!response.ok) return { text: ownWordsNote(progress), scripted: true }
    const data = await response.json()
    const text = String(data.reply ?? '').trim()
    return text ? { text, scripted: false } : { text: ownWordsNote(progress), scripted: true }
  } catch {
    return { text: ownWordsNote(progress), scripted: true }
  }
}

export default function LetterScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()
  const keptLions = useKeptLions()
  const [writing, setWriting] = useState(false)
  const [status, setStatus] = useState('')
  // The note drawn as a picture: what is shown, and what is saved or sent. `failed` means it
  // could not be drawn here, and the plain paper version is shown instead.
  const [drawn, setDrawn] = useState<{ key: string, file: File, url: string } | null>(null)
  const [failed, setFailed] = useState(false)

  const name = progress.playerName || 'traveler'
  const letter = progress.letter
  const others = keptLions.map((kept) => kept.progress)
  const wearing = wornIds(progress, others)
  const mane = maneSize(progress)
  const paragraphs = letter
    ? letter.text
        .split(NAME_TOKEN)
        .join(name)
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    : []
  // Everything the picture depends on. When any of it changes, the note is drawn again.
  const key = letter ? [letter.at, letter.text, name, progress.lionName, mane, ...wearing].join('|') : ''

  useEffect(() => {
    if (!hydrated || !letter || !progress.goalAchievedAt || drawn?.key === key) return
    let stale = false
    void renderLetter({
      dear: lines.letter.dear(name),
      paragraphs,
      signoff: lines.letter.signoff,
      lionName: progress.lionName,
      caption: new Date(progress.goalAchievedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      credit: lines.letter.credit,
      wearing,
      mane,
      font: getComputedStyle(document.documentElement).getPropertyValue('--font-hand').trim() || 'cursive',
      seed: letter.at,
    })
      .then((blob) => {
        if (stale) return
        const file = new File([blob], lines.letter.fileName, { type: blob.type })
        setFailed(false)
        setDrawn((old) => {
          if (old) URL.revokeObjectURL(old.url)
          return { key, file, url: URL.createObjectURL(file) }
        })
      })
      .catch(() => {
        if (!stale) setFailed(true)
      })
    return () => {
      stale = true
    }
    // `key` stands for every value the picture is drawn from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key])

  if (!hydrated) return <main className="screen" />

  const rewritesLeft = letter ? REWRITES - letter.rewrites : 0
  const canShareFiles = typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

  async function write(rewrite: boolean) {
    playSfx('select', sound)
    setStatus('')
    setWriting(true)
    const note = await writeNote(progress)
    saveProgress({
      letter: { ...note, at: new Date().toISOString(), rewrites: rewrite && letter ? letter.rewrites + 1 : 0 },
    })
    playSfx('complete', sound)
    setWriting(false)
  }

  const ready = drawn?.key === key ? drawn : null

  function picture(): File | null {
    if (!ready) setStatus(lines.letter.saveFailed)
    return ready?.file ?? null
  }

  async function save() {
    setStatus('')
    const file = picture()
    if (!file) return
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
    playSfx('select', sound)
    setStatus(lines.letter.saved)
  }

  // Hands the picture to the phone's share sheet. Where that is not on offer, it is saved
  // instead, so it can be sent by hand.
  async function send() {
    setStatus('')
    const file = picture()
    if (!file) return
    try {
      if (canShareFiles && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: lines.letter.shareTitle(progress.lionName) })
        return
      }
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
    await save()
  }

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={quest.hud}>
          <Link className={`btn btn-quiet ${quest.back}`} href="/roar" aria-label={lines.letter.back}>
            {lines.level.back}
          </Link>
          <h1 className={quest.questName}>{lion(lines.letter.name)}</h1>
        </header>

        {!progress.goalAchievedAt && (
          <DialogBox text={lines.letter.locked}>
            <Link className="btn" href="/roar">
              {lines.letter.toRoar}
            </Link>
          </DialogBox>
        )}

        {progress.goalAchievedAt && !letter && !writing && (
          <DialogBox text={lines.letter.waiting(name)} mood="happy">
            <button type="button" className="btn" autoFocus onClick={() => write(false)}>
              {lines.letter.open}
            </button>
          </DialogBox>
        )}

        {writing && <DialogBox text={lion(lines.letter.writing)} mood="thinking" />}

        {progress.goalAchievedAt && letter && !writing && !ready && !failed && (
          <DialogBox text={lion(lines.letter.drawing)} mood="thinking" />
        )}

        {progress.goalAchievedAt && letter && !writing && ready && (
          <>
            {/* The note as a picture. Its words are in the alt text and again below as plain text. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.picture}
              src={ready.url}
              alt={[lines.letter.alt(progress.lionName), lines.letter.dear(name), ...paragraphs, lines.letter.signoff, progress.lionName].join(' ')}
            />
            <details className={styles.asText}>
              <summary>{lines.letter.asText}</summary>
              <p>{lines.letter.dear(name)}</p>
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <p>
                {lines.letter.signoff} {progress.lionName}
              </p>
            </details>
          </>
        )}

        {progress.goalAchievedAt && letter && !writing && (ready || failed) && (
          <>
            {failed && !ready && (
            <div className={styles.table}>
              <article className={styles.paper}>
                <p className={styles.dear}>{lines.letter.dear(name)}</p>
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                <div className={styles.bottom}>
                  <div className={styles.sign}>
                    <p>{lines.letter.signoff}</p>
                    <p className={styles.signature}>
                      <PawPrint className={styles.paw} />
                      <span>{progress.lionName}</span>
                    </p>
                  </div>
                  <div className={styles.photo}>
                    <LionAvatar className={styles.lion} wearing={wearing} mane={mane} aura={auraSize(progress)} mood="happy" />
                  </div>
                </div>
              </article>
            </div>
            )}

            <p className={styles.status} role="status">
              {status}
            </p>
            <div className={styles.buttons}>
              <button type="button" className="btn" onClick={save}>
                {lines.letter.save}
              </button>
              <button type="button" className="btn" onClick={send}>
                {lines.letter.send}
              </button>
              <Link className="btn btn-quiet" href="/roar">
                {lines.letter.back}
              </Link>
            </div>
            <p className={styles.fine}>{lion(lines.letter.kept)}</p>
            {progress.aiConsent === 'yes' && rewritesLeft > 0 && (
              <p className={styles.fine}>
                <button type="button" className="btn btn-quiet" onClick={() => write(true)}>
                  {lion(lines.letter.again)}
                </button>{' '}
                {lines.letter.againLeft(rewritesLeft, progress.lionSex)}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
