import { z } from 'zod'

/**
 * Attribute schema for the `:link` text directive.
 * `href` is required; `target` and `no-tracked` are optional.
 *
 * @internal
 */
export const LinkAttrsSchema = z
  .object({
    href: z.string().min(1, { message: ':link href must not be empty' }),
    target: z.literal('_blank').optional(),
    'no-tracked': z.enum(['true', 'false']).optional(),
  })
  .strict()
