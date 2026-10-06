'use client'

import { useEffect, useRef } from 'react'
import { lines } from '@/lib/lines'
import { pridePower, todahForm, useProgress, type KeptLion, type TodahForm } from '@/lib/progress'
import styles from './LionBoxes.module.css'

type Props = {
  open: boolean
  lions: KeptLion[]
  onPlay: (id: string) => void
  onClose: () => void
}

const formLabel: Record<TodahForm, string> = {
  cub: lines.upgrades.formCub,
  nomad: lines.upgrades.formNomad,
  leader: lines.upgrades.formLeader,
}

// The lions set aside from earlier games. Picking one puts it back in play.
export default function LionsBox({ open, lions, onPlay, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const current = useProgress()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className={styles.box} aria-labelledby="lions-heading" onClose={onClose}>
      <h2 id="lions-heading" className={styles.heading}>
        {lines.lions.listHeading}
      </h2>
      <p className={styles.text}>{lines.lions.listIntro}</p>
      <ul className={styles.list}>
        {lions.map((lion) => {
          // Every other lion, including the one in play, counts toward this lion's Den.
          const others = [current, ...lions.filter((other) => other.id !== lion.id).map((other) => other.progress)]
          const power = pridePower(lion.progress, others)
          return (
            <li key={lion.id} className={styles.lion}>
              <div>
                <p className={styles.lionName}>{lion.progress.lionName.toUpperCase()}</p>
                <p className={styles.lionDetail}>
                  {lines.lions.summary(formLabel[todahForm(lion.progress, others)], power.level, power.max)}
                </p>
                {lion.progress.goalText && (
                  <p className={styles.lionDetail}>
                    {lines.lions.goal} <strong>{lion.progress.goalText}</strong>
                  </p>
                )}
                {lion.progress.playerName && (
                  <p className={styles.lionDetail}>{lines.lions.walkingWith(lion.progress.playerName)}</p>
                )}
              </div>
              <button type="button" className="btn" onClick={() => onPlay(lion.id)}>
                {lines.lions.play}
              </button>
            </li>
          )
        })}
      </ul>
      <div className={styles.buttons}>
        <button type="button" className="btn btn-quiet" autoFocus onClick={onClose}>
          {lines.lions.close}
        </button>
      </div>
    </dialog>
  )
}
