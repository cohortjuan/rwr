'use client'

import { useState } from 'react'
import Link from 'next/link'
import ConfirmBox from '@/components/ConfirmBox'
import { lines } from '@/lib/lines'
import { clearProgress, saveProgress, setSaveOnDevice, useProgress } from '@/lib/progress'
import { useHydrated, useSettings } from '@/lib/settings'
import { getSupabase } from '@/lib/supabase'
import styles from './PrivacyScreen.module.css'

// Tables that hold a signed-in player's rows. Row level security limits each delete to the
// player's own rows; the filter below is belt and braces.
const ownedTables: { table: string, column: string }[] = [
  { table: 'claims', column: 'user_id' },
  { table: 'roadmap_steps', column: 'user_id' },
  { table: 'upgrades', column: 'user_id' },
  { table: 'goals', column: 'user_id' },
  { table: 'interview_sessions', column: 'user_id' },
  { table: 'profiles', column: 'id' },
]

// Plain-language account of where a player's answers go, with the controls to stop or undo it.
export default function PrivacyScreen() {
  const hydrated = useHydrated()
  const settings = useSettings()
  const progress = useProgress()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function deleteEverything() {
    setConfirming(false)
    setBusy(true)
    clearProgress()
    const supabase = getSupabase()
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null
      if (!supabase || !session) {
        setStatus(lines.privacy.deleted)
        return
      }
      for (const { table, column } of ownedTables) {
        const { error } = await supabase.from(table).delete().eq(column, session.user.id)
        if (error) throw error
      }
      await supabase.auth.signOut()
      setStatus(lines.privacy.deletedAccount)
    } catch {
      setStatus(lines.privacy.deleteFailed)
    } finally {
      setBusy(false)
    }
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
              <dd>{point.body}</dd>
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
            <button type="button" className={`btn ${styles.danger}`} disabled={busy} onClick={() => setConfirming(true)}>
              {lines.privacy.deleteButton}
            </button>
          </div>
          <p className={styles.status} role="status">
            {status || (!settings.saveOnDevice ? lines.privacy.saveOffNote : '')}
          </p>
          <p className="note">{lines.privacy.accountNote}</p>
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
