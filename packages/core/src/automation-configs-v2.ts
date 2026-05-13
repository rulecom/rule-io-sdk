/**
 * Automation configuration contract shared between vendor presets and the
 * Rule.io platform.
 *
 * These types describe *how* a vendor preset declares an automation
 * (trigger, subject, template-builder callback, etc.). They intentionally
 * live in `@rule-io/core` rather than `@rule-io/rcml` so vendor packages
 * don't have to depend on rcml just for the contract shape.
 *
 * @module automation-configs-v2
 */

import type { CustomFieldMap } from './brand-types.js'
import type { RCMLDocumentRoot } from './rcml-document-root.js'
import type { EmailTheme } from './theme-types.js'

/**
 * Configuration for building templates.
 *
 * The `theme` field is an {@link EmailTheme} — the typed theme
 * abstraction applied to rcml documents via `applyTheme`. Consumers
 * convert their brand-style source (Rule.io API response, hand-rolled
 * config) to an `EmailTheme` before passing it in. `@rule-io/client`
 * ships `emailThemeFromBrandStyle` for the API-response case.
 */
export interface TemplateConfigV2 {
  /** Typed email theme applied to the built RCML document. */
  theme: EmailTheme
  /** Custom field ID mapping */
  customFields: CustomFieldMap
  /** Website base URL */
  websiteUrl: string
}

/**
 * Full automation configuration.
 *
 * `templateBuilder` returns {@link RCMLDocumentRoot} at the type level so the
 * contract doesn't depend on `@rule-io/rcml`; concrete implementations in
 * `@rule-io/rcml` / vendor packages return a full `RcmlDocument` (a subtype),
 * which TypeScript accepts by function-return covariance.
 *
 * @example
 * ```typescript
 * import { RuleTags, createAbandonedCartEmail } from '@rule-io/sdk';
 * import type { AutomationConfigV2 } from '@rule-io/sdk';
 *
 * const abandonedCartAutomation: AutomationConfigV2 = {
 *   id: 'abandoned-cart',
 *   name: 'Abandoned Cart',
 *   description: 'Sent when a cart is abandoned',
 *   triggerTag: RuleTags.CART_IN_PROGRESS,
 *   subject: 'You left something behind!',
 *   templateBuilder: (config) => createAbandonedCartEmail({
 *     theme: config.theme,
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
  id: string
  /** Display name in Rule.io */
  name: string
  /** Description of what this automation does */
  description: string
  /** Tag that triggers this automation */
  triggerTag: string
  /** Delay before sending (seconds as string) */
  delayInSeconds?: string
  /** Optional conditions for execution */
  conditions?: {
    hasTag?: string[]
    notHasTag?: string[]
  }
  /** Email subject */
  subject: string
  /** Preview text shown in inbox */
  preheader?: string
  /** Function to build the RCML template */
  templateBuilder: (config: TemplateConfigV2) => RCMLDocumentRoot
}

/**
 * Get automation by ID from a list of automations.
 */
export function getAutomationByIdV2(
  id: string,
  automations: AutomationConfigV2[],
): AutomationConfigV2 | undefined {
  return automations.find((a) => a.id === id)
}

/**
 * Get automation by trigger tag from a list of automations.
 */
export function getAutomationByTriggerV2(
  tag: string,
  automations: AutomationConfigV2[],
): AutomationConfigV2 | undefined {
  return automations.find((a) => a.triggerTag === tag)
}
