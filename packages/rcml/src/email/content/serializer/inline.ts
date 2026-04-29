import type {
  InlineNode,
  TextNode,
  Mark,
  PlaceholderNode,
  LoopValueNode,
  PlaceholderValueFragmentNode,
} from '../json-validator/types.js'
import { renderWithMarks, renderMark, marksEqual } from './mark.js'

// ─── Inline sequence serializer ───────────────────────────────────────────────

/**
 * Serialize a sequence of inline nodes to an RFM markdown string.
 *
 * When all nodes in the sequence are text nodes that share the same outermost
 * mark, they are grouped under a single directive wrapper and the process
 * recurses on the inner mark layers. This mirrors how `flattenInline` in
 * `convert.ts` flattens IR nesting into flat per-node mark arrays.
 *
 * @internal
 */
export function serializeInlineNodes(nodes: InlineNode[]): string {
  if (nodes.length === 0) return ''

  // All text nodes sharing the same outermost mark → group under one directive.
  if (nodes.every((n): n is TextNode => n.type === 'text')) {
    let sharedMark: Mark | undefined
    let allShare = true

    for (const n of nodes) {
      const first = n.marks?.at(0)

      if (!first) {
        allShare = false
        break
      }

      if (!sharedMark) {
        sharedMark = first
        continue
      }

      if (!marksEqual(first, sharedMark)) {
        allShare = false
        break
      }
    }

    if (allShare && sharedMark) {
      const stripped = nodes.map((n) => ({ ...n, marks: n.marks?.slice(1) ?? [] }))

      return renderMark(serializeInlineNodes(stripped), sharedMark)
    }
  }

  return nodes.map(serializeInlineNode).join('')
}

// ─── Single-node serializer ───────────────────────────────────────────────────

/**
 * Serialize a single inline node to its RFM markdown string.
 *
 * @throws If `node.type` is not a known inline node type.
 * @internal
 */
export function serializeInlineNode(node: InlineNode): string {
  switch (node.type) {
    case 'text':
      return renderWithMarks(node.text, node.marks ?? [])

    case 'hardbreak':
      return '\\\n'

    case 'placeholder':
      return serializePlaceholder(node)

    case 'loop-value':
      return serializeLoopValue(node)

    case 'placeholder-value-fragment':
      return serializePlaceholderValueFragment(node)

    default:
      throw new Error(`Unexpected inline node type "${(node as { type: string }).type}"`)
  }
}

// ─── Atom serializers ─────────────────────────────────────────────────────────

function serializePlaceholder(node: PlaceholderNode): string {
  const a = node.attrs
  const parts = [`type="${a.type}"`]

  if (a.value != null) parts.push(`value="${a.value}"`)
  parts.push(`name="${a.name}"`, `original="${a.original}"`)
  if (a['max-length'] != null) parts.push(`max-length="${a['max-length']}"`)

  return `::placeholder{${parts.join(' ')}}`
}

function serializeLoopValue(node: LoopValueNode): string {
  const a = node.attrs

  return `::loop-value{original="${a.original}" value="${a.value}" index="${a.index}"}`
}

function serializePlaceholderValueFragment(node: PlaceholderValueFragmentNode): string {
  return `::placeholder-value-fragment{text="${node.attrs.text}"}`
}
