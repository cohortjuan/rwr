import styles from './TvFrame.module.css'

// The picture tube over every screen: scanlines, a little glare and a vignette.
//
// On a screen wider than it is tall there is also the set itself, drawn round the game: a
// black plastic cabinet with a thick surround, a rounded tube, two speaker grilles, a power
// button, a row of buttons and a pair of sockets. It is all CSS, with no picture file, and
// a player can switch it off (TV SET in the corner). Where it reaches in from each edge is
// set in app/globals.css, so the page and everything pinned to it sit inside the glass.
//
// Purely decorative and click-through.
export default function TvFrame() {
  return (
    <div className={styles.frame} aria-hidden="true">
      <div className={styles.glass} />
      <div className={styles.set}>
        <div className={styles.cabinet} />
        <div className={styles.tube} />
        <div className={styles.panel}>
          <span className={styles.speakerLeft} />
          <span className={styles.badge}>RWR</span>
          <span className={styles.speakerRight} />
          <span className={styles.groove} />
          <span className={styles.power} />
          <span className={`${styles.label} ${styles.labelPower}`}>POWER</span>
          <span className={`${styles.label} ${styles.labelIn}`}>VIDEO · AUDIO</span>
          <span className={styles.led} />
          <span className={styles.buttons}>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className={styles.sockets}>
            <i />
            <i />
          </span>
          <span className={styles.foot} />
        </div>
      </div>
    </div>
  )
}
