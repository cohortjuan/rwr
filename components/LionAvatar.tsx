import {
  GRID,
  HEADROOM,
  NATURAL_MANE,
  parseToken,
  type Accessory,
  type AccessoryArt,
  type Variant,
} from '@/lib/accessories'
import { maneArt } from '@/lib/maneArt'
import styles from './LionAvatar.module.css'

type Props = {
  // Tokens for the accessories being worn (see wornIds in lib/accessories.ts).
  wearing: string[]
  // The mane's size, 0 to 3, from the Mane upgrade's level (see maneSize).
  mane?: number
  mood?: 'neutral' | 'happy'
  // The mouth flaps while a line types out.
  talking?: boolean
  blink?: boolean
  className?: string
}

// Later entries are drawn on top: neck first, the hat last.
const drawOrder = ['neck', 'shades', 'hat']

// One rectangle per run of the same colour in each row of a piece of art.
function rects(art: AccessoryArt, key: string) {
  const cell = art.cell ?? 1
  return art.rows.flatMap((row, y) =>
    [...row.matchAll(/([A-Za-z])\1*/g)].map((run) => (
      <rect
        key={`${key}-${y}-${run.index}`}
        x={art.x + run.index * cell}
        y={art.y + HEADROOM + y * cell}
        width={run[0].length * cell}
        height={cell}
        fill={art.palette[run[1]]}
      />
    )),
  )
}

// A four-pointed glint, one cell across.
function sparkle(x: number, y: number, index: number, key: string) {
  const top = y + HEADROOM
  return (
    <g key={`${key}-glint-${index}`} className={styles.sparkle} style={{ animationDelay: `${index * 0.37}s` }}>
      <rect x={x + 0.3} y={top - 0.6} width={0.4} height={2.2} fill="#ffffff" />
      <rect x={x - 0.6} y={top + 0.3} width={2.2} height={0.4} fill="#ffffff" />
    </g>
  )
}

// The seated lion with its mane and accessories. The sprite keeps its own proportions and
// everything else is drawn on the same grid, so it stays in place at any size.
export default function LionAvatar({
  wearing,
  mane = 0,
  mood = 'neutral',
  talking = false,
  blink = false,
  className,
}: Props) {
  const worn = wearing
    .map(parseToken)
    .filter((entry): entry is { item: Accessory, variant?: Variant } => entry !== undefined)
  const fur = worn.find((entry) => entry.item.category === 'fur')?.item
  const maneColour = worn.find((entry) => entry.item.category === 'mane')?.item.mane
  // Before the mane starts to grow there is nothing to colour: the cub's own tuft is part of
  // the sprite and is left alone.
  const maneShape = mane > 0 ? maneArt[Math.min(mane, maneArt.length - 1)] : null
  const [base, shade] = maneColour ?? NATURAL_MANE

  const drawn = worn.filter((entry) => entry.item.art)
  drawn.sort((a, b) => drawOrder.indexOf(a.item.category) - drawOrder.indexOf(b.item.category))

  return (
    <div className={`${styles.stage} ${className ?? ''}`} aria-hidden="true">
      <div className={styles.lion} style={{ filter: fur?.filter }}>
        {/* His tail is its own layer, so it can wag. A lion that blinks is a live one, and
            its tail moves too: a flick now and then, and faster when he is happy. */}
        <div className={!blink ? styles.tail : mood === 'happy' ? styles.tailHappy : styles.tailWag} />
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
        {maneShape && <g>{rects({ ...maneShape, palette: { M: base, D: shade } }, 'mane')}</g>}
        {drawn.map(({ item, variant }) => (
          <g key={item.id}>
            {item.art?.map((art, layer) =>
              rects({ ...art, palette: { ...art.palette, ...variant?.palette } }, `${item.id}-${layer}`),
            )}
            {item.sparkles?.map((glint, index) => sparkle(glint.x, glint.y, index, item.id))}
          </g>
        ))}
      </svg>
    </div>
  )
}
