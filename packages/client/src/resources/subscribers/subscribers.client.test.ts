import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError, RuleConfigError } from '@rule-io/core';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { SubscribersClient } from './subscribers.client.js';

function createClient(fetchMock: MockFetch, prefix = 'Booking'): SubscribersClient {
  return new SubscribersClient(createMockTransport(fetchMock), prefix);
}

describe('SubscribersClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  // ── v2 sync ────────────────────────────────────────────────────────────────
  describe('sync', () => {
    it('posts to v2 /subscribers with prefixed fields and the provided tags', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          success: true,
          subscriber: { id: '123', email: 'test@example.com' },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.sync({
        email: 'test@example.com',
        fields: { FirstName: 'Anna', LastName: 'Svensson' },
        tags: ['booking-confirmed'],
      });

      expect(result.success).toBe(true);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/subscribers');
      expect((init as RequestInit).method).toBe('POST');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.update_on_duplicate).toBe(true);
      expect(body.tags).toEqual(['booking-confirmed']);
      expect(body.subscribers.email).toBe('test@example.com');
      expect(body.subscribers.fields).toContainEqual({
        key: 'Booking.FirstName',
        value: 'Anna',
      });
    });

    it('filters out undefined and empty-string fields', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      await client.sync({
        email: 'test@example.com',
        fields: { FirstName: 'Anna', LastName: undefined, Phone: '' },
        tags: ['test'],
      });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
      const fieldKeys = body.subscribers.fields.map((f: { key: string }) => f.key);

      expect(fieldKeys).toContain('Booking.FirstName');
      expect(fieldKeys).not.toContain('Booking.LastName');
      expect(fieldKeys).not.toContain('Booking.Phone');
    });

    it('uses the configured prefix for every field key', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock, 'Order');

      await client.sync({
        email: 'test@example.com',
        fields: { Ref: 'ORD-123' },
        tags: ['test'],
      });

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body.subscribers.fields).toContainEqual({
        key: 'Order.Ref',
        value: 'ORD-123',
      });
    });

    it('throws RuleConfigError when a field key contains a dot', async () => {
      const client = createClient(fetchMock);

      await expect(
        client.sync({
          email: 'test@example.com',
          fields: { 'Booking.FirstName': 'Anna' },
          tags: ['test'],
        })
      ).rejects.toThrow(RuleConfigError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // ── v2 reads ───────────────────────────────────────────────────────────────
  describe('get', () => {
    it('returns the subscriber payload on 200', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ subscriber: { id: '123', email: 'a@b.c' } })
      );
      const client = createClient(fetchMock);

      const result = await client.get('a@b.c');

      expect(result?.subscriber?.email).toBe('a@b.c');
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v2/subscribers/a%40b.c?identified_by=email');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({ error: 'Not found' }, 404));
      const client = createClient(fetchMock);

      expect(await client.get('missing@example.com')).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.get('x@y.z')).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('getFields', () => {
    it('flattens groups into Group.Field map', async () => {
      fetchMock.mockResolvedValueOnce(
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
      const client = createClient(fetchMock);

      const fields = await client.getFields('a@b.c');

      expect(fields['Booking.FirstName']).toBe('Anna');
      expect(fields['Booking.LastName']).toBe('Svensson');
      const url = fetchMock.mock.calls[0]![0] as string;

      // Note the singular `/subscriber/` path — required by the v2 API.
      expect(url).toBe('https://app.rule.io/api/v2/subscriber/a%40b.c/fields?identified_by=email');
    });

    it('returns {} on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({ error: 'Not found' }, 404));
      const client = createClient(fetchMock);

      expect(await client.getFields('missing@example.com')).toEqual({});
    });
  });

  describe('getTagNames', () => {
    it('returns the tag names', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ tags: [{ name: 'a' }, { name: 'b' }] })
      );
      const client = createClient(fetchMock);

      expect(await client.getTagNames('a@b.c')).toEqual(['a', 'b']);
    });

    it('returns [] on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.getTagNames('missing@example.com')).toEqual([]);
    });

    it('returns [] when the API omits tags', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));
      const client = createClient(fetchMock);

      expect(await client.getTagNames('a@b.c')).toEqual([]);
    });
  });

  // ── v3 single-subscriber writes ────────────────────────────────────────────
  describe('create', () => {
    it('POSTs to v3 /subscribers with the request body', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 100, email: 'new@example.com', status: 'ACTIVE' })
      );
      const client = createClient(fetchMock);

      const result = await client.create({
        email: 'new@example.com',
        status: 'ACTIVE',
        language: 'sv',
      });

      expect(result.id).toBe(100);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/subscribers');
      expect((init as RequestInit).method).toBe('POST');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({ email: 'new@example.com', status: 'ACTIVE', language: 'sv' });
    });
  });

  describe('delete', () => {
    it('DELETEs by email by default', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.delete('old@example.com');

      expect(result.success).toBe(true);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/subscribers/old%40example.com?identified_by=email');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('honors identifiedBy=id for numeric subscribers', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.delete(12345, 'id');

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/subscribers/12345?identified_by=id');
    });
  });

  describe('addTags', () => {
    it('PUTs the tag list and automation flag', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.addTags(
        'customer@example.com',
        { tags: ['vip', 'returning'], automation: 'force' },
        'email'
      );

      expect(result.success).toBe(true);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe(
        'https://app.rule.io/api/v3/subscribers/customer%40example.com/tags?identified_by=email'
      );
      expect((init as RequestInit).method).toBe('PUT');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.tags).toEqual(['vip', 'returning']);
      expect(body.automation).toBe('force');
    });

    it('defaults to identifiedBy=email', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.addTags('user@example.com', { tags: ['welcome'] });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe(
        'https://app.rule.io/api/v3/subscribers/user%40example.com/tags?identified_by=email'
      );
    });
  });

  describe('removeTag', () => {
    it('DELETEs a single tag by name', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.removeTag('customer@example.com', 'old-promo', 'email');

      expect(result.success).toBe(true);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe(
        'https://app.rule.io/api/v3/subscribers/customer%40example.com/tags/old-promo?identified_by=email'
      );
      expect((init as RequestInit).method).toBe('DELETE');
    });
  });

  // ── v3 bulk + block/unblock ────────────────────────────────────────────────
  describe('block', () => {
    it('POSTs the subscribers list to /subscribers/block', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.block([{ email: 'spam@example.com' }, { id: 456 }]);

      expect(result.success).toBe(true);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/subscribers/block');
      expect((init as RequestInit).method).toBe('POST');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.subscribers).toHaveLength(2);
      expect(body.callback_url).toBeUndefined();
    });

    it('includes callback_url when provided', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.block([{ email: 'a@b.c' }], 'https://example.com/webhook');

      const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

      expect(body.callback_url).toBe('https://example.com/webhook');
    });
  });

  describe('unblock', () => {
    it('POSTs to /subscribers/unblock', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.unblock([
        { email: 'restored@example.com' },
        { phone_number: '+46701234567' },
      ]);

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/subscribers/unblock');
    });
  });

  describe('bulkAddTags', () => {
    it('POSTs to /subscribers/tags', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.bulkAddTags({
        subscribers: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
        tags: ['newsletter', 'promo-2024'],
      });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/subscribers/tags');
      expect((init as RequestInit).method).toBe('POST');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.subscribers).toHaveLength(2);
      expect(body.tags).toEqual(['newsletter', 'promo-2024']);
    });
  });

  describe('bulkRemoveTags', () => {
    it('DELETEs to /subscribers/tags with a JSON body', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.bulkRemoveTags({
        subscribers: [{ email: 'a@example.com' }],
        tags: ['old-campaign'],
      });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/subscribers/tags');
      expect((init as RequestInit).method).toBe('DELETE');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.tags).toEqual(['old-campaign']);
    });
  });
});
