/**
 * `rule-io list-automations` — list the most recently created automations in
 * the account, or print editor URLs for specific automation ids.
 */

import type { Command } from 'commander';
import { type RuleClient } from '@rule-io/client';
import type { RuleAutomation } from '@rule-io/client';
import { createClient } from '../shared/client.js';

type ListedAutomation = RuleAutomation & {
  created_at?: string;
  updated_at?: string;
};

async function listRecent(client: RuleClient, limit: number): Promise<void> {
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
    String(y.created_at ?? '').localeCompare(String(x.created_at ?? '')),
  );

  console.log(`Total returned: ${rows.length}`);
  console.table(rows.slice(0, limit));
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
          `https://app.rule.io/v5/#/app/automations/automail/${id}/v6/email/${m.id}/edit`,
      );
    }
  }
}

export function registerListAutomations(program: Command): void {
  const cmd = program
    .command('list-automations')
    .description('List recent automations in the Rule.io account.')
    .option('--api-key <key>', 'Rule.io API key (defaults to $RULE_API_KEY)')
    .option('--limit <n>', 'Maximum rows to display', (v) => Number(v), 20)
    .action(async (opts: { apiKey?: string; limit: number }) => {
      const client = createClient({ apiKey: opts.apiKey });

      await listRecent(client, opts.limit);
    });

  cmd
    .command('urls <ids...>')
    .description('Print editor URLs for the given automation ids.')
    .option('--api-key <key>', 'Rule.io API key (defaults to $RULE_API_KEY)')
    .action(
      async (
        idArgs: string[],
        opts: { apiKey?: string },
      ): Promise<void> => {
        const ids = idArgs
          .map((a) => Number(a))
          .filter((n) => Number.isInteger(n) && n > 0);

        if (!ids.length) throw new Error('Pass at least one automation id');
        const client = createClient({ apiKey: opts.apiKey });

        await printUrls(client, ids);
      },
    );
}
