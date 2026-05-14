import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '../../errors.js';

import {
  createMock204Response,
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { BrandStylesClient } from './brand-styles.client.js';

function createClient(fetchMock: MockFetch): BrandStylesClient {
  return new BrandStylesClient(createMockTransport(fetchMock));
}

describe('BrandStylesClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('list', () => {
    it('GETs v3 /brand-styles', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'A', is_default: true, created_at: '', updated_at: '' },
            { id: 2, name: 'B', is_default: false, created_at: '', updated_at: '' },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list();

      expect(result.data).toHaveLength(2);
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles');
    });
  });

  describe('get', () => {
    it('returns the brand style by ID', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 42,
            account_id: 1,
            name: 'My Brand',
            is_default: true,
            colours: [
              {
                id: 1,
                brand_style_id: 42,
                type: 'brand',
                hex: '#FF5733',
                brightness: 50,
                created_at: '',
                updated_at: '',
              },
            ],
            created_at: '',
            updated_at: '',
          },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.get(42);

      expect(result?.data?.name).toBe('My Brand');
      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/42');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.get(999)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.get(42)).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('createFromDomain', () => {
    it('POSTs to /brand-styles/from-domain', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 10,
            account_id: 1,
            name: 'example.com',
            domain: 'example.com',
            is_default: false,
            created_at: '',
            updated_at: '',
          },
        })
      );
      const client = createClient(fetchMock);

      const result = await client.createFromDomain({ domain: 'example.com' });

      expect(result.data?.domain).toBe('example.com');
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/from-domain');
      expect((init as RequestInit).method).toBe('POST');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        domain: 'example.com',
      });
    });

    it('propagates 424 (failed to fetch domain)', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 424));
      const client = createClient(fetchMock);

      await expect(
        client.createFromDomain({ domain: 'nonexistent.example' })
      ).rejects.toBeInstanceOf(RuleApiError);
    });

    it('propagates 409 (already exists)', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 409));
      const client = createClient(fetchMock);

      await expect(
        client.createFromDomain({ domain: 'example.com' })
      ).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('createManually', () => {
    it('POSTs to /brand-styles/manually with the body', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 11,
            account_id: 1,
            name: 'Custom Brand',
            is_default: false,
            created_at: '',
            updated_at: '',
          },
        })
      );
      const client = createClient(fetchMock);

      await client.createManually({
        name: 'Custom Brand',
        colours: [{ type: 'brand', hex: '#00FF00', brightness: 70 }],
      });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/manually');
      expect((init as RequestInit).method).toBe('POST');
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.name).toBe('Custom Brand');
      expect(body.colours).toEqual([{ type: 'brand', hex: '#00FF00', brightness: 70 }]);
    });
  });

  describe('update', () => {
    it('PATCHes the brand style', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: {
            id: 42,
            account_id: 1,
            name: 'Updated',
            is_default: true,
            created_at: '',
            updated_at: '',
          },
        })
      );
      const client = createClient(fetchMock);

      await client.update(42, { name: 'Updated' });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/42');
      expect((init as RequestInit).method).toBe('PATCH');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'Updated' });
    });
  });

  describe('delete', () => {
    it('DELETEs the brand style and returns success on 204', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.delete(42);

      expect(result).toEqual({ success: true });
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/42');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('propagates 403 (last brand style)', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 403));
      const client = createClient(fetchMock);

      await expect(client.delete(42)).rejects.toBeInstanceOf(RuleApiError);
    });
  });
});
