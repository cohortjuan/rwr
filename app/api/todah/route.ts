import { circles } from '@/lib/compass'
import { checkLimit } from '@/lib/limit'
import { generateReply, LlmUnavailableError, type LlmMessage } from '@/lib/llm'
import type { EntryChoice } from '@/lib/lines'
import { LEVEL_ANSWERS, levels, liveLevels, type LiveLevel, type Phase } from '@/lib/levels'
import { factsFor, groupLines, groupOf, GROUPS_MOST, MORE_MARK, occupationLines, poolFor, POOL_WHOLE, type Occupation } from '@/lib/occupations'
import { readPayNow } from '@/lib/pay'
import type { Circle, PathIdea } from '@/lib/progress'
import { FIELD_MAX, readSchooling, type Schooling } from '@/lib/schooling'
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
  return levels[circles.indexOf(circle as Circle)]?.name
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
  for (const [index, circle] of circles.entries()) {
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

// How many seconds of a rate limit a call for the three paths will sit out. Longer than a
// reply in a talk gets, because there is no written line that can stand in for the paths.
const PATHS_PATIENCE = 20

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
function readPaths(
  text: string,
  offered: Occupation[],
  payNow: number | null,
  schooling: Schooling | null,
): { paths: PathIdea[], care: boolean } {
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
    paths.push({ kind, why, goal, ...factsFor(occupation, payNow, schooling) })
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
      .filter((step) => circles.includes(step.circle as Circle) && step.text)
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
  add('The plan they made for that (a plan only: you do not know whether they followed it)', body.plan, 200)
  let tried = 0
  for (const experiment of (Array.isArray(body.experiments) ? body.experiments : []).slice(0, 3)) {
    const entry = (typeof experiment === 'object' && experiment !== null ? experiment : {}) as Record<string, unknown>
    const step = readText(entry.step, 200)
    const note = readText(entry.note, 400)
    if (step && note) {
      rows.push(`An experiment they tried: "${step}". What they said happened: "${note}"`)
      tried += 1
    }
  }
  // Said outright, so the note does not make one up.
  if (tried === 0) rows.push('They did not tell you about any experiment they tried.')
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

// What every mode works from, read and checked once in POST before any AI reply is spent.
type Ask = {
  mode: TodahMode
  body: Record<string, unknown>
  incoming: IncomingMessage[]
  // The level the request is about, when it is about one that is built.
  phase: Phase | undefined
  // How many answers the player has given in this talk.
  answers: number
  // One line per circle with a claim (see claimRows). Full for the modes that need it.
  claims: Map<string, string>
  goal: string
  obstacle: string
  step: string
  report: string
  // Answers the browser with `data`, and with the cookie that counts this AI reply.
  sent: (data: Record<string, unknown>) => Response
}

const badRequest = () => Response.json({ error: 'bad_request' }, { status: 400 })

// The answer when the AI service is down or turned the call away. Only a surprise is logged,
// and never with the player's words.
function unavailable(error: unknown): Response {
  if (!(error instanceof LlmUnavailableError)) console.error('[api/todah] unexpected error')
  return Response.json({ error: 'unavailable' }, { status: 503 })
}

// The modes that need a claim in every circle, so a half-walked trail never reaches the AI.
const needsAllClaims: TodahMode[] = ['crossroads', 'paths', 'goal', 'road']

// What a request must carry for its mode. True when something is missing.
function missing(ask: Omit<Ask, 'sent'>): boolean {
  const { mode, phase, answers, claims, goal, obstacle, step, report, body } = ask
  // A level's interview and its summary both need a level that is built.
  if ((mode === 'interview' || mode === 'summary') && !phase) return true
  if (mode === 'summary' && answers === 0) return true
  if (needsAllClaims.includes(mode) && claims.size < circles.length) return true
  if (mode === 'road' && (!goal || !obstacle)) return true
  if ((mode === 'goal' || mode === 'letter') && !goal) return true
  if (mode === 'checkin' && (!step || !report || !circles.includes(body.circle as Circle))) return true
  return false
}

const fourCircles = (claims: Map<string, string>) => `The four circles:\n${[...claims.values()].join('\n')}`

// One reply from Todah to one message, for the modes that are not a talk.
async function oneReply(ask: Ask, text: string): Promise<Response> {
  try {
    const result = await generateReply(buildSystemPrompt({ mode: ask.mode, entryChoice: null }), [{ role: 'user', text }])
    return ask.sent({ reply: stripCompleteToken(result.text).reply, provider: result.provider })
  } catch (error) {
    return unavailable(error)
  }
}

// Todah's note: one message written from everything the player said along the way.
async function letter(ask: Ask): Promise<Response> {
  const trail = readTrail(ask.body)
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
        buildSystemPrompt({ mode: ask.mode, entryChoice: null }),
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
    return ask.sent({ reply: note, provider })
  } catch (error) {
    return unavailable(error)
  }
}

// The three paths. The game's own list of occupations is cut to those that pay a living and,
// if the player said what they make now, about that much or more. The model chooses from
// what is left, so it cannot name work that does not exist or that would pay them less, and
// it is never told the amount. A long list is narrowed first: the model picks a few groups,
// then chooses among the occupations in them. A reply that is not three whole paths is
// asked for once more.
//
// The AI service counts tokens by the minute, and these calls are the largest in the game.
// When it says to wait, the answer is "busy" with how long, and the groups already chosen,
// so the player's browser can wait and ask again without the first step being redone. If
// only the second try at the paths is turned away, the first answer is kept.
//
// If the player said what schooling they have finished, occupations that typically take
// more are marked in the list and the nearest path may not be one of them. The model sees
// the marks and what they studied, never the level. A set whose nearest path is marked is
// asked for once more, and kept if the second try is no better: the card then says so.
async function paths(ask: Ask): Promise<Response> {
  const { body, claims, sent } = ask
  const payNow = readPayNow(body.payNow)
  const schooling = readSchooling(body.schooling)
  const field = readText(body.field, FIELD_MAX)
  const circlesText = `${fourCircles(claims)}${field ? `\nThey have studied or trained in: "${field}"` : ''}`
  const pool = poolFor(payNow)
  // Groups chosen on an earlier try that was told to wait. Only codes in the pool count.
  const inPool = new Set(pool.map(groupOf))
  let groups = (Array.isArray(body.groups) ? body.groups : []).map((code) => String(code)).filter((code) => inPool.has(code)).slice(0, GROUPS_MOST)
  let answer: ReturnType<typeof readPaths> = { paths: [], care: false }
  let provider = ''
  try {
    let offered = pool
    if (pool.length > POOL_WHOLE) {
      if (groups.length === 0) {
        const picked = await generateReply(pathGroupsPrompt(groupLines(pool), GROUPS_MOST), [{ role: 'user', text: circlesText }], {
          maxTokens: 1500,
          effort: 'low',
          patience: PATHS_PATIENCE,
        })
        const chosen = readGroups(picked.text, pool)
        if (chosen.care) return sent({ paths: [], care: true, provider: picked.provider })
        if (chosen.groups.length === 0) return sent({ paths: [], care: false, provider: picked.provider })
        groups = chosen.groups
      }
      offered = pool.filter((occupation) => groups.includes(groupOf(occupation)))
    }
    const system = pathsPrompt(occupationLines(offered, schooling), schooling ? MORE_MARK : null)
    // What was wrong with the first answer, said to the model when it is asked again.
    let again = ''
    for (let attempt = 0; attempt < 2; attempt += 1) {
      // Medium thinking: on low it reached for the nearest job title, not the step up.
      const result = await generateReply(system, [{ role: 'user', text: circlesText + again }], {
        maxTokens: 3000,
        effort: 'medium',
        patience: PATHS_PATIENCE,
      })
      const read = readPaths(result.text, offered, payNow, schooling)
      provider = result.provider
      if (read.paths.length === 0 && !read.care) {
        again = '\nAn earlier answer was not three different occupations from the list, one of each kind. Copy each code exactly.'
        continue
      }
      answer = read
      // The nearest path comes first. Done unless it reaches past their schooling.
      if (read.care || !read.paths[0].more) break
      again = `\nAn earlier answer chose ${read.paths[0].code} ${read.paths[0].name} for "near". Its line ends with ${MORE_MARK}, so it is not allowed there. Choose a "near" whose line has no ${MORE_MARK}.`
    }
    return sent({ ...answer, provider })
  } catch (error) {
    // A whole answer in hand is better than none: only its second try was turned away.
    if (answer.paths.length > 0) return sent({ ...answer, provider })
    if (error instanceof LlmUnavailableError && error.retryAfter) {
      return Response.json({ error: 'busy', retryAfter: Math.ceil(error.retryAfter), groups }, { status: 429 })
    }
    return unavailable(error)
  }
}

// The road is a form filled in from the goal, the obstacle, and the four claims.
async function road(ask: Ask): Promise<Response> {
  try {
    const result = await generateReply(buildSystemPrompt({ mode: ask.mode, entryChoice: null }), [
      { role: 'user', text: `Goal: "${ask.goal}"\nObstacle they expect: "${ask.obstacle}"\n${fourCircles(ask.claims)}` },
    ])
    return ask.sent({ ...readRoad(result.text), provider: result.provider })
  } catch (error) {
    return unavailable(error)
  }
}

// A check-in is one reply to how an experiment went.
function checkin(ask: Ask): Promise<Response> {
  const level = levels[circles.indexOf(ask.body.circle as Circle)]
  return oneReply(
    ask,
    `The experiment: "${ask.step}"\nIt was testing: ${level.name} (${level.circle})\nTheir goal: "${ask.goal || 'not said'}"\nWhat they say happened: "${ask.report}"`,
  )
}

// The system prompt for a talk (Quest 1, a level, help) and for a level's summary.
function talkPrompt(ask: Ask): string {
  const { mode, body, phase, answers } = ask
  return buildSystemPrompt({
    mode,
    entryChoice: entryChoices.includes(body.entryChoice as EntryChoice) ? (body.entryChoice as EntryChoice) : null,
    phase,
    answers,
    memory: mode === 'interview' ? readMemory(body, body.circle) : undefined,
  })
}

// The summary reads the whole talk as one piece of text, so the AI fills in a form about it
// instead of carrying the conversation on.
async function summary(ask: Ask): Promise<Response> {
  const transcript = ask.incoming
    .map((message) => (message.role === 'user' ? `Player: ${scrub(message.text)}` : `Guide: ${message.text}`))
    .join('\n')
  try {
    const result = await generateReply(talkPrompt(ask), [{ role: 'user', text: `The interview:\n${transcript}` }])
    return ask.sent({ ...readSummary(result.text, ask.phase as Phase), provider: result.provider })
  } catch (error) {
    return unavailable(error)
  }
}

// A talk: Quest 1, a level's interview, or help. Todah answers the latest message.
async function talk(ask: Ask): Promise<Response> {
  const { mode, answers } = ask
  const messages: LlmMessage[] = ask.incoming.map((message) => ({
    role: message.role === 'todah' ? 'assistant' : 'user',
    text: message.role === 'user' ? scrub(message.text) : message.text,
  }))
  // Providers expect the conversation to open with a user turn.
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', text: '(The player is ready. Begin.)' })
  }
  try {
    const result = await generateReply(talkPrompt(ask), messages)
    const { reply, complete } = stripCompleteToken(result.text)
    // A level always runs its full length, so the map gets every kind of evidence asked about.
    const done =
      mode === 'interview' ? answers >= LEVEL_ANSWERS : complete || (mode === 'onboarding' && answers >= ONBOARDING_ANSWERS)
    return ask.sent({ reply, complete: done, provider: result.provider })
  } catch (error) {
    return unavailable(error)
  }
}

// Which function answers each mode.
const handlers: Record<TodahMode, (ask: Ask) => Promise<Response>> = {
  onboarding: talk,
  interview: talk,
  help: talk,
  summary,
  // The Crossroads is one message about the four claims, with no chat behind it.
  crossroads: (ask) => oneReply(ask, fourCircles(ask.claims)),
  paths,
  // Todah's thoughts on the goal are one message about it and the four claims.
  goal: (ask) => oneReply(ask, `Their main goal: "${ask.goal}"\n${fourCircles(ask.claims)}`),
  road,
  checkin,
  letter,
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: 'forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest()
  }

  const mode = body.mode as TodahMode
  if (!modes.includes(mode)) return badRequest()

  const incoming = Array.isArray(body.messages) ? body.messages : []
  if (!incoming.every(isIncomingMessage)) return badRequest()
  if (incoming.length >= SESSION_MESSAGE_CAP) return Response.json({ error: 'cap' }, { status: 429 })

  const ask = {
    mode,
    body,
    incoming,
    phase: phaseOf(body.circle),
    answers: incoming.filter((message) => message.role === 'user').length,
    claims: needsAllClaims.includes(mode) ? claimRows(body.claims) : new Map<string, string>(),
    goal: readText(body.goal, 200),
    obstacle: readText(body.obstacle, 300),
    step: readText(body.step, 200),
    report: readText(body.note, MAX_TEXT_LENGTH),
  }
  if (missing(ask)) return badRequest()

  // Everything above is free. From here an AI reply is spent, so the visitor's share is checked.
  const limit = checkLimit(request)
  if (!limit.ok) return Response.json({ error: limit.reason }, { status: 429 })
  const sent = (data: Record<string, unknown>) => Response.json(data, { headers: { 'Set-Cookie': limit.cookie } })

  return handlers[mode]({ ...ask, sent })
}
