'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { lines } from '@/lib/lines'
import { saveSettings, useSettings } from '@/lib/settings'
import styles from './SettingsToggles.module.css'

export default function SettingsToggles() {
  const settings = useSettings()

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = settings.motionOff ? 'true' : 'false'
  }, [settings.motionOff])

  return (
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
  )
}
