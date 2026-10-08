'use client'

import { useEffect, useRef, useState } from 'react'
import { levels } from '@/lib/levels'
import { useReducedMotion } from '@/lib/settings'
import styles from './IkigaiWheel.module.css'

// The four Ikigai circles as 16-bit pixel art, painted onto a tiny canvas and scaled up.
//   circles: the four circles pop in one at a time
//   all:     everything lit
//   overlaps: the four two-circle overlaps lit and named
//   missing: one circle reduced to an outline, to show what "missing a circle" looks like
//   center:  only the middle, where all four meet
export type WheelFocus = 'circles' | 'all' | 'overlaps' | 'missing' | 'center'

type Rgb = [number, number, number]

const SIZE = 96
const RADIUS = 27
const INK: Rgb = [26, 18, 38]
const CENTER_COLOR: Rgb = [255, 236, 160]
const DIM = 0.3
const REVEAL_MS = 320

// Same order as the levels: Heart on top, Craft left, Cause right, Coin at the bottom.
const circles: { cx: number, cy: number, color: Rgb, labelX: number, labelY: number }[] = [
  { cx: 48, cy: 33, color: [200, 62, 82], labelX: 50, labelY: 13 },
  { cx: 33, cy: 48, color: [242, 193, 78], labelX: 14, labelY: 50 },
  { cx: 63, cy: 48, color: [42, 157, 143], labelX: 86, labelY: 50 },
  { cx: 48, cy: 63, color: [123, 63, 228], labelX: 50, labelY: 87 },
]

// Where two circles overlap, the diagram gives the overlap its own name.
const overlaps = [
  { name: 'Passion', x: 32, y: 33 },
  { name: 'Mission', x: 68, y: 33 },
  { name: 'Profession', x: 32, y: 67 },
  { name: 'Vocation', x: 68, y: 67 },
]

function paint(canvas: HTMLCanvasElement, focus: WheelFocus, revealed: number) {
  const context = canvas.getContext('2d')
  if (!context) return
  const image = context.createImageData(SIZE, SIZE)

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let edge = false
      const members: number[] = []
      circles.slice(0, revealed).forEach((circle, index) => {
        const distance = Math.hypot(x + 0.5 - circle.cx, y + 0.5 - circle.cy)
        if (Math.abs(distance - RADIUS) < 0.9) edge = true
        // In "missing" mode the first circle keeps its outline but loses its fill.
        if (distance <= RADIUS && !(focus === 'missing' && index === 0)) members.push(index)
      })
      if (!edge && members.length === 0) continue

      let color: Rgb = INK
      if (!edge) {
        const count = members.length
        const sum = members.reduce<Rgb>(
          (total, index) => [
            total[0] + circles[index].color[0],
            total[1] + circles[index].color[1],
            total[2] + circles[index].color[2],
          ],
          [0, 0, 0],
        )
        // Overlaps are the average of their circles, lightened a little for each extra one.
        const lift = 0.2 * (count - 1)
        color =
          count === 4
            ? CENTER_COLOR
            : [0, 1, 2].map((channel) => {
                const average = sum[channel] / count
                return Math.round(average + (255 - average) * lift)
              }) as Rgb
        const lit =
          focus === 'circles' ||
          focus === 'all' ||
          focus === 'missing' ||
          (focus === 'overlaps' && count >= 2) ||
          (focus === 'center' && count === 4)
        if (!lit) color = color.map((channel) => Math.round(channel * DIM)) as Rgb
      }

      const offset = (y * SIZE + x) * 4
      image.data[offset] = color[0]
      image.data[offset + 1] = color[1]
      image.data[offset + 2] = color[2]
      image.data[offset + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
}

export default function IkigaiWheel({ focus }: { focus: WheelFocus }) {
  const reducedMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [count, setCount] = useState(1)

  // The circles pop in one at a time on the first view; other views show all four.
  const animating = focus === 'circles' && !reducedMotion
  const revealed = animating ? count : circles.length

  useEffect(() => {
    if (!animating || count >= circles.length) return
    const timer = window.setTimeout(() => setCount(count + 1), REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [animating, count])

  useEffect(() => {
    if (canvasRef.current) paint(canvasRef.current, focus, revealed)
  }, [focus, revealed])

  const description = `Ikigai diagram: four overlapping circles, ${levels
    .map((level) => `${level.name} for ${level.circle}`)
    .join(', ')}. Ikigai is in the middle where all four meet.`

  return (
    <figure className={focus === 'center' ? styles.wheelGlow : styles.wheel} role="img" aria-label={description}>
      <canvas ref={canvasRef} className={styles.canvas} width={SIZE} height={SIZE} />

      {circles.slice(0, revealed).map((circle, index) => (
        <span
          key={levels[index].name}
          className={focus === 'missing' && index === 0 ? styles.labelMissing : styles.label}
          style={{ left: `${circle.labelX}%`, top: `${circle.labelY}%` }}
        >
          {levels[index].name.toUpperCase()}
        </span>
      ))}

      {focus === 'overlaps' &&
        overlaps.map((overlap) => (
          <span key={overlap.name} className={styles.overlap} style={{ left: `${overlap.x}%`, top: `${overlap.y}%` }}>
            {overlap.name}
          </span>
        ))}

      {(focus === 'center' || focus === 'all') && <span className={styles.center}>PURPOSE</span>}
    </figure>
  )
}
