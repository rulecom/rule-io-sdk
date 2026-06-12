/**
 * Internal: SmsDocument JSON → XML string conversion.
 *
 * `<rc-sms>` is a leaf node — its body is the SFM serialization of
 * `content` stored as a text child, exactly as email stores RFM text inside
 * `<rc-text>`. `id` (when present) is lifted into the XML attribute bag.
 *
 * @internal
 */

import { XMLBuilder } from 'fast-xml-parser'
import type { SmsDocument } from '../sms-types.js'
import { jsonToSfm } from '../json-to-sfm.js'
import type { SmsToXmlOptions } from '../sms-to-xml.js'

/**
 * Serialize an {@link SmsDocument} to an XML string.
 * @internal
 */
export function serializeSmsToXml(doc: SmsDocument, options: SmsToXmlOptions): string {
  const pretty = options.pretty ?? true
  const indent = options.indent ?? '  '

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    format: pretty,
    indentBy: indent,
    suppressEmptyNode: false,
    processEntities: true,
  })

  const attrs: Record<string, string> = {}

  if (typeof doc.id === 'string') {
    attrs['id'] = doc.id
  }

  const sfm = jsonToSfm(doc.content)

  type PreservedEntry = Record<string, unknown>

  const entry: PreservedEntry = {}

  if (Object.keys(attrs).length > 0) {
    entry[':@'] = attrs
  }

  entry['rc-sms'] = sfm === '' ? [] : [{ '#text': sfm }]

  const xml = builder.build([entry]) as string

  return pretty ? xml.trim() : xml
}
