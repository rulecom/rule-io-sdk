/**
 * Context-aware XML escaping for interpolated values.
 *
 * Static template text is emitted verbatim (§10); only values flowing
 * out of `{{…}}` interpolation go through these helpers.
 *
 * @internal
 */

/**
 * Escape a value destined for an XML text node. Replaces the three
 * characters that would otherwise be interpreted by the XML parser:
 * `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`.
 *
 * `"` and `'` are **not** escaped in text-node context — this is
 * what lets RFM atoms like `::placeholder{name="foo"}` survive when
 * they're substituted from a message translation into an `<rc-text>`
 * body.
 */
export function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Escape a value destined for an XML attribute value, delimited by
 * `quote` (`"` or `'`). Escapes `&`, `<`, `>`, and the matching
 * quote; the non-matching quote passes through literally.
 */
export function escapeXmlAttr(value: string, quote: '"' | "'"): string {
  const base = escapeXmlText(value)

  return quote === '"'
    ? base.replace(/"/g, '&quot;')
    : base.replace(/'/g, '&apos;')
}
