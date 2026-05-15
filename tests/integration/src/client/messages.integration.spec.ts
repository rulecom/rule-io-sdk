import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName } from '../helpers/test-data.js';

describe('MessagesClient', () => {
  const client = createTestClient();
  const createdMessageIds: number[] = [];
  const createdCampaignIds: number[] = [];

  // Bootstrap a campaign + message for tests that only need to read/update.
  let sharedCampaignId: number;
  let sharedMessageId: number;

  beforeAll(async () => {
    const campaignName = testName('msg-setup-campaign');
    const campaign = await client.campaigns.create({ name: campaignName, message_type: 1 });

    sharedCampaignId = campaign.data!.id!;
    createdCampaignIds.push(sharedCampaignId);

    const message = await client.messages.create({
      dispatcher: { id: sharedCampaignId, type: 'campaign' },
      type: 1,
      subject: testName('msg-setup-subject'),
    });

    sharedMessageId = message.data!.id!;
    createdMessageIds.push(sharedMessageId);
  });

  afterAll(async () => {
    // Delete messages first, then campaigns.
    await Promise.allSettled(createdMessageIds.map((id) => client.messages.delete(id)));
    await Promise.allSettled(createdCampaignIds.map((id) => client.campaigns.delete(id)));
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a message attached to a campaign and returns a numeric ID', async () => {
      // Each create test needs its own campaign since a campaign holds exactly one message.
      const campaignName = testName('msg-create-campaign');
      const campaign = await client.campaigns.create({ name: campaignName, message_type: 1 });
      const campaignId = campaign.data!.id!;

      createdCampaignIds.push(campaignId);

      const subject = testName('msg-create');
      const result = await client.messages.create({
        dispatcher: { id: campaignId, type: 'campaign' },
        type: 1,
        subject,
      });

      createdMessageIds.push(result.data!.id!);
      expect(typeof result.data!.id).toBe('number');
      expect(result.data!.id).toBeGreaterThan(0);
      expect(result.data!.subject).toBe(subject);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the message for a known ID (round-trip)', async () => {
      const found = await client.messages.get(sharedMessageId);

      expect(found).not.toBeNull();
      expect(found!.data!.id).toBe(sharedMessageId);
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.messages.get(999_999_999);

      expect(result).toBeNull();
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns messages for the campaign dispatcher', async () => {
      const response = await client.messages.list({
        id: sharedCampaignId,
        dispatcher_type: 'campaign',
      });

      expect(Array.isArray(response.data)).toBe(true);
      const found = response.data?.some((m) => m.id === sharedMessageId);

      expect(found).toBe(true);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('persists an updated subject', async () => {
      const newSubject = testName('msg-update-new-subject');
      const updated = await client.messages.update(sharedMessageId, { subject: newSubject });

      expect(updated.data!.subject).toBe(newSubject);

      const fetched = await client.messages.get(sharedMessageId);

      expect(fetched!.data!.subject).toBe(newSubject);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the message and subsequent get returns null', async () => {
      // Need a fresh campaign since each campaign holds one message.
      const campaignName = testName('msg-delete-campaign');
      const campaign = await client.campaigns.create({ name: campaignName, message_type: 1 });
      const campaignId = campaign.data!.id!;

      createdCampaignIds.push(campaignId);

      const message = await client.messages.create({
        dispatcher: { id: campaignId, type: 'campaign' },
        type: 1,
        subject: testName('msg-delete'),
      });
      const id = message.data!.id!;
      // Don't push to createdMessageIds — deleting manually here.

      await client.messages.delete(id);
      const found = await client.messages.get(id);

      expect(found).toBeNull();
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null for a non-existent ID (get)', async () => {
      const result = await client.messages.get(999_999_999);

      expect(result).toBeNull();
    });

    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });

      await expect(
        bad.messages.list({ id: 1, dispatcher_type: 'campaign' })
      ).rejects.toSatisfy((e: unknown) => e instanceof RuleApiError && e.isAuthError());
    });
  });
});
