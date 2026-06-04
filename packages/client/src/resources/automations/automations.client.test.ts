import { beforeEach, describe, expect, it } from 'vitest';

import { RuleApiError, RuleClientError } from '../../errors.js';

import {
  createMockErrorResponse,
  createMockFetch,
  createMockResponse,
  createMockTransport,
  type MockFetch,
} from '../../core/mock-fetch.js';
import { AutomationsClient } from './automations.client.js';

const WIRE_AUTOMATION = {
  id: 123,
  name: 'Welcome email',
  description: 'Sends on signup',
  active: true,
  trigger: { type: 'TAG', id: 42, name: 'signup' },
  sendout_type: { value: 1, key: 'marketing', description: 'Marketing' },
  created_at: '2024-01-01 10:00:00',
  updated_at: '2024-01-02 10:00:00',
};

function createClient(fetchMock: MockFetch): AutomationsClient {
  return new AutomationsClient(createMockTransport(fetchMock));
}

describe('AutomationsClient', () => {
  let fetchMock: MockFetch;

  beforeEach(() => {
    fetchMock = createMockFetch();
  });

  describe('createEmailAutomation', () => {
    it('POSTs to v3 /editor/automail and maps response to camelCase', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }));
      const client = createClient(fetchMock);

      const result = await client.createEmailAutomation({
        name: 'Welcome email',
        trigger: { type: 'TAG', id: 42 },
        sendoutType: 'marketing',
      });

      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/automail');
      expect((init as RequestInit).method).toBe('POST');

      const body = JSON.parse((init as RequestInit).body as string);

      // sendout_type is integer in automations (unlike campaigns which uses string)
      expect(body.sendout_type).toBe(1);
      expect(body.trigger).toEqual({ type: 'TAG', id: 42 });
      expect(body).not.toHaveProperty('sendoutType');

      // response normalised to camelCase
      expect(result.id).toBe(123);
      expect(result.name).toBe('Welcome email');
      expect(result.sendoutType).toBe('marketing');
      expect(result.active).toBe(true);
      expect(result.trigger).toEqual({ type: 'TAG', id: 42, name: 'signup' });
      expect(result.createdAt).toBe('2024-01-01 10:00:00');
      expect(result).not.toHaveProperty('sendout_type');
      expect(result).not.toHaveProperty('created_at');
    });

    it('maps sendoutType: transactional → sendout_type: 2', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }));
      const client = createClient(fetchMock);

      await client.createEmailAutomation({ name: 'T', sendoutType: 'transactional' });

      const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);

      expect(body.sendout_type).toBe(2);
    });
  });

  describe('get', () => {
    it('returns the automation as a camelCase entity on 200', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }));
      const client = createClient(fetchMock);

      const result = await client.get(123);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(123);
      expect(result!.sendoutType).toBe('marketing');
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

  describe('setEmailAutomation', () => {
    it('PUTs full body in snake_case when automation exists', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }));
      const client = createClient(fetchMock);

      const result = await client.setEmailAutomation(123, {
        name: 'Welcome email',
        active: true,
        trigger: { type: 'TAG', id: 42 },
        sendoutType: 'transactional',
      });

      expect(fetchMock.mock.calls).toHaveLength(1);
      const [url, init] = fetchMock.mock.calls[0]!;

      expect(url).toBe('https://app.rule.io/api/v3/editor/automail/123');
      expect((init as RequestInit).method).toBe('PUT');

      const body = JSON.parse((init as RequestInit).body as string);

      expect(body).toEqual({
        name: 'Welcome email',
        active: true,
        trigger: { type: 'TAG', id: 42 },
        sendout_type: 2,
      });
      expect(result.id).toBe(123);
    });

    it('falls back to POST when automation does not exist (404)', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockErrorResponse({}, 404))
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }));
      const client = createClient(fetchMock);

      await client.setEmailAutomation(1, {
        name: 'New',
        active: true,
        trigger: { type: 'TAG', id: 5 },
        sendoutType: 'marketing',
      });

      expect(fetchMock.mock.calls).toHaveLength(2);
      expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe('PUT');
      expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe('POST');
      expect(fetchMock.mock.calls[1]![0]).toBe('https://app.rule.io/api/v3/editor/automail');
    });

    it('rethrows non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 500));
      const client = createClient(fetchMock);

      await expect(
        client.setEmailAutomation(1, { name: 'N', active: true, trigger: { type: 'TAG', id: 5 }, sendoutType: 'marketing' })
      ).rejects.toBeInstanceOf(RuleApiError);
    });
  });

  describe('updateEmailAutomation', () => {
    it('always does read-modify-write (GET + PUT)', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }))
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }));
      const client = createClient(fetchMock);

      await client.updateEmailAutomation(123, { name: 'Renamed' });

      expect(fetchMock.mock.calls).toHaveLength(2);
      expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe('GET');
      expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe('PUT');
    });

    it('merges partial input — name-only update preserves existing fields', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }))
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }));
      const client = createClient(fetchMock);

      await client.updateEmailAutomation(123, { name: 'Renamed' });

      const putBody = JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string);

      expect(putBody).toEqual({
        name: 'Renamed',
        active: true,
        trigger: { type: 'TAG', id: 42, name: 'signup' },
        sendout_type: 1,  // numeric integer for automations
      });
    });

    it('maps sendoutType string to integer wire value', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }))
        .mockResolvedValueOnce(createMockResponse({ data: WIRE_AUTOMATION }));
      const client = createClient(fetchMock);

      await client.updateEmailAutomation(123, { sendoutType: 'transactional' });

      const putBody = JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string);

      expect(putBody.sendout_type).toBe(2);
    });

    it('throws RuleApiError(404) when automation does not exist', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse({}, 404));
      const client = createClient(fetchMock);

      await expect(client.updateEmailAutomation(999, { name: 'X' })).rejects.toBeInstanceOf(RuleApiError);
    });

    it('throws RuleClientError when existing automation has no trigger and update omits it', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'No-trigger', active: true, sendout_type: { value: 1, key: 'marketing', description: '' } } })
      );
      const client = createClient(fetchMock);

      await expect(client.updateEmailAutomation(1, { name: 'Rename' })).rejects.toBeInstanceOf(RuleClientError);
    });

    it('throws RuleClientError when existing automation has no sendout_type and update omits it', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'No-sendout', active: true, trigger: { type: 'TAG', id: 5 } } })
      );
      const client = createClient(fetchMock);

      await expect(client.updateEmailAutomation(1, { name: 'Rename' })).rejects.toBeInstanceOf(RuleClientError);
    });

    it('throws RuleClientError when existing automation has no active state and update omits it', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: { id: 1, name: 'No-active', trigger: { type: 'TAG', id: 5 }, sendout_type: { value: 1, key: 'marketing', description: '' } } })
      );
      const client = createClient(fetchMock);

      await expect(client.updateEmailAutomation(1, { name: 'Rename' })).rejects.toBeInstanceOf(RuleClientError);
    });
  });

  describe('delete', () => {
    it('DELETEs the automation and returns void', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));
      const client = createClient(fetchMock);

      const result = await client.delete(123);

      expect(result).toBeUndefined();
      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/editor/automail/123');
    });
  });

  describe('listAutomations', () => {
    it('returns Automation[] and maps nested params to flat wire params', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ data: [WIRE_AUTOMATION] })
      );
      const client = createClient(fetchMock);

      const result = await client.listAutomations({
        filters: { active: true, messageType: 'email' },
        pagination: { page: 2, pageSize: 20 },
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.sendoutType).toBe('marketing');

      const url = fetchMock.mock.calls[0]![0] as string;

      expect(url).toContain('page=2');
      expect(url).toContain('per_page=20');
      expect(url).toContain('active=true');
      expect(url).toContain('message_type=1');
      expect(url).not.toContain('messageType');
      expect(url).not.toContain('pageSize');
    });

    it('omits query string when no params provided', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.listAutomations();

      expect(fetchMock.mock.calls[0]![0]).toBe('https://app.rule.io/api/v3/editor/automail');
    });

    it('passes query filter through', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      await client.listAutomations({ filters: { query: 'Welcome' } });

      expect(fetchMock.mock.calls[0]![0] as string).toContain('query=Welcome');
    });
  });

  describe('iterateAutomationsPages', () => {
    it('yields page arrays and stops when a page is smaller than pageSize', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_AUTOMATION, WIRE_AUTOMATION] }))
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_AUTOMATION] }));
      const client = createClient(fetchMock);

      const pages: number[] = [];

      for await (const page of client.iterateAutomationsPages({ pagination: { pageSize: 2 } })) {
        pages.push(page.length);
      }

      expect(pages).toEqual([2, 1]);
    });
  });

  describe('listAllAutomations', () => {
    it('collects all automations from all pages', async () => {
      const a2 = { ...WIRE_AUTOMATION, id: 456 };

      fetchMock
        .mockResolvedValueOnce(createMockResponse({ data: [WIRE_AUTOMATION, a2] }))
        .mockResolvedValueOnce(createMockResponse({ data: [] }));
      const client = createClient(fetchMock);

      const result = await client.listAllAutomations({ pagination: { pageSize: 2 } });

      expect(result.map((a) => a.id)).toEqual([123, 456]);
    });
  });
});
