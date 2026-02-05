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
  RuleMessageCreateRequest,
  RuleMessageResponse,
  RuleTemplateCreateRequest,
  RuleTemplateResponse,
  RuleDynamicSetCreateRequest,
  RuleDynamicSetResponse,
  RuleClientConfig,
  CreateAutomationEmailConfig,
  CreateAutomationEmailResult,
} from './types';

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
 *   email: 'guest@example.com',
 *   fields: { FirstName: 'Anna' },
 *   tags: ['booking-confirmed']
 * });
 *
 * // Add tags with automation trigger
 * await client.addSubscriberTags('guest@example.com', ['accommodation'], 'force');
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
      };
    } else {
      this.config = {
        apiKey: config.apiKey,
        baseUrlV2: config.baseUrlV2 ?? RULE_API_V2_BASE_URL,
        baseUrlV3: config.baseUrlV3 ?? RULE_API_V3_BASE_URL,
        fetch: config.fetch ?? globalThis.fetch,
        debug: config.debug ?? false,
      };
    }

    if (!this.config.apiKey) {
      throw new RuleConfigError('API key is required');
    }
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
      console.error('Rule.io API request failed:', error);
      throw new RuleApiError(error instanceof Error ? error.message : 'Network error', 0);
    }
  }

  private async requestV3<T extends RuleApiResponse>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
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

      const data = (await response.json()) as T;
      this.log('Response V3:', data);
      return data;
    } catch (error) {
      if (error instanceof RuleApiError) {
        throw error;
      }
      console.error('Rule.io v3 API request failed:', error);
      throw new RuleApiError(error instanceof Error ? error.message : 'Network error', 0);
    }
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
   *   email: 'guest@example.com',
   *   fields: {
   *     FirstName: 'Anna',
   *     LastName: 'Svensson',
   *     BookingRef: 'BV-123'
   *   },
   *   tags: ['booking-confirmed', 'accommodation']
   * });
   * ```
   */
  async syncSubscriber(subscriber: RuleSubscriber): Promise<RuleSubscriberResponse> {
    // Filter out undefined/null/empty string fields
    // Rule.io requires fields in format "Group.FieldName" - we use "Booking" as our group
    const fields = subscriber.fields
      ? Object.entries(subscriber.fields)
          .filter(([, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => ({
            key: `Booking.${key}`,
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
   * await client.addSubscriberTags('guest@example.com', ['booking-confirmed'], 'force');
   *
   * // Add tags without triggering automation
   * await client.addSubscriberTags('guest@example.com', ['vip-guest'], false);
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
   * @returns Map of field keys to values (e.g., { "Booking.FirstName": "Anna" })
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
   * @param name - Tag name (e.g., "booking-confirmed")
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
   *   name: 'Booking Confirmation',
   *   triggerType: 'tag',
   *   triggerValue: 'booking-confirmed',
   *   subject: 'Your booking is confirmed!',
   *   template: createBookingConfirmationTemplate(config)
   * });
   *
   * console.log('Created automation:', result.automailId);
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
          console.error(`Failed to cleanup ${resource.type} ${resource.id}:`, cleanupError);
        }
      }
      throw error;
    }
  }
}
