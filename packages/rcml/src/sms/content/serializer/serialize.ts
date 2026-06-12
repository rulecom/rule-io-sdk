/**
 * Internal: SmsContentJson → SFM (SMS Format Markup) string conversion.
 *
 * Link marks are lossy — only the text content of linked spans is preserved.
 * Placeholders are serialized back to their `[Type:Name]` original form.
 * Hardbreaks become `\n`. Paragraph boundaries become `\n\n`.
 *
 * @internal
 */

import type { SmsContentJson, SmsInlineNode, SmsParagraphNode } from '../json-validator/types.js'

/** Dispatch on node type to produce the SFM text fragment for one inline node. @internal */
function serializeInlineNode(node: SmsInlineNode): string {
  switch (node.type) {
    case 'text':
      return node.text
    case 'hardbreak':
      return '\n'
    case 'placeholder':
      return node.attrs.original
    default:
      return ''
  }
}

/** Serialize one paragraph's inline children to SFM, joining them without separator. @internal */
function serializeParagraph(para: SmsParagraphNode): string {
  if (!para.content || para.content.length === 0) return ''

  return para.content.map(serializeInlineNode).join('')
}

/**
 * Serialize an {@link SmsContentJson} document back to an SFM string.
 *
 * @internal — called by the public `jsonToSfm` wrapper.
 */
export function serializeSmsJson(json: SmsContentJson): string {
  return json.content.map(serializeParagraph).join('\n\n')
}
