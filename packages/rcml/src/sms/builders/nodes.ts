/**
 * Public API: typed factories for SMS content JSON nodes.
 *
 * Each builder returns a correctly shaped node from
 * {@link SmsContentJson}. Builders are pure factories — no validation, no
 * normalization beyond the type signatures. Validation happens at the
 * document boundary via {@link createSmsDocument} or {@link safeParseSmsJson}.
 *
 * @public
 */

import type {
  SmsContentJson,
  SmsHardbreakNode,
  SmsInlineNode,
  SmsMark,
  SmsParagraphNode,
  SmsTextNode,
} from './../content/json-validator/types.js'

// ─── Text node ────────────────────────────────────────────────────────────────

/** Options for {@link createTextNode}. @public */
export interface CreateSmsTextNodeOptions {
  /** The text content. Must be a non-empty string. */
  text: string
  /** Optional marks. Omit (do not pass `[]`) when no marks apply. */
  marks?: SmsMark[]
}

/**
 * Build an {@link SmsTextNode} — a leaf inline node carrying a string of
 * text, optionally with one or more marks.
 *
 * @example
 * ```ts
 * sms.createTextNode({ text: 'Hello, ' })
 * // → { type: 'text', text: 'Hello, ' }
 *
 * sms.createTextNode({
 *   text: 'click here',
 *   marks: [sms.createLinkMark({ href: 'https://example.com', track: true, shorten: false })],
 * })
 * ```
 * @public
 */
export function createTextNode(opts: CreateSmsTextNodeOptions): SmsTextNode {
  if (opts.marks !== undefined && opts.marks.length > 0) {
    return { type: 'text', text: opts.text, marks: opts.marks }
  }

  return { type: 'text', text: opts.text }
}

// ─── Hardbreak node ───────────────────────────────────────────────────────────

/**
 * Build an {@link SmsHardbreakNode} — a forced line break that stays
 * inside the current paragraph.
 *
 * @example
 * ```ts
 * sms.createHardbreakNode()
 * // → { type: 'hardbreak', attrs: { isInline: false } }
 * ```
 * @public
 */
export function createHardbreakNode(): SmsHardbreakNode {
  return { type: 'hardbreak', attrs: { isInline: false } }
}

// ─── Paragraph node ───────────────────────────────────────────────────────────

/** Options for {@link createParagraphNode}. @public */
export interface CreateSmsParagraphNodeOptions {
  /**
   * Inline nodes that make up the paragraph. Omit or pass `[]` to construct
   * an empty paragraph (the resulting node will have no `content` field).
   */
  content?: SmsInlineNode[]
}

/**
 * Build an {@link SmsParagraphNode} — a block node holding a sequence of
 * inline nodes.
 *
 * @example
 * ```ts
 * sms.createParagraphNode({
 *   content: [
 *     sms.createTextNode({ text: 'Hi ' }),
 *     sms.createSubscriberPlaceholder({ field: 'FirstName' }),
 *     sms.createTextNode({ text: '!' }),
 *   ],
 * })
 * ```
 * @public
 */
export function createParagraphNode(
  opts: CreateSmsParagraphNodeOptions = {},
): SmsParagraphNode {
  if (opts.content === undefined || opts.content.length === 0) {
    return { type: 'paragraph' }
  }

  return { type: 'paragraph', content: opts.content }
}

// ─── Root content document ────────────────────────────────────────────────────

/** Options for {@link createContent}. @public */
export interface CreateSmsContentOptions {
  /**
   * One or more paragraph nodes.
   *
   * The non-empty tuple type matches the SMS content JSON Schema, which
   * requires at least one paragraph (`minItems: 1`). Passing an empty
   * array is a compile error rather than a runtime validation error.
   */
  paragraphs: [SmsParagraphNode, ...SmsParagraphNode[]]
}

/**
 * Build an {@link SmsContentJson} root document — a `doc` node wrapping
 * one or more paragraphs.
 *
 * @example
 * ```ts
 * const content = sms.createContent({
 *   paragraphs: [
 *     sms.createParagraphNode({
 *       content: [sms.createTextNode({ text: 'Hello world' })],
 *     }),
 *   ],
 * })
 * ```
 * @public
 */
export function createContent(opts: CreateSmsContentOptions): SmsContentJson {
  return { type: 'doc', content: opts.paragraphs }
}
