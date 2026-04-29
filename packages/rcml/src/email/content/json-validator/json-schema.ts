import type { FlavorConfig } from '../flavors/types.js'

// ─── Concrete node $defs (shared across all flavors) ──────────────────────────
//
// These schemas describe individual node/mark shapes. They never change between
// flavors — only the union definitions (block, inline, mark) change.

/**
 * Shared JSON Schema `$defs` for all concrete node and mark shapes.
 * These are referenced by `$ref` from union schemas and never change between flavors.
 * @internal
 */
const CONCRETE_DEFS = {
  // ─── Block nodes ────────────────────────────────────────────────────────────

  paragraph: {
    type: 'object',
    properties: {
      type: { const: 'paragraph' },
      content: {
        type: 'array',
        items: { $ref: '#/$defs/inline' },
      },
    },
    required: ['type'],
    additionalProperties: false,
  },

  'bullet-list': {
    type: 'object',
    properties: {
      type: { const: 'bullet-list' },
      attrs: {
        type: 'object',
        properties: {
          spread: { type: 'boolean' },
        },
        required: ['spread'],
        additionalProperties: false,
      },
      content: {
        type: 'array',
        items: { $ref: '#/$defs/list-item' },
        minItems: 1,
      },
    },
    required: ['type', 'attrs', 'content'],
    additionalProperties: false,
  },

  'ordered-list': {
    type: 'object',
    properties: {
      type: { const: 'ordered-list' },
      attrs: {
        type: 'object',
        properties: {
          order: { type: 'number' },
          spread: { type: 'boolean' },
        },
        required: ['order', 'spread'],
        additionalProperties: false,
      },
      content: {
        type: 'array',
        items: { $ref: '#/$defs/list-item' },
        minItems: 1,
      },
    },
    required: ['type', 'attrs', 'content'],
    additionalProperties: false,
  },

  'list-item': {
    type: 'object',
    properties: {
      type: { const: 'list-item' },
      attrs: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          'list-type': { type: 'string' },
          spread: { type: 'string' },
        },
        required: ['label', 'list-type', 'spread'],
        additionalProperties: false,
      },
      content: {
        type: 'array',
        items: { $ref: '#/$defs/block' },
        minItems: 1,
      },
    },
    required: ['type', 'attrs', 'content'],
    additionalProperties: false,
  },

  align: {
    type: 'object',
    properties: {
      type: { const: 'align' },
      attrs: {
        type: 'object',
        properties: {
          value: { enum: ['left', 'center', 'right'] },
        },
        required: ['value'],
        additionalProperties: false,
      },
      content: {
        type: 'array',
        items: { $ref: '#/$defs/block' },
        minItems: 1,
      },
    },
    required: ['type', 'attrs', 'content'],
    additionalProperties: false,
  },

  // ─── Inline nodes ────────────────────────────────────────────────────────────

  text: {
    type: 'object',
    properties: {
      type: { const: 'text' },
      text: { type: 'string' },
      marks: {
        type: 'array',
        items: { $ref: '#/$defs/mark' },
      },
    },
    required: ['type', 'text'],
    additionalProperties: false,
  },

  hardbreak: {
    type: 'object',
    properties: {
      type: { const: 'hardbreak' },
      attrs: {
        type: 'object',
        properties: {
          isInline: { type: 'boolean' },
        },
        required: ['isInline'],
        additionalProperties: false,
      },
    },
    required: ['type', 'attrs'],
    additionalProperties: false,
  },

  placeholder: {
    type: 'object',
    properties: {
      type: { const: 'placeholder' },
      attrs: {
        type: 'object',
        properties: {
          // Note: 'type' here is the placeholder content type attr, distinct from the node type
          type: { enum: ['CustomField', 'Subscriber', 'User', 'RemoteContent', 'Date'] },
          value: { type: ['string', 'number', 'null'] },
          name: { type: 'string' },
          original: { type: 'string' },
          'max-length': { type: ['string', 'null'] },
        },
        required: ['type', 'value', 'name', 'original', 'max-length'],
        additionalProperties: false,
      },
    },
    required: ['type', 'attrs'],
    additionalProperties: false,
  },

  'loop-value': {
    type: 'object',
    properties: {
      type: { const: 'loop-value' },
      attrs: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          value: { type: 'string' },
          index: { type: 'string' },
        },
        required: ['original', 'value', 'index'],
        additionalProperties: false,
      },
    },
    required: ['type', 'attrs'],
    additionalProperties: false,
  },

  'placeholder-value-fragment': {
    type: 'object',
    properties: {
      type: { const: 'placeholder-value-fragment' },
      attrs: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
        additionalProperties: false,
      },
    },
    required: ['type', 'attrs'],
    additionalProperties: false,
  },

  // ─── Mark nodes ──────────────────────────────────────────────────────────────

  'font-mark': {
    type: 'object',
    properties: {
      type: { const: 'font' },
      attrs: {
        type: 'object',
        properties: {
          'font-family': { type: ['string', 'null'] },
          'font-size': { type: ['string', 'null'] },
          'line-height': { type: ['string', 'null'] },
          'letter-spacing': { type: ['string', 'null'] },
          'font-style': { enum: ['normal', 'italic', null] },
          'font-weight': { type: ['string', 'null'] },
          'text-decoration': { enum: ['none', 'underline', 'line-through', null] },
          color: { type: ['string', 'null'] },
        },
        required: [
          'font-family',
          'font-size',
          'line-height',
          'letter-spacing',
          'font-style',
          'font-weight',
          'text-decoration',
          'color',
        ],
        additionalProperties: false,
      },
    },
    required: ['type', 'attrs'],
    additionalProperties: false,
  },

  'link-mark': {
    type: 'object',
    properties: {
      type: { const: 'link' },
      attrs: {
        type: 'object',
        properties: {
          href: { type: 'string', minLength: 1 },
          target: { enum: ['_blank', null] },
          'no-tracked': { enum: ['true', 'false'] },
        },
        required: ['href', 'target', 'no-tracked'],
        additionalProperties: false,
      },
    },
    required: ['type', 'attrs'],
    additionalProperties: false,
  },
}

// ─── Union builders ────────────────────────────────────────────────────────────

/**
 * Build the `block` union schema restricted to block node types permitted by `config`.
 * @internal
 */
function buildBlockUnion(config: FlavorConfig) {
  const oneOf: { $ref: string }[] = [{ $ref: '#/$defs/paragraph' }]

  if (config.allowedBlockNodes.has('list')) {
    oneOf.push({ $ref: '#/$defs/bullet-list' })
    oneOf.push({ $ref: '#/$defs/ordered-list' })
  }

  if (config.allowedContainerDirectives.has('align')) {
    oneOf.push({ $ref: '#/$defs/align' })
  }

  return { type: 'object', oneOf }
}

/**
 * Build the `inline` union schema restricted to inline node types permitted by `config`.
 * @internal
 */
function buildInlineUnion(config: FlavorConfig) {
  const oneOf: { $ref: string }[] = [{ $ref: '#/$defs/text' }]

  if (config.allowedBlockNodes.has('break')) {
    oneOf.push({ $ref: '#/$defs/hardbreak' })
  }

  if (config.allowedLeafDirectives.has('placeholder')) {
    oneOf.push({ $ref: '#/$defs/placeholder' })
  }

  if (config.allowedLeafDirectives.has('loop-value')) {
    oneOf.push({ $ref: '#/$defs/loop-value' })
  }

  if (config.allowedLeafDirectives.has('placeholder-value-fragment')) {
    oneOf.push({ $ref: '#/$defs/placeholder-value-fragment' })
  }

  return { type: 'object', oneOf }
}

/**
 * Build the `mark` union schema restricted to mark types permitted by `config`.
 * Returns `{ not: {} }` when no marks are allowed, so any mark value fails validation.
 * @internal
 */
function buildMarkUnion(config: FlavorConfig) {
  const oneOf: { $ref: string }[] = []

  if (config.allowedTextDirectives.has('font')) {
    oneOf.push({ $ref: '#/$defs/font-mark' })
  }

  if (config.allowedTextDirectives.has('link')) {
    oneOf.push({ $ref: '#/$defs/link-mark' })
  }

  // If no marks are allowed, use `not: {}` so any mark value fails validation
  if (oneOf.length === 0) return { not: {} }

  return { type: 'object', oneOf }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * JSON Schema Draft 2020-12 definition for RCML content JSON.
 *
 * This is the superset schema (all node/mark types allowed). Used when no
 * `FlavorConfig` is supplied to `validateJson` / `safeParseJson`.
 *
 * @internal — not part of the public API; use {@link validateJson} or {@link safeParseJson} instead.
 */
export const rcmlContentJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'rcml-content-json',
  $ref: '#/$defs/doc',

  $defs: {
    doc: {
      type: 'object',
      properties: {
        type: { const: 'doc' },
        content: {
          type: 'array',
          items: { $ref: '#/$defs/block' },
          minItems: 1,
        },
      },
      required: ['type', 'content'],
      additionalProperties: false,
    },

    block: {
      type: 'object',
      oneOf: [
        { $ref: '#/$defs/paragraph' },
        { $ref: '#/$defs/bullet-list' },
        { $ref: '#/$defs/ordered-list' },
        { $ref: '#/$defs/align' },
      ],
    },

    inline: {
      type: 'object',
      oneOf: [
        { $ref: '#/$defs/text' },
        { $ref: '#/$defs/hardbreak' },
        { $ref: '#/$defs/placeholder' },
        { $ref: '#/$defs/loop-value' },
        { $ref: '#/$defs/placeholder-value-fragment' },
      ],
    },

    mark: {
      type: 'object',
      oneOf: [
        { $ref: '#/$defs/font-mark' },
        { $ref: '#/$defs/link-mark' },
      ],
    },

    ...CONCRETE_DEFS,
  },
} as const

/**
 * Build a JSON Schema Draft 2020-12 definition restricted to the node/mark
 * types permitted by the given `FlavorConfig`.
 *
 * The returned schema is suitable for passing to `ajv.compile()`. Schemas are
 * cached by `FlavorConfig` reference in the validator layer — do not call this
 * on every validation.
 *
 * @internal — not part of the public API; use {@link validateJson} or {@link safeParseJson} instead.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- return type is a deeply nested schema object; let TypeScript infer it
export function buildJsonSchema(config: FlavorConfig) {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema' as const,
    $id: `rcml-content-json-${config.name}`,
    $ref: '#/$defs/doc' as const,

    $defs: {
      doc: {
        type: 'object',
        properties: {
          type: { const: 'doc' },
          content: {
            type: 'array',
            items: { $ref: '#/$defs/block' },
            minItems: 1,
            ...(config.singleParagraph ? { maxItems: 1 } : {}),
          },
        },
        required: ['type', 'content'],
        additionalProperties: false,
      },

      block: buildBlockUnion(config),
      inline: buildInlineUnion(config),
      mark: buildMarkUnion(config),

      ...CONCRETE_DEFS,
    },
  }
}
