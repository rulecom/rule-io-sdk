/**
 * Rule.io SDK Constants
 */

/**
 * Default API base URLs
 */
export const RULE_API_V2_BASE_URL = 'https://app.rule.io/api/v2';
export const RULE_API_V3_BASE_URL = 'https://app.rule.io/api/v3';

/**
 * Common Rule.io tags for e-commerce and hospitality.
 *
 * These are suggested tag names — you can use any string as a tag.
 * Using consistent tags across your automations makes segmentation easier.
 *
 * @example
 * ```typescript
 * await client.syncSubscriber({
 *   email: 'customer@example.com',
 *   tags: [RuleTags.ORDER_CONFIRMED, RuleTags.NEW_CUSTOMER],
 * });
 * ```
 */
export const RuleTags = {
  // Order lifecycle (generic e-commerce)
  ORDER_STARTED: 'order-started',
  ORDER_PENDING: 'order-pending',
  ORDER_CONFIRMED: 'order-confirmed',
  ORDER_CANCELLED: 'order-cancelled',
  ORDER_REMINDER: 'order-reminder',
  ORDER_COMPLETED: 'order-completed',
  CART_ABANDONED: 'cart-abandoned',
  SHIPPING_UPDATE: 'shipping-update',
  REVIEW_REQUEST: 'review-request',

  // Hospitality-specific
  ACCOMMODATION: 'accommodation',
  RESTAURANT: 'restaurant',
  EXPERIENCE: 'experience',

  // Customer segmentation
  RETURNING_CUSTOMER: 'returning-customer',
  NEW_CUSTOMER: 'new-customer',
} as const;

export type RuleTag = (typeof RuleTags)[keyof typeof RuleTags];
