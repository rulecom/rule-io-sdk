/**
 * Optional client-side rate limiting for `HttpTransport`.
 *
 * Two mechanisms layered behind a single gate:
 *
 *   1. **Concurrency semaphore** — caps in-flight HTTP requests per client.
 *      Keeps a single client from saturating Rule.io's per-account budget.
 *   2. **Retry on 429** — when `RuleApiError.isRateLimited()`, sleep and
 *      retry up to N times. Server-supplied `Retry-After` (parsed by the
 *      transport into `error.retryAfterSeconds`) is honored when present;
 *      exponential backoff with jitter is the fallback.
 *
 * Honoring `Retry-After` is load-bearing: Rule.io's documented 49 % error-rate
 * trigger means retrying inside the server-suggested window counts toward the
 * trigger and accelerates a longer block.
 */

import { RuleApiError } from '../errors.js';

/**
 * User-facing rate-limit configuration. All fields optional with defaults.
 *
 * @example
 * ```typescript
 * const client = new RuleClient({
 *   apiKey: process.env.RULE_API_KEY!,
 *   rateLimiting: {
 *     maxConcurrency: 4,
 *     maxRetries: 2,
 *     onRetry: ({ label, attempt, delayMs, honoredRetryAfter }) => {
 *       console.warn(
 *         `[rate-limit] retry ${attempt} of ${label} in ${delayMs} ms` +
 *           (honoredRetryAfter ? ' (server Retry-After)' : ' (backoff)')
 *       );
 *     },
 *   },
 * });
 * ```
 */
export interface RateLimitOptions {
  /** Maximum concurrent in-flight HTTP requests. Default: 4. */
  maxConcurrency?: number;
  /** Number of retries on 429 (so total attempts = retries + 1). Default: 2. */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff when no `Retry-After` header. Default: 1000. */
  baseDelayMs?: number;
  /** Cap in ms for the exponential-backoff fallback. Default: 8000. */
  maxDelayMs?: number;
  /**
   * Cap in ms for honoring a server-supplied `Retry-After`. If the header
   * asks for a wait longer than this, the gate gives up and rethrows the
   * 429 rather than stalling the caller. Default: 60_000 (60 s).
   */
  maxRetryAfterMs?: number;
  /** Hook invoked on each retry attempt. */
  onRetry?: (info: RetryInfo) => void;
  /** Sleep function (overridable for tests). */
  sleep?: (ms: number) => Promise<void>;
  /** RNG for jitter, in [0, 1). Overridable for tests. */
  random?: () => number;
}

/**
 * Diagnostic payload passed to {@link RateLimitOptions.onRetry} on each
 * retry attempt. See {@link RateLimitOptions} for a usage example.
 */
export interface RetryInfo {
  /** Caller-supplied label, e.g. an HTTP method + URL. */
  label: string;
  /** 1-indexed attempt number of the upcoming retry. */
  attempt: number;
  /** Computed delay in ms before the upcoming retry. */
  delayMs: number;
  /** The error that triggered the retry (always a 429 `RuleApiError`). */
  error: unknown;
  /**
   * `true` when `delayMs` was derived from the server's `Retry-After`
   * header; `false` when from exponential backoff.
   */
  honoredRetryAfter: boolean;
}

/** Resolved configuration with every default applied. */
export interface ResolvedRateLimitOptions {
  maxConcurrency: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  maxRetryAfterMs: number;
  onRetry: (info: RetryInfo) => void;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
}

const DEFAULTS: ResolvedRateLimitOptions = {
  maxConcurrency: 4,
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  maxRetryAfterMs: 60_000,
  onRetry: () => {},
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
};

export function resolveRateLimitOptions(
  input: RateLimitOptions
): ResolvedRateLimitOptions {
  return {
    maxConcurrency: Math.max(1, input.maxConcurrency ?? DEFAULTS.maxConcurrency),
    maxRetries: Math.max(0, input.maxRetries ?? DEFAULTS.maxRetries),
    baseDelayMs: Math.max(0, input.baseDelayMs ?? DEFAULTS.baseDelayMs),
    maxDelayMs: Math.max(0, input.maxDelayMs ?? DEFAULTS.maxDelayMs),
    maxRetryAfterMs: Math.max(0, input.maxRetryAfterMs ?? DEFAULTS.maxRetryAfterMs),
    onRetry: input.onRetry ?? DEFAULTS.onRetry,
    sleep: input.sleep ?? DEFAULTS.sleep,
    random: input.random ?? DEFAULTS.random,
  };
}

/**
 * Tiny FIFO semaphore. `acquire()` resolves with a `release` function and
 * preserves arrival order. Slot transfer is atomic on `release`: when a
 * waiter is queued, the released slot is handed to it directly without
 * decrementing `active`, so a parallel `acquire()` cannot race in during
 * the microtask gap between release and the waiter resuming.
 */
export function createSemaphore(capacity: number): () => Promise<() => void> {
  let active = 0;
  const queue: Array<() => void> = [];

  const release = (): void => {
    const next = queue.shift();

    if (next) {
      next();
    } else {
      active--;
    }
  };

  return async function acquire(): Promise<() => void> {
    if (active < capacity && queue.length === 0) {
      active++;

      return release;
    }

    await new Promise<void>((resolve) => queue.push(resolve));

    return release;
  };
}

/**
 * Compute the delay before the next retry, or `null` to signal "give up
 * and rethrow" (used when the server asks for a wait longer than the
 * caller is willing to absorb).
 *
 * `attempt` is 0-indexed (first retry is `attempt = 0`).
 */
export function computeRetryDelayMs(
  attempt: number,
  retryAfterSeconds: number | undefined,
  opts: ResolvedRateLimitOptions
): { delayMs: number; honoredRetryAfter: boolean } | null {
  if (retryAfterSeconds !== undefined) {
    const requestedMs = Math.max(0, retryAfterSeconds * 1000);

    if (requestedMs > opts.maxRetryAfterMs) return null;
    // Small upward jitter (0–10 %) avoids the thundering-herd case where
    // every client wakes the instant the rate-limit window rolls over.
    const jitter = 1 + opts.random() * 0.1;

    return { delayMs: Math.round(requestedMs * jitter), honoredRetryAfter: true };
  }

  const exponential = opts.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, opts.maxDelayMs);
  const jitter = 0.75 + opts.random() * 0.5;

  return { delayMs: Math.round(capped * jitter), honoredRetryAfter: false };
}

/**
 * Holds the semaphore and retry policy. `run()` is the single entry point —
 * call it with a label and an async function and it gates concurrency and
 * retries 429 responses according to the resolved options.
 */
export class RateLimitGate {
  private readonly acquire: () => Promise<() => void>;

  constructor(private readonly opts: ResolvedRateLimitOptions) {
    this.acquire = createSemaphore(opts.maxConcurrency);
  }

  async run<T>(label: string, fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      const rawRelease = await this.acquire();
      // Each acquired slot must release exactly once. The retry path
      // releases before sleeping (so other callers can progress), then
      // the `finally` would double-free without this guard.
      let released = false;

      const release = (): void => {
        if (released) return;
        released = true;
        rawRelease();
      };

      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (
          !(error instanceof RuleApiError) ||
          !error.isRateLimited() ||
          attempt === this.opts.maxRetries
        ) {
          throw error;
        }

        const next = computeRetryDelayMs(attempt, error.retryAfterSeconds, this.opts);

        // Server asked for a longer wait than we're willing to absorb —
        // surface the 429 immediately rather than stalling the caller.
        if (next === null) throw error;
        this.opts.onRetry({
          label,
          attempt: attempt + 1,
          delayMs: next.delayMs,
          error,
          honoredRetryAfter: next.honoredRetryAfter,
        });
        // Free the slot before sleeping so other callers can make
        // progress while we back off; otherwise N concurrent retries
        // would all hold their slots and deadlock the semaphore.
        release();
        await this.opts.sleep(next.delayMs);
        continue;
      } finally {
        release();
      }
    }

    throw lastError;
  }
}
