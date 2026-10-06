import styles from './TvFrame.module.css'

// Old-school TV set around every screen: bezel, curved glass corners, scanlines, vignette.
// Purely decorative and click-through.
export default function TvFrame() {
  return (
    <div className={styles.frame} aria-hidden="true">
      <div className={styles.glass} />
    </div>
  )
}
