import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName, testEmail } from '../helpers/test-data.js';

describe('AutomationsClient', () => {
  const client = createTestClient();
  const createdIds: number[] = [];

  // Bootstrap a real tag so trigger-based automations can reference it.
  let tagId: number;
  let bootstrapEmail: string;

  beforeAll(async () => {
    bootstrapEmail = testEmail('auto-setup');
    const tagName = testName('auto-trigger-tag');
    await client.subscribers.create({ email: bootstrapEmail, status: 'ACTIVE' });
    await client.subscribers.addTags(bootstrapEmail, { tags: [tagName] }, 'email');
    const tag = await client.tags.getByName(tagName);
    if (!tag) throw new Error(`beforeAll: trigger tag not found: ${tagName}`);
    tagId = tag.id;
  });

  afterAll(async () => {
    await Promise.allSettled([
      ...createdIds.map((id) => client.automations.delete(id)),
      client.tags.deleteById(tagId),
      client.subscribers.delete(bootstrapEmail, 'email'),
    ]);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an automation and returns a numeric ID', async () => {
      const name = testName('auto-create');
      const result = await client.automations.create({ name });
      createdIds.push(result.data!.id!);
      expect(typeof result.data!.id).toBe('number');
      expect(result.data!.id).toBeGreaterThan(0);
      expect(result.data!.name).toBe(name);
    });

    it('creates an automation with a TAG trigger and sendout_type', async () => {
      const name = testName('auto-create-trigger');
      const result = await client.automations.create({
        name,
        trigger: { type: 'TAG', id: tagId },
        sendout_type: 1,
      });
      createdIds.push(result.data!.id!);
      expect(result.data!.name).toBe(name);
      expect(result.data!.trigger?.type).toBe('TAG');
      expect(result.data!.trigger?.id).toBe(tagId);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the automation for a known ID (round-trip)', async () => {
      const name = testName('auto-get');
      const created = await client.automations.create({ name });
      const id = created.data!.id!;
      createdIds.push(id);

      const found = await client.automations.get(id);
      expect(found).not.toBeNull();
      expect(found!.data!.id).toBe(id);
      expect(found!.data!.name).toBe(name);
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.automations.get(999_999_999);
      expect(result).toBeNull();
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns an array of automations', async () => {
      const response = await client.automations.list();
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('includes the created automation in results', async () => {
      const name = testName('auto-list');
      const created = await client.automations.create({ name });
      const id = created.data!.id!;
      createdIds.push(id);

      const response = await client.automations.list();
      const found = response.data?.some((a) => a.id === id);
      expect(found).toBe(true);
    });

    it('respects the active filter', async () => {
      const response = await client.automations.list({ active: false });
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('persists an updated name (partial update)', async () => {
      const name = testName('auto-update');
      const created = await client.automations.create({
        name,
        trigger: { type: 'TAG', id: tagId },
        sendout_type: 1,
      });
      const id = created.data!.id!;
      createdIds.push(id);

      const newName = testName('auto-update-renamed');
      const updated = await client.automations.update(id, { name: newName });
      expect(updated.data!.name).toBe(newName);

      const fetched = await client.automations.get(id);
      expect(fetched!.data!.name).toBe(newName);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the automation and subsequent get returns null', async () => {
      const name = testName('auto-delete');
      const created = await client.automations.create({ name });
      const id = created.data!.id!;
      // Don't push to createdIds — deleting manually here.

      await client.automations.delete(id);
      const found = await client.automations.get(id);
      expect(found).toBeNull();
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null for a non-existent ID (get)', async () => {
      const result = await client.automations.get(999_999_999);
      expect(result).toBeNull();
    });

    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });
      await expect(bad.automations.list()).rejects.toSatisfy(
        (e: unknown) => e instanceof RuleApiError && e.isAuthError()
      );
    });
  });
});
