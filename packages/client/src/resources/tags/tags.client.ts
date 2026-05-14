/**
 * Tags namespace client.
 *
 * Wraps the v2 `/tags` endpoints — no v3 equivalent exists.
 */

import { RuleApiError } from '../../errors.js';

import { BaseResource } from '../../core/base-resource.js';
import type { RuleApiResponse } from '../../shared.types.js';
import type {
  RuleTagDetailEntity,
  RuleTagEntity,
  RuleTagUpdateRequest,
  RuleTagsResponse,
} from './tags.types.js';

export class TagsClient extends BaseResource {
  /**
   * List tags in the account.
   *
   * @param opts - Optional request options.
   * @param opts.limit - Number of tags to fetch (1–100, default 100).
   * @returns Tags and an optional `meta.next` cursor for the next page.
   */
  list(opts: { limit?: number } = {}): Promise<RuleTagsResponse> {
    const url = opts.limit !== undefined ? `/tags?limit=${opts.limit}` : '/tags';

    return this.transport.get<RuleTagsResponse>(url, { version: 'v2' });
  }

  /**
   * Fetch a single tag by its numeric ID.
   *
   * @param id - The tag's numeric ID.
   * @param opts - Optional request options.
   * @param opts.withCount - When `true`, the response includes `recipient_count`.
   * @returns The tag entity, or `null` if no tag with that ID exists.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  async getById(
    id: number,
    opts: { withCount?: boolean } = {}
  ): Promise<RuleTagDetailEntity | null> {
    let url = `/tags/${id}?identified_by=id`;

    if (opts.withCount) url += '&with_count=true';

    try {
      return await this.transport.get<RuleTagDetailEntity>(url, { version: 'v2' });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Fetch a single tag by name.
   *
   * @param name - The tag name (URL-encoded automatically).
   * @param opts - Optional request options.
   * @param opts.withCount - When `true`, the response includes `recipient_count`.
   * @returns The tag entity, or `null` if no tag with that name exists.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  async getByName(
    name: string,
    opts: { withCount?: boolean } = {}
  ): Promise<RuleTagDetailEntity | null> {
    let url = `/tags/${encodeURIComponent(name)}?identified_by=name`;

    if (opts.withCount) url += '&with_count=true';

    try {
      return await this.transport.get<RuleTagDetailEntity>(url, { version: 'v2' });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Fetch a single tag by ID or name.
   * Dispatches to {@link getById} when `identifier` is a number, {@link getByName} when it is a string.
   *
   * @param identifier - Tag ID (number) or name (string).
   * @param opts - Optional request options.
   * @param opts.withCount - When `true`, the response includes `recipient_count`.
   * @returns The tag entity, or `null` if not found.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  get(
    identifier: string | number,
    opts?: { withCount?: boolean }
  ): Promise<RuleTagDetailEntity | null> {
    return typeof identifier === 'number'
      ? this.getById(identifier, opts)
      : this.getByName(identifier, opts);
  }

  /**
   * Update a tag identified by its numeric ID.
   *
   * @param id - The tag's numeric ID.
   * @param update - Fields to update (`name` and/or `description`).
   * @returns The updated tag entity, or `null` if no tag with that ID exists.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 409 DuplicateTag, 401, 500).
   */
  async updateById(id: number, update: RuleTagUpdateRequest): Promise<RuleTagEntity | null> {
    try {
      return await this.transport.put<RuleTagEntity>(`/tags/${id}?identified_by=id`, {
        version: 'v2',
        body: JSON.stringify(update),
      });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Update a tag identified by name.
   *
   * @param name - The tag name (URL-encoded automatically).
   * @param update - Fields to update (`name` and/or `description`).
   * @returns The updated tag entity, or `null` if no tag with that name exists.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 409 DuplicateTag, 401, 500).
   */
  async updateByName(
    name: string,
    update: RuleTagUpdateRequest
  ): Promise<RuleTagEntity | null> {
    try {
      return await this.transport.put<RuleTagEntity>(
        `/tags/${encodeURIComponent(name)}?identified_by=name`,
        { version: 'v2', body: JSON.stringify(update) }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Update a tag by ID or name.
   * Dispatches to {@link updateById} when `identifier` is a number, {@link updateByName} when it is a string.
   *
   * @param identifier - Tag ID (number) or name (string).
   * @param update - Fields to update (`name` and/or `description`).
   * @returns The updated tag entity, or `null` if not found.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 409 DuplicateTag, 401, 500).
   */
  update(
    identifier: string | number,
    update: RuleTagUpdateRequest
  ): Promise<RuleTagEntity | null> {
    return typeof identifier === 'number'
      ? this.updateById(identifier, update)
      : this.updateByName(identifier, update);
  }

  /**
   * Delete a tag by its numeric ID.
   *
   * @param id - The tag's numeric ID.
   * @returns A success response, or `null` if no tag with that ID exists.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  async deleteById(id: number): Promise<RuleApiResponse | null> {
    try {
      return await this.transport.delete<RuleApiResponse>(`/tags/${id}?identified_by=id`, {
        version: 'v2',
      });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Delete a tag by name.
   *
   * @param name - The tag name (URL-encoded automatically).
   * @returns A success response, or `null` if no tag with that name exists.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  async deleteByName(name: string): Promise<RuleApiResponse | null> {
    try {
      return await this.transport.delete<RuleApiResponse>(
        `/tags/${encodeURIComponent(name)}?identified_by=name`,
        { version: 'v2' }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Delete a tag by ID or name.
   * Dispatches to {@link deleteById} when `identifier` is a number, {@link deleteByName} when it is a string.
   *
   * @param identifier - Tag ID (number) or name (string).
   * @returns A success response, or `null` if not found.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  delete(identifier: string | number): Promise<RuleApiResponse | null> {
    return typeof identifier === 'number'
      ? this.deleteById(identifier)
      : this.deleteByName(identifier);
  }

  /**
   * Clear all subscriber associations from a tag identified by its numeric ID.
   * The tag and subscribers themselves are not removed.
   *
   * @param id - The tag's numeric ID.
   * @returns A success response, or `null` if no tag with that ID exists.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  async clearById(id: number): Promise<RuleApiResponse | null> {
    try {
      return await this.transport.delete<RuleApiResponse>(
        `/tags/${id}/clear?identified_by=id`,
        { version: 'v2' }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Clear all subscriber associations from a tag identified by name.
   * The tag and subscribers themselves are not removed.
   *
   * @param name - The tag name (URL-encoded automatically).
   * @returns A success response, or `null` if no tag with that name exists.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  async clearByName(name: string): Promise<RuleApiResponse | null> {
    try {
      return await this.transport.delete<RuleApiResponse>(
        `/tags/${encodeURIComponent(name)}/clear?identified_by=name`,
        { version: 'v2' }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Clear all subscriber associations from a tag by ID or name.
   * Dispatches to {@link clearById} when `identifier` is a number, {@link clearByName} when it is a string.
   *
   * @param identifier - Tag ID (number) or name (string).
   * @returns A success response, or `null` if not found.
   * @throws {RuleApiError} On non-404 HTTP errors (e.g. 401, 500).
   */
  clear(identifier: string | number): Promise<RuleApiResponse | null> {
    return typeof identifier === 'number'
      ? this.clearById(identifier)
      : this.clearByName(identifier);
  }
}
