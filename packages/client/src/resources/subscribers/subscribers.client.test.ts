import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError, RuleConfigError } from '@rulecom/core';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { SubscribersClient } from './subscribers.client.js';

function createClient(fetchMock: MockFetch): SubscribersClient {
  return new SubscribersClient(createMockTransport(fetchMock));
}

describe('SubscribersClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  // ── v3 sync ────────────────────────────────────────────────────────────────
  describe('sync', () => {
    it('POSTs to v3 /subscribers, then writes fields and tags in parallel', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 123, email: 'test@example.com' } })
      );
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.sync({
        email: 'test@example.com',
        fields: { FirstName: 'Anna', LastName: 'Svensson' },
        tags: ['booking-confirmed'],
      }, 'Booking');

      expect(result.success).toBe(true);
      expect(fetchMock.mock.calls).toHaveLength(3);

      // Call 1: POST /v3/subscribers
      const [url1, init1] = fetchMock.mock.calls[0]!;

      expect(url1).toBe('https://app.rule.io/api/v3/subscribers');
      expect((init1 as RequestInit).method).toBe('POST');
      expect(JSON.parse((init1 as RequestInit).body as string)).toEqual({
        email: 'test@example.com',
      });

      // Call 2: POST /v3/custom-field-data/123
      const [url2, init2] = fetchMock.mock.calls[1]!;

      expect(url2).toBe('https://app.rule.io/api/v3/custom-field-data/123');
      expect((init2 as RequestInit).method).toBe('POST');
      const fieldBody = JSON.parse((init2 as RequestInit).body as string);

      expect(fieldBody.groups[0].group).toBe('Booking');
      expect(fieldBody.groups[0].values).toContainEqual({ field: 'FirstName', value: 'Anna' });
      expect(fieldBody.groups[0].values).toContainEqual({ field: 'LastName', value: 'Svensson' });

      // Call 3: PUT /v3/subscribers/{email}/tags
      const [url3, init3] = fetchMock.mock.calls[2]!;

      expect(url3).toBe(
        'https://app.rule.io/api/v3/subscribers/test%40example.com/tags?identified_by=email'
      );
      expect((init3 as RequestInit).method).toBe('PUT');
      expect(JSON.parse((init3 as RequestInit).body as string).tags).toEqual(['booking-confirmed']);
    });

    it('filters out undefined and empty-string fields', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: { id: 200, email: 'test@example.com' } }));
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.sync({
        email: 'test@example.com',
        fields: { FirstName: 'Anna', LastName: undefined, Phone: '' },
        tags: ['test'],
      }, 'Booking');

      const fieldBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
      const fieldNames = fieldBody.groups[0].values.map((f: { field: string }) => f.field);

      expect(fieldNames).toContain('FirstName');
      expect(fieldNames).not.toContain('LastName');
      expect(fieldNames).not.toContain('Phone');
    });

    it('uses the provided prefix as the group name', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: { id: 300, email: 'test@example.com' } }));
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      await client.sync({
        email: 'test@example.com',
        fields: { Ref: 'ORD-123' },
        tags: ['test'],
      }, 'Order');

      const fieldBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);

      expect(fieldBody.groups[0].group).toBe('Order');
      expect(fieldBody.groups[0].values).toContainEqual({ field: 'Ref', value: 'ORD-123' });
    });

    it('falls back to v2 GET when v3 subscriber create fails', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({ error: 'Duplicate' }, 422));
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ subscriber: { id: '999', email: 'test@example.com' } })
      );
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.sync({
        email: 'test@example.com',
        fields: { FirstName: 'Anna' },
        tags: ['test'],
      }, 'Booking');

      expect(result.success).toBe(true);
      expect(fetchMock.mock.calls).toHaveLength(4);
      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/subscribers');
      expect(fetchMock.mock.calls[1]![0]).toMatch(/\/api\/v2\/subscribers\//);
      expect(fetchMock.mock.calls[2]![0]).toBe('https://app.rule.io/api/v3/custom-field-data/999');
    });

    it('throws RuleConfigError when a field key contains a dot', async () => {
      const client = createClient(fetchMock);

      await expect(
        client.sync({
          email: 'test@example.com',
          fields: { 'Booking.FirstName': 'Anna' },
          tags: ['test'],
        }, 'Booking')
      ).rejects.toThrow(RuleConfigError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws RuleConfigError when fieldGroupPrefix is empty', async () => {
      const client = createClient(fetchMock);

      await expect(
        client.sync({ email: 'test@example.com' }, '')
      ).rejects.toThrow(RuleConfigError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws RuleConfigError when fieldGroupPrefix contains a dot', async () => {
      const client = createClient(fetchMock);

      await expect(
        client.sync({ email: 'test@example.com' }, 'A.B')
      ).rejects.toThrow(RuleConfigError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('trims whitespace from fieldGroupPrefix', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: { id: 400, email: 'test@example.com' } }));
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      await client.sync({ email: 'test@example.com', fields: { Ref: '1' } }, '  Booking  ');

      const fieldBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);

      expect(fieldBody.groups[0].group).toBe('Booking');
      expect(fieldBody.groups[0].values).toContainEqual({ field: 'Ref', value: '1' });
    });
  });

  // ── v2 reads ───────────────────────────────────────────────────────────────
  describe('getByEmail', () => {
    it('returns the subscriber payload on 200', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ subscriber: { id: '123', email: 'a@b.c' } })
      );
      const client = createClient(fetchMock);

      const result = await client.getByEmail('a@b.c');

      expect(result?.subscriber?.email).toBe('a@b.c');
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v2/subscribers/a%40b.c?identified_by=email');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({ error: 'Not found' }, 404));
      const client = createClient(fetchMock);

      expect(await client.getByEmail('missing@example.com')).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.getByEmail('x@y.z')).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('getById', () => {
    it('uses identified_by=id in the URL', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ subscriber: { id: '42', email: 'a@b.c' } })
      );
      const client = createClient(fetchMock);

      await client.getById(42);

      expect(fetchMock.mock.calls[0]![0] as string).toBe(
        'https://app.rule.io/api/v2/subscribers/42?identified_by=id'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({ error: 'Not found' }, 404));
      const client = createClient(fetchMock);

      expect(await client.getById(999)).toBeNull();
    });
  });

  describe('getByPhone', () => {
    it('URL-encodes the phone number and uses identified_by=phone_number', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ subscriber: { id: '7', email: 'a@b.c' } })
      );
      const client = createClient(fetchMock);

      await client.getByPhone('+46123456789');

      expect(fetchMock.mock.calls[0]![0] as string).toBe(
        'https://app.rule.io/api/v2/subscribers/%2B46123456789?identified_by=phone_number'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({ error: 'Not found' }, 404));
      const client = createClient(fetchMock);

      expect(await client.getByPhone('+00000000000')).toBeNull();
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
        createMockResponse({ data: { id: 100, email: 'new@example.com', status: 'ACTIVE' } })
      );
      const client = createClient(fetchMock);

      const result = await client.create({
        email: 'new@example.com',
        status: 'ACTIVE',
        language: 'sv',
      });

      expect(result.data.id).toBe(100);
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
