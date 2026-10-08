import { checkLimit } from '@/lib/limit'
import { generateReply, LlmUnavailableError, type LlmMessage } from '@/lib/llm'
import type { EntryChoice } from '@/lib/lines'
import { LEVEL_ANSWERS, levels, liveLevels, type LiveLevel, type Phase } from '@/lib/levels'
import { buildSystemPrompt, COMPLETE_TOKENS, levelBriefs, type TodahMode } from '@/lib/prompts'
import { scrub } from '@/lib/scrub'

// The only place the app talks to an LLM. Keys stay on the server.
// Privacy: the player's name is never accepted here, contact details are scrubbed from
// answers before they are sent on, and nothing a player types is logged or stored.

const SESSION_MESSAGE_CAP = 30
const MAX_TEXT_LENGTH = 1000
// Onboarding is a warm-up question plus two follow-ups, so three answers end it.
const ONBOARDING_ANSWERS = 3

// The most a claim written by the AI may run to before the player edits it.
const CLAIM_MAX = 160

const modes: TodahMode[] = ['onboarding', 'interview', 'summary', 'crossroads', 'help']
const circleOrder = ['heart', 'craft', 'cause', 'coin']
const entryChoices: EntryChoice[] = ['starting', 'changing', 'stuck', 'curious']

type IncomingMessage = { role: 'user' | 'todah', text: string }

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  return (
    (message.role === 'user' || message.role === 'todah') &&
    typeof message.text === 'string' &&
    message.text.trim().length > 0 &&
    message.text.length <= MAX_TEXT_LENGTH
  )
}

function stripCompleteToken(text: string): { reply: string, complete: boolean } {
  let reply = text
  let complete = false
  for (const token of COMPLETE_TOKENS) {
    if (reply.includes(token)) {
      complete = true
      reply = reply.split(token).join('')
    }
  }
  return { reply: reply.trim(), complete }
}

// The level a circle belongs to, or undefined when that level's interview is not built yet.
function phaseOf(circle: unknown): Phase | undefined {
  if (!liveLevels.includes(circle as LiveLevel)) return undefined
  return levels[circleOrder.indexOf(circle as string)]?.name
}

// The summary comes back as JSON. Anything that is not exactly what was asked for is dropped,
// so a confused reply can only ever produce an empty form for the player to fill in.
function readSummary(text: string, phase: Phase): { claim: string, evidence: string[] } {
  const empty = { claim: '', evidence: [] }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return empty
  try {
    const form: unknown = JSON.parse(text.slice(start, end + 1))
    if (typeof form !== 'object' || form === null) return empty
    const fields = form as Record<string, unknown>
    const claim = typeof fields.claim === 'string' ? scrub(fields.claim).trim().slice(0, CLAIM_MAX) : ''
    if (!claim) return empty
    const evidence = Object.keys(levelBriefs[phase]?.evidence ?? {}).filter((key) => fields[key] === true)
    return { claim, evidence }
  } catch {
    return empty
  }
}

// The claims a player has on the trail map, as one plain line per circle that has one.
// Nothing sent is trusted: each claim is scrubbed and trimmed, and each count is clamped.
function claimRows(value: unknown): Map<string, string> {
  const rows = new Map<string, string>()
  if (typeof value !== 'object' || value === null) return rows
  const claims = value as Record<string, unknown>
  for (const [index, circle] of circleOrder.entries()) {
    const entry = claims[circle] as { claim?: unknown, evidence?: unknown } | undefined
    if (!entry || typeof entry.claim !== 'string') continue
    const claim = scrub(entry.claim).trim().slice(0, 300)
    if (!claim) continue
    const evidence = typeof entry.evidence === 'number' ? Math.max(0, Math.min(3, Math.floor(entry.evidence))) : 0
    rows.set(circle, `${levels[index].name} (${levels[index].circle}): "${claim}". Evidence: ${evidence} of 3.`)
  }
  return rows
}

// What Todah remembers going into a level: the claims from the other circles, and for the
// first level, what the player said in the warm-up quest.
function readMemory(body: Record<string, unknown>, circle: unknown): string | undefined {
  const rows = claimRows(body.claims)
  rows.delete(String(circle))
  const lines = [...rows.values()]
  if (typeof body.warmup === 'string' && body.warmup.trim()) {
    lines.unshift(`In the warm-up quest, about a recent good day: "${scrub(body.warmup).trim().slice(0, 300)}"`)
  }
  return lines.length > 0 ? lines.join('\n') : undefined
}

// Only the game's own pages may call this route. It is not a full defence (headers can be
// forged outside a browser), but it stops other websites from spending the AI quota.
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === request.headers.get('host')
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: 'forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  const mode = body.mode as TodahMode
  if (!modes.includes(mode)) return Response.json({ error: 'bad_request' }, { status: 400 })

  const incoming = Array.isArray(body.messages) ? body.messages : []
  if (!incoming.every(isIncomingMessage)) return Response.json({ error: 'bad_request' }, { status: 400 })
  if (incoming.length >= SESSION_MESSAGE_CAP) return Response.json({ error: 'cap' }, { status: 429 })

  const phase = phaseOf(body.circle)
  const answers = incoming.filter((message) => message.role === 'user').length
  // A level's interview and its summary both need a level that is built.
  if ((mode === 'interview' || mode === 'summary') && !phase) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (mode === 'summary' && answers === 0) return Response.json({ error: 'bad_request' }, { status: 400 })
  // The Crossroads needs a claim in every circle, so a half-walked trail never reaches the AI.
  const crossroads = mode === 'crossroads' ? claimRows(body.claims) : null
  if (crossroads && crossroads.size < circleOrder.length) return Response.json({ error: 'bad_request' }, { status: 400 })

  // Everything above is free. From here an AI reply is spent, so the visitor's share is checked.
  const limit = checkLimit(request)
  if (!limit.ok) return Response.json({ error: limit.reason }, { status: 429 })
  const sent = (data: Record<string, unknown>) => Response.json(data, { headers: { 'Set-Cookie': limit.cookie } })

  // The Crossroads is one message about the four claims, with no chat behind it.
  if (crossroads) {
    try {
      const result = await generateReply(buildSystemPrompt({ mode, entryChoice: null }), [
        { role: 'user', text: `The four circles:\n${[...crossroads.values()].join('\n')}` },
      ])
      return sent({ reply: stripCompleteToken(result.text).reply, provider: result.provider })
    } catch (error) {
      if (!(error instanceof LlmUnavailableError)) console.error('[api/todah] unexpected error')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  const system = buildSystemPrompt({
    mode,
    entryChoice: entryChoices.includes(body.entryChoice as EntryChoice) ? (body.entryChoice as EntryChoice) : null,
    phase,
    answers,
    memory: mode === 'interview' ? readMemory(body, body.circle) : undefined,
  })

  // The summary reads the whole talk as one piece of text, so the AI fills in a form about it
  // instead of carrying the conversation on.
  if (mode === 'summary' && phase) {
    const transcript = (incoming as IncomingMessage[])
      .map((message) => (message.role === 'user' ? `Player: ${scrub(message.text)}` : `Guide: ${message.text}`))
      .join('\n')
    try {
      const result = await generateReply(system, [{ role: 'user', text: `The interview:\n${transcript}` }])
      return sent({ ...readSummary(result.text, phase), provider: result.provider })
    } catch (error) {
      if (!(error instanceof LlmUnavailableError)) console.error('[api/todah] unexpected error')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  const messages: LlmMessage[] = (incoming as IncomingMessage[]).map((message) => ({
    role: message.role === 'todah' ? 'assistant' : 'user',
    text: message.role === 'user' ? scrub(message.text) : message.text,
  }))
  // Providers expect the conversation to open with a user turn.
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', text: '(The player is ready. Begin.)' })
  }

  try {
    const result = await generateReply(system, messages)
    const { reply, complete } = stripCompleteToken(result.text)
    // A level always runs its full length, so the map gets every kind of evidence asked about.
    const done =
      mode === 'interview' ? answers >= LEVEL_ANSWERS : complete || (mode === 'onboarding' && answers >= ONBOARDING_ANSWERS)
    return sent({ reply, complete: done, provider: result.provider })
  } catch (error) {
    if (error instanceof LlmUnavailableError) return Response.json({ error: 'unavailable' }, { status: 503 })
    console.error('[api/todah] unexpected error')
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
