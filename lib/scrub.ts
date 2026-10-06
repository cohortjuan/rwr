// Removes obvious contact details from text before it is sent to an AI provider.
// This is a safety net, not a guarantee: it cannot catch names, places, or employers.

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g
const URL = /\bhttps?:\/\/\S+/gi
// North American style numbers such as (555) 123-4567, and international ones that start with +.
// Year ranges like 2019-2024 are left alone.
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|\+\d[\d\s().-]{7,}\d/g

export function scrub(text: string): string {
  return text.replace(EMAIL, '[email removed]').replace(URL, '[link removed]').replace(PHONE, '[number removed]')
}
