/**
 * Subscribers namespace client.
 *
 * Combines the historical v2 subscriber endpoints (sync, get, getFields,
 * getTagNames) with the v3 endpoints (create, delete, addTags, removeTag,
 * bulk operations, block/unblock). Where v2 and v3 cover the same operation
 * the v3 endpoint is used; v2 endpoints are retained only when no v3
 * equivalent exists.
 */

import { RuleApiError, RuleConfigError } from '@rule-io/core';

import { BaseResource } from '../../core/base-resource.js';
import type { RuleApiResponse } from '../../shared.types.js';

import type {
  RuleBulkSubscriberIdentifier,
  RuleBulkTagsRequest,
  RuleSubscriber,
  RuleSubscriberFieldsResponse,
  RuleSubscriberResponse,
  RuleSubscriberTagsResponse,
  RuleSubscriberTagsV3Request,
  RuleSubscriberV3CreateRequest,
  RuleSubscriberV3Response,
} from './subscribers.types.js';

export type SubscriberIdentifierBy = 'id' | 'email' | 'phone_number' | 'custom_identifier';

export class SubscribersClient extends BaseResource {
  // ── v3 endpoints (primary API) ─────────────────────────────────────────────

  /**
   * Create a subscriber via the v3 API.
   *
   * @param subscriber - Subscriber data (email, phone_number, status, etc.).
   * @returns API response with the created subscriber data.
   *
   * @example
   * ```typescript
   * const result = await client.subscribers.create({
   *   email: 'customer@example.com',
   *   status: 'ACTIVE',
   *   language: 'sv',
   * });
   * console.log(result.id);
   * ```
   */
  create(subscriber: RuleSubscriberV3CreateRequest): Promise<RuleSubscriberV3Response> {
    return this.transport.post<RuleSubscriberV3Response>('/subscribers', {
      body: JSON.stringify(subscriber),
    });
  }

  /**
   * Delete a subscriber via the v3 API. Returns `{ success: true }` on
   * successful deletion (HTTP 204).
   *
   * @param subscriber - Subscriber identifier (email, phone number, ID, or
   *   custom identifier).
   * @param identifiedBy - How the `subscriber` parameter should be
   *   interpreted (default: `'email'`).
   * @returns A success response.
   *
   * @example
   * ```typescript
   * // Delete by email (default)
   * await client.subscribers.delete('customer@example.com');
   *
   * // Delete by ID
   * await client.subscribers.delete(12345, 'id');
   * ```
   */
  async delete(
    subscriber: string | number,
    identifiedBy: SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw(
      'DELETE',
      `/subscribers/${encodeURIComponent(subscriber)}?identified_by=${identifiedBy}`
    );

    return { success: true };
  }

  /**
   * Block multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204) — Rule.io processes the block in the background.
   *
   * @param subscribers - Array of subscriber identifiers to block.
   * @param callbackUrl - Optional webhook URL to notify when the async
   *   operation completes.
   * @returns A success response indicating the request was accepted.
   *
   * @example
   * ```typescript
   * await client.subscribers.block([
   *   { email: 'spam@example.com' },
   *   { id: 456 },
   * ]);
   * ```
   */
  async block(
    subscribers: RuleBulkSubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = { subscribers };

    if (callbackUrl) payload.callback_url = callbackUrl;
    await this.transport.fetchRaw('POST', '/subscribers/block', {
      body: JSON.stringify(payload),
    });

    return { success: true };
  }

  /**
   * Unblock multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204) — Rule.io processes the unblock in the background.
   *
   * @param subscribers - Array of subscriber identifiers to unblock.
   * @param callbackUrl - Optional webhook URL to notify when the async
   *   operation completes.
   * @returns A success response indicating the request was accepted.
   *
   * @example
   * ```typescript
   * await client.subscribers.unblock([
   *   { email: 'restored@example.com' },
   *   { phone_number: '+46701234567' },
   * ]);
   * ```
   */
  async unblock(
    subscribers: RuleBulkSubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = { subscribers };

    if (callbackUrl) payload.callback_url = callbackUrl;
    await this.transport.fetchRaw('POST', '/subscribers/unblock', {
      body: JSON.stringify(payload),
    });

    return { success: true };
  }

  /**
   * Add tags to multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204) — tags are applied in the background by Rule.io.
   *
   * @param request - Subscribers and tags to apply.
   * @returns A success response indicating the request was accepted.
   *
   * @example
   * ```typescript
   * await client.subscribers.bulkAddTags({
   *   subscribers: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
   *   tags: ['newsletter', 'promo-2024'],
   * });
   * ```
   */
  async bulkAddTags(request: RuleBulkTagsRequest): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('POST', '/subscribers/tags', {
      body: JSON.stringify(request),
    });

    return { success: true };
  }

  /**
   * Remove tags from multiple subscribers in bulk via the v3 API.
   *
   * Asynchronous (HTTP 204). Sends a DELETE request with a JSON body.
   *
   * @param request - Subscribers and tags to remove.
   * @returns A success response indicating the request was accepted.
   *
   * @example
   * ```typescript
   * await client.subscribers.bulkRemoveTags({
   *   subscribers: [{ email: 'a@example.com' }],
   *   tags: ['old-campaign'],
   * });
   * ```
   */
  async bulkRemoveTags(request: RuleBulkTagsRequest): Promise<RuleApiResponse> {
    await this.transport.fetchRaw('DELETE', '/subscribers/tags', {
      body: JSON.stringify(request),
    });

    return { success: true };
  }

  /**
   * Add tags to a single subscriber via the v3 API.
   *
   * Supports automation triggering and optional subscriber sync.
   *
   * @param subscriber - Subscriber identifier (email, phone number, ID, or
   *   custom identifier).
   * @param request - Tags to add and optional automation/sync settings.
   * @param identifiedBy - How the `subscriber` parameter should be
   *   interpreted (default: `'email'`).
   * @returns A success response.
   *
   * @example
   * ```typescript
   * await client.subscribers.addTags('customer@example.com', {
   *   tags: ['vip', 'returning'],
   *   automation: 'force',
   * });
   * ```
   */
  async addTags(
    subscriber: string | number,
    request: RuleSubscriberTagsV3Request,
    identifiedBy: SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw(
      'PUT',
      `/subscribers/${encodeURIComponent(subscriber)}/tags?identified_by=${identifiedBy}`,
      { body: JSON.stringify(request) }
    );

    return { success: true };
  }

  /**
   * Remove a single tag from a subscriber via the v3 API.
   *
   * @param subscriber - Subscriber identifier (email, phone number, ID, or
   *   custom identifier).
   * @param tag - Tag name or ID to remove.
   * @param identifiedBy - How the `subscriber` parameter should be
   *   interpreted (default: `'email'`).
   * @returns A success response.
   *
   * @example
   * ```typescript
   * await client.subscribers.removeTag('customer@example.com', 'old-promo');
   * ```
   */
  async removeTag(
    subscriber: string | number,
    tag: string | number,
    identifiedBy: SubscriberIdentifierBy = 'email'
  ): Promise<RuleApiResponse> {
    await this.transport.fetchRaw(
      'DELETE',
      `/subscribers/${encodeURIComponent(subscriber)}/tags/${encodeURIComponent(String(tag))}?identified_by=${identifiedBy}`
    );

    return { success: true };
  }

  // ── v2 endpoints (no v3 equivalent) ────────────────────────────────────────

  /**
   * Create or update a subscriber via the v2 `/subscribers` endpoint.
   *
   * `fieldGroupPrefix` is prepended to every field key before the request is
   * sent (e.g. `{ FirstName: 'Anna' }` → `{ key: 'Booking.FirstName', value: 'Anna' }`).
   *
   * @param subscriber - Subscriber data including email, fields, and tags.
   *   Field keys must be bare names — the SDK adds the group prefix
   *   automatically.
   * @param fieldGroupPrefix - Group prefix for custom fields (e.g. `'Booking'`).
   *   Must be non-empty and must not contain dots.
   * @returns API response with subscriber data.
   * @throws {RuleConfigError} If `fieldGroupPrefix` is empty or contains a dot,
   *   or if any field key already contains a dot.
   *
   * @example
   * ```typescript
   * await client.subscribers.sync({
   *   email: 'customer@example.com',
   *   fields: { FirstName: 'Anna', OrderRef: 'ORD-456' },
   *   tags: ['OrderCompleted', 'Newsletter'],
   * }, 'Booking');
   * ```
   */
  async sync(subscriber: RuleSubscriber, fieldGroupPrefix: string): Promise<RuleSubscriberResponse> {
    const prefix = fieldGroupPrefix.trim();

    if (!prefix) {
      throw new RuleConfigError('fieldGroupPrefix must not be empty');
    }

    if (prefix.includes('.')) {
      throw new RuleConfigError('fieldGroupPrefix must not contain dots');
    }

    if (subscriber.fields) {
      const dottedKey = Object.keys(subscriber.fields).find((k) => k.includes('.'));

      if (dottedKey) {
        throw new RuleConfigError(
          `Field key "${dottedKey}" contains a dot. Pass bare field names (e.g. "${dottedKey.split('.').pop()}") — the SDK adds the group prefix automatically.`
        );
      }
    }

    const fields = subscriber.fields
      ? Object.entries(subscriber.fields)
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([key, value]) => ({
            key: `${prefix}.${key}`,
            value: String(value),
          }))
      : [];

    const payload = {
      update_on_duplicate: true,
      tags: subscriber.tags || [],
      subscribers: {
        email: subscriber.email,
        fields,
      },
    };

    return this.transport.post<RuleSubscriberResponse>('/subscribers', {
      version: 'v2',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get subscriber details from Rule.io.
   *
   * @param email - Subscriber email address.
   * @returns The subscriber payload, or `null` if no subscriber with that
   *   email exists (HTTP 404).
   */
  async get(email: string): Promise<RuleSubscriberResponse | null> {
    try {
      return await this.transport.get<RuleSubscriberResponse>(
        `/subscribers/${encodeURIComponent(email)}?identified_by=email`,
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
   * Get a subscriber's custom-field values, flattened to a `Group.Field` map.
   *
   * Note: Uses the `/subscriber/` (singular) endpoint, not `/subscribers/`.
   *
   * @param email - Subscriber email address.
   * @returns Map of field keys to values (e.g.
   *   `{ "Group.FirstName": "Anna" }`), or an empty object if no subscriber
   *   with that email exists (HTTP 404).
   */
  async getFields(email: string): Promise<Record<string, string | null>> {
    try {
      const response = await this.transport.get<RuleSubscriberFieldsResponse>(
        `/subscriber/${encodeURIComponent(email)}/fields?identified_by=email`,
        { version: 'v2' }
      );
      const fields: Record<string, string | null> = {};

      for (const group of response.groups || []) {
        for (const field of group.fields) {
          fields[`${group.name}.${field.name}`] = field.value;
        }
      }

      return fields;
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return {};
      }

      throw error;
    }
  }

  /**
   * Get the names of every tag attached to a subscriber.
   *
   * @param email - Subscriber email address.
   * @returns Array of tag names, or an empty array if no subscriber with that
   *   email exists (HTTP 404).
   */
  async getTagNames(email: string): Promise<string[]> {
    try {
      const response = await this.transport.get<RuleSubscriberTagsResponse>(
        `/subscribers/${encodeURIComponent(email)}/tags?identified_by=email`,
        { version: 'v2' }
      );

      return response.tags?.map((t) => t.name) ?? [];
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return [];
      }

      throw error;
    }
  }
}
