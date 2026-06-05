import { beforeEach, describe, expect, it } from 'vitest';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { TagsClient } from './tags.client.js';

function createClient(fetchMock: MockFetch): TagsClient {
  return new TagsClient(createMockTransport(fetchMock));
}

describe('TagsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('listTags', () => {
    it('GETs v2 /tags and returns Tag[] with camelCase fields', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          tags: [
            { id: 1, name: 'newsletter', description: 'Monthly newsletter', created_at: '2024-01-01', updated_at: '2024-01-02' },
            { id: 2, name: 'vip' },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.listTags();

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('newsletter');
      expect(result[0]!.createdAt).toBe('2024-01-01');
      expect(result[0]!.updatedAt).toBe('2024-01-02');
      expect(result[0]).not.toHaveProperty('created_at');

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags');
      expect((init as RequestInit).method).toBe('GET');
    });

    it('returns empty array when none returned', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ tags: [] }));
      const client = createClient(fetchMock);

      expect(await client.listTags()).toEqual([]);
    });

    it('maps pageSize to limit and page in query string', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ tags: [] }));
      const client = createClient(fetchMock);

      await client.listTags({ pagination: { page: 2, pageSize: 20 } });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('limit=20');
      expect(url).toContain('page=2');
      expect(url).not.toContain('pageSize');
    });
  });

  describe('iterateTagsPages', () => {
    it('yields page arrays and stops when a page is smaller than pageSize', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ tags: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] }))
        .mockResolvedValueOnce(createMockResponse({ tags: [{ id: 3, name: 'c' }] }));
      const client = createClient(fetchMock);

      const pages: number[] = [];

      for await (const page of client.iterateTagsPages({ pagination: { pageSize: 2 } })) {
        pages.push(page.length);
      }

      expect(pages).toEqual([2, 1]);
    });

    it('stops immediately on empty first page', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ tags: [] }));
      const client = createClient(fetchMock);

      const pages: number[] = [];

      for await (const page of client.iterateTagsPages()) {
        pages.push(page.length);
      }

      expect(pages).toEqual([0]);
    });
  });

  describe('listAllTags', () => {
    it('collects all tags from all pages', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ tags: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] }))
        .mockResolvedValueOnce(createMockResponse({ tags: [] }));
      const client = createClient(fetchMock);

      const result = await client.listAllTags({ pagination: { pageSize: 2 } });

      expect(result.map((t) => t.id)).toEqual([1, 2]);
    });
  });

  describe('getById', () => {
    it('GETs v2 /tags/:id?identified_by=id and returns camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Newsletter', description: 'Newsletter1', recipient_count: 42 })
      );
      const client = createClient(fetchMock);

      const result = await client.getById(1, { withCount: true });

      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Newsletter');
      expect(result?.recipientCount).toBe(42);
      expect(result).not.toHaveProperty('recipient_count');

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id&with_count=true');
      expect((init as RequestInit).method).toBe('GET');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.getById(999)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.getById(1)).rejects.toThrow();
    });
  });

  describe('getByName', () => {
    it('GETs v2 /tags/:name?identified_by=name (URL-encoded) and returns camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Newsletter', recipient_count: 7 })
      );
      const client = createClient(fetchMock);

      const result = await client.getByName('Newsletter', { withCount: true });

      expect(result?.id).toBe(1);
      expect(result?.recipientCount).toBe(7);

      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter?identified_by=name&with_count=true');
    });

    it('URL-encodes names with special characters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 2, name: 'order confirmed' }));
      const client = createClient(fetchMock);

      await client.getByName('order confirmed');

      expect(fetchMock.mock.calls[0]![0] as string).toBe(
        'https://app.rule.io/api/v2/tags/order%20confirmed?identified_by=name'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.getByName('nonexistent')).toBeNull();
    });
  });

  describe('updateById', () => {
    it('PUTs and returns camelCase Tag entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Renamed', description: 'New desc', created_at: '2024-01-01', updated_at: '2024-02-01' })
      );
      const client = createClient(fetchMock);

      const result = await client.updateById(1, { name: 'Renamed', description: 'New desc' });

      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Renamed');
      expect(result?.createdAt).toBe('2024-01-01');
      expect(result).not.toHaveProperty('created_at');

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id');
      expect((init as RequestInit).method).toBe('PUT');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        name: 'Renamed',
        description: 'New desc',
      });
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.updateById(999, { name: 'x' })).toBeNull();
    });

    it('rethrows 409 DuplicateTag', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 409));
      const client = createClient(fetchMock);

      await expect(client.updateById(1, { name: 'existing' })).rejects.toThrow();
    });
  });

  describe('updateByName', () => {
    it('PUTs and returns camelCase Tag entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Renamed', description: 'New desc' })
      );
      const client = createClient(fetchMock);

      const result = await client.updateByName('Newsletter', { name: 'Renamed', description: 'New desc' });

      expect(result?.name).toBe('Renamed');

      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter?identified_by=name');
    });

    it('URL-encodes names with special characters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 2, name: 'order confirmed' }));
      const client = createClient(fetchMock);

      await client.updateByName('order confirmed', { name: 'order confirmed' });

      expect(fetchMock.mock.calls[0]![0] as string).toBe(
        'https://app.rule.io/api/v2/tags/order%20confirmed?identified_by=name'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.updateByName('nonexistent', { name: 'x' })).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('DELETEs and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.deleteById(1);

      expect(result).toBeUndefined();

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('resolves without error on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      await expect(client.deleteById(999)).resolves.toBeUndefined();
    });
  });

  describe('deleteByName', () => {
    it('DELETEs and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.deleteByName('Newsletter');

      expect(result).toBeUndefined();
      expect(fetchMock.mock.calls[0]![0] as string).toBe(
        'https://app.rule.io/api/v2/tags/Newsletter?identified_by=name'
      );
    });

    it('resolves without error on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      await expect(client.deleteByName('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('clearById', () => {
    it('DELETEs /clear and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.clearById(1);

      expect(result).toBeUndefined();

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1/clear?identified_by=id');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('resolves without error on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      await expect(client.clearById(999)).resolves.toBeUndefined();
    });
  });

  describe('clearByName', () => {
    it('DELETEs /clear and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.clearByName('Newsletter');

      expect(result).toBeUndefined();
      expect(fetchMock.mock.calls[0]![0] as string).toBe(
        'https://app.rule.io/api/v2/tags/Newsletter/clear?identified_by=name'
      );
    });

    it('URL-encodes names with special characters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      await client.clearByName('order confirmed');

      expect(fetchMock.mock.calls[0]![0] as string).toBe(
        'https://app.rule.io/api/v2/tags/order%20confirmed/clear?identified_by=name'
      );
    });

    it('resolves without error on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      await expect(client.clearByName('nonexistent')).resolves.toBeUndefined();
    });
  });

});
