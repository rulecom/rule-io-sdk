import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName } from '../helpers/test-data.js';

describe('ApiKeysClient', () => {
  const client = createTestClient();
  const createdIds: number[] = [];

  afterAll(async () => {
    await Promise.allSettled(createdIds.map((id) => client.apiKeys.delete(id)));
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns an array of API keys', async () => {
      const response = await client.apiKeys.list();
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an API key and returns a numeric ID and key value', async () => {
      const name = testName('api-key-create');
      const result = await client.apiKeys.create({ name });
      createdIds.push(result.data!.id!);
      expect(typeof result.data!.id).toBe('number');
      expect(result.data!.id).toBeGreaterThan(0);
      expect(result.data!.name).toBe(name);
      expect(typeof result.data!.key).toBe('string');
      expect((result.data!.key as string).length).toBeGreaterThan(0);
    });

    it('includes the created key in the list', async () => {
      const name = testName('api-key-list');
      const created = await client.apiKeys.create({ name });
      createdIds.push(created.data!.id!);

      const list = await client.apiKeys.list();
      const found = list.data?.some((k) => k.id === created.data!.id);
      expect(found).toBe(true);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('persists an updated name', async () => {
      const name = testName('api-key-update');
      const created = await client.apiKeys.create({ name });
      const id = created.data!.id!;
      createdIds.push(id);

      const newName = testName('api-key-update-renamed');
      const updated = await client.apiKeys.update(id, { name: newName });
      expect(updated.data!.name).toBe(newName);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the API key', async () => {
      const name = testName('api-key-delete');
      const created = await client.apiKeys.create({ name });
      const id = created.data!.id!;
      // Don't push to createdIds — deleting manually here.

      const response = await client.apiKeys.delete(id);
      expect(response.success).toBe(true);
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });
      await expect(bad.apiKeys.list()).rejects.toSatisfy(
        (e: unknown) => e instanceof RuleApiError && e.isAuthError()
      );
    });
  });
});
