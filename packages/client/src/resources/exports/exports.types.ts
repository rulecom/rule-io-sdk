/**
 * Exports types (v3 `/export/*` endpoints).
 */

import type { RuleApiResponse } from '../../shared.types.js';

/**
 * Date range parameters for export endpoints.
 * Both fields are required ISO 8601 date strings.
 */
export interface RuleExportDateParams {
  date_from: string;
  date_to: string;
}

/**
 * Parameters for the dispatcher export endpoint.
 *
 * Note: The API enforces a maximum 1-day range between date_from and date_to.
 */
export type RuleExportDispatcherParams = RuleExportDateParams;

/**
 * Filter types for the statistics export `statistic_types` query parameter.
 *
 * Note: This differs from `RuleExportStatisticType` (response) intentionally.
 * The API accepts different values for filtering vs what it returns.
 * Filter includes 'browser'/'received'; response includes 'sent'.
 */
export type RuleExportStatisticFilterType =
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
 * Supports token-based pagination via `next_page_token`. Pass the token from
 * the previous response to fetch the next page of results.
 */
export interface RuleExportStatisticsParams extends RuleExportDateParams {
  /** Filter by statistic types */
  statistic_types?: RuleExportStatisticFilterType[];
  /** Pagination token from the previous response */
  next_page_token?: string;
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
export type RuleExportSubscriberParams = RuleExportDateParams;

/** A single dispatcher record from the export API. */
export interface RuleExportDispatcherRecord {
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

/**
 * Statistic type values returned in export statistic records.
 *
 * Note: This differs from `RuleExportStatisticFilterType` (query parameter) intentionally.
 * The API returns different values than it accepts for filtering.
 * Response includes 'sent'; filter includes 'browser'/'received'.
 */
export type RuleExportStatisticType =
  | 'open'
  | 'sent'
  | 'spam'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'link'
  | 'unsubscribed'
  | 'resubscribe';

/** Object types that can appear in export statistic records. */
export type RuleExportStatisticObjectType =
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
export interface RuleExportStatisticObject {
  id: string;
  name: string;
  type: RuleExportStatisticObjectType;
}

/** A single statistic record from the export API. */
export interface RuleExportStatisticRecord {
  statistic_id: string;
  statistic_type: RuleExportStatisticType;
  event_id: string;
  subscriber_id: string;
  message_type: string;
  created_at: string;
  object: RuleExportStatisticObject;
}

/** A single subscriber record from the export API. */
export interface RuleExportSubscriberRecord {
  created_at: string;
  updated_at: string;
  account_id: number;
  account_name: string;
  subscriber_id: number;
  email: string;
  phone_number: string;
  opt_in_date: string;
}

/** Response from the dispatcher export endpoint. */
export interface RuleExportDispatcherResponse extends RuleApiResponse {
  data?: RuleExportDispatcherRecord[];
}

/**
 * Response from the statistics export endpoint.
 *
 * Includes an optional `next_page_token` for retrieving subsequent pages.
 */
export interface RuleExportStatisticsResponse extends RuleApiResponse {
  data?: RuleExportStatisticRecord[];
  /** Token to pass as a parameter to fetch the next page of results */
  next_page_token?: string | null;
}

/** Response from the subscriber export endpoint. */
export interface RuleExportSubscriberResponse extends RuleApiResponse {
  data?: RuleExportSubscriberRecord[];
}
