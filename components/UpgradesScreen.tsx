'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { lines } from '@/lib/lines'
import { circles, compassTotal } from '@/lib/compass'
import {
  isPath,
  milestones,
  PATH_EVIDENCE,
  powerParts,
  saveProgress,
  slotContent,
  todahForm,
  useKeptLions,
  useLionText,
  useProgress,
  type Progress,
  type TodahForm,
} from '@/lib/progress'
import { saveSettings, useHydrated, useSettings } from '@/lib/settings'
import { playSfx, preloadSfx } from '@/lib/sfx'
import { MAX_LEVEL, slotLevel, slots, type Slot, type SlotId } from '@/lib/upgrades'
import styles from './UpgradesScreen.module.css'

const formLabel: Record<TodahForm, string> = {
  cub: lines.upgrades.formCub,
  nomad: lines.upgrades.formNomad,
  leader: lines.upgrades.formLeader,
}

type TipId = keyof typeof lines.upgrades.tips

// The first tip that fits the game so far and has not been dismissed. Tips about what to do
// next come before general ones.
function pickTip(progress: Progress, form: TodahForm, totalLevel: number, totalMax: number): TipId | null {
  const fits: Record<TipId, boolean> = {
    start: totalLevel === 0,
    quest: !progress.onboardingDone,
    nomad: progress.onboardingDone && form === 'cub',
    levels: totalLevel > 0 && totalLevel < totalMax,
    phrase: totalLevel < totalMax,
    unpaid: !progress.upgrades.paws,
    pride: progress.pride.length === 0,
    den: !isPath(progress),
    map: compassTotal(progress).score === 0,
    goal: !progress.goalText,
    device: true,
  }
  const order = Object.keys(lines.upgrades.tips) as TipId[]
  return order.find((id) => fits[id] && !progress.tipsSeen.includes(id)) ?? null
}

function LevelBar({ level }: { level: number }) {
  return (
    <span className={styles.bar} aria-hidden="true">
      {Array.from({ length: MAX_LEVEL }, (_, index) => (
        <span key={index} className={index < level ? styles.segOn : styles.seg} />
      ))}
    </span>
  )
}

// The resume builder as an RPG equipment screen. Four slots are live, three are coming soon.
export default function UpgradesScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const { sound, tips } = useSettings()
  const lion = useLionText()
  const sheetRef = useRef<HTMLDialogElement>(null)
  // One tip per visit: after GOT IT, the next one waits for the next time this screen opens.
  const [tipsQuiet, setTipsQuiet] = useState(false)
  const [openId, setOpenId] = useState<SlotId | null>(null)
  const [draft, setDraft] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [leveledUp, setLeveledUp] = useState<SlotId | null>(null)

  const openSlot = slots.find((slot) => slot.id === openId) ?? null
  // Den counts paths across every lion, so the other lions' games are needed too.
  const keptLions = useKeptLions()
  const others = keptLions.map((kept) => kept.progress)
  const parts = powerParts(progress, others)
  const totalLevel = parts.reduce((sum, part) => sum + part.level, 0)
  const totalMax = parts.reduce((sum, part) => sum + part.max, 0)
  const evidence = compassTotal(progress)
  // What the player has already said on the trail, offered back as wording to reuse.
  const trailWords = [
    ...circles.map((circle) => progress.compass[circle].claim.trim()),
    ...progress.onboardingChat.filter((message) => message.role === 'user').map((message) => message.text),
  ].filter(Boolean)
  const form = todahForm(progress, others)
  const tipId = tips && !tipsQuiet ? pickTip(progress, form, totalLevel, totalMax) : null

  function dismissTip(id: TipId) {
    playSfx('select', sound)
    saveProgress({ tipsSeen: [...progress.tipsSeen, id] })
    setTipsQuiet(true)
  }

  useEffect(() => {
    preloadSfx()
  }, [])

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    if (openId && !sheet.open) sheet.showModal()
    if (!openId && sheet.open) sheet.close()
  }, [openId])

  function open(slot: Slot) {
    if (slot.locked) return
    playSfx('select', sound)
    setDraft(progress.upgrades[slot.id] ?? '')
    setShowSuggestions(false)
    setOpenId(slot.id)
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!openSlot) return
    const before = slotLevel(openSlot, progress.upgrades[openSlot.id] ?? '')
    const after = slotLevel(openSlot, draft)
    saveProgress({ upgrades: { ...progress.upgrades, [openSlot.id]: draft.trim() } })
    if (after > before) {
      playSfx('levelUp', sound)
      setLeveledUp(openSlot.id)
    } else {
      playSfx('select', sound)
      setLeveledUp(null)
    }
    setOpenId(null)
  }

  if (!hydrated) return <main className="screen" />

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={styles.header}>
          <h1 className={styles.heading}>{lines.upgrades.heading}</h1>
          <p className={styles.intro}>{lion(lines.upgrades.intro)}</p>
        </header>

        {tipId && (
          <aside className={styles.tip} aria-label={lines.upgrades.tipLabel}>
            <p className={styles.tipLabel} aria-hidden="true">
              {lines.upgrades.tipLabel}
            </p>
            <p className={styles.tipText}>{lion(lines.upgrades.tips[tipId])}</p>
            <div className={styles.tipButtons}>
              <button type="button" className="btn" onClick={() => dismissTip(tipId)}>
                {lines.upgrades.tipGotIt}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => saveSettings({ tips: false })}>
                {lines.upgrades.tipTurnOff}
              </button>
            </div>
          </aside>
        )}

        <div className={styles.top}>
          <section className={`panel ${styles.todah}`} aria-label={lion('Todah')}>
            <div className={leveledUp ? styles.portraitHappy : styles.portrait} aria-hidden="true">
              {!leveledUp && <div className={styles.blink} />}
            </div>
            <div>
              <p className={styles.formName}>{lion(lines.upgrades.todahLabel(formLabel[form]))}</p>
              <p className={styles.power}>{lines.upgrades.power(totalLevel, totalMax)}</p>
              <div
                className={styles.powerBar}
                role="progressbar"
                aria-label="Pride power"
                aria-valuemin={0}
                aria-valuemax={totalMax}
                aria-valuenow={totalLevel}
              >
                <div className={styles.powerFill} style={{ width: `${(totalLevel / totalMax) * 100}%` }} />
              </div>
              <details className={styles.powerFrom}>
                <summary>{lines.upgrades.powerFrom}</summary>
                <ul>
                  {parts.map((part) => (
                    <li key={part.id}>
                      {lines.upgrades.powerPart(lines.upgrades.powerParts[part.id], part.level, part.max)}
                      {part.id === 'milestones' && (
                        <ul>
                          {milestones.map((milestone) => (
                            <li key={milestone.id} className={milestone.met(progress) ? styles.milestoneMet : undefined}>
                              {lion(lines.upgrades.milestones[milestone.id])}
                              <span className="sr-only">
                                {' '}
                                ({milestone.met(progress) ? lines.upgrades.checkMet : lines.upgrades.checkOpen})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </section>

          <section className={`panel ${styles.leader}`}>
            <h2 className={styles.leaderTitle}>
              {form === 'leader' ? lines.upgrades.formLeader : lines.upgrades.leaderLocked}
            </h2>
            <p className={styles.leaderBody}>{lion(lines.upgrades.leaderLockedBody)}</p>
            <Link className="btn" href="/roar">
              {lines.upgrades.toRoar}
            </Link>
          </section>

          <section className="panel">
            <h2 className={styles.mapTitle}>{lines.upgrades.mapTitle}</h2>
            <p className={styles.mapScore}>{lines.upgrades.mapScore(evidence.score, evidence.max)}</p>
            <p className={styles.leaderBody}>{lines.upgrades.mapBody}</p>
            <Link className="btn" href="/map">
              {lines.upgrades.toMap}
            </Link>
          </section>
        </div>

        <ul className={styles.grid}>
          {slots.map((slot) => {
            const level = slotLevel(slot, slotContent(progress, slot, others))
            const card = (
              <>
                <span className={styles.slotName}>{slot.name}</span>
                <span className={styles.slotTerm}>{slot.resumeTerm}</span>
                {slot.locked ? (
                  <span className={styles.slotState}>{lines.upgrades.locked}</span>
                ) : (
                  <>
                    <LevelBar level={level} />
                    <span className={styles.slotState}>
                      {level === 0 ? lines.upgrades.empty : lines.upgrades.level(level, MAX_LEVEL)}
                    </span>
                  </>
                )}
                <span className={styles.slotGrowth}>{slot.growth}</span>
                {leveledUp === slot.id && <span className={styles.levelUp}>{lines.upgrades.levelUp}</span>}
              </>
            )
            return (
              <li key={slot.id}>
                {/* A slot with its own page (Pride) is a link there. The rest open the typing sheet. */}
                {slot.page ? (
                  <Link className={styles.slot} href={slot.page}>
                    {card}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={slot.locked ? styles.slotLocked : styles.slot}
                    disabled={slot.locked}
                    onClick={() => open(slot)}
                  >
                    {card}
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <p className={styles.footer}>
          <Link className="btn btn-quiet" href="/">
            {lines.upgrades.back}
          </Link>
        </p>
      </div>

      <dialog
        ref={sheetRef}
        className={styles.sheet}
        aria-labelledby="sheet-heading"
        onClose={() => setOpenId(null)}
      >
        {openSlot?.tally && (
          <div>
            <h2 id="sheet-heading" className={styles.sheetHeading}>
              {openSlot.name}
            </h2>
            <p className={styles.slotTerm}>{openSlot.resumeTerm}</p>
            <p className={styles.preview}>
              <LevelBar level={slotLevel(openSlot, slotContent(progress, openSlot, others))} />
              <span>
                {lines.upgrades.level(slotLevel(openSlot, slotContent(progress, openSlot, others)), MAX_LEVEL)}
              </span>
            </p>
            <ol className={styles.checks}>
              {openSlot.checks.map((check, index) => {
                const met = slotLevel(openSlot, slotContent(progress, openSlot, others)) > index
                return (
                  <li key={check.rule} className={met ? styles.checkMet : styles.check}>
                    <span className={styles.checkLevel}>{lines.upgrades.checkLevel(index + 1)}</span>
                    <span>
                      {check.rule}
                      <span className="sr-only"> ({met ? lines.upgrades.checkMet : lines.upgrades.checkOpen})</span>
                    </span>
                  </li>
                )
              })}
            </ol>

            <div className={styles.suggestions}>
              <p className={styles.suggestionsHeading}>{lines.upgrades.denHeading}</p>
              <ul className={styles.paths}>
                {[progress, ...others].map((game, index) => {
                  const map = compassTotal(game)
                  return (
                    <li key={index}>
                      <strong>{game.lionName}</strong>: {game.goalText.trim() || lines.upgrades.denGoalMissing}.{' '}
                      {lines.upgrades.denEvidence(map.score, map.max, PATH_EVIDENCE)}.{' '}
                      <span className={styles.pathState}>
                        {isPath(game) ? lines.upgrades.denCounts : lines.upgrades.denNotYet}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className={styles.pathHint}>{lines.upgrades.denHint}</p>
            </div>

            <div className={styles.sheetButtons}>
              <Link className="btn" href="/map">
                {lines.upgrades.toMap}
              </Link>
              <button type="button" className="btn btn-quiet" onClick={() => setOpenId(null)}>
                {lines.upgrades.denClose}
              </button>
            </div>
          </div>
        )}

        {openSlot && !openSlot.tally && (
          <form onSubmit={save}>
            <h2 id="sheet-heading" className={styles.sheetHeading}>
              {openSlot.name}
            </h2>
            <p className={styles.slotTerm}>{openSlot.resumeTerm}</p>

            <div className="field">
              <label htmlFor="slot-content">{openSlot.prompt}</label>
              <textarea
                id="slot-content"
                rows={5}
                maxLength={2000}
                autoFocus
                placeholder={openSlot.placeholder}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </div>

            <p className={styles.preview}>
              <LevelBar level={slotLevel(openSlot, draft)} />
              <span>{lines.upgrades.level(slotLevel(openSlot, draft), MAX_LEVEL)}</span>
            </p>
            <ol className={styles.checks}>
              {openSlot.checks.map((check, index) => {
                const met = slotLevel(openSlot, draft) > index
                return (
                  <li key={check.rule} className={met ? styles.checkMet : styles.check}>
                    <span className={styles.checkLevel}>{lines.upgrades.checkLevel(index + 1)}</span>
                    <span>
                      {check.rule}
                      <span className="sr-only"> ({met ? lines.upgrades.checkMet : lines.upgrades.checkOpen})</span>
                    </span>
                  </li>
                )
              })}
            </ol>

            {showSuggestions && (
              <div className={styles.suggestions}>
                <p className={styles.suggestionsHeading}>{lines.upgrades.suggestionsHeading}</p>
                <ul>
                  {openSlot.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
                {trailWords.length > 0 && (
                  <>
                    <p className={styles.suggestionsHeading}>{lines.upgrades.trailHeading}</p>
                    <ul>
                      {trailWords.map((words, index) => (
                        <li key={index}>{words}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            <div className={styles.sheetButtons}>
              <button type="submit" className="btn">
                {lines.upgrades.save}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setShowSuggestions(true)}>
                {lion(lines.upgrades.askTodah)}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setOpenId(null)}>
                {lines.upgrades.cancel}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </main>
  )
}
