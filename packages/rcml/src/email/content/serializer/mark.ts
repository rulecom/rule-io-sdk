import type { Mark, FontMark, LinkMark } from '../json-validator/types.js'

// ─── Mark wrapping ────────────────────────────────────────────────────────────

/**
 * Wrap `text` with a stack of marks, outermost first.
 *
 * `marks[0]` is the outermost mark (the order in which `flattenInline` in
 * `convert.ts` accumulates marks into `inherited`), so we recurse on
 * `marks.slice(1)` first and wrap the result with `marks[0]`.
 *
 * @internal
 */
export function renderWithMarks(text: string, marks: Mark[]): string {
  const [outermost, ...inner] = marks

  if (!outermost) return text

  return renderMark(renderWithMarks(text, inner), outermost)
}

/**
 * Wrap `inner` text with a single RFM mark directive (`:font[...]` or `:link[...]`).
 *
 * @throws If `mark.type` is not a known mark type.
 * @internal
 */
export function renderMark(inner: string, mark: Mark): string {
  switch (mark.type) {
    case 'font':
      return `:font[${inner}]{${renderFontAttrs(mark)}}`

    case 'link':
      return `:link[${inner}]{${renderLinkAttrs(mark)}}`

    default:
      throw new Error(`Unexpected mark type "${(mark as { type: string }).type}"`)
  }
}

// ─── Mark equality ────────────────────────────────────────────────────────────

/**
 * Return `true` when two marks are structurally identical (same `type` and same
 * `attrs` by value).
 *
 * Used by `serializeInlineNodes` to detect when adjacent text nodes share the
 * same outermost mark and can be grouped under a single directive wrapper.
 *
 * @internal
 */
export function marksEqual(a: Mark, b: Mark): boolean {
  if (a.type !== b.type) return false

  return JSON.stringify(a.attrs) === JSON.stringify(b.attrs)
}

// ─── Attribute serializers ────────────────────────────────────────────────────

function renderFontAttrs(mark: FontMark): string {
  return Object.entries(mark.attrs)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
}

function renderLinkAttrs(mark: LinkMark): string {
  const parts = [`href="${mark.attrs.href}"`]

  if (mark.attrs.target != null) parts.push(`target="${mark.attrs.target}"`)
  if (mark.attrs['no-tracked'] === 'true') parts.push('no-tracked="true"')

  return parts.join(' ')
}
