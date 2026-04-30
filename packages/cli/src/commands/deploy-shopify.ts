/**
 * `rule-io deploy shopify` — deploy the SDK's standard Shopify automations
 * into a Rule.io account.
 *
 * Flow:
 *   1. Seed a test subscriber with all SHOPIFY_FIELDS populated so the field
 *      definitions exist in the account.
 *   2. Apply missing Shopify tags to that subscriber so they resolve to numeric
 *      tag ids.
 *   3. Resolve numeric field ids via the v3 custom-field-data endpoint.
 *   4. Resolve the account's preferred brand style (is_default: true). The
 *      `--brand <id>` flag overrides discovery.
 *   5. Deploy each automation via createAutomationEmail (auto-handles the
 *      automail → message → template → dynamic-set chain with cleanup on
 *      failure).
 */

import type { Command } from 'commander';
import { type RuleClient } from '@rule-io/client';
import { type RcmlDocument } from '@rule-io/rcml';
import { resolvePreferredBrandStyle } from '@rule-io/client';
import type { CustomFieldMap, VendorConsumerConfig } from '@rule-io/core';
import { shopifyPreset, SHOPIFY_FIELDS, SHOPIFY_TAGS } from '@rule-io/vendor-shopify';
import { createClient } from '../shared/client.js';

const SEED_EMAIL = 'shopify-seed@rule.se';
const WEBSITE_URL = 'https://shop.rule.se';

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

const SUBSCRIBER_SEED: Record<string, string> = {
  [SHOPIFY_FIELDS.firstName]: 'Anna',
  [SHOPIFY_FIELDS.lastName]: 'Andersson',
  [SHOPIFY_FIELDS.source]: 'shopify',
  [SHOPIFY_FIELDS.zipcode]: '11122',
  [SHOPIFY_FIELDS.city]: 'Stockholm',
  [SHOPIFY_FIELDS.address1]: 'Storgatan 1',
  [SHOPIFY_FIELDS.address2]: 'Apt 4B',
  [SHOPIFY_FIELDS.number]: '+46701234567',
  [SHOPIFY_FIELDS.country]: 'Sweden',
};

const ORDER_SEED: Array<{ field: string; value: unknown }> = [
  { field: 'Number', value: '#1001' },
  { field: 'Date', value: '2026-04-19' },
  { field: 'Currency', value: 'SEK' },
  { field: 'TotalPrice', value: 499.0 },
  { field: 'TotalWeight', value: 500 },
  { field: 'TotalTax', value: 99.8 },
  { field: 'ProductCount', value: 2 },
  { field: 'Discount', value: 0 },
  { field: 'Names', value: 'T-shirt, Cap' },
  { field: 'Gateway', value: 'card' },
  { field: 'Skus', value: 'SKU-1, SKU-2' },
  {
    field: 'Products',
    value: [
      { name: 'T-shirt', quantity: 1, price: '299.00', sku: 'SKU-1' },
      { name: 'Cap', quantity: 1, price: '200.00', sku: 'SKU-2' },
    ],
  },
  { field: 'CartUrl', value: `${WEBSITE_URL}/cart/abc` },
  { field: 'ShippingAddress1', value: 'Storgatan 1' },
  { field: 'ShippingAddress2', value: 'Apt 4B' },
  { field: 'ShippingCity', value: 'Stockholm' },
  { field: 'ShippingZip', value: '11122' },
  { field: 'ShippingCountryCode', value: 'SE' },
];

async function seedSubscriber(apiKey: string, baseUrl: string): Promise<void> {
  const fields = Object.entries(SUBSCRIBER_SEED).map(([key, value]) => ({
    key,
    value,
  }));
  const payload = {
    update_on_duplicate: true,
    tags: [
      SHOPIFY_TAGS.orderCompleted,
      SHOPIFY_TAGS.orderShipped,
      SHOPIFY_TAGS.orderCancelled,
      SHOPIFY_TAGS.cartInProgress,
    ],
    subscribers: { email: SEED_EMAIL, fields },
  };
  const res = await fetch(`${baseUrl}/subscribers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`seed subscribers POST failed: ${res.status} ${await res.text()}`);
  }
}

async function seedOrderGroup(client: RuleClient, subscriberId: number): Promise<void> {
  await client.createCustomFieldData(subscriberId, {
    groups: [
      {
        group: 'Order',
        create_if_not_exists: true,
        historical: true,
        values: ORDER_SEED.map(({ field, value }) => ({
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

  console.log(
    `→ Seeding Subscriber group (${Object.keys(SUBSCRIBER_SEED).length} fields) + trigger tags...`,
  );
  await seedSubscriber(apiKey, 'https://app.rule.io/api/v2');

  console.log('→ Looking up subscriber id...');
  const sub = await client.getSubscriber(SEED_EMAIL);
  const rawId = sub?.subscriber?.id;

  if (!rawId) throw new Error('Seed subscriber not found after sync');
  const subscriberId = Number(rawId);

  console.log(`  id: ${subscriberId}`);

  console.log(
    `→ Seeding Order group (${ORDER_SEED.length} fields, historical=true) via v3...`,
  );
  await seedOrderGroup(client, subscriberId);

  console.log('→ Resolving custom field ids via custom-field-data...');
  const resolved = await resolveFieldIds(client, subscriberId);

  console.log(`  ${Object.keys(resolved).length} raw field(s) resolved`);

  const customFields: CustomFieldMap = { ...resolved };
  const lower: Record<string, number> = {};

  for (const [k, v] of Object.entries(resolved)) lower[k.toLowerCase()] = v;
  const expected = Object.values(SHOPIFY_FIELDS).filter((n) => n.includes('.'));
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
      ? `→ Fetching brand style ${brandOverride} (override)...`
      : '→ Resolving preferred brand style (is_default)...',
  );
  const { id: brandStyleId, name: brandName, brandStyle, source } =
    await resolvePreferredBrandStyle(client, brandOverride);

  if (source === 'fallback') {
    console.warn('  WARN: no brand style is flagged as default — falling back to first in list');
  }

  console.log(`  using "${brandName ?? '-'}" (id ${brandStyleId})`);

  const config: VendorConsumerConfig = { brandStyle, customFields, websiteUrl: WEBSITE_URL };

  console.log('→ Validating config against shopify preset...');
  shopifyPreset.validateConfig(config);

  const automations = shopifyPreset.getAutomations(config);

  console.log(`→ Deploying ${automations.length} automation(s)...`);

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
      console.log(`    activated ✓`);
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

export function registerDeployShopify(deploy: Command): void {
  deploy
    .command('shopify')
    .description("Deploy the SDK's standard Shopify e-commerce automations.")
    .option('--api-key <key>', 'Rule.io API key (defaults to $RULE_API_KEY)')
    .option('--brand <id>', 'Force a specific brand style id (overrides is_default discovery)')
    .option('--activate', 'Activate each automation after deploying')
    .action(run);
}
