/**
 * Analytics types (v3 `/analytics` endpoint).
 */

import type { RuleApiResponse } from '../../shared.types.js';

/** Object type for analytics queries. */
export type RuleAnalyticsObjectType =
  | 'AB_TEST'
  | 'CAMPAIGN'
  | 'AUTOMAIL'
  | 'TRANSACTIONAL_NAME'
  | 'JOURNEY';

/** Available metrics for analytics queries. */
export type RuleAnalyticsMetric =
  | 'open'
  | 'open_uniq'
  | 'sent'
  | 'delivered'
  | 'click'
  | 'click_uniq'
  | 'total_bounce'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'unsubscribe'
  | 'spam';

/** Message type filter for analytics queries. */
export type RuleAnalyticsMessageType = 'email' | 'text_message';

/**
 * Base date range shared by all analytics queries.
 * All date strings must be in `YYYY-MM-DD` format.
 */
export interface RuleAnalyticsDateRange {
  /** Start date (inclusive), e.g. "2024-01-01" */
  date_from: string;
  /** End date (inclusive), e.g. "2024-01-31" */
  date_to: string;
  /** Optional filter by message type */
  message_type?: RuleAnalyticsMessageType;
}

/**
 * Full analytics query with object type, IDs, and metrics.
 * `object_ids` are strings (not numbers), matching the OpenAPI spec.
 */
export interface RuleAnalyticsFullQuery extends RuleAnalyticsDateRange {
  /** The type of object to query analytics for */
  object_type: RuleAnalyticsObjectType;
  /** IDs of the objects to query (string array, not numbers) */
  object_ids: string[];
  /** Metrics to retrieve (at least one required) */
  metrics: RuleAnalyticsMetric[];
}

/**
 * Query parameters for the analytics endpoint.
 *
 * Either provide just a date range, or a full query with object_type,
 * object_ids, and metrics together.
 */
export type RuleAnalyticsParams = RuleAnalyticsDateRange | RuleAnalyticsFullQuery;

/** A single object's analytics statistics. */
export interface RuleAnalyticsStat {
  /** The object ID */
  id: string | number;
  /** Metric values for this object */
  metrics: Array<{
    metric: RuleAnalyticsMetric;
    value: number;
  }>;
}

/** Response from the analytics endpoint. */
export interface RuleAnalyticsResponse extends RuleApiResponse {
  data?: RuleAnalyticsStat[];
}
