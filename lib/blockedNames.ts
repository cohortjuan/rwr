// Extra words to refuse as a player or lion name, on top of the open-source list that
// lib/names.ts already uses. Write them in lowercase letters only.
//
// wholeWords: refused only when it is a whole word of the name. Use this for words that also
//   sit inside harmless names.
// anywhere: refused wherever it appears, even inside a longer name.
export const extraBlockedNames: { wholeWords: string[], anywhere: string[] } = {
  wholeWords: [],
  anywhere: [],
}
