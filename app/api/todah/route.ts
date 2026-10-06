import { generateReply, LlmUnavailableError, type LlmMessage } from '@/lib/llm'
import type { EntryChoice } from '@/lib/lines'
import { buildSystemPrompt, COMPLETE_TOKENS, type Phase, type TodahMode } from '@/lib/prompts'

// The only place the app talks to an LLM. Keys stay on the server.

const SESSION_MESSAGE_CAP = 30
const MAX_TEXT_LENGTH = 1000
const MAX_NAME_LENGTH = 40
// Onboarding is a warm-up question plus two follow-ups, so three answers end it.
const ONBOARDING_ANSWERS = 3

const modes: TodahMode[] = ['onboarding', 'interview', 'help']
const phases: Phase[] = ['Passion', 'Vocation', 'Mission', 'Profession', 'Crossroads']
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

// Names go into the system prompt, so keep them short and free of quotes and line breaks.
function cleanName(value: unknown): string {
  if (typeof value !== 'string') return 'traveler'
  const name = value.replace(/["\n\r\\]/g, ' ').trim().slice(0, MAX_NAME_LENGTH)
  return name || 'traveler'
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

export async function POST(request: Request) {
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

  const system = buildSystemPrompt({
    mode,
    playerName: cleanName(body.playerName),
    entryChoice: entryChoices.includes(body.entryChoice as EntryChoice) ? (body.entryChoice as EntryChoice) : null,
    phase: phases.includes(body.phase as Phase) ? (body.phase as Phase) : undefined,
  })

  const messages: LlmMessage[] = (incoming as IncomingMessage[]).map((message) => ({
    role: message.role === 'todah' ? 'assistant' : 'user',
    text: message.text,
  }))
  // Providers expect the conversation to open with a user turn.
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', text: '(The player is ready. Begin.)' })
  }

  try {
    const result = await generateReply(system, messages)
    const { reply, complete } = stripCompleteToken(result.text)
    const answers = incoming.filter((message) => message.role === 'user').length
    const done = complete || (mode === 'onboarding' && answers >= ONBOARDING_ANSWERS)
    return Response.json({ reply, complete: done, provider: result.provider })
  } catch (error) {
    if (error instanceof LlmUnavailableError) return Response.json({ error: 'unavailable' }, { status: 503 })
    console.error('[api/todah] unexpected error')
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
