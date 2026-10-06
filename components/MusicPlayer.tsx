'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  MUSIC_BACKGROUND_TRACK,
  MUSIC_BACKGROUND_VOLUME,
  MUSIC_FADE_SECONDS,
  MUSIC_TRACK,
  MUSIC_VOLUME,
} from '@/lib/assets'
import { setAudioGate } from '@/lib/audioGate'
import { useSettings } from '@/lib/settings'

// Taps, clicks, and key presses that browsers accept as permission to start audio.
const gestures = ['pointerup', 'touchend', 'mouseup', 'click', 'keydown']

// Two looping tracks while sound is on: the theme on the title screen, and a soft background
// track everywhere after it, with a crossfade between them.
//
// Browsers block audio until the player interacts with the page, and phones want each track
// started from a tap. So both tracks start on the first interaction and keep playing; only
// their volumes change. Volume runs through Web Audio gain nodes because iPhones ignore an
// audio element's own volume setting.
export default function MusicPlayer() {
  const { sound } = useSettings()
  const onTitle = usePathname() === '/'
  const themeRef = useRef<HTMLAudioElement>(null)
  const backgroundRef = useRef<HTMLAudioElement>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const gainsRef = useRef<GainNode[]>([])
  const levelsRef = useRef<number[]>([0, 0])

  // With no background track, the theme itself drops to background level after the title.
  const themeLevel = onTitle ? MUSIC_VOLUME : MUSIC_BACKGROUND_TRACK ? 0 : MUSIC_BACKGROUND_VOLUME
  const backgroundLevel = onTitle ? 0 : MUSIC_BACKGROUND_VOLUME

  // Crossfade to the levels for the current screen.
  useEffect(() => {
    const levels = [themeLevel, backgroundLevel]
    levelsRef.current = levels
    const context = contextRef.current
    const elements = [themeRef.current, backgroundRef.current]
    levels.forEach((level, index) => {
      const gain = gainsRef.current[index]
      const element = elements[index]
      if (context && gain) {
        gain.gain.cancelScheduledValues(context.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, context.currentTime)
        gain.gain.linearRampToValueAtTime(level, context.currentTime + MUSIC_FADE_SECONDS)
      } else if (element) {
        element.volume = level
      }
    })
  }, [themeLevel, backgroundLevel])

  useEffect(() => {
    const elements = [themeRef.current, backgroundRef.current].filter(
      (element): element is HTMLAudioElement => element !== null,
    )
    if (elements.length === 0) return
    if (!sound) {
      elements.forEach((element) => element.pause())
      return
    }

    // Route each track through its own gain node the first time we are allowed to make sound.
    function connect() {
      if (contextRef.current) return
      try {
        const context = new AudioContext()
        gainsRef.current = elements.map((element, index) => {
          const gain = context.createGain()
          gain.gain.value = levelsRef.current[index]
          context.createMediaElementSource(element).connect(gain)
          gain.connect(context.destination)
          element.volume = 1
          return gain
        })
        contextRef.current = context
      } catch {
        // No Web Audio: fall back to each element's own volume.
        elements.forEach((element, index) => {
          element.volume = levelsRef.current[index]
        })
      }
    }

    // Trust each element's own events over its `paused` flag, which some phones leave
    // false after a blocked attempt.
    const playing = new Set<HTMLAudioElement>()
    const onPlaying = (event: Event) => {
      playing.add(event.target as HTMLAudioElement)
      setAudioGate('open')
    }
    const onStopped = (event: Event) => {
      playing.delete(event.target as HTMLAudioElement)
    }

    function tryPlay(event?: Event) {
      // Only build the audio graph from a real interaction, or the browser keeps it suspended.
      if (event) connect()
      const context = contextRef.current
      if (context && context.state !== 'running') void context.resume()
      elements.forEach((element) => {
        if (playing.has(element)) return
        element.play().catch((error: unknown) => {
          // Tell the title screen the browser wants a tap first, so it can ask for one.
          if (!event && error instanceof DOMException && error.name === 'NotAllowedError') setAudioGate('blocked')
        })
      })
    }

    elements.forEach((element, index) => {
      element.volume = contextRef.current ? 1 : levelsRef.current[index]
      element.addEventListener('playing', onPlaying)
      element.addEventListener('pause', onStopped)
    })
    tryPlay()
    // Capture phase: buttons that stop the event from bubbling (PRESS START does) still count.
    gestures.forEach((gesture) => window.addEventListener(gesture, tryPlay, { capture: true }))
    return () => {
      elements.forEach((element) => {
        element.removeEventListener('playing', onPlaying)
        element.removeEventListener('pause', onStopped)
      })
      gestures.forEach((gesture) => window.removeEventListener(gesture, tryPlay, { capture: true }))
    }
  }, [sound])

  if (!MUSIC_TRACK) return null
  return (
    <>
      <audio ref={themeRef} src={MUSIC_TRACK} loop playsInline preload="auto" />
      {MUSIC_BACKGROUND_TRACK && (
        <audio ref={backgroundRef} src={MUSIC_BACKGROUND_TRACK} loop playsInline preload="auto" />
      )}
    </>
  )
}
