/**
 * Samfora Vendor Preset
 *
 * Swedish charitable-donation preset for Samfora integrations with Rule.io.
 *
 * @example
 * ```typescript
 * import { samforaPreset, SAMFORA_FIELDS } from 'rule-io-sdk';
 *
 * const config = {
 *   brandStyle: myBrandStyle,
 *   customFields: {
 *     [SAMFORA_FIELDS.donorFirstName]: 200001,
 *     [SAMFORA_FIELDS.donationAmount]: 200002,
 *     [SAMFORA_FIELDS.donationDate]: 200003,
 *     [SAMFORA_FIELDS.donationRef]: 200004,
 *     [SAMFORA_FIELDS.causeName]: 200005,
 *     [SAMFORA_FIELDS.totalLifetimeAmount]: 200006,
 *     [SAMFORA_FIELDS.taxYear]: 200007,
 *     [SAMFORA_FIELDS.taxDeductibleAmount]: 200008,
 *     // Optional: donationCurrency, donationType
 *   },
 *   websiteUrl: 'https://samfora.org',
 * };
 *
 * samforaPreset.validateConfig(config);
 * const automations = samforaPreset.getAutomations(config);
 * ```
 */

import type { VendorPreset, VendorConsumerConfig, VendorFieldInfo } from '../types';
import { resolveVendorAutomations } from '../types';
import type { AutomationConfigV2 } from '../../automation-configs-v2';
import type { SamforaFieldSchema, SamforaFieldNames } from './fields';
import type { SamforaTagSchema } from './tags';
import { SAMFORA_FIELDS } from './fields';
import { SAMFORA_TAGS } from './tags';
import { createSamforaAutomations } from './automations';
import { RuleConfigError } from '../../errors';

const FIELD_DESCRIPTIONS: Record<SamforaFieldNames, string> = {
  donorFirstName: 'Donor first name',
  donationAmount: 'Amount of the donation',
  donationCurrency: 'Currency code (e.g. SEK, EUR)',
  donationDate: 'Date the donation was made',
  donationRef: 'Receipt / transaction reference',
  causeName: 'Charity or cause the gift supports',
  donationType: 'Donation type (one-time / monthly)',
  totalLifetimeAmount: "Donor's lifetime total (used in the annual tax summary)",
  taxYear: 'Tax year for the annual summary',
  taxDeductibleAmount: 'Deductible amount for Swedish gåvoskatteavdrag',
};

/**
 * Fields required by every automation `getAutomations()` returns.
 *
 * Includes the tax-summary's extra fields (`taxYear`, `totalLifetimeAmount`,
 * `taxDeductibleAmount`) so that `validateConfig` passing guarantees every
 * automation in the returned array is buildable. Earlier versions left the
 * tax fields out and validated them inside the template builder, which
 * created a contract mismatch — a consumer could pass validation and still
 * hit a runtime error while iterating.
 *
 * `donationCurrency` and `donationType` stay optional: currency is a nice-
 * to-have display token, and `donationType` isn't referenced by any of the
 * current template builders.
 */
const REQUIRED_FIELDS: readonly SamforaFieldNames[] = [
  'donorFirstName',
  'donationAmount',
  'donationDate',
  'donationRef',
  'causeName',
  'totalLifetimeAmount',
  'taxYear',
  'taxDeductibleAmount',
];

function validateSamforaConfig(config: VendorConsumerConfig): void {
  const missingFields: string[] = [];
  for (const logicalName of REQUIRED_FIELDS) {
    const fieldName = SAMFORA_FIELDS[logicalName];
    if (config.customFields[fieldName] === undefined) {
      missingFields.push(`${logicalName} ("${fieldName}")`);
    }
  }
  if (missingFields.length > 0) {
    throw new RuleConfigError(
      `samforaPreset: missing customFields entries for: ${missingFields.join(', ')}`,
    );
  }
}

function resolveAutomations(config: VendorConsumerConfig): AutomationConfigV2[] {
  return resolveVendorAutomations(createSamforaAutomations(), config);
}

/**
 * Samfora vendor preset for Rule.io.
 *
 * Provides pre-configured automations for the Samfora donation platform:
 * donation confirmation (first-time, second, and returning donors),
 * monthly donation confirmation, welcome, and annual tax summary.
 *
 * All default copy is in Swedish to match Samfora's market.
 */
export const samforaPreset: VendorPreset<SamforaFieldSchema, SamforaTagSchema> = {
  vendor: 'samfora',
  displayName: 'Samfora',
  vertical: 'donation',
  fields: SAMFORA_FIELDS,
  tags: SAMFORA_TAGS,

  getAutomations(config: VendorConsumerConfig): AutomationConfigV2[] {
    validateSamforaConfig(config);
    return resolveAutomations(config);
  },

  getAutomation(id: string, config: VendorConsumerConfig): AutomationConfigV2 | undefined {
    validateSamforaConfig(config);
    return resolveAutomations(config).find((a) => a.id === id);
  },

  validateConfig: validateSamforaConfig,

  getRequiredFields(): readonly VendorFieldInfo[] {
    return REQUIRED_FIELDS.map((logicalName) => ({
      logicalName,
      fieldName: SAMFORA_FIELDS[logicalName],
      description: FIELD_DESCRIPTIONS[logicalName],
    }));
  },
};
