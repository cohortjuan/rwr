import PixelArt from '@/components/PixelArt'
import styles from './Savannah.module.css'

// Distant life on the title screen: birds crossing the sky and animal silhouettes walking the
// horizon. All of it is tiny pixel art drawn from the grids below ('#' is a filled pixel), so
// there are no image files to load. Purely decorative, and still when motion is off.

const birdUp = ['#.....#', '.#...#.', '..###..']
const birdDown = ['..###..', '.#...#.', '#.....#']

const giraffe = [
  '........##..',
  '.......####.',
  '.......#####',
  '.......###..',
  '.......##...',
  '......###...',
  '......##....',
  '.....###....',
  '.....##.....',
  '....###.....',
  '.#######....',
  '########....',
  '########....',
  '########....',
  '.#######....',
  '.##...##....',
  '.##...##....',
  '.##...##....',
  '.##...##....',
  '.##...##....',
]

const elephant = [
  '...#########......',
  '..############.##.',
  '.################.',
  '#################.',
  '#################.',
  '################.#',
  '###############..#',
  '.##############..#',
  '.###..###.###...#.',
  '.###..###.###.....',
  '.###..###.###.....',
  '.###..###.###.....',
]

const acacia = [
  '...##########.....',
  '.###############..',
  '#################.',
  '..####.###.####...',
  '.....#..#..#......',
  '......#.#.#.......',
  '.......###........',
  '........#.........',
  '........#.........',
  '........#.........',
]

function Bird({ className }: { className: string }) {
  return (
    <span className={`${styles.bird} ${className}`}>
      <PixelArt rows={birdUp} className={styles.wingsUp} />
      <PixelArt rows={birdDown} className={styles.wingsDown} />
    </span>
  )
}

// Stands on the far edge of the plain, in front of the hills and behind the cub.
export function Horizon() {
  return (
    <div className={styles.horizon} aria-hidden="true">
      <PixelArt rows={acacia} className={styles.tree} />
      <div className={styles.herd}>
        <PixelArt rows={giraffe} className={styles.walker} />
        <PixelArt rows={elephant} className={styles.walkerLate} />
        <PixelArt rows={elephant} className={styles.calf} />
      </div>
    </div>
  )
}

// The night sky is laid out from a fixed seed, so it is the same on every visit and the server
// and the browser agree on it.
function seededRoll(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const roll = seededRoll(7)

// About two stars in three twinkle. Each has its own rhythm and head start, so they flicker
// one here, one there, never all together.
const stars = Array.from({ length: 36 }, (_, index) => {
  const twinkles = roll() < 0.65
  return {
    id: index,
    left: `${(roll() * 100).toFixed(2)}%`,
    top: `${(roll() * 94).toFixed(2)}%`,
    big: roll() < 0.25,
    blue: roll() < 0.3,
    twinkle: twinkles
      ? { animationDuration: `${(3 + roll() * 7).toFixed(2)}s`, animationDelay: `-${(roll() * 10).toFixed(2)}s` }
      : undefined,
  }
})

// Points of light in the night sky, with a shooting star now and then. Hidden by day.
export function Stars() {
  return (
    <div className={styles.stars} aria-hidden="true">
      {stars.map((star) => (
        <span
          key={star.id}
          className={[
            styles.star,
            star.big ? styles.starBig : '',
            star.blue ? styles.starBlue : '',
            star.twinkle ? styles.twinkler : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ left: star.left, top: star.top, ...star.twinkle }}
        />
      ))}
      <span className={`${styles.shooting} ${styles.shootOne}`} />
      <span className={`${styles.shooting} ${styles.shootTwo}`} />
    </div>
  )
}

export function Birds() {
  return (
    <div className={styles.flock} aria-hidden="true">
      <Bird className={styles.birdOne} />
      <Bird className={styles.birdTwo} />
      <Bird className={styles.birdThree} />
    </div>
  )
}
