import type {
  BlockNode,
  ParagraphNode,
  BulletListNode,
  OrderedListNode,
  ListItemNode,
  AlignNode,
} from '../json-validator/types.js'
import { serializeInlineNodes } from './inline.js'

// ─── Block dispatcher ─────────────────────────────────────────────────────────

/**
 * Serialize a single block node to its RFM markdown string.
 *
 * Dispatches to the appropriate serializer based on `node.type`.
 *
 * @throws If `node.type` is not a known block node type.
 * @internal
 */
export function serializeBlock(node: BlockNode): string {
  switch (node.type) {
    case 'paragraph':
      return serializeParagraph(node)

    case 'bullet-list':
      return serializeBulletList(node)

    case 'ordered-list':
      return serializeOrderedList(node)

    case 'align':
      return serializeAlign(node)

    default:
      throw new Error(`Unexpected block node type "${(node as { type: string }).type}"`)
  }
}

// ─── Block serializers ────────────────────────────────────────────────────────

function serializeParagraph(node: ParagraphNode): string {
  return serializeInlineNodes(node.content ?? [])
}

function serializeBulletList(node: BulletListNode): string {
  return node.content.map((item) => serializeListItem(item, '- ', '  ')).join('\n')
}

function serializeOrderedList(node: OrderedListNode): string {
  let n = node.attrs.order

  return node.content
    .map((item) => {
      const prefix = `${n++}. `

      return serializeListItem(item, prefix, ' '.repeat(prefix.length))
    })
    .join('\n')
}

/**
 * Serialize a list item, applying `prefix` to the first line and `indent` to
 * continuation lines. An empty item (no content blocks) serializes as the
 * trimmed prefix (e.g. `"-"` for bullet lists).
 */
function serializeListItem(item: ListItemNode, prefix: string, indent: string): string {
  if (item.content.length === 0) return prefix.trimEnd()

  const first = item.content[0] as BlockNode
  const rest = item.content.slice(1)
  const firstLines = serializeBlock(first).split('\n')
  const lines: string[] = [prefix + firstLines[0], ...firstLines.slice(1).map((l) => indent + l)]

  for (const block of rest) {
    lines.push('') // blank line before continuation blocks (loose list item)

    for (const l of serializeBlock(block).split('\n')) {
      lines.push(indent + l)
    }
  }

  return lines.join('\n')
}

function serializeAlign(node: AlignNode): string {
  const inner = node.content.map(serializeBlock).join('\n\n')

  return `:::align{value="${node.attrs.value}"}\n${inner}\n:::`
}
