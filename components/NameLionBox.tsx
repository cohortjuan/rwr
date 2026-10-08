'use client'

import { useEffect, useRef, useState } from 'react'
import { lines } from '@/lib/lines'
import { DEFAULT_LION_NAME, isNameAllowed, LION_NAME_MAX } from '@/lib/names'
import type { LionSex } from '@/lib/progress'
import styles from './LionBoxes.module.css'

type Props = {
  open: boolean
  onName: (lionName: string, lionSex: LionSex) => void
  onCancel: () => void
  // The lion being changed. Left out when a new game is starting. Give the box a `key` that
  // changes each time it opens, so it starts from this lion as it is now.
  current?: { name: string, sex: LionSex }
}

const sexes: LionSex[] = ['male', 'female']

// Asked when a new game starts: keep the lion's usual name or give the new lion one, and choose
// a lion or a lioness. The same box changes either one later, from the wardrobe.
export default function NameLionBox({ open, onName, onCancel, current }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState(current?.name ?? '')
  const [sex, setSex] = useState<LionSex>(current?.sex ?? 'male')
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function reset() {
    setDraft(current?.name ?? '')
    setSex(current?.sex ?? 'male')
    setError('')
  }

  function finish(lionName: string) {
    reset()
    onName(lionName, sex)
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
    reset()
    onCancel()
  }

  return (
    <dialog ref={dialogRef} className={styles.box} aria-labelledby="name-lion-question" onClose={cancel}>
      <form onSubmit={submit}>
        <p id="name-lion-question" className={styles.text}>
          {current ? lines.lions.changeQuestion : lines.lions.nameQuestion}
        </p>
        <div className="field">
          <label htmlFor="lion-name">{current ? lines.lions.changeLabel : lines.lions.nameLabel}</label>
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
        <fieldset className={styles.choice}>
          <legend>{lines.lions.sexLabel}</legend>
          {sexes.map((option) => (
            <label key={option} className={styles.option}>
              <input type="radio" name="lion-sex" value={option} checked={sex === option} onChange={() => setSex(option)} />
              {lines.lions.sexes[option]}
            </label>
          ))}
        </fieldset>
        <p className={styles.note}>{current ? lines.lions.changeNote : lines.lions.sexNote}</p>
        <p className={styles.error} role="alert">
          {error}
        </p>
        <div className={styles.buttons}>
          <button type="submit" className="btn" disabled={!draft.trim()}>
            {current ? lines.lions.changeSave : lines.lions.nameUse}
          </button>
          {!current && (
            <button type="button" className="btn" onClick={() => finish(DEFAULT_LION_NAME)}>
              {lines.lions.nameKeep(DEFAULT_LION_NAME)}
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={cancel}>
            {lines.lions.nameCancel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
