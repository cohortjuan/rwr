import { isNameAllowed, LION_NAME_MAX } from '@/lib/names'
import { fromBase64Url, toBase64Url } from '@/lib/pride'

// A friend's witness works like My Pride: no accounts and no database. The player's question
// rides in one link, and the friend's answer rides back in another. Both sit in the part of
// the link after the #, which browsers never send to a server.

export type WitnessLink =
  | { kind: 'ask', id: string, name: string, lion: string }
  | { kind: 'answer', id: string, name: string, text: string, at: string, key: string }

export const WITNESS_TEXT_MAX = 200
export const WITNESS_NAME_MAX = 24
export const WITNESSES_KEPT = 20

const VERSION = 1
const LINK_MAX = 1200

const pack = (fields: unknown[]) => toBase64Url(JSON.stringify([VERSION, ...fields]))

// The link the player sends out. `id` is their lion's card name, so the answer finds its way home.
export function askLink(origin: string, id: string, name: string, lion: string): string {
  return `${origin}/witness#q=${pack([id, name, lion])}`
}

// The link the friend sends back.
export function answerLink(origin: string, id: string, name: string, text: string, now: number): string {
  return `${origin}/witness#a=${pack([id, name, text, Math.floor(now / 60000)])}`
}

const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-z0-9]{6,16}$/.test(id)

// Anyone can write a link by hand, so nothing in one is trusted: every field is checked,
// trimmed to size, and run through the name filter before it is shown or saved.
export function parseWitnessLink(text: string): WitnessLink | null {
  const match = /#([qa])=([A-Za-z0-9_-]+)/.exec(text)
  if (!match || match[2].length > LINK_MAX) return null
  try {
    const fields: unknown = JSON.parse(fromBase64Url(match[2]))
    if (!Array.isArray(fields) || fields[0] !== VERSION || !validId(fields[1])) return null
    const id = fields[1]
    const name = typeof fields[2] === 'string' ? fields[2].trim().slice(0, WITNESS_NAME_MAX) : ''
    if (!name || !isNameAllowed(name)) return null

    if (match[1] === 'q') {
      const lion = typeof fields[3] === 'string' ? fields[3].trim().slice(0, LION_NAME_MAX) : ''
      if (!lion || !isNameAllowed(lion)) return null
      return { kind: 'ask', id, name, lion }
    }

    const answer = typeof fields[3] === 'string' ? fields[3].trim().slice(0, WITNESS_TEXT_MAX) : ''
    const minutes = fields[4]
    if (!answer || !isNameAllowed(answer) || typeof minutes !== 'number') return null
    const made = new Date(minutes * 60000)
    if (Number.isNaN(made.getTime())) return null
    return { kind: 'answer', id, name, text: answer, at: made.toISOString(), key: `${name}:${minutes}:${answer.length}` }
  } catch {
    return null
  }
}
