import { lines } from '@/lib/lines'
import { isNameAllowed, LION_NAME_MAX } from '@/lib/names'
import { pridePower, todahForm, type PrideCard, type Progress, type TodahForm } from '@/lib/progress'

// My Pride works without accounts or a database. A player's card is packed into a link (the
// QR code is the same link), and the friend's browser unpacks it. The card rides in the part
// of the link after the #, which browsers never send to a server.

export type CheerId = keyof typeof lines.pride.cheers

export type PrideLink =
  | { kind: 'card', card: PrideCard }
  | { kind: 'cheer', card: PrideCard, cheer: CheerId, key: string }

export const PRIDE_MAX_FRIENDS = 30
export const CHEERS_KEPT = 20

const VERSION = 1
const NAME_MAX = 24
const GOAL_MAX = 90
const LINK_MAX = 1200
const forms: TodahForm[] = ['cub', 'nomad', 'leader']
const cheerIds = Object.keys(lines.pride.cheers) as CheerId[]

// A short random name for a card. Friends' browsers use it to tell cards apart.
export function newCardId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('')
}

// The snapshot friends see: first name, lion, form, Pride Power, and the goal if shared.
export function buildCard(progress: Progress, now: number): PrideCard {
  const power = pridePower(progress)
  const showGoal = progress.shareGoal && progress.goalText.trim().length > 0
  return {
    id: progress.cardId,
    name: progress.playerName.trim().slice(0, NAME_MAX) || lines.pride.noName,
    lion: progress.lionName,
    form: todahForm(progress),
    power: power.level,
    max: power.max,
    goal: showGoal ? progress.goalText.trim().slice(0, GOAL_MAX) : '',
    reached: showGoal && Boolean(progress.goalAchievedAt),
    at: new Date(now).toISOString(),
  }
}

function toBase64Url(text: string): string {
  let binary = ''
  new TextEncoder().encode(text).forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(data: string): string {
  const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
}

// Packed as a plain list to keep the link, and so the QR code, small.
function pack(card: PrideCard): unknown[] {
  const minutes = Math.floor(new Date(card.at).getTime() / 60000)
  return [card.id, card.name, card.lion, forms.indexOf(card.form), card.power, card.max, card.goal, card.reached ? 1 : 0, minutes]
}

export function cardLink(origin: string, card: PrideCard): string {
  return `${origin}/pride#f=${toBase64Url(JSON.stringify([VERSION, ...pack(card)]))}`
}

// A cheer carries the sender's own card, so every cheer also brings their latest progress.
export function cheerLink(origin: string, card: PrideCard, cheer: CheerId): string {
  return `${origin}/pride#c=${toBase64Url(JSON.stringify([VERSION, cheer, ...pack(card)]))}`
}

// Anyone can write a link by hand, so nothing in one is trusted: every field is checked,
// trimmed to size, and run through the name filter before it is shown or saved.
function unpack(fields: unknown[]): PrideCard | null {
  const [id, name, lion, form, power, max, goal, reached, minutes] = fields
  if (typeof id !== 'string' || !/^[a-z0-9]{6,16}$/.test(id)) return null
  if (typeof name !== 'string' || typeof lion !== 'string' || typeof goal !== 'string') return null
  if (typeof form !== 'number' || !forms[form]) return null
  if (typeof power !== 'number' || typeof max !== 'number' || typeof minutes !== 'number') return null
  if (!Number.isInteger(power) || !Number.isInteger(max) || max < 1 || max > 60 || power < 0 || power > max) return null
  const made = new Date(minutes * 60000)
  if (Number.isNaN(made.getTime())) return null

  const cleanName = name.trim().slice(0, NAME_MAX)
  const cleanLion = lion.trim().slice(0, LION_NAME_MAX)
  const cleanGoal = goal.trim().slice(0, GOAL_MAX)
  if (!cleanName || !cleanLion || !isNameAllowed(cleanName) || !isNameAllowed(cleanLion)) return null
  const goalOk = cleanGoal.length > 0 && isNameAllowed(cleanGoal)
  return {
    id,
    name: cleanName,
    lion: cleanLion,
    form: forms[form],
    power,
    max,
    goal: goalOk ? cleanGoal : '',
    reached: goalOk && reached === 1,
    at: made.toISOString(),
  }
}

// Reads a card or a cheer out of a link, or out of any text that has one pasted in it.
export function parsePrideLink(text: string): PrideLink | null {
  const match = /#([fc])=([A-Za-z0-9_-]+)/.exec(text)
  if (!match || match[2].length > LINK_MAX) return null
  try {
    const fields: unknown = JSON.parse(fromBase64Url(match[2]))
    if (!Array.isArray(fields) || fields[0] !== VERSION) return null
    if (match[1] === 'f') {
      const card = unpack(fields.slice(1))
      return card ? { kind: 'card', card } : null
    }
    const cheer = fields[1] as CheerId
    const card = unpack(fields.slice(2))
    if (!card || !cheerIds.includes(cheer)) return null
    return { kind: 'cheer', card, cheer, key: `${card.id}:${cheer}:${card.at}` }
  } catch {
    return null
  }
}

// Adds a friend's card, or refreshes it if that friend is already in the pride.
export function withCard(pride: PrideCard[], card: PrideCard): PrideCard[] {
  if (pride.some((friend) => friend.id === card.id)) {
    // An older snapshot never replaces a newer one.
    return pride.map((friend) => (friend.id === card.id && friend.at <= card.at ? card : friend))
  }
  return [...pride, card].slice(-PRIDE_MAX_FRIENDS)
}
