/**
 * Analytics namespace client.
 *
 * Wraps the v3 `/analytics` endpoint. The `get` method enforces the same
 * input invariants the legacy `getAnalytics` did:
 *   - `object_ids` and `metrics` require `object_type`
 *   - both must be non-empty arrays when `object_type` is provided
 */

import { RuleConfigError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';

import type {
  RuleAnalyticsFullQuery,
  RuleAnalyticsParams,
  RuleAnalyticsResponse,
} from './analytics.types.js';

export class AnalyticsClient extends BaseResource {
  /**
   * Retrieve analytics (dispatcher statistics) for one or more objects.
   *
   * Returns metric values (opens, clicks, bounces, etc.) for the specified
   * objects within the given date range.
   *
   * @param params - Analytics query parameters. Either a date-range-only
   *   query or a full query with `object_type`, `object_ids`, and `metrics`.
   * @returns Analytics response with per-object metric data.
   * @throws {RuleConfigError} If `object_ids`/`metrics` are passed without
   *   `object_type`, or either is an empty array when `object_type` is set.
   *
   * @example
   * ```typescript
   * const stats = await client.analytics.get({
   *   date_from: '2024-01-01',
   *   date_to: '2024-01-31',
   *   object_type: 'CAMPAIGN',
   *   object_ids: ['123', '456'],
   *   metrics: ['sent', 'open_uniq', 'click_uniq'],
   * });
   *
   * for (const stat of stats.data ?? []) {
   *   console.log(`Object ${stat.id}:`, stat.metrics);
   * }
   * ```
   */
  async get(params: RuleAnalyticsParams): Promise<RuleAnalyticsResponse> {
    const { objectType, objectIds, metrics } = validateAndExtract(params);
    const qs = buildQueryString({
      date_from: params.date_from,
      date_to: params.date_to,
      object_type: objectType,
      'object_ids[]': objectIds,
      'metrics[]': metrics,
      message_type: params.message_type,
    });

    return this.transport.get<RuleAnalyticsResponse>(`/analytics${qs}`);
  }
}

interface ExtractedQuery {
  objectType: string | undefined;
  objectIds: string[] | undefined;
  metrics: string[] | undefined;
}

function validateAndExtract(params: RuleAnalyticsParams): ExtractedQuery {
  const hasObjectType = 'object_type' in params && !!params.object_type;

  if (!hasObjectType) {
    const p = params as unknown as Record<string, unknown>;

    if (p.object_ids != null || p.metrics != null) {
      throw new RuleConfigError(
        'object_ids and metrics require object_type to be provided'
      );
    }

    return { objectType: undefined, objectIds: undefined, metrics: undefined };
  }

  const full = params as RuleAnalyticsFullQuery;

  if (!Array.isArray(full.object_ids) || full.object_ids.length === 0) {
    throw new RuleConfigError(
      'object_ids must be a non-empty array when object_type is provided'
    );
  }

  if (!Array.isArray(full.metrics) || full.metrics.length === 0) {
    throw new RuleConfigError(
      'metrics must be a non-empty array when object_type is provided'
    );
  }

  return {
    objectType: full.object_type,
    objectIds: full.object_ids,
    metrics: full.metrics,
  };
}
