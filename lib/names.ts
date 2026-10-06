import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from 'obscenity'
import { extraBlockedNames } from '@/lib/blockedNames'

// Names the player types: their own, and their lion's.

export const DEFAULT_LION_NAME = 'Todah'
export const PLAYER_NAME_MAX = 40
// Short enough to fit the speech box label and the upgrades heading in the pixel font.
export const LION_NAME_MAX = 12

// The canned lines call the guide Todah. A lion the player renamed is shown under its own name.
export function withLionName(text: string, lionName: string): string {
  if (!lionName || lionName === DEFAULT_LION_NAME) return text
  return text
    .split(DEFAULT_LION_NAME.toUpperCase())
    .join(lionName.toUpperCase())
    .split(DEFAULT_LION_NAME)
    .join(lionName)
}

// Slurs and other abuse are refused as names. The word list comes from the open-source
// "obscenity" package, which also sees through common tricks (swapped digits, repeated
// letters, added spaces). lib/blockedNames.ts holds any extra words to refuse.
// This is a safety net, not a guarantee: a determined person can get around any word filter.
const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers })

const lookalikes: Record<string, string> = {
  '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', $: 's', '7': 't',
}

// Lowercase, accents removed, look-alike digits and symbols turned back into letters.
function plain(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134578!|@$]/g, (character) => lookalikes[character] ?? character)
}

export function isNameAllowed(name: string): boolean {
  if (matcher.hasMatch(name)) return false
  const words = plain(name).split(/[^a-z]+/).filter(Boolean)
  // The letters run together also count as one word, so spacing a word out does not hide it.
  const joined = words.join('')
  if (extraBlockedNames.wholeWords.some((word) => words.includes(word) || joined === word)) return false
  if (extraBlockedNames.anywhere.some((word) => joined.includes(word))) return false
  return true
}
