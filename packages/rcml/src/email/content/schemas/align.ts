import { z } from 'zod'

/**
 * Attribute schema for the `:::align` container directive.
 * RFM only — not valid in Inline RFM.
 *
 * @internal
 */
export const AlignAttrsSchema = z
  .object({
    value: z.enum(['left', 'center', 'right']),
  })
  .strict()
