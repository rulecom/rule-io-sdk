/**
 * Integration tests against the live Rule.io API.
 *
 * These tests use a real API key and hit the actual Rule.io endpoints.
 * They verify the SDK methods produce correct requests and parse real responses.
 *
 * **Requires both** an API key and an explicit opt-in flag to run:
 *
 *   RULE_API_KEY=<key> RUN_INTEGRATION=1 npm run test -- tests/integration.test.ts
 *
 * **Optional env vars:**
 *   - `RULE_FROM_EMAIL` — Sender email for message/automation tests (default: `test@example.com`)
 *   - `RULE_FROM_NAME`  — Sender name for message/automation tests (default: `SDK Test`)
 *   - `DEBUG_INTEGRATION=1` — Enable debug logging (request/response payloads)
 *
 * Skipped automatically when either required variable is missing, so the suite
 * never runs accidentally in CI or local environments where the key
 * happens to be set for other tooling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RuleClient, RuleApiError } from '../src';
import type { RCMLDocument } from '../src';

const API_KEY = process.env.RULE_API_KEY;
const OPT_IN = process.env.RUN_INTEGRATION === '1';

const runIntegration = !!API_KEY && OPT_IN;

// Unique suffix to avoid collisions across test runs
const RUN_ID = `sdk-test-${Date.now()}`;

/** Minimal valid RCML document for template creation */
function minimalRCML(): RCMLDocument {
  return {
    head: { title: 'Test', preheader: '' },
    body: { sections: [] },
  };
}

describe.skipIf(!runIntegration)('Integration: Live Rule.io API', { timeout: 30_000 }, () => {
  let client: RuleClient;

  // Track resources to clean up
  const cleanup: Array<() => Promise<void>> = [];

  beforeAll(() => {
    client = new RuleClient({
      apiKey: API_KEY!,
      debug: process.env.DEBUG_INTEGRATION === '1',
    });
  });

  afterAll(async () => {
    // Run cleanup in reverse order, swallow errors
    for (const fn of cleanup.reverse()) {
      try {
        await fn();
      } catch {
        // Best-effort cleanup
      }
    }
  });

  // ==========================================================================
  // Auth & Config
  // ==========================================================================

  describe('Auth & Config', () => {
    it('should confirm client is configured', () => {
      expect(client.getApiKey()).toBe(API_KEY);
    });

    it('should reject invalid API key with 401', async () => {
      const badClient = new RuleClient('invalid-key-12345');
      try {
        await badClient.getTags();
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleApiError);
        expect((error as RuleApiError).statusCode).toBe(401);
        expect((error as RuleApiError).isAuthError()).toBe(true);
      }
    });
  });

  // ==========================================================================
  // v2 Tags API
  // ==========================================================================

  describe('v2 Tags API', () => {
    it('should list tags', async () => {
      const result = await client.getTags();
      expect(result).toBeDefined();
      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);

      if (result.tags && result.tags.length > 0) {
        const tag = result.tags[0];
        expect(tag).toHaveProperty('id');
        expect(tag).toHaveProperty('name');
        expect(typeof tag.id).toBe('number');
        expect(typeof tag.name).toBe('string');
      }
    });

    it('should return null for non-existent tag name', async () => {
      const id = await client.getTagIdByName('nonexistent-tag-xyz-999');
      expect(id).toBeNull();
    });
  });

  // ==========================================================================
  // v2 Subscriber API
  // ==========================================================================

  describe('v2 Subscriber API', () => {
    const testEmail = `integration-${RUN_ID}@test.example.com`;
    let subscriberDeleted = false;

    it('should create a subscriber via syncSubscriber', async () => {
      const result = await client.syncSubscriber({
        email: testEmail,
        fields: {
          FirstName: 'Integration',
          LastName: 'Test',
        },
        tags: [`${RUN_ID}`],
      });
      expect(result).toBeDefined();

      // Register cleanup so the subscriber is removed even if later tests fail
      cleanup.push(async () => {
        if (!subscriberDeleted) await client.deleteSubscriber(testEmail);
      });
    });

    it('should retrieve subscriber fields', async () => {
      // Poll until the subscriber is propagated (max 5s)
      let fields = null;
      for (let i = 0; i < 10; i++) {
        fields = await client.getSubscriberFields(testEmail);
        if (fields) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      expect(fields).not.toBeNull();
      if (fields) {
        expect(typeof fields).toBe('object');
      }
    });

    it('should retrieve subscriber tags', async () => {
      const tags = await client.getSubscriberTags(testEmail);
      expect(tags).not.toBeNull();
      if (tags) {
        expect(Array.isArray(tags)).toBe(true);
      }
    });

    it('should add tags to subscriber', async () => {
      const result = await client.addSubscriberTags(testEmail, [`extra-${RUN_ID}`]);
      expect(result).toBeDefined();
    });

    it('should remove tags from subscriber', async () => {
      await client.removeSubscriberTags(testEmail, [`extra-${RUN_ID}`]);
    });

    it('should return null for non-existent subscriber', async () => {
      const result = await client.getSubscriber('definitely-not-real-email@fake.example.com');
      expect(result).toBeNull();
    });

    it('should delete subscriber', async () => {
      await client.deleteSubscriber(testEmail);
      subscriberDeleted = true;
    });
  });

  // ==========================================================================
  // v3 Subscriber API
  // ==========================================================================

  describe('v3 Subscriber API', () => {
    const testEmail = `v3-integration-${RUN_ID}@test.example.com`;
    let subscriberV3Deleted = false;

    it('should create a subscriber via v3', async () => {
      const result = await client.createSubscriberV3({
        email: testEmail,
      });
      expect(result).toBeDefined();

      cleanup.push(async () => {
        if (!subscriberV3Deleted) await client.deleteSubscriberV3(testEmail);
      });
    });

    it('should add tags via v3', async () => {
      await client.addSubscriberTagsV3(testEmail, {
        tags: [`v3-extra-${RUN_ID}`],
      });
    });

    it('should remove a tag via v3', async () => {
      await client.removeSubscriberTagV3(testEmail, `v3-extra-${RUN_ID}`);
    });

    it('should delete subscriber via v3', async () => {
      await client.deleteSubscriberV3(testEmail);
      subscriberV3Deleted = true;
    });
  });

  // ==========================================================================
  // v3 Automation + Message + Template + Dynamic Set (chained CRUD)
  // ==========================================================================

  describe('v3 Editor API (chained CRUD)', () => {
    let automationId: number;
    let messageId: number;
    let templateId: number;
    let dynamicSetId: number;
    let tagId: number | undefined;

    // --- Automation ---

    it('should list automations', async () => {
      const result = await client.listAutomations();
      expect(result).toBeDefined();
    });

    it('should have at least one tag for trigger tests', async () => {
      const tags = await client.getTags();
      tagId = tags.tags?.[0]?.id;
      expect(tagId).toBeDefined();
    });

    it('should create an automation with trigger in single step', async () => {
      expect(tagId).toBeDefined();

      const result = await client.createAutomation({
        name: `Integration Test Automation ${RUN_ID}`,
        trigger: { type: 'TAG' as const, id: tagId! },
        sendout_type: 2 as const, // transactional
      });
      expect(result).toBeDefined();
      // Response wraps data in .data
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      automationId = result.data!.id!;

      // Verify trigger was set correctly on creation (no separate update needed)
      const fetched = await client.getAutomation(automationId);
      expect(fetched).not.toBeNull();
      expect(fetched!.data?.trigger).toBeDefined();
      expect(fetched!.data!.trigger!.type).toBe('TAG');
      expect(fetched!.data!.trigger!.id).toBe(tagId);

      cleanup.push(async () => {
        if (automationId) await client.deleteAutomation(automationId);
      });
    });

    it('should get an automation by id', async () => {
      expect(automationId).toBeDefined();
      const result = await client.getAutomation(automationId);
      expect(result).toBeDefined();
      expect(result.data?.id).toBe(automationId);
    });

    it('should update an automation', async () => {
      expect(automationId).toBeDefined();
      expect(tagId).toBeDefined();

      const result = await client.updateAutomation(automationId, {
        name: `Integration Test Automation Updated ${RUN_ID}`,
        active: false,
        trigger: { type: 'TAG', id: tagId! },
        sendout_type: 2,
      });
      expect(result).toBeDefined();
    });

    // --- Message (requires automation ID) ---

    it('should create a message linked to automation', async () => {
      expect(automationId).toBeDefined();
      const result = await client.createMessage({
        dispatcher: {
          id: automationId,
          type: 'automail',
        },
        type: 1, // email
        subject: 'Integration Test Subject',
        from_name: process.env.RULE_FROM_NAME ?? 'SDK Test',
        from_email: process.env.RULE_FROM_EMAIL ?? 'test@example.com',
        automail_setting: {
          active: true,
          delay_in_seconds: '0',
        },
      });
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      messageId = result.data!.id!;

      cleanup.push(async () => {
        if (messageId) await client.deleteMessage(messageId);
      });
    });

    it('should list messages for the automation', async () => {
      expect(automationId).toBeDefined();
      const result = await client.listMessages({
        id: automationId,
        dispatcher_type: 'automail',
      });
      expect(result).toBeDefined();
    });

    it('should get a message by id', async () => {
      expect(messageId).toBeDefined();
      const result = await client.getMessage(messageId);
      expect(result).toBeDefined();
      expect(result.data?.id).toBe(messageId);
    });

    it('should update a message', async () => {
      expect(messageId).toBeDefined();
      const result = await client.updateMessage(messageId, {
        subject: 'Updated Subject',
      });
      expect(result).toBeDefined();
    });

    // --- Template (requires message ID) ---

    it('should create a template linked to message', async () => {
      expect(messageId).toBeDefined();
      const result = await client.createTemplate({
        message_id: messageId,
        name: `Integration Test Template ${RUN_ID}`,
        message_type: 'email',
        template: minimalRCML(),
      });
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      templateId = result.data!.id!;

      cleanup.push(async () => {
        if (templateId) await client.deleteTemplate(templateId);
      });
    });

    it('should list templates', async () => {
      const result = await client.listTemplates();
      expect(result).toBeDefined();
    });

    it('should get a template by id', async () => {
      expect(templateId).toBeDefined();
      const result = await client.getTemplate(templateId);
      expect(result).toBeDefined();
      expect(result.data?.id).toBe(templateId);
    });

    it('should update a template', async () => {
      expect(templateId).toBeDefined();
      expect(messageId).toBeDefined();
      const result = await client.updateTemplate(templateId, {
        message_id: messageId,
        name: `Updated Template ${RUN_ID}`,
        message_type: 'email',
        template: minimalRCML(),
      });
      expect(result).toBeDefined();
    });

    // --- Dynamic Set (requires message + template) ---

    it('should create a dynamic set', async () => {
      expect(messageId).toBeDefined();
      expect(templateId).toBeDefined();
      const result = await client.createDynamicSet({
        message_id: messageId,
        template_id: templateId,
      });
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      dynamicSetId = result.data!.id!;

      cleanup.push(async () => {
        if (dynamicSetId) await client.deleteDynamicSet(dynamicSetId);
      });
    });

    it('should list dynamic sets for the message', async () => {
      expect(messageId).toBeDefined();
      const result = await client.listDynamicSets({
        message_id: messageId,
      });
      expect(result).toBeDefined();
    });

    it('should get a dynamic set by id', async () => {
      expect(dynamicSetId).toBeDefined();
      const result = await client.getDynamicSet(dynamicSetId);
      expect(result).toBeDefined();
    });

    // --- Cleanup (delete in reverse dependency order, tolerate 404s) ---

    it('should delete dynamic set', async () => {
      if (!dynamicSetId) return;
      await client.deleteDynamicSet(dynamicSetId);
      dynamicSetId = 0;
    });

    it('should delete template', async () => {
      if (!templateId) return;
      try {
        await client.deleteTemplate(templateId);
      } catch (error) {
        // May already be cascade-deleted when dynamic set was removed
        if (!(error instanceof RuleApiError && error.isNotFound())) throw error;
      }
      templateId = 0;
    });

    it('should delete message', async () => {
      if (!messageId) return;
      try {
        await client.deleteMessage(messageId);
      } catch (error) {
        if (!(error instanceof RuleApiError && error.isNotFound())) throw error;
      }
      messageId = 0;
    });

    it('should delete automation', async () => {
      if (!automationId) return;
      await client.deleteAutomation(automationId);
      automationId = 0;
    });
  });

  // ==========================================================================
  // v3 Campaigns API
  // ==========================================================================

  describe('v3 Campaigns API', () => {
    let campaignId = 0;

    afterEach(async () => {
      if (!campaignId) return;
      await client.deleteCampaign(campaignId).catch((e: unknown) => {
        if (e instanceof RuleApiError && e.isNotFound()) return;
        throw e;
      });
      campaignId = 0;
    });

    it('should list campaigns', async () => {
      const result = await client.listCampaigns();
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should list campaigns with pagination', async () => {
      const result = await client.listCampaigns({ page: 1, per_page: 5 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should list campaigns filtered by message_type', async () => {
      const result = await client.listCampaigns({ message_type: 1 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should create, get, update, and delete a campaign', async () => {
      // Create
      const created = await client.createCampaign({
        message_type: 1,
        name: `Integration Campaign ${RUN_ID}`,
        sendout_type: 1,
        tags: [],
        segments: [],
        subscribers: [],
      });
      expect(created.data).toBeDefined();
      expect(created.data!.id).toBeGreaterThan(0);
      campaignId = created.data!.id;

      // Get
      const fetched = await client.getCampaign(campaignId);
      expect(fetched).not.toBeNull();
      expect(fetched!.data!.id).toBe(campaignId);

      // Update
      const updatedName = `Updated Campaign ${RUN_ID}`;
      const updated = await client.updateCampaign(campaignId, {
        name: updatedName,
        sendout_type: 1,
        tags: [],
        segments: [],
        subscribers: [],
      });
      expect(updated.data).toBeDefined();
      expect(updated.data!.name).toBe(updatedName);

      // Delete (afterEach handles cleanup, but test the return value)
      const deleted = await client.deleteCampaign(campaignId);
      expect(deleted.success).toBe(true);
      campaignId = 0; // prevent afterEach double-delete
    });

    it('should return null for non-existent campaign', async () => {
      // Create then delete to get a guaranteed-missing ID
      const created = await client.createCampaign({
        message_type: 1,
        name: `Deleted Campaign ${RUN_ID}`,
        sendout_type: 1,
        tags: [],
        segments: [],
        subscribers: [],
      });
      campaignId = created.data!.id;
      await client.deleteCampaign(campaignId);
      campaignId = 0;

      const result = await client.getCampaign(created.data!.id);
      expect(result).toBeNull();
    });

    it('should copy a campaign', async () => {
      // Create a source campaign
      const source = await client.createCampaign({
        message_type: 1,
        name: `Copy Source ${RUN_ID}`,
        sendout_type: 1,
        tags: [],
        segments: [],
        subscribers: [],
      });
      const sourceId = source.data!.id;

      try {
        const copy = await client.copyCampaign(sourceId);
        campaignId = copy.data?.id ?? 0;
        expect(copy.data).toBeDefined();
        expect(copy.data!.id).not.toBe(sourceId);
      } finally {
        // Clean up source campaign
        await client.deleteCampaign(sourceId).catch((e: unknown) => {
          if (e instanceof RuleApiError && e.isNotFound()) return;
          throw e;
        });
      }
    });
  });

  // ==========================================================================
  // v3 Brand Styles API
  // ==========================================================================

  describe('v3 Brand Styles API', () => {
    it('should list brand styles', async () => {
      const result = await client.listBrandStyles();
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // v3 Recipients API (segments, subscribers, tags)
  // ==========================================================================

  describe('v3 Recipients API', () => {
    it('should list segments', async () => {
      const result = await client.listSegments();
      expect(result).toBeDefined();
    });

    it('should list recipient tags', async () => {
      const result = await client.listRecipientTags();
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // v3 Analytics API
  // ==========================================================================

  describe('v3 Analytics API', () => {
    it('should not crash with minimal params', async () => {
      try {
        const result = await client.getAnalytics({
          date_from: '2024-01-01',
          date_to: '2024-01-31',
        });
        expect(result).toBeDefined();
      } catch (error) {
        // Analytics may return 400/422 if no dispatchers or missing params — that's fine
        if (error instanceof RuleApiError && [400, 422].includes(error.statusCode)) {
          return;
        }
        throw error;
      }
    });
  });

  // ==========================================================================
  // v3 Export API
  // ==========================================================================

  describe('v3 Export API', () => {
    it('should export subscribers with date range', async () => {
      try {
        const result = await client.exportSubscribers({
          date_from: '2024-01-01',
          date_to: '2024-01-02',
        });
        expect(result).toBeDefined();
      } catch (error) {
        // May return 400/404 on empty accounts or invalid ranges
        if (error instanceof RuleApiError && [400, 404, 422].includes(error.statusCode)) {
          return;
        }
        throw error;
      }
    });
  });

  // ==========================================================================
  // v3 API Keys API
  // ==========================================================================

  describe('v3 API Keys API', () => {
    it('should list API keys', async () => {
      const result = await client.listApiKeys();
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Full Automation Workflow (end-to-end via helper)
  // ==========================================================================

  describe('Full Automation Workflow', () => {
    it('should create and clean up a full automation email', async () => {
      // First ensure we have a tag to trigger on
      const tagsResult = await client.getTags();
      if (!tagsResult.tags || tagsResult.tags.length === 0) {
        return;
      }

      const triggerTagName = tagsResult.tags[0].name;
      let result: Awaited<ReturnType<typeof client.createAutomationEmail>> | undefined;

      try {
        result = await client.createAutomationEmail({
          name: `E2E Automation ${RUN_ID}`,
          triggerType: 'tag',
          triggerValue: triggerTagName,
          subject: 'Integration Test Email',
          fromName: process.env.RULE_FROM_NAME ?? 'SDK Test',
          fromEmail: process.env.RULE_FROM_EMAIL ?? 'test@example.com',
          template: minimalRCML(),
        });

        expect(result).toBeDefined();
        expect(result.automationId).toBeGreaterThan(0);
        expect(result.messageId).toBeGreaterThan(0);
        expect(result.templateId).toBeGreaterThan(0);
        expect(result.dynamicSetId).toBeGreaterThan(0);

        // Verify we can read each created resource
        const automation = await client.getAutomation(result.automationId);
        expect(automation).toBeDefined();
        expect(automation.data?.id).toBe(result.automationId);

        const message = await client.getMessage(result.messageId);
        expect(message).toBeDefined();
        expect(message.data?.id).toBe(result.messageId);

        const template = await client.getTemplate(result.templateId);
        expect(template).toBeDefined();
        expect(template.data?.id).toBe(result.templateId);
      } finally {
        // Clean up all created resources (reverse dependency order)
        if (result) {
          const ids = result;
          if (ids.dynamicSetId) {
            await client.deleteDynamicSet(ids.dynamicSetId).catch(() => {});
          }
          if (ids.templateId) {
            await client.deleteTemplate(ids.templateId).catch(() => {});
          }
          if (ids.messageId) {
            await client.deleteMessage(ids.messageId).catch(() => {});
          }
          if (ids.automationId) {
            await client.deleteAutomation(ids.automationId).catch(() => {});
          }
        }
      }
    });
  });

  // ==========================================================================
  // Error Handling Verification
  // ==========================================================================

  describe('Error handling', () => {
    it('should throw RuleApiError on invalid request', async () => {
      // Attempt to create a message with an invalid dispatcher ID
      try {
        await client.createMessage({
          dispatcher: { id: -1, type: 'automail' },
          type: 1,
          subject: 'Should fail',
        });
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RuleApiError);
        const apiError = error as RuleApiError;
        expect(apiError.statusCode).toBeGreaterThanOrEqual(400);
      }
    });

    it('should return null for non-existent subscriber (getSubscriber)', async () => {
      const result = await client.getSubscriber('nonexistent-email-xyz@fake.example.com');
      expect(result).toBeNull();
    });
  });
});
