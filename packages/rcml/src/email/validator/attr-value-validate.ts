/**
 * Internal: tree-walked attribute-value validation.
 *
 * The generated JSON Schema checks structure and cheap attribute constraints
 * (enums, types). Rich formats — padding shorthand, border shorthand,
 * background-position, border-radius — live as Zod schemas in
 * `./attr-validators.ts` and are enforced by walking the `RcmlDocument` tree
 * directly here.
 *
 * Only known attributes are re-validated; unknown ones are already flagged
 * by the AJV pass and would be duplicated otherwise.
 */

import { RCML_SCHEMA_SPEC, type RcmlTagName } from '../schema/index.js'
import type { RcmlAttrSpec, RcmlNodeSpec } from '../schema/types.js'
import { RCML_ATTR_VALIDATORS, type RcmlAttributeValidatorsEnum } from './attr-validators.js'
import { EmailTemplateErrorCodes, type EmailTemplateValidationIssue } from '../validate-email-template.js'

type RcmlNodeLike = {
  tagName?: unknown
  attributes?: unknown
  children?: unknown
}

/**
 * Walk the document tree, validating every known attribute value against its
 * Zod schema. Non-objects / non-RCML-shaped nodes are skipped silently —
 * AJV will have already reported those problems.
 *
 * @param doc - Any value (expected to be an {@link import('../rcml-types.js').RcmlDocument}-shaped tree).
 * @returns A list of `ATTR_INVALID_VALUE` issues (empty on success).
 */
export function validateAttrValues(doc: unknown): EmailTemplateValidationIssue[] {
  const issues: EmailTemplateValidationIssue[] = []

  visit(doc, '', issues)

  return issues
}

/**
 * Recursive visitor: validate one node's attributes, then recurse into its
 * children. Appends any violations to the shared `issues` array.
 */
function visit(node: unknown, path: string, issues: EmailTemplateValidationIssue[]): void {
  if (!isPlainObject(node)) return

  const n = node as RcmlNodeLike

  if (typeof n.tagName === 'string') {
    const tagName = n.tagName as RcmlTagName
    // Widen to `RcmlNodeSpec` for dynamic attr-name lookup — the narrow
    // per-tag type preserves literal attr keys for type-level derivation
    // elsewhere but refuses `spec.attrs[name]` for a `string` name.
    const spec: RcmlNodeSpec | undefined = RCML_SCHEMA_SPEC[tagName]

    if (spec && isPlainObject(n.attributes)) {
      for (const [name, value] of Object.entries(n.attributes)) {
        const attrSpec = spec.attrs[name] as RcmlAttrSpec | undefined

        if (!attrSpec) continue // unknown — AJV already reported it

        const zod = RCML_ATTR_VALIDATORS[attrSpec.validator as RcmlAttributeValidatorsEnum]
        const result = zod.safeParse(value)

        if (!result.success) {
          const firstMessage = result.error.issues[0]?.message ?? 'Invalid attribute value.'

          issues.push({
            path: `${path}/attributes/${name}`,
            code: EmailTemplateErrorCodes.ATTR_INVALID_VALUE,
            message: firstMessage,
          })
        }
      }
    }
  }

  if (Array.isArray(n.children)) {
    n.children.forEach((child, i) => {
      visit(child, `${path}/children/${i}`, issues)
    })
  }
}

/**
 * Narrow `value` to a plain object (non-array, non-null). Used as a guard
 * before reading shape-dependent properties.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
