import { beforeEach, describe, expect, it } from 'vitest';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { CustomFieldClient } from './custom-field.client.js';

function createClient(fetchMock: MockFetch): CustomFieldClient {
  return new CustomFieldClient(createMockTransport(fetchMock));
}

describe('CustomFieldClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('getGroupById', () => {
    it('GETs v2 /customizations/:id and returns the group with fields', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          id: 1,
          name: 'Address',
          created_at: '2016-03-29 12:00:00',
          updated_at: '2016-03-29 12:00:00',
          fields: [{ id: 1, name: 'Street', type: 'text' }],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.getGroupById(1);

      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Address');
      expect(result?.fields).toHaveLength(1);
      expect(result?.fields[0]?.name).toBe('Street');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/customizations/1');
      expect((init as RequestInit).method).toBe('GET');
    });

    it('returns null when the API responds 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'NotFound', message: 'Could not find group.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.getGroupById(999)).toBeNull();
    });

    it('re-throws non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'Unauthorized' }, 401)
      );
      const client = createClient(fetchMock);

      await expect(client.getGroupById(1)).rejects.toThrow();
    });
  });

  describe('getGroupByName', () => {
    it('GETs v2 /customizations/:name and returns the group', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          id: 1,
          name: 'Address',
          fields: [{ id: 1, name: 'Street', type: 'text' }],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.getGroupByName('Address');

      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Address');
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/customizations/Address');
    });

    it('URL-encodes names with spaces', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 2, name: 'My Group', fields: [] }));
      const client = createClient(fetchMock);

      await client.getGroupByName('My Group');
      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/customizations/My%20Group');
    });

    it('returns null when the API responds 404', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'NotFound', message: 'Could not find group.' }, 404)
      );
      const client = createClient(fetchMock);

      expect(await client.getGroupByName('NonExistent')).toBeNull();
    });

    it('re-throws non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockErrorResponse({ error: 'Unauthorized' }, 401)
      );
      const client = createClient(fetchMock);

      await expect(client.getGroupByName('Address')).rejects.toThrow();
    });
  });
});
