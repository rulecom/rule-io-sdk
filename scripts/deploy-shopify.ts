/**
 * Deploy the SDK's standard Shopify automations into the test account.
 *
 * Flow:
 *   1. Seed a test subscriber with all SHOPIFY_FIELDS populated so the field
 *      definitions exist in the account.
 *   2. Apply missing Shopify tags (CartInProgress, OrderCancelled) to that
 *      subscriber to ensure they resolve to numeric tag ids.
 *   3. Resolve numeric field ids via the v3 custom-field-data endpoint.
 *   4. Resolve the account's preferred brand style (is_default: true) via
 *      `resolvePreferredBrandStyle`. `--brand=<id>` overrides discovery.
 *   5. Deploy each automation via createAutomationEmail (auto-handles
 *      automail → message → template → dynamic-set with cleanup on failure).
 *
 * Usage:
 *   npx tsx scripts/deploy-shopify.ts                 # deploy, automails inactive
 *   npx tsx scripts/deploy-shopify.ts --activate      # deploy + activate
 *   npx tsx scripts/deploy-shopify.ts --brand=12345   # force a specific brand id
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RuleClient,
  resolvePreferredBrandStyle,
  shopifyPreset,
  SHOPIFY_FIELDS,
  SHOPIFY_TAGS,
} from '../src';
import type { VendorConsumerConfig } from '../src/vendors/types';
import type { CustomFieldMap } from '../src/rcml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

function loadEnv(): void {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const SEED_EMAIL = 'shopify-seed@rule.se';
const WEBSITE_URL = 'https://shop.rule.se';

/**
 * Parse `--brand=<id>`. Rejecting non-integers up front prevents a confusing
 * 404 from `getBrandStyle(NaN)`.
 */
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

/**
 * Subscriber-group seed (flat group). Values are strings; Rule.io infers text.
 * Sent via v2 /subscribers together with trigger tags.
 */
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

/**
 * Order-group seed. Recreated as a historical group via v3 with explicit
 * types per field: numbers for money/counts, JSON array for line items,
 * strings for everything else (including postal code — international safe).
 */
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

/**
 * Seed the Subscriber group + attach trigger tags via v2 /subscribers.
 * Only Subscriber.* fields here — Order fields go through v3 so we can
 * force `historical: true` on group creation.
 */
async function seedSubscriber(
  apiKey: string,
  baseUrl: string,
): Promise<void> {
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

/**
 * Recreate the Order custom-field group as historical via v3
 * createCustomFieldData. `historical: true` is the group type Shopify order
 * data should live in — each sync is a new record, not a flat overwrite.
 */
async function seedOrderGroup(
  client: RuleClient,
  subscriberId: number,
): Promise<void> {
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

async function resolveFieldIds(
  client: RuleClient,
  subscriberId: number,
): Promise<CustomFieldMap> {
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

async function main(): Promise<void> {
  loadEnv();
  const apiKey = process.env.RULE_API_KEY;
  if (!apiKey) throw new Error('Missing RULE_API_KEY in .env');

  const brandOverride = parseBrandOverride(getArg('brand'));
  const activate = process.argv.includes('--activate');

  const client = new RuleClient({ apiKey });

  console.log(
    `→ Seeding Subscriber group (${Object.keys(SUBSCRIBER_SEED).length} fields) + trigger tags...`
  );
  await seedSubscriber(apiKey, 'https://app.rule.io/api/v2');

  console.log('→ Looking up subscriber id...');
  const sub = await client.getSubscriber(SEED_EMAIL);
  const rawId = sub?.subscriber?.id;
  if (!rawId) throw new Error('Seed subscriber not found after sync');
  const subscriberId = Number(rawId);
  console.log(`  id: ${subscriberId}`);

  console.log(
    `→ Seeding Order group (${ORDER_SEED.length} fields, historical=true) via v3...`
  );
  await seedOrderGroup(client, subscriberId);

  console.log('→ Resolving custom field ids via custom-field-data...');
  const resolved = await resolveFieldIds(client, subscriberId);
  console.log(`  ${Object.keys(resolved).length} raw field(s) resolved`);

  // The test account has pre-existing fields with slightly different casing
  // (e.g. "Subscriber.Firstname" vs the Shopify integration's
  // "Subscriber.FirstName"). Build a case-insensitive alias so the preset's
  // expected field names still resolve.
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
    console.warn(`  WARN: ${stillMissing.length} expected fields not present in account:`, stillMissing);
  }

  console.log(
    brandOverride !== undefined
      ? `→ Fetching brand style ${brandOverride} (override)...`
      : '→ Resolving preferred brand style (is_default)...',
  );
  const { id: brandStyleId, name: brandName, brandStyle, source } =
    await resolvePreferredBrandStyle(client, brandOverride);
  if (source === 'fallback') {
    console.warn(
      '  WARN: no brand style is flagged as default — falling back to first in list',
    );
  }
  console.log(`  using "${brandName ?? '-'}" (id ${brandStyleId})`);

  const config: VendorConsumerConfig = {
    brandStyle,
    customFields,
    websiteUrl: WEBSITE_URL,
  };

  console.log('→ Validating config against shopify preset...');
  shopifyPreset.validateConfig(config);

  const automations = shopifyPreset.getAutomations(config);
  console.log(`→ Deploying ${automations.length} automation(s)...`);

  const results: Array<{ name: string; automationId: number; messageId: number; templateId: number }> = [];
  for (const a of automations) {
    console.log(`\n  — ${a.name}`);
    const template = a.templateBuilder(config);
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
    console.log(`    edit: https://app.rule.io/v5/#/app/automations/automail/${res.automationId}/v6/email/${res.messageId}/edit`);
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

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
