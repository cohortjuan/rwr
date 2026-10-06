// Removes obvious contact details from text before it is sent to an AI provider.
// This is a safety net, not a guarantee: it cannot catch names, places, or employers.

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g
const URL = /\bhttps?:\/\/\S+/gi
// Seven or more digits, allowing spaces, dots, dashes, and brackets between them.
const PHONE = /(?:\+?\d[\s().-]?){7,}\d/g

export function scrub(text: string): string {
  return text.replace(EMAIL, '[email removed]').replace(URL, '[link removed]').replace(PHONE, '[number removed]')
}
