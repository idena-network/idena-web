export const capitalize = str =>
  str.length ? str[0].toUpperCase() + str.substr(1) : ''

export function pluralize(word, num) {
  return num > 1 ? `${word}s` : word
}
