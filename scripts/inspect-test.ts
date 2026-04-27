/**
 * One-off probe: report what's already in the test account so we know what
 * brand styles, custom fields, and Shopify tags we have to work with.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RuleClient, SHOPIFY_FIELDS, SHOPIFY_TAGS } from '@rule-io/sdk';

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

async function main(): Promise<void> {
  loadEnv();
  const apiKey = process.env.RULE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing RULE_API_KEY environment variable. Set it in your shell or .env before running scripts/inspect-test.ts.'
    );
  }
  const client = new RuleClient({ apiKey });

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
    console.log(`  ${key.padEnd(18)} "${name}"  ${id ? 'id=' + id : 'MISSING'}`);
  }

  console.log('\n=== Shopify custom fields — check which exist ===');
  // Rule.io v2 exposes fields per-subscriber. Try to find any subscriber and
  // inspect their field groups so we can see what's defined.
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
  const shopifyish = items.filter(
    (a) => /shopify|order|cart|ship|cancel|return/i.test(a.name ?? '')
  );
  console.log(`  ${shopifyish.length} matching automails:`);
  shopifyish.forEach((a) => console.log(`  ${a.id}  active=${a.active}  ${a.name}`));

  console.log('\nReference: SDK expects these Shopify field names:');
  for (const [key, name] of Object.entries(SHOPIFY_FIELDS)) {
    console.log(`  ${key.padEnd(20)} -> "${name}"`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
