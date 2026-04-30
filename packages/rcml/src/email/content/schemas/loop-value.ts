import { z } from 'zod'

/**
 * Attribute schema for the `:::loop-value` container directive.
 * All three fields are required.
 *
 * @internal
 */
export const LoopValueAttrsSchema = z
  .object({
    original: z.string().min(1),
    value: z.string().min(1),
    index: z.string().min(1),
  })
  .strict()
