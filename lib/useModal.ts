'use client'

import { useEffect, useRef } from 'react'

// A <dialog> that opens as a modal while `open` is true and closes when it turns false.
// Put the returned ref on the dialog. Esc and the dialog's own close still call its onClose,
// so the screen can set `open` back to false there.
export function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return ref
}
