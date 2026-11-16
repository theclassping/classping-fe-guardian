// The one display helper the album needs; kept local so the package has no dependency on a portal's lib/.
/** Up to two initials: initialsOf("Gita Gateway") → "GG". */
export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
