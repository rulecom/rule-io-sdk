/**
 * Deploy the SDK's Samfora automations into the test account.
 *
 * Flow mirrors deploy-shopify.ts but uses the account's PREFERRED brand
 * style (is_default: true) rather than a hardcoded ID. See issue #91 —
 * that's how every deploy script should resolve brand styles.
 *
 *   1. Seed samfora-seed@rule.se with every Samfora field + every trigger
 *      & segment tag so the field definitions and tags exist in the
 *      account and we can resolve their numeric ids.
 *   2. Create per-persona test subscribers, one for each automation
 *      trigger, so you can eyeball each flow in the Rule.io UI.
 *   3. Seed the historical Donation.* group for every subscriber that
 *      needs donation detail (all personas except the welcome-only one).
 *   4. Resolve numeric field ids from the seed subscriber.
 *   5. Fetch the account's preferred brand style and build the config.
 *   6. Deploy each automation via createAutomationEmail (auto-handles
 *      automail → message → template → dynamic-set with cleanup on
 *      failure). Leaves automails INACTIVE unless --activate is passed.
 *
 * Usage:
 *   npx tsx scripts/deploy-samfora.ts                 # deploy, automails inactive
 *   npx tsx scripts/deploy-samfora.ts --activate      # deploy + activate
 *   npx tsx scripts/deploy-samfora.ts --brand=12345   # force a specific style id
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RuleClient,
  samforaPreset,
  SAMFORA_FIELDS,
  SAMFORA_TAGS,
} from '../src';
import { toBrandStyleConfig } from '../src/rcml/brand-template';
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

const V2_BASE = 'https://app.rule.io/api/v2';
const SEED_EMAIL = 'samfora-seed@rule.se';
const WEBSITE_URL = 'https://samfora.org';

// ============================================================================
// Persona test subscribers
// ============================================================================

interface Persona {
  email: string;
  firstName: string;
  description: string;
  /** Tags applied via v2 /subscribers — creates the tags in Rule.io as a side effect. */
  tags: string[];
  /** If false, no Donation.* group data is seeded (e.g. welcome-only persona). */
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

/** Every tag the preset references, applied to the seed so they all exist. */
const ALL_TAGS = Object.values(SAMFORA_TAGS);

// Note: Samfora keeps the donor first name inside the historical Donation
// group, so there are no subscriber-level flat fields to seed — the v2 sync
// below just carries tags.

/**
 * One donation record seeded into the historical Donation.* group. Values are
 * typed explicitly so Rule.io creates the right field type on first write.
 */
function donationSeed(firstName: string): Array<{ field: string; value: unknown }> {
  return [
    { field: 'FirstName', value: firstName },
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
}

// ============================================================================
// Live calls
// ============================================================================

/**
 * Attach subscriber-level flat fields + trigger/segment tags via v2
 * /subscribers. An empty fields array is fine — v2 still applies the tags.
 */
async function syncSubscriberV2(
  apiKey: string,
  email: string,
  fields: Array<{ key: string; value: string }>,
  tags: string[],
): Promise<void> {
  const payload = {
    update_on_duplicate: true,
    tags,
    subscribers: { email, fields },
  };
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

/**
 * Recreate the Donation custom-field group as historical via v3 so each
 * donation record is its own row rather than a flat overwrite. Matches how
 * deploy-shopify.ts seeds the Order group.
 */
async function seedDonationGroup(
  client: RuleClient,
  subscriberId: number,
  firstName: string,
): Promise<void> {
  await client.createCustomFieldData(subscriberId, {
    groups: [
      {
        group: 'Donation',
        create_if_not_exists: true,
        historical: true,
        values: donationSeed(firstName).map(({ field, value }) => ({
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

/**
 * Fetch the account's preferred brand style. Uses `is_default: true` from the
 * brand-style list; falls back to the first entry only if no default is set
 * (shouldn't happen in practice). See issue #91 for why this is mandatory.
 */
async function resolvePreferredBrandStyle(
  client: RuleClient,
  overrideId: number | undefined,
): Promise<{ id: number; name?: string }> {
  if (overrideId !== undefined) {
    const resp = await client.getBrandStyle(overrideId);
    if (!resp?.data) throw new Error(`Brand style ${overrideId} not found`);
    return { id: overrideId, name: resp.data.name };
  }

  const listResp = await client.listBrandStyles();
  const styles = listResp.data ?? [];
  if (styles.length === 0) {
    throw new Error('No brand styles available in the account');
  }
  const preferred = styles.find((s) => s.is_default) ?? styles[0];
  if (!styles.some((s) => s.is_default)) {
    console.warn(
      '  WARN: no brand style is flagged as default — falling back to first in list',
    );
  }
  return { id: preferred.id, name: preferred.name };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  loadEnv();
  const apiKey = process.env.RULE_API_KEY;
  if (!apiKey) throw new Error('Missing RULE_API_KEY in .env');

  const brandOverride = getArg('brand');
  const activate = process.argv.includes('--activate');

  const client = new RuleClient({ apiKey });

  // --- 1. Seed subscriber (all fields + all tags so everything gets created) ---
  console.log(`→ Seeding ${SEED_EMAIL} with every Samfora tag...`);
  await syncSubscriberV2(apiKey, SEED_EMAIL, [], ALL_TAGS);

  console.log('→ Looking up seed subscriber id...');
  const seed = await client.getSubscriber(SEED_EMAIL);
  const rawId = seed?.subscriber?.id;
  if (!rawId) throw new Error('Seed subscriber not found after sync');
  const seedId = Number(rawId);
  console.log(`  id: ${seedId}`);

  console.log('→ Seeding Donation group on seed subscriber (historical=true)...');
  await seedDonationGroup(client, seedId, 'Seed');

  // --- 2. Personas ---
  console.log(`\n→ Creating ${PERSONAS.length} persona subscriber(s)...`);
  const personaIds: Record<string, number> = {};
  for (const p of PERSONAS) {
    console.log(`  — ${p.email} (${p.description})`);
    await syncSubscriberV2(apiKey, p.email, [], p.tags);
    const sub = await client.getSubscriber(p.email);
    const id = Number(sub?.subscriber?.id ?? 0);
    if (!id) throw new Error(`Persona ${p.email} missing after sync`);
    personaIds[p.email] = id;
    if (p.seedDonationGroup) {
      await seedDonationGroup(client, id, p.firstName);
    }
    console.log(`    id: ${id}${p.seedDonationGroup ? ' (+ donation record)' : ''}`);
  }

  // --- 3. Resolve field ids from the seed (after donation group is in place) ---
  console.log('\n→ Resolving custom field ids from seed subscriber...');
  const resolved = await resolveFieldIds(client, seedId);
  console.log(`  ${Object.keys(resolved).length} raw field(s) resolved`);

  // Case-insensitive alias pass — the test account may have pre-existing
  // fields with slightly different casing (e.g. Donation.Firstname vs
  // Donation.FirstName). Mirrors the shopify deploy's handling.
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

  // --- 4. Brand style (preferred / is_default) ---
  console.log('\n→ Resolving preferred brand style (is_default)...');
  const { id: brandStyleId, name: brandName } = await resolvePreferredBrandStyle(
    client,
    brandOverride ? Number(brandOverride) : undefined,
  );
  console.log(`  using "${brandName ?? '-'}" (id ${brandStyleId})`);

  const brandResp = await client.getBrandStyle(brandStyleId);
  if (!brandResp?.data) throw new Error(`Brand style ${brandStyleId} not found`);
  const brandStyle = toBrandStyleConfig(brandResp.data);

  const config: VendorConsumerConfig = {
    brandStyle,
    customFields,
    websiteUrl: WEBSITE_URL,
  };

  console.log('→ Validating config against samfora preset...');
  samforaPreset.validateConfig(config);

  // --- 5. Deploy the 6 automations ---
  const automations = samforaPreset.getAutomations(config);
  console.log(`\n→ Deploying ${automations.length} automation(s)...`);

  const results: Array<{
    name: string;
    automationId: number;
    messageId: number;
    templateId: number;
  }> = [];
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
    console.log(
      `    automail: ${res.automationId}  message: ${res.messageId}  template: ${res.templateId}`,
    );
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

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
