/**
 * TagsClient integration tests.
 *
 * The v2 /tags API has no POST (create) endpoint — tags are created implicitly
 * when assigned to a subscriber via addTags. Each test that needs a fresh tag
 * uses bootstrapTag(), which creates a transient subscriber, assigns a
 * [test-integration] tag to them (causing the API to create the tag), then
 * looks up the tag by name to obtain its ID.
 *
 * Cleanup:
 *   - afterAll deletes all tags created during the test run.
 *   - afterAll also deletes the transient subscribers used for bootstrapping.
 */

import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName, testEmail } from '../helpers/test-data.js';

describe('TagsClient', () => {
  const client = createTestClient();
  const createdTagIds: number[] = [];
  const createdEmails: string[] = [];

  async function bootstrapTag(label: string): Promise<{ tagId: number; tagName: string }> {
    const email = testEmail(`tags-${label}`);
    const tagName = testName(`tag-${label}`);

    await client.subscribers.create({ email, status: 'ACTIVE' });
    createdEmails.push(email);
    await client.subscribers.addTags(email, { tags: [tagName] }, 'email');
    const tag = await client.tags.getByName(tagName);

    if (!tag) throw new Error(`bootstrapTag: tag not found after creation: ${tagName}`);
    createdTagIds.push(tag.id);

    return { tagId: tag.id, tagName };
  }

  afterAll(async () => {
    await Promise.allSettled([
      ...createdTagIds.map((id) => client.tags.deleteById(id)),
      ...createdEmails.map((email) => client.subscribers.delete(email, 'email')),
    ]);
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns an array of tags', async () => {
      const response = await client.tags.list();

      expect(Array.isArray(response.tags)).toBe(true);
    });

    it('respects the limit option', async () => {
      const response = await client.tags.list({ limit: 5 });

      expect(Array.isArray(response.tags)).toBe(true);
      expect(response.tags!.length).toBeLessThanOrEqual(5);
    });

    it('includes a created tag in results', async () => {
      const { tagId } = await bootstrapTag('list');
      const response = await client.tags.list();
      const found = response.tags?.some((t) => t.id === tagId);

      expect(found).toBe(true);
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns the tag entity for a known ID', async () => {
      const { tagId, tagName } = await bootstrapTag('get-by-id');
      const tag = await client.tags.getById(tagId);

      expect(tag).not.toBeNull();
      expect(tag!.id).toBe(tagId);
      expect(tag!.name).toBe(tagName);
    });

    it('includes recipient_count when withCount is true', async () => {
      const { tagId } = await bootstrapTag('get-by-id-count');
      const tag = await client.tags.getById(tagId, { withCount: true });

      expect(tag).not.toBeNull();
      expect(typeof tag!.recipient_count).toBe('number');
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.tags.getById(999_999_999);

      expect(result).toBeNull();
    });
  });

  // ── getByName ───────────────────────────────────────────────────────────────

  describe('getByName', () => {
    it('returns the tag entity for a known name', async () => {
      const { tagId, tagName } = await bootstrapTag('get-by-name');
      const tag = await client.tags.getByName(tagName);

      expect(tag).not.toBeNull();
      expect(tag!.id).toBe(tagId);
      expect(tag!.name).toBe(tagName);
    });

    it('returns null for a non-existent name', async () => {
      const result = await client.tags.getByName('[test-integration] no-such-tag-999999');

      expect(result).toBeNull();
    });
  });

  // ── get (polymorphic dispatch) ───────────────────────────────────────────────

  describe('get (polymorphic)', () => {
    it('dispatches to getById when passed a number', async () => {
      const { tagId, tagName } = await bootstrapTag('get-poly-id');
      const tag = await client.tags.get(tagId);

      expect(tag).not.toBeNull();
      expect(tag!.name).toBe(tagName);
    });

    it('dispatches to getByName when passed a string', async () => {
      const { tagId, tagName } = await bootstrapTag('get-poly-name');
      const tag = await client.tags.get(tagName);

      expect(tag).not.toBeNull();
      expect(tag!.id).toBe(tagId);
    });
  });

  // ── updateById ──────────────────────────────────────────────────────────────

  describe('updateById', () => {
    it('persists the updated name', async () => {
      const { tagId } = await bootstrapTag('update-by-id');
      const newName = testName('tag-update-by-id-renamed');
      const updated = await client.tags.updateById(tagId, { name: newName });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(newName);

      const fetched = await client.tags.getById(tagId);

      expect(fetched!.name).toBe(newName);
      // Track the renamed tag under same ID so afterAll cleanup works.
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.tags.updateById(999_999_999, { name: 'ghost' });

      expect(result).toBeNull();
    });
  });

  // ── updateByName ─────────────────────────────────────────────────────────────

  describe('updateByName', () => {
    it('persists the updated name', async () => {
      const { tagName } = await bootstrapTag('update-by-name');
      const newName = testName('tag-update-by-name-renamed');
      const updated = await client.tags.updateByName(tagName, { name: newName });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(newName);

      const fetched = await client.tags.getByName(newName);

      expect(fetched!.name).toBe(newName);
    });
  });

  // ── update (polymorphic dispatch) ───────────────────────────────────────────

  describe('update (polymorphic)', () => {
    it('dispatches by ID when passed a number', async () => {
      const { tagId } = await bootstrapTag('update-poly-id');
      const newName = testName('tag-update-poly-id-renamed');
      const updated = await client.tags.update(tagId, { name: newName });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(newName);
    });

    it('dispatches by name when passed a string', async () => {
      const { tagName } = await bootstrapTag('update-poly-name');
      const newName = testName('tag-update-poly-name-renamed');
      const updated = await client.tags.update(tagName, { name: newName });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe(newName);
    });
  });

  // ── clear ───────────────────────────────────────────────────────────────────

  describe('clearById', () => {
    it('removes subscriber associations and keeps the tag', async () => {
      const { tagId } = await bootstrapTag('clear-by-id');
      // Tag was created with one subscriber associated. Clear that association.
      const clearResult = await client.tags.clearById(tagId);

      expect(clearResult).not.toBeNull();

      // Tag still exists after clearing.
      const tag = await client.tags.getById(tagId, { withCount: true });

      expect(tag).not.toBeNull();
      expect(tag!.recipient_count).toBe(0);
    });
  });

  describe('clearByName', () => {
    it('removes subscriber associations and keeps the tag', async () => {
      const { tagName } = await bootstrapTag('clear-by-name');
      const clearResult = await client.tags.clearByName(tagName);

      expect(clearResult).not.toBeNull();

      const tag = await client.tags.getByName(tagName);

      expect(tag).not.toBeNull();
    });
  });

  describe('clear (polymorphic)', () => {
    it('dispatches clearById when passed a number', async () => {
      const { tagId } = await bootstrapTag('clear-poly-id');
      const result = await client.tags.clear(tagId);

      expect(result).not.toBeNull();
    });

    it('dispatches clearByName when passed a string', async () => {
      const { tagName } = await bootstrapTag('clear-poly-name');
      const result = await client.tags.clear(tagName);

      expect(result).not.toBeNull();
    });
  });

  // ── deleteById / deleteByName ────────────────────────────────────────────────

  describe('deleteById', () => {
    it('deletes the tag and subsequent getById returns null', async () => {
      const { tagId } = await bootstrapTag('delete-by-id');
      // Remove from afterAll cleanup list since we delete it here.
      const idx = createdTagIds.indexOf(tagId);

      if (idx !== -1) createdTagIds.splice(idx, 1);

      await client.tags.deleteById(tagId);
      const result = await client.tags.getById(tagId);

      expect(result).toBeNull();
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.tags.deleteById(999_999_999);

      expect(result).toBeNull();
    });
  });

  describe('deleteByName', () => {
    it('deletes the tag and subsequent getByName returns null', async () => {
      const { tagId, tagName } = await bootstrapTag('delete-by-name');
      const idx = createdTagIds.indexOf(tagId);

      if (idx !== -1) createdTagIds.splice(idx, 1);

      await client.tags.deleteByName(tagName);
      const result = await client.tags.getByName(tagName);

      expect(result).toBeNull();
    });
  });

  describe('delete (polymorphic)', () => {
    it('dispatches deleteById when passed a number', async () => {
      const { tagId } = await bootstrapTag('delete-poly-id');
      const idx = createdTagIds.indexOf(tagId);

      if (idx !== -1) createdTagIds.splice(idx, 1);

      await client.tags.delete(tagId);
      expect(await client.tags.getById(tagId)).toBeNull();
    });

    it('dispatches deleteByName when passed a string', async () => {
      const { tagId, tagName } = await bootstrapTag('delete-poly-name');
      const idx = createdTagIds.indexOf(tagId);

      if (idx !== -1) createdTagIds.splice(idx, 1);

      await client.tags.delete(tagName);
      expect(await client.tags.getByName(tagName)).toBeNull();
    });
  });

  // ── error handling ───────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null for a non-existent ID (getById)', async () => {
      const result = await client.tags.getById(999_999_999);

      expect(result).toBeNull();
    });

    it('returns null for a non-existent name (getByName)', async () => {
      const result = await client.tags.getByName('[test-integration] no-such-tag-000');

      expect(result).toBeNull();
    });

    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });

      await expect(bad.tags.list()).rejects.toSatisfy(
        (e: unknown) => e instanceof RuleApiError && e.isAuthError()
      );
    });
  });
});
