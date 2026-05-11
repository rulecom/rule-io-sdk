/**
 * Tags namespace client.
 *
 * Wraps the v2 `/tags` endpoints — no v3 equivalent exists.
 */

import { BaseResource } from '../../core/base-resource.js';
import type { RuleTagsResponse } from './tags.types.js';

export class TagsClient extends BaseResource {
  /** List every tag in the account. */
  list(): Promise<RuleTagsResponse> {
    return this.transport.get<RuleTagsResponse>('/tags', { version: 'v2' });
  }

  /**
   * Look up a tag's numeric ID by name. Returns `null` if no tag with that
   * name exists.
   *
   * Useful for translating user-facing tag names into the IDs that automation
   * triggers require.
   */
  async findIdByName(name: string): Promise<number | null> {
    const response = await this.list();
    const tag = response.tags?.find((t) => t.name === name);

    return tag?.id ?? null;
  }
}
