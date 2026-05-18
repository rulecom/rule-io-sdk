/**
 * Format a date for the Rule.io API (YYYY-MM-DD).
 * Uses UTC — a local date near midnight may format as the next/previous day.
 *
 * Use this when setting date-type subscriber custom field values via
 * {@link RuleClient}.
 *
 * @example
 * ```typescript
 * client.setCustomFieldData(subscriberId, {
 *   [customFields['Order.Date']]: formatDateForRule(new Date()),
 * });
 * ```
 */
export function formatDateForRule(date: Date): string {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return date.toISOString().split('T')[0]!; // ISO string always contains 'T'
}
