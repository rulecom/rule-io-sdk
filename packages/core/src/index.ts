// Error classes + validation types.
export { RuleApiError, RuleConfigError } from './errors.js';
export type { RuleValidationErrors } from './errors.js';

// Opaque RCML document-root type — `@rule-io/rcml`'s RcmlDocument extends this.
export type { RCMLDocumentRoot } from './rcml-document-root.js';

// Brand-style / custom-field / footer POJOs shared across the SDK.
export type { BrandStyleConfig, CustomFieldMap, FooterConfig } from './brand-types.js';

// Automation configuration contract used by vendor presets.
export { getAutomationByIdV2, getAutomationByTriggerV2 } from './automation-configs-v2.js';
export type { AutomationConfigV2, TemplateConfigV2 } from './automation-configs-v2.js';

// Vendor preset layer — field/tag schemas, consumer config, automations, preset interface.
export { resolveVendorAutomations } from './vendor-types.js';
export type {
  VendorPreset,
  VendorConsumerConfig,
  VendorAutomation,
  VendorFieldSchema,
  VendorFieldInfo,
  VendorTagSchema,
} from './vendor-types.js';
