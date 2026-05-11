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
   * Uses token-based pagination via `next_page_token`. By default,
   * base64-encoded `object.name` fields on `object.type === 'message'`
   * records are decoded transparently — pass `decodeNames: false` to
   * preserve the raw API values.
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

  /** Export subscribers for a given date range. */
  subscribers(
    params: RuleExportSubscriberParams
  ): Promise<RuleExportSubscriberResponse> {
    const qs = buildQueryString({ ...params });

    return this.transport.get<RuleExportSubscriberResponse>(`/export/subscriber${qs}`);
  }
}
