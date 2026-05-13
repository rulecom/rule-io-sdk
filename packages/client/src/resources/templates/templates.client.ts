/**
 * Templates namespace client.
 *
 * Wraps the v3 `/editor/template` endpoints. `render` returns the template's
 * HTML body (or null on 404).
 */

import { RuleApiError } from '@rulecom/core';

import { BaseResource } from '../../core/base-resource.js';
import { buildQueryString } from '../../core/query-string.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleRenderTemplateParams,
  RuleTemplateCreateRequest,
  RuleTemplateListParams,
  RuleTemplateListResponse,
  RuleTemplateResponse,
} from './templates.types.js';

export class TemplatesClient extends BaseResource {
  /**
   * Create a template with RCML content.
   *
   * @param template - Template create request (message_id, name,
   *   message_type, RCML document).
   * @returns The created template.
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Template
   */
  create(template: RuleTemplateCreateRequest): Promise<RuleTemplateResponse> {
    return this.transport.post<RuleTemplateResponse>('/editor/template', {
      body: JSON.stringify(template),
    });
  }

  /**
   * Get a template by ID.
   *
   * @param id - Template ID.
   * @returns The template, or `null` if no template with that ID exists
   *   (HTTP 404).
   */
  async get(id: number): Promise<RuleTemplateResponse | null> {
    try {
      return await this.transport.get<RuleTemplateResponse>(`/editor/template/${id}`);
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Update a template.
   *
   * @param id - Template ID.
   * @param template - Partial update body — any subset of the create-request
   *   fields.
   * @returns The updated template.
   */
  update(
    id: number,
    template: Partial<RuleTemplateCreateRequest>
  ): Promise<RuleTemplateResponse> {
    return this.transport.put<RuleTemplateResponse>(`/editor/template/${id}`, {
      body: JSON.stringify(template),
    });
  }

  /**
   * Delete a template.
   *
   * @param id - Template ID.
   * @returns A success response.
   */
  delete(id: number): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(`/editor/template/${id}`);
  }

  /**
   * List templates with optional pagination.
   *
   * @param params - Optional pagination parameters.
   * @returns List of templates.
   *
   * @example
   * ```typescript
   * const templates = await client.templates.list({ page: 1, per_page: 50 });
   * ```
   */
  list(params?: RuleTemplateListParams): Promise<RuleTemplateListResponse> {
    const qs = params ? buildQueryString({ ...params }) : '';

    return this.transport.get<RuleTemplateListResponse>(`/editor/template${qs}`);
  }

  /**
   * Render a template to HTML.
   *
   * Optionally pass `subscriber_id` to substitute merge tags with the
   * subscriber's field values (e.g. `{{Booking.FirstName}}` becomes their
   * actual name).
   *
   * @param id - Template ID.
   * @param params - Optional parameters (`subscriber_id` for merge tag
   *   substitution).
   * @returns Rendered HTML string, or `null` if no template with that ID
   *   exists (HTTP 404).
   *
   * @example
   * ```typescript
   * const html = await client.templates.render(42);
   *
   * // With subscriber data for merge tag substitution
   * const personalized = await client.templates.render(42, { subscriber_id: 1001 });
   * ```
   */
  async render(
    id: number,
    params?: RuleRenderTemplateParams
  ): Promise<string | null> {
    const qs = params ? buildQueryString({ ...params }) : '';

    try {
      return await this.transport.requestText('GET', `/editor/template/${id}/render${qs}`);
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }
}
