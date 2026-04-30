import type { ValidationResult } from './types.js'

/**
 * Format a `ValidationResult` into a human-readable string for MCP consumption.
 * Returns `null` if there are no errors.
 *
 * @internal
 */
export function formatErrors(result: ValidationResult): string | null {
  if (result.valid) return null
  const lines = [
    `Found ${result.errors.length} validation error(s):`,
    '',
    ...result.errors.map((e, i) => {
      const loc = e.line != null ? ` [line ${e.line}, col ${e.column ?? 1}]` : ''

      return `${i + 1}.${loc} ${e.message}`
    }),
  ]

  return lines.join('\n')
}
