/**
 * `rule-io deploy bookzen` — deploy the Bookzen hospitality automations
 * (reservation confirmation/cancellation/reminder, feedback, reservation
 * request) and seed a test subscriber so the custom-field definitions exist
 * in the target Rule.io account.
 *
 * Mirrors the shape of `deploy-samfora` / `deploy-shopify`: seed flat
 * Subscriber fields + trigger tags, recreate the Booking group as historical,
 * resolve field ids, then deploy each automation via createAutomationEmail.
 */

import type { Command } from 'commander';
import { RuleClient } from '@rule-io/client';
import { type RcmlDocument } from '@rule-io/rcml';
import { resolvePreferredBrandStyle } from '@rule-io/client';
import type { CustomFieldMap, VendorConsumerConfig } from '@rule-io/core';
import { bookzenPreset, BOOKZEN_FIELDS, BOOKZEN_TAGS } from '@rule-io/vendor-bookzen';
import { createClient } from '../shared/client.js';

const V2_BASE = 'https://app.rule.io/api/v2';
const SEED_EMAIL = 'bookzen-seed@rule.se';
const WEBSITE_URL = 'https://bookzen.rule.se';

const ALL_TAGS = Object.values(BOOKZEN_TAGS);

const SUBSCRIBER_SEED: Record<string, string> = {
  [BOOKZEN_FIELDS.guestFirstName]: 'Astrid',
};

const BOOKING_SEED_VALUES: Array<{ field: string; value: unknown }> = [
  { field: 'BookingRef', value: 'BKZ-2026-0001' },
  { field: 'ServiceType', value: 'accommodation' },
  { field: 'CheckInDate', value: '2026-05-01' },
  { field: 'CheckOutDate', value: '2026-05-04' },
  { field: 'TotalGuests', value: 2 },
  { field: 'TotalPrice', value: 3600.0 },
  { field: 'RoomName', value: 'Superior Sea View' },
];

async function syncSubscriberV2(
  apiKey: string,
  email: string,
  fields: Array<{ key: string; value: string }>,
  tags: string[],
): Promise<void> {
  const payload = { update_on_duplicate: true, tags, subscribers: { email, fields } };
  const res = await fetch(`${V2_BASE}/subscribers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      `v2 /subscribers POST failed for ${email}: ${res.status} ${await res.text()}`,
    );
  }
}

async function seedBookingGroup(client: RuleClient, subscriberId: number): Promise<void> {
  await client.createCustomFieldData(subscriberId, {
    groups: [
      {
        group: 'Booking',
        create_if_not_exists: true,
        historical: true,
        values: BOOKING_SEED_VALUES.map(({ field, value }) => ({
          field,
          create_if_not_exists: true,
          value: value as Parameters<
            typeof client.createCustomFieldData
          >[1]['groups'][number]['values'][number]['value'],
        })),
      },
    ],
  });
}

async function resolveFieldIds(client: RuleClient, subscriberId: number): Promise<CustomFieldMap> {
  const data = await client.getCustomFieldData(subscriberId);
  const map: CustomFieldMap = {};
  for (const record of data.data ?? []) {
    const groupName = record.group_name ?? '';
    for (const v of record.values) {
      const key = `${groupName}.${v.field_name}`;
      map[key] = v.field_id;
    }
  }
  return map;
}

function parseBrandOverride(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(
      `Invalid --brand value "${raw}": expected a positive integer brand style id.`,
    );
  }
  return n;
}

interface Options {
  apiKey?: string;
  brand?: string;
  activate?: boolean;
}

async function run(opts: Options): Promise<void> {
  const apiKey = opts.apiKey ?? process.env['RULE_API_KEY'];
  if (!apiKey) throw new Error('Missing RULE_API_KEY in environment or .env');
  const brandOverride = parseBrandOverride(opts.brand);
  const activate = opts.activate ?? false;

  const client = createClient({ apiKey });

  const seedFields = Object.entries(SUBSCRIBER_SEED).map(([key, value]) => ({ key, value }));

  console.log(`→ Seeding ${SEED_EMAIL} with Subscriber.* fields + every Bookzen tag...`);
  await syncSubscriberV2(apiKey, SEED_EMAIL, seedFields, ALL_TAGS);

  console.log('→ Looking up seed subscriber id...');
  const seed = await client.getSubscriber(SEED_EMAIL);
  const rawId = seed?.subscriber?.id;
  if (!rawId) throw new Error('Seed subscriber not found after sync');
  const seedId = Number(rawId);
  console.log(`  id: ${seedId}`);

  console.log('→ Seeding Booking group on seed subscriber (historical=true)...');
  await seedBookingGroup(client, seedId);

  console.log('→ Resolving custom field ids from seed subscriber...');
  const resolved = await resolveFieldIds(client, seedId);
  console.log(`  ${Object.keys(resolved).length} raw field(s) resolved`);

  const customFields: CustomFieldMap = { ...resolved };
  const lower: Record<string, number> = {};
  for (const [k, v] of Object.entries(resolved)) lower[k.toLowerCase()] = v;
  const expected = Object.values(BOOKZEN_FIELDS).filter((n) => n.includes('.'));
  const aliased: string[] = [];
  const stillMissing: string[] = [];
  for (const name of expected) {
    if (customFields[name] !== undefined) continue;
    const hit = lower[name.toLowerCase()];
    if (hit !== undefined) {
      customFields[name] = hit;
      aliased.push(name);
    } else {
      stillMissing.push(name);
    }
  }
  if (aliased.length) console.log(`  aliased (case-insensitive): ${aliased.join(', ')}`);
  if (stillMissing.length) {
    console.warn(
      `  WARN: ${stillMissing.length} expected fields not present in account:`,
      stillMissing,
    );
  }

  console.log(
    brandOverride !== undefined
      ? `\n→ Fetching brand style ${brandOverride} (override)...`
      : '\n→ Resolving preferred brand style (is_default)...',
  );
  const { id: brandStyleId, name: brandName, brandStyle, source } =
    await resolvePreferredBrandStyle(client, brandOverride);
  if (source === 'fallback') {
    console.warn('  WARN: no brand style is flagged as default — falling back to first in list');
  }
  console.log(`  using "${brandName ?? '-'}" (id ${brandStyleId})`);

  const config: VendorConsumerConfig = { brandStyle, customFields, websiteUrl: WEBSITE_URL };

  console.log('→ Validating config against bookzen preset...');
  bookzenPreset.validateConfig(config);

  const automations = bookzenPreset.getAutomations(config);
  console.log(`\n→ Deploying ${automations.length} automation(s)...`);

  const results: Array<{ name: string; automationId: number; messageId: number; templateId: number }> = [];
  for (const a of automations) {
    console.log(`\n  — ${a.name}`);
    const template = a.templateBuilder(config) as RcmlDocument;
    const res = await client.createAutomationEmail({
      name: `${a.name} (SDK standard)`,
      description: a.description,
      triggerType: 'tag',
      triggerValue: a.triggerTag,
      subject: a.subject,
      preheader: a.preheader,
      sendoutType: 2,
      delayInSeconds: a.delayInSeconds,
      template,
    });
    console.log(`    automail: ${res.automationId}  message: ${res.messageId}  template: ${res.templateId}`);
    console.log(
      `    edit: https://app.rule.io/v5/#/app/automations/automail/${res.automationId}/v6/email/${res.messageId}/edit`,
    );
    if (activate) {
      await client.updateAutomation(res.automationId, { active: true });
      console.log('    activated ✓');
    }
    results.push({
      name: a.name,
      automationId: res.automationId,
      messageId: res.messageId,
      templateId: res.templateId,
    });
  }

  console.log('\n✓ Deployed');
  for (const r of results) {
    console.log(`  ${r.automationId}  ${r.name}`);
  }
}

export function registerDeployBookzen(deploy: Command): void {
  deploy
    .command('bookzen')
    .description('Deploy the Bookzen hospitality automations (reservations / feedback).')
    .option('--api-key <key>', 'Rule.io API key (defaults to $RULE_API_KEY)')
    .option('--brand <id>', 'Force a specific brand style id (overrides is_default discovery)')
    .option('--activate', 'Activate each automation after deploying')
    .action(run);
}
