/**
 * API-keys namespace client.
 *
 * Wraps the v3 `/api-keys` endpoints — list, create, update, delete.
 */

import { BaseResource } from '../../core/base-resource.js';

import type {
  ApiKey,
  ApiKeyListResponse,
  ApiKeyResponse,
  ApiKeyWire,
  CreateApiKeyPayload,
  UpdateApiKeyPayload,
} from './api-keys.types.js';

export class ApiKeysClient extends BaseResource {
  /**
   * List all API keys for the account.
   *
   * Returns key metadata only (ID and name). The key value is not included —
   * it is only available immediately after creation.
   *
   * @returns Array of API key entities.
   *
   * @example
   * ```typescript
   * const keys = await client.apiKeys.list();
   * for (const key of keys) {
   *   console.log(key.id, key.name);
   * }
   * ```
   */
  async list(): Promise<ApiKey[]> {
    const res = await this.transport.get<ApiKeyListResponse>('/api-keys');

    return (res.data ?? []).map(mapApiKeyWireToEntity);
  }

  /**
   * Create a new API key. The response includes the generated key value.
   *
   * The key value is only returned once. Store it securely immediately —
   * it cannot be retrieved again from the API.
   *
   * @param payload - Payload with a name for the key (max 255 characters).
   * @returns The created API key, including the key value.
   *
   * @example
   * ```typescript
   * const key = await client.apiKeys.create({ name: 'Production' });
   * console.log(key.key); // save this — it won't be shown again
   * ```
   */
  async create(payload: CreateApiKeyPayload): Promise<ApiKey> {
    const res = await this.transport.post<ApiKeyResponse>('/api-keys', {
      body: JSON.stringify({ name: payload.name }),
    });

    return mapApiKeyWireToEntity(res.data);
  }

  /**
   * Update an API key's name.
   *
   * @param apiKeyId - API key ID.
   * @param payload - Payload with the new name (max 255 characters).
   * @returns The updated API key.
   *
   * @example
   * ```typescript
   * const key = await client.apiKeys.update(keyId, { name: 'Production v2' });
   * ```
   */
  async update(apiKeyId: number, payload: UpdateApiKeyPayload): Promise<ApiKey> {
    const res = await this.transport.put<ApiKeyResponse>(`/api-keys/${apiKeyId}`, {
      body: JSON.stringify({ name: payload.name }),
    });

    return mapApiKeyWireToEntity(res.data);
  }

  /**
   * Delete an API key.
   *
   * Deleted keys stop working immediately. Ensure the key is no longer in use
   * before deleting.
   *
   * @param apiKeyId - API key ID.
   *
   * @example
   * ```typescript
   * await client.apiKeys.delete(keyId);
   * ```
   */
  async delete(apiKeyId: number): Promise<void> {
    await this.transport.fetchRaw('DELETE', `/api-keys/${apiKeyId}`);
  }
}

// ── Wire ↔ entity mapper ──────────────────────────────────────────────────────

/** @internal */
function mapApiKeyWireToEntity(w: ApiKeyWire): ApiKey {
  return {
    id: w.id,
    name: w.name ?? null,
    key: w.key,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}
