import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName } from '../helpers/test-data.js';

describe('CampaignsClient', () => {
  const client = createTestClient();
  const createdIds: number[] = [];

  afterAll(async () => {
    await Promise.allSettled(createdIds.map((id) => client.campaigns.delete(id)));
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a campaign and returns a numeric ID', async () => {
      const name = testName('camp-create');
      const result = await client.campaigns.create({ name, message_type: 1 });
      createdIds.push(result.data!.id!);
      expect(typeof result.data!.id).toBe('number');
      expect(result.data!.id).toBeGreaterThan(0);
      expect(result.data!.name).toBe(name);
    });

    it('creates a campaign with sendout_type', async () => {
      const name = testName('camp-create-sendout');
      const result = await client.campaigns.create({ name, message_type: 1, sendout_type: 1 });
      createdIds.push(result.data!.id!);
      expect(result.data!.name).toBe(name);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the campaign for a known ID (round-trip)', async () => {
      const name = testName('camp-get');
      const created = await client.campaigns.create({ name, message_type: 1 });
      const id = created.data!.id!;
      createdIds.push(id);

      const found = await client.campaigns.get(id);
      expect(found).not.toBeNull();
      expect(found!.data!.id).toBe(id);
      expect(found!.data!.name).toBe(name);
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.campaigns.get(999_999_999);
      expect(result).toBeNull();
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns an array of campaigns', async () => {
      const response = await client.campaigns.list();
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('includes the created campaign in results', async () => {
      const name = testName('camp-list');
      const created = await client.campaigns.create({ name, message_type: 1 });
      const id = created.data!.id!;
      createdIds.push(id);

      // Fetch a large first page to maximise the chance of seeing the new campaign.
      const response = await client.campaigns.list({ per_page: 100 });
      const found = response.data?.some((c) => c.id === id);
      expect(found).toBe(true);
    });

    it('respects the message_type filter', async () => {
      const response = await client.campaigns.list({ message_type: 1 });
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('persists an updated name', async () => {
      const name = testName('camp-update');
      const created = await client.campaigns.create({ name, message_type: 1 });
      const id = created.data!.id!;
      createdIds.push(id);

      const newName = testName('camp-update-renamed');
      // Update requires all of: name, sendout_type, tags, segments, subscribers
      const updated = await client.campaigns.update(id, {
        name: newName,
        sendout_type: 1,
        tags: [],
        segments: [],
        subscribers: [],
      });
      expect(updated.data!.name).toBe(newName);

      const fetched = await client.campaigns.get(id);
      expect(fetched!.data!.name).toBe(newName);
    });
  });

  // ── copy ──────────────────────────────────────────────────────────────────

  describe('copy', () => {
    it('creates a new campaign with a different ID', async () => {
      const name = testName('camp-copy');
      const original = await client.campaigns.create({ name, message_type: 1 });
      const originalId = original.data!.id!;
      createdIds.push(originalId);

      const copy = await client.campaigns.copy(originalId);
      const copyId = copy.data!.id!;
      createdIds.push(copyId);

      expect(typeof copyId).toBe('number');
      expect(copyId).not.toBe(originalId);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the campaign and subsequent get returns null', async () => {
      const name = testName('camp-delete');
      const created = await client.campaigns.create({ name, message_type: 1 });
      const id = created.data!.id!;
      // Don't push to createdIds — deleting manually here.

      await client.campaigns.delete(id);
      const found = await client.campaigns.get(id);
      expect(found).toBeNull();
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null for a non-existent ID (get)', async () => {
      const result = await client.campaigns.get(999_999_999);
      expect(result).toBeNull();
    });

    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });
      await expect(bad.campaigns.list()).rejects.toSatisfy(
        (e: unknown) => e instanceof RuleApiError && e.isAuthError()
      );
    });
  });
});
