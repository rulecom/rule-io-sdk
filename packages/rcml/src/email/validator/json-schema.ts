/**
 * Internal: generator that turns the ported NodeSpec map into a JSON Schema
 * 2020-12 document AJV can compile.
 *
 * Emits one `$defs/<tag>` per known RCML tag. Child unions are expressed via
 * `$ref`s — JSON Schema handles recursion (e.g. `rc-wrapper → rc-section →
 * rc-column → rc-wrapper → …`) without extra cycle-detection logic.
 *
 * Attribute VALUES get loose constraints here (just `type: 'string'` /
 * `'number'` / `'boolean'` / `enum` when the Zod schema is a plain enum).
 * Rich per-attribute format checks live in `./attr-value-validate.ts`,
 * which owns the Zod schemas that don't cleanly round-trip to JSON Schema.
 *
 * For `rc-text` / `rc-heading` / `rc-button`, the `content` property is
 * permissive here; `./content-validate.ts` re-validates it properly.
 */

import { RCML_SCHEMA_SPEC, RcmlTagNamesEnum, TAGS_WITH_PM_CONTENT } from '../schema/index.js'
import type { RcmlNodeSpec, RcmlTagName } from '../schema/index.js'
import { RcmlAttributeValidatorsEnum } from './attr-validators.js'

/** Permissive view of an arbitrary JSON Schema fragment. */
type JsonSchema = Record<string, unknown>

/**
 * Coarse per-validator JSON Schema hints. Covers the "cheap" validators
 * (enums, plain string/number/bool). Complex ones (padding, border,
 * background-*) are left to {@link DEFAULT_ATTR_SCHEMA} and caught at runtime
 * by `./attr-value-validate.ts` via the matching Zod schema.
 */
const JSON_SCHEMA_BY_VALIDATOR: Partial<Record<RcmlAttributeValidatorsEnum, JsonSchema>> = {
  [RcmlAttributeValidatorsEnum.Boolean]: { type: 'boolean' },
  [RcmlAttributeValidatorsEnum.CaseActive]: { type: 'boolean' },
  [RcmlAttributeValidatorsEnum.CaseProperty]: { type: 'number' },
  [RcmlAttributeValidatorsEnum.CaseValue]: { type: ['string', 'number'] },
  [RcmlAttributeValidatorsEnum.LoopValue]: { type: ['string', 'number'] },
  [RcmlAttributeValidatorsEnum.Align]: { enum: ['left', 'center', 'right'] },
  [RcmlAttributeValidatorsEnum.TextAlign]: { enum: ['left', 'center', 'right', 'justify'] },
  [RcmlAttributeValidatorsEnum.VerticalAlign]: { enum: ['top', 'middle', 'bottom'] },
  [RcmlAttributeValidatorsEnum.Direction]: { enum: ['ltr', 'rtl'] },
  [RcmlAttributeValidatorsEnum.BackgroundRepeat]: { enum: ['repeat', 'no-repeat'] },
  [RcmlAttributeValidatorsEnum.FontStyle]: { enum: ['normal', 'italic', 'oblique'] },
  [RcmlAttributeValidatorsEnum.FontWeight]: {
    enum: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  },
  [RcmlAttributeValidatorsEnum.FullWidth]: { enum: ['full-width', 'false'] },
  [RcmlAttributeValidatorsEnum.HideSection]: { enum: ['desktop', 'mobile'] },
  [RcmlAttributeValidatorsEnum.FluidOnMobile]: { enum: ['true', 'false'] },
  [RcmlAttributeValidatorsEnum.SocialMode]: { enum: ['horizontal', 'vertical'] },
  [RcmlAttributeValidatorsEnum.SocialIconColor]: { enum: ['brand', 'black', 'white'] },
  [RcmlAttributeValidatorsEnum.SocialIconShape]: { enum: ['original', 'circle', 'square'] },
  [RcmlAttributeValidatorsEnum.TableLayout]: { enum: ['auto', 'fixed'] },
  [RcmlAttributeValidatorsEnum.Target]: { enum: ['_blank', '_self', '_parent', '_top'] },
  [RcmlAttributeValidatorsEnum.TextDecoration]: {
    enum: ['none', 'underline', 'overline', 'line-through'],
  },
  [RcmlAttributeValidatorsEnum.TextTransform]: {
    enum: ['capitalize', 'uppercase', 'lowercase'],
  },
  [RcmlAttributeValidatorsEnum.BorderStyle]: {
    enum: ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'],
  },
  [RcmlAttributeValidatorsEnum.CaseType]: {
    enum: ['default', 'segment', 'tag', 'custom-field'],
  },
  [RcmlAttributeValidatorsEnum.CaseCondition]: { enum: ['eq', 'ne'] },
  [RcmlAttributeValidatorsEnum.LoopType]: {
    enum: ['news-feed', 'remote-content', 'custom-field', 'xml-doc'],
  },
  [RcmlAttributeValidatorsEnum.PositiveNumber]: { type: ['string', 'number'] },
  [RcmlAttributeValidatorsEnum.LoopMaxIterations]: { type: ['string', 'number'] },
}

/** Fallback attribute schema for validators without a cheap JSON Schema hint. */
const DEFAULT_ATTR_SCHEMA: JsonSchema = { type: 'string' }

/**
 * Build the `attributes` object schema for one RCML tag by mapping each
 * allowed attribute to a loose JSON Schema constraint based on its Zod
 * validator. `additionalProperties: false` rejects unknown attrs.
 */
function buildAttrsSchema(spec: RcmlNodeSpec): JsonSchema {
  const properties: Record<string, JsonSchema> = {}

  for (const [name, attr] of Object.entries(spec.attrs)) {
    properties[name] = JSON_SCHEMA_BY_VALIDATOR[attr.validator] ?? DEFAULT_ATTR_SCHEMA
  }

  return {
    type: 'object',
    properties,
    additionalProperties: false,
  }
}

/**
 * Build the `children` array schema for one non-leaf tag. Uses `$ref` to
 * reference each allowed child tag by name, and applies `maxItems` when the
 * NodeSpec caps the child count.
 */
function buildChildrenSchema(spec: RcmlNodeSpec): JsonSchema {
  const childTypes = spec.validChildTypes ?? []
  const items: JsonSchema =
    childTypes.length === 0
      ? { type: 'object', not: { type: 'object' } } // empty children only
      : childTypes.length === 1 && childTypes[0]
        ? { $ref: `#/$defs/${childTypes[0]}` }
        : { oneOf: childTypes.map((t) => ({ $ref: `#/$defs/${t}` })) }

  const schema: JsonSchema = {
    type: 'array',
    items,
  }

  if (typeof spec.maxChildCount === 'number') {
    schema['maxItems'] = spec.maxChildCount
  }

  return schema
}

/**
 * Build the complete JSON Schema for one RCML tag — its `tagName` const,
 * `attributes` bag, optional `children` array or `content` ProseMirror doc.
 * `additionalProperties: false` rejects anything else.
 */
function buildTagSchema(tagName: RcmlTagName, spec: RcmlNodeSpec): JsonSchema {
  const properties: Record<string, JsonSchema> = {
    id: { type: 'string' },
    tagName: { const: tagName },
    attributes: buildAttrsSchema(spec),
  }

  const required: string[] = ['tagName']

  if (!spec.isLeaf) {
    properties['children'] = buildChildrenSchema(spec)
    required.push('children')
  }

  if (TAGS_WITH_PM_CONTENT.includes(tagName)) {
    properties['content'] = {} // accept-anything; validated by content-validate.ts
    required.push('content')
  }

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  }
}

/**
 * Complete JSON Schema 2020-12 describing an RcmlDocument (rooted at `rcml`).
 * AJV can compile this once at startup and validate any input against it.
 */
export const RCML_JSON_SCHEMA: JsonSchema = (() => {
  const $defs: Record<string, JsonSchema> = {}

  for (const tagName of Object.values(RcmlTagNamesEnum)) {
    const spec = RCML_SCHEMA_SPEC[tagName]
    $defs[tagName] = buildTagSchema(tagName, spec)
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'rcml-email-template',
    $ref: `#/$defs/${RcmlTagNamesEnum.Rcml}`,
    $defs,
  }
})()
