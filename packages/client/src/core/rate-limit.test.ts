import { describe, expect, it, vi } from 'vitest';

import { RuleApiError } from '../errors.js';

import {
  computeRetryDelayMs,
  createSemaphore,
  RateLimitGate,
  resolveRateLimitOptions,
  type ResolvedRateLimitOptions,
} from './rate-limit.js';

function fixedRandom(value: number): () => number {
  return () => value;
}

function makeOpts(
  overrides: Partial<ResolvedRateLimitOptions> = {}
): ResolvedRateLimitOptions {
  return {
    maxConcurrency: 4,
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
    maxRetryAfterMs: 60_000,
    onRetry: () => {},
    sleep: () => Promise.resolve(),
    random: fixedRandom(0.5),
    ...overrides,
  };
}

describe('resolveRateLimitOptions', () => {
  it('applies defaults when fields are omitted', () => {
    const opts = resolveRateLimitOptions({});

    expect(opts.maxConcurrency).toBe(4);
    expect(opts.maxRetries).toBe(2);
    expect(opts.baseDelayMs).toBe(1000);
    expect(opts.maxDelayMs).toBe(8000);
    expect(opts.maxRetryAfterMs).toBe(60_000);
  });

  it('clamps numeric fields to safe minimums', () => {
    const opts = resolveRateLimitOptions({
      maxConcurrency: 0,
      maxRetries: -3,
      baseDelayMs: -1,
      maxDelayMs: -1,
      maxRetryAfterMs: -1,
    });

    expect(opts.maxConcurrency).toBe(1);
    expect(opts.maxRetries).toBe(0);
    expect(opts.baseDelayMs).toBe(0);
    expect(opts.maxDelayMs).toBe(0);
    expect(opts.maxRetryAfterMs).toBe(0);
  });

  it('passes user overrides through', () => {
    const onRetry = vi.fn();
    const sleep = vi.fn(() => Promise.resolve());
    const random = vi.fn(() => 0.42);

    const opts = resolveRateLimitOptions({
      maxConcurrency: 7,
      maxRetries: 5,
      onRetry,
      sleep,
      random,
    });

    expect(opts.maxConcurrency).toBe(7);
    expect(opts.maxRetries).toBe(5);
    expect(opts.onRetry).toBe(onRetry);
    expect(opts.sleep).toBe(sleep);
    expect(opts.random).toBe(random);
  });
});

describe('computeRetryDelayMs', () => {
  it('honors Retry-After when within the cap', () => {
    const result = computeRetryDelayMs(0, 30, makeOpts({ random: fixedRandom(0) }));

    expect(result).toEqual({ delayMs: 30_000, honoredRetryAfter: true });
  });

  it('applies upward jitter (0–10 %) on top of Retry-After', () => {
    const result = computeRetryDelayMs(0, 10, makeOpts({ random: fixedRandom(0.5) }));

    // 10 s * (1 + 0.5 * 0.1) = 10500 ms
    expect(result).toEqual({ delayMs: 10_500, honoredRetryAfter: true });
  });

  it('returns null when Retry-After exceeds maxRetryAfterMs', () => {
    const result = computeRetryDelayMs(
      0,
      120,
      makeOpts({ maxRetryAfterMs: 60_000 })
    );

    expect(result).toBeNull();
  });

  it('clamps negative Retry-After to zero', () => {
    const result = computeRetryDelayMs(0, -5, makeOpts({ random: fixedRandom(0) }));

    expect(result).toEqual({ delayMs: 0, honoredRetryAfter: true });
  });

  it('uses exponential backoff when Retry-After is absent', () => {
    // attempt 0 → base * 2^0 = 1000 ms; jitter 0.75 + 0.5 * 0.5 = 1.0
    const r0 = computeRetryDelayMs(0, undefined, makeOpts({ random: fixedRandom(0.5) }));

    expect(r0).toEqual({ delayMs: 1000, honoredRetryAfter: false });

    // attempt 2 → base * 2^2 = 4000 ms
    const r2 = computeRetryDelayMs(2, undefined, makeOpts({ random: fixedRandom(0.5) }));

    expect(r2).toEqual({ delayMs: 4000, honoredRetryAfter: false });
  });

  it('caps exponential backoff at maxDelayMs', () => {
    // attempt 5 would be 32 000 ms uncapped; cap is 8 000.
    const result = computeRetryDelayMs(
      5,
      undefined,
      makeOpts({ random: fixedRandom(0.5), maxDelayMs: 8000 })
    );

    expect(result?.delayMs).toBe(8000);
  });
});

describe('createSemaphore', () => {
  it('admits up to capacity concurrently and queues the rest', async () => {
    const acquire = createSemaphore(2);

    const r1 = await acquire();
    const r2 = await acquire();

    let third = false;
    const p3 = acquire().then((release) => {
      third = true;

      return release;
    });

    // p3 hasn't resolved yet because both slots are held.
    await Promise.resolve();
    await Promise.resolve();
    expect(third).toBe(false);

    r1();
    const r3 = await p3;

    expect(third).toBe(true);

    r2();
    r3();
  });

  it('preserves FIFO order across queued waiters', async () => {
    const acquire = createSemaphore(1);
    const order: number[] = [];

    const r0 = await acquire();
    const p1 = acquire().then((release) => {
      order.push(1);
      release();
    });
    const p2 = acquire().then((release) => {
      order.push(2);
      release();
    });
    const p3 = acquire().then((release) => {
      order.push(3);
      release();
    });

    r0();
    await Promise.all([p1, p2, p3]);

    expect(order).toEqual([1, 2, 3]);
  });

  it('does not let active exceed capacity across release/acquire microtask gaps', async () => {
    const capacity = 3;
    const acquire = createSemaphore(capacity);
    let active = 0;
    let peak = 0;

    async function task(): Promise<void> {
      const release = await acquire();

      active++;
      if (active > peak) peak = active;
      // Yield a microtask to interleave release/acquire ordering.
      await Promise.resolve();
      active--;
      release();
    }

    await Promise.all(Array.from({ length: 20 }, () => task()));

    expect(peak).toBeLessThanOrEqual(capacity);
  });
});

describe('RateLimitGate', () => {
  function rateLimited(retryAfterSeconds?: number): RuleApiError {
    const error = new RuleApiError('Rate limited', 429);

    if (retryAfterSeconds !== undefined) error.retryAfterSeconds = retryAfterSeconds;

    return error;
  }

  it('passes successful results through without retrying', async () => {
    const gate = new RateLimitGate(makeOpts());
    const fn = vi.fn(() => Promise.resolve('ok'));

    expect(await gate.run('label', fn)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-429 errors immediately without retrying', async () => {
    const gate = new RateLimitGate(makeOpts());
    const error = new RuleApiError('boom', 500);
    const fn = vi.fn(() => Promise.reject(error));

    await expect(gate.run('label', fn)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 up to maxRetries, then surfaces the last error', async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const error = rateLimited();
    const gate = new RateLimitGate(makeOpts({ maxRetries: 2, sleep }));
    const fn = vi.fn(() => Promise.reject(error));

    await expect(gate.run('label', fn)).rejects.toBe(error);
    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('honors Retry-After over exponential backoff', async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const error = rateLimited(10);
    const gate = new RateLimitGate(
      makeOpts({ maxRetries: 1, sleep, random: fixedRandom(0) })
    );
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('ok');

    expect(await gate.run('label', fn)).toBe('ok');
    expect(sleep).toHaveBeenCalledWith(10_000);
  });

  it('rethrows immediately when Retry-After exceeds maxRetryAfterMs', async () => {
    const sleep = vi.fn(() => Promise.resolve());
    const error = rateLimited(120);
    const gate = new RateLimitGate(
      makeOpts({ maxRetries: 5, maxRetryAfterMs: 60_000, sleep })
    );
    const fn = vi.fn(() => Promise.reject(error));

    await expect(gate.run('label', fn)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('frees the slot during sleep so other callers can progress', async () => {
    let resumeSleep: (() => void) | undefined;
    const sleep = (): Promise<void> =>
      new Promise<void>((resolve) => {
        resumeSleep = resolve;
      });
    const error = rateLimited(1);
    const gate = new RateLimitGate(
      makeOpts({ maxConcurrency: 1, maxRetries: 1, sleep, random: fixedRandom(0) })
    );

    const slowFn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('slow ok');

    const fastFn = vi.fn(() => Promise.resolve('fast ok'));

    const slow = gate.run('slow', slowFn);

    // Yield enough microtasks for slow to acquire, fail, release, and call sleep.
    for (let i = 0; i < 10; i++) await Promise.resolve();

    const fast = gate.run('fast', fastFn);

    expect(await fast).toBe('fast ok');

    // Slow can finish only once we resume its sleep — and only then does it
    // re-acquire the slot.
    resumeSleep?.();
    expect(await slow).toBe('slow ok');
  });

  it('invokes onRetry with attempt info', async () => {
    const onRetry = vi.fn();
    const error = rateLimited(2);
    const gate = new RateLimitGate(
      makeOpts({ maxRetries: 1, onRetry, random: fixedRandom(0) })
    );
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('ok');

    await gate.run('GET /x', fn);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith({
      label: 'GET /x',
      attempt: 1,
      delayMs: 2000,
      error,
      honoredRetryAfter: true,
    });
  });

  it('caps in-flight runs at maxConcurrency', async () => {
    let inFlight = 0;
    let peak = 0;
    const released: Array<() => void> = [];
    const gate = new RateLimitGate(makeOpts({ maxConcurrency: 2 }));

    const fn = (): Promise<void> => {
      inFlight++;
      if (inFlight > peak) peak = inFlight;

      return new Promise<void>((resolve) => {
        released.push(() => {
          inFlight--;
          resolve();
        });
      });
    };

    const all = Promise.all(
      Array.from({ length: 5 }, (_, i) => gate.run(`task-${i}`, fn))
    );

    // Let the first batch acquire.
    for (let i = 0; i < 5; i++) await Promise.resolve();

    // Release one at a time so the queue drains in order.
    while (released.length > 0) {
      const next = released.shift();

      next?.();
      for (let i = 0; i < 5; i++) await Promise.resolve();
    }

    await all;

    expect(peak).toBe(2);
  });
});
