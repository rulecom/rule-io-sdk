/**
 * Recipients types (v3 `/editor/recipients/*` endpoints).
 *
 * The recipients namespace exposes nested `segments`, `subscribers`, and
 * `tags` clients; these types are shared across all three.
 */

import type { RuleListResponse, RulePaginationParams } from '../../shared.types.js';

/** A tag or segment as returned by the recipients endpoints. */
export interface RuleTagSegment {
  id: number;
  name: string;
  has_next_item?: boolean;
}

/**
 * A subscriber as returned by the recipients endpoint.
 *
 * This is intentionally separate from `Subscriber` despite field overlap.
 * The recipients endpoint includes `has_next_item` (pagination cursor hint) and
 * `account_id`, which are absent from the standard v3 subscriber response.
 */
export interface RuleRecipientSubscriber {
  id: number;
  email?: string | null;
  phone?: string | null;
  has_next_item?: boolean;
  custom_identifier?: string | null;
  account_id?: number;
  created_at?: string;
  updated_at?: string;
  status?: string;
  language?: string;
}

/** Pagination query parameters for the recipients list endpoints. */
export type RuleRecipientsListParams = RulePaginationParams;

/** Response from the segments recipients endpoint. */
export type RuleSegmentListResponse = RuleListResponse<RuleTagSegment>;

/** Response from the subscribers recipients endpoint. */
export type RuleRecipientSubscriberListResponse = RuleListResponse<RuleRecipientSubscriber>;

/** Response from the tags recipients endpoint. */
export type RuleRecipientTagListResponse = RuleListResponse<RuleTagSegment>;
