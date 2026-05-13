/**
 * API-keys namespace client.
 *
 * Wraps the v3 `/api-keys` endpoints — list, create, update, delete.
 */

import { BaseResource } from '../../core/base-resource.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleApiKeyCreateRequest,
  RuleApiKeyListResponse,
  RuleApiKeyResponse,
  RuleApiKeyUpdateRequest,
} from './api-keys.types.js';

export class ApiKeysClient extends BaseResource {
  /**
   * List all API keys for the account.
   *
   * @returns List of API keys.
   *
   * @example
   * ```typescript
   * const result = await client.apiKeys.list();
   * console.log(result.data); // [{ id: 1, name: 'Production', key: '...' }]
   * ```
   */
  list(): Promise<RuleApiKeyListResponse> {
    return this.transport.get<RuleApiKeyListResponse>('/api-keys');
  }

  /**
   * Create a new API key. The response includes the generated key value.
   *
   * @param request - Request with a name for the key (max 255 characters).
   * @returns The created API key (including the key value).
   *
   * @example
   * ```typescript
   * const result = await client.apiKeys.create({ name: 'Production Key' });
   * console.log(result.data?.key); // The generated API key
   * ```
   */
  create(request: RuleApiKeyCreateRequest): Promise<RuleApiKeyResponse> {
    return this.transport.post<RuleApiKeyResponse>('/api-keys', {
      body: JSON.stringify(request),
    });
  }

  /**
   * Update an API key's name.
   *
   * @param apiKeyId - API key ID.
   * @param request - Request with the new name (max 255 characters).
   * @returns The updated API key.
   *
   * @example
   * ```typescript
   * const result = await client.apiKeys.update(5, { name: 'Staging Key' });
   * ```
   */
  update(
    apiKeyId: number,
    request: RuleApiKeyUpdateRequest
  ): Promise<RuleApiKeyResponse> {
    return this.transport.put<RuleApiKeyResponse>(`/api-keys/${apiKeyId}`, {
      body: JSON.stringify(request),
    });
  }

  /**
   * Delete an API key.
   *
   * @param apiKeyId - API key ID.
   * @returns A success response.
   *
   * @example
   * ```typescript
   * await client.apiKeys.delete(5);
   * ```
   */
  async delete(apiKeyId: number): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('DELETE', `/api-keys/${apiKeyId}`);

    return { success: true };
  }
}
