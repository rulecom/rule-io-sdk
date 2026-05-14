import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName } from '../helpers/test-data.js';

describe('BrandStylesClient', () => {
  const client = createTestClient();
  const createdIds: number[] = [];

  afterAll(async () => {
    // Delete may return 403 if the brand style is the last one on the account,
    // but since we only delete ones we created (the account already has others),
    // Promise.allSettled absorbs any unexpected 403.
    await Promise.allSettled(createdIds.map((id) => client.brandStyles.delete(id)));
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns an array of brand style items', async () => {
      const response = await client.brandStyles.list();
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── createManually ────────────────────────────────────────────────────────

  describe('createManually', () => {
    it('creates a brand style and returns a numeric ID', async () => {
      const name = testName('brand-create');
      const result = await client.brandStyles.createManually({
        name,
        colours: [{ type: 'brand', hex: '#AABBCC', brightness: 50 }],
      });
      createdIds.push(result.data!.id);
      expect(typeof result.data!.id).toBe('number');
      expect(result.data!.id).toBeGreaterThan(0);
      expect(result.data!.name).toBe(name);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the brand style for a known ID (round-trip)', async () => {
      const name = testName('brand-get');
      const created = await client.brandStyles.createManually({ name });
      const id = created.data!.id;
      createdIds.push(id);

      const found = await client.brandStyles.get(id);
      expect(found).not.toBeNull();
      expect(found!.data!.id).toBe(id);
      expect(found!.data!.name).toBe(name);
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.brandStyles.get(999_999_999);
      expect(result).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('persists an updated name via PATCH', async () => {
      const name = testName('brand-update');
      const created = await client.brandStyles.createManually({ name });
      const id = created.data!.id;
      createdIds.push(id);

      const newName = testName('brand-update-renamed');
      const updated = await client.brandStyles.update(id, { name: newName });
      expect(updated.data!.name).toBe(newName);

      const fetched = await client.brandStyles.get(id);
      expect(fetched!.data!.name).toBe(newName);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the brand style and subsequent get returns null', async () => {
      const name = testName('brand-delete');
      const created = await client.brandStyles.createManually({ name });
      const id = created.data!.id;
      // Don't push to createdIds — deleting manually here.

      const response = await client.brandStyles.delete(id);
      expect(response.success).toBe(true);

      const found = await client.brandStyles.get(id);
      expect(found).toBeNull();
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null for a non-existent ID (get)', async () => {
      const result = await client.brandStyles.get(999_999_999);
      expect(result).toBeNull();
    });

    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });
      await expect(bad.brandStyles.list()).rejects.toSatisfy(
        (e: unknown) => e instanceof RuleApiError && e.isAuthError()
      );
    });
  });
});
