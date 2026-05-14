import type { RcmlDocument } from '@rulecom/rcml';
import { RuleClient, RuleApiError } from '@rulecom/client';
import { createTestClient } from '../helpers/client.js';
import { testName } from '../helpers/test-data.js';

// Minimal valid RcmlDocument for template creation tests.
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
                        content: [{ type: 'text', text: 'Hello from integration test' }],
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

describe('TemplatesClient', () => {
  const client = createTestClient();
  const createdTemplateIds: number[] = [];
  const createdMessageIds: number[] = [];
  const createdCampaignIds: number[] = [];

  // Bootstrap: campaign → message → used as the dispatcher for template creation.
  let sharedMessageId: number;

  beforeAll(async () => {
    const campaign = await client.campaigns.create({
      name: testName('tmpl-setup-campaign'),
      message_type: 1,
    });
    const campaignId = campaign.data!.id!;
    createdCampaignIds.push(campaignId);

    const message = await client.messages.create({
      dispatcher: { id: campaignId, type: 'campaign' },
      type: 1,
      subject: testName('tmpl-setup-subject'),
    });
    sharedMessageId = message.data!.id!;
    createdMessageIds.push(sharedMessageId);
  });

  afterAll(async () => {
    await Promise.allSettled(createdTemplateIds.map((id) => client.templates.delete(id)));
    await Promise.allSettled(createdMessageIds.map((id) => client.messages.delete(id)));
    await Promise.allSettled(createdCampaignIds.map((id) => client.campaigns.delete(id)));
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a template and returns a numeric ID', async () => {
      const name = testName('tmpl-create');
      const result = await client.templates.create({
        message_id: sharedMessageId,
        name,
        message_type: 'email',
        template: minimalRcml,
      });
      createdTemplateIds.push(result.data!.id!);
      expect(typeof result.data!.id).toBe('number');
      expect(result.data!.id).toBeGreaterThan(0);
      expect(result.data!.name).toBe(name);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns the template for a known ID (round-trip)', async () => {
      const name = testName('tmpl-get');
      const created = await client.templates.create({
        message_id: sharedMessageId,
        name,
        message_type: 'email',
        template: minimalRcml,
      });
      const id = created.data!.id!;
      createdTemplateIds.push(id);

      const found = await client.templates.get(id);
      expect(found).not.toBeNull();
      expect(found!.data!.id).toBe(id);
      expect(found!.data!.name).toBe(name);
    });

    it('returns null for a non-existent ID', async () => {
      const result = await client.templates.get(999_999_999);
      expect(result).toBeNull();
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns an array of templates', async () => {
      const response = await client.templates.list();
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('persists an updated name', async () => {
      const name = testName('tmpl-update');
      const created = await client.templates.create({
        message_id: sharedMessageId,
        name,
        message_type: 'email',
        template: minimalRcml,
      });
      const id = created.data!.id!;
      createdTemplateIds.push(id);

      const newName = testName('tmpl-update-renamed');
      const updated = await client.templates.update(id, {
        name: newName,
        message_type: 'email',
        message_id: sharedMessageId,
        template: minimalRcml,
      });
      expect(updated.data!.name).toBe(newName);

      const fetched = await client.templates.get(id);
      expect(fetched!.data!.name).toBe(newName);
    });
  });

  // ── render ────────────────────────────────────────────────────────────────

  describe('render', () => {
    it('returns a non-empty string for an existing template', async () => {
      const name = testName('tmpl-render');
      const created = await client.templates.create({
        message_id: sharedMessageId,
        name,
        message_type: 'email',
        template: minimalRcml,
      });
      const id = created.data!.id!;
      createdTemplateIds.push(id);

      const html = await client.templates.render(id);
      expect(typeof html).toBe('string');
      expect((html as string).length).toBeGreaterThan(0);
    });

    it('returns null for a non-existent template', async () => {
      const result = await client.templates.render(999_999_999);
      expect(result).toBeNull();
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the template and subsequent get returns null', async () => {
      const name = testName('tmpl-delete');
      const created = await client.templates.create({
        message_id: sharedMessageId,
        name,
        message_type: 'email',
        template: minimalRcml,
      });
      const id = created.data!.id!;
      // Don't push to createdTemplateIds — deleting manually here.

      await client.templates.delete(id);
      const found = await client.templates.get(id);
      expect(found).toBeNull();
    });
  });

  // ── error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns null for a non-existent ID (get)', async () => {
      const result = await client.templates.get(999_999_999);
      expect(result).toBeNull();
    });

    it('throws RuleApiError with isAuthError() when API key is invalid', async () => {
      const bad = new RuleClient({ apiKey: 'invalid-key' });
      await expect(bad.templates.list()).rejects.toSatisfy(
        (e: unknown) => e instanceof RuleApiError && e.isAuthError()
      );
    });
  });
});
