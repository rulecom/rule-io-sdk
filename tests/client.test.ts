/**
 * Rule.io Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleClient } from '../src/client';
import { RuleApiError, RuleConfigError } from '../src/errors';
import type { RuleAnalyticsParams } from '../src/types';

// Mock fetch
const mockFetch = vi.fn();

function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as Response;
}

/** Mock for 204 No Content — json() rejects to enforce no-body contract. */
function createMock204Response(): Response {
  return {
    ok: true,
    status: 204,
    json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  } as Response;
}

function createMockTextResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    headers: new Headers(),
  } as Response;
}

describe('RuleClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should accept string API key for backwards compatibility', () => {
      const client = new RuleClient('test-api-key');
      expect(client.isConfigured()).toBe(true);
      expect(client.getApiKey()).toBe('test-api-key');
    });

    it('should accept config object', () => {
      const client = new RuleClient({
        apiKey: 'test-api-key',
        debug: true,
      });
      expect(client.isConfigured()).toBe(true);
    });

    it('should throw RuleConfigError if API key is missing', () => {
      expect(() => new RuleClient('')).toThrow(RuleConfigError);
      expect(() => new RuleClient({ apiKey: '' })).toThrow(RuleConfigError);
    });

    it('should accept a custom fieldGroupPrefix', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({
        apiKey: 'test-key',
        fetch: mockFetch,
        fieldGroupPrefix: 'Order',
      });
      await client.syncSubscriber({
        email: 'test@example.com',
        fields: { Ref: 'ORD-123' },
        tags: ['test'],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subscribers.fields).toContainEqual({
        key: 'Order.Ref',
        value: 'ORD-123',
      });
    });

    it('should throw RuleConfigError for empty fieldGroupPrefix', () => {
      expect(() => new RuleClient({ apiKey: 'test-key', fieldGroupPrefix: '' }))
        .toThrow(RuleConfigError);
      expect(() => new RuleClient({ apiKey: 'test-key', fieldGroupPrefix: '   ' }))
        .toThrow(RuleConfigError);
    });

    it('should throw RuleConfigError for fieldGroupPrefix containing dots', () => {
      expect(() => new RuleClient({ apiKey: 'test-key', fieldGroupPrefix: 'Group.Sub' }))
        .toThrow(RuleConfigError);
    });

    it('should trim whitespace from fieldGroupPrefix', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({
        apiKey: 'test-key',
        fetch: mockFetch,
        fieldGroupPrefix: '  Custom  ',
      });
      await client.syncSubscriber({
        email: 'test@example.com',
        fields: { Name: 'Test' },
        tags: [],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subscribers.fields).toContainEqual({
        key: 'Custom.Name',
        value: 'Test',
      });
    });
  });

  describe('syncSubscriber', () => {
    it('should sync subscriber with fields and tags', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          subscriber: { id: '123', email: 'test@example.com' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.syncSubscriber({
        email: 'test@example.com',
        fields: {
          FirstName: 'Anna',
          LastName: 'Svensson',
        },
        tags: ['booking-confirmed'],
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v2/subscribers');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.update_on_duplicate).toBe(true);
      expect(body.tags).toEqual(['booking-confirmed']);
      expect(body.subscribers.email).toBe('test@example.com');
      expect(body.subscribers.fields).toContainEqual({
        key: 'Booking.FirstName',
        value: 'Anna',
      });
    });

    it('should filter out empty fields', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.syncSubscriber({
        email: 'test@example.com',
        fields: {
          FirstName: 'Anna',
          LastName: undefined,
          Phone: '',
        },
        tags: ['test'],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const fieldKeys = body.subscribers.fields.map((f: { key: string }) => f.key);
      expect(fieldKeys).toContain('Booking.FirstName');
      expect(fieldKeys).not.toContain('Booking.LastName');
      expect(fieldKeys).not.toContain('Booking.Phone');
    });

    it('should throw RuleConfigError if field key contains a dot', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      await expect(
        client.syncSubscriber({
          email: 'test@example.com',
          fields: { 'Booking.FirstName': 'Anna' },
          tags: ['test'],
        })
      ).rejects.toThrow(RuleConfigError);

      await expect(
        client.syncSubscriber({
          email: 'test@example.com',
          fields: { 'Booking.FirstName': 'Anna' },
          tags: ['test'],
        })
      ).rejects.toThrow(/contains a dot/);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('addSubscriberTags', () => {
    it('should add tags with automation trigger', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.addSubscriberTags('test@example.com', ['booking-confirmed'], 'force');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/subscribers/test%40example.com/tags');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.tags).toEqual(['booking-confirmed']);
      expect(body.automation).toBe('force');
    });

    it('should add tags without automation trigger', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.addSubscriberTags('test@example.com', ['vip'], false);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.tags).toEqual(['vip']);
      expect(body.automation).toBeUndefined();
    });
  });

  describe('removeSubscriberTags', () => {
    it('should remove multiple tags', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ success: true }))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.removeSubscriberTags('test@example.com', ['tag1', 'tag2']);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain('/tags/tag1');
      expect(mockFetch.mock.calls[1][0]).toContain('/tags/tag2');
    });
  });

  describe('getSubscriber', () => {
    it('should return subscriber data', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          subscriber: { id: '123', email: 'test@example.com' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getSubscriber('test@example.com');

      expect(result?.subscriber?.email).toBe('test@example.com');
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getSubscriber('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getSubscriberFields', () => {
    it('should return flattened fields', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          groups: [
            {
              name: 'Booking',
              fields: [
                { name: 'FirstName', value: 'Anna' },
                { name: 'LastName', value: 'Svensson' },
              ],
            },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const fields = await client.getSubscriberFields('test@example.com');

      expect(fields['Booking.FirstName']).toBe('Anna');
      expect(fields['Booking.LastName']).toBe('Svensson');
    });

    it('should return empty object for 404', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const fields = await client.getSubscriberFields('notfound@example.com');

      expect(fields).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should throw RuleApiError on 401', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Unauthorized' }, 401));

      const client = new RuleClient({ apiKey: 'invalid-key', fetch: mockFetch });

      await expect(client.getSubscriber('test@example.com')).rejects.toThrow(RuleApiError);

      // Reset and call again to test message
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Unauthorized' }, 401));
      await expect(client.getSubscriber('test@example.com')).rejects.toThrow(
        'Invalid Rule.io API key'
      );
    });

    it('should throw RuleApiError on 429 rate limit', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Rate limited' }, 429));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      try {
        await client.getSubscriber('test@example.com');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleApiError);
        expect((error as RuleApiError).isRateLimited()).toBe(true);
      }
    });
  });

  describe('v3 API', () => {
    it('should send template as a single RCML document, not wrapped in an array', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 456, name: 'Test Template' },
        })
      );

      const rcmlDoc = {
        tagName: 'rcml',
        children: [
          { tagName: 'rc-head', children: [] },
          { tagName: 'rc-body', children: [] },
        ],
      };

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.createTemplate({
        message_id: 1,
        name: 'Test Template',
        message_type: 'email',
        template: rcmlDoc,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.template).toEqual(rcmlDoc);
      expect(Array.isArray(body.template)).toBe(false);
    });

    it('should create automail', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 123, name: 'Test Automation' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createAutomail({
        name: 'Test Automation',
      });

      expect(result.data?.id).toBe(123);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/automail');
      expect(options.headers['Content-Type']).toBe('application/json;charset=utf-8');
    });

    it('should create automail with trigger and sendout_type', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 456, name: 'Triggered Automation', trigger: { type: 'TAG', id: 42 } },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createAutomail({
        name: 'Triggered Automation',
        trigger: { type: 'TAG', id: 42 },
        sendout_type: 2,
      });

      expect(result.data?.id).toBe(456);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.name).toBe('Triggered Automation');
      expect(body.trigger).toEqual({ type: 'TAG', id: 42 });
      expect(body.sendout_type).toBe(2);
    });
  });

  describe('v3 get methods return null on 404', () => {
    it('should return null for non-existent automail', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getAutomail(99999);

      expect(result).toBeNull();
    });

    it('should return null for non-existent message', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getMessage(99999);

      expect(result).toBeNull();
    });

    it('should return null for non-existent template', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getTemplate(99999);

      expect(result).toBeNull();
    });

    it('should return null for non-existent dynamic set', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getDynamicSet(99999);

      expect(result).toBeNull();
    });

    it('should still throw RuleApiError for non-404 errors on all v3 get methods', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const getMethods = [
        (id: number) => client.getAutomail(id),
        (id: number) => client.getMessage(id),
        (id: number) => client.getTemplate(id),
        (id: number) => client.getDynamicSet(id),
      ];

      for (const getMethod of getMethods) {
        mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Server error' }, 500));
        await expect(getMethod(123)).rejects.toThrow(RuleApiError);
      }
    });
  });

  describe('v3 List, Update & Render API', () => {
    it('should list automails with query params', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'Auto 1' },
            { id: 2, name: 'Auto 2' },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listAutomails({ page: 2, per_page: 20, active: true });

      expect(result.data).toHaveLength(2);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/editor/automail?');
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=20');
      expect(url).toContain('active=true');
    });

    it('should list automails without params', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.listAutomails();

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/editor/automail');
      expect(url).not.toContain('?');
    });

    it('should list automails with search query', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [{ id: 1, name: 'Welcome' }] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.listAutomails({ query: 'Welcome' });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('query=Welcome');
    });

    it('should list messages with required dispatcher params', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [{ id: 10, name: 'Msg 1', subject: 'Test' }],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listMessages({ id: 123, dispatcher_type: 'automail' });

      expect(result.data).toHaveLength(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('id=123');
      expect(url).toContain('dispatcher_type=automail');
    });

    it('should list templates with pagination', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [{ id: 100, name: 'Tmpl 1' }],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listTemplates({ page: 1, per_page: 50 });

      expect(result.data).toHaveLength(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('page=1');
      expect(url).toContain('per_page=50');
    });

    it('should list dynamic sets with required message_id', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [{ id: 200, message_id: 456, template_id: 789 }],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listDynamicSets({ message_id: 456 });

      expect(result.data).toHaveLength(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('message_id=456');
    });

    it('should update a dynamic set', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 200, message_id: 456, template_id: 101 },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.updateDynamicSet(200, {
        message_id: 456,
        template_id: 101,
        active: true,
      });

      expect(result.data?.id).toBe(200);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/dynamic-set/200');
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.message_id).toBe(456);
      expect(body.template_id).toBe(101);
      expect(body.active).toBe(true);
    });

    it('should update an automail with all fields', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 1, name: 'Updated', active: true },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.updateAutomail(1, {
        name: 'Updated',
        active: true,
        trigger: { type: 'TAG', id: 42 },
        sendout_type: 2,
      });

      expect(result.data?.name).toBe('Updated');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/automail/1');
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.name).toBe('Updated');
      expect(body.active).toBe(true);
      expect(body.trigger).toEqual({ type: 'TAG', id: 42 });
      expect(body.sendout_type).toBe(2);
    });

    it('should update an automail with partial fields (name only)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 1, name: 'Renamed' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.updateAutomail(1, { name: 'Renamed' });

      expect(result.data?.name).toBe('Renamed');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ name: 'Renamed' });
      expect(body).not.toHaveProperty('active');
      expect(body).not.toHaveProperty('trigger');
      expect(body).not.toHaveProperty('sendout_type');
    });

    it('should update an automail with partial fields (active only)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 1, name: 'Test', active: false },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.updateAutomail(1, { active: false });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ active: false });
    });

    it('should render a template and return HTML', async () => {
      const html = '<html><body><h1>Hello</h1></body></html>';
      mockFetch.mockResolvedValueOnce(createMockTextResponse(html));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.renderTemplate(42);

      expect(result).toBe(html);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/editor/template/42/render');
    });

    it('should render a template with subscriber_id', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockTextResponse('<html><body>Hello Anna</body></html>')
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.renderTemplate(42, { subscriber_id: 1001 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/template/42/render?');
      expect(url).toContain('subscriber_id=1001');
    });

    it('should return null when rendering a non-existent template', async () => {
      mockFetch.mockResolvedValueOnce(createMockTextResponse('Not found', 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.renderTemplate(99999);

      expect(result).toBeNull();
    });

    it('should throw RuleApiError on 401 for list endpoints (v3)', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401));

      const client = new RuleClient({ apiKey: 'bad-key', fetch: mockFetch });

      await expect(client.listAutomails()).rejects.toThrow(RuleApiError);
      await expect(client.listAutomails()).rejects.toThrow('Invalid Rule.io API key');
    });

    it('should parse field-level validation errors from v3 API', async () => {
      const errorBody = {
        errors: {
          automail_setting: [
            'The automail setting field is required when dispatcher.type is automail.',
          ],
          name: ['The name field is required.'],
        },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(errorBody, 422));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      try {
        await client.listAutomails();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleApiError);
        const apiError = error as RuleApiError;
        expect(apiError.statusCode).toBe(422);
        expect(apiError.isValidationError()).toBe(true);
        expect(apiError.message).toContain('automail_setting:');
        expect(apiError.message).toContain('The automail setting field is required');
        expect(apiError.message).toContain('name:');
        expect(apiError.message).toContain('The name field is required.');
        expect(apiError.validationErrors).toEqual(errorBody.errors);
      }
    });

    it('should flatten multiple messages per field in validation errors', async () => {
      const errorBody = {
        errors: {
          email: ['The email field is required.', 'The email must be valid.'],
        },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(errorBody, 422));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      try {
        await client.listAutomails();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleApiError);
        const apiError = error as RuleApiError;
        expect(apiError.message).toContain('email: The email field is required.');
        expect(apiError.message).toContain('email: The email must be valid.');
        expect(apiError.validationErrors).toEqual(errorBody.errors);
      }
    });

    it('should fall back to .error/.message when no .errors object', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Something went wrong' }, 500)
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      try {
        await client.listAutomails();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleApiError);
        const apiError = error as RuleApiError;
        expect(apiError.message).toBe('Something went wrong');
        expect(apiError.validationErrors).toBeUndefined();
      }
    });

    it('should handle empty errors object gracefully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ errors: {} }, 422));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      try {
        await client.listAutomails();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleApiError);
        const apiError = error as RuleApiError;
        // Empty errors object produces no field messages, falls back to default
        expect(apiError.message).toBe('Rule.io v3 API error');
        expect(apiError.validationErrors).toEqual({});
      }
    });

    it('should normalize malformed errors where values are strings instead of arrays', async () => {
      const errorBody = {
        errors: {
          field_a: 'not-an-array',
          field_b: ['already an array'],
          field_c: 12345,
        },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(errorBody, 422));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      try {
        await client.listAutomails();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleApiError);
        const apiError = error as RuleApiError;
        expect(apiError.statusCode).toBe(422);
        // String values should be wrapped in an array
        expect(apiError.validationErrors?.field_a).toEqual(['not-an-array']);
        // Array values should remain as-is
        expect(apiError.validationErrors?.field_b).toEqual(['already an array']);
        // Non-string, non-array values should be dropped
        expect(apiError.validationErrors?.field_c).toBeUndefined();
        // Message should contain the normalized fields
        expect(apiError.message).toContain('field_a: not-an-array');
        expect(apiError.message).toContain('field_b: already an array');
        // Numeric field should not appear in message
        expect(apiError.message).not.toContain('field_c');
      }
    });
  });

  describe('v3 Custom Field Data API (Deprecated)', () => {
    it('should get custom field data for a subscriber', async () => {
      const mockData = {
        data: [
          {
            id: 1,
            group_id: 10,
            group_name: 'Order',
            values: [{ field_id: 100, field_name: 'Ref', field_type: 'text', field_value: 'ORD-1' }],
          },
        ],
        meta: { page: 1, per_page: 15 },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getCustomFieldData(42);

      expect(result.data).toHaveLength(1);
      expect(result.data![0].group_name).toBe('Order');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/custom-field-data/42');
      expect(url).not.toContain('?');
    });

    it('should get custom field data with pagination and group filters', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [], meta: { page: 2, per_page: 10 } }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getCustomFieldData(42, {
        page: 2,
        per_page: 10,
        groups_id: [1, 2],
        groups_name: ['Order', 'Profile'],
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=10');
      expect(url).toContain('groups_id%5B%5D=1');
      expect(url).toContain('groups_id%5B%5D=2');
      expect(url).toContain('groups_name%5B%5D=Order');
      expect(url).toContain('groups_name%5B%5D=Profile');
    });

    it('should create custom field data', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }, 201));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const request = {
        groups: [{
          group: 'Order',
          create_if_not_exists: true,
          values: [{ field: 'Ref', create_if_not_exists: true, value: 'ORD-123' }],
        }],
      };
      await client.createCustomFieldData(42, request);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/custom-field-data/42');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.groups[0].group).toBe('Order');
      expect(body.groups[0].values[0].value).toBe('ORD-123');
    });

    it('should update custom field data', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, 204));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const request = {
        identifier: { group: 'Order', field: 'Ref', value: 'ORD-123' },
        values: [{ field: 'Status', value: 'shipped' }],
      };
      const result = await client.updateCustomFieldData(42, request);

      expect(result.success).toBe(true);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/custom-field-data/42');
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.identifier.group).toBe('Order');
      expect(body.values[0].field).toBe('Status');
    });

    it('should get custom field data by group name', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getCustomFieldDataByGroup(42, 'Order');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/custom-field-data/42/group/Order');
    });

    it('should get custom field data by group ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getCustomFieldDataByGroup(42, 5, { page: 1, fields: ['Ref', 'Status'] });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/custom-field-data/42/group/5');
      expect(url).toContain('page=1');
      expect(url).toContain('fields%5B%5D=Ref');
      expect(url).toContain('fields%5B%5D=Status');
    });

    it('should delete custom field data by group', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.deleteCustomFieldDataByGroup(42, 'Order');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/custom-field-data/42/group/Order');
      expect(options.method).toBe('DELETE');
    });

    it('should search custom field data', async () => {
      const mockData = {
        data: { id: 1, group_name: 'Order', values: [] },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.searchCustomFieldData(42, {
        group: 'Order',
        field: 'Ref',
        value: 'ORD-123',
      });

      expect(result).not.toBeNull();
      expect(result!.data!.group_name).toBe('Order');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/custom-field-data/42/search');
      expect(url).toContain('group=Order');
      expect(url).toContain('field=Ref');
      expect(url).toContain('value=ORD-123');
    });

    it('should return null when search finds no results (404)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.searchCustomFieldData(42, { data_id: 999 });

      expect(result).toBeNull();
    });
  });

  describe('v3 Campaign API', () => {
    it('should create a campaign', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 10, name: 'Spring Sale' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createCampaign({
        message_type: 1,
        sendout_type: 1,
        tags: [{ id: 42, negative: false }],
      });

      expect(result.data?.id).toBe(10);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.message_type).toBe(1);
      expect(body.tags).toEqual([{ id: 42, negative: false }]);
    });

    it('should get a campaign', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 10, name: 'Spring Sale' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getCampaign(10);

      expect(result?.data?.id).toBe(10);
      expect(result?.data?.name).toBe('Spring Sale');
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/10');
    });

    it('should return null for non-existent campaign', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getCampaign(99999);

      expect(result).toBeNull();
    });

    it('should update a campaign', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 10, name: 'Updated Sale' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.updateCampaign(10, {
        name: 'Updated Sale',
        sendout_type: 1,
        tags: [{ id: 42, negative: false }],
        segments: [],
        subscribers: [],
      });

      expect(result.data?.name).toBe('Updated Sale');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/10');
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.name).toBe('Updated Sale');
      expect(body.sendout_type).toBe(1);
      expect(body.tags).toEqual([{ id: 42, negative: false }]);
      expect(body.segments).toEqual([]);
      expect(body.subscribers).toEqual([]);
    });

    it('should update a campaign with partial fields (name only)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 10, name: 'Renamed Campaign' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.updateCampaign(10, { name: 'Renamed Campaign' });

      expect(result.data?.name).toBe('Renamed Campaign');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ name: 'Renamed Campaign' });
      expect(body).not.toHaveProperty('sendout_type');
      expect(body).not.toHaveProperty('tags');
      expect(body).not.toHaveProperty('segments');
      expect(body).not.toHaveProperty('subscribers');
    });

    it('should update a campaign with partial fields (sendout_type only)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 10, name: 'Sale' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.updateCampaign(10, { sendout_type: 2 });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ sendout_type: 2 });
    });

    it('should delete a campaign', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.deleteCampaign(10);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/10');
      expect(options.method).toBe('DELETE');
    });

    it('should list campaigns with params', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'Campaign 1' },
            { id: 2, name: 'Campaign 2' },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listCampaigns({ page: 2, per_page: 10, message_type: 1 });

      expect(result.data).toHaveLength(2);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/editor/campaign?');
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=10');
      expect(url).toContain('message_type=1');
    });

    it('should list campaigns without params', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.listCampaigns();

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign');
      expect(url).not.toContain('?');
    });

    it('should copy a campaign', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 11, name: 'Spring Sale (copy)' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.copyCampaign(10);

      expect(result.data?.id).toBe(11);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/10/copy');
      expect(options.method).toBe('POST');
    });

    it('should schedule a campaign', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.scheduleCampaign(10, {
        type: 'schedule',
        datetime: '2025-06-15 10:00:00',
      });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/10/schedule');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.type).toBe('schedule');
      expect(body.datetime).toBe('2025-06-15 10:00:00');
    });

    it('should cancel a campaign schedule', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.scheduleCampaign(10, { type: null });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/campaign/10/schedule');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.type).toBeNull();
    });
  });

  describe('v3 Suppressions API', () => {
    it('should create suppressions with POST to /suppressions/', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createSuppressions({
        subscribers: [
          { email: 'user1@example.com' },
          { email: 'user2@example.com' },
        ],
      });

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/suppressions/');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json;charset=utf-8');

      const body = JSON.parse(options.body);
      expect(body.subscribers).toHaveLength(2);
      expect(body.subscribers[0]).toEqual({ email: 'user1@example.com' });
      expect(body.subscribers[1]).toEqual({ email: 'user2@example.com' });
    });

    it('should create suppressions with message_types filter', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.createSuppressions({
        subscribers: [{ email: 'user@example.com' }],
        message_types: ['email'],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.message_types).toEqual(['email']);
    });

    it('should delete suppressions with DELETE and request body', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteSuppressions({
        subscribers: [{ email: 'user@example.com' }],
      });

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/suppressions/');
      expect(options.method).toBe('DELETE');
      expect(options.headers['Content-Type']).toBe('application/json;charset=utf-8');

      const body = JSON.parse(options.body);
      expect(body.subscribers).toHaveLength(1);
      expect(body.subscribers[0]).toEqual({ email: 'user@example.com' });
    });

    it('should delete suppressions with callback_url', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.deleteSuppressions({
        subscribers: [{ email: 'user@example.com' }],
        callback_url: 'https://example.com/webhook/done',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.callback_url).toBe('https://example.com/webhook/done');
    });

    it('should create suppressions with callback_url', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.createSuppressions({
        subscribers: [{ email: 'test@example.com' }],
        callback_url: 'https://example.com/callback',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.callback_url).toBe('https://example.com/callback');
    });

    it('should delete suppressions with message_types filter', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.deleteSuppressions({
        subscribers: [{ email: 'test@example.com' }],
        message_types: ['email'],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.message_types).toEqual(['email']);
    });

    it('should reject createSuppressions with empty subscribers array', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.createSuppressions({ subscribers: [] }),
      ).rejects.toThrow('subscribers array must not be empty');
    });

    it('should reject createSuppressions with more than 1000 subscribers', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const subscribers = Array.from({ length: 1001 }, (_, i) => ({
        email: `user${i}@example.com`,
      }));
      await expect(
        client.createSuppressions({ subscribers }),
      ).rejects.toThrow('subscribers array must not exceed 1000 items');
    });

    it('should reject deleteSuppressions with empty subscribers array', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.deleteSuppressions({ subscribers: [] }),
      ).rejects.toThrow('subscribers array must not be empty');
    });

    it('should reject deleteSuppressions with more than 1000 subscribers', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const subscribers = Array.from({ length: 1001 }, (_, i) => ({
        email: `user${i}@example.com`,
      }));
      await expect(
        client.deleteSuppressions({ subscribers }),
      ).rejects.toThrow('subscribers array must not exceed 1000 items');
    });
  });

  describe('v3 Subscriber API', () => {
    it('should create a subscriber via v3', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ id: 100, email: 'new@example.com', status: 'ACTIVE' })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createSubscriberV3({
        email: 'new@example.com',
        status: 'ACTIVE',
        language: 'sv',
      });

      expect(result.id).toBe(100);
      expect(result.email).toBe('new@example.com');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/subscribers');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.email).toBe('new@example.com');
      expect(body.status).toBe('ACTIVE');
      expect(body.language).toBe('sv');
    });

    it('should delete a subscriber by email via v3', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteSubscriberV3('old@example.com', 'email');

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/subscribers/old%40example.com?identified_by=email');
      expect(options.method).toBe('DELETE');
    });

    it('should delete a subscriber by ID via v3', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteSubscriberV3(12345, 'id');

      expect(result.success).toBe(true);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/subscribers/12345?identified_by=id');
    });

    it('should default to email when deleting a subscriber via v3 without identifiedBy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteSubscriberV3('old@example.com');

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/subscribers/old%40example.com?identified_by=email');
      expect(options.method).toBe('DELETE');
    });

    it('should block subscribers via v3', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.blockSubscribers([
        { email: 'spam@example.com' },
        { id: 456 },
      ]);

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/subscribers/block');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.subscribers).toHaveLength(2);
      expect(body.subscribers[0].email).toBe('spam@example.com');
    });

    it('should unblock subscribers via v3', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.unblockSubscribers([
        { email: 'restored@example.com' },
        { phone_number: '+46701234567' },
      ]);

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/subscribers/unblock');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.subscribers).toHaveLength(2);
    });

    it('should block subscribers with callback_url', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.blockSubscribers(
        [{ email: 'spam@example.com' }],
        'https://example.com/webhook'
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.callback_url).toBe('https://example.com/webhook');
      expect(body.subscribers).toHaveLength(1);
    });

    it('should unblock subscribers with callback_url', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.unblockSubscribers(
        [{ email: 'restored@example.com' }],
        'https://example.com/webhook'
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.callback_url).toBe('https://example.com/webhook');
      expect(body.subscribers).toHaveLength(1);
    });

    it('should bulk add tags via v3', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.bulkAddTags({
        subscribers: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
        tags: ['newsletter', 'promo-2024'],
      });

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/subscribers/tags');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.subscribers).toHaveLength(2);
      expect(body.tags).toEqual(['newsletter', 'promo-2024']);
    });

    it('should bulk remove tags via v3 (DELETE with body)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.bulkRemoveTags({
        subscribers: [{ email: 'a@example.com' }],
        tags: ['old-campaign'],
      });

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/subscribers/tags');
      expect(options.method).toBe('DELETE');
      const body = JSON.parse(options.body);
      expect(body.subscribers).toHaveLength(1);
      expect(body.tags).toEqual(['old-campaign']);
    });

    it('should add tags to a subscriber via v3 with automation param', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.addSubscriberTagsV3(
        'customer@example.com',
        { tags: ['vip', 'returning'], automation: 'force' },
        'email'
      );

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://app.rule.io/api/v3/subscribers/customer%40example.com/tags?identified_by=email'
      );
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.tags).toEqual(['vip', 'returning']);
      expect(body.automation).toBe('force');
    });

    it('should remove a tag from a subscriber via v3', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.removeSubscriberTagV3(
        'customer@example.com',
        'old-promo',
        'email'
      );

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://app.rule.io/api/v3/subscribers/customer%40example.com/tags/old-promo?identified_by=email'
      );
      expect(options.method).toBe('DELETE');
    });

    it('should default to email when adding tags via v3 without identifiedBy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.addSubscriberTagsV3('user@example.com', { tags: ['welcome'] });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe(
        'https://app.rule.io/api/v3/subscribers/user%40example.com/tags?identified_by=email'
      );
    });

    it('should default to email when removing a tag via v3 without identifiedBy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.removeSubscriberTagV3('user@example.com', 'old-tag');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe(
        'https://app.rule.io/api/v3/subscribers/user%40example.com/tags/old-tag?identified_by=email'
      );
    });
  });

  // ============================================================================
  // Account API
  // ============================================================================

  describe('listAccounts', () => {
    it('should GET /accounts and return account list', async () => {
      const mockData = {
        data: [
          { id: 1, name: 'Account A', created_at: '2024-01-01T00:00:00Z', updated_at: null },
          { id: 2, name: 'Account B', created_at: '2024-02-01T00:00:00Z', updated_at: null },
        ],
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listAccounts();

      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].name).toBe('Account A');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts');
      expect(mockFetch.mock.calls[0][1].method).toBe('GET');
    });

    it('should throw RuleApiError on 401', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401));

      const client = new RuleClient({ apiKey: 'bad-key', fetch: mockFetch });
      await expect(client.listAccounts()).rejects.toThrow(RuleApiError);
    });
  });

  describe('createAccount', () => {
    it('should POST /accounts with name and language', async () => {
      const mockData = {
        data: { id: 99, name: 'New Account', created_at: '2024-06-01T00:00:00Z', updated_at: null },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createAccount({ name: 'New Account', language: 'en' });

      expect(result.data?.id).toBe(99);
      expect(result.data?.name).toBe('New Account');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts');
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ name: 'New Account', language: 'en' });
    });

    it('should throw RuleApiError on server error', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Server error' }, 500));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.createAccount({ name: 'Test', language: 'sv' })).rejects.toThrow(RuleApiError);
    });
  });

  describe('getAccount', () => {
    it('should GET /accounts/{id} and return account', async () => {
      const mockData = {
        data: { id: 42, name: 'My Account', created_at: '2024-01-01T00:00:00Z', updated_at: null },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getAccount(42);

      expect(result?.data?.id).toBe(42);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts/42');
    });

    it('should accept "show" as accountId', async () => {
      const mockData = { data: { id: 1, name: 'Current', created_at: null, updated_at: null } };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getAccount('show');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts/show');
    });

    it('should append includes[] query params', async () => {
      const mockData = {
        data: {
          id: 42,
          name: 'Account',
          created_at: null,
          updated_at: null,
          sitoo_credentials: [{ account_id: 42, api_id: 'abc', password: 'secret', created_at: null, updated_at: null }],
        },
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getAccount(42, { includes: ['sitoo_credentials'] });

      expect(result?.data?.sitoo_credentials).toHaveLength(1);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts/42?includes%5B%5D=sitoo_credentials');
    });

    it('should return null on 404', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getAccount(999);

      expect(result).toBeNull();
    });

    it('should throw RuleApiError on non-404 errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Server error' }, 500));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.getAccount(42)).rejects.toThrow(RuleApiError);
    });
  });

  describe('deleteAccount', () => {
    it('should DELETE /accounts/{id} and return success', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteAccount(42);

      expect(result).toEqual({ success: true });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts/42');
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    });

    it('should throw RuleApiError on 403', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Forbidden' }, 403));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.deleteAccount(42)).rejects.toThrow(RuleApiError);
    });
  });

  // ==========================================================================
  // Brand Styles
  // ==========================================================================

  describe('v3 Brand Styles API', () => {
    it('should list brand styles', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'Brand A', is_default: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 2, name: 'Brand B', is_default: false, created_at: '2024-01-02', updated_at: '2024-01-02' },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listBrandStyles();

      expect(result.data).toHaveLength(2);
      expect(result.data![0].name).toBe('Brand A');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/brand-styles');
      expect(options.method).toBe('GET');
    });

    it('should get a brand style by ID', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 42,
            account_id: 1,
            name: 'My Brand',
            is_default: true,
            colours: [{ id: 1, brand_style_id: 42, type: 'brand', hex: '#FF5733', brightness: 50, created_at: '2024-01-01', updated_at: '2024-01-01' }],
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getBrandStyle(42);

      expect(result).not.toBeNull();
      expect(result!.data?.name).toBe('My Brand');
      expect(result!.data?.colours).toHaveLength(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/42');
    });

    it('should return null for non-existent brand style', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Not found' }, 404)
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getBrandStyle(999);

      expect(result).toBeNull();
    });

    it('should create a brand style from domain', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 10, account_id: 1, name: 'example.com', domain: 'example.com', is_default: false, created_at: '2024-01-01', updated_at: '2024-01-01' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createBrandStyleFromDomain({ domain: 'example.com' });

      expect(result.data?.domain).toBe('example.com');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/from-domain');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ domain: 'example.com' });
    });

    it('should create a brand style manually', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 11, account_id: 1, name: 'Custom Brand', is_default: false, created_at: '2024-01-01', updated_at: '2024-01-01' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createBrandStyleManually({
        name: 'Custom Brand',
        colours: [{ type: 'brand', hex: '#00FF00', brightness: 70 }],
      });

      expect(result.data?.name).toBe('Custom Brand');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/manually');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.name).toBe('Custom Brand');
      expect(body.colours).toEqual([{ type: 'brand', hex: '#00FF00', brightness: 70 }]);
    });

    it('should update a brand style with PATCH', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 42, account_id: 1, name: 'Updated Brand', is_default: true, created_at: '2024-01-01', updated_at: '2024-01-02' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.updateBrandStyle(42, { name: 'Updated Brand' });

      expect(result.data?.name).toBe('Updated Brand');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/42');
      expect(options.method).toBe('PATCH');
      expect(JSON.parse(options.body)).toEqual({ name: 'Updated Brand' });
    });

    it('should delete a brand style', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteBrandStyle(42);

      expect(result).toEqual({ success: true });
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/42');
      expect(options.method).toBe('DELETE');
    });

    it('should throw on 403 when deleting last brand style', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Cannot delete the last brand style' }, 403)
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(client.deleteBrandStyle(42)).rejects.toThrow(RuleApiError);
    });

    it('should throw RuleApiError on 424 (failed to fetch domain)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Failed to fetch brand data from domain' }, 424)
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.createBrandStyleFromDomain({ domain: 'nonexistent.example' })
      ).rejects.toThrow(RuleApiError);
    });

    it('should throw on 409 when domain brand style already exists', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Brand style already exists for this domain' }, 409)
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.createBrandStyleFromDomain({ domain: 'example.com' })
      ).rejects.toThrow(RuleApiError);
    });
  });

  // ==========================================================================
  // API Keys
  // ==========================================================================

  describe('v3 API Keys API', () => {
    it('should list API keys', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'Production', key: 'abc123', created_at: '2024-01-01', updated_at: '2024-01-01' },
            { id: 2, name: 'Staging', key: 'def456', created_at: '2024-01-02', updated_at: '2024-01-02' },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listApiKeys();

      expect(result.data).toHaveLength(2);
      expect(result.data![0].name).toBe('Production');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/api-keys');
      expect(options.method).toBe('GET');
    });

    it('should create an API key', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 3, name: 'New Key', key: 'ghi789', created_at: '2024-01-03', updated_at: '2024-01-03' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createApiKey({ name: 'New Key' });

      expect(result.data?.name).toBe('New Key');
      expect(result.data?.key).toBe('ghi789');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/api-keys');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ name: 'New Key' });
    });

    it('should update an API key', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 5, name: 'Renamed Key', created_at: '2024-01-01', updated_at: '2024-01-04' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.updateApiKey(5, { name: 'Renamed Key' });

      expect(result.data?.name).toBe('Renamed Key');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/api-keys/5');
      expect(options.method).toBe('PUT');
      expect(JSON.parse(options.body)).toEqual({ name: 'Renamed Key' });
    });

    it('should delete an API key', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteApiKey(5);

      expect(result).toEqual({ success: true });
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/api-keys/5');
      expect(options.method).toBe('DELETE');
    });

    it('should throw RuleApiError on 401', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Unauthorized' }, 401)
      );

      const client = new RuleClient({ apiKey: 'bad-key', fetch: mockFetch });
      await expect(client.listApiKeys()).rejects.toThrow(RuleApiError);
    });
  });

  describe('v3 Recipients API', () => {
    it('should list segments without params', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'Active Users' },
            { id: 2, name: 'VIP Customers' },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listSegments();

      expect(result.data).toHaveLength(2);
      expect(result.data![0].name).toBe('Active Users');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/segments');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });

    it('should list segments with pagination params as query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [{ id: 3, name: 'Segment 3', has_next_item: true }],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listSegments({ page: 1, per_page: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data![0].has_next_item).toBe(true);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/segments?page=1&per_page=10');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });

    it('should list recipient subscribers without params', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 10, email: 'user@example.com', phone: null },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listRecipientSubscribers();

      expect(result.data).toHaveLength(1);
      expect(result.data![0].email).toBe('user@example.com');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/subscribers');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });

    it('should list recipient subscribers with pagination params as query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 10, email: 'a@test.com', phone: null, has_next_item: true },
            { id: 11, email: null, phone: '+46700000000', has_next_item: false },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listRecipientSubscribers({ per_page: 2 });

      expect(result.data).toHaveLength(2);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/subscribers?per_page=2');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });

    it('should list recipient tags without params', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 100, name: 'newsletter' },
            { id: 101, name: 'abandoned-cart' },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listRecipientTags();

      expect(result.data).toHaveLength(2);
      expect(result.data![1].name).toBe('abandoned-cart');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/tags');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });

    it('should list recipient tags with pagination params as query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [{ id: 100, name: 'newsletter', has_next_item: false }],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listRecipientTags({ page: 1, per_page: 5 });

      expect(result.data).toHaveLength(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/tags?page=1&per_page=5');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });
  });

  describe('getAnalytics', () => {
    it('should fetch analytics with required params', async () => {
      const mockData = {
        data: [
          {
            id: 123,
            metrics: [
              { metric: 'sent', value: 1000 },
              { metric: 'open_uniq', value: 450 },
            ],
          },
        ],
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getAnalytics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'CAMPAIGN',
        object_ids: ['123'],
        metrics: ['sent', 'open_uniq'],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe(123);
      expect(result.data![0].metrics).toHaveLength(2);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/analytics?');
      expect(url).toContain('date_from=2024-01-01');
      expect(url).toContain('date_to=2024-01-31');
      expect(url).toContain('object_type=CAMPAIGN');
      expect(url).toContain('object_ids%5B%5D=123');
      expect(url).toContain('metrics%5B%5D=sent');
      expect(url).toContain('metrics%5B%5D=open_uniq');
    });

    it('should include message_type when provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getAnalytics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'AUTOMAIL',
        object_ids: ['1'],
        metrics: ['click'],
        message_type: 'email',
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('message_type=email');
    });

    it('should not include message_type when omitted', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getAnalytics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'CAMPAIGN',
        object_ids: ['1'],
        metrics: ['sent'],
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('message_type');
    });

    it('should handle multiple object_ids', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getAnalytics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'JOURNEY',
        object_ids: ['10', '20', '30'],
        metrics: ['delivered'],
      });

      const url = mockFetch.mock.calls[0][0] as string;
      const matches = url.match(/object_ids%5B%5D/g) ?? [];
      expect(matches).toHaveLength(3);
    });

    it('should handle multiple metrics', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getAnalytics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'AB_TEST',
        object_ids: ['5'],
        metrics: ['open', 'click', 'unsubscribe', 'spam'],
      });

      const url = mockFetch.mock.calls[0][0] as string;
      const matches = url.match(/metrics%5B%5D/g) ?? [];
      expect(matches).toHaveLength(4);
    });

    it('should use GET method', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getAnalytics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        object_type: 'TRANSACTIONAL_NAME',
        object_ids: ['1'],
        metrics: ['sent'],
      });

      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect(options.method).toBe('GET');
    });

    it('should throw RuleApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Invalid date range' }, 422)
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.getAnalytics({
          date_from: '2024-01-31',
          date_to: '2024-01-01',
          object_type: 'CAMPAIGN',
          object_ids: ['1'],
          metrics: ['sent'],
        })
      ).rejects.toThrow(RuleApiError);
    });

    it('should throw RuleConfigError when object_ids is empty', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.getAnalytics({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          object_type: 'CAMPAIGN',
          object_ids: [],
          metrics: ['sent'],
        })
      ).rejects.toThrow('object_ids must be a non-empty array');
    });

    it('should throw RuleConfigError when metrics is empty', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.getAnalytics({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          object_type: 'CAMPAIGN',
          object_ids: ['1'],
          metrics: [],
        })
      ).rejects.toThrow('metrics must be a non-empty array');
    });

    it('should throw RuleConfigError when object_ids/metrics given without object_type', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.getAnalytics({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          object_ids: ['1'],
          metrics: ['sent'],
        } as RuleAnalyticsParams)
      ).rejects.toThrow('object_ids and metrics require object_type');
    });

    it('should throw RuleConfigError when object_type is undefined with object_ids/metrics', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.getAnalytics({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
          object_type: undefined,
          object_ids: ['1'],
          metrics: ['sent'],
        } as RuleAnalyticsParams)
      ).rejects.toThrow('object_ids and metrics require object_type');
    });

    it('should handle minimal params (only dates)', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.getAnalytics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('date_from=2024-01-01');
      expect(url).toContain('date_to=2024-01-31');
      expect(url).not.toContain('object_type');
      expect(url).not.toContain('object_ids');
      expect(url).not.toContain('metrics');
    });
  });

  describe('v3 Delete 204 handling', () => {
    it('should handle 204 No Content for deleteAutomail', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteAutomail(1);
      expect(result.success).toBe(true);
    });

    it('should handle 204 No Content for deleteMessage', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteMessage(1);
      expect(result.success).toBe(true);
    });

    it('should handle 204 No Content for deleteTemplate', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteTemplate(1);
      expect(result.success).toBe(true);
    });

    it('should handle 204 No Content for deleteDynamicSet', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteDynamicSet(1);
      expect(result.success).toBe(true);
    });

    it('should handle 204 No Content for deleteCampaign', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteCampaign(1);
      expect(result.success).toBe(true);
    });
  });

  describe('v3 Export API', () => {
    it('should export dispatchers with date range', async () => {
      const mockData = {
        data: [
          {
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T12:00:00Z',
            account_id: 1,
            account_name: 'Test Account',
            dispatcher_id: 100,
            dispatcher_name: 'Welcome Email',
            dispatcher_type: 'automail',
            channel: 'email',
            tags: null,
            filters: '',
            utm_campaign: 'welcome',
            utm_term: '',
            utm_content: null,
            journey_id: '1',
            journey_name: 'Onboarding',
            variable_set_ids: '10,20',
          },
        ],
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.exportDispatchers({
        date_from: '2024-01-01',
        date_to: '2024-01-02',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data![0].dispatcher_id).toBe(100);
      expect(result.data![0].dispatcher_name).toBe('Welcome Email');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v3/export/dispatcher');
      expect(url).toContain('date_from=2024-01-01');
      expect(url).toContain('date_to=2024-01-02');
      expect(options.method).toBe('GET');
    });

    it('should export statistics with date range', async () => {
      const mockData = {
        data: [
          {
            statistic_id: 'stat-1',
            statistic_type: 'open',
            event_id: 'evt-1',
            subscriber_id: 'sub-1',
            message_type: 'email',
            created_at: '2024-01-15T10:00:00Z',
            object: {
              id: 'camp-1',
              name: 'January Campaign',
              type: 'campaign',
            },
          },
        ],
        next_page_token: 'token-abc',
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.exportStatistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data![0].statistic_type).toBe('open');
      expect(result.data![0].object.type).toBe('campaign');
      expect(result.next_page_token).toBe('token-abc');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/api/v3/export/statistics');
      expect(url).toContain('date_from=2024-01-01');
      expect(url).toContain('date_to=2024-01-31');
    });

    it('should export statistics with statistic_types filter', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.exportStatistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        statistic_types: ['open', 'link'],
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('statistic_types%5B%5D=open');
      expect(url).toContain('statistic_types%5B%5D=link');
    });

    it('should export statistics with next_page_token for pagination', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [], next_page_token: null }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.exportStatistics({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        next_page_token: 'token-abc',
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('next_page_token=token-abc');
    });

    it('should export subscribers with date range', async () => {
      const mockData = {
        data: [
          {
            created_at: '2024-01-10T08:00:00Z',
            updated_at: '2024-01-10T08:00:00Z',
            account_id: 1,
            account_name: 'Test Account',
            subscriber_id: 500,
            email: 'user@example.com',
            phone_number: '+46701234567',
            opt_in_date: '2024-01-10T08:00:00Z',
          },
        ],
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.exportSubscribers({
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data![0].subscriber_id).toBe(500);
      expect(result.data![0].email).toBe('user@example.com');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/v3/export/subscriber');
      expect(url).toContain('date_from=2024-01-01');
      expect(url).toContain('date_to=2024-01-31');
      expect(options.method).toBe('GET');
    });

    it('should handle empty export results', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.exportDispatchers({
        date_from: '2024-01-01',
        date_to: '2024-01-02',
      });

      expect(result.data).toEqual([]);
    });

    it('should handle API errors for export endpoints', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Unauthorized' }, 401)
      );

      const client = new RuleClient({ apiKey: 'bad-key', fetch: mockFetch });
      await expect(
        client.exportDispatchers({ date_from: '2024-01-01', date_to: '2024-01-02' })
      ).rejects.toThrow(RuleApiError);
    });
  });

  describe('createAutomationEmail', () => {
    it('should throw RuleConfigError when neither template nor brandStyleId provided', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.createAutomationEmail({
          name: 'Test',
          triggerType: 'tag',
          triggerValue: 'Newsletter',
          subject: 'Test',
        })
      ).rejects.toThrow(RuleConfigError);
    });

    it('should throw RuleConfigError when both template and brandStyleId provided', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await expect(
        client.createAutomationEmail({
          name: 'Test',
          triggerType: 'tag',
          triggerValue: 'Newsletter',
          subject: 'Test',
          template: { tagName: 'rcml', id: '1', children: [] } as never,
          brandStyleId: 976,
        })
      ).rejects.toThrow(RuleConfigError);
    });

    it('should auto-fetch brand style and build RCML when brandStyleId provided', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      // Mock responses: 1) getBrandStyle, 2) tags (for trigger), 3) createAutomail, 4) createMessage, 5) createTemplate, 6) createDynamicSet
      mockFetch
        .mockResolvedValueOnce(createMockResponse({
          data: {
            id: 976,
            account_id: 1,
            name: 'Test Brand',
            is_default: true,
            colours: [
              { id: 1, brand_style_id: 976, type: 'accent', hex: '#FF0000', brightness: 50 },
              { id: 2, brand_style_id: 976, type: 'dark', hex: '#111111', brightness: 10 },
              { id: 3, brand_style_id: 976, type: 'light', hex: '#FAFAFA', brightness: 95 },
              { id: 4, brand_style_id: 976, type: 'brand', hex: '#0066CC', brightness: 40 },
            ],
            fonts: [],
            images: [],
          },
        }))
        .mockResolvedValueOnce(createMockResponse({
          tags: [{ id: 10, name: 'Newsletter' }],
        }))
        .mockResolvedValueOnce(createMockResponse({ data: { id: 100 } })) // automail
        .mockResolvedValueOnce(createMockResponse({ data: { id: 200 } })) // message
        .mockResolvedValueOnce(createMockResponse({ data: { id: 300 } })) // template
        .mockResolvedValueOnce(createMockResponse({ data: { id: 400 } })); // dynamic set

      const result = await client.createAutomationEmail({
        name: 'Welcome',
        triggerType: 'tag',
        triggerValue: 'Newsletter',
        subject: 'Welcome!',
        brandStyleId: 976,
      });

      expect(result.automailId).toBe(100);
      expect(result.messageId).toBe(200);
      expect(result.templateId).toBe(300);
      expect(result.dynamicSetId).toBe(400);

      // Verify template call (5th call, index 4) includes RCML with brand style
      const templateCall = mockFetch.mock.calls[4];
      const templateBody = JSON.parse(templateCall[1].body);
      const rcml = JSON.stringify(templateBody.template);
      expect(rcml).toContain('rc-brand-style');
      expect(rcml).toContain('rcml-h1-style');
      expect(rcml).toContain('rcml-p-style');
    });

    it('should throw when brand style not found', async () => {
      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });

      // Mock: 1) getBrandStyle returns 404 — brand style fetch happens before tag lookup
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      await expect(
        client.createAutomationEmail({
          name: 'Test',
          triggerType: 'tag',
          triggerValue: 'Newsletter',
          subject: 'Test',
          brandStyleId: 99999,
        })
      ).rejects.toThrow();
    });
  });
});
