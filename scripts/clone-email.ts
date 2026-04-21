/**
 * Clone an automation email from one Rule.io account into another.
 *
 * Usage:
 *   npx tsx scripts/clone-email.ts fetch \
 *     --api-key=<prod-key> --automail=29150 --message=38101
 *
 *   npx tsx scripts/clone-email.ts send \
 *     --snapshot=email-snapshots/automail-29150.json \
 *     --tag=OrderCompleted
 *
 * The script loads key/value pairs from .env into process.env when present.
 * `fetch` uses RULE_API_KEY from the environment unless --api-key is passed.
 * `send` uses RULE_API_KEY from the environment.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RuleClient } from '../src';
import type {
  RuleAutomationResponse,
  RuleMessageResponse,
  RuleTemplateResponse,
  RuleDynamicSetResponse,
  RCMLDocument,
} from '../src';

// ---------------------------------------------------------------------------
// Env / args
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

function loadEnv(): void {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

// ---------------------------------------------------------------------------
// Snapshot shape
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// fetch
// ---------------------------------------------------------------------------

async function runFetch(): Promise<void> {
  const apiKey = getArg('api-key') ?? process.env.RULE_API_KEY;
  const automailId = Number(getArg('automail'));
  const messageId = Number(getArg('message'));

  if (!apiKey) throw new Error('Missing --api-key or RULE_API_KEY');
  if (!automailId) throw new Error('Missing --automail=<id>');
  if (!messageId) throw new Error('Missing --message=<id>');

  const client = new RuleClient({ apiKey });

  console.log(`Fetching automail ${automailId}...`);
  const automail = await client.getAutomation(automailId);
  if (!automail) throw new Error(`Automail ${automailId} not found`);

  console.log(`Fetching message ${messageId}...`);
  const message = await client.getMessage(messageId);
  if (!message) throw new Error(`Message ${messageId} not found`);

  console.log(`Listing dynamic sets for message ${messageId}...`);
  const dynSetsResponse = await client.listDynamicSets({ message_id: messageId });
  // Response shape: { data: [...] } or { dynamic_sets: [...] } — normalize.
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

  const outDir = join(ROOT, 'email-snapshots');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `automail-${automailId}.json`);
  writeFileSync(outFile, JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log(`\n✓ Saved snapshot to ${outFile}`);
  console.log(`  automail: ${automailId}`);
  console.log(`  message:  ${messageId}`);
  console.log(`  dynamic sets: ${sets.length}`);
  console.log(`  templates: ${templates.length}`);
}

// ---------------------------------------------------------------------------
// send
// ---------------------------------------------------------------------------

/**
 * Remove the `rc-brand-style` element from the template's `rc-head`.
 * The cloned account has its own brand-style id, so the source id (9616) would
 * fail to resolve. Removing the element lets the editor pick its default.
 */
function stripBrandStyleId(template: RCMLDocument): RCMLDocument {
  const cloned = JSON.parse(JSON.stringify(template)) as RCMLDocument;
  const head = cloned.children?.find(
    (c) => (c as { tagName?: string }).tagName === 'rc-head'
  ) as { children?: { tagName?: string }[] } | undefined;
  if (head?.children) {
    head.children = head.children.filter((c) => c.tagName !== 'rc-brand-style');
  }
  return cloned;
}

async function runSend(): Promise<void> {
  const apiKey = process.env.RULE_API_KEY;
  const snapshotPath = getArg('snapshot');
  const tagName = getArg('tag') ?? 'OrderCompleted';
  const activate = process.argv.includes('--activate');

  if (!apiKey) throw new Error('Missing RULE_API_KEY in .env');
  if (!snapshotPath) throw new Error('Missing --snapshot=<path>');

  const absPath = isAbsolute(snapshotPath)
    ? snapshotPath
    : join(ROOT, snapshotPath);
  if (!existsSync(absPath)) throw new Error(`Snapshot not found: ${absPath}`);

  const snapshot = JSON.parse(readFileSync(absPath, 'utf-8')) as EmailSnapshot;
  const srcAutomail = snapshot.automail.data as unknown as
    | Record<string, unknown>
    | undefined;
  const srcMessage = snapshot.message.data as unknown as
    | Record<string, unknown>
    | undefined;
  const srcTemplate = snapshot.templates[0]?.data as unknown as
    | { template?: RCMLDocument; name?: string }
    | undefined;
  if (!srcAutomail || !srcMessage || !srcTemplate?.template) {
    throw new Error('Snapshot missing automail/message/template data');
  }

  const client = new RuleClient({ apiKey });

  // 1. Resolve trigger tag id in test account
  console.log(`Looking up tag "${tagName}" in test account...`);
  const tagId = await client.getTagIdByName(tagName);
  if (!tagId) {
    throw new Error(
      `Tag "${tagName}" not found in test account. Create it first ` +
        `(e.g. syncSubscriber with tags: ["${tagName}"]).`
    );
  }
  console.log(`  tag id: ${tagId}`);

  // 2. Create automail — mirror source name + sendout_type
  const srcSendoutValue = (srcAutomail.sendout_type as { value?: number } | undefined)
    ?.value;
  const sendoutType = srcSendoutValue === 1 ? 1 : 2; // default to transactional
  const automailName = `${srcAutomail.name as string} (cloned ${new Date()
    .toISOString()
    .slice(0, 10)})`;

  console.log(`Creating automail "${automailName}"...`);
  const automailResp = await client.createAutomation({
    name: automailName,
    trigger: { type: 'TAG', id: tagId },
    sendout_type: sendoutType,
  });
  const automailId = automailResp.data?.id;
  if (!automailId) throw new Error('Automail create: no id returned');
  console.log(`  automail id: ${automailId}`);

  const created: Array<{ kind: string; id: number }> = [
    { kind: 'automail', id: automailId },
  ];

  try {
    // 3. Create message — include utm + sender + automail_setting via extra fields
    const sender = (srcMessage.sender as {
      name?: string | null;
      email?: string | null;
    } | null) ?? null;
    const messageBody: Record<string, unknown> = {
      dispatcher: { id: automailId, type: 'automail' },
      type: 1,
      subject: srcMessage.subject as string,
      preheader: (srcMessage.pre_header as string | null) ?? undefined,
      from_name: sender?.name ?? undefined,
      from_email: sender?.email ?? undefined,
      utm_campaign: (srcMessage.utm_campaign as string | null) ?? undefined,
      utm_term: (srcMessage.utm_term as string | null) ?? undefined,
      automail_setting: {
        active: true,
        delay_in_seconds: String(
          (srcMessage.automail_setting as { delay?: number } | undefined)?.delay ?? 0
        ),
      },
    };
    console.log('Creating message...');
    const messageResp = await client.createMessage(
      messageBody as unknown as Parameters<typeof client.createMessage>[0]
    );
    const messageId = messageResp.data?.id;
    if (!messageId) throw new Error('Message create: no id returned');
    console.log(`  message id: ${messageId}`);
    created.push({ kind: 'message', id: messageId });

    // 4. Create template (strip brand-style id, append timestamp to name for uniqueness)
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

    // 5. Create dynamic set linking message → template
    console.log('Creating dynamic set...');
    const dsResp = await client.createDynamicSet({
      message_id: messageId,
      template_id: templateId,
    });
    const dynamicSetId = dsResp.data?.id;
    if (!dynamicSetId) throw new Error('Dynamic set create: no id returned');
    console.log(`  dynamic set id: ${dynamicSetId}`);

    // 6. Optionally activate
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
      `  edit: https://app.rule.io/v5/#/app/automations/automail/${automailId}/v6/email/${messageId}/edit`
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

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  loadEnv();
  const cmd = process.argv[2];
  if (cmd === 'fetch') await runFetch();
  else if (cmd === 'send') await runSend();
  else {
    console.error('Usage: clone-email.ts <fetch|send> [...args]');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
