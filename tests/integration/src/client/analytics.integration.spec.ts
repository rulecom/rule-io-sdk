import { RuleClient, RuleApiError, RuleClientError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';

describe('AnalyticsClient', () => {
  const client = createTestClient();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
  const dateTo = today.toISOString().split('T')[0];

  // ── get (aggregate — no object_type) ─────────────────────────────────────
  // Note: The Rule.io API requires object_type, object_ids, and metrics even
  // for aggregate queries on this account, so we always use the full query form.

  describe('get (aggregate totals)', () => {
    it('returns a response with a data array for a campaign query', async () => {
      // Query with an ID that likely doesn't exist — API returns empty data, not an error.
      const response = await client.analytics.get({
        date_from: dateFrom,
        date_to: dateTo,
        object_type: 'CAMPAIGN',
        object_ids: ['999999999'],
        metrics: ['sent', 'open_uniq'],
      });
      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── get (scoped — with object_type) ──────────────────────────────────────

  describe('get (scoped query)', () => {
    it('returns data when queried with object_type, object_ids, and metrics', async () => {
      // Use a campaign that is very unlikely to exist — the API should return an
      // empty data array rather than an error for non-existent IDs.
      const response = await client.analytics.get({
        date_from: dateFrom,
        date_to: dateTo,
        object_type: 'CAMPAIGN',
        object_ids: ['999999999'],
        metrics: ['sent'],
      });
      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── client-side validation ────────────────────────────────────────────────

  describe('validation', () => {
    it('throws RuleClientError when object_ids is provided without object_type', async () => {
      await expect(
        client.analytics.get({
          date_from: dateFrom,
          date_to: dateTo,
          // @ts-expect-error intentional bad input
          object_ids: ['1'],
        })
      ).rejects.toThrow(RuleClientError);
    });

    it('throws RuleClientError when object_type is set but object_ids is empty', async () => {
      await expect(
        client.analytics.get({
          date_from: dateFrom,
          date_to: dateTo,
          object_type: 'CAMPAIGN',
          object_ids: [],
          metrics: ['sent'],
        })
      ).rejects.toThrow(RuleClientError);
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });
      await expect(
        bad.analytics.get({ date_from: dateFrom, date_to: dateTo })
      ).rejects.toSatisfy((e: unknown) => e instanceof RuleApiError && e.isAuthError());
    });
  });
});
