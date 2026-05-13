/**
 * Unit tests for findTemplateOwner.
 *
 * These tests stub the four RuleClient methods that the scanner consults
 * (listCampaigns, listAutomations, listMessages, listDynamicSets) rather
 * than the underlying fetch — that lets us assert directly on scan order,
 * concurrency behaviour, and error-collection without recreating the HTTP
 * envelope for every fixture.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleApiError } from './errors.js';
import { RuleClient } from './client.js';
import { findTemplateOwner } from './find-template-owner.js';

interface DispatcherFixture {
  id: number;
  name: string;
  /** message_id → template_id (or null = no template). null entries seed listDynamicSets to return no template. */
  messages: Array<{ id: number; subject: string; templateId: number | null }>;
}

function buildClient(opts: {
  campaignsPages?: DispatcherFixture[][];
  automationsPages?: DispatcherFixture[][];
  /** Per-dispatcher listMessages override (kind:id keyed). Throws if value is an Error. */
  listMessagesErrors?: Map<string, Error>;
  /** Per-message listDynamicSets override. Throws if value is an Error. */
  listDynamicSetsErrors?: Map<number, Error>;
  /** Records every call site so we can assert on parallelism/order. */
  callLog?: string[];
}): RuleClient {
  const client = new RuleClient('test-key');
  const {
    campaignsPages = [[]],
    automationsPages = [[]],
    listMessagesErrors = new Map(),
    listDynamicSetsErrors = new Map(),
    callLog,
  } = opts;

  const dispatcherById = new Map<string, DispatcherFixture>();

  for (const page of campaignsPages) for (const d of page) dispatcherById.set(`campaign:${String(d.id)}`, d);
  for (const page of automationsPages) for (const d of page) dispatcherById.set(`automation:${String(d.id)}`, d);

  vi.spyOn(client, 'listCampaigns').mockImplementation(async ({ page = 1 } = {}) => {
    callLog?.push(`listCampaigns:${String(page)}`);
    const data = campaignsPages[page - 1] ?? [];

    return { data: data.map((d) => ({ id: d.id, name: d.name })) } as never;
  });
  vi.spyOn(client, 'listAutomations').mockImplementation(async ({ page = 1 } = {}) => {
    callLog?.push(`listAutomations:${String(page)}`);
    const data = automationsPages[page - 1] ?? [];

    return { data: data.map((d) => ({ id: d.id, name: d.name, active: true })) } as never;
  });
  vi.spyOn(client, 'listMessages').mockImplementation(async ({ id, dispatcher_type }) => {
    const kind = dispatcher_type === 'automail' ? 'automation' : 'campaign';
    const key = `${kind}:${String(id)}`;

    callLog?.push(`listMessages:${key}`);
    const err = listMessagesErrors.get(key);

    if (err) throw err;
    const dispatcher = dispatcherById.get(key);

    return {
      data: (dispatcher?.messages ?? []).map((m) => ({ id: m.id, subject: m.subject, name: m.subject })),
    } as never;
  });
  vi.spyOn(client, 'listDynamicSets').mockImplementation(async ({ message_id }) => {
    callLog?.push(`listDynamicSets:${String(message_id)}`);
    const err = listDynamicSetsErrors.get(message_id);

    if (err) throw err;
    let templateId: number | null = null;

    for (const d of dispatcherById.values()) {
      const hit = d.messages.find((m) => m.id === message_id);

      if (hit) { templateId = hit.templateId; break; }
    }

    if (templateId == null) return { data: [] } as never;

    return { data: [{ id: 1, message_id, template_id: templateId }] } as never;
  });

  return client;
}

describe('findTemplateOwner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when there are no dispatchers at all', async () => {
    const client = buildClient({});
    const result = await findTemplateOwner(client, 42);

    expect(result.owner).toBeNull();
    expect(result.scanned).toEqual({ campaigns: 0, automations: 0 });
    expect(result.partial_errors).toEqual([]);
  });

  it('finds a campaign owner and reports campaign details', async () => {
    const client = buildClient({
      campaignsPages: [[
        { id: 11, name: 'Promo', messages: [{ id: 101, subject: 'Hi', templateId: 42 }] },
      ]],
      automationsPages: [[]],
    });
    const result = await findTemplateOwner(client, 42);

    expect(result.owner).toEqual({
      kind: 'campaign',
      id: 11,
      name: 'Promo',
      message_id: 101,
      subject: 'Hi',
      status: null,
    });
    expect(result.scanned).toEqual({ campaigns: 1, automations: 0 });
    expect(result.partial_errors).toEqual([]);
  });

  it('skips automations entirely when a campaign already matched (1:1 invariant)', async () => {
    const callLog: string[] = [];
    const client = buildClient({
      campaignsPages: [[
        { id: 11, name: 'Promo', messages: [{ id: 101, subject: 'Hi', templateId: 42 }] },
      ]],
      automationsPages: [[
        { id: 22, name: 'Welcome', messages: [{ id: 201, subject: 'W', templateId: 42 }] },
      ]],
      callLog,
    });
    const result = await findTemplateOwner(client, 42);

    expect(result.owner?.kind).toBe('campaign');
    expect(callLog.some((c) => c.startsWith('listAutomations'))).toBe(false);
    expect(result.scanned.automations).toBe(0);
  });

  it('falls through to automations when no campaign matches', async () => {
    const client = buildClient({
      campaignsPages: [[
        { id: 11, name: 'Promo', messages: [{ id: 101, subject: 'Hi', templateId: 99 }] },
      ]],
      automationsPages: [[
        { id: 22, name: 'Welcome', messages: [{ id: 201, subject: 'W', templateId: 42 }] },
      ]],
    });
    const result = await findTemplateOwner(client, 42);

    expect(result.owner).toEqual({
      kind: 'automation',
      id: 22,
      name: 'Welcome',
      message_id: 201,
      active: true,
    });
    expect(result.scanned).toEqual({ campaigns: 1, automations: 1 });
  });

  it('paginates through multiple pages of campaigns until match found', async () => {
    const PER_PAGE = 100;
    const fillerPage = (offset: number): DispatcherFixture[] =>
      Array.from({ length: PER_PAGE }, (_, i) => ({
        id: offset + i,
        name: `c${String(offset + i)}`,
        messages: [{ id: 1000 + offset + i, subject: 's', templateId: 99 }],
      }));
    const client = buildClient({
      campaignsPages: [
        fillerPage(0),
        [{ id: 999, name: 'target', messages: [{ id: 9001, subject: 'hit', templateId: 42 }] }],
      ],
      automationsPages: [[]],
    });
    const result = await findTemplateOwner(client, 42);

    expect(result.owner?.id).toBe(999);
    expect(result.scanned.campaigns).toBe(PER_PAGE + 1);
  });

  it('continues past a listMessages failure and records a partial_error', async () => {
    const errors = new Map<string, Error>();

    errors.set('campaign:11', new RuleApiError('boom', 500));
    const client = buildClient({
      campaignsPages: [[
        { id: 11, name: 'Broken', messages: [] },
        { id: 12, name: 'Good', messages: [{ id: 121, subject: 'hi', templateId: 42 }] },
      ]],
      automationsPages: [[]],
      listMessagesErrors: errors,
    });
    const result = await findTemplateOwner(client, 42);

    expect(result.owner?.id).toBe(12);
    expect(result.partial_errors).toHaveLength(1);
    expect(result.partial_errors[0]).toMatchObject({
      dispatcher_kind: 'campaign',
      dispatcher_id: 11,
      status_code: 500,
    });
  });

  it('continues past a listDynamicSets failure and records the message_id', async () => {
    const errors = new Map<number, Error>();

    errors.set(101, new Error('lookup failed'));
    const client = buildClient({
      campaignsPages: [[
        { id: 11, name: 'A', messages: [
          { id: 101, subject: 'x', templateId: 42 },
          { id: 102, subject: 'y', templateId: 42 },
        ] },
      ]],
      automationsPages: [[]],
      listDynamicSetsErrors: errors,
    });
    const result = await findTemplateOwner(client, 42);

    expect(result.owner?.message_id).toBe(102);
    expect(result.partial_errors).toHaveLength(1);
    expect(result.partial_errors[0]).toMatchObject({
      dispatcher_kind: 'campaign',
      dispatcher_id: 11,
      message_id: 101,
    });
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['negative', -5],
    ['zero', 0],
    ['fractional', 2.7],
  ])('sanitises invalid concurrency value (%s) instead of throwing', async (_label, value) => {
    const client = buildClient({
      campaignsPages: [[
        { id: 1, name: 'x', messages: [{ id: 11, subject: 's', templateId: 42 }] },
      ]],
    });
    // The bare worker pool would throw `RangeError: Invalid array length` on NaN.
    const result = await findTemplateOwner(client, 42, { concurrency: value });

    expect(result.owner?.id).toBe(1);
  });

  it('removes the abort listener on normal completion to prevent leaks', async () => {
    const ac = new AbortController();
    const addSpy = vi.spyOn(ac.signal, 'addEventListener');
    const removeSpy = vi.spyOn(ac.signal, 'removeEventListener');
    const client = buildClient({
      campaignsPages: [[
        { id: 1, name: 'x', messages: [{ id: 11, subject: 's', templateId: 42 }] },
      ]],
    });

    await findTemplateOwner(client, 42, { signal: ac.signal });

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    // Same handler reference passed to both — proves the listener was tracked, not anonymous.
    expect(addSpy.mock.calls[0][1]).toBe(removeSpy.mock.calls[0][1]);
  });

  it('with concurrency=1 produces the same result as the default', async () => {
    const fixture = {
      campaignsPages: [[
        { id: 1, name: 'a', messages: [{ id: 11, subject: 's', templateId: 99 }] },
        { id: 2, name: 'b', messages: [{ id: 22, subject: 's', templateId: 99 }] },
        { id: 3, name: 'c', messages: [{ id: 33, subject: 's', templateId: 42 }] },
      ]],
      automationsPages: [[]],
    };
    const c1 = buildClient(fixture);
    const r1 = await findTemplateOwner(c1, 42, { concurrency: 1 });

    vi.restoreAllMocks();
    const c2 = buildClient(fixture);
    const r2 = await findTemplateOwner(c2, 42);

    // With the match on the last dispatcher, both concurrency settings
    // probe all three before short-circuit kicks in, so `scanned` matches.
    // (Earlier matches expose timing-dependent scanned counts — covered
    // by the dedicated short-circuit tests above.)
    expect(r1.owner).toEqual(r2.owner);
    expect(r1.scanned).toEqual(r2.scanned);
  });

  it('runs probes in parallel when concurrency > 1', async () => {
    // Stub listMessages to take a measurable amount of time per call.
    const client = new RuleClient('test-key');
    const dispatchers = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `d${String(i + 1)}` }));

    vi.spyOn(client, 'listCampaigns').mockResolvedValue({ data: dispatchers } as never);
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    let inFlight = 0;
    let peakInFlight = 0;

    vi.spyOn(client, 'listMessages').mockImplementation(async () => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight -= 1;

      return { data: [] } as never;
    });
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({ data: [] } as never);
    await findTemplateOwner(client, 42, { concurrency: 5 });
    expect(peakInFlight).toBeGreaterThanOrEqual(2);
  });

  it('finds the template even when its dynamic set is not first in the response', async () => {
    // A single message can have multiple dynamic sets. A previous
    // iteration of resolveTemplateIdForMessage returned the FIRST
    // non-null template_id and would miss the match if the target
    // template was later in the array — this test locks that fix in.
    const client = new RuleClient('test-key');

    vi.spyOn(client, 'listCampaigns').mockResolvedValue({
      data: [{ id: 1, name: 'Promo' }],
    } as never);
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    vi.spyOn(client, 'listMessages').mockResolvedValue({
      data: [{ id: 101, subject: 'Hi', name: 'm' }],
    } as never);
    // Three dynamic sets: target template_id (42) is in the SECOND entry,
    // not the first. The previous boolean-skip-first-non-null logic would
    // have returned 99 from entry 0 and missed the match entirely.
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({
      data: [
        { id: 1, message_id: 101, template_id: 99 },
        { id: 2, message_id: 101, template_id: 42 },
        { id: 3, message_id: 101, template_id: 7 },
      ],
    } as never);

    const result = await findTemplateOwner(client, 42);

    expect(result.owner).toEqual({
      kind: 'campaign',
      id: 1,
      name: 'Promo',
      message_id: 101,
      subject: 'Hi',
      status: null,
    });
  });

  it('reports `scanned` as actually-probed dispatchers, not the full fetched page', async () => {
    // Page of 10, dispatcher 1 matches. Workers 0-2 probe in parallel
    // (concurrency=3); worker 0 finds the match and aborts; workers 1-2
    // may still finish their in-flight probe, so 1 ≤ scanned ≤ 3 — but
    // never the full 10. (The previous behaviour counted all 10.)
    const client = new RuleClient('test-key');
    const dispatchers = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `d${String(i + 1)}` }));

    vi.spyOn(client, 'listCampaigns').mockResolvedValue({ data: dispatchers } as never);
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    vi.spyOn(client, 'listMessages').mockImplementation(async ({ id }) => {
      await new Promise((r) => setTimeout(r, 5));
      if (id === 1) return { data: [{ id: 101, subject: 's', name: 'm' }] } as never;

      return { data: [] } as never;
    });
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({
      data: [{ id: 1, message_id: 101, template_id: 42 }],
    } as never);

    const result = await findTemplateOwner(client, 42, { concurrency: 3 });

    expect(result.owner?.id).toBe(1);
    expect(result.scanned.campaigns).toBeLessThanOrEqual(3);
    expect(result.scanned.campaigns).toBeGreaterThanOrEqual(1);
  });

  it('short-circuits mid-page: when an early dispatcher matches, sibling probes do not all fire', async () => {
    // Page of 10 dispatchers, dispatcher 1 matches. With concurrency=3 the
    // worker pool starts indices 0,1,2 in parallel. Worker 0 finds the
    // match and aborts. Workers 1,2 may already be mid-listMessages, but
    // workers 3-9 must never start. So total listMessages calls ≤ 3.
    const client = new RuleClient('test-key');
    const dispatchers = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `d${String(i + 1)}` }));

    vi.spyOn(client, 'listCampaigns').mockResolvedValue({ data: dispatchers } as never);
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    let listMessagesCalls = 0;

    vi.spyOn(client, 'listMessages').mockImplementation(async ({ id }) => {
      listMessagesCalls += 1;
      // Tiny delay so workers actually overlap.
      await new Promise((r) => setTimeout(r, 5));

      // First dispatcher has the matching message; rest don't.
      if (id === 1) return { data: [{ id: 101, subject: 's', name: 'm' }] } as never;

      return { data: [] } as never;
    });
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({
      data: [{ id: 1, message_id: 101, template_id: 42 }],
    } as never);

    const result = await findTemplateOwner(client, 42, { concurrency: 3 });

    expect(result.owner?.id).toBe(1);
    // The exact count depends on scheduling, but it must be < 10 (full page)
    // and ≤ concurrency since at most `concurrency` workers can be in-flight
    // when the match aborts the rest.
    expect(listMessagesCalls).toBeLessThanOrEqual(3);
    expect(listMessagesCalls).toBeGreaterThanOrEqual(1);
  });

  it('respects the concurrency cap', async () => {
    const client = new RuleClient('test-key');
    const dispatchers = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `d${String(i + 1)}` }));

    vi.spyOn(client, 'listCampaigns').mockResolvedValue({ data: dispatchers } as never);
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    let inFlight = 0;
    let peakInFlight = 0;

    vi.spyOn(client, 'listMessages').mockImplementation(async () => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight -= 1;

      return { data: [] } as never;
    });
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({ data: [] } as never);
    await findTemplateOwner(client, 42, { concurrency: 3 });
    expect(peakInFlight).toBeLessThanOrEqual(3);
  });

  it('returns immediately when an already-aborted signal is provided', async () => {
    const client = buildClient({
      campaignsPages: [[{ id: 1, name: 'x', messages: [{ id: 11, subject: 's', templateId: 42 }] }]],
    });
    const ac = new AbortController();

    ac.abort();
    const result = await findTemplateOwner(client, 42, { signal: ac.signal });

    expect(result.owner).toBeNull();
    expect(result.scanned).toEqual({ campaigns: 0, automations: 0 });
  });

  it('abort signal mid-scan stops further automation scanning', async () => {
    const ac = new AbortController();
    const client = new RuleClient('test-key');

    vi.spyOn(client, 'listCampaigns').mockImplementation(async () => {
      // Trigger abort during the campaigns list, then return a no-match page.
      ac.abort();

      return { data: [] } as never;
    });
    const automationsSpy = vi
      .spyOn(client, 'listAutomations')
      .mockResolvedValue({ data: [] } as never);

    vi.spyOn(client, 'listMessages').mockResolvedValue({ data: [] } as never);
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({ data: [] } as never);
    const result = await findTemplateOwner(client, 42, { signal: ac.signal });

    expect(result.owner).toBeNull();
    expect(automationsSpy).not.toHaveBeenCalled();
  });

  it('skips dispatchers with id == null', async () => {
    const client = new RuleClient('test-key');

    vi.spyOn(client, 'listCampaigns').mockResolvedValue({
      data: [{ name: 'no-id' } as never, { id: 2, name: 'has-id' } as never],
    } as never);
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    const listMessages = vi
      .spyOn(client, 'listMessages')
      .mockResolvedValue({ data: [] } as never);

    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({ data: [] } as never);
    await findTemplateOwner(client, 42);
    // Only the dispatcher with id=2 should have triggered a listMessages call.
    expect(listMessages).toHaveBeenCalledTimes(1);
    expect(listMessages).toHaveBeenCalledWith({ id: 2, dispatcher_type: 'campaign' });
  });

  it('reports string campaign status in the owner result', async () => {
    const client = new RuleClient('test-key');

    vi.spyOn(client, 'listCampaigns').mockResolvedValue({
      data: [{ id: 1, name: 'Promo', status: 'sent' } as never],
    } as never);
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    vi.spyOn(client, 'listMessages').mockResolvedValue({
      data: [{ id: 101, subject: 'Hi', name: 'Hi' }],
    } as never);
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({
      data: [{ id: 1, message_id: 101, template_id: 42 }],
    } as never);
    const result = await findTemplateOwner(client, 42);

    expect(result.owner).toMatchObject({ kind: 'campaign', status: 'sent' });
  });

  it('reports object-keyed campaign status in the owner result', async () => {
    const client = new RuleClient('test-key');

    vi.spyOn(client, 'listCampaigns').mockResolvedValue({
      data: [{ id: 1, name: 'Promo', status: { key: 'scheduled' } } as never],
    } as never);
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    vi.spyOn(client, 'listMessages').mockResolvedValue({
      data: [{ id: 101, subject: 'Hi', name: 'Hi' }],
    } as never);
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({
      data: [{ id: 1, message_id: 101, template_id: 42 }],
    } as never);
    const result = await findTemplateOwner(client, 42);

    expect(result.owner).toMatchObject({ kind: 'campaign', status: 'scheduled' });
  });

  it('records a synthetic partial_error when a top-level listCampaigns call fails', async () => {
    const client = new RuleClient('test-key');

    vi.spyOn(client, 'listCampaigns').mockRejectedValue(
      new RuleApiError('forbidden', 403)
    );
    vi.spyOn(client, 'listAutomations').mockResolvedValue({ data: [] } as never);
    vi.spyOn(client, 'listMessages').mockResolvedValue({ data: [] } as never);
    vi.spyOn(client, 'listDynamicSets').mockResolvedValue({ data: [] } as never);
    const result = await findTemplateOwner(client, 42);

    expect(result.owner).toBeNull();
    expect(result.partial_errors).toContainEqual(
      expect.objectContaining({
        dispatcher_kind: 'campaign',
        dispatcher_id: 0,
        status_code: 403,
      })
    );
  });
});
