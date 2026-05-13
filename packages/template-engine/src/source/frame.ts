/**
 * Code-frame formatter for error messages.
 *
 * Given a source string and a {@link SourceLoc}, renders a small
 * pretty-printed snippet with a caret under the offending column —
 * the same shape editors and compilers (Babel, TypeScript, V8) use.
 *
 * @internal
 */

import type { SourceLoc } from './loc.js'

/**
 * Render a short code frame around `loc`.
 *
 * The frame spans two lines of context above and below `loc.line`
 * (clamped to the source bounds), each prefixed with a right-aligned
 * gutter holding the line number. The offending line is marked with
 * a leading `>` and followed by a caret line pointing at
 * `loc.column`.
 *
 * @param source - The full template source string.
 * @param loc - Location to mark with the caret.
 * @returns Multi-line string suitable for appending to an error
 *   message. No trailing newline.
 */
export function makeCodeFrame(source: string, loc: SourceLoc): string {
  const lines = source.split('\n')
  const startLine = Math.max(1, loc.line - 2)
  const endLine = Math.min(lines.length, loc.line + 2)
  const gutterWidth = String(endLine).length

  const out: string[] = []

  for (let n = startLine; n <= endLine; n++) {
    const gutter = String(n).padStart(gutterWidth, ' ')
    const marker = n === loc.line ? '>' : ' '
    const line = lines[n - 1] ?? ''

    out.push(`${marker} ${gutter} | ${line}`)

    if (n === loc.line) {
      const caret = ' '.repeat(Math.max(0, loc.column - 1)) + '^'

      out.push(`  ${' '.repeat(gutterWidth)} | ${caret}`)
    }
  }

  return out.join('\n')
}
