/**
 * Internal: children-array validator for a single tag.
 *
 * Checks, for one node's worth of children:
 * - Each child's `tagName` is in the parent tag's `validChildTypes`.
 * - The total number of children does not exceed the parent's `maxChildCount`.
 *
 * Cases where the schema says `isLeaf: true` but the user supplied children —
 * or the user supplied `undefined` / empty children for a non-leaf tag that
 * requires at least one — are reported by the factory layer, which also
 * decides whether to omit the `children` field from the resulting node.
 */

import { RCML_SCHEMA_SPEC, type RcmlTagName } from '../schema/index.js'
import type { RcmlNodeSpec } from '../schema/types.js'
import { RcmlElementBuildErrorCodes, type RcmlElementBuildIssue } from './errors.js'

interface ChildLike {
  readonly tagName?: unknown
}

/**
 * Validate a children array against the parent tag's schema.
 *
 * @param parent - The parent RCML tag.
 * @param children - Array of child RCML nodes (already-built by other factories).
 * @returns Array of issues (empty on success).
 */
export function validateChildren(
  parent: RcmlTagName,
  children: readonly ChildLike[],
): RcmlElementBuildIssue[] {
  // Widen to `RcmlNodeSpec` for uniform dynamic access — the narrow per-tag
  // type from `RCML_SCHEMA_SPEC` (preserved for type-level attr derivation)
  // makes `validChildTypes` / `maxChildCount` inaccessible on leaf specs.
  const spec: RcmlNodeSpec = RCML_SCHEMA_SPEC[parent]
  const issues: RcmlElementBuildIssue[] = []
  const allowed: readonly RcmlTagName[] = spec.validChildTypes ?? []

  if (spec.maxChildCount !== undefined && children.length > spec.maxChildCount) {
    issues.push({
      code: RcmlElementBuildErrorCodes.CHILD_TOO_MANY,
      path: 'children',
      message: `<${parent}> accepts at most ${String(spec.maxChildCount)} children; got ${String(children.length)}.`,
    })
  }

  children.forEach((child, index) => {
    const childTag = child?.tagName

    if (typeof childTag !== 'string' || !allowed.includes(childTag as RcmlTagName)) {
      const received = typeof childTag === 'string' ? `<${childTag}>` : typeof childTag

      issues.push({
        code: RcmlElementBuildErrorCodes.CHILD_INVALID,
        path: `children/${String(index)}`,
        message: `<${parent}> does not accept ${received} as a child. Allowed: ${allowed.map((t) => `<${t}>`).join(', ') || '(none)'}.`,
      })
    }
  })

  return issues
}
