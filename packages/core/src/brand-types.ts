/**
 * Brand-style configuration POJOs shared across the Rule.io SDK.
 *
 * Plain data shapes — no runtime logic. Live in `@rule-io/core` so
 * vendor-contract types ({@link AutomationConfigV2}, {@link VendorPreset})
 * can reference them without pulling `@rule-io/rcml` into the dep graph.
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
 * Footer-section configuration — localisation overrides for the default
 * English link text produced by `footerSection()` in
 * `@rule-io/rcml`'s brand-elements module.
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
