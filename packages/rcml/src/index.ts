/**
 * RCML Module
 *
 * Tools for building Rule.io email templates using RCML.
 */

// Utilities
export { escapeHtml, sanitizeUrl, formatDateForRule } from './utils.js';

// Brand template utilities
export {
  // Brand style converter + preferred-style resolver
  toBrandStyleConfig,
  resolvePreferredBrandStyle,
  // Internal helper (exported for tests + advanced consumers)
  withTemplateContext,
  // Template builder
  createBrandTemplate,
  // Head builder
  createBrandHead,
  // Element builders
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createDefaultContentSection,
  createFooterSection,
  createBrandLoop,
  // Generic reusable section helpers
  createLogoSection,
  createGreetingSection,
  createCtaSection,
  createSummaryRowsSection,
  createStatusTrackerSection,
  createAddressBlock,
  // Placeholder helpers
  createPlaceholder,
  createLoopFieldPlaceholder,
  createTextNode,
  createDocWithPlaceholders,
  // Validation
  validateCustomFields,
} from './brand-template.js';

// Brand template types
export type {
  BrandStyleConfig,
  BrandStyleResource,
  BrandStyleListItem,
  BrandStyleResolverClient,
  ResolvedBrandStyle,
  CustomFieldMap,
  SimpleTemplateConfig,
  FooterConfig,
  StatusTrackerStep,
  CreateStatusTrackerSectionOptions,
  CreateAddressBlockOptions,
} from './brand-template.js';

// Vertical email templates live with their consuming vendor packages:
//   - Hospitality (`createReservation*`, `createFeedbackRequestEmail`) →
//       `@rule-io/vendor-bookzen`
//   - E-commerce (`createOrderConfirmation*`, `createShippingUpdate*`,
//       `createAbandonedCart*`, `createOrderCancellation*`) →
//       `@rule-io/vendor-shopify`
//   - Generic (`createWelcomeEmail`) → `@rule-io/vendor-shopify`
// They are still surfaced by the `@rule-io/sdk` meta-package via its
// `export * from '@rule-io/vendor-*'` lines.

// Automation config schema shared across vendors (canonical home: @rule-io/core).
export { getAutomationByIdV2, getAutomationByTriggerV2 } from '@rule-io/core';
export type { AutomationConfigV2, TemplateConfigV2 } from '@rule-io/core';

// Vendor interface types (canonical home: @rule-io/core).
export { resolveVendorAutomations } from '@rule-io/core';
export type {
  VendorPreset,
  VendorConsumerConfig,
  VendorAutomation,
  VendorFieldSchema,
  VendorFieldInfo,
  VendorTagSchema,
} from '@rule-io/core';

// The canonical rcml surface — schema, factories, types, validators,
// RFM/XML converters. Everything lives under `./email/` and is re-exported
// verbatim through the email barrel. The legacy `./elements.ts` + `./types.ts`
// have been retired; consumers use `createXxxElement` and `Rcml*` types.
export * from './email/index.js';
