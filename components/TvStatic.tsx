'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/settings'
import styles from './TvStatic.module.css'

// Old TV "snow" for the switched-off screen: random grey pixels on a small canvas, scaled up.
// One snow pixel covers this many screen pixels.
const CELL = 3
// Redraws per second. Kept low, and the snow kept dim, so the flicker stays gentle.
const FPS = 12
const BRIGHTEST = 170

function paint(canvas: HTMLCanvasElement) {
  const width = Math.max(1, Math.ceil(canvas.clientWidth / CELL))
  const height = Math.max(1, Math.ceil(canvas.clientHeight / CELL))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return
  const image = context.createImageData(width, height)
  const pixels = new Uint32Array(image.data.buffer)
  for (let index = 0; index < pixels.length; index++) {
    // Squaring the roll leans the snow dark, with the odd bright speck.
    const grey = Math.floor(Math.random() * Math.random() * BRIGHTEST)
    pixels[index] = 0xff000000 | (grey << 16) | (grey << 8) | grey
  }
  context.putImageData(image, 0, 0)
}

export default function TvStatic() {
  const reducedMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paint(canvas)
    const repaint = () => paint(canvas)
    window.addEventListener('resize', repaint)
    // Motion off: one still frame of snow, no flicker.
    const timer = reducedMotion ? undefined : window.setInterval(repaint, 1000 / FPS)
    return () => {
      window.removeEventListener('resize', repaint)
      window.clearInterval(timer)
    }
  }, [reducedMotion])

  return <canvas ref={canvasRef} className={styles.snow} aria-hidden="true" />
}
