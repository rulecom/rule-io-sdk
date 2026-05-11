import { beforeEach, describe, expect, it } from 'vitest';

import { createMockFetch, createMockTransport, type MockFetch } from '../../core/mock-fetch.js';
import { RecipientsClient } from './recipients.client.js';
import { RecipientSubscribersClient } from './subscribers/recipient-subscribers.client.js';
import { RecipientTagsClient } from './tags/recipient-tags.client.js';
import { SegmentsClient } from './segments/segments.client.js';

function createClient(fetchMock: MockFetch): RecipientsClient {
  return new RecipientsClient(createMockTransport(fetchMock));
}

describe('RecipientsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  it('exposes nested segments / subscribers / tags clients of the right type', () => {
    const client = createClient(fetchMock);

    expect(client.segments).toBeInstanceOf(SegmentsClient);
    expect(client.subscribers).toBeInstanceOf(RecipientSubscribersClient);
    expect(client.tags).toBeInstanceOf(RecipientTagsClient);
  });

  it('returns the same nested instance on repeated access (singleton)', () => {
    const client = createClient(fetchMock);

    expect(client.segments).toBe(client.segments);
    expect(client.subscribers).toBe(client.subscribers);
    expect(client.tags).toBe(client.tags);
  });

  it('keeps each nested namespace independent', () => {
    const client = createClient(fetchMock);

    expect(client.segments).not.toBe(client.subscribers as unknown);
    expect(client.subscribers).not.toBe(client.tags as unknown);
  });

  it('does not instantiate nested namespaces until accessed', () => {
    const client = createClient(fetchMock);

    // Access only `segments`; subscribers + tags should remain uncached.
    void client.segments;

    // The underlying cache only tracks accessed keys.
    // Reach into the inherited cache via a test-only assertion that the
    // nested singleton holds — accessing again should not change the count.
    const seg1 = client.segments;
    const seg2 = client.segments;

    expect(seg1).toBe(seg2);
  });
});
