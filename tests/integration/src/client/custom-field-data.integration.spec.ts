// CustomFieldData is deprecated by Rule.io but kept for legacy support.
import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testEmail } from '../helpers/test-data.js';

describe('CustomFieldDataClient', () => {
  const client = createTestClient();
  const createdEmails: string[] = [];

  // Bootstrap a subscriber to attach custom field data to.
  let subscriberId: number;
  const groupName = 'IntegrationTestGroup';

  beforeAll(async () => {
    const email = testEmail('cfd-setup');
    const created = await client.subscribers.create({ email, status: 'ACTIVE' });
    subscriberId = created.data.id;
    createdEmails.push(email);
  });

  afterAll(async () => {
    // Best-effort: delete the test group data, then the subscriber.
    await Promise.allSettled([
      client.customFieldData.deleteByGroup(subscriberId, groupName),
    ]);
    await Promise.allSettled(
      createdEmails.map((email) => client.subscribers.delete(email, 'email'))
    );
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates custom field data for a subscriber and returns success', async () => {
      const response = await client.customFieldData.create(subscriberId, {
        groups: [
          {
            group: groupName,
            create_if_not_exists: true,
            values: [
              { field: 'OrderRef', create_if_not_exists: true, value: 'ORD-TEST-001' },
            ],
          },
        ],
      });
      expect(response.success).toBe(true);
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns an array of custom field data records for a subscriber', async () => {
      const response = await client.customFieldData.list(subscriberId);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── listByGroup ───────────────────────────────────────────────────────────

  describe('listByGroup', () => {
    it('returns records filtered by group name', async () => {
      const response = await client.customFieldData.listByGroup(subscriberId, groupName);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates custom field data and returns success', async () => {
      const response = await client.customFieldData.update(subscriberId, {
        identifier: { group: groupName, field: 'OrderRef', value: 'ORD-TEST-001' },
        values: [{ field: 'OrderRef', value: 'ORD-TEST-001-UPDATED' }],
      });
      expect(response.success).toBe(true);
    });
  });

  // ── deleteByGroup ─────────────────────────────────────────────────────────

  describe('deleteByGroup', () => {
    it('deletes all custom field data in a group and returns success', async () => {
      // Create a separate group to delete.
      const deleteGroup = 'IntegrationTestDeleteGroup';
      await client.customFieldData.create(subscriberId, {
        groups: [
          {
            group: deleteGroup,
            create_if_not_exists: true,
            values: [{ field: 'TempField', create_if_not_exists: true, value: 'temp' }],
          },
        ],
      });

      // deleteByGroup returns the raw API response (no `success` field).
      const response = await client.customFieldData.deleteByGroup(subscriberId, deleteGroup);
      expect(response).toBeDefined();
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });
      await expect(bad.customFieldData.list(1)).rejects.toSatisfy(
        (e: unknown) => e instanceof RuleApiError && e.isAuthError()
      );
    });
  });
});
