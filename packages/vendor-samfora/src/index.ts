/**
 * Samfora Vendor Preset
 *
 * Swedish charitable-donation preset for Samfora integrations with Rule.io.
 *
 * Each email template lives in its own folder under `src/templates/<name>/`
 * with four files: `<name>.xml`, `<name>-copy.json`, `<name>.ts`,
 * `<name>.test.ts`. See `packages/templates/README.md` for the authoring
 * pattern. Default copy ships in Swedish; override per-render via
 * `copy: { ... }`.
 */

export { samforaPreset } from './preset.js';
export { SAMFORA_FIELDS } from './fields.js';
export { SAMFORA_TAGS } from './tags.js';
export type { SamforaFieldSchema, SamforaFieldNames } from './fields.js';
export type { SamforaTagSchema, SamforaTagNames } from './tags.js';

// Donation-confirmation (first gift) template.
export { createDonationConfirmationFirstTemplate } from './templates/donation-confirmation-first/donation-confirmation-first.js';
export type {
  DonationConfirmationFirstRenderOptions,
  DonationConfirmationFirstTemplate,
  DonationConfirmationFirstTemplateContext,
  DonationConfirmationFirstTemplateCopy,
} from './templates/donation-confirmation-first/donation-confirmation-first.js';

// Donation-confirmation (second gift) template.
export { createDonationConfirmationSecondTemplate } from './templates/donation-confirmation-second/donation-confirmation-second.js';
export type {
  DonationConfirmationSecondRenderOptions,
  DonationConfirmationSecondTemplate,
  DonationConfirmationSecondTemplateContext,
  DonationConfirmationSecondTemplateCopy,
} from './templates/donation-confirmation-second/donation-confirmation-second.js';

// Donation-confirmation (returning donor) template.
export { createDonationConfirmationReturningTemplate } from './templates/donation-confirmation-returning/donation-confirmation-returning.js';
export type {
  DonationConfirmationReturningRenderOptions,
  DonationConfirmationReturningTemplate,
  DonationConfirmationReturningTemplateContext,
  DonationConfirmationReturningTemplateCopy,
} from './templates/donation-confirmation-returning/donation-confirmation-returning.js';

// Monthly-donation-confirmation template.
export { createMonthlyDonationConfirmationTemplate } from './templates/monthly-donation-confirmation/monthly-donation-confirmation.js';
export type {
  MonthlyDonationConfirmationRenderOptions,
  MonthlyDonationConfirmationTemplate,
  MonthlyDonationConfirmationTemplateContext,
  MonthlyDonationConfirmationTemplateCopy,
} from './templates/monthly-donation-confirmation/monthly-donation-confirmation.js';

// Samfora welcome template (vendor-prefixed to avoid collision with
// vendor-shopify's `createWelcomeTemplate`).
export { createSamforaWelcomeTemplate } from './templates/welcome/welcome.js';
export type {
  SamforaWelcomeRenderOptions,
  SamforaWelcomeTemplate,
  SamforaWelcomeTemplateContext,
  SamforaWelcomeTemplateCopy,
} from './templates/welcome/welcome.js';

// Annual-tax-summary template.
export { createAnnualTaxSummaryTemplate } from './templates/annual-tax-summary/annual-tax-summary.js';
export type {
  AnnualTaxSummaryRenderOptions,
  AnnualTaxSummaryTemplate,
  AnnualTaxSummaryTemplateContext,
  AnnualTaxSummaryTemplateCopy,
} from './templates/annual-tax-summary/annual-tax-summary.js';
