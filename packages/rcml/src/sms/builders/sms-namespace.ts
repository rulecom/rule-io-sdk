/**
 * Public API: the `sms` namespace object.
 *
 * Bundles every SMS content builder under a single import surface so call
 * sites read as `sms.createTextNode(...)`, `sms.createLinkMark(...)`, etc.
 *
 * @public
 */

import {
  createContent,
  createHardbreakNode,
  createParagraphNode,
  createTextNode,
} from './nodes.js'
import { createLinkMark } from './marks.js'
import {
  createCustomFieldPlaceholder,
  createDatePlaceholder,
  createLinkPlaceholder,
  createPlaceholderNode,
  createRemoteContentPlaceholder,
  createSubscriberPlaceholder,
  createUserPlaceholder,
} from './placeholders.js'

/**
 * Namespace object grouping every SMS content-JSON builder.
 *
 * @example
 * ```ts
 * import { sms, createSmsDocument } from '@rule/rcml';
 *
 * const content = sms.createContent({
 *   paragraphs: [
 *     sms.createParagraphNode({
 *       content: [
 *         sms.createTextNode({ text: 'Hi ' }),
 *         sms.createSubscriberPlaceholder({ field: 'FirstName' }),
 *         sms.createTextNode({ text: '!' }),
 *       ],
 *     }),
 *   ],
 * });
 *
 * const doc = createSmsDocument({ content });
 * ```
 * @public
 */
export const sms = {
  // Nodes
  createContent,
  createParagraphNode,
  createTextNode,
  createHardbreakNode,

  // Marks
  createLinkMark,

  // Placeholders — generic + per-type convenience builders
  createPlaceholderNode,
  createSubscriberPlaceholder,
  createUserPlaceholder,
  createCustomFieldPlaceholder,
  createDatePlaceholder,
  createRemoteContentPlaceholder,
  createLinkPlaceholder,
} as const
