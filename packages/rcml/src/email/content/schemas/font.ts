import { z } from 'zod'

/**
 * Attribute schema for the `:font` text directive.
 * All attributes are optional but at least one must be set.
 *
 * @internal
 */
export const FontAttrsSchema = z
  .object({
    'font-family': z.string().optional(),
    'font-size': z.string().optional(),
    'line-height': z.string().optional(),
    'letter-spacing': z.string().optional(),
    'font-style': z.enum(['normal', 'italic']).optional(),
    'font-weight': z.string().optional(),
    'text-decoration': z.enum(['none', 'underline', 'line-through']).optional(),
    'color': z.string().optional(),
  })
  .strict()
  .refine(
    (attrs) => Object.values(attrs).some((v) => v !== undefined),
    { message: ':font must have at least one attribute set — a bare :font[text]{} is invalid' },
  )
