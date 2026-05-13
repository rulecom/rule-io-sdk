/**
 * Synchronous helper for loading a template's copy tree (a JSON file)
 * from the same directory as the calling module — the copy-side
 * counterpart of {@link loadTemplate}.
 *
 * @public
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Read a JSON file resolved relative to the caller's `import.meta.url`
 * and parse it.
 *
 * Typical usage inside a template module:
 *
 * ```ts
 * interface MyCopy {
 *   preheader: string
 *   greetingHeading: string
 *   // …
 * }
 *
 * const DEFAULT_COPY = loadCopy<MyCopy>(import.meta.url, './my-copy.json')
 * ```
 *
 * Pairs with {@link compileTemplate}'s `copy` option. Synchronous and
 * intended for module-top-level initialization; not for request paths.
 *
 * No runtime validation — the parsed JSON is cast to `T`. Callers that
 * need schema validation should layer it on top.
 *
 * @typeParam T          Caller-supplied copy shape; defaults to
 *                       `Record<string, unknown>`.
 * @param baseUrl        The calling module's `import.meta.url`.
 * @param relativePath   Path to the JSON file, resolved against `baseUrl`.
 * @returns              Parsed JSON, typed as `T`.
 * @public
 */
export function loadCopy<T = Record<string, unknown>>(
  baseUrl: string,
  relativePath: string,
): T {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(relativePath, baseUrl)), 'utf8'),
  ) as T
}
