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

const WIRE_BRAND_STYLE = {
  id: 42,
  account_id: 1,
  name: 'My Brand',
  description: null,
  domain: null,
  is_default: true,
  is_fetchable: null,
  colours: [
    { id: 1, brand_style_id: 42, type: 'brand', hex: '#FF5733', brightness: 50, created_at: '2024-01-01', updated_at: '2024-01-02' },
  ],
  links: [],
  fonts: [],
  images: [],
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
};

function createClient(fetchMock: MockFetch): BrandStylesClient {
  return new BrandStylesClient(createMockTransport(fetchMock));
}

describe('BrandStylesClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('list', () => {
    it('GETs v3 /brand-styles and returns BrandStyleListItem[]', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { id: 1, name: 'A', is_default: true,  created_at: '2024-01-01', updated_at: '2024-01-02' },
            { id: 2, name: 'B', is_default: false, created_at: '2024-01-01', updated_at: '2024-01-02' },
          ],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.list();

      expect(result).toHaveLength(2);
      expect(result[0]!.isDefault).toBe(true);
      expect(result[0]!.createdAt).toBe('2024-01-01');
      // no snake_case fields
      expect(result[0]).not.toHaveProperty('is_default');
      expect(result[0]).not.toHaveProperty('created_at');

      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/brand-styles');
    });
  });

  describe('get', () => {
    it('returns the brand style as a camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_BRAND_STYLE }));
      const client = createClient(fetchMock);

      const result = await client.get(42);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(42);
      expect(result!.name).toBe('My Brand');
      expect(result!.isDefault).toBe(true);
      expect(result!.accountId).toBe(1);
      expect(result!.createdAt).toBe('2024-01-01');
      expect(result!.colours![0]!.brandStyleId).toBe(42);
      // no snake_case fields
      expect(result).not.toHaveProperty('is_default');
      expect(result).not.toHaveProperty('account_id');

      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/brand-styles/42');
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
    it('POSTs to /brand-styles/from-domain and returns camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { ...WIRE_BRAND_STYLE, domain: 'example.com' } })
      );
      const client = createClient(fetchMock);

      const result = await client.createFromDomain({ domain: 'example.com' });

      expect(result.domain).toBe('example.com');
      expect(result.isDefault).toBe(true);

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/from-domain');
      expect((init as RequestInit).method).toBe('POST');
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({ domain: 'example.com' });
    });

    it('propagates 424 (failed to fetch domain)', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 424));
      const client = createClient(fetchMock);

      await expect(client.createFromDomain({ domain: 'nonexistent.example' })).rejects.toBeInstanceOf(RuleApiError);
    });

    it('propagates 409 (already exists)', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 409));
      const client = createClient(fetchMock);

      await expect(client.createFromDomain({ domain: 'example.com' })).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('createManually', () => {
    it('POSTs to /brand-styles/manually mapping camelCase → snake_case', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_BRAND_STYLE }));
      const client = createClient(fetchMock);

      const result = await client.createManually({
        name: 'Custom Brand',
        isDefault: true,
        colours: [{ type: 'brand', hex: '#00FF00', brightness: 70 }],
        fonts: [{ type: 'title', name: 'Arial', origin: 'system', originId: 'arial-id' }],
      });

      expect(result.name).toBe('My Brand');

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/manually');
      expect((init as RequestInit).method).toBe('POST');

      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.name).toBe('Custom Brand');
      expect(body.is_default).toBe(true);  // camelCase → snake_case
      expect(body.colours).toEqual([{ type: 'brand', hex: '#00FF00', brightness: 70 }]);
      expect(body.fonts[0].origin_id).toBe('arial-id');  // originId → origin_id
      expect(body).not.toHaveProperty('isDefault');
    });
  });

  describe('update', () => {
    it('PATCHes and returns camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_BRAND_STYLE }));
      const client = createClient(fetchMock);

      const result = await client.update(42, { name: 'Updated', isDefault: false });

      expect(result.id).toBe(42);

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/brand-styles/42');
      expect((init as RequestInit).method).toBe('PATCH');

      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.name).toBe('Updated');
      expect(body.is_default).toBe(false);
      expect(body).not.toHaveProperty('isDefault');
    });
  });

  describe('delete', () => {
    it('DELETEs the brand style and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMock204Response());
      const client = createClient(fetchMock);

      const result = await client.delete(42);

      expect(result).toBeUndefined();
      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/brand-styles/42');
    });

    it('propagates 403 (last brand style)', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 403));
      const client = createClient(fetchMock);

      await expect(client.delete(42)).rejects.toBeInstanceOf(RuleApiError);
    });
  });
});
