'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { noteHistoryMove, rememberScreen } from '@/lib/lastScreen'

// Notes each screen as it is shown, so the back arrow on every screen and BACK on the pages
// beside the game can return to the one before. Draws nothing.
export default function LastScreen() {
  const pathname = usePathname()

  // The browser says when the page moved through its history. It says so before the new
  // screen is shown, so the note below knows a step was taken back.
  useEffect(() => {
    window.addEventListener('popstate', noteHistoryMove)
    return () => window.removeEventListener('popstate', noteHistoryMove)
  }, [])

  useEffect(() => {
    rememberScreen(pathname)
  }, [pathname])

  return null
}
