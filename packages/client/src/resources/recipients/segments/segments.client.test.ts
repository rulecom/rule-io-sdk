import { beforeEach, describe, expect, it } from 'vitest';

import {
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../../core/mock-fetch.js';
import { SegmentsClient } from './segments.client.js';

function createClient(fetchMock: MockFetch): SegmentsClient {
  return new SegmentsClient(createMockTransport(fetchMock));
}

describe('SegmentsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  it('GETs /editor/recipients/segments with no params', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        data: [
          { id: 1, name: 'Active Users' },
          { id: 2, name: 'VIP Customers' },
        ],
      })
    );
    const client = createClient(fetchMock);

    const result = await client.list();

    expect(result.data).toHaveLength(2);
    const [url, init] = fetchMock.mock.calls[0]!;

    expect(url).toBe('https://app.rule.io/api/v3/editor/recipients/segments');
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).body).toBeUndefined();
  });

  it('serializes pagination params into the query string', async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
    const client = createClient(fetchMock);

    await client.list({ page: 1, per_page: 10 });

    const url = fetchMock.mock.calls[0]![0] as string;

    expect(url).toBe(
      'https://app.rule.io/api/v3/editor/recipients/segments?page=1&per_page=10'
    );
  });
});
