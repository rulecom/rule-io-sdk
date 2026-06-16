/**
 * Internal: SmsContentJson → SMS RFM (SMS Rule Flavor Markdown) string conversion.
 *
 * - Text nodes without marks → verbatim text.
 * - Text/placeholder nodes with a link mark → wrapped in `:link[...]{href track shorten}`.
 * - Placeholder nodes with a resolved value or max-length → `::placeholder{...}` directive form.
 * - Placeholder nodes with null value and null max-length → compact `[Type:Name]` via `original`.
 * - Hardbreaks → `\\\n` (remark hard-break syntax).
 * - Paragraphs → joined with `\n\n`.
 *
 * @internal
 */

import type { SmsContentJson, SmsInlineNode, SmsParagraphNode, SmsLinkMark } from '../json-validator/types.js'

// ─── Link mark helpers ────────────────────────────────────────────────────────

function linkMarksEqual(a: SmsLinkMark, b: SmsLinkMark): boolean {
  return a.attrs.href === b.attrs.href && a.attrs.track === b.attrs.track && a.attrs.shorten === b.attrs.shorten
}

function renderLinkAttrs(mark: SmsLinkMark): string {
  return `href="${mark.attrs.href}" track="${String(mark.attrs.track)}" shorten="${String(mark.attrs.shorten)}"`
}

// ─── Paragraph serializer ─────────────────────────────────────────────────────

/** Serialize one paragraph's inline children to SMS RFM. @internal */
function serializeParagraph(para: SmsParagraphNode): string {
  if (!para.content || para.content.length === 0) return ''

  return serializeInlineSequence(para.content)
}

// ─── Inline sequence serializer ───────────────────────────────────────────────

/**
 * Serialize a sequence of inline nodes.
 *
 * When all nodes in the sequence share the same single link mark, they are
 * grouped under a single `:link[...]{...}` wrapper — this mirrors the email
 * module's approach and avoids multiple adjacent directives for the same link.
 * @internal
 */
function serializeInlineSequence(nodes: SmsInlineNode[]): string {
  if (nodes.length === 0) return ''

  // Check if every node in the sequence carries an identical link mark
  const sharedMark = findSharedLinkMark(nodes)

  if (sharedMark) {
    const stripped = nodes.map((n) => {
      if (n.type === 'text') {
        const newMarks = (n.marks ?? []).filter((m) => !linkMarksEqual(m, sharedMark))

        return newMarks.length > 0 ? { ...n, marks: newMarks } : { type: 'text' as const, text: n.text }
      }

      if (n.type === 'placeholder') {
        return n
      }

      return n
    })

    return `:link[${serializeInlineSequence(stripped)}]{${renderLinkAttrs(sharedMark)}}`
  }

  return nodes.map(serializeSingleNode).join('')
}

/**
 * Find the first link mark that is present on every node in the sequence.
 * Only text and placeholder nodes can carry link marks.
 * Hardbreak nodes break the run — return undefined if any are present.
 * @internal
 */
function findSharedLinkMark(nodes: SmsInlineNode[]): SmsLinkMark | undefined {
  if (nodes.length === 0) return undefined

  const first = nodes[0]

  // Hardbreaks don't carry marks; if first node is a hardbreak, no shared mark
  if (first === undefined || first.type === 'hardbreak') return undefined

  const firstMarks = first.type === 'text' ? (first.marks ?? []) : []

  for (const candidate of firstMarks) {
    const onEveryNode = nodes.every((n) => {
      if (n.type === 'hardbreak') return false
      if (n.type === 'text') return (n.marks ?? []).some((m) => linkMarksEqual(m, candidate))

      // placeholder: no marks — would break the shared mark assumption
      return false
    })

    if (onEveryNode) return candidate
  }

  return undefined
}

// ─── Single node serializer ───────────────────────────────────────────────────

/** Serialize a single inline node to its SMS RFM text fragment. @internal */
function serializeSingleNode(node: SmsInlineNode): string {
  switch (node.type) {
    case 'text': {
      const linkMark = node.marks?.find((m) => m.type === 'link')

      if (linkMark) {
        return `:link[${node.text}]{${renderLinkAttrs(linkMark)}}`
      }

      return node.text
    }

    case 'hardbreak':
      return '\n'

    case 'placeholder': {
      const { value, 'max-length': maxLen, type, original, name } = node.attrs

      if (value !== null || maxLen !== null) {
        const parts = [`type="${type}"`, `original="${original}"`, `name="${name}"`]

        if (value !== null) parts.push(`value="${value}"`)
        if (maxLen !== null) parts.push(`max-length="${maxLen}"`)

        return `::placeholder{${parts.join(' ')}}`
      }

      return original
    }

    default:
      return ''
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Serialize an {@link SmsContentJson} document back to an SMS RFM string.
 *
 * @internal — called by the public `jsonToSmsRfm` wrapper.
 */
export function serializeSmsJson(json: SmsContentJson): string {
  return json.content.map(serializeParagraph).join('\n\n')
}
