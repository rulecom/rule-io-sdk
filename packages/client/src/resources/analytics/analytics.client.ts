/**
 * Analytics namespace client.
 *
 * Wraps the v3 `/analytics` endpoint. The `get` method enforces the same
 * input invariants the legacy `getAnalytics` did:
 *   - `objectIds` and `metrics` require `objectType`
 *   - both must be non-empty arrays when `objectType` is provided
 */

import { RuleClientError } from '../../errors.js';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';

import type {
  AnalyticsMetricValue,
  AnalyticsParams,
  AnalyticsQueryParams,
  AnalyticsResult,
  AnalyticsStat,
  AnalyticsStatWire,
  AnalyticsWireResponse,
} from './analytics.types.js';

export class AnalyticsClient extends BaseResource {
  /**
   * Retrieve analytics (dispatcher statistics) for one or more objects.
   *
   * Returns metric values (opens, clicks, bounces, etc.) for the specified
   * objects within the given date range.
   *
   * @param params - Analytics query params. Either a date-range-only
   *   query or a full query with `objectType`, `objectIds`, and `metrics`.
   * @returns Analytics result with per-object metric data.
   * @throws {RuleClientError} If `objectIds`/`metrics` are passed without
   *   `objectType`, or either is an empty array when `objectType` is set.
   *
   * @example
   * ```typescript
   * const result = await client.analytics.get({
   *   dateFrom: '2024-01-01',
   *   dateTo: '2024-01-31',
   *   objectType: 'CAMPAIGN',
   *   objectIds: ['123', '456'],
   *   metrics: ['sent', 'open_uniq', 'click_uniq'],
   * });
   *
   * for (const stat of result.data) {
   *   console.log(`Object ${stat.id}:`, stat.metrics);
   * }
   * ```
   */
  async get(params: AnalyticsParams): Promise<AnalyticsResult> {
    const { objectType, objectIds, metrics } = validateAndExtract(params);
    // The /analytics endpoint rejects any datetime form and accepts only bare
    // dates, even though sibling v3 endpoints accept ISO-8601 / datetime forms.
    // Strip any time portion so consumers using a shared date normalizer don't
    // have to special-case this endpoint.
    const stripTime = (d: string): string => d.split(/[ T]/)[0]!;
    const qs = buildQueryString({
      date_from: stripTime(params.dateFrom),
      date_to: stripTime(params.dateTo),
      object_type: objectType,
      'object_ids[]': objectIds,
      'metrics[]': metrics,
      message_type: params.messageType,
    });
    const res = await this.transport.get<AnalyticsWireResponse>(`/analytics${qs}`);

    return { data: (res.data ?? []).map(mapStatWireToEntity) };
  }
}

// ── Wire ↔ entity mapper ──────────────────────────────────────────────────────

/** @internal */
function mapStatWireToEntity(w: AnalyticsStatWire): AnalyticsStat {
  return {
    id: w.id,
    metrics: w.metrics as AnalyticsMetricValue[],
  };
}

// ── Input validation ──────────────────────────────────────────────────────────

interface ExtractedQuery {
  objectType: string | undefined;
  objectIds: string[] | undefined;
  metrics: string[] | undefined;
}

function validateAndExtract(params: AnalyticsParams): ExtractedQuery {
  const hasObjectType = 'objectType' in params && !!params.objectType;

  if (!hasObjectType) {
    const p = params as unknown as Record<string, unknown>;

    if (p.objectIds != null || p.metrics != null) {
      throw new RuleClientError(
        'objectIds and metrics require objectType to be provided'
      );
    }

    return { objectType: undefined, objectIds: undefined, metrics: undefined };
  }

  const full = params as AnalyticsQueryParams;

  if (!Array.isArray(full.objectIds) || full.objectIds.length === 0) {
    throw new RuleClientError(
      'objectIds must be a non-empty array when objectType is provided'
    );
  }

  if (!Array.isArray(full.metrics) || full.metrics.length === 0) {
    throw new RuleClientError(
      'metrics must be a non-empty array when objectType is provided'
    );
  }

  return {
    objectType: full.objectType,
    objectIds: full.objectIds,
    metrics: full.metrics,
  };
}
