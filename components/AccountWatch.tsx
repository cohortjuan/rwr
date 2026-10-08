'use client'

import { useEffect, useRef, useState } from 'react'
import { cancelRecovery, setNewPassword, useAccount } from '@/lib/account'
import { lines } from '@/lib/lines'
import { saveProgress, useProgress } from '@/lib/progress'
import styles from './AccountWatch.module.css'

// Account jobs that belong to every screen, so this sits in the layout:
// - the new password box, which opens wherever a reset link lands the player
// - switching dev tools off in a game when the player is not on a dev account
export default function AccountWatch() {
  const account = useAccount()
  const progress = useProgress()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const open = account.recovering || saved

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Dev tools stay with the dev account: logged out, or on any other account, they switch off.
  const strayDevTools = account.checked && !account.dev && progress.dev !== null
  useEffect(() => {
    if (strayDevTools) saveProgress({ dev: null })
  }, [strayDevTools])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const ok = await setNewPassword(password)
    setBusy(false)
    setPassword('')
    if (ok) setSaved(true)
    else setMessage(lines.reset.failed)
  }

  function close() {
    setSaved(false)
    setMessage('')
    cancelRecovery()
  }

  return (
    <>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="new-password-heading" onClose={close}>
        <h2 id="new-password-heading" className={styles.heading}>
          {lines.reset.newHeading}
        </h2>
        {saved ? (
          <>
            <p className={styles.message} role="status">
              {lines.reset.saved}
            </p>
            <button type="button" className="btn" onClick={close}>
              {lines.reset.close}
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className={styles.intro}>{lines.reset.newIntro}</p>
            <div className="field">
              <label htmlFor="new-password">{lines.reset.newLabel}</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                aria-describedby="new-password-hint"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <span id="new-password-hint" className="note">
                {lines.reset.newHint}
              </span>
            </div>
            <p className={styles.message} role="status">
              {busy ? lines.reset.working : message}
            </p>
            <div className={styles.buttons}>
              <button type="submit" className="btn" disabled={busy}>
                {lines.reset.save}
              </button>
              <button type="button" className="btn btn-quiet" onClick={close}>
                {lines.reset.close}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
