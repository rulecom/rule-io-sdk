/**
 * `rule-io clone-email` — copy an automation email between Rule.io accounts.
 *
 * Subcommands:
 *   - `fetch`: snapshot a source automail + message + dynamic sets + templates
 *     to a local JSON file.
 *   - `send`: recreate the snapshot in the current `RULE_API_KEY` account,
 *     re-linking the trigger tag and stripping the source brand-style id.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { Command } from 'commander';
import type {
  RuleAutomationResponse,
  RuleDynamicSetResponse,
  RuleMessageResponse,
  RuleTemplateResponse,
} from '@rule-io/client';
import type { RCMLDocument } from '@rule-io/rcml';
import { createClient } from '../shared/client.js';

interface EmailSnapshot {
  source: {
    automail_id: number;
    message_id: number;
    fetched_at: string;
  };
  automail: RuleAutomationResponse;
  message: RuleMessageResponse;
  dynamic_sets: RuleDynamicSetResponse[];
  templates: RuleTemplateResponse[];
}

interface FetchOptions {
  apiKey?: string;
  automail: string;
  message: string;
  out?: string;
}

async function runFetch(opts: FetchOptions): Promise<void> {
  const client = createClient({ apiKey: opts.apiKey });
  const automailId = Number(opts.automail);
  const messageId = Number(opts.message);
  if (!Number.isInteger(automailId) || automailId <= 0) {
    throw new Error(`Invalid --automail value "${opts.automail}"`);
  }
  if (!Number.isInteger(messageId) || messageId <= 0) {
    throw new Error(`Invalid --message value "${opts.message}"`);
  }

  console.log(`Fetching automail ${automailId}...`);
  const automail = await client.getAutomation(automailId);
  if (!automail) throw new Error(`Automail ${automailId} not found`);

  console.log(`Fetching message ${messageId}...`);
  const message = await client.getMessage(messageId);
  if (!message) throw new Error(`Message ${messageId} not found`);

  console.log(`Listing dynamic sets for message ${messageId}...`);
  const dynSetsResponse = await client.listDynamicSets({ message_id: messageId });
  const rawSets =
    (dynSetsResponse as { data?: unknown }).data ??
    (dynSetsResponse as { dynamic_sets?: unknown }).dynamic_sets ??
    [];
  const sets = Array.isArray(rawSets) ? (rawSets as RuleDynamicSetResponse[]) : [];
  console.log(`  Found ${sets.length} dynamic set(s)`);

  const templates: RuleTemplateResponse[] = [];
  for (const set of sets) {
    const templateId =
      (set as { template_id?: number }).template_id ??
      (set as { data?: { template_id?: number } }).data?.template_id;
    if (!templateId) {
      console.warn(`  Dynamic set missing template_id, skipping`);
      continue;
    }
    console.log(`  Fetching template ${templateId}...`);
    const tpl = await client.getTemplate(templateId);
    if (tpl) templates.push(tpl);
  }

  const snapshot: EmailSnapshot = {
    source: {
      automail_id: automailId,
      message_id: messageId,
      fetched_at: new Date().toISOString(),
    },
    automail,
    message,
    dynamic_sets: sets,
    templates,
  };

  const outDir = opts.out ?? join(process.cwd(), 'email-snapshots');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `automail-${automailId}.json`);
  writeFileSync(outFile, JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log(`\n✓ Saved snapshot to ${outFile}`);
  console.log(`  automail: ${automailId}`);
  console.log(`  message:  ${messageId}`);
  console.log(`  dynamic sets: ${sets.length}`);
  console.log(`  templates: ${templates.length}`);
}

function stripBrandStyleId(template: RCMLDocument): RCMLDocument {
  const cloned = JSON.parse(JSON.stringify(template)) as RCMLDocument;
  const head = cloned.children?.find(
    (c) => (c as { tagName?: string }).tagName === 'rc-head',
  ) as { children?: { tagName?: string }[] } | undefined;
  if (head?.children) {
    head.children = head.children.filter((c) => c.tagName !== 'rc-brand-style');
  }
  return cloned;
}

interface SendOptions {
  apiKey?: string;
  snapshot: string;
  tag?: string;
  activate?: boolean;
}

async function runSend(opts: SendOptions): Promise<void> {
  const client = createClient({ apiKey: opts.apiKey });
  const tagName = opts.tag ?? 'OrderCompleted';
  const activate = opts.activate ?? false;

  const absPath = isAbsolute(opts.snapshot) ? opts.snapshot : join(process.cwd(), opts.snapshot);
  if (!existsSync(absPath)) throw new Error(`Snapshot not found: ${absPath}`);

  const snapshot = JSON.parse(readFileSync(absPath, 'utf-8')) as EmailSnapshot;
  const srcAutomail = snapshot.automail.data as unknown as Record<string, unknown> | undefined;
  const srcMessage = snapshot.message.data as unknown as Record<string, unknown> | undefined;
  const srcTemplate = snapshot.templates[0]?.data as unknown as
    | { template?: RCMLDocument; name?: string }
    | undefined;
  if (!srcAutomail || !srcMessage || !srcTemplate?.template) {
    throw new Error('Snapshot missing automail/message/template data');
  }

  console.log(`Looking up tag "${tagName}" in target account...`);
  const tagId = await client.getTagIdByName(tagName);
  if (!tagId) {
    throw new Error(
      `Tag "${tagName}" not found in target account. Create it first (e.g. syncSubscriber with tags: ["${tagName}"]).`,
    );
  }
  console.log(`  tag id: ${tagId}`);

  const srcSendoutValue = (srcAutomail.sendout_type as { value?: number } | undefined)?.value;
  const sendoutType = srcSendoutValue === 1 ? 1 : 2;
  const automailName = `${srcAutomail.name as string} (cloned ${new Date().toISOString().slice(0, 10)})`;

  console.log(`Creating automail "${automailName}"...`);
  const automailResp = await client.createAutomation({
    name: automailName,
    trigger: { type: 'TAG', id: tagId },
    sendout_type: sendoutType,
  });
  const automailId = automailResp.data?.id;
  if (!automailId) throw new Error('Automail create: no id returned');
  console.log(`  automail id: ${automailId}`);

  const created: Array<{ kind: string; id: number }> = [{ kind: 'automail', id: automailId }];

  try {
    const sender =
      (srcMessage.sender as { name?: string | null; email?: string | null } | null) ?? null;
    console.log('Creating message...');
    const messageResp = await client.createMessage({
      dispatcher: { id: automailId, type: 'automail' },
      type: 1,
      subject: srcMessage.subject as string,
      preheader: (srcMessage.pre_header as string | null) ?? undefined,
      from_name: sender?.name ?? undefined,
      from_email: sender?.email ?? undefined,
      automail_setting: {
        active: true,
        delay_in_seconds: String(
          (srcMessage.automail_setting as { delay?: number } | undefined)?.delay ?? 0,
        ),
      },
    });
    const messageId = messageResp.data?.id;
    if (!messageId) throw new Error('Message create: no id returned');
    console.log(`  message id: ${messageId}`);
    created.push({ kind: 'message', id: messageId });

    console.log('Creating template (brand-style id stripped)...');
    const strippedTemplate = stripBrandStyleId(srcTemplate.template);
    const tplResp = await client.createTemplate({
      message_id: messageId,
      name: `${srcTemplate.name ?? 'Cloned'} - ${Date.now()}`,
      message_type: 'email',
      template: strippedTemplate,
    });
    const templateId = tplResp.data?.id;
    if (!templateId) throw new Error('Template create: no id returned');
    console.log(`  template id: ${templateId}`);
    created.push({ kind: 'template', id: templateId });

    console.log('Creating dynamic set...');
    const dsResp = await client.createDynamicSet({
      message_id: messageId,
      template_id: templateId,
    });
    const dynamicSetId = dsResp.data?.id;
    if (!dynamicSetId) throw new Error('Dynamic set create: no id returned');
    console.log(`  dynamic set id: ${dynamicSetId}`);

    const utmCampaign = (srcMessage.utm_campaign as string | null) ?? undefined;
    const utmTerm = (srcMessage.utm_term as string | null) ?? undefined;
    if (utmCampaign !== undefined || utmTerm !== undefined) {
      console.log('Applying dynamic-set metadata (utm_campaign/utm_term)...');
      await client.updateDynamicSet(dynamicSetId, {
        message_id: messageId,
        template_id: templateId,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
      });
    }

    if (activate) {
      console.log('Activating automail...');
      await client.updateAutomation(automailId, {
        name: automailName,
        active: true,
        trigger: { type: 'TAG', id: tagId },
        sendout_type: sendoutType,
      });
    }

    console.log('\n✓ Clone complete');
    console.log(`  automail:    ${automailId}  (active=${activate ? 'true' : 'false'})`);
    console.log(`  message:     ${messageId}`);
    console.log(`  template:    ${templateId}`);
    console.log(`  dynamic set: ${dynamicSetId}`);
    console.log(
      `  edit: https://app.rule.io/v5/#/app/automations/automail/${automailId}/v6/email/${messageId}/edit`,
    );
  } catch (err) {
    console.error('\nSend failed, cleaning up created resources...');
    for (const r of created.reverse()) {
      try {
        if (r.kind === 'automail') await client.deleteAutomation(r.id);
        else if (r.kind === 'message') await client.deleteMessage(r.id);
        else if (r.kind === 'template') await client.deleteTemplate(r.id);
        console.log(`  deleted ${r.kind} ${r.id}`);
      } catch (cleanupErr) {
        console.error(`  failed to delete ${r.kind} ${r.id}:`, cleanupErr);
      }
    }
    throw err;
  }
}

export function registerCloneEmail(program: Command): void {
  const cloneEmail = program
    .command('clone-email')
    .description('Copy an automation email between Rule.io accounts via a local JSON snapshot.');

  cloneEmail
    .command('fetch')
    .description('Snapshot a source automail + message + templates into email-snapshots/.')
    .requiredOption('--automail <id>', 'Source automail id')
    .requiredOption('--message <id>', 'Source message id')
    .option('--api-key <key>', 'Source-account API key (defaults to $RULE_API_KEY)')
    .option('--out <dir>', 'Output directory (default: ./email-snapshots)')
    .action(runFetch);

  cloneEmail
    .command('send')
    .description('Recreate a snapshot in the target account (uses $RULE_API_KEY).')
    .requiredOption('--snapshot <path>', 'Path to the snapshot JSON produced by `fetch`')
    .option('--api-key <key>', 'Target-account API key (defaults to $RULE_API_KEY)')
    .option('--tag <name>', 'Trigger tag name in the target account', 'OrderCompleted')
    .option('--activate', 'Activate the automation after creating it')
    .action(runSend);
}
