/**
 * API-key types (v3 `/api-keys` endpoint).
 */

import type { RuleApiResponse } from '../../shared.types.js';

// ── Public SDK types ──────────────────────────────────────────────────────────

/**
 * An API key as returned by the Rule.io API.
 *
 * The `key` field is only present immediately after creation — it is not
 * returned by list or update operations. Store it securely at creation time.
 */
export interface ApiKey {
  id: number;
  name: string | null;
  /** The raw key value. Only present in the `ApiKeysClient.create` response. */
  key?: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating an API key. */
export interface CreateApiKeyPayload {
  /** Name for the API key (max 255 characters). */
  name: string;
}

/** Payload for updating an API key's name. */
export interface UpdateApiKeyPayload {
  /** New name for the API key (max 255 characters). */
  name: string;
}

// ── Internal wire types ───────────────────────────────────────────────────────

/** @internal */
export interface ApiKeyWire {
  id: number;
  name?: string | null;
  key?: string;
  created_at: string;
  updated_at: string;
}

/** @internal */
export interface ApiKeyBody {
  name: string;
}

/** @internal */
export interface ApiKeyResponse extends RuleApiResponse {
  data: ApiKeyWire;
}

/** @internal */
export interface ApiKeyListResponse extends RuleApiResponse {
  data?: ApiKeyWire[];
}
