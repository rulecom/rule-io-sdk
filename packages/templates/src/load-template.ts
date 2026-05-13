/**
 * Synchronous helper for loading a template's XML source from the same
 * directory as the calling module.
 *
 * @public
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Read a UTF-8 text file resolved relative to the caller's `import.meta.url`.
 *
 * Typical usage inside a template module:
 *
 * ```ts
 * const TEMPLATE_XML = loadTemplate(import.meta.url, './abandoned-cart.xml')
 * ```
 *
 * Pairs with {@link compileTemplate}'s `template` option. Synchronous and
 * intended for module-top-level initialization; not for request paths.
 *
 * @param baseUrl       The calling module's `import.meta.url`.
 * @param relativePath  Path to the template file, resolved against `baseUrl`.
 * @returns             UTF-8 contents of the file.
 * @public
 */
export function loadTemplate(baseUrl: string, relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, baseUrl)), 'utf8')
}
