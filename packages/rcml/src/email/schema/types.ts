/**
 * NodeSpec shape used by the RCML schema — validator-only subset.
 *
 * Carries just the fields the validator needs: `attrs`, `isLeaf`,
 * `validChildTypes`, `maxChildCount`. Editor-runtime concerns (computed
 * attributes, rendering hooks) are intentionally out of scope — validation
 * is syntactic only.
 */

// Deep import keeps the type-only import aligned with the value import in
// `./specs.ts`, which bypasses `../validator/index.js` to avoid a cycle.
import type { RcmlAttributeValidatorsEnum } from '../validator/attr-validators.js'
import type { RcmlTagName } from './tag-names.js'

/** Per-attribute declaration on a NodeSpec. */
export type RcmlAttrSpec = {
  /** Name of the attribute-value Zod schema in RCML_ATTR_VALIDATORS. */
  validator: RcmlAttributeValidatorsEnum
  /** Default value supplied by the editor when the attribute is omitted. */
  default?: string | number | boolean | null
}

/** Declaration for one RCML tag. */
export interface RcmlNodeSpec {
  /** Allowed attributes + their value validators. Unknown attrs are rejected. */
  attrs: Readonly<Record<string, RcmlAttrSpec>>
  /** `true` ⇒ node may not carry a `children` array (ignoring ProseMirror `content`). */
  isLeaf: boolean
  /** Allowed child tag names when `isLeaf` is false. */
  validChildTypes?: readonly RcmlTagName[]
  /** Upper bound on number of children (e.g. rc-section ≤ 20 columns). */
  maxChildCount?: number
}
