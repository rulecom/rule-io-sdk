/**
 * Brand-style configuration POJOs shared across the Rule.io SDK.
 *
 * These are plain data shapes — no runtime logic. They live in `@rule-io/core`
 * so vendor-contract types ({@link AutomationConfigV2}, {@link VendorPreset})
 * can reference them without pulling `@rule-io/rcml` into the dep graph.
 * `@rule-io/rcml`'s `brand-template.ts` re-exports them for backward-compat.
 */

/**
 * Maps Rule.io custom field paths (strings like `'Order.CustomerName'`) to
 * their account-specific numeric field IDs.
 *
 * @example
 * ```typescript
 * const customFields: CustomFieldMap = {
 *   'Order.CustomerName': 169233,
 *   'Order.OrderRef': 169234,
 *   'Order.TotalPrice': 169235,
 * };
 * ```
 */
export interface CustomFieldMap {
  [fieldName: string]: number;
}

/**
 * Colour + typography configuration used by the brand-template builders.
 *
 * Usually derived from a Rule.io brand-style API response via
 * `toBrandStyleConfig()` (exported from `@rule-io/rcml`).
 */
export interface BrandStyleConfig {
  /** Brand style ID from Rule.io */
  brandStyleId: string;
  /** Logo URL (optional — some brand styles have no logo) */
  logoUrl?: string;
  /** Button background color */
  buttonColor: string;
  /** Body background color */
  bodyBackgroundColor: string;
  /** Section background color */
  sectionBackgroundColor: string;
  /** Brand color for sections */
  brandColor: string;
  /** Heading font family */
  headingFont: string;
  /** Heading font URL (optional — system fonts have no URL) */
  headingFontUrl?: string;
  /** Body font family */
  bodyFont: string;
  /** Body font URL (optional — system fonts have no URL) */
  bodyFontUrl?: string;
  /** Text color */
  textColor: string;
  /** Button text/label color (default: '#FFFFFF') */
  buttonTextColor?: string;
  /** Social media links from brand style */
  socialLinks?: Array<{ name: string; href: string }>;
}

/**
 * Footer-section configuration — localisation overrides for the default
 * English link text produced by `createFooterSection()`.
 */
export interface FooterConfig {
  /** "View in browser" link text (default: 'View in browser') */
  viewInBrowserText?: string;
  /** Unsubscribe link text (default: 'Unsubscribe') */
  unsubscribeText?: string;
  /** Footer background color (default: '#f3f3f3') */
  backgroundColor?: string;
  /** Footer text color (default: '#666666') */
  textColor?: string;
  /** Footer text size (default: '10px') */
  fontSize?: string;
}
