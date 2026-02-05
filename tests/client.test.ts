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
});
