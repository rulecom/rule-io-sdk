import type { FlavorConfig } from './flavors/types.js'
import type { Json, JsonValidationError, SafeParseResult } from './json-validator/types.js'
import { getValidator, toValidationErrors } from './json-validator/validate.js'
import { visitBlocks, normalizeBlock } from './json-validator/json-semantic-validator.js'
import type { SemanticIssue, SemanticValidationResult } from './json-validator/json-semantic-validator.js'

// ─── Error class ──────────────────────────────────────────────────────────────

/**
 * Thrown by {@link validateJson} when the input fails JSON Schema validation.
 *
 * The `.errors` array contains one entry per schema violation, each with a
 * JSON Pointer `path` and a human-readable `message`.
 */
export class JsonParseError extends Error {
  /** Structured list of every schema violation found in the input. */
  readonly errors: JsonValidationError[]

  /** @param errors - Validation errors produced by the AJV validator. */
  constructor(errors: JsonValidationError[]) {
    const summary = errors
      .slice(0, 5)
      .map((e) => `  ${e.path || '(root)'}: ${e.message}`)
      .join('\n')

    const suffix = errors.length > 5 ? `\n  ...and ${errors.length - 5} more` : ''

    super(`RCML content JSON validation failed:\n${summary}${suffix}`)
    this.name = 'JsonParseError'
    this.errors = errors
  }
}

// ─── JSON Schema validation ────────────────────────────────────────────────────

/**
 * Validate raw input as RCML content JSON.
 *
 * When `config` is provided, only the node/mark types permitted by that
 * `FlavorConfig` are accepted. Without `config`, the full superset schema
 * is used.
 *
 * @param input - The value to validate (typically a parsed JSON object).
 * @param config - Optional flavor config to restrict allowed node/mark types.
 * @returns The input cast to {@link Json} when valid.
 * @throws {JsonParseError} When the input does not conform to the RCML JSON schema.
 *
 * @example
 * ```ts
 * const doc = validateJson(JSON.parse(raw))
 * // doc is typed as Json
 * ```
 */
export function validateJson(input: unknown, config?: FlavorConfig): Json {
  const validate = getValidator(config)
  const valid = validate(input)

  if (!valid) {
    const errors = toValidationErrors(validate.errors)

    throw new JsonParseError(errors)
  }

  return input as Json
}

/**
 * Validate raw input as RCML content JSON without throwing.
 *
 * When `config` is provided, only the node/mark types permitted by that
 * `FlavorConfig` are accepted. Without `config`, the full superset schema
 * is used.
 *
 * @param input - The value to validate (typically a parsed JSON object).
 * @param config - Optional flavor config to restrict allowed node/mark types.
 * @returns `{ success: true, data }` when valid, or `{ success: false, errors }` when invalid.
 *
 * @example
 * ```ts
 * const result = safeParseJson(JSON.parse(raw))
 * if (result.success) {
 *   // result.data is typed as Json
 * } else {
 *   console.error(result.errors)
 * }
 * ```
 */
export function safeParseJson(input: unknown, config?: FlavorConfig): SafeParseResult<Json> {
  const validate = getValidator(config)
  const valid = validate(input)

  if (!valid) {
    return {
      success: false,
      errors: toValidationErrors(validate.errors),
    }
  }

  return { success: true, data: input as Json }
}

// ─── Semantic validation ───────────────────────────────────────────────────────

/**
 * Second-stage semantic validator for RCML content JSON.
 *
 * Runs after {@link validateJson} succeeds. Checks document invariants that
 * JSON Schema cannot express: duplicate marks, empty text nodes, adjacent
 * mergeable text nodes, and useless marks.
 *
 * @param json - A structurally valid RCML document (output of {@link validateJson}).
 * @returns `{ success: true }` when no issues are found, or
 *   `{ success: false, issues }` when at least one issue exists (including warnings).
 */
export function validateJsonSemantics(json: Json): SemanticValidationResult {
  const issues: SemanticIssue[] = []

  visitBlocks(json.content, '/content', issues)

  if (issues.length === 0) return { success: true }

  return { success: false, issues }
}

/**
 * Throwing wrapper around {@link validateJsonSemantics}.
 *
 * Throws only on **error**-severity issues — warnings are silently ignored.
 * Useful in pipelines where warnings are acceptable but structural errors
 * must be hard-rejected.
 *
 * @param json - A structurally valid RCML document (output of {@link validateJson}).
 * @throws {Error} When the document contains any error-severity semantic issues.
 */
export function assertJsonSemantics(json: Json): void {
  const result = validateJsonSemantics(json)

  if (!result.success) {
    const errors = result.issues.filter((i) => i.severity === 'error')

    if (errors.length > 0) {
      const summary = errors
        .slice(0, 5)
        .map((e) => `  ${e.path || '(root)'} [${e.code}]: ${e.message}`)
        .join('\n')

      const suffix = errors.length > 5 ? `\n  ...and ${errors.length - 5} more` : ''

      throw new Error(`RCML JSON semantic validation failed:\n${summary}${suffix}`)
    }
  }
}

/**
 * Normalize RCML content JSON to canonical form.
 *
 * - Removes `marks: []` (empty marks arrays should be omitted)
 * - Removes empty text nodes (`text: ""`)
 * - Merges adjacent text nodes that share identical mark sets
 *
 * @param json - A structurally valid RCML document (output of {@link validateJson}).
 * @returns A new `Json` object in canonical form. The input is not mutated.
 */
export function normalizeJson(json: Json): Json {
  return {
    ...json,
    content: json.content.map(normalizeBlock),
  }
}
