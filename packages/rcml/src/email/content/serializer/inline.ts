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
 * When all nodes in the sequence are text nodes that share at least one
 * common mark — at *any* position in their mark arrays, not just the first —
 * the shared mark is pulled out as a single directive wrapper and the
 * process recurses on the stripped inner content. This keeps adjacent runs
 * that share an outer mark wrapped together (e.g. a `:link` covering a plain
 * run plus a `:font`-styled run), which avoids asymmetric whitespace handling
 * in remark-directive when the group would otherwise be split into separate
 * top-level directives.
 *
 * @internal
 */
export function serializeInlineNodes(nodes: InlineNode[]): string {
  if (nodes.length === 0) return ''

  if (nodes.every((n): n is TextNode => n.type === 'text')) {
    const sharedMark = findSharedMark(nodes)

    if (sharedMark) {
      const stripped = nodes.map((n) => ({
        ...n,
        marks: (n.marks ?? []).filter((m) => !marksEqual(m, sharedMark)),
      }))

      return renderMark(serializeInlineNodes(stripped), sharedMark)
    }
  }

  return nodes.map(serializeInlineNode).join('')
}

/**
 * Find the first mark (scanning the first node's marks in order) that is
 * present on *every* node in the sequence. Returns `undefined` when no mark
 * is common to all nodes (or when the first node has no marks).
 */
function findSharedMark(nodes: TextNode[]): Mark | undefined {
  const firstMarks = nodes[0]?.marks ?? []

  for (const candidate of firstMarks) {
    const onEveryNode = nodes.every((n) =>
      (n.marks ?? []).some((m) => marksEqual(m, candidate)),
    )

    if (onEveryNode) return candidate
  }

  return undefined
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
