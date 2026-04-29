import { type ZodType } from 'zod'

import { FontAttrsSchema } from '../schemas/font.js'
import { LinkAttrsSchema } from '../schemas/link.js'
import { PlaceholderAttrsSchema } from '../schemas/placeholder.js'
import { AlignAttrsSchema } from '../schemas/align.js'
import { LoopValueAttrsSchema } from '../schemas/loop-value.js'
import type { FlavorConfig } from './types.js'

/**
 * Flavor configuration for full RFM content.
 *
 * Supports paragraphs, hard breaks, bullet/ordered lists, `:::align`,
 * `:font`, `:link`, `::placeholder`, `::loop-value`.
 *
 * Used by text block fields in the WYSIWYG editor.
 *
 * @internal
 */
export const rfmConfig: FlavorConfig = {
  name: 'RFM',

  allowedBlockNodes: new Set(['list', 'listItem', 'break']),

  allowedTextDirectives: new Map<string, ZodType | null>([
    ['font', FontAttrsSchema],
    ['link', LinkAttrsSchema],
  ]),

  allowedLeafDirectives: new Map<string, ZodType | null>([
    ['placeholder', PlaceholderAttrsSchema],
    ['placeholder-value-fragment', null],
    ['loop-value', LoopValueAttrsSchema],
  ]),

  allowedContainerDirectives: new Map<string, ZodType | null>([
    ['align', AlignAttrsSchema],
  ]),
}
