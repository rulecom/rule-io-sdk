import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError } from '../../errors.js';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { DynamicSetsClient } from './dynamic-sets.client.js';

const WIRE_DYNAMIC_SET = {
  id: 200,
  name: 'Default',
  template_id: 789,
  subject: 'My campaign subject',
  pre_header: 'My pre header',
  utm_campaign: 'sendout',
  utm_term: 'run',
  sender: { email: 'jane@acme.com', phone_number: null, name: 'Jane' },
  trigger: null,
  active: true,
  position: 1,
  created_at: '2024-01-01 10:00:00',
  updated_at: '2024-01-02 10:00:00',
};

function createClient(fetchMock: MockFetch): DynamicSetsClient {
  return new DynamicSetsClient(createMockTransport(fetchMock));
}

describe('DynamicSetsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('create', () => {
    it('POSTs to v3 /editor/dynamic-set and maps response to camelCase entity', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_DYNAMIC_SET }));
      const client = createClient(fetchMock);

      const result = await client.create({ messageId: 456, templateId: 789 });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/dynamic-set');
      expect((init as RequestInit).method).toBe('POST');

      // wire body uses snake_case
      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.message_id).toBe(456);
      expect(body.template_id).toBe(789);
      expect(body).not.toHaveProperty('messageId');
      expect(body).not.toHaveProperty('templateId');

      // entity is returned in camelCase
      expect(result.id).toBe(200);
      expect(result.templateId).toBe(789);
      expect(result.preHeader).toBe('My pre header');
      expect(result.utmCampaign).toBe('sendout');
      expect(result.sender?.phone).toBeNull();  // phone_number → phone
      expect(result.active).toBe(true);
      expect(result.position).toBe(1);
      expect(result.createdAt).toBe('2024-01-01 10:00:00');
      // no snake_case fields on entity
      expect(result).not.toHaveProperty('template_id');
      expect(result).not.toHaveProperty('pre_header');
    });

    it('maps sender camelCase to snake_case in wire body', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_DYNAMIC_SET }));
      const client = createClient(fetchMock);

      await client.create({
        messageId: 1,
        sender: { email: 'jane@acme.com', phone: '+1234567890', name: 'Jane' },
      });

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);

      expect(body.sender.phone_number).toBe('+1234567890');
      expect(body.sender).not.toHaveProperty('phone');
    });

    it('maps trigger camelCase to snake_case in wire body', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_DYNAMIC_SET }));
      const client = createClient(fetchMock);

      await client.create({
        messageId: 1,
        trigger: { type: 'TAG', id: 42 },
      });

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);

      expect(body.trigger).toEqual({ type: 'TAG', id: 42 });
    });
  });

  describe('get', () => {
    it('returns the dynamic set as a camelCase entity on 200', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_DYNAMIC_SET }));
      const client = createClient(fetchMock);

      const result = await client.get(200);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(200);
      expect(result!.templateId).toBe(789);
      expect(result!.preHeader).toBe('My pre header');
    });

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      expect(await client.get(99999)).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(client.get(1)).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('update', () => {
    it('PUTs camelCase payload mapped to snake_case wire body', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_DYNAMIC_SET }));
      const client = createClient(fetchMock);

      const result = await client.update(200, {
        templateId: 101,
        preHeader: 'New preheader',
        active: false,
      });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/dynamic-set/200');
      expect((init as RequestInit).method).toBe('PUT');

      const body = JSON.parse((init as RequestInit).body as string);

      expect(body.template_id).toBe(101);
      expect(body.pre_header).toBe('New preheader');
      expect(body.active).toBe(false);
      expect(body).not.toHaveProperty('templateId');
      expect(body).not.toHaveProperty('preHeader');
      // message_id is not included in update body
      expect(body).not.toHaveProperty('message_id');

      expect(result.id).toBe(200);
    });
  });

  describe('delete', () => {
    it('DELETEs the dynamic set and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      const result = await client.delete(200);

      expect(result).toBeUndefined();
      expect(fetchMock.mock.calls[0]![0]).toBe(
        'https://app.rule.io/api/v3/editor/dynamic-set/200'
      );
    });
  });

  describe('listDynamicSets', () => {
    it('GETs with message_id query param and returns DynamicSet[]', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [WIRE_DYNAMIC_SET] }));
      const client = createClient(fetchMock);

      const result = await client.listDynamicSets(456);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(200);
      expect(result[0]!.templateId).toBe(789);

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('message_id=456');
    });

    it('returns empty array when data is empty', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      expect(await client.listDynamicSets(1)).toEqual([]);
    });
  });
});
