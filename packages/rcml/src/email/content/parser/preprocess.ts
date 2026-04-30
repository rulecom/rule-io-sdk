/**
 * Delimiter marking the start/end of an inline-atom token.
 * U+E000 is in the Unicode Private Use Area and will not appear in markdown.
 * @internal
 */
export const ATOM_TOKEN_DELIMITER = '\uE000'

/**
 * Separator between the atom name and its raw attrs string inside a token.
 * @internal
 */
export const ATOM_TOKEN_SEPARATOR = '\uE001'

/**
 * Replacement for `:` inside token attr strings to prevent remark-directive
 * from interpreting `:name` sequences as inline text directives.
 * @internal
 */
export const COLON_ESCAPE = '\uE002'

const ATOM_NAMES = '(?:placeholder|loop-value|placeholder-value-fragment)'

/**
 * Matches a `::name{attrs}` sequence that is preceded by a non-newline,
 * non-colon character.  Uses a **lookbehind** so the preceding character is
 * checked but not consumed — this is critical for consecutive sequences like
 * `::ph{A}::ph{B}::ph{C}` where the closing `}` of each atom would otherwise
 * be consumed as the prefix of the following match, causing every other atom
 * to be skipped.
 *
 * Capture groups:
 *  1 — the directive name (placeholder | loop-value | placeholder-value-fragment)
 *  2 — the raw attribute string (everything between `{` and `}`)
 *
 * The lookbehind `(?<=[^\n:])` and `(?!:)` lookahead together exclude
 * `:::name` container directives (those are block-level and parsed directly by
 * remark).
 */
const MID_LINE_ATOM_RE = new RegExp(
  `(?<=[^\\n:])::(?!:)(${ATOM_NAMES})\\{([^}]*)\\}`,
  'g',
)

/**
 * Matches a `::name{attrs}` sequence at the start of a line (or string)
 * that is immediately followed by more non-whitespace content.
 *
 * The `(?=\S)` lookahead restricts this to the first atom in a consecutive
 * run (e.g. `::ph{A}::ph{B}` where `::ph{A}` is at line start but `::ph{B}`
 * immediately follows). Standalone block-level leaf directives (those whose
 * attrs `}` is followed only by whitespace or a newline) are left untouched
 * so remark can parse them as `leafDirective` nodes and the validator can
 * check their attributes.
 *
 * Capture groups:
 *  1 — the line-start anchor (`\n` or empty string for string start)
 *  2 — directive name
 *  3 — raw attribute string
 */
const LINE_START_ATOM_RE = new RegExp(
  `(\\n|^)::(?!:)(${ATOM_NAMES})\\{([^}]*)\\}(?=\\S)`,
  'gm',
)

/**
 * Encode inline-atom leaf directives as opaque tokens so remark does not
 * see them as block-level constructs.
 *
 * Two-pass strategy:
 *  1. MID_LINE_ATOM_RE — handles `::name{attrs}` preceded by a regular char
 *     (including consecutive atoms where `}` precedes the next `::`).
 *  2. LINE_START_ATOM_RE — handles `::name{attrs}` at line/string start (the
 *     first atom in a consecutive run has no preceding char, so pass 1 misses
 *     it; pass 2 catches it).
 *
 * Token format:  `\uE000name\uE001safeAttrs\uE000`
 *
 * @internal
 */
export function preprocessMarkdown(input: string): string {
  const encode = (name: string, attrs: string): string => {
    const safeAttrs = attrs.replace(/:/g, COLON_ESCAPE)

    return `${ATOM_TOKEN_DELIMITER}${name}${ATOM_TOKEN_SEPARATOR}${safeAttrs}${ATOM_TOKEN_DELIMITER}`
  }

  // Pass 1: mid-line atoms (lookbehind — preceding char is NOT consumed)
  let result = input.replace(MID_LINE_ATOM_RE, (_, name: string, attrs: string) => encode(name, attrs))

  // Pass 2: any remaining atoms at line/string start
  result = result.replace(LINE_START_ATOM_RE, (_, lineStart: string, name: string, attrs: string) =>
    `${lineStart}${encode(name, attrs)}`
  )

  return result
}
