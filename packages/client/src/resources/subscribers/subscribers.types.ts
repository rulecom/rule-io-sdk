/**
 * Subscriber types — both the legacy v2 shapes (used by `subscribers.sync`,
 * `subscribers.getByEmail`, `subscribers.getById`, `subscribers.getByPhone`,
 * `subscribers.getFields`, `subscribers.getTagNames`) and the v3 shapes (used
 * by `create`, `delete`, `addTags`, `removeTag`, bulk operations,
 * block/unblock).
 */

import type { RuleApiResponse } from '../../shared.types.js';

// ── v2 ──────────────────────────────────────────────────────────────────────

/**
 * Subscriber fields to sync to Rule.io.
 *
 * Keys are bare field names (e.g., 'FirstName', 'OrderRef'). The
 * `fieldGroupPrefix` passed to `sync()` is prepended to form the full
 * Rule.io key (e.g., 'Booking.FirstName').
 */
export interface RuleSubscriberFields {
  [key: string]: string | number | undefined;
}

export interface RuleSubscriber {
  email: string;
  fields?: RuleSubscriberFields;
  tags?: string[];
}

export interface SubscriberSegmentV2 {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  sync_at?: string;
}

export interface GetSubscriberV2Response extends RuleApiResponse {
  subscriber: {
    id: number;
    email: string;
    phone_number?: string;
    language?: string;
    opted_in?: boolean;
    created_at?: string;
    updated_at?: string;
    tags?: Array<{ id: number; name: string }>;
    suppressed?: unknown[];
    syncAtSegments?: SubscriberSegmentV2[];
  };
}

export interface RuleSubscriberFieldsResponse extends RuleApiResponse {
  groups?: Array<{
    name: string;
    fields: Array<{ name: string; value: string | null }>;
  }>;
}

export interface RuleSubscriberTagsResponse extends RuleApiResponse {
  tags?: Array<{ name: string }>;
}

// ── v3 ──────────────────────────────────────────────────────────────────────

/**
 * Subscriber as returned by the v3 API.
 *
 * Note: The API returns `phone` in responses but accepts `phone_number` in requests.
 * This matches the Rule.io API naming convention.
 */
export interface RuleSubscriberV3 {
  id: number;
  email?: string | null;
  phone?: string | null;
  custom_identifier?: string | null;
  status?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

/** Request body for creating a subscriber via the v3 API. */
export interface CreateSubscriberV3Request {
  email?: string | null;
  phone_number?: string | null;
  custom_identifier?: string;
  status?: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  language?: string;
}

/** Response from the v3 subscriber create endpoint. */
export interface CreateSubscriberV3Response {
  data: {
    id: number;
    email: string | null;
    phone: string | null;
    has_next_item?: boolean;
    custom_identifier?: string | null;
    account_id?: number;
    created_at?: string;
    updated_at?: string;
    status?: string;
    language?: string;
  };
}

/**
 * Identifier for a subscriber in bulk v3 operations.
 *
 * Exactly one identifier field must be provided. The API validates this
 * server-side and rejects requests with zero or multiple identifiers.
 * All fields are typed as optional to keep the interface ergonomic for
 * consumers who build the object dynamically.
 */
export interface RuleBulkSubscriberIdentifier {
  email?: string;
  phone_number?: string;
  id?: number;
  custom_identifier?: string;
}

/** Request body for bulk tag operations (add/remove tags for multiple subscribers). */
export interface RuleBulkTagsRequest {
  subscribers: RuleBulkSubscriberIdentifier[];
  tags: (string | number)[];
}

/** Request body for adding tags to a single subscriber via the v3 API. */
export interface RuleSubscriberTagsV3Request {
  tags: (string | number)[];
  automation?: 'send' | 'force' | 'reset' | null;
  sync_subscriber?: boolean;
}
