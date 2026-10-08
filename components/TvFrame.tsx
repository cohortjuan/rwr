import styles from './TvFrame.module.css'

// Old-school TV glass over every screen: scanlines, a little glare and a vignette, edge to
// edge with no bezel. Purely decorative and click-through.
export default function TvFrame() {
  return (
    <div className={styles.frame} aria-hidden="true">
      <div className={styles.glass} />
    </div>
  )
}
