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

/** Pagination cursor returned by `GET /tags`. */
export interface RuleTagsMeta {
  next?: string;
}

export interface RuleTagsResponse extends RuleApiResponse {
  tags?: RuleTagEntity[];
  meta?: RuleTagsMeta;
}

/** Request body for `PUT /tags/{identifier}`. Both fields are optional. */
export interface RuleTagUpdateRequest {
  name?: string;
  description?: string;
}

/**
 * A single tag as returned by `GET /tags/{identifier}`.
 * Extends `RuleTagEntity` with the optional `recipient_count` field that
 * is only present when `with_count=true` is requested.
 */
export interface RuleTagDetailEntity extends RuleTagEntity {
  recipient_count?: number;
}
