import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';

describe('ExportsClient', () => {
  const client = createTestClient();

  // Use yesterday's date for both endpoints — the dispatchers endpoint enforces
  // a maximum 1-day range, so date_from and date_to must be the same calendar day.
  const yesterday = new Date();

  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  const dateFromStr = `${dateStr} 00:00:00`;
  const dateToStr = `${dateStr} 23:59:59`;

  // ── dispatchers ───────────────────────────────────────────────────────────

  describe('dispatchers', () => {
    it('returns a response with a data array (1-day range)', async () => {
      const response = await client.exports.dispatchers({ date_from: dateFromStr, date_to: dateToStr });

      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── statistics ────────────────────────────────────────────────────────────

  describe('statistics', () => {
    it('returns a response with a data array', async () => {
      const response = await client.exports.statistics({ date_from: dateFromStr, date_to: dateToStr });

      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('accepts decodeNames: false and returns raw API values', async () => {
      const response = await client.exports.statistics({
        date_from: dateFromStr,
        date_to: dateToStr,
        decodeNames: false,
      });

      expect(Array.isArray(response.data)).toBe(true);

      for (const record of response.data ?? []) {
        expect(typeof record.object.name).toBe('string');
      }
    });
  });

  // ── subscribers ───────────────────────────────────────────────────────────

  describe('subscribers', () => {
    it('returns a response with a data array', async () => {
      const response = await client.exports.subscribers({ date_from: dateFromStr, date_to: dateToStr });

      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });

      await expect(
        bad.exports.dispatchers({ date_from: dateFromStr, date_to: dateToStr })
      ).rejects.toSatisfy((e: unknown) => e instanceof RuleApiError && e.isAuthError());
    });
  });
});
