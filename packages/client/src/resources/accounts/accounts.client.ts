/**
 * Accounts namespace client.
 *
 * Wraps the v3 `/accounts` endpoints. Every method requires Super Admin
 * privileges — regular API keys receive a 403.
 */

import { RuleApiError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleAccountCreateRequest,
  RuleAccountCreateResponse,
  RuleAccountGetParams,
  RuleAccountListResponse,
  RuleAccountResponse,
} from './accounts.types.js';

export class AccountsClient extends BaseResource {
  /**
   * List all accounts visible to the authenticated user.
   *
   * **Requires Super Admin privileges.** Regular API keys will receive a 403.
   */
  list(): Promise<RuleAccountListResponse> {
    return this.transport.get<RuleAccountListResponse>('/accounts');
  }

  /**
   * Create a new account.
   *
   * **Requires Super Admin privileges.**
   */
  create(request: RuleAccountCreateRequest): Promise<RuleAccountCreateResponse> {
    return this.transport.post<RuleAccountCreateResponse>('/accounts', {
      body: JSON.stringify(request),
    });
  }

  /**
   * Get a single account by ID.
   *
   * Pass `'show'` as the accountId to retrieve the currently authenticated
   * account. Use `params.includes` to load related data such as Sitoo
   * credentials. Returns null on 404.
   *
   * **Requires Super Admin privileges.**
   */
  async get(
    accountId: number | 'show',
    params?: RuleAccountGetParams
  ): Promise<RuleAccountResponse | null> {
    const qs = params?.includes?.length
      ? buildQueryString({ 'includes[]': params.includes })
      : '';

    try {
      const response = await this.transport.fetchRaw('GET', `/accounts/${accountId}${qs}`);
      const data = (await response.json()) as RuleAccountResponse;

      this.transport.log('getAccount response received (body omitted for security)');

      return data;
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Delete an account.
   *
   * The deletion is queued asynchronously by the API; processing is not
   * immediate. Once processed this is destructive and cannot be undone.
   *
   * **Requires Super Admin privileges.**
   */
  async delete(accountId: number): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('DELETE', `/accounts/${accountId}`);

    return { success: true };
  }
}
