/**
 * Analytics types (v3 `/analytics` endpoint).
 */

import type { RuleApiResponse } from '../../shared.types.js';

// ── Public SDK types ──────────────────────────────────────────────────────────

/** Object type constants for analytics queries. */
export const AnalyticsObjectTypes = {
  abTest:            'AB_TEST',
  campaign:          'CAMPAIGN',
  automail:          'AUTOMAIL',
  transactionalName: 'TRANSACTIONAL_NAME',
  journey:           'JOURNEY',
} as const;
export type AnalyticsObjectType = (typeof AnalyticsObjectTypes)[keyof typeof AnalyticsObjectTypes];

/** Metric constants for analytics queries. */
export const AnalyticsMetrics = {
  sent:        'sent',
  delivered:   'delivered',
  open:        'open',
  openUniq:    'open_uniq',
  click:       'click',
  clickUniq:   'click_uniq',
  totalBounce: 'total_bounce',
  hardBounce:  'hard_bounce',
  softBounce:  'soft_bounce',
  unsubscribe: 'unsubscribe',
  spam:        'spam',
} as const;
export type AnalyticsMetric = (typeof AnalyticsMetrics)[keyof typeof AnalyticsMetrics];

/** Message type constants for analytics queries. */
export const AnalyticsMessageTypes = {
  email:       'email',
  textMessage: 'text_message',
} as const;
export type AnalyticsMessageType = (typeof AnalyticsMessageTypes)[keyof typeof AnalyticsMessageTypes];

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
