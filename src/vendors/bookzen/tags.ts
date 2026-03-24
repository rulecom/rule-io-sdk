/**
 * Bookzen Tag Definitions
 *
 * Standard tags used by Bookzen hospitality integrations with Rule.io.
 */

import type { VendorTagSchema } from '../types';

/**
 * Bookzen tags for Rule.io automations.
 *
 * @example
 * ```typescript
 * import { BOOKZEN_TAGS } from 'rule-io-sdk';
 *
 * await client.syncSubscriber({
 *   email: 'guest@example.com',
 *   tags: [BOOKZEN_TAGS.accommodation],
 * });
 * ```
 */
export const BOOKZEN_TAGS = {
  accommodation: 'accommodation',
  restaurant: 'restaurant',
  experience: 'experience',
  newCustomer: 'new-customer',
  returningCustomer: 'returning-customer',
} as const satisfies VendorTagSchema;

export type BookzenTagNames = typeof BOOKZEN_TAGS;
