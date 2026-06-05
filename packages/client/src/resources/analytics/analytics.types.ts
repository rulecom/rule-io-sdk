/**
 * Analytics types (v3 `/analytics` endpoint).
 */

import type { RuleApiResponse } from '../../shared.types.js';

// ── Public SDK types ──────────────────────────────────────────────────────────

/** Object type for analytics queries. */
export type AnalyticsObjectType =
  | 'AB_TEST'
  | 'CAMPAIGN'
  | 'AUTOMAIL'
  | 'TRANSACTIONAL_NAME'
  | 'JOURNEY';

/** Available metrics for analytics queries. */
export type AnalyticsMetric =
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
export type AnalyticsMessageType = 'email' | 'text_message';

/**
 * Base date range params shared by all analytics queries.
 * All date strings must be in `YYYY-MM-DD` format.
 * The time portion is stripped automatically if a datetime string is provided.
 */
export interface AnalyticsDateRangeParams {
  /** Start date (inclusive), e.g. `'2024-01-01'`. */
  dateFrom: string;
  /** End date (inclusive), e.g. `'2024-01-31'`. */
  dateTo: string;
  /** Optional filter by message type. */
  messageType?: AnalyticsMessageType;
}

/**
 * Full analytics query params with object type, IDs, and metrics.
 *
 * `objectIds` are strings (not numbers), matching the OpenAPI spec.
 * When `objectType` is provided, both `objectIds` and `metrics` must
 * be non-empty arrays.
 */
export interface AnalyticsQueryParams extends AnalyticsDateRangeParams {
  /** The type of object to query analytics for. */
  objectType: AnalyticsObjectType;
  /** IDs of the objects to query (string array, not numbers). */
  objectIds: string[];
  /** Metrics to retrieve (at least one required). */
  metrics: AnalyticsMetric[];
}

/**
 * Params for the analytics endpoint.
 *
 * Either provide just a date range ({@link AnalyticsDateRangeParams}),
 * or a full query with `objectType`, `objectIds`, and `metrics`
 * ({@link AnalyticsQueryParams}).
 */
export type AnalyticsParams = AnalyticsDateRangeParams | AnalyticsQueryParams;

/** A single metric value within an {@link AnalyticsStat}. */
export interface AnalyticsMetricValue {
  metric: AnalyticsMetric;
  value: number;
}

/** A single object's analytics statistics. */
export interface AnalyticsStat {
  /** The object ID. */
  id: string | number;
  /** Metric values for this object. */
  metrics: AnalyticsMetricValue[];
}

/** Result from the analytics endpoint. */
export interface AnalyticsResult {
  data: AnalyticsStat[];
}

// ── Internal wire types ───────────────────────────────────────────────────────

/** @internal */
export interface AnalyticsStatWire {
  id: string | number;
  metrics: Array<{ metric: string; value: number }>;
}

/** @internal */
export interface AnalyticsWireResponse extends RuleApiResponse {
  data?: AnalyticsStatWire[];
}
