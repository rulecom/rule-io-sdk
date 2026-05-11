/**
 * Exports namespace client.
 *
 * Wraps the v3 `/export/*` endpoints. The `statistics` method transparently
 * decodes base64-encoded message names returned by the API; opt out with
 * `decodeNames: false`.
 */

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import { decodeStatisticMessageName } from '../../core/statistic-name-decoder.js';

import type {
  RuleExportDispatcherParams,
  RuleExportDispatcherResponse,
  RuleExportStatisticsParams,
  RuleExportStatisticsResponse,
  RuleExportSubscriberParams,
  RuleExportSubscriberResponse,
} from './exports.types.js';

export class ExportsClient extends BaseResource {
  /**
   * Export dispatchers for a given date range.
   *
   * Note: The API enforces a maximum 1-day range between `date_from` and
   * `date_to`.
   *
   * @param params - Date range (both required).
   * @returns List of dispatcher records.
   *
   * @example
   * ```typescript
   * const result = await client.exports.dispatchers({
   *   date_from: '2024-01-01',
   *   date_to: '2024-01-02',
   * });
   * console.log(result.data); // RuleExportDispatcherRecord[]
   * ```
   */
  dispatchers(
    params: RuleExportDispatcherParams
  ): Promise<RuleExportDispatcherResponse> {
    const qs = buildQueryString({ ...params });

    return this.transport.get<RuleExportDispatcherResponse>(`/export/dispatcher${qs}`);
  }

  /**
   * Export statistics for a given date range with optional type filters.
   *
   * Uses token-based pagination: if the response includes a `next_page_token`,
   * pass it in the next call to retrieve the following page.
   *
   * ## `object.name` decoding
   *
   * Rule.io returns `object.name` base64-encoded for records where
   * `object.type === 'message'` (every other object type is plain text).
   * By default this method decodes those names transparently so consumers
   * always see plain text. A round-trip guard limits decoding to inputs that
   * look like canonical base64, but it cannot distinguish an intentionally
   * base64-encoded name from a plain-text name that happens to be valid
   * base64 — pass `decodeNames: false` to preserve raw API values exactly
   * (for debugging or if upstream behavior changes).
   *
   * @param params - Date range (required), optional `statistic_types`
   *   filter, optional `next_page_token`, optional `decodeNames`.
   * @returns List of statistic records and an optional `next_page_token`.
   *
   * @example
   * ```typescript
   * // First page
   * let result = await client.exports.statistics({
   *   date_from: '2024-01-01',
   *   date_to: '2024-01-31',
   *   statistic_types: ['open', 'link'],
   * });
   *
   * // Subsequent pages
   * while (result.next_page_token) {
   *   result = await client.exports.statistics({
   *     date_from: '2024-01-01',
   *     date_to: '2024-01-31',
   *     next_page_token: result.next_page_token,
   *   });
   * }
   * ```
   */
  async statistics(
    params: RuleExportStatisticsParams
  ): Promise<RuleExportStatisticsResponse> {
    const qs = buildQueryString({
      date_from: params.date_from,
      date_to: params.date_to,
      'statistic_types[]': params.statistic_types,
      next_page_token: params.next_page_token || undefined,
    });
    const response = await this.transport.get<RuleExportStatisticsResponse>(
      `/export/statistics${qs}`
    );

    if (params.decodeNames === false || !response.data) {
      return response;
    }

    return { ...response, data: response.data.map(decodeStatisticMessageName) };
  }

  /**
   * Export subscribers for a given date range.
   *
   * @param params - Date range (both required).
   * @returns List of subscriber records.
   *
   * @example
   * ```typescript
   * const result = await client.exports.subscribers({
   *   date_from: '2024-01-01',
   *   date_to: '2024-01-31',
   * });
   * console.log(result.data); // RuleExportSubscriberRecord[]
   * ```
   */
  subscribers(
    params: RuleExportSubscriberParams
  ): Promise<RuleExportSubscriberResponse> {
    const qs = buildQueryString({ ...params });

    return this.transport.get<RuleExportSubscriberResponse>(`/export/subscriber${qs}`);
  }
}
