/**
 * Brand-styles namespace client.
 *
 * Wraps the v3 `/brand-styles` endpoints — list, get, create (from-domain
 * or manual), update (PATCH), and delete.
 */

import { RuleApiError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleBrandStyleCreateRequest,
  RuleBrandStyleFromDomainRequest,
  RuleBrandStyleListResponse,
  RuleBrandStyleResponse,
  RuleBrandStyleUpdateRequest,
} from './brand-styles.types.js';

export class BrandStylesClient extends BaseResource {
  /** List all brand styles for the account. */
  list(): Promise<RuleBrandStyleListResponse> {
    return this.transport.get<RuleBrandStyleListResponse>('/brand-styles');
  }

  /** Get a brand style by ID. Returns null on 404. */
  async get(brandStyleId: number): Promise<RuleBrandStyleResponse | null> {
    try {
      return await this.transport.get<RuleBrandStyleResponse>(`/brand-styles/${brandStyleId}`);
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Create a brand style by fetching brand assets from a domain.
   *
   * Returns 409 if a brand style for this domain already exists, and 424 if
   * the domain could not be fetched.
   */
  createFromDomain(
    request: RuleBrandStyleFromDomainRequest
  ): Promise<RuleBrandStyleResponse> {
    return this.transport.post<RuleBrandStyleResponse>('/brand-styles/from-domain', {
      body: JSON.stringify(request),
    });
  }

  /** Create a brand style manually with custom values. */
  createManually(
    request: RuleBrandStyleCreateRequest
  ): Promise<RuleBrandStyleResponse> {
    return this.transport.post<RuleBrandStyleResponse>('/brand-styles/manually', {
      body: JSON.stringify(request),
    });
  }

  /** Update an existing brand style (partial update via PATCH). */
  update(
    brandStyleId: number,
    request: RuleBrandStyleUpdateRequest
  ): Promise<RuleBrandStyleResponse> {
    return this.transport.patch<RuleBrandStyleResponse>(`/brand-styles/${brandStyleId}`, {
      body: JSON.stringify(request),
    });
  }

  /**
   * Delete a brand style.
   *
   * Returns 403 if this is the last brand style on the account (at least one
   * must remain).
   */
  async delete(brandStyleId: number): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('DELETE', `/brand-styles/${brandStyleId}`);

    return { success: true };
  }
}
