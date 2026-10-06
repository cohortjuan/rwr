'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import PixelArt from '@/components/PixelArt'
import { lines } from '@/lib/lines'
import { saveSettings, useSettings } from '@/lib/settings'
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

export default function SettingsToggles() {
  const settings = useSettings()

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = settings.motionOff ? 'true' : 'false'
  }, [settings.motionOff])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.night ? 'night' : 'day'
  }, [settings.night])

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
      <div className={styles.bar}>
      <Link className={styles.toggle} href="/privacy">
        {lines.privacy.link}
      </Link>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={settings.sound}
        onClick={() => saveSettings({ sound: !settings.sound })}
      >
        {settings.sound ? lines.settings.soundOn : lines.settings.soundOff}
      </button>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={!settings.motionOff}
        onClick={() => saveSettings({ motionOff: !settings.motionOff })}
      >
        {settings.motionOff ? lines.settings.motionOff : lines.settings.motionOn}
      </button>
      </div>
    </>
  )
}
