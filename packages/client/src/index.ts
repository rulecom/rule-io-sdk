/**
 * Rule.io HTTP API client.
 *
 * Wraps the v2 and v3 endpoints of the Rule.io email-marketing API. Use this
 * package to create subscribers, manage automations, send campaign emails,
 * and read analytics. Composes with `@rule-io/rcml` to build templates and
 * with the `@rule-io/vendor-*` preset packages for platform-specific flows.
 */

export { RuleClient } from './client.js';
export { RULE_API_V2_BASE_URL, RULE_API_V3_BASE_URL, RuleTags } from './constants.js';
export type { RuleTag } from './constants.js';
export type * from './types.js';
export * from './brand-style-to-theme.js';
