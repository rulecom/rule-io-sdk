/**
 * Public machine-readable SFM (SMS Format Markup) spec.
 *
 * Describes the `sfm-content` flavor at two levels:
 *
 *  - **flavors** — which constructs the flavor permits (inline nodes + marks).
 *  - **nodes / marks** — the JSON document shape: every node and mark type
 *    with its attributes.
 *
 * The flavor key `'sfm-content'` matches the `content.type` field in
 * {@link SmsPublicTagSpec} so consumers can cross-reference:
 *
 * ```ts
 * const tag    = smsSpec.tags['rc-sms']         // content.type === 'sfm-content'
 * const flavor = sfmSpec.flavors['sfm-content']  // describes the valid content
 * ```
 *
 * For the backend placeholder tokens that are valid in SMS, cross-reference
 * with {@link smsPlaceholderSpec}.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

/** Per-attribute descriptor inside an SFM node or mark spec. @public */
export interface SfmAttrSpec {
  /** Broad value type, e.g. `'string'`, `'boolean'`, `'enum'`. */
  type: string
  /** `true` when the attribute must be present. */
  required: boolean
  /** Human-readable description. */
  description: string
  /** Representative valid values. */
  examples?: string[]
  /** Exhaustive list of allowed values for enum attributes. */
  allowedValues?: string[]
}

/** Describes one JSON node type. @public */
export interface SfmNodeSpec {
  /** Human-readable description. */
  description: string
  /** Allowed attributes on this node's `attrs` object, if any. */
  attrs?: Record<string, SfmAttrSpec>
  /** Prose description of what the `content` array may hold. */
  contentDescription?: string
}

/** Describes one mark type. @public */
export interface SfmMarkSpec {
  /** Human-readable description. */
  description: string
  /** Allowed attributes on the mark's `attrs` object. */
  attrs: Record<string, SfmAttrSpec>
}

/** Describes the SFM content flavor. @public */
export interface SfmFlavorSpec {
  /** Human-readable description. */
  description: string
  /** JSON node types that may appear in `doc.content` (block level). */
  blockNodes: string[]
  /** JSON node/mark types available as inline content inside paragraphs. */
  inlineNodes: string[]
  /** Mark types that may be applied to text nodes. */
  marks: string[]
}

/**
 * Top-level machine-readable SFM specification exported from `@rulecom/rcml`.
 *
 * @public
 */
export interface SfmSpec {
  /** Spec format version. */
  version: string
  /** Flavors keyed by their content type string. SMS has one: `'sfm-content'`. */
  flavors: Record<string, SfmFlavorSpec>
  /** All JSON node types (doc, paragraph, text, placeholder, hardbreak). */
  nodes: Record<string, SfmNodeSpec>
  /** All JSON mark types (link). */
  marks: Record<string, SfmMarkSpec>
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

const NODE_META: Record<string, SfmNodeSpec> = {
  doc: {
    description:
      'Root document node. Its `content` array holds one or more paragraph blocks.',
    contentDescription: 'One or more paragraph nodes.',
  },
  paragraph: {
    description:
      'A paragraph of inline content. SMS documents may contain multiple paragraphs separated by blank lines in SFM.',
    contentDescription: 'Zero or more inline nodes (text, placeholder, hardbreak).',
  },
  text: {
    description: 'A plain text run. May carry a link mark.',
    attrs: {
      text: {
        type: 'string',
        required: true,
        description: 'The text content. Must not be empty.',
        examples: ['Hello, world!'],
      },
    },
    contentDescription: 'No children — text is a leaf node. Marks are applied via the `marks` array.',
  },
  placeholder: {
    description:
      'A dynamic value inserted at render time (e.g. subscriber first name, custom field value). ' +
      'See `smsPlaceholderSpec` for the token syntax and parameters for each `type`.',
    attrs: {
      type: {
        type: 'enum',
        required: true,
        description:
          'The backend token category. Each value corresponds to a token in `smsPlaceholderSpec.tokens`.',
        allowedValues: ['CustomField', 'Subscriber', 'User', 'RemoteContent', 'Date', 'Link'],
        examples: ['Subscriber', 'CustomField', 'Link'],
      },
      name: {
        type: 'string',
        required: true,
        description: 'Human-readable display name shown in the editor. Not interpreted by the renderer.',
        examples: ['First name', 'Order total'],
      },
      original: {
        type: 'string',
        required: true,
        description:
          'The backend token string substituted by the renderer at send time. Must conform to the syntax for the given `type` — see `smsPlaceholderSpec.tokens[type]` for the exact pattern.',
        examples: ['[Subscriber:email]', '[CustomField:Order.Total]', '[Link:Unsubscribe]'],
      },
      value: {
        type: 'string | number | null',
        required: true,
        description: 'Resolved value shown in preview mode. Set to `null` when not yet resolved.',
        examples: ['Jane', '42', null as unknown as string],
      },
      'max-length': {
        type: 'string | null',
        required: true,
        description: 'Maximum character length for the resolved value, or `null` when no limit.',
        examples: ['20', null as unknown as string],
      },
    },
  },
  hardbreak: {
    description:
      'A hard line break. In SFM source this corresponds to a single `\\n`. ' +
      'Two consecutive newlines (`\\n\\n`) create a new paragraph instead.',
    attrs: {
      isInline: {
        type: 'boolean',
        required: true,
        description:
          'When `true` the break is inline inside a paragraph. ' +
          'The SFM parser always produces `false`; the editor may produce `true` for inline breaks.',
        examples: [],
      },
    },
  },
}

const MARK_META: Record<string, SfmMarkSpec> = {
  link: {
    description:
      'Wraps a text run in a hyperlink with SMS-specific tracking and shortening options. ' +
      'Unlike the email link mark, SMS uses boolean `track`/`shorten` flags instead of ' +
      '`target`/`no-tracked` strings. Link marks are NOT representable in SFM text — ' +
      'construct `SmsContentJson` directly when you need linked text.',
    attrs: {
      href: {
        type: 'string',
        required: true,
        description:
          'Destination URL. Use `[Link:<type>]` tokens for system-managed links ' +
          '(e.g. `[Link:Unsubscribe]`, `[Link:WebBrowser]`). ' +
          'See `smsPlaceholderSpec.tokens[\'Link\']` for all types.',
        examples: ['https://example.com/offer', '[Link:Unsubscribe]'],
      },
      track: {
        type: 'boolean',
        required: true,
        description: 'When `true`, click-through tracking is enabled for this link.',
        examples: ['true', 'false'],
      },
      shorten: {
        type: 'boolean',
        required: true,
        description: 'When `true`, the URL is shortened before sending.',
        examples: ['true', 'false'],
      },
    },
  },
}

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildSfmSpec(): SfmSpec {
  const flavor: SfmFlavorSpec = {
    description:
      'SFM (SMS Format Markup) content flavor. Paragraphs only — no lists, no align blocks. ' +
      'Supports text runs, placeholders, hardbreaks, and link marks. ' +
      'Paragraphs are separated by double newlines in SFM source; single newlines produce hardbreaks.',
    blockNodes: ['paragraph'],
    inlineNodes: ['text', 'placeholder', 'hardbreak'],
    marks: ['link'],
  }

  return {
    version: '0.1.0',
    flavors: { 'sfm-content': flavor },
    nodes: NODE_META,
    marks: MARK_META,
  }
}

/**
 * Machine-readable SFM specification.
 *
 * @example
 * ```ts
 * import { sfmSpec, smsPlaceholderSpec } from '@rulecom/rcml'
 *
 * // Which inline nodes are valid in SMS content?
 * sfmSpec.flavors['sfm-content'].inlineNodes
 * // → ['text', 'placeholder', 'hardbreak']
 *
 * // Attribute schema for the link mark:
 * sfmSpec.marks['link'].attrs['track']
 * // → { type: 'boolean', required: true, description: '...' }
 *
 * // Which placeholder types are allowed?
 * sfmSpec.nodes['placeholder'].attrs?.['type'].allowedValues
 * // → ['CustomField', 'Subscriber', 'User', 'RemoteContent', 'Date', 'Link']
 *
 * // Cross-reference token syntax:
 * smsPlaceholderSpec.tokens['Link'].examples
 * // → ['[Link:Unsubscribe]', '[Link:WebBrowser]', '[Link:Optin]']
 * ```
 * @public
 */
export const sfmSpec: SfmSpec = buildSfmSpec()
