// Server-side LLM access. Import this only from server routes: it reads secret keys.
// Primary: Groq. Its terms bar training on inputs, and Zero Data Retention can be switched on.
// Optional fallback: Google Gemini, used only when GEMINI_FALLBACK=on and Groq is rate limited
// (HTTP 429), down (5xx), or unreachable. It is off by default because Google's free tier
// terms say not to submit personal information and allow human review of prompts.

export type LlmMessage = { role: 'user' | 'assistant', text: string }

export type LlmResult = { text: string, provider: 'gemini' | 'groq' }

// Per-call settings. `maxTokens` is the room for the reply. The Groq model thinks before it
// writes and that thinking comes out of the same room, so a long piece of writing needs more
// of it, and `effort` says how much thinking to do first.
export type LlmOptions = { maxTokens?: number, effort?: 'low' | 'medium' | 'high' }

export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmUnavailableError'
  }
}

class ProviderError extends Error {
  status: number

  constructor(provider: string, status: number) {
    super(`${provider} responded with HTTP ${status}`)
    this.name = 'ProviderError'
    this.status = status
  }
}

const TIMEOUT_MS = 20000
const MAX_OUTPUT_TOKENS = 1024
const TEMPERATURE = 0.7

// Model names change. Set GEMINI_MODEL and GROQ_MODEL in .env.local to whatever your own
// AI Studio and Groq consoles list as free-tier models today.
const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest'
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'

async function callGemini(system: string, messages: LlmMessage[], apiKey: string, options: LlmOptions): Promise<string> {
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.text }],
      })),
      generationConfig: { maxOutputTokens: options.maxTokens ?? MAX_OUTPUT_TOKENS, temperature: TEMPERATURE },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new ProviderError('Gemini', response.status)
  const data = await response.json()
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? []
  const text = parts.map((part) => part.text ?? '').join('').trim()
  if (!text) throw new ProviderError('Gemini', 502)
  return text
}

async function callGroq(system: string, messages: LlmMessage[], apiKey: string, options: LlmOptions): Promise<string> {
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        ...messages.map((message) => ({ role: message.role, content: message.text })),
      ],
      max_tokens: options.maxTokens ?? MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      ...(options.effort ? { reasoning_effort: options.effort } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new ProviderError('Groq', response.status)
  const data = await response.json()
  // Token counts only, to watch the daily budget. Never prompts or answers.
  if (data?.usage) console.info(`[llm] Groq tokens: ${data.usage.prompt_tokens} in, ${data.usage.completion_tokens} out`)
  const text = String(data?.choices?.[0]?.message?.content ?? '').trim()
  if (!text) throw new ProviderError('Groq', 502)
  return text
}

// A Groq failure is worth retrying on Gemini when it is a rate limit, a server error,
// or a network problem or timeout. Bad requests (4xx) are our bug and should surface.
function shouldFallBack(error: unknown): boolean {
  if (error instanceof ProviderError) return error.status === 429 || error.status >= 500
  return true
}

// Placeholder values copied from .env.local.example count as "not set".
function readKey(name: string): string | undefined {
  const value = process.env[name]?.trim()
  if (!value || value.startsWith('your-')) return undefined
  return value
}

export async function generateReply(system: string, messages: LlmMessage[], options: LlmOptions = {}): Promise<LlmResult> {
  const groqKey = readKey('GROQ_API_KEY')
  const geminiKey = process.env.GEMINI_FALLBACK === 'on' ? readKey('GEMINI_API_KEY') : undefined
  if (!groqKey && !geminiKey) throw new LlmUnavailableError('No LLM API key is set')

  if (groqKey) {
    try {
      try {
        return { text: await callGroq(system, messages, groqKey, options), provider: 'groq' }
      } catch (error) {
        // A server error or an empty reply is usually a blip, so it gets one more try.
        // A rate limit does not: asking again at once only makes it worse.
        if (!(error instanceof ProviderError) || error.status < 500) throw error
        console.warn('[llm] Groq failed once, trying again:', error.message)
        return { text: await callGroq(system, messages, groqKey, options), provider: 'groq' }
      }
    } catch (error) {
      // Log the status only. Never log keys, prompts, or player answers.
      console.warn('[llm] Groq failed:', error instanceof Error ? error.message : 'unknown error')
      if (!geminiKey || !shouldFallBack(error)) throw new LlmUnavailableError('Groq failed and no fallback applied')
    }
  }

  try {
    return { text: await callGemini(system, messages, geminiKey as string, options), provider: 'gemini' }
  } catch (error) {
    console.warn('[llm] Gemini failed:', error instanceof Error ? error.message : 'unknown error')
    throw new LlmUnavailableError('All LLM providers failed')
  }
}
