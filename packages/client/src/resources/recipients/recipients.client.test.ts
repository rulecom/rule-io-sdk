import { beforeEach, describe, expect, it } from 'vitest';

import {
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { RecipientsClient } from './recipients.client.js';

function createClient(fetchMock: MockFetch): RecipientsClient {
  return new RecipientsClient(createMockTransport(fetchMock));
}

const WIRE_SEGMENT = { id: 10, name: 'Newsletter subscribers', has_next_item: false };
const WIRE_TAG = { id: 20, name: 'VIP', has_next_item: false };
const WIRE_SUBSCRIBER = {
  id: 30,
  email: 'a@b.com',
  phone: null,
  has_next_item: false,
  custom_identifier: 'ext-123',
  account_id: 1,
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
};

describe('RecipientsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('listSegments', () => {
    it('GETs /editor/recipients/segments and returns RecipientSegment[]', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [WIRE_SEGMENT] }));
      const client = createClient(fetchMock);

      const result = await client.listSegments();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(10);
      expect(result[0]!.name).toBe('Newsletter subscribers');
      // has_next_item not exposed
      expect(result[0]).not.toHaveProperty('has_next_item');

      const [url] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/segments');
    });

    it('passes page and per_page to query string', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.listSegments({ pagination: { page: 2, pageSize: 30 } });

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('page=2');
      expect(url).toContain('per_page=30');
    });
  });

  describe('listAllSegments', () => {
    it('collects all segments from all pages', async () => {
      const s2 = { ...WIRE_SEGMENT, id: 11 };

      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_SEGMENT, s2] }))
        .mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      const result = await client.listAllSegments({ pagination: { pageSize: 2 } });

      expect(result.map((s) => s.id)).toEqual([10, 11]);
    });
  });

  describe('listTags', () => {
    it('GETs /editor/recipients/tags and returns RecipientTag[]', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [WIRE_TAG] }));
      const client = createClient(fetchMock);

      const result = await client.listTags();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(20);
      expect(result[0]!.name).toBe('VIP');

      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/editor/recipients/tags');
    });
  });

  describe('listAllTags', () => {
    it('collects all tags from all pages', async () => {
      const t2 = { ...WIRE_TAG, id: 21 };

      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_TAG, t2] }))
        .mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      const result = await client.listAllTags({ pagination: { pageSize: 2 } });

      expect(result.map((t) => t.id)).toEqual([20, 21]);
    });
  });

  describe('listSubscribers', () => {
    it('GETs /editor/recipients/subscribers and returns camelCase RecipientSubscriber[]', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [WIRE_SUBSCRIBER] }));
      const client = createClient(fetchMock);

      const result = await client.listSubscribers();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(30);
      expect(result[0]!.customIdentifier).toBe('ext-123');
      expect(result[0]!.accountId).toBe(1);
      expect(result[0]!.createdAt).toBe('2024-01-01');
      expect(result[0]).not.toHaveProperty('custom_identifier');
      expect(result[0]).not.toHaveProperty('account_id');

      expect(fetchMock.mock.calls[0]![0]).toBe(
        'https://app.rule.io/api/v3/editor/recipients/subscribers'
      );
    });
  });

  describe('listAllSubscribers', () => {
    it('collects all subscribers from all pages', async () => {
      const sub2 = { ...WIRE_SUBSCRIBER, id: 31 };

      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_SUBSCRIBER, sub2] }))
        .mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      const result = await client.listAllSubscribers({ pagination: { pageSize: 2 } });

      expect(result.map((s) => s.id)).toEqual([30, 31]);
    });
  });

  describe('iterateSegmentsPages', () => {
    it('yields page arrays and stops when a page is smaller than pageSize', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_SEGMENT, { ...WIRE_SEGMENT, id: 11 }] }))
        .mockResolvedValueOnce(createMockResponse({ data: [{ ...WIRE_SEGMENT, id: 12 }] }));
      const client = createClient(fetchMock);

      const pages: number[] = [];

      for await (const page of client.iterateSegmentsPages({ pagination: { pageSize: 2 } })) {
        pages.push(page.length);
      }

      expect(pages).toEqual([2, 1]);
    });
  });
});
