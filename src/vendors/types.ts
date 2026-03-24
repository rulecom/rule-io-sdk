/**
 * Vendor Preset System
 *
 * Provides a two-layer abstraction for vendor integrations:
 * - **Vendor Preset** (shipped by SDK): field names, tags, automation flows, default text
 * - **Consumer Config** (provided at runtime): brand style, field IDs, URLs
 *
 * @module vendors
 */

import type { RCMLDocument } from '../types';
import type { FooterConfig } from '../rcml';
import type { AutomationConfigV2, TemplateConfigV2 } from '../automation-configs-v2';

// ============================================================================
// Schema Types
// ============================================================================

/**
 * Maps logical field names to Rule.io custom field path strings.
 *
 * Field names are determined by the vendor platform — every Shopify store
 * uses the same field structure because the webhook payload is the same.
 * The numeric IDs are per-account.
 *
 * @example
 * ```typescript
 * const fields = {
 *   customerFirstName: 'Order.CustomerName',
 *   orderRef: 'Order.OrderRef',
 * } as const satisfies VendorFieldSchema;
 * ```
 */
export interface VendorFieldSchema {
  readonly [logicalName: string]: string;
}

/**
 * Maps logical tag names to Rule.io tag strings.
 *
 * @example
 * ```typescript
 * const tags = {
 *   orderCompleted: 'OrderCompleted',
 *   cartInProgress: 'CartInProgress',
 * } as const satisfies VendorTagSchema;
 * ```
 */
export interface VendorTagSchema {
  readonly [logicalName: string]: string;
}

// ============================================================================
// Consumer Config
// ============================================================================

/**
 * Configuration that every consumer must provide, regardless of vendor.
 * These values are unique to each Rule.io account.
 *
 * @example
 * ```typescript
 * const config: VendorConsumerConfig = {
 *   brandStyle: myBrandStyle,
 *   customFields: {
 *     'Order.CustomerName': 169233,
 *     'Order.OrderRef': 169234,
 *   },
 *   websiteUrl: 'https://myshop.com',
 * };
 * ```
 */
export interface VendorConsumerConfig extends TemplateConfigV2 {
  /** Optional footer configuration for localization */
  footer?: FooterConfig;
}

// ============================================================================
// Vendor Automation
// ============================================================================

/**
 * A vendor automation definition pairs an automation config skeleton
 * with the template builder that produces the RCML.
 */
export interface VendorAutomation {
  /** Unique automation identifier within this vendor */
  id: string;
  /** Display name */
  name: string;
  /** Description of what this automation does */
  description: string;
  /** Tag name that triggers this automation */
  triggerTag: string;
  /** Delay before sending (seconds as string) */
  delayInSeconds?: string;
  /** Tag-based conditions */
  conditions?: {
    hasTag?: string[];
    notHasTag?: string[];
  };
  /** Email subject line */
  subject: string;
  /** Preview text shown in inbox */
  preheader?: string;
  /**
   * Builds the RCML template using the consumer's account-specific config.
   */
  templateBuilder: (config: VendorConsumerConfig) => RCMLDocument;
}

// ============================================================================
// Shared Utilities
// ============================================================================

/**
 * Resolve vendor automations into standard `AutomationConfigV2` objects.
 *
 * Maps each `VendorAutomation` to an `AutomationConfigV2` whose
 * `templateBuilder` merges the caller's `TemplateConfigV2` overrides
 * with the captured consumer config.
 *
 * @internal Used by vendor preset implementations.
 */
export function resolveVendorAutomations(
  automations: VendorAutomation[],
  config: VendorConsumerConfig,
): AutomationConfigV2[] {
  return automations.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    triggerTag: a.triggerTag,
    delayInSeconds: a.delayInSeconds,
    conditions: a.conditions,
    subject: a.subject,
    preheader: a.preheader,
    templateBuilder: (overrides: TemplateConfigV2) =>
      a.templateBuilder({
        ...config,
        ...overrides,
        customFields: { ...config.customFields, ...overrides.customFields },
      }),
  }));
}

// ============================================================================
// Vendor Preset
// ============================================================================

/** Description of a required field for setup documentation. */
export interface VendorFieldInfo {
  /** Logical name used in the preset (e.g., 'customerFirstName') */
  logicalName: string;
  /** Rule.io field path (e.g., 'Order.CustomerName') */
  fieldName: string;
  /** Human-readable description of what this field contains */
  description: string;
}

/**
 * A complete vendor preset. This is the top-level object that the SDK
 * ships for each supported vendor integration.
 *
 * @typeParam TFields - The vendor's field name schema type
 * @typeParam TTags - The vendor's tag schema type
 *
 * @example
 * ```typescript
 * import { shopifyPreset, SHOPIFY_FIELDS } from 'rule-io-sdk';
 *
 * shopifyPreset.validateConfig(config);
 * const automations = shopifyPreset.getAutomations(config);
 * ```
 */
export interface VendorPreset<
  TFields extends VendorFieldSchema = VendorFieldSchema,
  TTags extends VendorTagSchema = VendorTagSchema,
> {
  /** Vendor identifier (e.g., 'shopify', 'bookzen') */
  readonly vendor: string;
  /** Human-readable vendor name */
  readonly displayName: string;
  /** Business vertical */
  readonly vertical: 'ecommerce' | 'hospitality' | (string & {});

  /**
   * The field names this vendor uses in Rule.io.
   * Consumers must create these fields in their Rule.io account
   * and provide the numeric IDs via `customFields` in {@link VendorConsumerConfig}.
   */
  readonly fields: TFields;

  /**
   * The tag names this vendor uses.
   * Consumers should create these tags in their Rule.io account.
   */
  readonly tags: TTags;

  /**
   * Get all automations resolved with the consumer's config.
   * Returns standard {@link AutomationConfigV2} objects ready for deployment.
   *
   * @throws {RuleConfigError} if required custom fields are missing
   */
  getAutomations(config: VendorConsumerConfig): AutomationConfigV2[];

  /**
   * Get a single automation by ID, resolved with consumer config.
   */
  getAutomation(id: string, config: VendorConsumerConfig): AutomationConfigV2 | undefined;

  /**
   * Validate that a consumer's config has entries for all required fields.
   *
   * @throws {RuleConfigError} if any required fields are missing from customFields
   */
  validateConfig(config: VendorConsumerConfig): void;

  /**
   * Get the list of fields the consumer needs to map.
   * Useful for setup wizards, documentation, or onboarding flows.
   */
  getRequiredFields(): readonly VendorFieldInfo[];
}
