import { checkLimit } from '@/lib/limit'
import { generateReply, LlmUnavailableError, type LlmMessage } from '@/lib/llm'
import type { EntryChoice } from '@/lib/lines'
import { LEVEL_ANSWERS, levels, liveLevels, type LiveLevel, type Phase } from '@/lib/levels'
import { factsFor, groupLines, groupOf, GROUPS_MOST, occupationLines, poolFor, POOL_WHOLE, type Occupation } from '@/lib/occupations'
import { readPayNow } from '@/lib/pay'
import type { PathIdea } from '@/lib/progress'
import { buildSystemPrompt, COMPLETE_TOKENS, levelBriefs, pathGroupsPrompt, pathsPrompt, type TodahMode } from '@/lib/prompts'
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

const modes: TodahMode[] = ['onboarding', 'interview', 'summary', 'crossroads', 'paths', 'goal', 'road', 'checkin', 'letter', 'help']
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
  // A friend's witness: what someone who knows the player said they would come to them for.
  for (const said of (Array.isArray(body.witness) ? body.witness : []).slice(0, 2)) {
    const text = readText(said, 200)
    if (text) lines.push(`Someone who knows them said they would come to them for: "${text}"`)
  }
  return lines.length > 0 ? lines.join('\n') : undefined
}

// A short piece of the player's own text sent outside a chat (a goal, an obstacle, a report):
// scrubbed, trimmed to `max`, and empty unless it really is text.
function readText(value: unknown, max: number): string {
  return typeof value === 'string' ? scrub(value).trim().slice(0, max) : ''
}

// The model's answers about the three paths come back as JSON. `readForm` finds the object in
// a reply, whatever was written around it.
const pathKinds: PathIdea['kind'][] = ['near', 'next', 'wild']

function readForm(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const form: unknown = JSON.parse(text.slice(start, end + 1))
    return typeof form === 'object' && form !== null ? (form as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// Which groups of occupations to look in: only codes that were offered, and no more than asked
// for. Anything else is dropped.
function readGroups(text: string, pool: Occupation[]): { groups: string[], care: boolean } {
  const form = readForm(text)
  if (!form) return { groups: [], care: false }
  if (form.care === true) return { groups: [], care: true }
  const offered = new Set(pool.map(groupOf))
  const groups = (Array.isArray(form.groups) ? form.groups : []).map((code) => String(code).trim()).filter((code) => offered.has(code))
  return { groups: [...new Set(groups)].slice(0, GROUPS_MOST), care: false }
}

// The three paths: exactly one of each kind, each a different occupation that was on the list
// the model was given. The model supplies the code and two sentences. The name, the pay and
// everything else on the card come from the list. Anything short of three whole paths is
// dropped, so a confused reply shows the player no paths at all rather than a broken set.
function readPaths(text: string, offered: Occupation[], payNow: number | null): { paths: PathIdea[], care: boolean } {
  const empty = { paths: [], care: false }
  const form = readForm(text)
  if (!form) return empty
  if (form.care === true) return { paths: [], care: true }
  const paths: PathIdea[] = []
  for (const kind of pathKinds) {
    const entry = (Array.isArray(form.paths) ? form.paths : []).find(
      (path: unknown) => typeof path === 'object' && path !== null && (path as Record<string, unknown>).kind === kind,
    ) as Record<string, unknown> | undefined
    const occupation = offered.find((one) => one.code === String(entry?.code ?? '').trim())
    const why = readText(entry?.why, 220)
    const goal = readText(entry?.goal, 160)
    if (!occupation || !why || !goal || paths.some((path) => path.code === occupation.code)) return empty
    paths.push({ kind, why, goal, ...factsFor(occupation, payNow) })
  }
  return { paths, care: false }
}

// The road plan comes back as JSON. As with the summary, anything that is not exactly what was
// asked for is dropped, so a confused reply leaves the player an empty form to fill in.
function readRoad(text: string): { plan: string, steps: { circle: string, text: string }[], care: boolean } {
  const empty = { plan: '', steps: [], care: false }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return empty
  try {
    const form: unknown = JSON.parse(text.slice(start, end + 1))
    if (typeof form !== 'object' || form === null) return empty
    const fields = form as Record<string, unknown>
    const steps = (Array.isArray(fields.steps) ? fields.steps : [])
      .map((step: unknown) => {
        const entry = (typeof step === 'object' && step !== null ? step : {}) as Record<string, unknown>
        return { circle: String(entry.circle ?? ''), text: readText(entry.text, 200) }
      })
      .filter((step) => circleOrder.includes(step.circle) && step.text)
      .slice(0, 3)
    // `care` means the player's words showed distress, and the game should stop and say so.
    if (fields.care === true) return { ...empty, care: true }
    return { plan: readText(fields.plan, 200), steps, care: false }
  } catch {
    return empty
  }
}

// Everything the letter is made from, as labelled lines in the order it happened. Each piece
// is the player's own text, scrubbed and trimmed, and a piece that is missing is left out.
function readTrail(body: Record<string, unknown>): string {
  const rows: string[] = []
  const add = (label: string, value: unknown, max = 300) => {
    const text = readText(value, max)
    if (text) rows.push(`${label}: "${text}"`)
  }
  add('In the warm-up quest, about a recent good day', body.warmup)
  rows.push(...claimRows(body.claims).values())
  for (const said of (Array.isArray(body.witness) ? body.witness : []).slice(0, 2)) {
    add('Someone who knows them said they would come to them for', said, 200)
  }
  add('The goal they set', body.goal, 200)
  add('What they said would get in the way', body.obstacle)
  add('Their plan for that', body.plan, 200)
  for (const tried of (Array.isArray(body.experiments) ? body.experiments : []).slice(0, 3)) {
    const entry = (typeof tried === 'object' && tried !== null ? tried : {}) as Record<string, unknown>
    const step = readText(entry.step, 200)
    const note = readText(entry.note, 400)
    if (step && note) rows.push(`An experiment they tried: "${step}". What they said happened: "${note}"`)
  }
  rows.push('They have now told you the goal is reached.')
  return rows.join('\n')
}

const plain = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ')

// The note quotes the player. A quote that is not really theirs loses its quotation marks, so
// nothing is ever presented as the player's words unless they wrote it.
function keepRealQuotes(note: string, trail: string): string {
  const said = plain(trail)
  return note.replace(/[“"]([^“”"]{2,300})[”"]/g, (whole, quote: string) => {
    const words = plain(quote).replace(/[.,!?;:]+$/, '').trim()
    return words && said.includes(words) ? whole : quote
  })
}

// A note left on a table is short, and it borrows the player's phrases, not their paragraphs.
const NOTE_WORDS_MAX = 135
const QUOTE_WORDS_MAX = 12
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length

function noteFits(note: string): boolean {
  const quotes = [...note.matchAll(/[“"]([^“”"]{2,300})[”"]/g)]
  return wordCount(note) <= NOTE_WORDS_MAX && quotes.every((quote) => wordCount(quote[1]) <= QUOTE_WORDS_MAX)
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
  // The Crossroads and the road need a claim in every circle, so a half-walked trail never
  // reaches the AI.
  const crossroads = mode === 'crossroads' || mode === 'paths' || mode === 'goal' || mode === 'road' ? claimRows(body.claims) : null
  if (crossroads && crossroads.size < circleOrder.length) return Response.json({ error: 'bad_request' }, { status: 400 })
  const goal = readText(body.goal, 200)
  const obstacle = readText(body.obstacle, 300)
  const step = readText(body.step, 200)
  const report = readText(body.note, MAX_TEXT_LENGTH)
  if (mode === 'road' && (!goal || !obstacle)) return Response.json({ error: 'bad_request' }, { status: 400 })
  if (mode === 'goal' && !goal) return Response.json({ error: 'bad_request' }, { status: 400 })
  if (mode === 'letter' && !goal) return Response.json({ error: 'bad_request' }, { status: 400 })
  if (mode === 'checkin' && (!step || !report || !circleOrder.includes(String(body.circle)))) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  // Everything above is free. From here an AI reply is spent, so the visitor's share is checked.
  const limit = checkLimit(request)
  if (!limit.ok) return Response.json({ error: limit.reason }, { status: 429 })
  const sent = (data: Record<string, unknown>) => Response.json(data, { headers: { 'Set-Cookie': limit.cookie } })

  // The letter is one message written from everything the player said along the way.
  if (mode === 'letter') {
    const trail = readTrail(body)
    try {
      // The longest thing Todah writes, so it gets more room than a reply does. The model is
      // told to think only a little first: asked to think harder, it has spent the whole
      // allowance on thinking and written nothing. Thinking lightly, it sometimes runs long or
      // quotes whole sentences, so a note that does not fit is written once more and the
      // better of the two is kept.
      let note = ''
      let provider = ''
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await generateReply(
          buildSystemPrompt({ mode, entryChoice: null }),
          [{ role: 'user', text: `What they said along the way:\n${trail}` }],
          { maxTokens: 1500, effort: 'low' },
        )
        const written = keepRealQuotes(stripCompleteToken(result.text).reply, trail).slice(0, 1200)
        provider = result.provider
        if (!note || written.length < note.length) note = written
        if (noteFits(written)) {
          note = written
          break
        }
      }
      return sent({ reply: note, provider })
    } catch (error) {
      if (!(error instanceof LlmUnavailableError)) console.error('[api/todah] unexpected error')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // The three paths. The game's own list of occupations is cut to those that pay a living and,
  // if the player said what they make now, about that much or more. The model chooses from
  // what is left, so it cannot name work that does not exist or that would pay them less, and
  // it is never told the amount. A long list is narrowed first: the model picks a few groups,
  // then chooses among the occupations in them. A reply that is not three whole paths is
  // asked for once more.
  if (mode === 'paths' && crossroads) {
    const payNow = readPayNow(body.payNow)
    const circlesText = `The four circles:\n${[...crossroads.values()].join('\n')}`
    const pool = poolFor(payNow)
    try {
      let offered = pool
      if (pool.length > POOL_WHOLE) {
        const picked = await generateReply(pathGroupsPrompt(groupLines(pool), GROUPS_MOST), [{ role: 'user', text: circlesText }], {
          maxTokens: 1500,
          effort: 'low',
        })
        const chosen = readGroups(picked.text, pool)
        if (chosen.care) return sent({ paths: [], care: true, provider: picked.provider })
        if (chosen.groups.length === 0) return sent({ paths: [], care: false, provider: picked.provider })
        offered = pool.filter((occupation) => chosen.groups.includes(groupOf(occupation)))
      }
      const system = pathsPrompt(occupationLines(offered))
      let answer: ReturnType<typeof readPaths> = { paths: [], care: false }
      let provider = ''
      for (let attempt = 0; attempt < 2 && answer.paths.length === 0 && !answer.care; attempt += 1) {
        // Medium thinking: on low it reached for the nearest job title, not the step up.
        const result = await generateReply(system, [{ role: 'user', text: circlesText }], { maxTokens: 3000, effort: 'medium' })
        answer = readPaths(result.text, offered, payNow)
        provider = result.provider
      }
      return sent({ ...answer, provider })
    } catch (error) {
      if (!(error instanceof LlmUnavailableError)) console.error('[api/todah] unexpected error')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // Todah's thoughts on the goal are one message about it and the four claims.
  if (mode === 'goal' && crossroads) {
    try {
      const result = await generateReply(buildSystemPrompt({ mode, entryChoice: null }), [
        { role: 'user', text: `Their main goal: "${goal}"\nThe four circles:\n${[...crossroads.values()].join('\n')}` },
      ])
      return sent({ reply: stripCompleteToken(result.text).reply, provider: result.provider })
    } catch (error) {
      if (!(error instanceof LlmUnavailableError)) console.error('[api/todah] unexpected error')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // The road is a form filled in from the goal, the obstacle, and the four claims.
  if (mode === 'road' && crossroads) {
    try {
      const result = await generateReply(buildSystemPrompt({ mode, entryChoice: null }), [
        {
          role: 'user',
          text: `Goal: "${goal}"\nObstacle they expect: "${obstacle}"\nThe four circles:\n${[...crossroads.values()].join('\n')}`,
        },
      ])
      return sent({ ...readRoad(result.text), provider: result.provider })
    } catch (error) {
      if (!(error instanceof LlmUnavailableError)) console.error('[api/todah] unexpected error')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // A check-in is one reply to how an experiment went.
  if (mode === 'checkin') {
    const level = levels[circleOrder.indexOf(String(body.circle))]
    try {
      const result = await generateReply(buildSystemPrompt({ mode, entryChoice: null }), [
        {
          role: 'user',
          text: `The experiment: "${step}"\nIt was testing: ${level.name} (${level.circle})\nTheir goal: "${goal || 'not said'}"\nWhat they say happened: "${report}"`,
        },
      ])
      return sent({ reply: stripCompleteToken(result.text).reply, provider: result.provider })
    } catch (error) {
      if (!(error instanceof LlmUnavailableError)) console.error('[api/todah] unexpected error')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

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
