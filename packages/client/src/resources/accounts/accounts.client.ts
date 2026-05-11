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
   *
   * @returns List of accounts (simplified representation without nested
   *   relations).
   *
   * @example
   * ```typescript
   * const response = await client.accounts.list();
   * for (const account of response.data ?? []) {
   *   console.log(account.id, account.name);
   * }
   * ```
   */
  list(): Promise<RuleAccountListResponse> {
    return this.transport.get<RuleAccountListResponse>('/accounts');
  }

  /**
   * Create a new account.
   *
   * **Requires Super Admin privileges.** Regular API keys will receive a 403.
   *
   * @param request - Account name and language code.
   * @returns The created account (simplified representation).
   *
   * @example
   * ```typescript
   * const response = await client.accounts.create({
   *   name: 'My New Account',
   *   language: 'en',
   * });
   * console.log('Created account:', response.data?.id);
   * ```
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
   * credentials.
   *
   * **Requires Super Admin privileges.** Regular API keys will receive a 403.
   *
   * @param accountId - Numeric account ID or `'show'` for the current
   *   account.
   * @param params - Optional query parameters (e.g.
   *   `{ includes: ['sitoo_credentials'] }`).
   * @returns The account with optional nested relations, or `null` if no
   *   account with that ID exists (HTTP 404).
   *
   * @example
   * ```typescript
   * // Get current account
   * const me = await client.accounts.get('show');
   *
   * // Get account with Sitoo credentials
   * const account = await client.accounts.get(42, {
   *   includes: ['sitoo_credentials'],
   * });
   * ```
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
   * immediate and may take time to complete. Once processed this is a
   * destructive operation that cannot be undone.
   *
   * **Requires Super Admin privileges.** Regular API keys will receive a 403.
   *
   * @param accountId - Numeric account ID to delete.
   * @returns A success response indicating the deletion request was accepted.
   *
   * @example
   * ```typescript
   * await client.accounts.delete(42);
   * ```
   */
  async delete(accountId: number): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('DELETE', `/accounts/${accountId}`);

    return { success: true };
  }
}
