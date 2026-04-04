/**
 * Rule.io Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleClient } from '../src/client';
import { RuleApiError, RuleConfigError } from '../src/errors';

// Mock fetch
const mockFetch = vi.fn();

function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
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
      // Note: trigger_type and trigger_value are no longer in createAutomail
      // They must be set via updateAutomail after creation
      const result = await client.createAutomail({
        name: 'Test Automation',
      });

      expect(result.data?.id).toBe(123);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/editor/automail');
      expect(options.headers['Content-Type']).toBe('application/json;charset=utf-8');
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

    it('should throw RuleApiError on 401 for list endpoints', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401));

      const client = new RuleClient({ apiKey: 'bad-key', fetch: mockFetch });

      await expect(client.listAutomails()).rejects.toThrow(RuleApiError);
      await expect(client.listAutomails()).rejects.toThrow('Invalid Rule.io API key');
    });
  });
});
