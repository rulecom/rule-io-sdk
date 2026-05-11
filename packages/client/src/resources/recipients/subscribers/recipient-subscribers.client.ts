/**
 * Recipients → subscribers client.
 *
 * Wraps the v3 `/editor/recipients/subscribers` endpoint. This is intentionally
 * separate from the top-level `subscribers` namespace — the recipients endpoint
 * returns a richer subscriber shape (`has_next_item`, `account_id`) used for
 * pagination cursors when targeting a campaign.
 */

import { BaseResource } from '../../../core/base-resource.js';
import { buildQueryString } from '../../../core/query-string.js';
import type {
  RuleRecipientSubscriberListResponse,
  RuleRecipientsListParams,
} from '../recipients.types.js';

export class RecipientSubscribersClient extends BaseResource {
  /** List subscribers available for recipient targeting. */
  list(
    params?: RuleRecipientsListParams
  ): Promise<RuleRecipientSubscriberListResponse> {
    const qs = buildQueryString({
      page: params?.page,
      per_page: params?.per_page,
    });

    return this.transport.get<RuleRecipientSubscriberListResponse>(
      `/editor/recipients/subscribers${qs}`
    );
  }
}
