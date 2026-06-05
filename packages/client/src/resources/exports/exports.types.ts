/**
 * Exports types (v3 `/export/*` endpoints).
 */

import type { RuleApiResponse } from '../../shared.types.js';

// ── Public SDK types ──────────────────────────────────────────────────────────

/**
 * Date range input shared by all export endpoints.
 * Both fields are required ISO 8601 date strings.
 */
export interface ExportDateRange {
  dateFrom: string;
  dateTo: string;
}

/**
 * Parameters for the dispatcher export endpoint.
 *
 * Note: The API enforces a maximum 1-day range between `dateFrom` and `dateTo`.
 */
export type ExportDispatchersParams = ExportDateRange;

/**
 * Filter types for the statistics export `statisticTypes` parameter.
 *
 * Note: This differs from {@link ExportStatisticType} (response) intentionally.
 * The API accepts different values for filtering vs what it returns.
 * Filter includes `'browser'` and `'received'`; response includes `'sent'`.
 */
export type ExportStatisticFilterType =
  | 'open'
  | 'link'
  | 'browser'
  | 'received'
  | 'unsubscribed'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'spam'
  | 'resubscribe';

/**
 * Parameters for the statistics export endpoint.
 *
 * Supports token-based pagination via `nextPageToken`. Pass the token from
 * the previous response to fetch the next page of results.
 */
export interface ExportStatisticsParams extends ExportDateRange {
  /** Filter by statistic types. */
  statisticTypes?: ExportStatisticFilterType[];
  /** Pagination token from the previous response. */
  nextPageToken?: string;
  /**
   * Automatically decode base64-encoded `object.name` for records where
   * `object.type === 'message'`. Rule.io currently returns these names
   * base64-encoded while every other object type returns plain text.
   *
   * Default: `true`. A round-trip guard passes through values that do not
   * cleanly re-encode as canonical base64, but it cannot distinguish between
   * intentionally base64-encoded names and plain-text names that also happen
   * to be valid base64.
   *
   * Set to `false` to preserve raw API values exactly, including message
   * names that look like base64 (for example when debugging or if upstream
   * behavior changes).
   */
  decodeNames?: boolean;
}

/** Parameters for the subscriber export endpoint. */
export type ExportSubscribersParams = ExportDateRange;

/**
 * Statistic type values returned in export statistic records.
 *
 * Note: This differs from {@link ExportStatisticFilterType} (query parameter) intentionally.
 * The API returns different values than it accepts for filtering.
 * Response includes `'sent'`; filter includes `'browser'` and `'received'`.
 */
export type ExportStatisticType =
  | 'open'
  | 'sent'
  | 'spam'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'link'
  | 'unsubscribed'
  | 'resubscribe';

/** Object types that can appear in export statistic records. */
export type ExportStatisticObjectType =
  | 'campaign'
  | 'transaction'
  | 'automation'
  | 'journey'
  | 'lane'
  | 'content_set'
  | 'variable_set'
  | 'message'
  | 'link'
  | 'subscriber';

/** A related object referenced from an export statistic record. */
export interface ExportStatisticObject {
  id: string;
  name: string;
  type: ExportStatisticObjectType;
}

/** A single dispatcher record from the export API. */
export interface ExportDispatcherRecord {
  createdAt: string | null;
  updatedAt: string | null;
  accountId: number;
  accountName: string;
  dispatcherId: number;
  dispatcherName: string;
  dispatcherType: string;
  channel: string;
  tags?: string | null;
  filters: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent?: string | null;
  journeyId: string;
  journeyName: string;
  variableSetIds: string;
}

/** A single statistic record from the export API. */
export interface ExportStatisticRecord {
  statisticId: string;
  statisticType: ExportStatisticType;
  eventId: string;
  subscriberId: string;
  messageType: string;
  createdAt: string;
  object: ExportStatisticObject;
}

/** A single subscriber record from the export API. */
export interface ExportSubscriberRecord {
  createdAt: string;
  updatedAt: string;
  accountId: number;
  accountName: string;
  subscriberId: number;
  email: string;
  phoneNumber: string;
  optInDate: string;
}

/**
 * Result from the statistics export endpoint.
 *
 * Includes an optional `nextPageToken` for retrieving subsequent pages.
 */
export interface ExportStatisticsResult {
  data: ExportStatisticRecord[];
  /** Token to pass as `nextPageToken` to fetch the next page. */
  nextPageToken?: string | null;
}

// ── Internal wire types ───────────────────────────────────────────────────────

/** @internal */
export interface ExportDispatcherWire {
  created_at: string | null;
  updated_at: string | null;
  account_id: number;
  account_name: string;
  dispatcher_id: number;
  dispatcher_name: string;
  dispatcher_type: string;
  channel: string;
  tags?: string | null;
  filters: string;
  utm_campaign: string;
  utm_term: string;
  utm_content?: string | null;
  journey_id: string;
  journey_name: string;
  variable_set_ids: string;
}

/** @internal */
export interface ExportStatisticObjectWire {
  id: string;
  name: string;
  type: ExportStatisticObjectType;
}

/** @internal */
export interface ExportStatisticWire {
  statistic_id: string;
  statistic_type: ExportStatisticType;
  event_id: string;
  subscriber_id: string;
  message_type: string;
  created_at: string;
  object: ExportStatisticObjectWire;
}

/** @internal */
export interface ExportSubscriberWire {
  created_at: string;
  updated_at: string;
  account_id: number;
  account_name: string;
  subscriber_id: number;
  email: string;
  phone_number: string;
  opt_in_date: string;
}

/** @internal */
export interface ExportDispatchersWireResponse extends RuleApiResponse {
  data?: ExportDispatcherWire[];
}

/** @internal */
export interface ExportStatisticsWireResponse extends RuleApiResponse {
  data?: ExportStatisticWire[];
  next_page_token?: string | null;
}

/** @internal */
export interface ExportSubscribersWireResponse extends RuleApiResponse {
  data?: ExportSubscriberWire[];
}
