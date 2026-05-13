/**
 * Recipients → segments client.
 *
 * Wraps the v3 `/editor/recipients/segments` endpoint.
 */

import { BaseResource } from '../../../core/base-resource.js';
import { buildQueryString } from '../../../core/query-string.js';
import type {
  RuleRecipientsListParams,
  RuleSegmentListResponse,
} from '../recipients.types.js';

export class SegmentsClient extends BaseResource {
  /**
   * List available segments for recipient targeting.
   *
   * @param params - Optional pagination query parameters.
   * @returns List of segments.
   */
  list(params?: RuleRecipientsListParams): Promise<RuleSegmentListResponse> {
    const qs = buildQueryString({
      page: params?.page,
      per_page: params?.per_page,
    });

    return this.transport.get<RuleSegmentListResponse>(
      `/editor/recipients/segments${qs}`
    );
  }
}
