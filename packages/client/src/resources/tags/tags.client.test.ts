import { beforeEach, describe, expect, it } from 'vitest';

import {
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
  });

  describe('findIdByName', () => {
    it('returns the matching tag id', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          tags: [
            { id: 10, name: 'order-confirmed' },
            { id: 20, name: 'newsletter' },
          ],
        })
      );
      const client = createClient(fetchMock);

      expect(await client.findIdByName('newsletter')).toBe(20);
    });

    it('returns null when no tag matches', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ tags: [{ id: 10, name: 'order-confirmed' }] })
      );
      const client = createClient(fetchMock);

      expect(await client.findIdByName('nonexistent')).toBeNull();
    });

    it('returns null when the API omits the tags array', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));
      const client = createClient(fetchMock);

      expect(await client.findIdByName('anything')).toBeNull();
    });
  });
});
