import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible, Kalam, Pixelify_Sans, Press_Start_2P } from 'next/font/google'
import AccountWatch from '@/components/AccountWatch'
import MusicPlayer from '@/components/MusicPlayer'
import SettingsToggles from '@/components/SettingsToggles'
import TvFrame from '@/components/TvFrame'
import './globals.css'

// Pixel font for headings and Todah's box. Long text uses a plain system font.
const pixel = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})

// Readable pixel font for what Todah says.
const talk = Pixelify_Sans({
  subsets: ['latin'],
  variable: '--font-talk',
})

// Built to stay clear at small sizes. Only the four overlap names on the Ikigai diagram use it.
const clear = Atkinson_Hyperlegible({
  weight: '700',
  subsets: ['latin'],
  variable: '--font-clear',
})

// Handwriting, used in one place only: the note Todah leaves at the end of the game.
const hand = Kalam({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-hand',
})

export const metadata: Metadata = {
  title: 'RWR: 16-bit Career Adventure',
  description:
    'A retro 16-bit game that helps you explore what you love, what you are good at, what the world needs, and what you can be paid for.',
}

// Runs before the page paints, so a saved night mode or motion choice applies from the very
// first frame instead of flashing the default first. Keep the key in step with lib/settings.ts.
const applySavedSettings =
  'try{var s=JSON.parse(localStorage.getItem("rwr.settings.v1")||"{}"),d=document.documentElement;' +
  'd.dataset.theme=s.night?"night":"day";d.dataset.reduceMotion=s.motionOff?"true":"false";' +
  'd.dataset.tv=s.tv===false?"off":"on"}catch(e){}'

// Phones: fit the screen width and tint the browser bar to match the top of the screen.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1b1740',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${talk.variable} ${clear.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applySavedSettings }} />
      </head>
      <body>
        {children}
        <TvFrame />
        <MusicPlayer />
        <SettingsToggles />
        <AccountWatch />
      </body>
    </html>
  )
}
