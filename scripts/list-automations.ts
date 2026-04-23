/**
 * One-off probe: list the most recently created automations in the account.
 * Usage:
 *   npx tsx scripts/list-automations.ts                # list recent automations
 *   npx tsx scripts/list-automations.ts urls 1 2 3     # print edit URLs for ids
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RuleClient } from '../src';
import type { RuleAutomation } from '../src';

type ListedAutomation = RuleAutomation & {
  created_at?: string;
  updated_at?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

function loadEnv(): void {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
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

async function listRecent(client: RuleClient): Promise<void> {
  const resp = await client.listAutomations({ per_page: 50 });
  const list = (resp.data ?? []) as ListedAutomation[];

  const rows = list.map((a) => ({
    id: a.id,
    name: a.name,
    active: a.active,
    sendout_type: a.sendout_type?.key ?? '',
    trigger: `${a.trigger?.type ?? '?'}:${a.trigger?.id ?? '?'}`,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }));

  rows.sort((x, y) =>
    String(y.created_at ?? '').localeCompare(String(x.created_at ?? ''))
  );

  console.log(`Total returned: ${rows.length}`);
  console.table(rows.slice(0, 20));
}

async function printUrls(client: RuleClient, ids: number[]): Promise<void> {
  for (const id of ids) {
    const msgs = await client.listMessages({ id, dispatcher_type: 'automail' });
    const messages = msgs.data ?? [];
    if (!messages.length) {
      console.log(`${id}: no message found`);
      continue;
    }
    if (messages.length > 1) {
      console.log(`${id}: ${messages.length} messages — printing URL for each`);
    }
    for (const m of messages) {
      if (!m.id) continue;
      console.log(
        `${id} (message ${m.id}): ` +
          `https://app.rule.io/v5/#/app/automations/automail/${id}/v6/email/${m.id}/edit`
      );
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  const apiKey = process.env.RULE_API_KEY;
  if (!apiKey) throw new Error('Missing RULE_API_KEY in environment or .env');
  const client = new RuleClient({ apiKey });

  const cmd = process.argv[2];
  if (cmd === 'urls') {
    const ids = process.argv
      .slice(3)
      .map((a) => Number(a))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) throw new Error('Pass at least one automation id');
    await printUrls(client, ids);
  } else {
    await listRecent(client);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
