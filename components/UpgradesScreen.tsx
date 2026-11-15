'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LionAvatar from '@/components/LionAvatar'
import MicButton from '@/components/MicButton'
import { lines } from '@/lib/lines'
import { lionLook, sparks } from '@/lib/accessories'
import { circles, compassTotal } from '@/lib/compass'
import { growth, growthGates, GROWTH_MAX, ROAD_EXPERIMENTS } from '@/lib/growth'
import {
  capsuleDue,
  isPath,
  milestones,
  PATH_EVIDENCE,
  powerParts,
  saveProgress,
  slotContent,
  todahForm,
  useLionText,
  useOtherLions,
  useProgress,
  type Progress,
  type TodahForm,
} from '@/lib/progress'
import { saveSettings, useHydrated, useSettings } from '@/lib/settings'
import { playSfx, preloadSfx } from '@/lib/sfx'
import { MAX_LEVEL, slotLevel, slots, type Slot, type SlotId } from '@/lib/upgrades'
import { useModal } from '@/lib/useModal'
import styles from './UpgradesScreen.module.css'

const maneSlot = slots.find((slot) => slot.id === 'mane') ?? slots[0]

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
    wardrobe: progress.bought.length === 0,
    map: compassTotal(progress).score === 0,
    goal: !progress.goalText,
    device: true,
  }
  const order = Object.keys(lines.upgrades.tips) as TipId[]
  return order.find((id) => fits[id] && !progress.tipsSeen.includes(id)) ?? null
}

// The level bar and its words, as shown at the top of a slot's sheet.
function SlotLevel({ level }: { level: number }) {
  return (
    <p className={styles.preview}>
      <LevelBar level={level} />
      <span>{lines.upgrades.level(level, MAX_LEVEL)}</span>
    </p>
  )
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

// A slot's rules, one per level, each marked done once its level is reached. `label` names
// the level, and `rule` says what it needs.
function CheckList({ items }: { items: { key: string, label: string, rule: string, met: boolean }[] }) {
  return (
    <ol className={styles.checks}>
      {items.map((item) => (
        <li key={item.key} className={item.met ? styles.checkMet : styles.check}>
          <span className={styles.checkLevel}>{item.label}</span>
          <span>
            {item.rule}
            <span className="sr-only"> ({item.met ? lines.upgrades.checkMet : lines.upgrades.checkOpen})</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

const checkItems = (slot: Slot, level: number) =>
  slot.checks.map((check, index) => ({
    key: check.rule,
    label: lines.upgrades.checkLevel(index + 1),
    rule: check.rule,
    met: level > index,
  }))

// The resume builder as an RPG equipment screen. Four slots are live, three are coming soon.
export default function UpgradesScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const { sound, tips } = useSettings()
  const lion = useLionText()
  // One tip per visit: after GOT IT, the next one waits for the next time this screen opens.
  const [tipsQuiet, setTipsQuiet] = useState(false)
  const [openId, setOpenId] = useState<SlotId | null>(null)
  const sheetRef = useModal(openId !== null)
  const [draft, setDraft] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [leveledUp, setLeveledUp] = useState<SlotId | null>(null)

  const openSlot = slots.find((slot) => slot.id === openId) ?? null
  // Read once when the screen is drawn, which is often enough for a date.
  const [now] = useState(() => Date.now())
  const letterDue = capsuleDue(progress, now)
  // A lioness has no mane: the same upgrade is her aura.
  const lioness = progress.lionSex === 'female'
  const slotName = (slot: Slot) => (slot.id === 'mane' && lioness ? lines.upgrades.lioness.name : slot.name)
  // Den counts paths across every lion, so the other lions' games are needed too.
  const others = useOtherLions()
  const parts = powerParts(progress, others)
  const totalLevel = parts.reduce((sum, part) => sum + part.level, 0)
  const totalMax = parts.reduce((sum, part) => sum + part.max, 0)
  const evidence = compassTotal(progress)
  // What the player has already said on the trail, offered back as wording to reuse.
  const trailWords = [
    ...circles.map((circle) => progress.compass[circle].claim.trim()),
    ...progress.onboardingChat.filter((message) => message.role === 'user').map((message) => message.text),
  ].filter(Boolean)
  const form = todahForm(progress)
  const tallyLevel = openSlot?.tally ? slotLevel(openSlot, slotContent(progress, openSlot, others)) : 0
  const grown = growth(progress)
  // What each size of the mane (or aura) needs: a stretch of the journey and a MANE level.
  // While the sheet is open it follows the draft, so the player sees a size come within reach.
  const growthItems = (headline: string) => {
    const reached = growth({ ...progress, upgrades: { ...progress.upgrades, mane: headline } })
    return growthGates.map((gate, index) => ({
      key: gate.id,
      label: lines.upgrades.growthSize(index + 1),
      rule: lines.upgrades.growthGate(gate.id, slotName(maneSlot), index + 1, ROAD_EXPERIMENTS),
      met: reached > index,
    }))
  }
  const tipId = tips && !tipsQuiet ? pickTip(progress, form, totalLevel, totalMax) : null

  // A lioness reads AURA where a tip says MANE.
  const tipText = (id: TipId) =>
    lioness && id === 'start' ? lines.upgrades.lioness.tipStart : lioness && id === 'nomad' ? lines.upgrades.lioness.tipNomad : lines.upgrades.tips[id]

  function dismissTip(id: TipId) {
    playSfx('select', sound)
    saveProgress({ tipsSeen: [...progress.tipsSeen, id] })
    setTipsQuiet(true)
  }

  useEffect(() => {
    preloadSfx()
  }, [])

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

        {/* A letter the player sealed for themselves has reached its day. */}
        {letterDue && (
          <aside className={styles.tip}>
            <p className={styles.tipText}>{lines.capsule.hub}</p>
            <div className={styles.tipButtons}>
              <Link className="btn" href="/crossroads">
                {lines.capsule.hubOpen}
              </Link>
            </div>
          </aside>
        )}

        {tipId && (
          <aside className={styles.tip} aria-label={lines.upgrades.tipLabel}>
            <p className={styles.tipLabel} aria-hidden="true">
              {lines.upgrades.tipLabel}
            </p>
            <p className={styles.tipText}>{lion(tipText(tipId))}</p>
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
            <div className={styles.dressing}>
              <LionAvatar
                className={styles.portrait}
                {...lionLook(progress)}
                mood={leveledUp ? 'happy' : 'neutral'}
                blink
              />
              <p className={styles.sparks}>{lines.upgrades.sparks(sparks(progress).balance)}</p>
              <Link className="btn btn-quiet" href="/wardrobe">
                {lines.upgrades.toWardrobe}
              </Link>
            </div>
            <div>
              <p className={styles.formName}>{lion(lines.upgrades.todahLabel(lines.upgrades.forms[form]))}</p>
              {progress.goalAchievedAt && (
                <p className={styles.grown}>{progress.lionSex === 'female' ? lines.upgrades.grownLioness : lines.upgrades.grown}</p>
              )}
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
              {form === 'leader' ? lines.upgrades.forms.leader : lines.upgrades.leaderLocked}
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
                <span className={styles.slotName}>{slotName(slot)}</span>
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
                <span className={styles.slotGrowth}>
                  {slot.id === 'mane' && lioness ? lines.upgrades.lioness.growth : slot.growth}
                  {slot.id === 'mane' && ` ${lines.upgrades.growthNow(grown, GROWTH_MAX)}`}
                </span>
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
              {slotName(openSlot)}
            </h2>
            <p className={styles.slotTerm}>{openSlot.resumeTerm}</p>
            <SlotLevel level={tallyLevel} />
            <CheckList items={checkItems(openSlot, tallyLevel)} />

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
              {slotName(openSlot)}
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
              <MicButton value={draft} onChange={setDraft} maxLength={2000} />
            </div>

            <SlotLevel level={slotLevel(openSlot, draft)} />
            <CheckList items={checkItems(openSlot, slotLevel(openSlot, draft))} />

            {/* The mane's size waits on the journey too, so its sheet says what each size needs. */}
            {openSlot.id === 'mane' && (
              <>
                <p className={styles.suggestionsHeading}>{lines.upgrades.growthHeading(lioness)}</p>
                <CheckList items={growthItems(draft)} />
              </>
            )}

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
