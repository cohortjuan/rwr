'use client'

import { useEffect, useRef } from 'react'
import { MUSIC_TRACK, MUSIC_VOLUME } from '@/lib/assets'
import { useSettings } from '@/lib/settings'

// Taps, clicks, and key presses that browsers accept as permission to start audio.
const gestures = ['pointerup', 'touchend', 'click', 'keydown']

// Loops the background track while sound is on. Browsers block audio until the player
// interacts with the page, and phones can refuse the first attempt, so every interaction
// tries again until the music is actually playing. That also brings it back after the
// phone pauses it (a call, a locked screen).
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
    function tryPlay() {
      if (audio?.paused) audio.play().catch(() => {})
    }
    tryPlay()
    gestures.forEach((gesture) => window.addEventListener(gesture, tryPlay))
    return () => {
      gestures.forEach((gesture) => window.removeEventListener(gesture, tryPlay))
    }
  }, [sound])

  if (!MUSIC_TRACK) return null
  return <audio ref={audioRef} src={MUSIC_TRACK} loop playsInline preload="auto" />
}
