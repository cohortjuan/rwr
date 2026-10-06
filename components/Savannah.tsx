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

// Dots of light in the night sky. Hidden by day.
export function Stars() {
  return <div className={styles.stars} aria-hidden="true" />
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
