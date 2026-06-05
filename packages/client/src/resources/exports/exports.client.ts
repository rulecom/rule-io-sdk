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
  ExportDispatcherRecord,
  ExportDispatcherWire,
  ExportDispatchersParams,
  ExportDispatchersWireResponse,
  ExportStatisticRecord,
  ExportStatisticWire,
  ExportStatisticsParams,
  ExportStatisticsResult,
  ExportStatisticsWireResponse,
  ExportSubscriberRecord,
  ExportSubscriberWire,
  ExportSubscribersParams,
  ExportSubscribersWireResponse,
} from './exports.types.js';

export class ExportsClient extends BaseResource {
  /**
   * Export dispatchers for a given date range.
   *
   * Note: The API enforces a maximum 1-day range between `dateFrom` and
   * `dateTo`.
   *
   * @param params - Date range (both required).
   * @returns Array of dispatcher records.
   *
   * @example
   * ```typescript
   * const records = await client.exports.dispatchers({
   *   dateFrom: '2024-01-01',
   *   dateTo:   '2024-01-01',  // same day — max range is 1 day
   * });
   * ```
   */
  async dispatchers(params: ExportDispatchersParams): Promise<ExportDispatcherRecord[]> {
    const qs = buildQueryString({
      date_from: params.dateFrom,
      date_to: params.dateTo,
    });
    const res = await this.transport.get<ExportDispatchersWireResponse>(
      `/export/dispatcher${qs}`
    );

    return (res.data ?? []).map(mapDispatcherWireToEntity);
  }

  /**
   * Export statistics for a given date range with optional type filters.
   *
   * Uses token-based pagination: if the result includes a `nextPageToken`,
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
   * @param params - Date range (required), optional `statisticTypes`
   *   filter, optional `nextPageToken`, optional `decodeNames`.
   * @returns List of statistic records and an optional `nextPageToken`.
   *
   * @example
   * ```typescript
   * // First page
   * let result = await client.exports.statistics({
   *   dateFrom: '2024-01-01',
   *   dateTo:   '2024-01-31',
   *   statisticTypes: ['open', 'link'],
   * });
   *
   * // Subsequent pages
   * while (result.nextPageToken) {
   *   result = await client.exports.statistics({
   *     dateFrom: '2024-01-01',
   *     dateTo:   '2024-01-31',
   *     nextPageToken: result.nextPageToken,
   *   });
   * }
   * ```
   */
  async statistics(params: ExportStatisticsParams): Promise<ExportStatisticsResult> {
    const qs = buildQueryString({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      'statistic_types[]': params.statisticTypes,
      next_page_token: params.nextPageToken || undefined,
    });
    const res = await this.transport.get<ExportStatisticsWireResponse>(
      `/export/statistics${qs}`
    );

    const mapped = (res.data ?? []).map(mapStatisticWireToEntity);
    const data =
      params.decodeNames === false ? mapped : mapped.map(decodeStatisticMessageName);

    return { data, nextPageToken: res.next_page_token };
  }

  /**
   * Export subscribers for a given date range.
   *
   * @param params - Date range (both required).
   * @returns Array of subscriber records.
   *
   * @example
   * ```typescript
   * const records = await client.exports.subscribers({
   *   dateFrom: '2024-01-01',
   *   dateTo:   '2024-01-31',
   * });
   * ```
   */
  async subscribers(params: ExportSubscribersParams): Promise<ExportSubscriberRecord[]> {
    const qs = buildQueryString({
      date_from: params.dateFrom,
      date_to: params.dateTo,
    });
    const res = await this.transport.get<ExportSubscribersWireResponse>(
      `/export/subscriber${qs}`
    );

    return (res.data ?? []).map(mapSubscriberWireToEntity);
  }
}

// ── Wire ↔ entity mappers ─────────────────────────────────────────────────────

/** @internal */
function mapDispatcherWireToEntity(w: ExportDispatcherWire): ExportDispatcherRecord {
  return {
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    accountId: w.account_id,
    accountName: w.account_name,
    dispatcherId: w.dispatcher_id,
    dispatcherName: w.dispatcher_name,
    dispatcherType: w.dispatcher_type,
    channel: w.channel,
    tags: w.tags,
    filters: w.filters,
    utmCampaign: w.utm_campaign,
    utmTerm: w.utm_term,
    utmContent: w.utm_content,
    journeyId: w.journey_id,
    journeyName: w.journey_name,
    variableSetIds: w.variable_set_ids,
  };
}

/** @internal */
function mapStatisticWireToEntity(w: ExportStatisticWire): ExportStatisticRecord {
  return {
    statisticId: w.statistic_id,
    statisticType: w.statistic_type,
    eventId: w.event_id,
    subscriberId: w.subscriber_id,
    messageType: w.message_type,
    createdAt: w.created_at,
    object: {
      id: w.object.id,
      name: w.object.name,
      type: w.object.type,
    },
  };
}

/** @internal */
function mapSubscriberWireToEntity(w: ExportSubscriberWire): ExportSubscriberRecord {
  return {
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    accountId: w.account_id,
    accountName: w.account_name,
    subscriberId: w.subscriber_id,
    email: w.email,
    phoneNumber: w.phone_number,
    optInDate: w.opt_in_date,
  };
}
