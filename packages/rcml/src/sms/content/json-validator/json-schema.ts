/**
 * JSON Schema Draft 2020-12 definition for SMS content JSON.
 *
 * SMS content is structurally simpler than email: only paragraphs (no lists,
 * no align blocks), only link marks (no font marks), and an extended
 * placeholder type set that includes `'Link'`.
 *
 * @internal
 */
export const smsContentJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'sms-content-json',
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
      oneOf: [{ $ref: '#/$defs/paragraph' }],
    },

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

    inline: {
      type: 'object',
      oneOf: [
        { $ref: '#/$defs/text' },
        { $ref: '#/$defs/hardbreak' },
        { $ref: '#/$defs/placeholder' },
      ],
    },

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
            type: {
              enum: ['CustomField', 'Subscriber', 'User', 'RemoteContent', 'Date', 'Link'],
            },
            name: { type: 'string' },
            original: { type: 'string' },
            value: { type: ['string', 'number', 'null'] },
            'max-length': { type: ['string', 'null'] },
          },
          required: ['type', 'name', 'original', 'value', 'max-length'],
          additionalProperties: false,
        },
      },
      required: ['type', 'attrs'],
      additionalProperties: false,
    },

    mark: {
      type: 'object',
      oneOf: [{ $ref: '#/$defs/link-mark' }],
    },

    'link-mark': {
      type: 'object',
      properties: {
        type: { const: 'link' },
        attrs: {
          type: 'object',
          properties: {
            href: { type: 'string', minLength: 1 },
            track: { type: 'boolean' },
            shorten: { type: 'boolean' },
          },
          required: ['href', 'track', 'shorten'],
          additionalProperties: false,
        },
      },
      required: ['type', 'attrs'],
      additionalProperties: false,
    },
  },
} as const
