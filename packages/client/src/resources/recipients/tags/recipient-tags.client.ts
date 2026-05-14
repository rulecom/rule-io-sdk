/**
 * Recipients → tags client.
 *
 * Wraps the v3 `/editor/recipients/tags` endpoint. Distinct from the top-level
 * `tags` namespace, which uses the v2 `/tags` endpoint for tag CRUD.
 */

import { BaseResource } from '../../../core/base-resource.js';
import { buildQueryString } from '../../../core/query-string.js';
import type {
  RuleRecipientTagListResponse,
  RuleRecipientsListParams,
} from '../recipients.types.js';

export class RecipientTagsClient extends BaseResource {
  /**
   * List tags available for recipient targeting.
   *
   * @param params - Optional pagination query parameters.
   * @returns List of tags.
   *
   * @example
   * ```typescript
   * const result = await client.recipients.tags.list();
   * for (const tag of result.data ?? []) {
   *   console.log(tag.id, tag.name);
   * }
   * ```
   */
  list(params?: RuleRecipientsListParams): Promise<RuleRecipientTagListResponse> {
    const qs = buildQueryString({
      page: params?.page,
      per_page: params?.per_page,
    });

    return this.transport.get<RuleRecipientTagListResponse>(
      `/editor/recipients/tags${qs}`
    );
  }
}
