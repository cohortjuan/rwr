import type { Metadata, Viewport } from 'next'
import { Press_Start_2P } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'RWR: 16-bit Career Adventure',
  description:
    'A retro 16-bit game that helps you explore what you love, what you are good at, what the world needs, and what you can be paid for.',
}

// Phones: fit the screen width and tint the browser bar to match the TV bezel.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17161b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pixel.variable}>
      <body>
        {children}
        <TvFrame />
        <MusicPlayer />
        <SettingsToggles />
      </body>
    </html>
  )
}
