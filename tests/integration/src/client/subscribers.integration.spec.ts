import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName, testEmail } from '../helpers/test-data.js';

describe('SubscribersClient', () => {
  const client = createTestClient();
  const createdEmails: string[] = [];
  const createdTagIds: number[] = [];

  afterAll(async () => {
    await Promise.allSettled([
      ...createdEmails.map((email) => client.subscribers.delete(email, 'email')),
      ...createdTagIds.map((id) => client.tags.deleteById(id)),
    ]);
  });

  async function bootstrapTag(label: string): Promise<{ tagId: number; tagName: string }> {
    const setupEmail = testEmail(`sub-setup-${label}`);
    const tagName = testName(`sub-tag-${label}`);

    await client.subscribers.create({ email: setupEmail, status: 'ACTIVE' });
    createdEmails.push(setupEmail);
    await client.subscribers.addTags(setupEmail, { tags: [tagName] }, 'email');
    const tag = await client.tags.getByName(tagName);

    if (!tag) throw new Error(`bootstrapTag: tag not found after creation: ${tagName}`);
    createdTagIds.push(tag.id);

    return { tagId: tag.id, tagName };
  }

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a subscriber with an email address', async () => {
      const email = testEmail('create-email');

      createdEmails.push(email);
      const result = await client.subscribers.create({ email, status: 'ACTIVE' });

      expect(result.data).toBeDefined();
      expect(typeof result.data.id).toBe('number');
      expect(result.data.email).toBe(email);
    });

    it('creates a subscriber and returns a numeric ID', async () => {
      const email = testEmail('create-second');

      createdEmails.push(email);
      const result = await client.subscribers.create({ email, status: 'ACTIVE' });

      expect(typeof result.data.id).toBe('number');
      expect(result.data.id).toBeGreaterThan(0);
    });
  });

  // ── getByEmail / getById ─────────────────────────────────────────────────────

  describe('getByEmail', () => {
    it('returns the subscriber for a known email (round-trip)', async () => {
      const email = testEmail('get-by-email');

      createdEmails.push(email);
      const created = await client.subscribers.create({ email, status: 'ACTIVE' });
      const found = await client.subscribers.getByEmail(email);

      expect(found).not.toBeNull();
      expect(found!.subscriber.id).toBe(created.data.id);
      expect(found!.subscriber.email).toBe(email);
    });

    it('returns null for a non-existent email', async () => {
      const result = await client.subscribers.getByEmail('no-such-subscriber-99999@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns the subscriber for a known ID (round-trip)', async () => {
      const email = testEmail('get-by-id');

      createdEmails.push(email);
      const created = await client.subscribers.create({ email, status: 'ACTIVE' });
      const found = await client.subscribers.getById(created.data.id);

      expect(found).not.toBeNull();
      expect(found!.subscriber.id).toBe(created.data.id);
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.subscribers.getById(999_999_999);

      expect(result).toBeNull();
    });
  });

  // ── addTags ─────────────────────────────────────────────────────────────────

  describe('addTags (identified by email)', () => {
    it('adds a tag to the subscriber and the tag appears in getTagNames', async () => {
      const email = testEmail('add-tags-email');

      createdEmails.push(email);
      await client.subscribers.create({ email, status: 'ACTIVE' });
      const tagName = testName('add-tags-email-tag');
      const response = await client.subscribers.addTags(email, { tags: [tagName] }, 'email');

      expect(response.success).toBe(true);

      const names = await client.subscribers.getTagNames(email);

      expect(names).toContain(tagName);

      // Clean up the tag
      const tag = await client.tags.getByName(tagName);

      if (tag) createdTagIds.push(tag.id);
    });
  });

  describe('addTags (identified by subscriber ID)', () => {
    it('adds a tag using the numeric subscriber ID as the selector', async () => {
      const email = testEmail('add-tags-id');

      createdEmails.push(email);
      const created = await client.subscribers.create({ email, status: 'ACTIVE' });
      const subscriberId = created.data.id;

      const tagName = testName('add-tags-id-tag');
      const response = await client.subscribers.addTags(
        subscriberId,
        { tags: [tagName] },
        'id'
      );

      expect(response.success).toBe(true);

      const names = await client.subscribers.getTagNames(email);

      expect(names).toContain(tagName);

      const tag = await client.tags.getByName(tagName);

      if (tag) createdTagIds.push(tag.id);
    });
  });

  // ── removeTag ───────────────────────────────────────────────────────────────

  describe('removeTag (identified by email)', () => {
    it('removes a tag and it no longer appears in getTagNames', async () => {
      const email = testEmail('remove-tag-email');

      createdEmails.push(email);
      await client.subscribers.create({ email, status: 'ACTIVE' });
      const tagName = testName('remove-tag-email-tag');

      await client.subscribers.addTags(email, { tags: [tagName] }, 'email');

      const tag = await client.tags.getByName(tagName);

      if (tag) createdTagIds.push(tag.id);

      const response = await client.subscribers.removeTag(email, tagName, 'email');

      expect(response.success).toBe(true);

      const names = await client.subscribers.getTagNames(email);

      expect(names).not.toContain(tagName);
    });
  });

  describe('removeTag (identified by subscriber ID)', () => {
    it('removes a tag from a subscriber using the numeric subscriber ID', async () => {
      const email = testEmail('remove-tag-id');

      createdEmails.push(email);
      const created = await client.subscribers.create({ email, status: 'ACTIVE' });
      const subscriberId = created.data.id;

      const tagName = testName('remove-tag-id-tag');

      await client.subscribers.addTags(subscriberId, { tags: [tagName] }, 'id');

      const tag = await client.tags.getByName(tagName);

      if (tag) createdTagIds.push(tag.id);

      const response = await client.subscribers.removeTag(subscriberId, tagName, 'id');

      expect(response.success).toBe(true);

      const names = await client.subscribers.getTagNames(email);

      expect(names).not.toContain(tagName);
    });
  });

  // ── bulk operations (async dispatchers) ─────────────────────────────────────

  describe('bulkAddTags', () => {
    it('accepts the request and returns success (async dispatcher)', async () => {
      const email = testEmail('bulk-add-tags');

      createdEmails.push(email);
      await client.subscribers.create({ email, status: 'ACTIVE' });
      const tagName = testName('bulk-add-tag');
      const tag = await client.tags.getByName(tagName);

      if (tag) createdTagIds.push(tag.id);

      const response = await client.subscribers.bulkAddTags({
        subscribers: [{ email }],
        tags: [tagName],
      });

      expect(response.success).toBe(true);
    });
  });

  describe('bulkRemoveTags', () => {
    it('accepts the request and returns success (async dispatcher)', async () => {
      const email = testEmail('bulk-rm-tags');

      createdEmails.push(email);
      await client.subscribers.create({ email, status: 'ACTIVE' });
      const tagName = testName('bulk-rm-tag');

      await client.subscribers.addTags(email, { tags: [tagName] }, 'email');

      const tag = await client.tags.getByName(tagName);

      if (tag) createdTagIds.push(tag.id);

      const response = await client.subscribers.bulkRemoveTags({
        subscribers: [{ email }],
        tags: [tagName],
      });

      expect(response.success).toBe(true);
    });
  });

  // ── block / unblock ─────────────────────────────────────────────────────────

  describe('block / unblock', () => {
    it('blocks and then unblocks a subscriber (async dispatchers)', async () => {
      const email = testEmail('block-unblock');

      createdEmails.push(email);
      await client.subscribers.create({ email, status: 'ACTIVE' });

      const blockRes = await client.subscribers.block([{ email }]);

      expect(blockRes.success).toBe(true);

      const unblockRes = await client.subscribers.unblock([{ email }]);

      expect(unblockRes.success).toBe(true);
    });
  });

  // ── getTagNames ──────────────────────────────────────────────────────────────

  describe('getTagNames', () => {
    it('returns an array of tag name strings', async () => {
      const email = testEmail('get-tag-names');

      createdEmails.push(email);
      await client.subscribers.create({ email, status: 'ACTIVE' });
      const tagName = testName('get-tag-names-tag');

      await client.subscribers.addTags(email, { tags: [tagName] }, 'email');

      const tag = await client.tags.getByName(tagName);

      if (tag) createdTagIds.push(tag.id);

      const names = await client.subscribers.getTagNames(email);

      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain(tagName);
    });

    it('returns an empty array for a non-existent subscriber', async () => {
      const names = await client.subscribers.getTagNames('no-such-subscriber@example.com');

      expect(names).toEqual([]);
    });
  });

  // ── listSubscribersByTagIds ──────────────────────────────────────────────────

  describe('listSubscribersByTagIds', () => {
    it('returns subscribers that have all the specified tag IDs', async () => {
      const { tagId } = await bootstrapTag('list-by-tag-ids');
      const result = await client.subscribers.listSubscribersByTagIds({ tag_ids: [tagId] });

      expect(typeof result.matched).toBe('number');
      expect(typeof result.scanned).toBe('number');
      expect(Array.isArray(result.subscribers)).toBe(true);
      expect(result.matched).toBeGreaterThanOrEqual(1);
    });

    it('throws RuleClientError when tag_ids is empty', async () => {
      await expect(
        client.subscribers.listSubscribersByTagIds({ tag_ids: [] })
      ).rejects.toThrow('tag_ids must not be empty');
    });
  });

  // ── getFields ───────────────────────────────────────────────────────────────

  describe('getFields', () => {
    it('returns an empty object for a non-existent subscriber', async () => {
      const fields = await client.subscribers.getFields('no-such-subscriber@example.com');

      expect(fields).toEqual({});
    });

    it('returns an object (possibly empty) for an existing subscriber', async () => {
      const email = testEmail('get-fields');

      createdEmails.push(email);
      await client.subscribers.create({ email, status: 'ACTIVE' });
      const fields = await client.subscribers.getFields(email);

      expect(typeof fields).toBe('object');
    });
  });

  // ── sync ─────────────────────────────────────────────────────────────────────

  describe('sync', () => {
    it('creates a subscriber and assigns tags in a single call', async () => {
      const email = testEmail('sync');

      createdEmails.push(email);
      const tagName = testName('sync-tag');

      const response = await client.subscribers.sync(
        { email, tags: [tagName] },
        'TestGroup'
      );

      expect(response.success).toBe(true);

      const names = await client.subscribers.getTagNames(email);

      expect(names).toContain(tagName);

      const tag = await client.tags.getByName(tagName);

      if (tag) createdTagIds.push(tag.id);
    });

    it('throws RuleClientError when fieldGroupPrefix is empty', async () => {
      const email = testEmail('sync-bad-prefix');

      await expect(
        client.subscribers.sync({ email }, '')
      ).rejects.toThrow('fieldGroupPrefix must not be empty');
    });

    it('throws RuleClientError when fieldGroupPrefix contains a dot', async () => {
      const email = testEmail('sync-dot-prefix');

      await expect(
        client.subscribers.sync({ email }, 'Bad.Prefix')
      ).rejects.toThrow('fieldGroupPrefix must not contain dots');
    });
  });

  // ── delete ───────────────────────────────────────────────────────────────────

  describe('delete (identified by email)', () => {
    it('deletes the subscriber and subsequent getByEmail returns null', async () => {
      const email = testEmail('delete-by-email');

      await client.subscribers.create({ email, status: 'ACTIVE' });
      // Don't push to createdEmails — we delete manually here.

      const response = await client.subscribers.delete(email, 'email');

      expect(response.success).toBe(true);

      const found = await client.subscribers.getByEmail(email);

      expect(found).toBeNull();
    });
  });

  describe('delete (identified by subscriber ID)', () => {
    it('deletes the subscriber by numeric ID', async () => {
      const email = testEmail('delete-by-id');
      const created = await client.subscribers.create({ email, status: 'ACTIVE' });
      const subscriberId = created.data.id;

      const response = await client.subscribers.delete(subscriberId, 'id');

      expect(response.success).toBe(true);

      const found = await client.subscribers.getByEmail(email);

      expect(found).toBeNull();
    });
  });

  // ── error handling ────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null from getByEmail for a non-existent address', async () => {
      const result = await client.subscribers.getByEmail('no-such-subscriber-99999@example.com');

      expect(result).toBeNull();
    });

    it('returns null from getById for a non-existent ID', async () => {
      const result = await client.subscribers.getById(999_999_999);

      expect(result).toBeNull();
    });

    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });

      await expect(
        bad.subscribers.create({ email: 'test@example.com', status: 'ACTIVE' })
      ).rejects.toSatisfy((e: unknown) => e instanceof RuleApiError && e.isAuthError());
    });
  });
});
