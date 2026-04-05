/**
 * Rule.io API Client
 *
 * A TypeScript client for the Rule.io email marketing API.
 * Supports both v2 (Subscriber) and v3 (Editor) APIs.
 *
 * ## API Quirks (Important!)
 *
 * 1. **Trigger type must be UPPERCASE**: When setting automail triggers,
 *    use "TAG" or "SEGMENT" (uppercase), not "tag" or "segment".
 *    The API error message incorrectly suggests lowercase.
 *
 * 2. **Two-step automail creation**: Cannot set trigger and sendout_type
 *    during creation. Must create first, then update:
 *    - POST /editor/automail (create)
 *    - PUT /editor/automail/{id} (add trigger + sendout_type)
 *
 * 3. **Template names must be unique**: Add timestamp to avoid conflicts.
 *
 * 4. **Tag ID required**: Triggers use tag ID (number), not tag name.
 *    Look up IDs via GET /api/v2/tags.
 *
 * @see .claude/RULE_IO_SETUP_GUIDE.md for complete setup instructions
 */

import { RULE_API_V2_BASE_URL, RULE_API_V3_BASE_URL } from './constants';
import { RuleApiError, RuleConfigError } from './errors';
import type {
  RuleApiResponse,
  RuleSubscriber,
  RuleSubscriberResponse,
  RuleSubscriberFieldsResponse,
  RuleSubscriberTagsResponse,
  RuleTagsResponse,
  RuleAutomailCreateRequest,
  RuleAutomailUpdateRequest,
  RuleAutomailResponse,
  RuleAutomailListParams,
  RuleAutomailListResponse,
  RuleMessageCreateRequest,
  RuleMessageResponse,
  RuleMessageListParams,
  RuleMessageListResponse,
  RuleTemplateCreateRequest,
  RuleTemplateResponse,
  RuleTemplateListParams,
  RuleTemplateListResponse,
  RuleDynamicSetCreateRequest,
  RuleDynamicSetUpdateRequest,
  RuleDynamicSetResponse,
  RuleDynamicSetListParams,
  RuleDynamicSetListResponse,
  RuleRenderTemplateParams,
  RuleCampaignCreateRequest,
  RuleCampaignUpdateRequest,
  RuleCampaignResponse,
  RuleCampaignListParams,
  RuleCampaignListResponse,
  RuleCampaignScheduleRequest,
  RuleClientConfig,
  CreateAutomationEmailConfig,
  CreateAutomationEmailResult,
  RuleCustomFieldDataListParams,
  RuleCustomFieldDataCreateRequest,
  RuleCustomFieldDataUpdateRequest,
  RuleCustomFieldDataGroupParams,
  RuleCustomFieldDataSearchParams,
  RuleCustomFieldDataResponse,
  RuleCustomFieldDataSingleResponse,
  RuleSuppressionRequest,
  RuleExportDispatcherParams,
  RuleExportDispatcherResponse,
  RuleExportStatisticsParams,
  RuleExportStatisticsResponse,
  RuleExportSubscriberParams,
  RuleExportSubscriberResponse,
  RuleSubscriberV3CreateRequest,
  RuleSubscriberV3Response,
  RuleBulkSubscriberIdentifier,
  RuleBulkTagsRequest,
  RuleSubscriberTagsV3Request,
} from './types';

/** Flat query-param bag accepted by `buildQueryString`. */
type QueryParamValues = Record<string, string | number | boolean | null | undefined>;

/**
 * Rule.io API Client
 *
 * Provides methods for interacting with Rule.io's v2 and v3 APIs.
 *
 * @example
 * ```typescript
 * const client = new RuleClient({ apiKey: 'your-api-key' });
 *
 * // Sync a subscriber
 * await client.syncSubscriber({
 *   email: 'customer@example.com',
 *   fields: { FirstName: 'Anna' },
 *   tags: ['OrderCompleted'],
 * });
 *
 * // Add tags with automation trigger
 * await client.addSubscriberTags('customer@example.com', ['accommodation'], 'force');
 * ```
 */
export class RuleClient {
  private config: Required<RuleClientConfig>;

  constructor(config: RuleClientConfig | string) {
    // Support simple string constructor for backwards compatibility
    if (typeof config === 'string') {
      this.config = {
        apiKey: config,
        baseUrlV2: RULE_API_V2_BASE_URL,
        baseUrlV3: RULE_API_V3_BASE_URL,
        fetch: globalThis.fetch,
        debug: false,
        fieldGroupPrefix: 'Booking',
      };
    } else {
      this.config = {
        apiKey: config.apiKey,
        baseUrlV2: config.baseUrlV2 ?? RULE_API_V2_BASE_URL,
        baseUrlV3: config.baseUrlV3 ?? RULE_API_V3_BASE_URL,
        fetch: config.fetch ?? globalThis.fetch,
        debug: config.debug ?? false,
        fieldGroupPrefix: config.fieldGroupPrefix ?? 'Booking',
      };
    }

    if (!this.config.apiKey) {
      throw new RuleConfigError('API key is required');
    }

    const prefix = this.config.fieldGroupPrefix.trim();
    if (!prefix) {
      throw new RuleConfigError('fieldGroupPrefix must not be empty');
    }
    if (prefix.includes('.')) {
      throw new RuleConfigError('fieldGroupPrefix must not contain dots');
    }
    this.config.fieldGroupPrefix = prefix;
  }

  /**
   * Check if this client is configured with a valid API key
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Get the API key (useful for passing to other functions)
   */
  getApiKey(): string {
    return this.config.apiKey;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeadersV3(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json;charset=utf-8',
    };
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[RuleClient]', ...args);
    }
  }

  private async request<T extends RuleApiResponse>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    const url = `${this.config.baseUrlV2}${endpoint}`;
    this.log('Request:', options.method, url);

    try {
      const response = await this.config.fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        this.log('Rate limited. Retry after', retryAfter, 'seconds');
        throw new RuleApiError('Rate limited by Rule.io API', 429);
      }

      if (response.status === 401) {
        throw new RuleApiError('Invalid Rule.io API key', 401);
      }

      if (!response.ok) {
        let message = 'Rule.io API error';
        try {
          const errorData = (await response.json()) as { error?: string; message?: string };
          if (errorData?.error || errorData?.message) {
            message = errorData.error || errorData.message || message;
          }
        } catch {
          // Response body is not valid JSON
        }
        throw new RuleApiError(message, response.status);
      }

      const data = (await response.json()) as T;
      this.log('Response:', data);
      return data;
    } catch (error) {
      if (error instanceof RuleApiError) {
        throw error;
      }
      this.log('Rule.io API request failed:', error);
      throw new RuleApiError(error instanceof Error ? error.message : 'Network error', 0);
    }
  }

  private async fetchV3(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseUrlV3}${endpoint}`;
    this.log('Request V3:', options.method, url);

    try {
      const response = await this.config.fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeadersV3(),
          ...options.headers,
        },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        this.log('Rate limited. Retry after', retryAfter, 'seconds');
        throw new RuleApiError('Rate limited by Rule.io API', 429);
      }

      if (response.status === 401) {
        throw new RuleApiError('Invalid Rule.io API key', 401);
      }

      if (!response.ok) {
        let message = 'Rule.io v3 API error';
        try {
          const text = await response.text();
          this.log('Error response body:', text);
          if (text) {
            const errorData = JSON.parse(text) as { error?: string; message?: string };
            if (errorData?.error || errorData?.message) {
              message = errorData.error || errorData.message || message;
            }
          }
        } catch {
          // Response body is not valid JSON
        }
        throw new RuleApiError(message, response.status);
      }

      return response;
    } catch (error) {
      if (error instanceof RuleApiError) {
        throw error;
      }
      this.log('Rule.io v3 API request failed:', error);
      throw new RuleApiError(error instanceof Error ? error.message : 'Network error', 0);
    }
  }

  private async requestV3<T extends RuleApiResponse>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    const response = await this.fetchV3(endpoint, options);
    const data = (await response.json()) as T;
    this.log('Response V3:', data);
    return data;
  }

  private async requestV3Text(
    endpoint: string,
    options: RequestInit
  ): Promise<string> {
    const response = await this.fetchV3(endpoint, options);
    const text = await response.text();
    this.log('Response V3 (text):', text.slice(0, 200));
    return text;
  }

  private static buildQueryString(
    params: QueryParamValues
  ): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null
    );
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  }

  // ==========================================================================
  // v2 Subscriber API
  // ==========================================================================

  /**
   * Create or update a subscriber in Rule.io
   *
   * @param subscriber - Subscriber data including email, fields, and tags
   * @returns API response with subscriber data
   *
   * @example
   * ```typescript
   * await client.syncSubscriber({
   *   email: 'customer@example.com',
   *   fields: {
   *     FirstName: 'Anna',
   *     OrderRef: 'ORD-456',
   *   },
   *   tags: ['OrderCompleted', 'Newsletter'],
   * });
   * ```
   */
  async syncSubscriber(subscriber: RuleSubscriber): Promise<RuleSubscriberResponse> {
    // Filter out undefined/null/empty string fields
    // Rule.io requires fields in format "Group.FieldName"
    const prefix = this.config.fieldGroupPrefix;

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
          .filter(([, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => ({
            key: `${prefix}.${key}`,
            value: String(value),
          }))
      : [];

    // Rule.io API v2 requires:
    // - tags at top level (not inside subscribers)
    // - subscribers as an object (not an array)
    const payload = {
      update_on_duplicate: true,
      tags: subscriber.tags || [],
      subscribers: {
        email: subscriber.email,
        fields,
      },
    };

    return this.request<RuleSubscriberResponse>('/subscribers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Add tags to a subscriber and optionally trigger automations
   *
   * @param email - Subscriber email address
   * @param tags - Tags to add
   * @param triggerAutomation - How to handle automations: 'force' (always trigger),
   *                           'reset' (re-trigger with delay reset), or false (don't trigger)
   *
   * @example
   * ```typescript
   * // Add tags and trigger automation
   * await client.addSubscriberTags('customer@example.com', ['OrderCompleted'], 'force');
   *
   * // Add tags without triggering automation
   * await client.addSubscriberTags('customer@example.com', ['vip'], false);
   * ```
   */
  async addSubscriberTags(
    email: string,
    tags: string[],
    triggerAutomation: 'force' | 'reset' | false = 'force'
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = { tags };

    if (triggerAutomation) {
      payload.automation = triggerAutomation;
    }

    return this.request<RuleApiResponse>(
      `/subscribers/${encodeURIComponent(email)}/tags?identified_by=email`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * Remove tags from a subscriber
   *
   * @param email - Subscriber email address
   * @param tags - Tags to remove
   */
  async removeSubscriberTags(email: string, tags: string[]): Promise<RuleApiResponse> {
    const results = await Promise.all(
      tags.map((tag) =>
        this.request<RuleApiResponse>(
          `/subscribers/${encodeURIComponent(email)}/tags/${encodeURIComponent(tag)}?identified_by=email`,
          { method: 'DELETE' }
        )
      )
    );

    return { success: results.every((r) => r.success !== false) };
  }

  /**
   * Get subscriber details from Rule.io
   *
   * @param email - Subscriber email address
   * @returns Subscriber data or null if not found
   */
  async getSubscriber(email: string): Promise<RuleSubscriberResponse | null> {
    try {
      return await this.request<RuleSubscriberResponse>(
        `/subscribers/${encodeURIComponent(email)}?identified_by=email`,
        { method: 'GET' }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a subscriber from Rule.io
   *
   * @param email - Subscriber email address
   */
  async deleteSubscriber(email: string): Promise<RuleApiResponse> {
    return this.request<RuleApiResponse>(
      `/subscribers/${encodeURIComponent(email)}?identified_by=email`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get subscriber's tags from Rule.io
   *
   * @param email - Subscriber email address
   * @returns Array of tag names
   */
  async getSubscriberTags(email: string): Promise<string[]> {
    try {
      const response = await this.request<RuleSubscriberTagsResponse>(
        `/subscribers/${encodeURIComponent(email)}/tags?identified_by=email`,
        { method: 'GET' }
      );
      return response.tags?.map((t) => t.name) || [];
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get subscriber's custom fields from Rule.io
   *
   * Note: Uses /subscriber/ (singular) endpoint, not /subscribers/
   *
   * @param email - Subscriber email address
   * @returns Map of field keys to values (e.g., { "Group.FirstName": "Anna" })
   */
  async getSubscriberFields(email: string): Promise<Record<string, string | null>> {
    try {
      const response = await this.request<RuleSubscriberFieldsResponse>(
        `/subscriber/${encodeURIComponent(email)}/fields?identified_by=email`,
        { method: 'GET' }
      );

      // Flatten groups into a simple key-value map
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

  // ==========================================================================
  // v2 Tags API
  // ==========================================================================

  /**
   * Get all tags from Rule.io
   *
   * @returns List of tags with their IDs
   */
  async getTags(): Promise<RuleTagsResponse> {
    return this.request<RuleTagsResponse>('/tags', { method: 'GET' });
  }

  /**
   * Get a tag ID by name
   *
   * @param name - Tag name (e.g., "order-confirmed")
   * @returns Tag ID or null if not found
   */
  async getTagIdByName(name: string): Promise<number | null> {
    const response = await this.getTags();
    const tag = response.tags?.find((t) => t.name === name);
    return tag?.id ?? null;
  }

  // ==========================================================================
  // v3 Editor API - Automail
  // ==========================================================================

  /**
   * Create an automail (automation workflow) in Rule.io
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Automail
   */
  async createAutomail(automail: RuleAutomailCreateRequest): Promise<RuleAutomailResponse> {
    return this.requestV3<RuleAutomailResponse>('/editor/automail', {
      method: 'POST',
      body: JSON.stringify(automail),
    });
  }

  /**
   * Get an automail by ID
   */
  async getAutomail(id: number): Promise<RuleAutomailResponse | null> {
    try {
      return await this.requestV3<RuleAutomailResponse>(`/editor/automail/${id}`, {
        method: 'GET',
      });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update an automail with trigger and sendout type.
   *
   * IMPORTANT: The trigger.type must be uppercase ("TAG" or "SEGMENT").
   * The API error messages incorrectly suggest lowercase, but uppercase is required.
   *
   * @param id - Automail ID
   * @param update - Update request with name, active, trigger, and sendout_type
   */
  async updateAutomail(
    id: number,
    update: RuleAutomailUpdateRequest
  ): Promise<RuleAutomailResponse> {
    return this.requestV3<RuleAutomailResponse>(`/editor/automail/${id}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  /**
   * Delete an automail
   */
  async deleteAutomail(id: number): Promise<RuleApiResponse> {
    return this.requestV3<RuleApiResponse>(`/editor/automail/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * List automails with optional filtering and pagination.
   *
   * @param params - Optional query parameters for filtering and pagination
   * @returns List of automails
   *
   * @example
   * ```typescript
   * // List all automails
   * const all = await client.listAutomails();
   *
   * // List active email automails, page 2
   * const filtered = await client.listAutomails({
   *   active: true,
   *   message_type: 1,
   *   page: 2,
   *   per_page: 20,
   * });
   * ```
   */
  async listAutomails(params?: RuleAutomailListParams): Promise<RuleAutomailListResponse> {
    const qs = params ? RuleClient.buildQueryString({ ...params }) : '';
    return this.requestV3<RuleAutomailListResponse>(`/editor/automail${qs}`, {
      method: 'GET',
    });
  }

  // ==========================================================================
  // v3 Editor API - Message
  // ==========================================================================

  /**
   * Create a message for an automail
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Message
   */
  async createMessage(message: RuleMessageCreateRequest): Promise<RuleMessageResponse> {
    return this.requestV3<RuleMessageResponse>('/editor/message', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  /**
   * Get a message by ID
   */
  async getMessage(id: number): Promise<RuleMessageResponse | null> {
    try {
      return await this.requestV3<RuleMessageResponse>(`/editor/message/${id}`, {
        method: 'GET',
      });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a message
   */
  async updateMessage(
    id: number,
    message: Partial<RuleMessageCreateRequest>
  ): Promise<RuleMessageResponse> {
    return this.requestV3<RuleMessageResponse>(`/editor/message/${id}`, {
      method: 'PUT',
      body: JSON.stringify(message),
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: number): Promise<RuleApiResponse> {
    return this.requestV3<RuleApiResponse>(`/editor/message/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * List messages for a dispatcher (automail or campaign).
   *
   * Both `id` and `dispatcher_type` are required by the API.
   *
   * @param params - Dispatcher ID and type
   * @returns List of messages for the dispatcher
   *
   * @example
   * ```typescript
   * const messages = await client.listMessages({
   *   id: 123,
   *   dispatcher_type: 'automail',
   * });
   * ```
   */
  async listMessages(params: RuleMessageListParams): Promise<RuleMessageListResponse> {
    const qs = RuleClient.buildQueryString({ ...params });
    return this.requestV3<RuleMessageListResponse>(`/editor/message${qs}`, {
      method: 'GET',
    });
  }

  // ==========================================================================
  // v3 Editor API - Template
  // ==========================================================================

  /**
   * Create a template with RCML content
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Template
   */
  async createTemplate(template: RuleTemplateCreateRequest): Promise<RuleTemplateResponse> {
    return this.requestV3<RuleTemplateResponse>('/editor/template', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: number): Promise<RuleTemplateResponse | null> {
    try {
      return await this.requestV3<RuleTemplateResponse>(`/editor/template/${id}`, {
        method: 'GET',
      });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: number,
    template: Partial<RuleTemplateCreateRequest>
  ): Promise<RuleTemplateResponse> {
    return this.requestV3<RuleTemplateResponse>(`/editor/template/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: number): Promise<RuleApiResponse> {
    return this.requestV3<RuleApiResponse>(`/editor/template/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * List templates with optional pagination.
   *
   * @param params - Optional pagination parameters
   * @returns List of templates
   *
   * @example
   * ```typescript
   * const templates = await client.listTemplates({ page: 1, per_page: 50 });
   * ```
   */
  async listTemplates(params?: RuleTemplateListParams): Promise<RuleTemplateListResponse> {
    const qs = params ? RuleClient.buildQueryString({ ...params }) : '';
    return this.requestV3<RuleTemplateListResponse>(`/editor/template${qs}`, {
      method: 'GET',
    });
  }

  /**
   * Render a template to HTML.
   *
   * Optionally pass a subscriber_id to substitute merge tags with the subscriber's
   * field values (e.g., `{{Booking.FirstName}}` becomes their actual name).
   *
   * @param id - Template ID
   * @param params - Optional parameters (subscriber_id for merge tag substitution)
   * @returns Rendered HTML string, or null if the template is not found
   *
   * @example
   * ```typescript
   * const html = await client.renderTemplate(42);
   *
   * // With subscriber data for merge tag substitution
   * const personalized = await client.renderTemplate(42, { subscriber_id: 1001 });
   * ```
   */
  async renderTemplate(
    id: number,
    params?: RuleRenderTemplateParams
  ): Promise<string | null> {
    const qs = params ? RuleClient.buildQueryString({ ...params }) : '';
    try {
      return await this.requestV3Text(`/editor/template/${id}/render${qs}`, {
        method: 'GET',
      });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  // ==========================================================================
  // v3 Editor API - Dynamic Set
  // ==========================================================================

  /**
   * Create a dynamic set to connect a message with a template
   *
   * @see https://app.rule.io/redoc/v3#tag/New-Editor.-Dynamic-Set
   */
  async createDynamicSet(dynamicSet: RuleDynamicSetCreateRequest): Promise<RuleDynamicSetResponse> {
    return this.requestV3<RuleDynamicSetResponse>('/editor/dynamic-set', {
      method: 'POST',
      body: JSON.stringify(dynamicSet),
    });
  }

  /**
   * Get a dynamic set by ID
   */
  async getDynamicSet(id: number): Promise<RuleDynamicSetResponse | null> {
    try {
      return await this.requestV3<RuleDynamicSetResponse>(`/editor/dynamic-set/${id}`, {
        method: 'GET',
      });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a dynamic set
   */
  async deleteDynamicSet(id: number): Promise<RuleApiResponse> {
    return this.requestV3<RuleApiResponse>(`/editor/dynamic-set/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * List dynamic sets for a message.
   *
   * The `message_id` is required — the API returns all dynamic sets for that message.
   *
   * @param params - Query parameters with required message_id
   * @returns List of dynamic sets
   *
   * @example
   * ```typescript
   * const sets = await client.listDynamicSets({ message_id: 456 });
   * ```
   */
  async listDynamicSets(params: RuleDynamicSetListParams): Promise<RuleDynamicSetListResponse> {
    const qs = RuleClient.buildQueryString({ ...params });
    return this.requestV3<RuleDynamicSetListResponse>(`/editor/dynamic-set${qs}`, {
      method: 'GET',
    });
  }

  /**
   * Update a dynamic set.
   *
   * Note: If a duplicate active dynamic set with the same trigger already exists
   * and this one has `active: true`, the API may automatically deactivate it.
   *
   * @param id - Dynamic set ID
   * @param update - Update request body
   * @returns Updated dynamic set
   *
   * @example
   * ```typescript
   * await client.updateDynamicSet(789, {
   *   message_id: 456,
   *   template_id: 101,
   *   active: true,
   * });
   * ```
   */
  async updateDynamicSet(
    id: number,
    update: RuleDynamicSetUpdateRequest
  ): Promise<RuleDynamicSetResponse> {
    return this.requestV3<RuleDynamicSetResponse>(`/editor/dynamic-set/${id}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // ==========================================================================
  // v3 Custom Field Data API (Deprecated)
  // ==========================================================================

  /**
   * Get custom field data for a subscriber.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   * @param subscriberId - The subscriber's numeric ID
   * @param params - Optional pagination and group filters
   * @returns Custom field data records for the subscriber
   *
   * @example
   * ```typescript
   * const data = await client.getCustomFieldData(42);
   * const filtered = await client.getCustomFieldData(42, {
   *   page: 1,
   *   per_page: 10,
   *   groups_id: [1, 2],
   * });
   * ```
   */
  async getCustomFieldData(
    subscriberId: number,
    params?: RuleCustomFieldDataListParams
  ): Promise<RuleCustomFieldDataResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page != null) searchParams.set('page', String(params.page));
    if (params?.per_page != null) searchParams.set('per_page', String(params.per_page));
    if (params?.groups_id) {
      params.groups_id.forEach((id) => searchParams.append('groups_id[]', String(id)));
    }
    if (params?.groups_name) {
      params.groups_name.forEach((name) => searchParams.append('groups_name[]', name));
    }
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.requestV3<RuleCustomFieldDataResponse>(
      `/custom-field-data/${subscriberId}${qs}`,
      { method: 'GET' }
    );
  }

  /**
   * Create custom field data for a subscriber.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   * @param subscriberId - The subscriber's numeric ID
   * @param request - The field data to create, grouped by field group
   * @returns API response (201 on success)
   *
   * @example
   * ```typescript
   * await client.createCustomFieldData(42, {
   *   groups: [{
   *     group: 'Order',
   *     create_if_not_exists: true,
   *     values: [{ field: 'Ref', create_if_not_exists: true, value: 'ORD-123' }],
   *   }],
   * });
   * ```
   */
  async createCustomFieldData(
    subscriberId: number,
    request: RuleCustomFieldDataCreateRequest
  ): Promise<RuleApiResponse> {
    return this.requestV3<RuleApiResponse>(
      `/custom-field-data/${subscriberId}`,
      { method: 'POST', body: JSON.stringify(request) }
    );
  }

  /**
   * Update custom field data for a subscriber.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   * @param subscriberId - The subscriber's numeric ID
   * @param request - The identifier for the record to update and new values
   * @returns API response (204 on success)
   *
   * @example
   * ```typescript
   * await client.updateCustomFieldData(42, {
   *   identifier: { group: 'Order', field: 'Ref', value: 'ORD-123' },
   *   values: [{ field: 'Status', value: 'shipped' }],
   * });
   * ```
   */
  async updateCustomFieldData(
    subscriberId: number,
    request: RuleCustomFieldDataUpdateRequest
  ): Promise<RuleApiResponse> {
    await this.fetchV3(`/custom-field-data/${subscriberId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    return { success: true };
  }

  /**
   * Get custom field data for a subscriber filtered by group.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   * @param subscriberId - The subscriber's numeric ID
   * @param group - Group ID (number) or group name (string)
   * @param params - Optional pagination and field filters
   * @returns Custom field data records in the specified group
   *
   * @example
   * ```typescript
   * const data = await client.getCustomFieldDataByGroup(42, 'Order');
   * const byId = await client.getCustomFieldDataByGroup(42, 5, {
   *   page: 1,
   *   per_page: 10,
   *   fields: ['Ref', 'Status'],
   * });
   * ```
   */
  async getCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string,
    params?: RuleCustomFieldDataGroupParams
  ): Promise<RuleCustomFieldDataResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page != null) searchParams.set('page', String(params.page));
    if (params?.per_page != null) searchParams.set('per_page', String(params.per_page));
    if (params?.fields) {
      params.fields.forEach((f) => searchParams.append('fields[]', f));
    }
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.requestV3<RuleCustomFieldDataResponse>(
      `/custom-field-data/${subscriberId}/group/${encodeURIComponent(String(group))}${qs}`,
      { method: 'GET' }
    );
  }

  /**
   * Delete all custom field data for a subscriber in a specific group.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   * @param subscriberId - The subscriber's numeric ID
   * @param group - Group ID (number) or group name (string)
   * @returns API response
   *
   * @example
   * ```typescript
   * await client.deleteCustomFieldDataByGroup(42, 'Order');
   * await client.deleteCustomFieldDataByGroup(42, 5);
   * ```
   */
  async deleteCustomFieldDataByGroup(
    subscriberId: number,
    group: number | string
  ): Promise<RuleApiResponse> {
    return this.requestV3<RuleApiResponse>(
      `/custom-field-data/${subscriberId}/group/${encodeURIComponent(String(group))}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Search custom field data for a subscriber by identifier.
   *
   * @deprecated Custom Field Data API is deprecated by Rule.io.
   * @param subscriberId - The subscriber's numeric ID
   * @param params - Search parameters (data_id, group, field, value)
   * @returns A single matching record, or null if not found
   *
   * @example
   * ```typescript
   * const record = await client.searchCustomFieldData(42, {
   *   group: 'Order',
   *   field: 'Ref',
   *   value: 'ORD-123',
   * });
   * if (record) {
   *   console.log(record.data?.values);
   * }
   * ```
   */
  async searchCustomFieldData(
    subscriberId: number,
    params: RuleCustomFieldDataSearchParams
  ): Promise<RuleCustomFieldDataSingleResponse | null> {
    const searchParams = new URLSearchParams();
    if (params.data_id !== undefined) searchParams.set('data_id', String(params.data_id));
    if (params.group !== undefined) searchParams.set('group', String(params.group));
    if (params.field !== undefined) searchParams.set('field', String(params.field));
    if (params.value !== undefined) searchParams.set('value', params.value);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    try {
      return await this.requestV3<RuleCustomFieldDataSingleResponse>(
        `/custom-field-data/${subscriberId}/search${qs}`,
        { method: 'GET' }
      );
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  // ==========================================================================
  // v3 Editor API - Campaign
  // ==========================================================================

  /**
   * List campaigns with optional filtering and pagination.
   *
   * @param params - Optional query parameters for filtering and pagination
   * @returns List of campaigns
   *
   * @example
   * ```typescript
   * // List all campaigns
   * const all = await client.listCampaigns();
   *
   * // List email campaigns, page 2
   * const filtered = await client.listCampaigns({
   *   message_type: 1,
   *   page: 2,
   *   per_page: 20,
   * });
   * ```
   */
  async listCampaigns(params?: RuleCampaignListParams): Promise<RuleCampaignListResponse> {
    const qs = params ? RuleClient.buildQueryString({ ...params }) : '';
    return this.requestV3<RuleCampaignListResponse>(`/editor/campaign${qs}`, {
      method: 'GET',
    });
  }

  /**
   * Create a campaign (one-off email send) in Rule.io.
   *
   * @param campaign - Campaign creation request
   * @returns Created campaign data
   *
   * @example
   * ```typescript
   * const result = await client.createCampaign({
   *   message_type: 1, // email
   *   sendout_type: 1, // marketing
   *   tags: [{ id: 42, negative: false }],
   * });
   * console.log(result.data?.id);
   * ```
   */
  async createCampaign(campaign: RuleCampaignCreateRequest): Promise<RuleCampaignResponse> {
    return this.requestV3<RuleCampaignResponse>('/editor/campaign', {
      method: 'POST',
      body: JSON.stringify(campaign),
    });
  }

  /**
   * Get a campaign by ID.
   *
   * @param id - Campaign ID
   * @returns Campaign data or null if not found
   *
   * @example
   * ```typescript
   * const campaign = await client.getCampaign(123);
   * if (campaign) {
   *   console.log(campaign.data?.name);
   * }
   * ```
   */
  async getCampaign(id: number): Promise<RuleCampaignResponse | null> {
    try {
      return await this.requestV3<RuleCampaignResponse>(`/editor/campaign/${id}`, {
        method: 'GET',
      });
    } catch (error) {
      if (error instanceof RuleApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a campaign.
   *
   * All recipient arrays (tags, segments, subscribers) are required in the
   * request body. Pass empty arrays for unused recipient types.
   *
   * @param id - Campaign ID
   * @param update - Update request with name, sendout_type, and recipient arrays
   * @returns Updated campaign data
   *
   * @example
   * ```typescript
   * await client.updateCampaign(123, {
   *   name: 'Spring Sale',
   *   sendout_type: 1,
   *   tags: [{ id: 42, negative: false }],
   *   segments: [],
   *   subscribers: [],
   * });
   * ```
   */
  async updateCampaign(
    id: number,
    update: RuleCampaignUpdateRequest
  ): Promise<RuleCampaignResponse> {
    return this.requestV3<RuleCampaignResponse>(`/editor/campaign/${id}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  /**
   * Delete a campaign.
   *
   * @param id - Campaign ID
   * @returns API response
   *
   * @example
   * ```typescript
   * await client.deleteCampaign(123);
   * ```
   */
  async deleteCampaign(id: number): Promise<RuleApiResponse> {
    return this.requestV3<RuleApiResponse>(`/editor/campaign/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Copy (duplicate) a campaign.
   *
   * @param id - Campaign ID to copy
   * @returns The newly created campaign copy
   *
   * @example
   * ```typescript
   * const copy = await client.copyCampaign(123);
   * console.log(copy.data?.id); // new campaign ID
   * ```
   */
  async copyCampaign(id: number): Promise<RuleCampaignResponse> {
    return this.requestV3<RuleCampaignResponse>(`/editor/campaign/${id}/copy`, {
      method: 'POST',
    });
  }

  /**
   * Schedule, send immediately, or cancel the schedule of a campaign.
   *
   * - `type: 'now'` sends the campaign immediately
   * - `type: 'schedule'` with a `datetime` schedules it for later
   * - `type: null` cancels a previously scheduled send
   *
   * @param id - Campaign ID
   * @param schedule - Schedule configuration
   * @returns API response
   *
   * @example
   * ```typescript
   * // Send now
   * await client.scheduleCampaign(123, { type: 'now' });
   *
   * // Schedule for later
   * await client.scheduleCampaign(123, {
   *   type: 'schedule',
   *   datetime: '2025-06-15 10:00:00',
   * });
   *
   * // Cancel schedule
   * await client.scheduleCampaign(123, { type: null });
   * ```
   */
  async scheduleCampaign(
    id: number,
    schedule: RuleCampaignScheduleRequest
  ): Promise<RuleApiResponse> {
    return this.requestV3<RuleApiResponse>(`/editor/campaign/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  // ==========================================================================
  // v3 Suppressions API
  // ==========================================================================

  /**
   * Create suppressions to prevent subscribers from receiving marketing sendouts.
   *
   * The request is processed asynchronously by the Rule.io API. Already-suppressed
   * subscribers are silently skipped (idempotent). A maximum of 1000 subscribers
   * can be included per request.
   *
   * @param request - Suppression request with subscriber identifiers and optional filters
   * @returns A success response (actual processing happens asynchronously)
   *
   * @example
   * ```typescript
   * // Suppress all channels for two subscribers
   * await client.createSuppressions({
   *   subscribers: [
   *     { email: 'user1@example.com' },
   *     { email: 'user2@example.com' },
   *   ],
   * });
   *
   * // Suppress only email channel with a callback
   * await client.createSuppressions({
   *   subscribers: [{ email: 'user@example.com' }],
   *   message_types: ['email'],
   *   callback_url: 'https://example.com/webhook/suppression-done',
   * });
   * ```
   */
  async createSuppressions(request: RuleSuppressionRequest): Promise<RuleApiResponse> {
    if (!request.subscribers?.length) {
      throw new RuleConfigError('subscribers array must not be empty');
    }
    if (request.subscribers.length > 1000) {
      throw new RuleConfigError('subscribers array must not exceed 1000 items');
    }
    await this.fetchV3('/suppressions/', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return { success: true };
  }

  /**
   * Delete suppressions to allow subscribers to receive marketing sendouts again.
   *
   * The request is processed asynchronously by the Rule.io API. If `message_types`
   * is omitted, all channel suppressions are removed for the specified subscribers.
   *
   * @param request - Unsuppression request with subscriber identifiers and optional filters
   * @returns A success response (actual processing happens asynchronously)
   *
   * @example
   * ```typescript
   * // Remove all suppressions for a subscriber
   * await client.deleteSuppressions({
   *   subscribers: [{ email: 'user@example.com' }],
   * });
   *
   * // Remove only text_message suppression with a callback
   * await client.deleteSuppressions({
   *   subscribers: [{ email: 'user@example.com' }],
   *   message_types: ['text_message'],
   *   callback_url: 'https://example.com/webhook/unsuppression-done',
   * });
   * ```
   */
  async deleteSuppressions(request: RuleSuppressionRequest): Promise<RuleApiResponse> {
    if (!request.subscribers?.length) {
      throw new RuleConfigError('subscribers array must not be empty');
    }
    if (request.subscribers.length > 1000) {
      throw new RuleConfigError('subscribers array must not exceed 1000 items');
    }
    await this.fetchV3('/suppressions/', {
      method: 'DELETE',
      body: JSON.stringify(request),
    });
    return { success: true };
  }

  // ==========================================================================
  // v3 Subscriber API
  // ==========================================================================

  /**
   * ## v3 Subscriber Methods
   *
   * The v3 subscriber endpoints extend the v2 subscriber API with new
   * capabilities including block/unblock management, bulk tag operations,
   * and flexible identifier options (`identified_by`).
   *
   * **Overlap with v2:** Several v3 methods mirror existing v2 helpers.
   * Where they overlap, the v3 versions use a `V3` suffix to avoid
   * naming collisions:
   *
   * | v2 method               | v3 equivalent             |
   * |-------------------------|---------------------------|
   * | `syncSubscriber()`      | `createSubscriberV3()`    |
   * | `deleteSubscriber()`    | `deleteSubscriberV3()`    |
   * | `addSubscriberTags()`   | `addSubscriberTagsV3()`   |
   * | `removeSubscriberTag()` | `removeSubscriberTagV3()` |
   *
   * **v3-only operations** (no v2 equivalent):
   * - `blockSubscribers()` / `unblockSubscribers()` — manage subscriber
   *   block status
   * - `bulkAddTags()` / `bulkRemoveTags()` — tag operations across
   *   multiple subscribers in a single request
   *
   * **Key behavioral differences from v2:**
   * - Bulk operations are asynchronous and return `204 No Content` rather
   *   than an immediate resource payload.
   * - Some v3 delete operations use `DELETE` with a JSON request body.
   * - The `identifiedBy` parameter defaults to `'email'` but supports
   *   `'phone_number'`, `'id'`, and `'custom_identifier'`.
   *
   * The v2 methods remain available for backward compatibility. Choose v3
   * when you need the additional capabilities listed above.
   */

  /**
   * Create a subscriber via the v3 API.
   *
   * @param subscriber - Subscriber data (email, phone_number, status, etc.)
   * @returns API response with the created subscriber data
   *
   * @example
   * ```typescript
   * const result = await client.createSubscriberV3({
   *   email: 'customer@example.com',
   *   status: 'ACTIVE',
   *   language: 'sv',
   * });
   * console.log(result.id);
   * ```
   */
  async createSubscriberV3(
    subscriber: RuleSubscriberV3CreateRequest
  ): Promise<RuleSubscriberV3Response> {
    return this.requestV3<RuleSubscriberV3Response>('/subscribers', {
      method: 'POST',
      body: JSON.stringify(subscriber),
    });
  }

  /**
   * Delete a subscriber via the v3 API.
   *
   * Returns `{ success: true }` on successful deletion (HTTP 204).
   *
   * @param subscriber - Subscriber identifier (email, phone number, ID, or custom identifier)
   * @param identifiedBy - How the subscriber parameter should be interpreted (default: 'email')
   * @returns API response indicating success
   *
   * @example
   * ```typescript
   * // Delete by email (default)
   * await client.deleteSubscriberV3('customer@example.com');
   *
   * // Delete by ID
   * await client.deleteSubscriberV3(12345, 'id');
   * ```
   */
  async deleteSubscriberV3(
    subscriber: string | number,
    identifiedBy: 'id' | 'email' | 'phone_number' | 'custom_identifier' = 'email'
  ): Promise<RuleApiResponse> {
    const idParam = `?identified_by=${identifiedBy}`;
    await this.fetchV3(`/subscribers/${encodeURIComponent(subscriber)}${idParam}`, {
      method: 'DELETE',
    });
    return { success: true };
  }

  /**
   * Block multiple subscribers in bulk via the v3 API.
   *
   * This is an asynchronous operation (HTTP 204). The block is processed
   * in the background by Rule.io.
   *
   * @param subscribers - Array of subscriber identifiers to block
   * @param callbackUrl - Optional webhook URL to notify when the async operation completes
   * @returns API response indicating the request was accepted
   *
   * @example
   * ```typescript
   * await client.blockSubscribers([
   *   { email: 'spam@example.com' },
   *   { id: 456 },
   * ]);
   * ```
   */
  async blockSubscribers(
    subscribers: RuleBulkSubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = { subscribers };
    if (callbackUrl) payload.callback_url = callbackUrl;
    await this.fetchV3('/subscribers/block', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true };
  }

  /**
   * Unblock multiple subscribers in bulk via the v3 API.
   *
   * This is an asynchronous operation (HTTP 204). The unblock is processed
   * in the background by Rule.io.
   *
   * @param subscribers - Array of subscriber identifiers to unblock
   * @param callbackUrl - Optional webhook URL to notify when the async operation completes
   * @returns API response indicating the request was accepted
   *
   * @example
   * ```typescript
   * await client.unblockSubscribers([
   *   { email: 'restored@example.com' },
   *   { phone_number: '+46701234567' },
   * ]);
   * ```
   */
  async unblockSubscribers(
    subscribers: RuleBulkSubscriberIdentifier[],
    callbackUrl?: string
  ): Promise<RuleApiResponse> {
    const payload: Record<string, unknown> = { subscribers };
    if (callbackUrl) payload.callback_url = callbackUrl;
    await this.fetchV3('/subscribers/unblock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true };
  }

  /**
   * Add tags to multiple subscribers in bulk via the v3 API.
   *
   * This is an asynchronous operation (HTTP 204). Tags are applied
   * in the background by Rule.io.
   *
   * @param request - Subscribers and tags to apply
   * @returns API response indicating the request was accepted
   *
   * @example
   * ```typescript
   * await client.bulkAddTags({
   *   subscribers: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
   *   tags: ['newsletter', 'promo-2024'],
   * });
   * ```
   */
  async bulkAddTags(request: RuleBulkTagsRequest): Promise<RuleApiResponse> {
    await this.fetchV3('/subscribers/tags', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return { success: true };
  }

  /**
   * Remove tags from multiple subscribers in bulk via the v3 API.
   *
   * This is an asynchronous operation (HTTP 204). Tags are removed
   * in the background by Rule.io.
   *
   * Note: This sends a DELETE request with a JSON body.
   *
   * @param request - Subscribers and tags to remove
   * @returns API response indicating the request was accepted
   *
   * @example
   * ```typescript
   * await client.bulkRemoveTags({
   *   subscribers: [{ email: 'a@example.com' }],
   *   tags: ['old-campaign'],
   * });
   * ```
   */
  async bulkRemoveTags(request: RuleBulkTagsRequest): Promise<RuleApiResponse> {
    await this.fetchV3('/subscribers/tags', {
      method: 'DELETE',
      body: JSON.stringify(request),
    });
    return { success: true };
  }

  /**
   * Add tags to a single subscriber via the v3 API.
   *
   * Supports automation triggering and optional subscriber sync.
   *
   * @param subscriber - Subscriber identifier (email, phone number, ID, or custom identifier)
   * @param request - Tags to add and optional automation/sync settings
   * @param identifiedBy - How the subscriber parameter should be interpreted (default: 'email')
   * @returns API response indicating success
   *
   * @example
   * ```typescript
   * await client.addSubscriberTagsV3('customer@example.com', {
   *   tags: ['vip', 'returning'],
   *   automation: 'force',
   * });
   * ```
   */
  async addSubscriberTagsV3(
    subscriber: string | number,
    request: RuleSubscriberTagsV3Request,
    identifiedBy: 'id' | 'email' | 'phone_number' | 'custom_identifier' = 'email'
  ): Promise<RuleApiResponse> {
    const idParam = `?identified_by=${identifiedBy}`;
    await this.fetchV3(
      `/subscribers/${encodeURIComponent(subscriber)}/tags${idParam}`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
      }
    );
    return { success: true };
  }

  /**
   * Remove a single tag from a subscriber via the v3 API.
   *
   * @param subscriber - Subscriber identifier (email, phone number, ID, or custom identifier)
   * @param tag - Tag name or ID to remove
   * @param identifiedBy - How the subscriber parameter should be interpreted (default: 'email')
   * @returns API response indicating success
   *
   * @example
   * ```typescript
   * await client.removeSubscriberTagV3('customer@example.com', 'old-promo');
   * ```
   */
  async removeSubscriberTagV3(
    subscriber: string | number,
    tag: string | number,
    identifiedBy: 'id' | 'email' | 'phone_number' | 'custom_identifier' = 'email'
  ): Promise<RuleApiResponse> {
    const idParam = `?identified_by=${identifiedBy}`;
    await this.fetchV3(
      `/subscribers/${encodeURIComponent(subscriber)}/tags/${encodeURIComponent(String(tag))}${idParam}`,
      {
        method: 'DELETE',
      }
    );
    return { success: true };
  }

  // ==========================================================================
  // v3 Enterprise Export API
  // ==========================================================================

  /**
   * Export dispatcher (send) records for a given date range.
   *
   * **Important:** The maximum date range is 1 day. The API will reject
   * requests where `date_to` is more than 1 day after `date_from`.
   *
   * These endpoints may return large datasets. Use `page` and `limit`
   * parameters to paginate through the results.
   *
   * @param params - Date range (max 1 day) and optional pagination
   * @returns Dispatcher export records
   *
   * @example
   * ```typescript
   * const result = await client.exportDispatchers({
   *   date_from: '2024-06-15',
   *   date_to: '2024-06-15',
   *   page: 1,
   *   limit: 100,
   * });
   * console.log(result.data); // RuleDispatcherExportRecord[]
   * ```
   */
  async exportDispatchers(
    params: RuleExportDispatcherParams
  ): Promise<RuleExportDispatcherResponse> {
    const qs = RuleClient.buildQueryString({ ...params });
    return this.requestV3<RuleExportDispatcherResponse>(`/export/dispatcher${qs}`, {
      method: 'GET',
    });
  }

  /**
   * Export statistics records for a given date range.
   *
   * Records are sorted by ID. Each event may have multiple stat records.
   * Use `page` and `limit` parameters to paginate through large datasets.
   *
   * @param params - Date range and optional pagination
   * @returns Statistics export records
   *
   * @example
   * ```typescript
   * const result = await client.exportStatistics({
   *   date_from: '2024-06-01',
   *   date_to: '2024-06-30',
   *   page: 1,
   *   limit: 50,
   * });
   * console.log(result.data); // RuleStatisticsExportRecord[]
   * ```
   */
  async exportStatistics(
    params: RuleExportStatisticsParams
  ): Promise<RuleExportStatisticsResponse> {
    const qs = RuleClient.buildQueryString({ ...params });
    return this.requestV3<RuleExportStatisticsResponse>(`/export/statistics${qs}`, {
      method: 'GET',
    });
  }

  /**
   * Export subscriber records with optional pagination.
   *
   * This endpoint may return large datasets. Use `page` and `limit`
   * parameters to paginate through the results.
   *
   * @param params - Optional pagination parameters
   * @returns Subscriber export records
   *
   * @example
   * ```typescript
   * const result = await client.exportSubscribers({ page: 1, limit: 100 });
   * console.log(result.data); // RuleSubscriberExportRecord[]
   * ```
   */
  async exportSubscribers(
    params?: RuleExportSubscriberParams
  ): Promise<RuleExportSubscriberResponse> {
    const qs = params ? RuleClient.buildQueryString({ ...params }) : '';
    return this.requestV3<RuleExportSubscriberResponse>(`/export/subscriber${qs}`, {
      method: 'GET',
    });
  }

  // ==========================================================================
  // High-Level Helpers
  // ==========================================================================

  /**
   * Create a complete automation email workflow:
   * 1. Create automail (automation)
   * 2. Create message (email metadata)
   * 3. Create template (RCML content)
   * 4. Create dynamic set (connect message and template)
   *
   * If any step fails, previously created resources are cleaned up.
   *
   * @param config - Configuration for the automation email
   * @returns IDs of all created resources
   *
   * @example
   * ```typescript
   * const result = await client.createAutomationEmail({
   *   name: 'Abandoned Cart',
   *   triggerType: 'tag',
   *   triggerValue: 'CartInProgress',
   *   subject: 'You left something behind!',
   *   template: createAbandonedCartEmail(config),
   * });
   * // result.automailId, result.messageId, result.templateId
   * ```
   */
  async createAutomationEmail(
    config: CreateAutomationEmailConfig
  ): Promise<CreateAutomationEmailResult> {
    const createdResources: { type: 'automail' | 'message' | 'template'; id: number }[] = [];

    try {
      // Step 0: Look up tag ID if trigger type is 'tag'
      let tagId: number | null = null;
      if (config.triggerType === 'tag' && config.triggerValue) {
        tagId = await this.getTagIdByName(config.triggerValue);
        if (!tagId) {
          throw new RuleApiError(
            `Tag "${config.triggerValue}" not found. Create it first or check the tag name.`,
            404
          );
        }
      }

      // Step 1: Create automail
      const automailResponse = await this.createAutomail({
        name: config.name,
        description: config.description,
      });

      if (!automailResponse.data?.id) {
        throw new RuleApiError('Failed to create automail - no ID returned', 500);
      }
      const automailId = automailResponse.data.id;
      createdResources.push({ type: 'automail', id: automailId });

      // Step 1b: Update automail with trigger and sendout type
      // Note: trigger.type must be uppercase ("TAG" or "SEGMENT")
      if (tagId) {
        await this.updateAutomail(automailId, {
          name: config.name,
          active: false,
          trigger: {
            type: 'TAG',
            id: tagId,
          },
          sendout_type: config.sendoutType || 2, // Default to transactional
        });
      }

      // Step 2: Create message
      const messageResponse = await this.createMessage({
        dispatcher: {
          id: automailId,
          type: 'automail',
        },
        type: 1, // email
        subject: config.subject,
        preheader: config.preheader,
        from_name: config.fromName,
        from_email: config.fromEmail,
        reply_to: config.replyTo,
        automail_setting: {
          active: true,
          delay_in_seconds: config.delayInSeconds || '0',
        },
      });

      if (!messageResponse.data?.id) {
        throw new RuleApiError('Failed to create message - no ID returned', 500);
      }
      const messageId = messageResponse.data.id;
      createdResources.push({ type: 'message', id: messageId });

      // Step 3: Create template (name must be unique, so add timestamp)
      const templateResponse = await this.createTemplate({
        message_id: messageId,
        name: `${config.name} - ${Date.now()}`,
        message_type: 'email',
        template: config.template,
      });

      if (!templateResponse.data?.id) {
        throw new RuleApiError('Failed to create template - no ID returned', 500);
      }
      const templateId = templateResponse.data.id;
      createdResources.push({ type: 'template', id: templateId });

      // Step 4: Create dynamic set
      const dynamicSetResponse = await this.createDynamicSet({
        message_id: messageId,
        template_id: templateId,
      });

      if (!dynamicSetResponse.data?.id) {
        throw new RuleApiError('Failed to create dynamic set - no ID returned', 500);
      }
      const dynamicSetId = dynamicSetResponse.data.id;

      return {
        automailId,
        messageId,
        templateId,
        dynamicSetId,
      };
    } catch (error) {
      // Cleanup on failure
      for (const resource of createdResources.reverse()) {
        try {
          switch (resource.type) {
            case 'automail':
              await this.deleteAutomail(resource.id);
              break;
            case 'message':
              await this.deleteMessage(resource.id);
              break;
            case 'template':
              await this.deleteTemplate(resource.id);
              break;
          }
        } catch (cleanupError) {
          this.log(`Failed to cleanup ${resource.type} ${resource.id}:`, cleanupError);
        }
      }
      throw error;
    }
  }
}
