/**
 * Brand-styles namespace client.
 *
 * Wraps the v3 `/brand-styles` endpoints — list, get, create (from-domain
 * or manual), update (PATCH), and delete.
 */

import { RuleApiError } from '@rulecom/core';

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
  /**
   * List all brand styles for the account.
   *
   * @returns List of brand style summary items.
   *
   * @example
   * ```typescript
   * const result = await client.brandStyles.list();
   * console.log(result.data); // [{ id: 1, name: 'My Brand', ... }]
   * ```
   */
  list(): Promise<RuleBrandStyleListResponse> {
    return this.transport.get<RuleBrandStyleListResponse>('/brand-styles');
  }

  /**
   * Get a brand style by ID.
   *
   * @param brandStyleId - Brand style ID.
   * @returns Full brand style detail, or `null` if no brand style with that
   *   ID exists (HTTP 404).
   *
   * @example
   * ```typescript
   * const style = await client.brandStyles.get(42);
   * if (style) {
   *   console.log(style.data?.colours);
   * }
   * ```
   */
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
   * The API will fetch brand assets (colors, fonts, logos, social links)
   * from the given domain.
   *
   * Returns 409 if a brand style for this domain already exists, and 424 if
   * the domain could not be fetched.
   *
   * @param request - Request with the domain to fetch brand assets from.
   * @returns The created brand style.
   *
   * @example
   * ```typescript
   * const style = await client.brandStyles.createFromDomain({ domain: 'example.com' });
   * console.log(style.data?.colours);
   * ```
   */
  createFromDomain(
    request: RuleBrandStyleFromDomainRequest
  ): Promise<RuleBrandStyleResponse> {
    return this.transport.post<RuleBrandStyleResponse>('/brand-styles/from-domain', {
      body: JSON.stringify(request),
    });
  }

  /**
   * Create a brand style manually with custom values.
   *
   * @param request - Brand style data (name, colours, fonts, links, images).
   * @returns The created brand style.
   *
   * @example
   * ```typescript
   * const style = await client.brandStyles.createManually({
   *   name: 'My Brand',
   *   colours: [{ type: 'brand', hex: '#FF5733', brightness: 50 }],
   *   links: [{ type: 'website', link: 'https://example.com' }],
   * });
   * ```
   */
  createManually(
    request: RuleBrandStyleCreateRequest
  ): Promise<RuleBrandStyleResponse> {
    return this.transport.post<RuleBrandStyleResponse>('/brand-styles/manually', {
      body: JSON.stringify(request),
    });
  }

  /**
   * Update an existing brand style (partial update via PATCH).
   *
   * @param brandStyleId - Brand style ID.
   * @param request - Fields to update (all optional).
   * @returns The updated brand style.
   *
   * @example
   * ```typescript
   * const updated = await client.brandStyles.update(42, {
   *   name: 'Updated Brand',
   *   colours: [{ type: 'brand', hex: '#00FF00', brightness: 70 }],
   * });
   * ```
   */
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
   *
   * @param brandStyleId - Brand style ID.
   * @returns A success response.
   *
   * @example
   * ```typescript
   * await client.brandStyles.delete(42);
   * ```
   */
  async delete(brandStyleId: number): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('DELETE', `/brand-styles/${brandStyleId}`);

    return { success: true };
  }
}
