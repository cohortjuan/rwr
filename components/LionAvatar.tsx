import { accessories, accessory, GRID, HEADROOM, type Accessory } from '@/lib/accessories'
import styles from './LionAvatar.module.css'

type Props = {
  // Ids of the accessories being worn (see wornIds in lib/accessories.ts).
  wearing: string[]
  mood?: 'neutral' | 'happy'
  // The mouth flaps while a line types out.
  talking?: boolean
  blink?: boolean
  className?: string
}

// Later entries are drawn on top: neck first, the hat last.
const drawOrder = ['neck', 'claws', 'shades', 'hat']

// One rectangle per run of the same colour in each row of an accessory's art.
function rects(item: Accessory) {
  const art = item.art
  if (!art) return null
  return art.rows.flatMap((row, y) =>
    [...row.matchAll(/([A-Za-z])\1*/g)].map((run) => (
      <rect
        key={`${item.id}-${y}-${run.index}`}
        x={art.x + run.index}
        y={art.y + HEADROOM + y}
        width={run[0].length}
        height={1}
        fill={art.palette[run[1]]}
      />
    )),
  )
}

// The seated lion with its accessories. The sprite keeps its own proportions and the
// accessories are drawn on the same grid, so they stay in place at any size.
export default function LionAvatar({ wearing, mood = 'neutral', talking = false, blink = false, className }: Props) {
  const worn = wearing.map(accessory).filter((item): item is Accessory => item !== undefined)
  const fur = worn.find((item) => item.category === 'fur')
  const drawn = accessories.filter((item) => worn.includes(item) && item.art)
  drawn.sort((a, b) => drawOrder.indexOf(a.category) - drawOrder.indexOf(b.category))

  return (
    <div className={`${styles.stage} ${className ?? ''}`} aria-hidden="true">
      <div className={styles.lion} style={{ filter: fur?.filter }}>
        <div className={mood === 'happy' ? styles.happy : styles.sprite} />
        {blink && mood !== 'happy' && <div className={styles.blink} />}
        {talking && <div className={styles.mouth} />}
      </div>
      <svg
        className={styles.wear}
        viewBox={`0 0 ${GRID.width} ${GRID.height + HEADROOM}`}
        shapeRendering="crispEdges"
        preserveAspectRatio="none"
      >
        {drawn.map((item) => (
          <g key={item.id}>{rects(item)}</g>
        ))}
      </svg>
    </div>
  )
}
