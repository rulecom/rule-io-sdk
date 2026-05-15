import { RuleClient, RuleApiError, RuleClientError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testEmail } from '../helpers/test-data.js';

describe('SuppressionsClient', () => {
  const client = createTestClient();
  const createdEmails: string[] = [];

  beforeAll(async () => {
    // Create a subscriber to use in suppression tests.
    const email = testEmail('suppress-setup');

    await client.subscribers.create({ email, status: 'ACTIVE' });
    createdEmails.push(email);
  });

  afterAll(async () => {
    // Unsuppress and then delete all test subscribers.
    await Promise.allSettled(
      createdEmails.map((email) =>
        client.suppressions.delete({ subscribers: [{ email }] })
      )
    );
    await Promise.allSettled(
      createdEmails.map((email) => client.subscribers.delete(email, 'email'))
    );
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('accepts the request and returns success (async dispatcher)', async () => {
      const email = createdEmails[0];
      const response = await client.suppressions.create({
        subscribers: [{ email }],
      });

      expect(response.success).toBe(true);
    });

    it('accepts the request with message_types filter', async () => {
      const email = createdEmails[0];
      const response = await client.suppressions.create({
        subscribers: [{ email }],
        message_types: ['email'],
      });

      expect(response.success).toBe(true);
    });

    it('throws RuleClientError when subscribers array is empty', async () => {
      await expect(
        client.suppressions.create({ subscribers: [] })
      ).rejects.toThrow(RuleClientError);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('accepts the request and returns success (async dispatcher)', async () => {
      const email = createdEmails[0];
      const response = await client.suppressions.delete({
        subscribers: [{ email }],
      });

      expect(response.success).toBe(true);
    });

    it('throws RuleClientError when subscribers array is empty', async () => {
      await expect(
        client.suppressions.delete({ subscribers: [] })
      ).rejects.toThrow(RuleClientError);
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });

      await expect(
        bad.suppressions.create({ subscribers: [{ email: 'test@example.com' }] })
      ).rejects.toSatisfy((e: unknown) => e instanceof RuleApiError && e.isAuthError());
    });
  });
});
