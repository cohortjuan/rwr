'use client'

import { useState } from 'react'
import Link from 'next/link'
import LionAvatar from '@/components/LionAvatar'
import LoginBox from '@/components/LoginBox'
import {
  accessories,
  buyBlock,
  categories,
  CHEER_SPARKS,
  DEFAULT_FUR,
  INTERVIEW_SPARKS,
  owns,
  sparks,
  wornIds,
  type Accessory,
} from '@/lib/accessories'
import { useAccountEmail } from '@/lib/account'
import { lines } from '@/lib/lines'
import { saveProgress, useKeptLions, useLionText, useProgress } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { playSfx } from '@/lib/sfx'
import styles from './WardrobeScreen.module.css'

type ItemId = keyof typeof lines.wardrobe.items

const itemName = (item: Accessory) => lines.wardrobe.items[item.id as ItemId] ?? item.id

// Where sparks are spent: accessories for the lion, one worn from each group.
export default function WardrobeScreen() {
  const hydrated = useHydrated()
  const progress = useProgress()
  const lion = useLionText()
  const { sound } = useSettings()
  const keptLions = useKeptLions()
  // Guests can look, but only a player with an account can own or wear accessories.
  const signedIn = Boolean(useAccountEmail())
  const [loginOpen, setLoginOpen] = useState(false)
  const [status, setStatus] = useState('')

  if (!hydrated) return <main className="screen" />

  const others = keptLions.map((kept) => kept.progress)
  const purse = sparks(progress)
  const wearing = wornIds(progress, others)

  // The default fur is what the lion wears when no other fur is chosen.
  const isWorn = (item: Accessory) =>
    wearing.includes(item.id) || (item.id === DEFAULT_FUR && !wearing.some((id) => id !== item.id && accessories.find((other) => other.id === id)?.category === 'fur'))

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

  return (
    <main className="screen">
      <div className="screen-inner">
        <header className={styles.header}>
          <h1 className={styles.heading}>{lines.wardrobe.heading}</h1>
          <p className={styles.intro}>{lines.wardrobe.intro}</p>
        </header>

        <section className={`panel ${styles.top}`}>
          <LionAvatar className={styles.preview} wearing={wearing} blink />
          <div>
            <p className={styles.sparks}>{lines.wardrobe.sparks(purse.balance)}</p>
            <h2 className={styles.subheading}>{lines.wardrobe.earnHeading}</h2>
            <ul className={styles.earn}>
              <li>{lines.wardrobe.earnCheer(CHEER_SPARKS)}</li>
              <li>{lines.wardrobe.earnInterview(INTERVIEW_SPARKS)}</li>
            </ul>
            <p className={styles.fine}>{lines.wardrobe.earnedSoFar(purse.cheers, purse.interviews)}</p>
            <Link className="btn" href="/pride">
              {lines.wardrobe.toPride}
            </Link>
            <p className={styles.status} role="status">
              {status}
            </p>
          </div>
        </section>

        {!signedIn && (
          <section className={`panel ${styles.account}`}>
            <p>{lines.wardrobe.accountNote}</p>
            <button type="button" className="btn" onClick={() => setLoginOpen(true)}>
              {lines.wardrobe.accountButton}
            </button>
          </section>
        )}

        {categories.map((category) => (
          <section key={category} className={styles.group}>
            <h2 className={styles.subheading}>{lines.wardrobe.categories[category]}</h2>
            {category === 'fur' && <p className={styles.fine}>{lines.wardrobe.furNote}</p>}
            <ul className={styles.grid}>
              {accessories
                .filter((item) => item.category === category)
                .map((item) => {
                  const mine = signedIn && owns(progress, item, others)
                  const worn = isWorn(item)
                  const block = mine ? null : buyBlock(progress, item, others)
                  // Each card shows the lion wearing just this piece, so it can be judged before buying.
                  const restWorn = wearing.filter((id) => accessories.find((other) => other.id === id)?.category !== category)
                  return (
                    <li key={item.id} className={worn ? styles.cardWorn : styles.card}>
                      <LionAvatar className={styles.thumb} wearing={[...restWorn, item.id]} />
                      <p className={styles.itemName}>{itemName(item)}</p>
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
                      {mine && worn && item.id !== DEFAULT_FUR && (
                        <button
                          type="button"
                          className="btn btn-quiet"
                          aria-label={`${lines.wardrobe.takeOff}: ${itemName(item)}`}
                          onClick={() => takeOff(item)}
                        >
                          {lines.wardrobe.takeOff}
                        </button>
                      )}
                      {!signedIn && item.id !== DEFAULT_FUR && <p className={styles.fine}>{lines.wardrobe.accountNeeded}</p>}
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
