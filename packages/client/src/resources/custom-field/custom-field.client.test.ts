import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '../../errors.js';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { CustomFieldClient } from './custom-field.client.js';

const WIRE_GROUP = {
  id: 1,
  name: 'Booking',
  created_at: '2024-01-01 10:00:00',
  updated_at: '2024-01-02 10:00:00',
  fields: [
    { id: 10, name: 'FirstName', type: 'text' },
    { id: 11, name: 'LastName',  type: 'text' },
  ],
};

function createClient(fetchMock: MockFetch): CustomFieldClient {
  return new CustomFieldClient(createMockTransport(fetchMock));
}

describe('CustomFieldClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('listGroups', () => {
    it('GETs v2 /customizations and returns CustomFieldGroup[]', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          groups: [WIRE_GROUP, { id: 2, name: 'Order', fields: [] }],
        })
      );
      const client = createClient(fetchMock);

      const result = await client.listGroups();

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('Booking');
      expect(result[0]!.createdAt).toBe('2024-01-01 10:00:00');
      expect(result[0]!.fields).toHaveLength(2);
      expect(result[0]!.fields[0]!.name).toBe('FirstName');
      // no snake_case fields
      expect(result[0]).not.toHaveProperty('created_at');

      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v2/customizations');
    });

    it('appends ?limit=N when specified', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ groups: [WIRE_GROUP] }));
      const client = createClient(fetchMock);

      await client.listGroups({ limit: 10 });

      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v2/customizations?limit=10');
    });

    it('returns empty array when none exist', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ groups: [] }));
      const client = createClient(fetchMock);

      expect(await client.listGroups()).toEqual([]);
    });
  });

  describe('iterateGroupsPages', () => {
    it('yields page arrays and stops when a page is smaller than limit', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ groups: [WIRE_GROUP, { id: 2, name: 'Order', fields: [] }] }))
        .mockResolvedValueOnce(createMockResponse({ groups: [{ id: 3, name: 'Extra', fields: [] }] }));
      const client = createClient(fetchMock);

      const pages: number[] = [];

      for await (const page of client.iterateGroupsPages({ limit: 2 })) {
        pages.push(page.length);
      }

      expect(pages).toEqual([2, 1]);
    });
  });

  describe('listAllGroups', () => {
    it('collects all groups from all pages', async () => {
      const g2 = { ...WIRE_GROUP, id: 2, name: 'Order' };

      fetchMock
        .mockResolvedValueOnce(createMockResponse({ groups: [WIRE_GROUP, g2] }))
        .mockResolvedValueOnce(createMockResponse({ groups: [] }));
      const client = createClient(fetchMock);

      const result = await client.listAllGroups({ limit: 2 });

      expect(result.map((g) => g.id)).toEqual([1, 2]);
    });
  });

  describe('getGroupById', () => {
    it('GETs v2 /customizations/:id and returns camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse(WIRE_GROUP));
      const client = createClient(fetchMock);

      const result = await client.getGroupById(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.name).toBe('Booking');
      expect(result!.createdAt).toBe('2024-01-01 10:00:00');
      expect(result!.fields[0]!.name).toBe('FirstName');
      expect(result).not.toHaveProperty('created_at');

      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v2/customizations/1');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.getGroupById(999)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 401));
      const client = createClient(fetchMock);

      await expect(client.getGroupById(1)).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('getGroupByName', () => {
    it('GETs v2 /customizations/:name and returns camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse(WIRE_GROUP));
      const client = createClient(fetchMock);

      const result = await client.getGroupByName('Booking');

      expect(result?.id).toBe(1);
      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v2/customizations/Booking');
    });

    it('URL-encodes names with spaces', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse(WIRE_GROUP));
      const client = createClient(fetchMock);

      await client.getGroupByName('My Group');

      expect(fetchMock.mock.calls[0]![0]).toBe(
        'https://app.rule.io/api/v2/customizations/My%20Group'
      );
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.getGroupByName('NonExistent')).toBeNull();
    });
  });

  describe('createGroups', () => {
    it('POSTs to v2 /customizations with fields array and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ message: 'Success' }));
      const client = createClient(fetchMock);

      const result = await client.createGroups([
        { key: 'Booking.FirstName', type: 'text' },
        { key: 'Booking.LastName' },
      ]);

      expect(result).toBeUndefined();

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v2/customizations');
      expect((init as RequestInit).method).toBe('POST');

      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.fields).toEqual([
        { key: 'Booking.FirstName', type: 'text' },
        { key: 'Booking.LastName' },
      ]);
    });
  });

});
