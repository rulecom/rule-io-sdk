/**
 * Automation Configuration Definitions (v2)
 *
 * Provides types and utilities for structuring Rule.io automations.
 * Consumers create their own automation configs with their specific
 * brand styles, field mappings, and localized text.
 *
 * @module automation-configs-v2
 */

import type { RCMLDocument } from './types';
import type { BrandStyleConfig, CustomFieldMap } from './rcml';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for building templates.
 */
export interface TemplateConfigV2 {
  /** Brand style configuration */
  brandStyle: BrandStyleConfig;
  /** Custom field ID mapping */
  customFields: CustomFieldMap;
  /** Website base URL */
  websiteUrl: string;
}

/**
 * Full automation configuration.
 *
 * @example
 * ```typescript
 * import { RuleTags, createOrderConfirmationEmail } from 'rule-io-sdk';
 * import type { AutomationConfigV2 } from 'rule-io-sdk';
 *
 * const confirmationAutomation: AutomationConfigV2 = {
 *   id: 'order-confirmation',
 *   name: 'Order Confirmation',
 *   description: 'Sent when an order is confirmed',
 *   triggerTag: RuleTags.ORDER_CONFIRMED,
 *   subject: 'Your order is confirmed!',
 *   templateBuilder: (config) => createOrderConfirmationEmail({
 *     brandStyle: config.brandStyle,
 *     customFields: config.customFields,
 *     websiteUrl: config.websiteUrl,
 *     text: { ... },
 *     fieldNames: { ... },
 *   }),
 * };
 * ```
 */
export interface AutomationConfigV2 {
  /** Unique identifier for this automation */
  id: string;
  /** Display name in Rule.io */
  name: string;
  /** Description of what this automation does */
  description: string;
  /** Tag that triggers this automation */
  triggerTag: string;
  /** Delay before sending (seconds as string) */
  delayInSeconds?: string;
  /** Optional conditions for execution */
  conditions?: {
    hasTag?: string[];
    notHasTag?: string[];
  };
  /** Email subject */
  subject: string;
  /** Preview text shown in inbox */
  preheader?: string;
  /** Function to build the RCML template */
  templateBuilder: (config: TemplateConfigV2) => RCMLDocument;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Example/placeholder template config.
 * Consumers must replace this with their own configuration.
 *
 * @deprecated Create your own TemplateConfigV2 with your brand style,
 *   custom field IDs, and website URL.
 */
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfigV2 = {
  brandStyle: {
    brandStyleId: '',
    logoUrl: '',
    buttonColor: '#333333',
    bodyBackgroundColor: '#f3f3f3',
    sectionBackgroundColor: '#ffffff',
    brandColor: '#f6f8f9',
    headingFont: "'Helvetica Neue', sans-serif",
    headingFontUrl: '',
    bodyFont: "'Arial', sans-serif",
    bodyFontUrl: '',
    textColor: '#1A1A1A',
  },
  customFields: {},
  websiteUrl: 'https://example.com',
};

/**
 * Placeholder for backward compatibility.
 *
 * @deprecated Create your own automation configurations using
 *   AutomationConfigV2 type and the template builder functions.
 */
export const BOOKING_AUTOMATIONS_V2: AutomationConfigV2[] = [];

/**
 * Get automation by ID from a list of automations.
 */
export function getAutomationByIdV2(
  id: string,
  automations: AutomationConfigV2[] = BOOKING_AUTOMATIONS_V2
): AutomationConfigV2 | undefined {
  return automations.find((a) => a.id === id);
}

/**
 * Get automation by trigger tag from a list of automations.
 */
export function getAutomationByTriggerV2(
  tag: string,
  automations: AutomationConfigV2[] = BOOKING_AUTOMATIONS_V2
): AutomationConfigV2 | undefined {
  return automations.find((a) => a.triggerTag === tag);
}
