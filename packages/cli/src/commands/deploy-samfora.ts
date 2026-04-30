/**
 * `rule-io deploy samfora` — deploy the Samfora donation-platform automations
 * and seed realistic persona subscribers for QA in Rule.io's editor.
 */

import type { Command } from 'commander';
import { type RuleClient } from '@rule-io/client';
import { type RcmlDocument } from '@rule-io/rcml';
import { resolvePreferredBrandStyle } from '@rule-io/client';
import type { CustomFieldMap, VendorConsumerConfig } from '@rule-io/core';
import { samforaPreset, SAMFORA_FIELDS, SAMFORA_TAGS } from '@rule-io/vendor-samfora';
import { createClient } from '../shared/client.js';

const V2_BASE = 'https://app.rule.io/api/v2';
const SEED_EMAIL = 'samfora-seed@rule.se';
const WEBSITE_URL = 'https://samfora.org';

interface Persona {
  email: string;
  firstName: string;
  description: string;
  tags: string[];
  seedDonationGroup: boolean;
}

const PERSONAS: Persona[] = [
  {
    email: 'samfora-first@rule.se',
    firstName: 'Ella',
    description: 'First-time donor',
    tags: [SAMFORA_TAGS.donationReceived, SAMFORA_TAGS.donorFirstGift],
    seedDonationGroup: true,
  },
  {
    email: 'samfora-second@rule.se',
    firstName: 'Oskar',
    description: 'Second gift donor',
    tags: [SAMFORA_TAGS.donationReceived, SAMFORA_TAGS.donorSecondGift],
    seedDonationGroup: true,
  },
  {
    email: 'samfora-returning@rule.se',
    firstName: 'Saga',
    description: 'Returning donor (3+ gifts)',
    tags: [SAMFORA_TAGS.donationReceived, SAMFORA_TAGS.donorReturning],
    seedDonationGroup: true,
  },
  {
    email: 'samfora-monthly@rule.se',
    firstName: 'Arvid',
    description: 'Monthly giver',
    tags: [SAMFORA_TAGS.monthlyDonation, SAMFORA_TAGS.monthlyGiver],
    seedDonationGroup: true,
  },
  {
    email: 'samfora-new@rule.se',
    firstName: 'Linnea',
    description: 'Newly signed-up donor (no donation yet)',
    tags: [SAMFORA_TAGS.newDonor],
    seedDonationGroup: false,
  },
  {
    email: 'samfora-tax@rule.se',
    firstName: 'Johan',
    description: 'Tax-summary recipient',
    tags: [SAMFORA_TAGS.annualTaxSummary],
    seedDonationGroup: true,
  },
];

const ALL_TAGS = Object.values(SAMFORA_TAGS);

const DONATION_SEED_VALUES: Array<{ field: string; value: unknown }> = [
  { field: 'Amount', value: 250 },
  { field: 'Currency', value: 'SEK' },
  { field: 'Date', value: '2026-04-22' },
  { field: 'Reference', value: 'SAM-2026-0001' },
  { field: 'CauseName', value: 'Barnens Hav' },
  { field: 'Type', value: 'one-time' },
  { field: 'TotalLifetime', value: 2450 },
  { field: 'TaxYear', value: '2026' },
  { field: 'TaxDeductible', value: 2000 },
];

function subscriberFieldSeed(firstName: string): Array<{ key: string; value: string }> {
  return [
    { key: SAMFORA_FIELDS.donorFirstName, value: firstName },
    { key: SAMFORA_FIELDS.donorLastName, value: 'Svensson' },
    { key: SAMFORA_FIELDS.donorAddress1, value: 'Storgatan 1' },
    { key: SAMFORA_FIELDS.donorAddress2, value: 'Lgh 1201' },
    { key: SAMFORA_FIELDS.donorZipcode, value: '11122' },
    { key: SAMFORA_FIELDS.donorCity, value: 'Stockholm' },
    { key: SAMFORA_FIELDS.donorCountry, value: 'Sweden' },
    { key: SAMFORA_FIELDS.donorPhone, value: '+46701234567' },
    { key: SAMFORA_FIELDS.donorSource, value: 'samfora' },
  ];
}

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

async function seedDonationGroup(client: RuleClient, subscriberId: number): Promise<void> {
  await client.createCustomFieldData(subscriberId, {
    groups: [
      {
        group: 'Donation',
        create_if_not_exists: true,
        historical: true,
        values: DONATION_SEED_VALUES.map(({ field, value }) => ({
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

  console.log(`→ Seeding ${SEED_EMAIL} with Subscriber.* fields + every Samfora tag...`);
  await syncSubscriberV2(apiKey, SEED_EMAIL, subscriberFieldSeed('Seed'), ALL_TAGS);

  console.log('→ Looking up seed subscriber id...');
  const seed = await client.getSubscriber(SEED_EMAIL);
  const rawId = seed?.subscriber?.id;

  if (!rawId) throw new Error('Seed subscriber not found after sync');
  const seedId = Number(rawId);

  console.log(`  id: ${seedId}`);

  console.log('→ Seeding Donation group on seed subscriber (historical=true)...');
  await seedDonationGroup(client, seedId);

  console.log(`\n→ Creating ${PERSONAS.length} persona subscriber(s)...`);
  const personaIds: Record<string, number> = {};

  for (const p of PERSONAS) {
    console.log(`  — ${p.email} (${p.description})`);
    await syncSubscriberV2(apiKey, p.email, subscriberFieldSeed(p.firstName), p.tags);
    const sub = await client.getSubscriber(p.email);
    const id = Number(sub?.subscriber?.id ?? 0);

    if (!id) throw new Error(`Persona ${p.email} missing after sync`);
    personaIds[p.email] = id;
    if (p.seedDonationGroup) await seedDonationGroup(client, id);
    console.log(`    id: ${id}${p.seedDonationGroup ? ' (+ donation record)' : ''}`);
  }

  console.log('\n→ Resolving custom field ids from seed subscriber...');
  const resolved = await resolveFieldIds(client, seedId);

  console.log(`  ${Object.keys(resolved).length} raw field(s) resolved`);

  const customFields: CustomFieldMap = { ...resolved };
  const lower: Record<string, number> = {};

  for (const [k, v] of Object.entries(resolved)) lower[k.toLowerCase()] = v;
  const expected = Object.values(SAMFORA_FIELDS).filter((n) => n.includes('.'));
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

  console.log('→ Validating config against samfora preset...');
  samforaPreset.validateConfig(config);

  const automations = samforaPreset.getAutomations(config);

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

  console.log('\nPersona subscribers:');

  for (const p of PERSONAS) {
    console.log(`  ${personaIds[p.email]}  ${p.email}  — ${p.description}`);
  }
}

export function registerDeploySamfora(deploy: Command): void {
  deploy
    .command('samfora')
    .description('Deploy the Samfora donation-platform automations (Swedish).')
    .option('--api-key <key>', 'Rule.io API key (defaults to $RULE_API_KEY)')
    .option('--brand <id>', 'Force a specific brand style id (overrides is_default discovery)')
    .option('--activate', 'Activate each automation after deploying')
    .action(run);
}
