/**
 * API-key types (v3 `/api-keys` endpoint).
 */

import type { RuleApiResponse, RuleListResponse } from '../../shared.types.js';

/** An API key as returned by the Rule.io API. */
export interface RuleApiKey {
  id?: number;
  name?: string | null;
  key?: string;
  created_at?: string;
  updated_at?: string;
}

/** Request body for creating an API key. */
export interface RuleApiKeyCreateRequest {
  /** Name for the API key (max 255 characters) */
  name: string;
}

/** Request body for updating an API key. */
export interface RuleApiKeyUpdateRequest {
  /** New name for the API key (max 255 characters) */
  name: string;
}

/** Response for a single API key. */
export interface RuleApiKeyResponse extends RuleApiResponse {
  data?: RuleApiKey;
}

/** Response for listing API keys. */
export type RuleApiKeyListResponse = RuleListResponse<RuleApiKey>;
