/**
 * Common base for the root `RuleClient` and every namespace client.
 *
 * Provides:
 * - access to the shared {@link HttpTransport}
 * - a {@link lazy} accessor backed by {@link LazyResourceCache} so namespaces
 *   are constructed on first access and cached as singletons per client
 *   instance
 */

import { LazyResourceCache } from './lazy-resource-cache.js';
import type { HttpTransport } from './transport.js';

export abstract class BaseResource {
  protected readonly cache = new LazyResourceCache();

  constructor(protected readonly transport: HttpTransport) {}

  /**
   * Return the cached instance for `key`, or call `factory()` once and cache
   * the result. Used by every namespace getter on the root and on nested
   * namespace clients (e.g. `RecipientsClient.segments`).
   */
  protected lazy<T>(key: string, factory: () => T): T {
    const cached = this.cache.get<T>(key);

    if (cached !== undefined) return cached;

    const created = factory();

    this.cache.set(key, created);

    return created;
  }
}
