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

  describe('list', () => {
    it('GETs v2 /tags and returns the response', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          tags: [
            { id: 1, name: 'newsletter' },
            { id: 2, name: 'vip' },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list();

      expect(result.tags).toHaveLength(2);
      expect(result.tags?.[0].name).toBe('newsletter');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags');
      expect((init as RequestInit).method).toBe('GET');
    });

    it('returns the empty list when the API returns one', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ tags: [] }));
      const client = createClient(fetchMock);

      expect((await client.list()).tags).toEqual([]);
    });

    it('appends ?limit=N to the URL when limit is specified', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ tags: [] }));
      const client = createClient(fetchMock);

      await client.list({ limit: 20 });
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags?limit=20');
    });

    it('surfaces meta.next from the response', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          tags: [{ id: 1, name: 'newsletter' }],
          meta: { next: 'https://app.rule.io/api/v2/tags?page=2&limit=1' },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list({ limit: 1 });

      expect(result.meta?.next).toBe('https://app.rule.io/api/v2/tags?page=2&limit=1');
    });
  });

  describe('getById', () => {
    it('GETs v2 /tags/:id?identified_by=id and returns the entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Newsletter', description: 'Newsletter1' })
      );
      const client = createClient(fetchMock);

      const result = await client.getById(1);

      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Newsletter');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id');
      expect((init as RequestInit).method).toBe('GET');
    });

    it('includes with_count=true in the URL when requested', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Newsletter', recipient_count: 123 })
      );
      const client = createClient(fetchMock);

      const result = await client.getById(1, { withCount: true });

      expect(result?.recipient_count).toBe(123);
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe(
        'https://app.rule.io/api/v2/tags/1?identified_by=id&with_count=true'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'TagNotFound', message: 'Could not find tag.' }, 404)
      );
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
    it('GETs v2 /tags/:name?identified_by=name (URL-encoded) and returns the entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Newsletter', description: 'Newsletter1' })
      );
      const client = createClient(fetchMock);

      const result = await client.getByName('Newsletter');

      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Newsletter');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter?identified_by=name');
      expect((init as RequestInit).method).toBe('GET');
    });

    it('URL-encodes names with special characters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 2, name: 'order confirmed' }));
      const client = createClient(fetchMock);

      await client.getByName('order confirmed');
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe(
        'https://app.rule.io/api/v2/tags/order%20confirmed?identified_by=name'
      );
    });

    it('includes with_count=true in the URL when requested', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Newsletter', recipient_count: 42 })
      );
      const client = createClient(fetchMock);

      const result = await client.getByName('Newsletter', { withCount: true });

      expect(result?.recipient_count).toBe(42);
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe(
        'https://app.rule.io/api/v2/tags/Newsletter?identified_by=name&with_count=true'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'TagNotFound', message: 'Could not find tag.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.getByName('nonexistent')).toBeNull();
    });
  });

  describe('updateById', () => {
    it('PUTs v2 /tags/:id?identified_by=id with JSON body and returns the updated entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Renamed', description: 'New desc' })
      );
      const client = createClient(fetchMock);

      const result = await client.updateById(1, { name: 'Renamed', description: 'New desc' });

      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Renamed');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id');
      expect((init as RequestInit).method).toBe('PUT');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        name: 'Renamed',
        description: 'New desc',
      });
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'TagNotFound', message: 'Could not find tag.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.updateById(999, { name: 'x' })).toBeNull();
    });

    it('rethrows 409 DuplicateTag', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'DuplicateTag', message: 'Tag already exists.' }, 409)
      );
      const client = createClient(fetchMock);

      await expect(client.updateById(1, { name: 'existing' })).rejects.toThrow();
    });
  });

  describe('updateByName', () => {
    it('PUTs v2 /tags/:name?identified_by=name (URL-encoded) with JSON body and returns the updated entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 1, name: 'Renamed', description: 'New desc' })
      );
      const client = createClient(fetchMock);

      const result = await client.updateByName('Newsletter', {
        name: 'Renamed',
        description: 'New desc',
      });

      expect(result?.name).toBe('Renamed');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter?identified_by=name');
      expect((init as RequestInit).method).toBe('PUT');
    });

    it('URL-encodes names with special characters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 2, name: 'order confirmed' }));
      const client = createClient(fetchMock);

      await client.updateByName('order confirmed', { name: 'order confirmed' });
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe(
        'https://app.rule.io/api/v2/tags/order%20confirmed?identified_by=name'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'TagNotFound', message: 'Could not find tag.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.updateByName('nonexistent', { name: 'x' })).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('DELETEs v2 /tags/:id?identified_by=id and returns the response', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.deleteById(1);

      expect(result?.message).toBe('Success');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'TagNotFound', message: 'Could not find tag.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.deleteById(999)).toBeNull();
    });
  });

  describe('deleteByName', () => {
    it('DELETEs v2 /tags/:name?identified_by=name (URL-encoded) and returns the response', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.deleteByName('Newsletter');

      expect(result?.message).toBe('Success');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter?identified_by=name');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'TagNotFound', message: 'Could not find tag.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.deleteByName('nonexistent')).toBeNull();
    });
  });

  describe('clearById', () => {
    it('DELETEs v2 /tags/:id/clear?identified_by=id and returns the response', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.clearById(1);

      expect(result?.message).toBe('Success');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1/clear?identified_by=id');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'TagNotFound', message: 'Could not find tag.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.clearById(999)).toBeNull();
    });
  });

  describe('clearByName', () => {
    it('DELETEs v2 /tags/:name/clear?identified_by=name (URL-encoded) and returns the response', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.clearByName('Newsletter');

      expect(result?.message).toBe('Success');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter/clear?identified_by=name');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('URL-encodes names with special characters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      await client.clearByName('order confirmed');
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe(
        'https://app.rule.io/api/v2/tags/order%20confirmed/clear?identified_by=name'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'TagNotFound', message: 'Could not find tag.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.clearByName('nonexistent')).toBeNull();
    });
  });

  describe('get', () => {
    it('dispatches to getById when identifier is a number', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 1, name: 'Newsletter' }));
      const client = createClient(fetchMock);

      await client.get(1);
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id');
    });

    it('dispatches to getByName when identifier is a string', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 1, name: 'Newsletter' }));
      const client = createClient(fetchMock);

      await client.get('Newsletter');
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter?identified_by=name');
    });
  });

  describe('update', () => {
    it('dispatches to updateById when identifier is a number', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 1, name: 'Renamed' }));
      const client = createClient(fetchMock);

      await client.update(1, { name: 'Renamed' });
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id');
      expect((init as RequestInit).method).toBe('PUT');
    });

    it('dispatches to updateByName when identifier is a string', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 1, name: 'Renamed' }));
      const client = createClient(fetchMock);

      await client.update('Newsletter', { name: 'Renamed' });
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter?identified_by=name');
      expect((init as RequestInit).method).toBe('PUT');
    });
  });

  describe('delete', () => {
    it('dispatches to deleteById when identifier is a number', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      await client.delete(1);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1?identified_by=id');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('dispatches to deleteByName when identifier is a string', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      await client.delete('Newsletter');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter?identified_by=name');
      expect((init as RequestInit).method).toBe('DELETE');
    });
  });

  describe('clear', () => {
    it('dispatches to clearById when identifier is a number', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      await client.clear(1);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/1/clear?identified_by=id');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('dispatches to clearByName when identifier is a string', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      await client.clear('Newsletter');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/tags/Newsletter/clear?identified_by=name');
      expect((init as RequestInit).method).toBe('DELETE');
    });
  });
});
