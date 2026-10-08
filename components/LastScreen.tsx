'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { rememberScreen } from '@/lib/lastScreen'

// Notes each screen of the game as it is shown, so BACK on the pages beside the game (ABOUT,
// PRIVACY, DEV) can return to it. Draws nothing.
export default function LastScreen() {
  const pathname = usePathname()

  useEffect(() => {
    rememberScreen(pathname)
  }, [pathname])

  return null
}
