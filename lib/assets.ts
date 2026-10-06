// Paths to art that can be swapped. Set a path to null to fall back to a placeholder.

// Seated, front-facing cub for the title screen (shown after the walk-in).
export const SEATED_SPRITE: string | null = '/sprites/todah-sit.png'

// Music, played under the sound toggle. Both are short loops to keep downloads small.
// The theme plays on the title screen, then crossfades into the soft background track for
// the rest of the game. Set either to null to turn it off.
export const MUSIC_TRACK: string | null = '/audio/theme-loop.mp3'
export const MUSIC_BACKGROUND_TRACK: string | null = '/audio/background-loop.mp3'

// Volumes from 0 to 1, and how long the crossfade takes.
export const MUSIC_VOLUME = 0.25
export const MUSIC_BACKGROUND_VOLUME = 0.12
export const MUSIC_FADE_SECONDS = 1.5
// The music drops out this fast when Todah roars, so the roar is the only sound.
export const MUSIC_CUT_SECONDS = 0.15

// Played when a lion upgrade gains a level. Set to null to use the built-in chime instead.
export const LEVEL_UP_SOUND: string | null = '/audio/level-up.mp3'
export const LEVEL_UP_VOLUME = 0.5
