import { z } from 'zod'

/**
 * Attribute schema for the `:::placeholder` container directive.
 * All fields except `max-length` are required.
 *
 * @internal
 */
export const PlaceholderAttrsSchema = z
  .object({
    type: z.enum(['CustomField', 'Subscriber', 'User', 'RemoteContent', 'Date']),
    value: z.string().optional(),
    name: z.string().min(1, { message: ':::placeholder name must not be empty' }),
    original: z.string(),
    'max-length': z.string().optional(),
  })
  .strict()
