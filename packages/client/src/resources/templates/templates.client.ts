/**
 * Templates namespace client.
 *
 * Wraps the v3 `/editor/template` endpoints. `render` returns the template's
 * HTML body (or null on 404).
 */

import { RuleApiError } from '@rule-io/core';

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
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Template
   */
  create(template: RuleTemplateCreateRequest): Promise<RuleTemplateResponse> {
    return this.transport.post<RuleTemplateResponse>('/editor/template', {
      body: JSON.stringify(template),
    });
  }

  /** Get a template by ID. Returns null on 404. */
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

  /** Update a template. */
  update(
    id: number,
    template: Partial<RuleTemplateCreateRequest>
  ): Promise<RuleTemplateResponse> {
    return this.transport.put<RuleTemplateResponse>(`/editor/template/${id}`, {
      body: JSON.stringify(template),
    });
  }

  /** Delete a template. */
  delete(id: number): Promise<RuleApiResponse> {
    return this.transport.delete<RuleApiResponse>(`/editor/template/${id}`);
  }

  /** List templates with optional pagination. */
  list(params?: RuleTemplateListParams): Promise<RuleTemplateListResponse> {
    const qs = params ? buildQueryString({ ...params }) : '';

    return this.transport.get<RuleTemplateListResponse>(`/editor/template${qs}`);
  }

  /**
   * Render a template to HTML. Optionally pass `subscriber_id` to substitute
   * merge tags with the subscriber's field values. Returns null on 404.
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
