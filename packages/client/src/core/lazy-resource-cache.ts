/**
 * Map-based lazy resource cache used by {@link BaseResource.lazy}.
 *
 * Kept in its own module so that future refactors (e.g. adding instrumentation
 * or weak references) have a single, easy-to-find home.
 */

export class LazyResourceCache {
  private readonly entries = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.entries.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.entries.set(key, value);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Number of cached instances. Exposed for tests that assert lazy behavior. */
  get size(): number {
    return this.entries.size;
  }
}
