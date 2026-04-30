/**
 * Internal: attribute-map validator for a single tag.
 *
 * Mirrors the tree-walking logic in
 * `../validator/attr-value-validate.ts` but for one node's worth of attrs —
 * used by each element factory before assembling the RCML node.
 *
 * Validates:
 * - Unknown attr names (not in the tag's `RCML_SCHEMA_SPEC[tag].attrs`).
 * - Invalid attr values (Zod schema for the attr's validator rejects the value).
 *
 * The schema deliberately has no "required" marker on individual attrs, so
 * this helper never reports a missing-attr issue; cross-attr invariants live
 * at a higher layer.
 */

import { RCML_SCHEMA_SPEC, type RcmlTagName } from '../schema/index.js'
import type { RcmlAttrSpec, RcmlNodeSpec } from '../schema/types.js'
import { RCML_ATTR_VALIDATORS } from '../validator/attr-validators.js'
import type { RcmlAttributeValidatorsEnum } from '../validator/attr-validators.js'
import { RcmlElementBuildErrorCodes, type RcmlElementBuildIssue } from './errors.js'

/** Value shape that an RCML attribute may take at the JSON layer. */
export type AttrValue = string | number | boolean

/**
 * Validate a single node's attribute map against its tag's schema.
 *
 * @param tagName - The RCML tag being built.
 * @param attrs - User-supplied attribute map (may be `undefined` / empty).
 * @returns Array of issues (empty on success).
 */
export function validateAttrs(
  tagName: RcmlTagName,
  attrs: Readonly<Record<string, AttrValue | undefined>> | undefined,
): RcmlElementBuildIssue[] {
  if (!attrs) return []

  // Widen to `RcmlNodeSpec` for uniform dynamic attr-name lookup — the narrow
  // per-tag type from `RCML_SCHEMA_SPEC` (preserved for type-level attr
  // derivation) refuses `attrs[name]` when `name: string`.
  const spec: RcmlNodeSpec = RCML_SCHEMA_SPEC[tagName]
  const issues: RcmlElementBuildIssue[] = []

  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue

    const attrSpec = spec.attrs[name] as RcmlAttrSpec | undefined

    if (!attrSpec) {
      issues.push({
        code: RcmlElementBuildErrorCodes.ATTR_UNKNOWN,
        path: `attrs/${name}`,
        message: `Unknown attribute '${name}' for <${tagName}>.`,
      })
      continue
    }

    const zod = RCML_ATTR_VALIDATORS[attrSpec.validator as RcmlAttributeValidatorsEnum]
    const parsed = zod.safeParse(value)

    if (!parsed.success) {
      const firstMessage = parsed.error.issues[0]?.message ?? 'Invalid attribute value.'

      issues.push({
        code: RcmlElementBuildErrorCodes.ATTR_INVALID_VALUE,
        path: `attrs/${name}`,
        message: `Invalid value for attribute '${name}' on <${tagName}>: ${firstMessage}`,
      })
    }
  }

  return issues
}

/**
 * Strip `undefined` entries from an attribute map and return a plain object
 * suitable for embedding in an RCML JSON node. Returns `undefined` when the
 * resulting map is empty (callers typically want to omit the `attributes`
 * field entirely in that case).
 */
export function normalizeAttrs(
  attrs: Readonly<Record<string, AttrValue | undefined>> | undefined,
): Record<string, AttrValue> | undefined {
  if (!attrs) return undefined
  const out: Record<string, AttrValue> = {}
  let any = false

  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue
    out[name] = value
    any = true
  }

  return any ? out : undefined
}
