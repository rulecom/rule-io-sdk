/**
 * Message-tree lookup and `{{paramName}}` substitution.
 *
 * The message tree is a nested plain-object whose leaves are strings
 * (or numbers / booleans, which are coerced). Leaf strings may
 * contain double-brace `{{paramName}}` placeholders that get
 * replaced with pre-evaluated param values at call time. (The outer
 * template syntax uses `<?copy?>` PIs — `{{…}}` only appears inside
 * message strings, never in template XML.)
 *
 * RFM atoms live inside message text and carry their `"` delimiters
 * verbatim — because we only substitute `{{paramName}}` tokens, not
 * escape or reformat the surrounding text.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import type { SourceLoc } from '../source/loc.js'

/**
 * Look up a leaf message string by walking `key` through `tree` via
 * dot-navigation.
 *
 * Throws `TemplateCompileError` when any segment is missing or the
 * leaf is not a string/number/boolean. Numbers and booleans are
 * permissively coerced to their string form.
 *
 * @param tree - Resolved messages tree.
 * @param key - Dot-path to the leaf, split into segments (e.g.
 *   `['welcome', 'title']` for `welcome.title`).
 * @param loc - Source location of the interpolation referencing this
 *   key; used to decorate thrown errors.
 * @param source - Full template source for error frames.
 * @param sourcePath - Optional file path for error prefixes.
 * @returns The leaf string (with `{{paramName}}` placeholders still in
 *   place; substitution happens in {@link substituteMessageParams}).
 */
export function lookupMessage(
  tree: unknown,
  key: readonly string[],
  loc: SourceLoc,
  source: string,
  sourcePath: string | undefined,
): string {
  let cur: unknown = tree

  for (let i = 0; i < key.length; i++) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      throw new TemplateCompileError(
        `Message key not found: ${key.join('.')}`,
        loc,
        source,
        sourcePath,
      )
    }

    const seg = key[i]!

    if (!Object.prototype.hasOwnProperty.call(cur, seg)) {
      throw new TemplateCompileError(
        `Message key not found: ${key.join('.')}`,
        loc,
        source,
        sourcePath,
      )
    }

    cur = (cur as Record<string, unknown>)[seg]
  }

  if (typeof cur === 'string') return cur
  // Permissive: numbers / booleans coerce to string.
  if (typeof cur === 'number' || typeof cur === 'boolean') return String(cur)

  throw new TemplateCompileError(
    `Message leaf must be a string: ${key.join('.')}`,
    loc,
    source,
    sourcePath,
  )
}

/**
 * Replace `{{{paramName}}}` placeholders in `template` with values
 * from `params`.
 *
 * Placeholder rules: double-brace wrapping a plain identifier
 * (`[A-Za-z_][A-Za-z0-9_]*`). No nesting, no expressions. Single
 * `{` / `}` pass through literally — so RFM atoms like
 * `::placeholder{name="{{name}}"}` keep their single-brace
 * attribute delimiters intact while only the inner `{{name}}`
 * gets substituted.
 *
 * Unknown placeholders throw `TemplateCompileError`. Extra entries
 * in `params` that aren't referenced are silently ignored (warnings
 * about unused params are out of scope for v1.4).
 *
 * @param template - Raw message string containing optional
 *   `{{{paramName}}}` placeholders.
 * @param params - Pre-evaluated string values keyed by placeholder
 *   name.
 * @param loc - Source location of the interpolation referencing this
 *   message; used to decorate thrown errors.
 * @param source - Full template source for error frames.
 * @param sourcePath - Optional file path for error prefixes.
 * @param messageKey - Dotted key of the message being substituted,
 *   used in the error message for missing params.
 * @returns The message with all placeholders replaced.
 */
export function substituteMessageParams(
  template: string,
  params: Readonly<Record<string, string>>,
  loc: SourceLoc,
  source: string,
  sourcePath: string | undefined,
  messageKey: string,
): string {
  let out = ''
  let i = 0

  while (i < template.length) {
    const ch = template[i]!

    if (ch === '{') {
      // Only match when we see `{{ident}}` exactly. A single `{`
      // (e.g. the start of an RFM atom `{name="x"`) is literal
      // brace content — we emit just the one `{` and re-enter the
      // main loop from `i+1` so any nested `{{placeholder}}` tokens
      // further inside still get substituted.
      const match = /^\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/.exec(template.slice(i))

      if (match !== null) {
        const name = match[1]!

        if (!Object.prototype.hasOwnProperty.call(params, name)) {
          throw new TemplateCompileError(
            `Message parameter missing: ${name} (for ${messageKey})`,
            loc,
            source,
            sourcePath,
          )
        }

        out += params[name]!
        i += match[0].length
        continue
      }

      out += ch
      i++
      continue
    }

    out += ch
    i++
  }

  return out
}
