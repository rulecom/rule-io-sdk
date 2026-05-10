/**
 * Bookzen Automation Definitions
 *
 * Placeholder. The pre-built bookzen automations have been retired —
 * downstream code now builds template contexts explicitly (via
 * `customField` / `loopValue` from `@rule-io/templates`) and calls
 * the template factories directly when wiring automations through
 * `@rule-io/client`.
 */

import type { VendorAutomation } from '@rule-io/core';

/**
 * Bookzen automation definitions. Currently empty; see module JSDoc.
 */
export function createBookzenAutomations(): VendorAutomation[] {
  return [];
}
