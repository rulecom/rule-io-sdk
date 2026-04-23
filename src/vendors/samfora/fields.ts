/**
 * Samfora Custom Field Definitions
 *
 * Field names used by the Samfora donation platform integration.
 * Samfora is a Swedish charitable giving platform.
 */

import type { VendorFieldSchema } from '../types';

/**
 * Samfora field names for Rule.io custom fields.
 *
 * Follows Rule.io praxis for custom-field groups:
 * - **Subscriber group (flat)** — donor identity fields that get
 *   overwritten on each sync (e.g. `Subscriber.FirstName`).
 * - **Donation group (historical)** — per-donation event data that
 *   appends a new record on each sync (`Donation.Amount`,
 *   `Donation.Date`, `Donation.Reference`, etc.).
 *
 * @example
 * ```typescript
 * import { SAMFORA_FIELDS } from 'rule-io-sdk';
 *
 * const customFields = {
 *   [SAMFORA_FIELDS.donorFirstName]: 200001,
 *   [SAMFORA_FIELDS.donationAmount]: 200002,
 *   // ... map all fields to your Rule.io numeric IDs
 * };
 * ```
 */
export const SAMFORA_FIELDS = {
  // Subscriber group — flat, overwritten per sync
  donorFirstName: 'Subscriber.FirstName',

  // Donation group — historical, append-only
  donationAmount: 'Donation.Amount',
  donationCurrency: 'Donation.Currency',
  donationDate: 'Donation.Date',
  donationRef: 'Donation.Reference',
  causeName: 'Donation.CauseName',
  donationType: 'Donation.Type',
  totalLifetimeAmount: 'Donation.TotalLifetime',
  taxYear: 'Donation.TaxYear',
  taxDeductibleAmount: 'Donation.TaxDeductible',
} as const satisfies VendorFieldSchema;

/** Object type of the Samfora field schema. */
export type SamforaFieldSchema = typeof SAMFORA_FIELDS;

/** Union of logical Samfora field name keys. */
export type SamforaFieldNames = keyof SamforaFieldSchema;
