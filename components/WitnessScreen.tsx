'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { lines } from '@/lib/lines'
import { isNameAllowed } from '@/lib/names'
import { newCardId } from '@/lib/pride'
import { saveProgress, useProgress } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import {
  answerLink,
  askLink,
  parseWitnessLink,
  WITNESS_NAME_MAX,
  WITNESS_TEXT_MAX,
  WITNESSES_KEPT,
  type WitnessLink,
} from '@/lib/witness'
import styles from './WitnessScreen.module.css'

// A friend's witness. The player sends one question to someone who knows them: "What would
// you come to me for?" The friend answers on this same page and sends a link back. The answer
// is kept beside the player's Craft circle.
//
// One page serves three visitors: the player (no link in the address), the friend (a question
// link), and the player again (an answer link). Nothing typed here goes to a server.

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function WitnessScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const { sound } = useSettings()
  const [hash, setHash] = useState('')
  const [status, setStatus] = useState('')
  const [manualLink, setManualLink] = useState('')
  const [pasted, setPasted] = useState('')
  // The friend's side.
  const [answer, setAnswer] = useState('')
  const [friendName, setFriendName] = useState('')
  const [reply, setReply] = useState('')

  useEffect(() => {
    const read = () => {
      setHash(window.location.hash)
      setStatus('')
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  // The answer has to find its way home, so the lion needs its card name (the same one My
  // Pride uses) before a question link can be made.
  useEffect(() => {
    if (hydrated && !progress.cardId) saveProgress({ cardId: newCardId() })
  }, [hydrated, progress.cardId])

  const incoming: WitnessLink | null = hash ? parseWitnessLink(hash) : null

  // An answer written for this lion is kept as soon as its link is opened. It is stored once.
  const arrived = incoming?.kind === 'answer' && incoming.id === progress.cardId ? incoming : null
  useEffect(() => {
    if (!hydrated || !arrived || progress.witnesses.some((witness) => witness.key === arrived.key)) return
    const kept = { key: arrived.key, name: arrived.name, text: arrived.text, at: arrived.at }
    saveProgress({ witnesses: [kept, ...progress.witnesses].slice(0, WITNESSES_KEPT) })
  }, [hydrated, arrived, progress.witnesses])

  if (!hydrated) return <main className="screen" />

  const myLink =
    progress.cardId && progress.playerName
      ? askLink(window.location.origin, progress.cardId, progress.playerName.trim().slice(0, WITNESS_NAME_MAX), progress.lionName)
      : ''

  async function copy(url: string, copiedText: string) {
    setManualLink('')
    try {
      await navigator.clipboard.writeText(url)
      playSfx('select', sound)
      setStatus(copiedText)
    } catch {
      setStatus(lines.witness.copyFailed)
      setManualLink(url)
    }
  }

  function addPasted(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseWitnessLink(pasted)
    if (!parsed || parsed.kind !== 'answer') {
      setStatus(lines.witness.bad)
      return
    }
    if (parsed.id !== progress.cardId) {
      setStatus(lines.witness.notYours)
      return
    }
    if (progress.witnesses.some((witness) => witness.key === parsed.key)) {
      setStatus(lines.witness.already)
      setPasted('')
      return
    }
    const kept = { key: parsed.key, name: parsed.name, text: parsed.text, at: parsed.at }
    saveProgress({ witnesses: [kept, ...progress.witnesses].slice(0, WITNESSES_KEPT) })
    playSfx('complete', sound)
    setStatus(lines.witness.added(parsed.name))
    setPasted('')
  }

  // The friend's answer becomes a link they send back themselves.
  function makeAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!incoming || incoming.kind !== 'ask') return
    const text = answer.trim().slice(0, WITNESS_TEXT_MAX)
    const from = friendName.trim().slice(0, WITNESS_NAME_MAX)
    if (!text || !from) {
      setStatus(lines.witness.answerEmpty)
      return
    }
    if (!isNameAllowed(text) || !isNameAllowed(from)) {
      setStatus(lines.witness.answerBlocked)
      return
    }
    setStatus('')
    setReply(answerLink(window.location.origin, incoming.id, from, text, Date.now()))
  }

  // The friend's view: someone else's question.
  if (incoming?.kind === 'ask' && incoming.id !== progress.cardId) {
    return (
      <main className="screen">
        <div className="screen-inner">
          <h1 className={styles.heading}>{lines.witness.name}</h1>
          <p className={styles.intro}>{lines.witness.askedBy(incoming.name, incoming.lion)}</p>

          <section className="panel">
            <h2 className={styles.question}>{lines.witness.question(incoming.name)}</h2>
            {!reply ? (
              <form onSubmit={makeAnswer}>
                <div className="field">
                  <label htmlFor="witness-answer">{lines.witness.answerLabel}</label>
                  <textarea
                    id="witness-answer"
                    rows={3}
                    maxLength={WITNESS_TEXT_MAX}
                    placeholder={lines.witness.answerPlaceholder}
                    value={answer}
                    onChange={(event) => {
                      setAnswer(event.target.value)
                      setStatus('')
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="witness-name">{lines.witness.answerName}</label>
                  <input
                    id="witness-name"
                    maxLength={WITNESS_NAME_MAX}
                    autoComplete="given-name"
                    value={friendName}
                    onChange={(event) => {
                      setFriendName(event.target.value)
                      setStatus('')
                    }}
                  />
                </div>
                <p className={styles.status} role="alert">
                  {status}
                </p>
                <button type="submit" className="btn">
                  {lines.witness.answerMake}
                </button>
              </form>
            ) : (
              <>
                <p>{lines.witness.answerReady(incoming.name)}</p>
                <p className={styles.manual}>{reply}</p>
                <p className={styles.status} role="status">
                  {status}
                </p>
                <button type="button" className="btn" onClick={() => copy(reply, lines.witness.answerCopied)}>
                  {lines.witness.answerCopy}
                </button>
              </>
            )}
            <p className={styles.fine}>{lines.witness.privacy}</p>
          </section>

          <p className={styles.footer}>
            <Link className="btn btn-quiet" href="/about">
              {lines.witness.toTitle}
            </Link>
          </p>
        </div>
      </main>
    )
  }

  // The player's view: their link, and what has come back.
  const opened =
    incoming?.kind === 'ask'
      ? lines.witness.own
      : incoming?.kind === 'answer'
        ? arrived
          ? lines.witness.added(incoming.name)
          : lines.witness.notYours
        : hash
          ? lines.witness.bad
          : ''

  return (
    <main className="screen">
      <div className="screen-inner">
        <h1 className={styles.heading}>{lines.witness.name}</h1>
        <p className={styles.intro}>{lines.witness.intro}</p>

        {opened && (
          <p className={styles.opened} role="status">
            {opened}
          </p>
        )}

        {!progress.playerName ? (
          <section className="panel">
            <p>{lines.witness.needName}</p>
            <Link className="btn" href="/quest">
              {lines.witness.toQuest}
            </Link>
          </section>
        ) : (
          <div className={styles.columns}>
            <section className="panel">
              <h2 className={styles.subheading}>{lines.witness.yourLink}</h2>
              <p className={styles.question}>{lines.witness.question(progress.playerName)}</p>
              <p className={styles.fine}>{lines.witness.sendNote}</p>
              <button type="button" className="btn" disabled={!myLink} onClick={() => copy(myLink, lines.witness.copied)}>
                {lines.witness.copy}
              </button>
              <p className={styles.status} role="status">
                {status}
              </p>
              {manualLink && <p className={styles.manual}>{manualLink}</p>}

              <h2 className={`${styles.subheading} ${styles.spaced}`}>{lines.witness.pasteHeading}</h2>
              <form onSubmit={addPasted}>
                <div className="field">
                  <label htmlFor="witness-paste">{lines.witness.pasteIntro}</label>
                  <input
                    id="witness-paste"
                    aria-label={lines.witness.pasteLabel}
                    value={pasted}
                    onChange={(event) => {
                      setPasted(event.target.value)
                      setStatus('')
                    }}
                  />
                </div>
                <button type="submit" className="btn btn-quiet" disabled={!pasted.trim()}>
                  {lines.witness.pasteAdd}
                </button>
              </form>
            </section>

            <section className="panel">
              <h2 className={styles.subheading}>{lines.witness.heardHeading}</h2>
              {progress.witnesses.length === 0 ? (
                <p className={styles.fine}>{lines.witness.none}</p>
              ) : (
                <ul className={styles.heard}>
                  {progress.witnesses.map((witness) => (
                    <li key={witness.key}>
                      <span className={styles.who}>{lines.witness.said(witness.name)}</span>
                      {witness.text} <span className={styles.when}>({shortDate(witness.at)})</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.fine}>{lines.witness.honour}</p>
            </section>
          </div>
        )}

        <p className={styles.footer}>
          <Link className="btn btn-quiet" href="/map">
            {lines.witness.back}
          </Link>
        </p>
      </div>
    </main>
  )
}
