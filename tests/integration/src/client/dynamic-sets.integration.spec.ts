import type { RcmlDocument } from '@rulecom/rcml';
import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName } from '../helpers/test-data.js';

const minimalRcml: RcmlDocument = {
  tagName: 'rcml',
  children: [
    { tagName: 'rc-head', children: [] },
    {
      tagName: 'rc-body',
      children: [
        {
          tagName: 'rc-section',
          children: [
            {
              tagName: 'rc-column',
              children: [
                {
                  tagName: 'rc-text',
                  content: {
                    type: 'doc',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Dynamic set test' }],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// Creates an independent campaign → message → template → dynamic-set stack.
// The API allows only one dynamic set per message, so each test that needs to
// CREATE a fresh dynamic set must bootstrap its own message.
async function bootstrapDynamicSet(
  client: ReturnType<typeof createTestClient>,
  label: string
): Promise<{
  dsId: number;
  messageId: number;
  templateId: number;
  campaignId: number;
}> {
  const campaign = await client.campaigns.create({
    name: testName(`ds-${label}-campaign`),
    message_type: 1,
  });
  const campaignId = campaign.data!.id!;

  const message = await client.messages.create({
    dispatcher: { id: campaignId, type: 'campaign' },
    type: 1,
    subject: testName(`ds-${label}-subject`),
  });
  const messageId = message.data!.id!;

  const template = await client.templates.create({
    message_id: messageId,
    name: testName(`ds-${label}-template`),
    message_type: 'email',
    template: minimalRcml,
  });
  const templateId = template.data!.id!;

  const ds = await client.dynamicSets.create({ message_id: messageId, template_id: templateId });
  const dsId = ds.data!.id!;

  return { dsId, messageId, templateId, campaignId };
}

describe('DynamicSetsClient', () => {
  const client = createTestClient();
  const createdDsIds: number[] = [];
  const createdTemplateIds: number[] = [];
  const createdMessageIds: number[] = [];
  const createdCampaignIds: number[] = [];

  // Shared dynamic set for get/list/update tests.
  let sharedDsId: number;
  let sharedMessageId: number;
  let sharedTemplateId: number;

  beforeAll(async () => {
    const { dsId, messageId, templateId, campaignId } =
      await bootstrapDynamicSet(client, 'shared');

    sharedDsId = dsId;
    sharedMessageId = messageId;
    sharedTemplateId = templateId;
    createdDsIds.push(dsId);
    createdTemplateIds.push(templateId);
    createdMessageIds.push(messageId);
    createdCampaignIds.push(campaignId);
  });

  afterAll(async () => {
    await Promise.allSettled(createdDsIds.map((id) => client.dynamicSets.delete(id)));
    await Promise.allSettled(createdTemplateIds.map((id) => client.templates.delete(id)));
    await Promise.allSettled(createdMessageIds.map((id) => client.messages.delete(id)));
    await Promise.allSettled(createdCampaignIds.map((id) => client.campaigns.delete(id)));
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a dynamic set and returns a numeric ID', async () => {
      const { dsId, messageId, templateId, campaignId } =
        await bootstrapDynamicSet(client, 'create');

      createdDsIds.push(dsId);
      createdTemplateIds.push(templateId);
      createdMessageIds.push(messageId);
      createdCampaignIds.push(campaignId);

      expect(typeof dsId).toBe('number');
      expect(dsId).toBeGreaterThan(0);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the dynamic set for a known ID (round-trip)', async () => {
      const found = await client.dynamicSets.get(sharedDsId);

      expect(found).not.toBeNull();
      expect(found!.data!.id).toBe(sharedDsId);
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.dynamicSets.get(999_999_999);

      expect(result).toBeNull();
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns dynamic sets for a message', async () => {
      const response = await client.dynamicSets.list({ message_id: sharedMessageId });

      expect(Array.isArray(response.data)).toBe(true);
      const found = response.data?.some((ds) => ds.id === sharedDsId);

      expect(found).toBe(true);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('persists an update to the dynamic set', async () => {
      const updated = await client.dynamicSets.update(sharedDsId, {
        message_id: sharedMessageId,
        template_id: sharedTemplateId,
        active: false,
        name: testName('ds-update-name'),
        subject: testName('ds-update-subject'),
        pre_header: '',
        utm_campaign: null,
        utm_term: null,
        sender: { email: null, phone_number: null, name: null },
        trigger: null,
      });

      expect(updated.data!.id).toBe(sharedDsId);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the dynamic set and subsequent get returns null', async () => {
      const { dsId, messageId, templateId, campaignId } =
        await bootstrapDynamicSet(client, 'delete');

      // Don't push dsId to createdDsIds — deleting manually here.
      createdTemplateIds.push(templateId);
      createdMessageIds.push(messageId);
      createdCampaignIds.push(campaignId);

      await client.dynamicSets.delete(dsId);
      const found = await client.dynamicSets.get(dsId);

      expect(found).toBeNull();
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null for a non-existent ID (get)', async () => {
      const result = await client.dynamicSets.get(999_999_999);

      expect(result).toBeNull();
    });

    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });

      await expect(
        bad.dynamicSets.list({ message_id: 1 })
      ).rejects.toSatisfy((e: unknown) => e instanceof RuleApiError && e.isAuthError());
    });
  });
});
