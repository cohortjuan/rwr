'use client'

import LionAvatar from '@/components/LionAvatar'
import { lionLook } from '@/lib/accessories'
import { lines } from '@/lib/lines'
import { pridePower, todahForm, useProgress, type KeptLion } from '@/lib/progress'
import { useModal } from '@/lib/useModal'
import styles from './LionBoxes.module.css'

type Props = {
  open: boolean
  lions: KeptLion[]
  onPlay: (id: string) => void
  onClose: () => void
}

// The lions set aside from earlier games. Picking one puts it back in play.
export default function LionsBox({ open, lions, onPlay, onClose }: Props) {
  const current = useProgress()

  const dialogRef = useModal(open)

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
              <LionAvatar
                className={styles.lionFace}
                {...lionLook(lion.progress)}
              />
              <div className={styles.lionText}>
                <p className={styles.lionName}>{lion.progress.lionName.toUpperCase()}</p>
                <p className={styles.lionDetail}>
                  {lines.lions.summary(lines.upgrades.forms[todahForm(lion.progress)], power.level, power.max)}
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
