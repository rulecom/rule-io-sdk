import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';

describe('RecipientsClient', () => {
  const client = createTestClient();

  // ── recipients.subscribers ────────────────────────────────────────────────

  describe('recipients.subscribers', () => {
    it('list returns an array', async () => {
      const response = await client.recipients.subscribers.list();

      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── recipients.tags ───────────────────────────────────────────────────────

  describe('recipients.tags', () => {
    it('list returns an array', async () => {
      const response = await client.recipients.tags.list();

      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── recipients.segments ───────────────────────────────────────────────────

  describe('recipients.segments', () => {
    it('list returns an array', async () => {
      const response = await client.recipients.segments.list();

      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });

      await expect(bad.recipients.tags.list()).rejects.toSatisfy(
        (e: unknown) => e instanceof RuleApiError && e.isAuthError()
      );
    });
  });
});
