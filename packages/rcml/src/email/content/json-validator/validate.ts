import { Ajv2020 } from 'ajv/dist/2020.js'
import type { ErrorObject, ValidateFunction } from 'ajv'
import type { FlavorConfig } from '../flavors/types.js'
import { rcmlContentJsonSchema, buildJsonSchema } from './json-schema.js'
import type { JsonValidationError } from './types.js'

// ─── Compiler ─────────────────────────────────────────────────────────────────

const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true })
const compiledValidate = ajv.compile(rcmlContentJsonSchema)

/** Compiled validators keyed by FlavorConfig reference (singletons in practice). @internal */
const validatorCache = new WeakMap<FlavorConfig, ValidateFunction>()

/**
 * Return the AJV ValidateFunction for the given config, compiling and caching on first use.
 * Without a config the pre-compiled superset validator is returned.
 * @internal
 */
export function getValidator(config?: FlavorConfig): ValidateFunction {
  if (!config) return compiledValidate

  const cached = validatorCache.get(config)

  if (cached !== undefined) return cached

  const fn = ajv.compile(buildJsonSchema(config))

  validatorCache.set(config, fn)

  return fn
}

/**
 * Map AJV ErrorObjects to the public {@link JsonValidationError} shape.
 * @internal
 */
export function toValidationErrors(ajvErrors: ErrorObject[] | null | undefined): JsonValidationError[] {
  return (ajvErrors ?? []).map((err) => ({
    path: err.instancePath,
    message: err.message ?? 'Unknown error',
  }))
}
