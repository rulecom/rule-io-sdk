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
  /** List all API keys for the account. */
  list(): Promise<RuleApiKeyListResponse> {
    return this.transport.get<RuleApiKeyListResponse>('/api-keys');
  }

  /** Create a new API key. The response includes the generated key value. */
  create(request: RuleApiKeyCreateRequest): Promise<RuleApiKeyResponse> {
    return this.transport.post<RuleApiKeyResponse>('/api-keys', {
      body: JSON.stringify(request),
    });
  }

  /** Update an API key's name. */
  update(
    apiKeyId: number,
    request: RuleApiKeyUpdateRequest
  ): Promise<RuleApiKeyResponse> {
    return this.transport.put<RuleApiKeyResponse>(`/api-keys/${apiKeyId}`, {
      body: JSON.stringify(request),
    });
  }

  /** Delete an API key. */
  async delete(apiKeyId: number): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('DELETE', `/api-keys/${apiKeyId}`);

    return { success: true };
  }
}
