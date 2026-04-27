/**
 * Bookzen Vendor Preset
 *
 * Reference hospitality preset for Bookzen integrations with Rule.io.
 *
 * @example
 * ```typescript
 * import { bookzenPreset, BOOKZEN_FIELDS } from 'rule-io-sdk';
 *
 * const config = {
 *   brandStyle: myBrandStyle,
 *   customFields: {
 *     [BOOKZEN_FIELDS.guestFirstName]: 100001,
 *     [BOOKZEN_FIELDS.bookingRef]: 100002,
 *     // ...
 *   },
 *   websiteUrl: 'https://myhotel.com',
 * };
 *
 * bookzenPreset.validateConfig(config);
 * const automations = bookzenPreset.getAutomations(config);
 * ```
 */

import type { VendorPreset, VendorConsumerConfig, VendorFieldInfo } from '@rule-io/rcml';
import { resolveVendorAutomations } from '@rule-io/rcml';
import type { AutomationConfigV2 } from '@rule-io/rcml';
import type { BookzenFieldSchema, BookzenFieldNames } from './fields.js';
import type { BookzenTagSchema } from './tags.js';
import { BOOKZEN_FIELDS } from './fields.js';
import { BOOKZEN_TAGS } from './tags.js';
import { createBookzenAutomations } from './automations.js';
import { RuleConfigError } from '@rule-io/core';

const FIELD_DESCRIPTIONS: Record<BookzenFieldNames, string> = {
  guestFirstName: 'Guest first name',
  bookingRef: 'Booking reference number',
  serviceType: 'Service type (accommodation, restaurant, experience)',
  checkInDate: 'Check-in or arrival date',
  checkOutDate: 'Check-out or departure date',
  totalGuests: 'Total number of guests',
  totalPrice: 'Total booking price',
  roomName: 'Room or table name',
};

function validateBookzenConfig(config: VendorConsumerConfig): void {
  const missingFields: string[] = [];
  for (const [logicalName, fieldName] of Object.entries(BOOKZEN_FIELDS)) {
    if (config.customFields[fieldName] === undefined) {
      missingFields.push(`${logicalName} ("${fieldName}")`);
    }
  }
  if (missingFields.length > 0) {
    throw new RuleConfigError(
      `bookzenPreset: missing customFields entries for: ${missingFields.join(', ')}`
    );
  }
}

function resolveAutomations(config: VendorConsumerConfig): AutomationConfigV2[] {
  return resolveVendorAutomations(createBookzenAutomations(), config);
}

/**
 * Bookzen vendor preset for Rule.io.
 *
 * Provides pre-configured automations for hospitality flows:
 * reservation confirmation, cancellation, reminder, feedback request,
 * and reservation request (pending approval).
 */
export const bookzenPreset: VendorPreset<BookzenFieldSchema, BookzenTagSchema> = {
  vendor: 'bookzen',
  displayName: 'Bookzen',
  vertical: 'hospitality',
  fields: BOOKZEN_FIELDS,
  tags: BOOKZEN_TAGS,

  getAutomations(config: VendorConsumerConfig): AutomationConfigV2[] {
    validateBookzenConfig(config);
    return resolveAutomations(config);
  },

  getAutomation(id: string, config: VendorConsumerConfig): AutomationConfigV2 | undefined {
    validateBookzenConfig(config);
    return resolveAutomations(config).find((a) => a.id === id);
  },

  validateConfig: validateBookzenConfig,

  getRequiredFields(): readonly VendorFieldInfo[] {
    return Object.entries(BOOKZEN_FIELDS).map(([logicalName, fieldName]) => ({
      logicalName,
      fieldName,
      description: FIELD_DESCRIPTIONS[logicalName as BookzenFieldNames],
    }));
  },
};
