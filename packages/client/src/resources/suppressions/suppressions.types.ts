/**
 * Suppressions types (v3 `/suppressions` endpoint).
 */

/**
 * Identifier for a subscriber in bulk suppression operations.
 *
 * At least one identifier must be provided. The API resolves the subscriber
 * using whichever identifier is supplied.
 *
 * **Note:** All properties are marked optional for ergonomic use, but the
 * Rule.io API requires at least one identifier (email, phone_number, id, or
 * custom_identifier) per subscriber. Requests with empty identifier objects
 * will be rejected server-side.
 */
export interface RuleSuppressionSubscriberIdentifier {
  /** Subscriber email address */
  email?: string;
  /** Subscriber phone number */
  phone_number?: string;
  /** Subscriber numeric ID in Rule.io */
  id?: number;
  /** Custom identifier for the subscriber */
  custom_identifier?: string;
}

/**
 * Request body for creating or deleting suppressions.
 *
 * Subscribers are identified by one of: email, phone_number, id, or custom_identifier.
 * A maximum of 1000 subscribers can be included per request.
 */
export interface RuleSuppressionRequest {
  /** Subscribers to suppress or unsuppress (max 1000 per request) */
  subscribers: RuleSuppressionSubscriberIdentifier[];
  /** If omitted, all marketing channels are suppressed/unsuppressed */
  message_types?: ('email' | 'text_message')[];
  /** URL called via GET when async processing completes */
  callback_url?: string;
}
