/**
 * v2 Tags API types.
 *
 * The v2 entity interface is named `RuleTag` historically. It is intentionally
 * NOT re-exported from `index.ts` — the public `RuleTag` symbol is reserved
 * for the union of well-known tag string literals defined in `constants.ts`.
 * Consumers who need this entity shape can read it via `RuleTagsResponse.tags`.
 */

import type { RuleApiResponse } from '../../shared.types.js';

/** A tag entity returned by the v2 `/tags` endpoint. */
export interface RuleTagEntity {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RuleTagsResponse extends RuleApiResponse {
  tags?: RuleTagEntity[];
}
