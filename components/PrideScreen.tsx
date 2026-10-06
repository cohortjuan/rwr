'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ConfirmBox from '@/components/ConfirmBox'
import QrCode from '@/components/QrCode'
import { lines } from '@/lib/lines'
import {
  buildCard,
  cardLink,
  cheerLink,
  CHEERS_KEPT,
  newCardId,
  parsePrideLink,
  PRIDE_MAX_FRIENDS,
  withCard,
  type CheerId,
} from '@/lib/pride'
import {
  connections,
  saveProgress,
  slotContent,
  useKeptLions,
  useLionText,
  useProgress,
  type OutreachKind,
  type PrideCard,
  type Progress,
  type TodahForm,
} from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import { MAX_LEVEL, PRIDE_LEVELS, slotLevel, slots } from '@/lib/upgrades'
import styles from './PrideScreen.module.css'

const formLabel: Record<TodahForm, string> = {
  cub: lines.upgrades.formCub,
  nomad: lines.upgrades.formNomad,
  leader: lines.upgrades.formLeader,
}

const prideSlot = slots.find((slot) => slot.id === 'pride')
const cheerIds = Object.keys(lines.pride.cheers) as CheerId[]
const outreachKinds = Object.keys(lines.pride.logKinds) as OutreachKind[]
const NOTE_MIN = 3
const NOTE_MAX = 60

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// What a friend sees: first name, lion, form, Pride Power, and the goal if it is shared.
function CardFace({ card, children }: { card: PrideCard, children?: React.ReactNode }) {
  return (
    <div className={styles.face}>
      <p className={styles.faceName}>{lines.pride.cardWith(card.name, card.lion)}</p>
      <p className={styles.faceForm}>{formLabel[card.form]}</p>
      <p className={styles.facePower}>{lines.pride.power(card.power, card.max)}</p>
      <div className={styles.bar} aria-hidden="true">
        <div className={styles.barFill} style={{ width: `${(card.power / card.max) * 100}%` }} />
      </div>
      {card.goal && (
        <p className={styles.faceGoal}>
          {lines.pride.goal} <strong>{card.goal}</strong>
          {card.reached && <span className={styles.reached}>{lines.pride.goalReached}</span>}
        </p>
      )}
      {children}
    </div>
  )
}

// Friends without accounts: cards are swapped by QR code or link and kept in this browser.
export default function PrideScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()
  const keptLions = useKeptLions()
  const [logKind, setLogKind] = useState<OutreachKind>('linkedin')
  const [logNote, setLogNote] = useState('')
  // The card or cheer in the link this page was opened with, until the player has dealt with it.
  const [link, setLink] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash))
  // A card's timestamp is set once per visit.
  const [openedAt] = useState(() => Date.now())
  const [pasted, setPasted] = useState('')
  const [status, setStatus] = useState('')
  const [manualLink, setManualLink] = useState('')
  const [cheeringId, setCheeringId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const incoming = link ? parsePrideLink(link) : null
  const isOwn = incoming !== null && incoming.card.id === progress.cardId
  const known = incoming !== null && progress.pride.some((friend) => friend.id === incoming.card.id)

  // Every lion gets a card name the first time its pride page opens.
  useEffect(() => {
    if (hydrated && !progress.cardId) saveProgress({ cardId: newCardId() })
  }, [hydrated, progress.cardId])

  // Opening a second link in the same tab only changes the part after the #.
  useEffect(() => {
    const onHashChange = () => {
      setLink(window.location.hash)
      setStatus('')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // A cheer is kept as soon as it arrives, and a friend already in the pride is refreshed.
  // Both are safe to repeat: a cheer is stored once, and an older card never replaces a newer one.
  useEffect(() => {
    if (!hydrated || !incoming || isOwn) return
    const patch: Parameters<typeof saveProgress>[0] = {}
    if (known && progress.pride.some((friend) => friend.id === incoming.card.id && friend.at < incoming.card.at)) {
      patch.pride = withCard(progress.pride, incoming.card)
    }
    if (incoming.kind === 'cheer' && !progress.cheersReceived.some((cheer) => cheer.key === incoming.key)) {
      const received = { key: incoming.key, name: incoming.card.name, cheer: incoming.cheer, at: incoming.card.at }
      patch.cheersReceived = [received, ...progress.cheersReceived].slice(0, CHEERS_KEPT)
    }
    if (Object.keys(patch).length > 0) saveProgress(patch)
  }, [hydrated, incoming, isOwn, known, progress.pride, progress.cheersReceived])

  if (!hydrated) return <main className="screen" />

  const prideLevel = (game: Progress) => (prideSlot ? slotLevel(prideSlot, slotContent(game, prideSlot)) : 0)
  const level = prideLevel(progress)
  const made = connections(progress)
  const nextAt = PRIDE_LEVELS[level]
  const myCard = buildCard(
    progress,
    openedAt,
    keptLions.map((lion) => lion.progress),
  )
  const myLink = progress.cardId ? cardLink(window.location.origin, myCard) : ''
  const canShare = typeof navigator.share === 'function'
  const removing = progress.pride.find((friend) => friend.id === removingId)

  // Done with the link this page opened with: forget it and tidy the address bar.
  function clearLink() {
    setLink('')
    window.history.replaceState(null, '', window.location.pathname)
  }

  function addFriend(card: PrideCard) {
    if (card.id === progress.cardId) {
      setStatus(lines.pride.addOwn)
      return
    }
    const isNew = !progress.pride.some((friend) => friend.id === card.id)
    if (isNew && progress.pride.length >= PRIDE_MAX_FRIENDS) {
      setStatus(lines.pride.addFull)
      return
    }
    const pride = withCard(progress.pride, card)
    saveProgress({ pride })
    playSfx(prideLevel({ ...progress, pride }) > level ? 'levelUp' : 'select', sound)
    setStatus(isNew ? lines.pride.added(card.name) : lines.pride.updated(card.name))
  }

  function addPasted(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parsePrideLink(pasted)
    if (!parsed) {
      setStatus(lines.pride.addBad)
      return
    }
    setPasted('')
    // A pasted cheer is handled like one that was opened: shown, kept, and its card offered.
    if (parsed.kind === 'cheer') setLink(pasted)
    else addFriend(parsed.card)
  }

  // Hands a link to the phone's share sheet, or copies it. If neither works, the link is
  // shown so it can be copied by hand.
  async function send(url: string, title: string, copiedText: string, share: boolean) {
    setManualLink('')
    try {
      if (share && canShare) {
        await navigator.share({ title, url })
        return true
      }
      await navigator.clipboard.writeText(url)
      setStatus(copiedText)
      return true
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return false
      setStatus(lines.pride.copyFailed)
      setManualLink(url)
      return false
    }
  }

  async function sendCheer(friend: PrideCard, cheer: CheerId) {
    setCheeringId(null)
    playSfx('select', sound)
    const url = cheerLink(window.location.origin, myCard, cheer)
    const sent = await send(url, lines.pride.cheerShareTitle, lines.pride.cheerCopied(friend.name), true)
    if (sent) saveProgress({ cheersSent: progress.cheersSent + 1 })
  }

  function logOutreach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const note = logNote.trim().slice(0, NOTE_MAX)
    if (note.length < NOTE_MIN) return
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const outreach = [{ id, kind: logKind, note, at: new Date().toISOString() }, ...progress.outreach]
    saveProgress({ outreach })
    playSfx(prideLevel({ ...progress, outreach }) > level ? 'levelUp' : 'select', sound)
    setLogNote('')
  }

  function removeFriend() {
    saveProgress({ pride: progress.pride.filter((friend) => friend.id !== removingId) })
    setRemovingId(null)
  }

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={styles.header}>
          <h1 className={styles.heading}>{lines.pride.heading}</h1>
          <p className={styles.intro}>{lines.pride.intro}</p>
          <p className={styles.slot}>
            <strong>{lines.pride.slot(level, MAX_LEVEL)}</strong>{' '}
            {nextAt ? lines.pride.slotNext(nextAt - made.total) : lines.pride.slotFull}
          </p>
          <p className={styles.tally}>{lines.pride.tally(made.friends, made.outreach, made.cheers)}</p>
        </header>

        {incoming && !isOwn && (incoming.kind === 'cheer' || !known) && (
          <section className={`panel ${styles.incoming}`} aria-live="polite">
            {incoming.kind === 'cheer' && (
              <>
                <p className={styles.cheerFrom}>{lines.pride.cheerFrom(incoming.card.name)}</p>
                <p className={styles.cheerText}>{lines.pride.cheers[incoming.cheer]}</p>
              </>
            )}
            {!known && (
              <>
                <p>{lines.pride.incoming(incoming.card.name, incoming.card.lion)}</p>
                <CardFace card={incoming.card} />
              </>
            )}
            <div className={styles.buttons}>
              {!known && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    addFriend(incoming.card)
                    clearLink()
                  }}
                >
                  {lines.pride.incomingYes}
                </button>
              )}
              <button type="button" className="btn btn-quiet" onClick={clearLink}>
                {known ? lines.pride.cheerClose : lines.pride.incomingNo}
              </button>
            </div>
          </section>
        )}

        <p className={styles.status} role="status">
          {status ||
            (isOwn ? lines.pride.addOwn : '') ||
            (incoming?.kind === 'card' && known ? lines.pride.updated(incoming.card.name) : '')}
        </p>
        {manualLink && (
          <input
            className={styles.manual}
            readOnly
            value={manualLink}
            aria-label={lines.pride.addLabel}
            onFocus={(event) => event.target.select()}
          />
        )}

        <div className={styles.columns}>
          <section className="panel">
            <h2 className={styles.subheading}>{lines.pride.cardHeading}</h2>
            <p className={styles.note}>{lines.pride.cardIntro}</p>
            <CardFace card={myCard} />
            {myLink && <QrCode className={styles.qr} text={myLink} label={lines.pride.qrAlt} />}
            <p className={styles.note}>{lines.pride.qrHint}</p>
            <div className={styles.buttons}>
              <button
                type="button"
                className="btn"
                onClick={() => send(myLink, lines.pride.shareTitle, lines.pride.copied, false)}
              >
                {lines.pride.copy}
              </button>
              {canShare && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => send(myLink, lines.pride.shareTitle, lines.pride.copied, true)}
                >
                  {lines.pride.share}
                </button>
              )}
              <button
                type="button"
                className="btn btn-quiet"
                aria-pressed={progress.shareGoal}
                onClick={() => saveProgress({ shareGoal: !progress.shareGoal })}
              >
                {progress.shareGoal ? lines.pride.goalOn : lines.pride.goalOff}
              </button>
            </div>
          </section>

          <section className="panel">
            <h2 className={styles.subheading}>{lines.pride.addHeading}</h2>
            <p className={styles.note}>{lines.pride.addIntro}</p>
            <form onSubmit={addPasted}>
              <div className="field">
                <label htmlFor="pride-link">{lines.pride.addLabel}</label>
                <input
                  id="pride-link"
                  autoComplete="off"
                  placeholder={lines.pride.addPlaceholder}
                  value={pasted}
                  onChange={(event) => {
                    setPasted(event.target.value)
                    setStatus('')
                  }}
                />
              </div>
              <button type="submit" className="btn" disabled={!pasted.trim()}>
                {lines.pride.addButton}
              </button>
            </form>

            <h2 className={`${styles.subheading} ${styles.spaced}`}>{lines.pride.receivedHeading}</h2>
            <p className={styles.fine}>{lines.pride.cheerRule}</p>
            {progress.cheersReceived.length === 0 ? (
              <p className={styles.note}>{lines.pride.receivedEmpty}</p>
            ) : (
              <ul className={styles.cheers}>
                {progress.cheersReceived.map((cheer) => (
                  <li key={cheer.key}>
                    <span className={styles.cheerWho}>
                      {cheer.name}, {shortDate(cheer.at)}
                    </span>
                    {lines.pride.cheers[cheer.cheer as CheerId] ?? ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className={`panel ${styles.log}`}>
          <h2 className={styles.subheading}>{lines.pride.logHeading}</h2>
          <p className={styles.note}>{lines.pride.logIntro}</p>
          <form onSubmit={logOutreach}>
            <div className={styles.kinds} role="radiogroup" aria-label={lines.pride.logHeading}>
              {outreachKinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={logKind === kind}
                  className={logKind === kind ? styles.kindOn : styles.kind}
                  onClick={() => setLogKind(kind)}
                >
                  {lines.pride.logKinds[kind]} <strong>{lines.pride.logWorth[kind]}</strong>
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="log-note">{lines.pride.logNoteLabel}</label>
              <input
                id="log-note"
                autoComplete="off"
                maxLength={NOTE_MAX}
                placeholder={lines.pride.logNotePlaceholder}
                value={logNote}
                onChange={(event) => setLogNote(event.target.value)}
              />
            </div>
            <button type="submit" className="btn" disabled={logNote.trim().length < NOTE_MIN}>
              {lines.pride.logAdd}
            </button>
          </form>
          <p className={styles.fine}>{lines.pride.logPrivate}</p>
          {progress.outreach.length === 0 ? (
            <p className={styles.note}>{lines.pride.logEmpty}</p>
          ) : (
            <ul className={styles.entries}>
              {progress.outreach.map((entry) => (
                <li key={entry.id}>
                  <span>
                    <span className={styles.cheerWho}>
                      {shortDate(entry.at)}, {lines.pride.logKinds[entry.kind]} {lines.pride.logWorth[entry.kind]}
                    </span>
                    {entry.note}
                  </span>
                  <button
                    type="button"
                    className={styles.entryRemove}
                    aria-label={`${lines.pride.logRemove}: ${entry.note}`}
                    onClick={() => saveProgress({ outreach: progress.outreach.filter((item) => item.id !== entry.id) })}
                  >
                    {lines.pride.logRemove}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.friends}>
          <h2 className={styles.subheading}>{lines.pride.friendsHeading}</h2>
          {progress.pride.length === 0 ? (
            <p className={styles.note}>{lion(lines.pride.friendsEmpty)}</p>
          ) : (
            <>
              <ul className={styles.grid}>
                {progress.pride.map((friend) => (
                  <li key={friend.id} className="panel">
                    <CardFace card={friend}>
                      <p className={styles.asOf}>{lines.pride.asOf(shortDate(friend.at))}</p>
                    </CardFace>
                    {cheeringId === friend.id ? (
                      <div className={styles.pick}>
                        <p className={styles.note}>{lines.pride.cheerPick(friend.name)}</p>
                        {cheerIds.map((cheer) => (
                          <button key={cheer} type="button" className="btn" onClick={() => sendCheer(friend, cheer)}>
                            {lines.pride.cheers[cheer]}
                          </button>
                        ))}
                        <button type="button" className="btn btn-quiet" onClick={() => setCheeringId(null)}>
                          {lines.pride.cheerCancel}
                        </button>
                      </div>
                    ) : (
                      <div className={styles.buttons}>
                        <button type="button" className="btn" onClick={() => setCheeringId(friend.id)}>
                          {lines.pride.cheerButton}
                        </button>
                        <button type="button" className="btn btn-quiet" onClick={() => setRemovingId(friend.id)}>
                          {lines.pride.remove}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className={styles.note}>{lines.pride.refreshHint}</p>
            </>
          )}
        </section>

        <p className={styles.footer}>
          <Link className="btn btn-quiet" href="/upgrades">
            {lines.pride.back}
          </Link>
        </p>
      </div>

      <ConfirmBox
        open={Boolean(removing)}
        text={removing ? lines.pride.removeConfirm(removing.name) : ''}
        yes={lines.pride.removeYes}
        no={lines.pride.removeNo}
        onYes={removeFriend}
        onNo={() => setRemovingId(null)}
      />
    </main>
  )
}
