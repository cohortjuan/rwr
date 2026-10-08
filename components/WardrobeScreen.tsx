'use client'

import { useState } from 'react'
import Link from 'next/link'
import LionAvatar from '@/components/LionAvatar'
import LoginBox from '@/components/LoginBox'
import {
  accessories,
  accessory,
  buyBlock,
  categories,
  CHEER_SPARKS,
  defaults,
  INTERVIEW_SPARKS,
  LEVEL_SPARKS,
  maneSize,
  owns,
  sparks,
  wornIds,
  wornToken,
  type Accessory,
} from '@/lib/accessories'
import { useAccount } from '@/lib/account'
import { lines } from '@/lib/lines'
import { saveProgress, useKeptLions, useLionText, useProgress } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './WardrobeScreen.module.css'

type ItemId = keyof typeof lines.wardrobe.items
type ColourId = keyof typeof lines.wardrobe.colours
type NoteId = keyof typeof lines.wardrobe.notes

const itemName = (item: Accessory) => lines.wardrobe.items[item.id as ItemId] ?? item.id
const colourName = (id: string) => lines.wardrobe.colours[id as ColourId] ?? id

// Where sparks are spent: accessories for the lion, one worn from each group.
export default function WardrobeScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()
  const keptLions = useKeptLions()
  // Guests can look, but only a player with an account can own or wear accessories.
  const account = useAccount()
  const signedIn = Boolean(account.email)
  const [loginOpen, setLoginOpen] = useState(false)
  const [status, setStatus] = useState('')
  // What a guest is trying on: one token per group, kept only while this screen is open.
  const [trying, setTrying] = useState<Record<string, string>>({})

  if (!hydrated) return <main className="screen" />

  const others = keptLions.map((kept) => kept.progress)
  const purse = sparks(progress)
  const owned = wornIds(progress, others)
  // A guest owns nothing, so what they see on the lion is whatever they are trying on.
  const wearing = signedIn
    ? owned
    : [...owned.filter((token) => !((accessory(token)?.category ?? '') in trying)), ...Object.values(trying)]
  const mane = maneSize(progress)
  const wornIn = (category: string) => wearing.find((token) => accessory(token)?.category === category)

  // A group's default (golden fur, the natural mane) is what the lion has when nothing else is chosen.
  const isWorn = (item: Accessory) => {
    const current = wornIn(item.category)
    return current ? accessory(current) === item : defaults[item.category] === item.id
  }

  function wear(item: Accessory) {
    if (!signedIn) return
    playSfx('select', sound)
    saveProgress({ wearing: { ...progress.wearing, [item.category]: item.id } })
  }

  function takeOff(item: Accessory) {
    playSfx('select', sound)
    const rest = { ...progress.wearing }
    delete rest[item.category]
    saveProgress({ wearing: rest })
  }

  // Buying puts the piece straight on.
  function buy(item: Accessory) {
    if (!signedIn || buyBlock(progress, item, others)) return
    playSfx('levelUp', sound)
    saveProgress({
      bought: [...progress.bought, item.id],
      wearing: { ...progress.wearing, [item.category]: item.id },
    })
    setStatus(lines.wardrobe.bought(itemName(item)))
  }

  // Trying on changes only what this screen shows. Nothing is owned, saved, or shared.
  function tryOn(item: Accessory, colour?: string) {
    playSfx('select', sound)
    setTrying((current) => {
      const rest = { ...current }
      if (rest[item.category] && accessory(rest[item.category]) === item) delete rest[item.category]
      else rest[item.category] = wornToken(item, colour)
      return rest
    })
  }

  // Colours are free to try and to switch. The lion shows one once the piece is worn.
  function pickColour(item: Accessory, colour: string) {
    playSfx('select', sound)
    // A piece being tried on changes colour on the lion straight away.
    if (trying[item.category] && accessory(trying[item.category]) === item) {
      setTrying({ ...trying, [item.category]: wornToken(item, colour) })
    }
    saveProgress({ tones: { ...progress.tones, [item.id]: colour } })
  }

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={styles.header}>
          <h1 className={styles.heading}>{lines.wardrobe.heading}</h1>
          <p className={styles.intro}>{lines.wardrobe.intro}</p>
        </header>

        <section className={`panel ${styles.top}`}>
          <LionAvatar className={styles.preview} wearing={wearing} mane={trying.mane ? Math.max(mane, 1) : mane} blink />
          <div>
            <p className={styles.sparks}>{lines.wardrobe.sparks(purse.balance)}</p>
            <h2 className={styles.subheading}>{lines.wardrobe.earnHeading}</h2>
            <ul className={styles.earn}>
              <li>{lines.wardrobe.earnLevel(LEVEL_SPARKS)}</li>
              <li>{lines.wardrobe.earnCheer(CHEER_SPARKS)}</li>
              <li>{lines.wardrobe.earnInterview(INTERVIEW_SPARKS)}</li>
            </ul>
            <p className={styles.fine}>{lines.wardrobe.earnedSoFar(purse.levels, purse.cheers, purse.interviews)}</p>
            <div className={styles.links}>
              <Link className="btn" href="/pride">
                {lines.wardrobe.toPride}
              </Link>
              <Link className="btn btn-quiet" href="/lookbook">
                {lines.lookbook.open}
              </Link>
              {account.dev && (
                <Link className="btn btn-quiet" href="/dev">
                  {lines.dev.heading}
                </Link>
              )}
            </div>
            <p className={styles.status} role="status">
              {status}
            </p>
          </div>
        </section>

        {!signedIn && (
          <section className={`panel ${styles.account}`}>
            <p>{lines.wardrobe.accountNote}</p>
            <p>{lines.wardrobe.tryNote}</p>
            <button type="button" className="btn" onClick={() => setLoginOpen(true)}>
              {lines.wardrobe.accountButton}
            </button>
          </section>
        )}

        {categories.map((category) => (
          <section key={category} className={styles.group}>
            <h2 className={styles.subheading}>{lines.wardrobe.categories[category]}</h2>
            {category in lines.wardrobe.notes && (
              <p className={styles.fine}>{lion(lines.wardrobe.notes[category as NoteId])}</p>
            )}
            <ul className={styles.grid}>
              {accessories
                .filter((item) => item.category === category)
                .map((item) => {
                  const mine = signedIn && owns(progress, item, others)
                  const worn = isWorn(item)
                  const block = mine ? null : buyBlock(progress, item, others)
                  const colour = item.variants?.find((option) => option.id === progress.tones[item.id]) ?? item.variants?.[0]
                  // Each card shows the lion as it is now, with this piece swapped in.
                  const rest = wearing.filter((token) => accessory(token)?.category !== category)
                  // A mane colour is shown on the first mane there is to colour, even before
                  // the lion has grown one.
                  const shownMane = Math.max(mane, item.needsMane ?? 0)
                  return (
                    <li key={item.id} className={worn ? styles.cardWorn : styles.card}>
                      <LionAvatar className={styles.thumb} wearing={[...rest, wornToken(item, colour?.id)]} mane={shownMane} />
                      <p className={styles.itemName}>{itemName(item)}</p>
                      {item.variants && (
                        <div className={styles.swatches} role="group" aria-label={itemName(item)}>
                          {item.variants.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={option === colour ? styles.swatchOn : styles.swatch}
                              style={{ background: option.swatch }}
                              aria-label={lines.wardrobe.colourLabel(colourName(option.id))}
                              aria-pressed={option === colour}
                              onClick={() => pickColour(item, option.id)}
                            />
                          ))}
                        </div>
                      )}
                      <p className={styles.itemState}>
                        {worn
                          ? lines.wardrobe.wearing
                          : mine
                            ? lines.wardrobe.owned
                            : item.gift
                              ? lion(lines.wardrobe.gifts[item.gift])
                              : lines.wardrobe.price(item.price)}
                      </p>
                      {mine && !worn && (
                        <button
                          type="button"
                          className="btn"
                          aria-label={`${lines.wardrobe.wear}: ${itemName(item)}`}
                          onClick={() => wear(item)}
                        >
                          {lines.wardrobe.wear}
                        </button>
                      )}
                      {mine && worn && defaults[item.category] !== item.id && (
                        <button
                          type="button"
                          className="btn btn-quiet"
                          aria-label={`${lines.wardrobe.takeOff}: ${itemName(item)}`}
                          onClick={() => takeOff(item)}
                        >
                          {lines.wardrobe.takeOff}
                        </button>
                      )}
                      {!signedIn && defaults[item.category] !== item.id && (
                        <>
                          <button
                            type="button"
                            className="btn btn-quiet"
                            aria-pressed={worn}
                            aria-label={`${worn ? lines.wardrobe.tryOff : lines.wardrobe.tryOn}: ${itemName(item)}`}
                            onClick={() => tryOn(item, colour?.id)}
                          >
                            {worn ? lines.wardrobe.tryOff : lines.wardrobe.tryOn}
                          </button>
                          <p className={styles.fine}>{lines.wardrobe.accountNeeded}</p>
                        </>
                      )}
                      {signedIn && !mine && !item.gift && (
                        <>
                          <button
                            type="button"
                            className="btn"
                            aria-label={`${lines.wardrobe.buy}: ${itemName(item)}, ${lines.wardrobe.price(item.price)}`}
                            disabled={block !== null}
                            onClick={() => buy(item)}
                          >
                            {lines.wardrobe.buy}
                          </button>
                          {block === 'mane' && item.needsMane && (
                            <p className={styles.fine}>{lines.wardrobe.needsMane(item.needsMane)}</p>
                          )}
                          {block === 'power' && item.needsPower && (
                            <p className={styles.fine}>{lines.wardrobe.needsPower(item.needsPower)}</p>
                          )}
                          {block === 'sparks' && (
                            <p className={styles.fine}>{lines.wardrobe.short(item.price - purse.balance)}</p>
                          )}
                        </>
                      )}
                    </li>
                  )
                })}
            </ul>
          </section>
        ))}

        <p className={styles.footer}>
          <Link className="btn btn-quiet" href="/upgrades">
            {lines.wardrobe.back}
          </Link>
        </p>
      </div>

      <LoginBox open={loginOpen} guest={false} onClose={() => setLoginOpen(false)} onEnter={() => setLoginOpen(false)} />
    </main>
  )
}
