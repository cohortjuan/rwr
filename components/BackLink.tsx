'use client'

import Link from 'next/link'
import { useLastScreen } from '@/lib/lastScreen'
import { lines } from '@/lib/lines'

// BACK for the pages beside the game (ABOUT, PRIVACY, DEV): it returns to the screen the
// player was on, whichever that was. With nothing to return to, it leads to the title.
export default function BackLink() {
  const lastScreen = useLastScreen()

  return (
    <Link className="btn btn-quiet" href={lastScreen}>
      {lines.settings.back}
    </Link>
  )
}
