'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import PixelArt from '@/components/PixelArt'
import { logOut, useAccount } from '@/lib/account'
import { lines } from '@/lib/lines'
import { LOW_VOLUME, saveSettings, useSettings } from '@/lib/settings'
import { setSfxLoudness } from '@/lib/sfx'
import styles from './SettingsToggles.module.css'

const moon = [
  '...####..',
  '..###....',
  '.###.....',
  '.###.....',
  '.###.....',
  '.###.....',
  '.####...#',
  '..######.',
  '...####..',
]

// The controls that sit over every screen: the day and night button, the signed-in badge
// with LOG OUT, and one small bar holding ABOUT, DEV (for a dev account) and SETTINGS.
// SETTINGS opens a box with sound, motion, the TV set and the way to PRIVACY, so the corner
// holds a few buttons and none of them can sit on top of another.
export default function SettingsToggles() {
  const settings = useSettings()
  const { email, dev } = useAccount()
  const pathname = usePathname()
  const menuRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = settings.motionOff ? 'true' : 'false'
  }, [settings.motionOff])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.night ? 'night' : 'day'
  }, [settings.night])

  useEffect(() => {
    document.documentElement.dataset.tv = settings.tv ? 'on' : 'off'
  }, [settings.tv])

  useEffect(() => {
    setSfxLoudness(settings.quiet ? LOW_VOLUME : 1)
  }, [settings.quiet])

  // Sound is full, low or off. Low is sound on, turned down.
  const level = !settings.sound ? 'none' : settings.quiet ? 'low' : 'full'
  const levels = [
    { id: 'full', label: lines.settings.soundFull, set: { sound: true, quiet: false } },
    { id: 'low', label: lines.settings.soundLow, set: { sound: true, quiet: true } },
    { id: 'none', label: lines.settings.soundNone, set: { sound: false } },
  ]

  return (
    <>
      <button
        type="button"
        className={settings.night ? styles.moonOn : styles.moon}
        aria-pressed={settings.night}
        aria-label={settings.night ? lines.settings.toDay : lines.settings.toNight}
        title={settings.night ? lines.settings.toDay : lines.settings.toNight}
        onClick={() => saveSettings({ night: !settings.night })}
      >
        <PixelArt rows={moon} />
      </button>

      {/* Shown on every screen while signed in, so logging out is never hidden. */}
      {email && (
        <div className={styles.account}>
          <span className={styles.email}>{lines.account.signedInAs(email)}</span>
          <button type="button" className={styles.toggle} onClick={logOut}>
            {lines.account.logOut}
          </button>
        </div>
      )}

      {/* A link to the page you are already on is left out. */}
      <div className={styles.bar}>
        {dev && pathname !== '/dev' && (
          <Link className={styles.toggle} href="/dev">
            {lines.dev.chip}
          </Link>
        )}
        {pathname !== '/about' && (
          <Link className={styles.toggle} href="/about">
            {lines.about.chip}
          </Link>
        )}
        <button type="button" className={styles.toggle} aria-haspopup="dialog" onClick={() => menuRef.current?.showModal()}>
          {lines.settings.open}
        </button>
      </div>

      <dialog ref={menuRef} className={styles.menu} aria-labelledby="settings-heading">
        <h2 id="settings-heading" className={styles.heading}>
          {lines.settings.heading}
        </h2>

        <div className={styles.row} role="group" aria-label={lines.settings.sound}>
          <span className={styles.name}>{lines.settings.sound}</span>
          {levels.map((option) => (
            <button
              key={option.id}
              type="button"
              className={level === option.id ? styles.choiceOn : styles.choice}
              aria-pressed={level === option.id}
              onClick={() => saveSettings(option.set)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={styles.row}>
          <button
            type="button"
            className={styles.choice}
            aria-pressed={!settings.motionOff}
            onClick={() => saveSettings({ motionOff: !settings.motionOff })}
          >
            {settings.motionOff ? lines.settings.motionOff : lines.settings.motionOn}
          </button>
        </div>

        {/* Only on a wide screen, where there is a TV set to switch off. */}
        <div className={`${styles.row} ${styles.tv}`}>
          <button type="button" className={styles.choice} aria-pressed={settings.tv} onClick={() => saveSettings({ tv: !settings.tv })}>
            {settings.tv ? lines.settings.tvOn : lines.settings.tvOff}
          </button>
          <span className={styles.note}>{lines.settings.tvNote}</span>
        </div>

        <div className={styles.row}>
          {pathname !== '/privacy' && (
            <Link className={styles.choice} href="/privacy" onClick={() => menuRef.current?.close()}>
              {lines.settings.privacy}
            </Link>
          )}
          <button type="button" className={styles.choiceOn} autoFocus onClick={() => menuRef.current?.close()}>
            {lines.settings.close}
          </button>
        </div>
      </dialog>
    </>
  )
}
