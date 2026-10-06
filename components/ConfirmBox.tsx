'use client'

import { useEffect, useRef } from 'react'
import styles from './ConfirmBox.module.css'

type Props = {
  open: boolean
  text: string
  yes: string
  no: string
  onYes: () => void
  onNo: () => void
}

// In-game yes/no box. Used instead of the browser's own confirm pop-up, which some
// embedded browsers block and which breaks the retro look.
export default function ConfirmBox({ open, text, yes, no, onYes, onNo }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className={styles.box} aria-labelledby="confirm-text" onClose={onNo}>
      <p id="confirm-text" className={styles.text}>
        {text}
      </p>
      <div className={styles.buttons}>
        <button type="button" className="btn" onClick={onYes}>
          {yes}
        </button>
        <button type="button" className="btn btn-quiet" autoFocus onClick={onNo}>
          {no}
        </button>
      </div>
    </dialog>
  )
}
