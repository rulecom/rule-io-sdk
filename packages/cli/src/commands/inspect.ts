/**
 * `rule-io inspect` — diagnostic probe: report what brand styles, tags,
 * custom fields, and Shopify-like automations already exist in the target
 * Rule.io account.
 *
 * Originally the internal `scripts/inspect-test.ts` probe used by the SDK
 * team to check a fresh test account before running `rule-io deploy shopify`.
 * Useful for external integrators too when onboarding a new Rule.io account.
 */

import type { Command } from 'commander';
import { SHOPIFY_FIELDS, SHOPIFY_TAGS } from '@rule-io/vendor-shopify';
import { createClient } from '../shared/client.js';

interface Options {
  apiKey?: string;
}

async function run(opts: Options): Promise<void> {
  const apiKey = opts.apiKey ?? process.env['RULE_API_KEY'];
  if (!apiKey) throw new Error('Missing RULE_API_KEY in environment or .env');
  const client = createClient({ apiKey });

  console.log('=== Brand styles ===');
  try {
    const res = await client.listBrandStyles();
    const items = (res.data ?? []) as Array<{ id: number; name?: string; domain?: string }>;
    console.log(`  count: ${items.length}`);
    items.slice(0, 20).forEach((b) => console.log(`  ${b.id}  ${b.name ?? '-'}  ${b.domain ?? ''}`));
  } catch (e) {
    console.log('  ERROR:', (e as Error).message);
  }

  console.log('\n=== Shopify tags — check which exist ===');
  const tagRes = await client.getTags();
  const tagMap = new Map<string, number>();
  for (const t of tagRes.tags ?? []) {
    if (t.name && t.id !== undefined) tagMap.set(t.name, t.id);
  }
  for (const [key, name] of Object.entries(SHOPIFY_TAGS)) {
    const id = tagMap.get(name);
    console.log(`  ${key.padEnd(18)} "${name}"  ${id ? 'id=' + String(id) : 'MISSING'}`);
  }

  console.log('\n=== Shopify custom fields — check which exist ===');
  try {
    const listRes = await fetch('https://app.rule.io/api/v2/subscribers?limit=5', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (listRes.ok) {
      const body = (await listRes.json()) as { subscribers?: Array<{ email?: string }> };
      const first = body.subscribers?.[0]?.email;
      if (first) {
        console.log(`  inspecting subscriber ${first}`);
        const fields = await client.getSubscriberFields(first);
        console.log('  raw response keys:', Object.keys(fields as object));
        console.log('  raw:', JSON.stringify(fields, null, 2).slice(0, 2000));
      } else {
        console.log('  no subscribers found — fields unknown until one is synced');
      }
    } else {
      console.log('  list subscribers failed:', listRes.status);
    }
  } catch (e) {
    console.log('  ERROR:', (e as Error).message);
  }

  console.log('\n=== Check Shopify-like automails ===');
  const autos = await client.listAutomations({ per_page: 50 });
  const items = (autos.data ?? []) as Array<{ id: number; name?: string; active?: boolean }>;
  const shopifyish = items.filter((a) => /shopify|order|cart|ship|cancel|return/i.test(a.name ?? ''));
  console.log(`  ${shopifyish.length} matching automails:`);
  shopifyish.forEach((a) => console.log(`  ${a.id}  active=${String(a.active)}  ${a.name}`));

  console.log('\nReference: SDK expects these Shopify field names:');
  for (const [key, name] of Object.entries(SHOPIFY_FIELDS)) {
    console.log(`  ${key.padEnd(20)} -> "${name}"`);
  }
}

export function registerInspect(program: Command): void {
  program
    .command('inspect')
    .description('Probe a Rule.io account — report brand styles, Shopify tags/fields, and Shopify-like automations.')
    .option('--api-key <key>', 'Rule.io API key (defaults to $RULE_API_KEY)')
    .action(run);
}
