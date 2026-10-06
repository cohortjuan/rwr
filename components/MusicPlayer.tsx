'use client'

import { useEffect, useRef } from 'react'
import { MUSIC_TRACK, MUSIC_VOLUME } from '@/lib/assets'
import { useSettings } from '@/lib/settings'

// Loops the background track while sound is on. Browsers block audio until the player
// interacts with the page, so playback starts on the first click or key press.
export default function MusicPlayer() {
  const { sound } = useSettings()
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = MUSIC_VOLUME
    if (!sound) {
      audio.pause()
      return
    }
    function start() {
      audio?.play().catch(() => {})
    }
    start()
    window.addEventListener('pointerdown', start, { once: true })
    window.addEventListener('keydown', start, { once: true })
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
  }, [sound])

  if (!MUSIC_TRACK) return null
  return <audio ref={audioRef} src={MUSIC_TRACK} loop preload="auto" />
}
