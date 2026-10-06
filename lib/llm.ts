// Server-side LLM access. Import this only from server routes: it reads secret keys.
// Primary: Google Gemini (AI Studio key). Fallback: Groq, used when Gemini is rate limited
// (HTTP 429), down (5xx), unreachable, or has no key set.

export type LlmMessage = { role: 'user' | 'assistant', text: string }

export type LlmResult = { text: string, provider: 'gemini' | 'groq' }

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
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'

async function callGemini(system: string, messages: LlmMessage[], apiKey: string): Promise<string> {
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
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: TEMPERATURE },
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

async function callGroq(system: string, messages: LlmMessage[], apiKey: string): Promise<string> {
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
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new ProviderError('Groq', response.status)
  const data = await response.json()
  const text = String(data?.choices?.[0]?.message?.content ?? '').trim()
  if (!text) throw new ProviderError('Groq', 502)
  return text
}

// A Gemini failure is worth retrying on Groq when it is a rate limit, a server error,
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

export async function generateReply(system: string, messages: LlmMessage[]): Promise<LlmResult> {
  const geminiKey = readKey('GEMINI_API_KEY')
  const groqKey = readKey('GROQ_API_KEY')
  if (!geminiKey && !groqKey) throw new LlmUnavailableError('No LLM API key is set')

  if (geminiKey) {
    try {
      return { text: await callGemini(system, messages, geminiKey), provider: 'gemini' }
    } catch (error) {
      // Log the status only. Never log keys, prompts, or player answers.
      console.warn('[llm] Gemini failed:', error instanceof Error ? error.message : 'unknown error')
      if (!groqKey || !shouldFallBack(error)) throw new LlmUnavailableError('Gemini failed and no fallback applied')
    }
  }

  try {
    return { text: await callGroq(system, messages, groqKey as string), provider: 'groq' }
  } catch (error) {
    console.warn('[llm] Groq failed:', error instanceof Error ? error.message : 'unknown error')
    throw new LlmUnavailableError('All LLM providers failed')
  }
}
