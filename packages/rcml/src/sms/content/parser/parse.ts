/**
 * Internal: SFM (SMS Format Markup) string → SmsContentJson conversion.
 *
 * SFM is a simple text format:
 *   - `[Type:Name]` → placeholder node
 *   - `\n` (single newline) → hardbreak node
 *   - `\n\n` (double newline) → paragraph boundary
 *   - Everything else → text node
 *
 * Link marks are not representable in SFM — use the JSON model directly.
 */

import type { SmsContentJson, SmsHardbreakNode, SmsInlineNode, SmsParagraphNode, SmsPlaceholderNode, SmsPlaceholderType, SmsTextNode } from '../json-validator/types.js'

const PLACEHOLDER_RE = /\[([A-Za-z]+):([^\]]+)\]/g

/**
 * Parse a single paragraph segment (no `\n\n`) into inline nodes.
 */
function parseSegment(segment: string): SmsInlineNode[] {
  const nodes: SmsInlineNode[] = []
  let lastIndex = 0
  PLACEHOLDER_RE.lastIndex = 0

  for (const match of segment.matchAll(PLACEHOLDER_RE)) {
    const offset = match.index

    // Text before this placeholder
    if (offset > lastIndex) {
      pushTextWithBreaks(segment.slice(lastIndex, offset), nodes)
    }

    const [full, rawType, name] = match as RegExpMatchArray & [string, string, string]

    nodes.push({
      type: 'placeholder',
      attrs: {
        type: rawType as SmsPlaceholderType,
        name,
        original: full,
        value: null,
        'max-length': null,
      },
    } satisfies SmsPlaceholderNode)

    lastIndex = offset + full.length
  }

  // Remaining text after the last placeholder
  if (lastIndex < segment.length) {
    pushTextWithBreaks(segment.slice(lastIndex), nodes)
  }

  return nodes
}

/**
 * Split `text` on `\n` and push text nodes and hardbreak nodes alternately.
 */
function pushTextWithBreaks(text: string, out: SmsInlineNode[]): void {
  const parts = text.split('\n')

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!

    if (part.length > 0) {
      out.push({ type: 'text', text: part } satisfies SmsTextNode)
    }

    if (i < parts.length - 1) {
      out.push({ type: 'hardbreak', attrs: { isInline: false } } satisfies SmsHardbreakNode)
    }
  }
}

/**
 * Parse an SFM string into an {@link SmsContentJson} document.
 *
 * @internal — called by the public `sfmToJson` wrapper.
 */
export function parseSfm(input: string): SmsContentJson {
  if (input === '') {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  const paragraphSegments = input.split('\n\n')
  const paragraphs: SmsParagraphNode[] = paragraphSegments.map((segment) => {
    const content = parseSegment(segment)

    if (content.length === 0) {
      return { type: 'paragraph' }
    }

    return { type: 'paragraph', content }
  })

  return { type: 'doc', content: paragraphs }
}
