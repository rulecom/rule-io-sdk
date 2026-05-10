/**
 * Find the campaign or automation that owns a given RCML template.
 *
 * Rule.io has no direct template→owner endpoint, so this scans dispatchers
 * (campaigns first, then automations), resolves each one's messages, and
 * checks dynamic-set `template_id` for a match. Scans run concurrently with
 * a configurable cap and short-circuit on the first match.
 *
 * The 1:1 invariant — each template has at most one owner — is enforced by
 * Rule.io's data model and lets us stop scanning automations as soon as a
 * campaign match is found.
 *
 * @public
 */

import { RuleApiError } from '@rule-io/core';
import type { RuleClient } from './client.js';
import type { RuleAutomation, RuleCampaign, RuleMessage } from './types.js';

type DispatcherKind = 'campaign' | 'automation';

interface DispatcherListEntry {
  id?: number;
  name?: string;
  status?: { value: number; key: string; description: string } | null;
  active?: boolean;
}

/**
 * Owner record when a template is used by a campaign.
 *
 * @public
 */
export interface CampaignTemplateOwner {
  kind: 'campaign';
  id: number;
  name: string;
  message_id: number;
  subject: string;
  status: string | null;
}

/**
 * Owner record when a template is used by an automation.
 *
 * @public
 */
export interface AutomationTemplateOwner {
  kind: 'automation';
  id: number;
  name: string;
  message_id: number;
  active: boolean | null;
}

/**
 * Discriminated union of possible template owners.
 *
 * @public
 */
export type TemplateOwner = CampaignTemplateOwner | AutomationTemplateOwner;

/**
 * Per-dispatcher failure that occurred during scanning. The scan continues
 * past these errors so a single misbehaving dispatcher doesn't poison the
 * whole result.
 *
 * @public
 */
export interface PartialScanError {
  dispatcher_kind: DispatcherKind;
  dispatcher_id: number;
  message_id?: number;
  error: string;
  status_code?: number;
}

/**
 * Options for {@link RuleClient.findTemplateOwner}.
 *
 * @public
 */
export interface FindTemplateOwnerOptions {
  /**
   * Max concurrent in-flight `listMessages` and `listDynamicSets` calls.
   * Higher values speed up scans but risk hitting Rule.io rate limits.
   *
   * @defaultValue 10
   */
  concurrency?: number;

  /**
   * Optional signal to abort an in-flight scan. The promise resolves with
   * the partial result accumulated so far when aborted.
   */
  signal?: AbortSignal;
}

/**
 * Result of a template-owner scan. `owner` is `null` when the template is
 * not used (orphaned templates pending Rule.io's CRON cleanup, or
 * templates not yet attached to any dispatcher).
 *
 * @public
 */
export interface FindTemplateOwnerResult {
  owner: TemplateOwner | null;
  scanned: { campaigns: number; automations: number };
  partial_errors: PartialScanError[];
}

const DEFAULT_CONCURRENCY = 10;
const PER_PAGE = 100;

/**
 * Scan dispatchers (campaigns then automations) for the one whose message
 * carries a dynamic-set with the given `template_id`. Exported as a free
 * function for testability; consumers normally call
 * {@link RuleClient.findTemplateOwner}.
 *
 * @public
 */
export async function findTemplateOwner(
  client: RuleClient,
  templateId: number,
  options: FindTemplateOwnerOptions = {}
): Promise<FindTemplateOwnerResult> {
  const concurrency = sanitizeConcurrency(options.concurrency);
  const partialErrors: PartialScanError[] = [];

  const internalAbort = new AbortController();
  const externalSignal = options.signal;

  if (externalSignal?.aborted) {
    return {
      owner: null,
      scanned: { campaigns: 0, automations: 0 },
      partial_errors: [],
    };
  }

  // Track the listener so we can remove it on normal completion. Without
  // this, callers reusing a long-lived signal across many calls would
  // accumulate listeners on it.
  const onExternalAbort = (): void => {
    internalAbort.abort();
  };

  if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const campaignScan = await scanDispatcherKind(
      client,
      'campaign',
      templateId,
      concurrency,
      partialErrors,
      internalAbort
    );

    if (campaignScan.match) {
      return {
        owner: campaignScan.match,
        scanned: { campaigns: campaignScan.scanned, automations: 0 },
        partial_errors: partialErrors,
      };
    }

    if (internalAbort.signal.aborted) {
      return {
        owner: null,
        scanned: { campaigns: campaignScan.scanned, automations: 0 },
        partial_errors: partialErrors,
      };
    }

    const automationScan = await scanDispatcherKind(
      client,
      'automation',
      templateId,
      concurrency,
      partialErrors,
      internalAbort
    );

    return {
      owner: automationScan.match,
      scanned: {
        campaigns: campaignScan.scanned,
        automations: automationScan.scanned,
      },
      partial_errors: partialErrors,
    };
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Coerce a caller-supplied concurrency value into a finite positive integer.
 * Falls back to the default when missing, NaN, Infinity, or otherwise
 * non-finite — guards against `Array(NaN)` blowing up the worker pool.
 */
function sanitizeConcurrency(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_CONCURRENCY;

  return Math.max(1, Math.floor(value));
}

interface KindScanResult {
  match: TemplateOwner | null;
  scanned: number;
}

async function scanDispatcherKind(
  client: RuleClient,
  kind: DispatcherKind,
  templateId: number,
  concurrency: number,
  partialErrors: PartialScanError[],
  internalAbort: AbortController
): Promise<KindScanResult> {
  let match: TemplateOwner | null = null;
  let scanned = 0;
  let page = 1;

  while (!internalAbort.signal.aborted) {
    let dispatchers: DispatcherListEntry[];

    try {
      dispatchers = await listDispatchers(client, kind, page);
    } catch (error) {
      // Top-level list failure aborts the whole kind — there's no salvageable
      // data to scan. Surface it as a synthetic dispatcher_id=0 partial error
      // so the caller sees something happened.
      partialErrors.push({
        dispatcher_kind: kind,
        dispatcher_id: 0,
        ...toErrorFields(error),
      });
      break;
    }

    if (dispatchers.length === 0) break;

    // Probe each dispatcher in parallel (with concurrency cap). The signal
    // lets workers stop claiming new dispatchers as soon as any probe finds
    // a match (probeDispatcher itself triggers the abort on hit), so a match
    // on dispatcher 1 of a page of 100 doesn't burn API calls on 2-100.
    // `pageScanned` is a mutable counter that probeDispatcher increments
    // when it actually starts probing — so the surfaced `scanned` count
    // reflects work done, not items fetched.
    const pageScanned = { count: 0 };
    const probes = await runWithConcurrency(
      dispatchers,
      (d) => probeDispatcher(client, kind, d, templateId, partialErrors, internalAbort, pageScanned),
      concurrency,
      internalAbort.signal
    );

    scanned += pageScanned.count;

    // First non-null result is the match; document order is preserved by
    // runWithConcurrency. probeDispatcher already aborted on match, so any
    // sibling probes mid-flight will have returned null on their next check.
    for (const candidate of probes) {
      if (candidate) {
        match = candidate;
        break;
      }
    }

    if (match || internalAbort.signal.aborted) break;
    if (dispatchers.length < PER_PAGE) break;
    page += 1;
  }

  return { match, scanned };
}

async function listDispatchers(
  client: RuleClient,
  kind: DispatcherKind,
  page: number
): Promise<DispatcherListEntry[]> {
  if (kind === 'campaign') {
    const response = await client.listCampaigns({ page, per_page: PER_PAGE });

    return (response.data ?? []) as DispatcherListEntry[];
  }

  const response = await client.listAutomations({ page, per_page: PER_PAGE });

  return (response.data ?? []) as DispatcherListEntry[];
}

async function probeDispatcher(
  client: RuleClient,
  kind: DispatcherKind,
  dispatcher: DispatcherListEntry,
  templateId: number,
  partialErrors: PartialScanError[],
  internalAbort: AbortController,
  pageScanned: { count: number }
): Promise<TemplateOwner | null> {
  if (dispatcher.id == null) return null;
  if (internalAbort.signal.aborted) return null;

  // Count this dispatcher only after the abort check — so aborted-before-
  // started probes don't inflate the surfaced `scanned` count.
  pageScanned.count += 1;

  const dispatcherId = dispatcher.id;
  const dispatcherType = kind === 'campaign' ? 'campaign' : 'automail';

  let messages: readonly RuleMessage[];

  try {
    const response = await client.listMessages({
      id: dispatcherId,
      dispatcher_type: dispatcherType,
    });

    messages = response.data ?? [];
  } catch (error) {
    partialErrors.push({
      dispatcher_kind: kind,
      dispatcher_id: dispatcherId,
      ...toErrorFields(error),
    });

    return null;
  }

  for (const message of messages) {
    if (internalAbort.signal.aborted) return null;
    if (message.id == null) continue;

    let templateIdForMessage: number | null;

    try {
      templateIdForMessage = await resolveTemplateIdForMessage(client, message.id);
    } catch (error) {
      partialErrors.push({
        dispatcher_kind: kind,
        dispatcher_id: dispatcherId,
        message_id: message.id,
        ...toErrorFields(error),
      });
      continue;
    }

    if (templateIdForMessage === templateId) {
      // Abort eagerly so sibling workers in the current page stop claiming
      // new dispatchers — preserves the "short-circuit on first match"
      // promise. In-flight HTTP calls can't be cancelled (the SDK doesn't
      // wire a signal through fetch yet), but their results are dropped.
      internalAbort.abort();

      return toOwner(kind, dispatcher, dispatcherId, message, message.id);
    }
  }

  return null;
}

async function resolveTemplateIdForMessage(
  client: RuleClient,
  messageId: number
): Promise<number | null> {
  const response = await client.listDynamicSets({ message_id: messageId });

  for (const ds of response.data ?? []) {
    if (ds.template_id != null) return ds.template_id;
  }

  return null;
}

function toOwner(
  kind: DispatcherKind,
  dispatcher: DispatcherListEntry,
  dispatcherId: number,
  message: RuleMessage,
  messageId: number
): TemplateOwner {
  if (kind === 'campaign') {
    const camp = dispatcher as RuleCampaign;

    return {
      kind: 'campaign',
      id: dispatcherId,
      name: camp.name,
      message_id: messageId,
      subject: message.subject,
      status: extractCampaignStatus(camp),
    };
  }

  const auto = dispatcher as RuleAutomation;

  return {
    kind: 'automation',
    id: dispatcherId,
    name: auto.name,
    message_id: messageId,
    active: auto.active ?? null,
  };
}

function extractCampaignStatus(camp: RuleCampaign): string | null {
  const status = camp.status as RuleCampaign['status'] | string | undefined;

  if (status == null) return null;
  if (typeof status === 'string') return status;

  if (typeof status === 'object' && 'key' in status) {
    return (status as { key?: string }).key ?? null;
  }

  return null;
}

function toErrorFields(error: unknown): { error: string; status_code?: number } {
  if (error instanceof RuleApiError) {
    return {
      error: `Rule.io API error (${String(error.statusCode)}): ${error.message}`,
      status_code: error.statusCode,
    };
  }

  return {
    error: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Concurrency-limited map. Preserves input order in the output array.
 * Errors thrown by `fn` propagate (caller must handle them inside `fn`).
 *
 * If `signal` is provided, workers stop claiming new indices as soon as
 * the signal aborts. Slots for not-yet-claimed indices are populated with
 * `null`, so the output array length always matches the input.
 */
async function runWithConcurrency<T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R | null>,
  concurrency: number,
  signal?: AbortSignal
): Promise<(R | null)[]> {
  if (items.length === 0) return [];

  const results: (R | null)[] = new Array(items.length).fill(null);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      if (signal?.aborted) return;
      const idx = nextIndex;

      nextIndex += 1;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);

  return results;
}
