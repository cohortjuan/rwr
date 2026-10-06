'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { MUSIC_BACKGROUND_VOLUME, MUSIC_FADE_SECONDS, MUSIC_TRACK, MUSIC_VOLUME } from '@/lib/assets'
import { useSettings } from '@/lib/settings'

// Taps, clicks, and key presses that browsers accept as permission to start audio.
const gestures = ['pointerup', 'touchend', 'mouseup', 'click', 'keydown']

// Loops the theme while sound is on: full volume on the title screen, then it fades down to
// background level for the rest of the game.
//
// Browsers block audio until the player interacts with the page, and phones can refuse the
// first attempt, so every interaction tries again until the music is actually playing.
// Volume runs through a Web Audio gain node because iPhones ignore an audio element's own
// volume setting.
export default function MusicPlayer() {
  const { sound } = useSettings()
  const level = usePathname() === '/' ? MUSIC_VOLUME : MUSIC_BACKGROUND_VOLUME
  const audioRef = useRef<HTMLAudioElement>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const levelRef = useRef(level)

  // Fade to the level for the current screen.
  useEffect(() => {
    levelRef.current = level
    const audio = audioRef.current
    const context = contextRef.current
    const gain = gainRef.current
    if (context && gain) {
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime)
      gain.gain.linearRampToValueAtTime(level, context.currentTime + MUSIC_FADE_SECONDS)
    } else if (audio) {
      audio.volume = level
    }
  }, [level])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!sound) {
      audio.pause()
      return
    }

    // Route the track through a gain node the first time we are allowed to make sound.
    function connect(element: HTMLAudioElement) {
      if (contextRef.current) return
      try {
        const context = new AudioContext()
        const gain = context.createGain()
        gain.gain.value = levelRef.current
        context.createMediaElementSource(element).connect(gain)
        gain.connect(context.destination)
        element.volume = 1
        contextRef.current = context
        gainRef.current = gain
      } catch {
        // No Web Audio: fall back to the element's own volume.
        element.volume = levelRef.current
      }
    }

    // Trust the element's own events over its `paused` flag, which some phones leave
    // false after a blocked attempt.
    let playing = false
    const onPlaying = () => {
      playing = true
    }
    const onStopped = () => {
      playing = false
    }

    function tryPlay(event?: Event) {
      if (!audio) return
      // Only build the audio graph from a real interaction, or the browser keeps it suspended.
      if (event) connect(audio)
      const context = contextRef.current
      if (context && context.state !== 'running') void context.resume()
      if (!playing) audio.play().catch(() => {})
    }

    audio.volume = contextRef.current ? 1 : levelRef.current
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onStopped)
    tryPlay()
    // Capture phase: buttons that stop the event from bubbling (PRESS START does) still count.
    gestures.forEach((gesture) => window.addEventListener(gesture, tryPlay, { capture: true }))
    return () => {
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('pause', onStopped)
      gestures.forEach((gesture) => window.removeEventListener(gesture, tryPlay, { capture: true }))
    }
  }, [sound])

  if (!MUSIC_TRACK) return null
  return <audio ref={audioRef} src={MUSIC_TRACK} loop playsInline preload="auto" />
}
