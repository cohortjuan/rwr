import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible, Kalam, Pixelify_Sans, Press_Start_2P } from 'next/font/google'
import AccountWatch from '@/components/AccountWatch'
import LastScreen from '@/components/LastScreen'
import MusicPlayer from '@/components/MusicPlayer'
import SettingsToggles from '@/components/SettingsToggles'
import TvFrame from '@/components/TvFrame'
import { lines } from '@/lib/lines'
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

// Built to stay clear at small sizes. Only the four overlap names on the purpose diagram use it.
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

// The game is built on the pop-up box element and on screen-height units that browsers gained
// in 2022 (Safari 15.4). An older browser draws every box open in the page and loses the
// layout, and may not run the game's own code at all. So this check is plain old JavaScript
// with its styles written out in full: it must work where nothing else does. It covers the
// page with a notice saying what to do, and a way past it, once the page has been read.
const oldBrowserNotice =
  'document.addEventListener("DOMContentLoaded",function(){try{var ok="HTMLDialogElement" in window&&window.CSS&&CSS.supports&&CSS.supports("height","100dvh");if(ok)return;' +
  `var t=${JSON.stringify(lines.oldBrowser)};` +
  'var b=document.createElement("div");b.setAttribute("role","alertdialog");b.setAttribute("aria-label",t.title);' +
  'b.style.cssText="position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483647;background:#110d2a;color:#f6e3a8;' +
  'font:18px/1.5 system-ui,-apple-system,Helvetica,Arial,sans-serif;padding:12vh 24px;text-align:center;overflow:auto";' +
  'var h=document.createElement("h1");h.textContent=t.title;h.style.cssText="font-size:26px;margin:0 auto 16px;max-width:640px";' +
  'var p=document.createElement("p");p.textContent=t.body;p.style.cssText="margin:0 auto 28px;max-width:640px";' +
  'var k=document.createElement("button");k.type="button";k.textContent=t.dismiss;' +
  'k.style.cssText="font:inherit;font-weight:700;padding:12px 20px;background:#f2c14e;color:#110d2a;border:3px solid #110d2a;cursor:pointer";' +
  'k.onclick=function(){b.parentNode.removeChild(b)};b.appendChild(h);b.appendChild(p);b.appendChild(k);document.body.appendChild(b);k.focus()}catch(e){}})'

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
        <script dangerouslySetInnerHTML={{ __html: oldBrowserNotice }} />
      </head>
      <body>
        {children}
        <TvFrame />
        <MusicPlayer />
        <SettingsToggles />
        <AccountWatch />
        <LastScreen />
      </body>
    </html>
  )
}
