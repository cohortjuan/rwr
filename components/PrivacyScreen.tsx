'use client'

import { useState } from 'react'
import Link from 'next/link'
import ConfirmBox from '@/components/ConfirmBox'
import { deleteAccount, logOut, requestPasswordReset, useAccount } from '@/lib/account'
import { lines } from '@/lib/lines'
import { clearProgress, saveProgress, setSaveOnDevice, useLionText, useProgress } from '@/lib/progress'
import { saveSettings, useHydrated, useSettings } from '@/lib/settings'
import styles from './PrivacyScreen.module.css'

// Plain-language account of where a player's answers go, with the controls to stop or undo it.
export default function PrivacyScreen() {
  const hydrated = useHydrated()
  const settings = useSettings()
  const progress = useProgress()
  const lion = useLionText()
  const { email, dev } = useAccount()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function deleteEverything() {
    setConfirming(false)
    setBusy(true)
    clearProgress()
    if (!email) {
      setStatus(lines.privacy.deleted)
    } else {
      setStatus((await deleteAccount()) ? lines.privacy.deletedAccount : lines.privacy.deleteFailed)
    }
    setBusy(false)
  }

  // A signed-in player changes their password the same way a forgotten one is reset: by a
  // link sent to their own email.
  async function changePassword() {
    if (!email) return
    setBusy(true)
    setStatus((await requestPasswordReset(email)) ? lines.reset.changeSent(email) : lines.reset.failed)
    setBusy(false)
  }

  if (!hydrated) return <main className="screen" />

  return (
    <main className="screen">
      <div className="screen-inner">
        <h1 className={styles.heading}>{lines.privacy.heading}</h1>
        <p className={styles.intro}>{lines.privacy.intro}</p>

        <dl className={styles.points}>
          {lines.privacy.points.map((point) => (
            <div key={point.title} className={styles.point}>
              <dt>{point.title}</dt>
              <dd>{lion(point.body)}</dd>
            </div>
          ))}
        </dl>

        <section className="panel">
          <div className={styles.controls}>
            <button
              type="button"
              className="btn"
              aria-pressed={settings.saveOnDevice}
              onClick={() => setSaveOnDevice(!settings.saveOnDevice)}
            >
              {settings.saveOnDevice ? lines.privacy.saveOn : lines.privacy.saveOff}
            </button>
            <button
              type="button"
              className="btn"
              aria-pressed={progress.aiConsent === 'yes'}
              onClick={() => saveProgress({ aiConsent: progress.aiConsent === 'yes' ? 'no' : 'yes' })}
            >
              {progress.aiConsent === 'yes' ? lines.privacy.aiOn : lines.privacy.aiOff}
            </button>
            <button
              type="button"
              className="btn"
              aria-pressed={settings.tips}
              onClick={() => {
                // Switching tips back on also brings back the ones already dismissed.
                if (!settings.tips) saveProgress({ tipsSeen: [] })
                saveSettings({ tips: !settings.tips })
              }}
            >
              {settings.tips ? lines.privacy.tipsOn : lines.privacy.tipsOff}
            </button>
            <button type="button" className={`btn ${styles.danger}`} disabled={busy} onClick={() => setConfirming(true)}>
              {lines.privacy.deleteButton}
            </button>
          </div>
          <p className={styles.status} role="status">
            {status || (!settings.saveOnDevice ? lines.privacy.saveOffNote : '')}
          </p>
          {email && (
            <p className={styles.account}>
              <span>{lines.account.signedInAs(email)}</span>
              <button type="button" className="btn btn-quiet" onClick={logOut}>
                {lines.account.logOut}
              </button>
              <button type="button" className="btn btn-quiet" disabled={busy} onClick={changePassword}>
                {lines.reset.change}
              </button>
              {dev && (
                <Link className="btn btn-quiet" href="/dev">
                  {lines.dev.heading}
                </Link>
              )}
            </p>
          )}
        </section>

        <p className={styles.footer}>
          <Link className="btn btn-quiet" href="/">
            {lines.privacy.back}
          </Link>
        </p>
      </div>

      <ConfirmBox
        open={confirming}
        text={lines.privacy.deleteConfirm}
        yes={lines.privacy.deleteYes}
        no={lines.privacy.deleteNo}
        onYes={deleteEverything}
        onNo={() => setConfirming(false)}
      />
    </main>
  )
}
