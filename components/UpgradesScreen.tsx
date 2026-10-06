'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { lines } from '@/lib/lines'
import { saveProgress, todahForm, useProgress, type TodahForm } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import { MAX_LEVEL, slotLevel, slots, type Slot, type SlotId } from '@/lib/upgrades'
import styles from './UpgradesScreen.module.css'

const formLabel: Record<TodahForm, string> = {
  cub: lines.upgrades.formCub,
  nomad: lines.upgrades.formNomad,
  leader: lines.upgrades.formLeader,
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
  const { sound } = useSettings()
  const sheetRef = useRef<HTMLDialogElement>(null)
  const [openId, setOpenId] = useState<SlotId | null>(null)
  const [draft, setDraft] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [leveledUp, setLeveledUp] = useState<SlotId | null>(null)

  const openSlot = slots.find((slot) => slot.id === openId) ?? null
  const liveSlots = slots.filter((slot) => !slot.locked)
  const totalLevel = liveSlots.reduce((sum, slot) => sum + slotLevel(slot, progress.upgrades[slot.id] ?? ''), 0)
  const totalMax = liveSlots.length * MAX_LEVEL
  const form = todahForm(progress)

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
          <p className={styles.intro}>{lines.upgrades.intro}</p>
        </header>

        <div className={styles.top}>
          <section className={`panel ${styles.todah}`} aria-label="Todah">
            <div className={leveledUp ? styles.portraitHappy : styles.portrait} aria-hidden="true">
              {!leveledUp && <div className={styles.blink} />}
            </div>
            <div>
              <p className={styles.formName}>{lines.upgrades.todahLabel(formLabel[form])}</p>
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
            </div>
          </section>

          <section className={`panel ${styles.leader}`}>
            <h2 className={styles.leaderTitle}>
              {form === 'leader' ? lines.upgrades.formLeader : lines.upgrades.leaderLocked}
            </h2>
            <p className={styles.leaderBody}>{lines.upgrades.leaderLockedBody}</p>
            <Link className="btn" href="/roar">
              {lines.upgrades.toRoar}
            </Link>
          </section>
        </div>

        <ul className={styles.grid}>
          {slots.map((slot) => {
            const level = slotLevel(slot, progress.upgrades[slot.id] ?? '')
            return (
              <li key={slot.id}>
                <button
                  type="button"
                  className={slot.locked ? styles.slotLocked : styles.slot}
                  disabled={slot.locked}
                  onClick={() => open(slot)}
                >
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
                </button>
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
        {openSlot && (
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
            <p className="note">{openSlot.levelRule}</p>

            {showSuggestions && (
              <div className={styles.suggestions}>
                <p className={styles.suggestionsHeading}>{lines.upgrades.suggestionsHeading}</p>
                <ul>
                  {openSlot.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.sheetButtons}>
              <button type="submit" className="btn">
                {lines.upgrades.save}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setShowSuggestions(true)}>
                {lines.upgrades.askTodah}
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
