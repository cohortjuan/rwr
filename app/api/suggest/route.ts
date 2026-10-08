import { checkIdeaLimit } from '@/lib/limit'
import { mailReady, sendMail } from '@/lib/mail'
import { isNameAllowed } from '@/lib/names'
import { scrub } from '@/lib/scrub'

// A player's idea for a new wardrobe piece, emailed to the maker.
// Privacy: only the idea and whether the lion is a lion or a lioness are accepted. No name,
// no account and nothing from the game. Contact details are scrubbed from the idea before it
// is sent, and nothing is stored here.

// Mail needs Node's network sockets.
export const runtime = 'nodejs'

const IDEA_MAX = 200
// On the maker's own computer the form works without a mailbox: the idea is printed in the
// terminal, so the form can be tried before mail is set up. A deployed site never does this.
const local = process.env.NODE_ENV !== 'production'

// Whether ideas can be sent at all. The wardrobe hides its form when they cannot.
export function GET() {
  return Response.json({ open: mailReady() || local })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'bad' }, { status: 400 })
  }
  const data = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  // One line of plain text: control characters and line breaks become spaces.
  const typed = typeof data.idea === 'string' ? data.idea.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim() : ''
  const lion = data.lion === 'female' ? 'lioness' : 'lion'
  if (!typed) return Response.json({ error: 'empty' }, { status: 400 })
  if (!isNameAllowed(typed)) return Response.json({ error: 'blocked' }, { status: 400 })
  if (!mailReady() && !local) return Response.json({ error: 'closed' }, { status: 503 })

  const limit = checkIdeaLimit(request)
  if (!limit.ok) return Response.json({ error: limit.reason }, { status: 429 })

  const idea = scrub(typed.slice(0, IDEA_MAX))
  if (!mailReady()) {
    console.log(`[suggest] No mailbox is set up, so nothing was sent. Idea for a ${lion}: ${idea}`)
  } else {
    try {
      await sendMail('RWR wardrobe idea', `${idea}\n\nFor a ${lion}.\nSent from the RWR wardrobe on ${new Date().toISOString().slice(0, 10)}.`)
    } catch {
      // The reason is not logged: it can name the mailbox.
      console.error('[suggest] The idea could not be mailed.')
      return Response.json({ error: 'failed' }, { status: 502 })
    }
  }
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': limit.cookie } })
}
