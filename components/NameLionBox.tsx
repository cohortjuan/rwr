'use client'

import { useEffect, useRef, useState } from 'react'
import { lines } from '@/lib/lines'
import { DEFAULT_LION_NAME, isNameAllowed, LION_NAME_MAX } from '@/lib/names'
import styles from './LionBoxes.module.css'

type Props = {
  open: boolean
  onName: (lionName: string) => void
  onCancel: () => void
}

// Asked when a new game starts: keep the lion's usual name, or give the new lion one.
export default function NameLionBox({ open, onName, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function finish(lionName: string) {
    setDraft('')
    setError('')
    onName(lionName)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const lionName = draft.trim().slice(0, LION_NAME_MAX)
    if (!lionName) return
    if (!isNameAllowed(lionName)) {
      setError(lines.errors.nameBlocked)
      return
    }
    finish(lionName)
  }

  function cancel() {
    setDraft('')
    setError('')
    onCancel()
  }

  return (
    <dialog ref={dialogRef} className={styles.box} aria-labelledby="name-lion-question" onClose={cancel}>
      <form onSubmit={submit}>
        <p id="name-lion-question" className={styles.text}>
          {lines.lions.nameQuestion}
        </p>
        <div className="field">
          <label htmlFor="lion-name">{lines.lions.nameLabel}</label>
          <input
            id="lion-name"
            autoFocus
            maxLength={LION_NAME_MAX}
            autoComplete="off"
            placeholder={DEFAULT_LION_NAME}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setError('')
            }}
          />
        </div>
        <p className={styles.error} role="alert">
          {error}
        </p>
        <div className={styles.buttons}>
          <button type="submit" className="btn" disabled={!draft.trim()}>
            {lines.lions.nameUse}
          </button>
          <button type="button" className="btn" onClick={() => finish(DEFAULT_LION_NAME)}>
            {lines.lions.nameKeep(DEFAULT_LION_NAME)}
          </button>
          <button type="button" className="btn btn-quiet" onClick={cancel}>
            {lines.lions.nameCancel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
