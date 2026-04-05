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

    it('should throw RuleApiError on 401 for list endpoints (v3)', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401));

      const client = new RuleClient({ apiKey: 'bad-key', fetch: mockFetch });

      await expect(client.listAutomails()).rejects.toThrow(RuleApiError);
      await expect(client.listAutomails()).rejects.toThrow('Invalid Rule.io API key');
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

  describe('v3 Account API', () => {
    it('should list accounts', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'Account 1' },
            { id: 2, name: 'Account 2' },
          ],
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.listAccounts();

      expect(result.data).toHaveLength(2);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/accounts');
      expect(options.method).toBe('GET');
    });

    it('should list accounts with includes[] query param', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.listAccounts({ includes: ['sitoo_credentials'] });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe(
        'https://app.rule.io/api/v3/accounts?includes[]=sitoo_credentials'
      );
    });

    it('should list accounts with multiple includes', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.listAccounts({ includes: ['sitoo_credentials', 'other'] });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('includes[]=sitoo_credentials');
      expect(url).toContain('includes[]=other');
    });

    it('should list accounts without includes when array is empty', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      await client.listAccounts({ includes: [] });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts');
      expect(url).not.toContain('?');
    });

    it('should create an account', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 5, name: 'New Account' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.createAccount({ name: 'New Account' });

      expect(result.data?.id).toBe(5);
      expect(result.data?.name).toBe('New Account');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/accounts');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.name).toBe('New Account');
    });

    it('should get an account by ID', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 42, name: 'My Account' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getAccount(42);

      expect(result?.data?.id).toBe(42);
      expect(result?.data?.name).toBe('My Account');
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts/42');
    });

    it('should get the current account with "show"', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: { id: 1, name: 'Current Account' },
        })
      );

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getAccount('show');

      expect(result?.data?.id).toBe(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://app.rule.io/api/v3/accounts/show');
    });

    it('should return null for non-existent account', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Not found' }, 404));

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.getAccount(99999);

      expect(result).toBeNull();
    });

    it('should delete an account', async () => {
      mockFetch.mockResolvedValueOnce(createMock204Response());

      const client = new RuleClient({ apiKey: 'test-key', fetch: mockFetch });
      const result = await client.deleteAccount(42);

      expect(result).toEqual({ success: true });
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://app.rule.io/api/v3/accounts/42');
      expect(options.method).toBe('DELETE');
    });

    it('should throw RuleApiError on 401 for account endpoints', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'Unauthorized' }, 401));

      const client = new RuleClient({ apiKey: 'bad-key', fetch: mockFetch });

      await expect(client.listAccounts()).rejects.toThrow('Invalid Rule.io API key');
    });
  });
});
