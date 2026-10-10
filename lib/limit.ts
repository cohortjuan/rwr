// Shares the free AI fairly. Server-side only: used by the AI route before it calls a provider.
//
// The AI provider's free tier is one small daily budget for every player together, so one
// visitor replaying levels could use up the day for everyone. Two guards, neither of which
// stores anything about a visitor:
//
// 1. A daily count kept in a cookie in the visitor's own browser. It holds a date and a number
//    and nothing else. Clearing cookies resets it, so it stops ordinary overuse, not someone
//    determined. A real per-person limit would need a database row per visitor, which this
//    game chooses not to keep.
// 2. A per-minute count per network address, held in this server's memory only. It catches a
//    script or a stuck loop. It is forgotten whenever the server restarts.
//
// When either trips, the game carries on from its scripted lines.

// A full playthrough is about 25 AI replies, so this allows two in a day with room to spare.
export const DAILY_REPLIES = 60
// Many players can share one address (a classroom, an office), so this is per minute only.
const PER_MINUTE = 20

const COOKIE = 'rwr_ai'
const MINUTE_MS = 60_000

export type Limit = { ok: true, cookie: string } | { ok: false, reason: 'daily' | 'busy' }

const recent = new Map<string, number[]>()

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// How many AI replies this browser has had today, from its cookie. Anything unreadable is 0.
function countToday(request: Request, cookie = COOKIE): number {
  const match = new RegExp(`(?:^|;\\s*)${cookie}=(\\d{4}-\\d{2}-\\d{2})\\.(\\d{1,4})(?:;|$)`).exec(request.headers.get('cookie') ?? '')
  return match && match[1] === today() ? Number(match[2]) : 0
}

function tooFast(address: string, now: number): boolean {
  const times = (recent.get(address) ?? []).filter((time) => now - time < MINUTE_MS)
  times.push(now)
  recent.set(address, times)
  // Addresses that have gone quiet are dropped so the list cannot grow without end.
  if (recent.size > 5000) {
    for (const [key, list] of recent) {
      if (list.every((time) => now - time >= MINUTE_MS)) recent.delete(key)
    }
  }
  return times.length > PER_MINUTE
}

// Call once per AI reply, before asking the provider. On success, send `cookie` back as a
// Set-Cookie header so the browser's count goes up by one.
export function checkLimit(request: Request): Limit {
  const address = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  if (tooFast(address, Date.now())) return { ok: false, reason: 'busy' }

  const count = countToday(request)
  if (count >= DAILY_REPLIES) return { ok: false, reason: 'daily' }

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return {
    ok: true,
    cookie: `${COOKIE}=${today()}.${count + 1}; Path=/api/todah; Max-Age=86400; HttpOnly; SameSite=Strict${secure}`,
  }
}

// Wardrobe ideas are emailed to the maker, so they are counted the same two ways, with their
// own cookie: a few per browser a day, and a handful per network address an hour. A third
// count, for everyone together, caps how much mail one bad day can send. It is held in this
// server's memory, so it is a ceiling per running server and not an exact total.
export const DAILY_IDEAS = 3
const IDEAS_PER_HOUR = 6
const IDEAS_PER_DAY_ALL = 60
const IDEA_COOKIE = 'rwr_idea'
const HOUR_MS = 3_600_000

const recentIdeas = new Map<string, number[]>()
let ideasDay = ''
let ideasToday = 0

// Call once per idea, before it is sent on. On success, send `cookie` back as a Set-Cookie
// header.
export function checkIdeaLimit(request: Request): Limit {
  const count = countToday(request, IDEA_COOKIE)
  if (count >= DAILY_IDEAS) return { ok: false, reason: 'daily' }

  if (ideasDay !== today()) {
    ideasDay = today()
    ideasToday = 0
  }
  if (ideasToday >= IDEAS_PER_DAY_ALL) return { ok: false, reason: 'daily' }

  const address = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const times = (recentIdeas.get(address) ?? []).filter((time) => now - time < HOUR_MS)
  if (times.length >= IDEAS_PER_HOUR) return { ok: false, reason: 'busy' }
  times.push(now)
  recentIdeas.set(address, times)
  if (recentIdeas.size > 5000) {
    for (const [key, list] of recentIdeas) {
      if (list.every((time) => now - time >= HOUR_MS)) recentIdeas.delete(key)
    }
  }
  ideasToday += 1

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return {
    ok: true,
    cookie: `${IDEA_COOKIE}=${today()}.${count + 1}; Path=/api/suggest; Max-Age=86400; HttpOnly; SameSite=Strict${secure}`,
  }
}
