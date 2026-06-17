import { SmsLinkAttrsSchema } from '../schemas/link.js'
import { SmsPlaceholderAttrsSchema } from '../schemas/placeholder.js'
import type { FlavorConfig } from '../../../email/content/flavors/types.js'

/**
 * Flavor configuration for SMS RFM (SMS Rule Flavor Markdown) content.
 *
 * Supports paragraphs, hard breaks, `:link` text directive, and
 * `::placeholder` leaf directive. No font marks, no lists, no align blocks.
 *
 * @internal
 */
export const smsRfmConfig: FlavorConfig = {
  name: 'SMS RFM',

  allowedBlockNodes: new Set(['break']),

  allowedTextDirectives: new Map([
    ['link', SmsLinkAttrsSchema],
  ]),

  allowedLeafDirectives: new Map([
    ['placeholder', SmsPlaceholderAttrsSchema],
  ]),

  allowedContainerDirectives: new Map(),
}
