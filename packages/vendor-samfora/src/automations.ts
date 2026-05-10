/**
 * Samfora Automation Definitions
 *
 * Placeholder. The pre-built samfora automations have been retired —
 * downstream code now builds template contexts explicitly (via
 * `customField` from `@rule-io/templates`) and calls the template
 * factories directly when wiring automations through `@rule-io/client`.
 * See `packages/templates/README.md` for the authoring pattern.
 */

import type { VendorAutomation } from '@rule-io/core';

/**
 * Samfora automation definitions. Currently empty; see module JSDoc.
 */
export function createSamforaAutomations(): VendorAutomation[] {
  return [];
}
