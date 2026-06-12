// ─── Mark types ───────────────────────────────────────────────────────────────

/**
 * A `link` mark that wraps text in a hyperlink with SMS-specific tracking options.
 */
export type SmsLinkMark = {
  type: 'link'
  attrs: {
    /** The link destination URL. May contain `[Type:Name]` placeholders. */
    href: string
    /** Whether click tracking is enabled for this link. */
    track: boolean
    /** Whether URL shortening is enabled for this link. */
    shorten: boolean
  }
}

/** Union of all mark types that can be applied to an {@link SmsTextNode}. */
export type SmsMark = SmsLinkMark

// ─── Inline node types ────────────────────────────────────────────────────────

/**
 * A leaf text node carrying an optional set of marks.
 * `marks` should be omitted (not `[]`) when no marks are applied.
 */
export type SmsTextNode = {
  type: 'text'
  /** The raw text content. Must be a non-empty string. */
  text: string
  /** Marks applied to this text. Omit rather than setting to `[]`. */
  marks?: SmsMark[]
}

/** An inline hard line-break node. */
export type SmsHardbreakNode = {
  type: 'hardbreak'
  attrs: { isInline: boolean }
}

/**
 * Category of an SMS dynamic placeholder.
 *
 * `'Link'` is SMS-specific and represents special merge-field links such as
 * `[Link:Unsubscribe]` and `[Link:WebBrowser]`.
 */
export type SmsPlaceholderType =
  | 'CustomField'
  | 'Subscriber'
  | 'User'
  | 'RemoteContent'
  | 'Date'
  | 'Link'

/** A dynamic placeholder atom replaced at render time. */
export type SmsPlaceholderNode = {
  type: 'placeholder'
  attrs: {
    /** Category of the placeholder. */
    type: SmsPlaceholderType
    /** Human-readable display name for the placeholder. */
    name: string
    /** Original source token as it appeared in the SFM source (e.g. `[Subscriber:FirstName]`). */
    original: string
    /** The resolved value at generation time, or `null` if unavailable. */
    value: string | number | null
    /** Optional maximum character length for the rendered value. */
    'max-length': string | null
  }
}

/** Union of all inline node types that can appear inside an {@link SmsParagraphNode}. */
export type SmsInlineNode = SmsTextNode | SmsPlaceholderNode | SmsHardbreakNode

// ─── Block node types ─────────────────────────────────────────────────────────

/**
 * A paragraph block node. `content` is omitted for empty paragraphs.
 */
export type SmsParagraphNode = {
  type: 'paragraph'
  content?: SmsInlineNode[]
}

// ─── Root document type ───────────────────────────────────────────────────────

/**
 * The root SMS content JSON document type. This is the shape stored in
 * {@link SmsDocument.content}, returned by {@link sfmToJson}, and accepted by
 * {@link validateSmsJson}.
 */
export type SmsContentJson = {
  type: 'doc'
  content: SmsParagraphNode[]
}

// ─── Validator result types ───────────────────────────────────────────────────

/**
 * A single JSON Schema validation error with a JSON Pointer path.
 */
export type SmsContentValidationError = {
  /** JSON Pointer path to the offending value. Empty string means root. */
  path: string
  /** Human-readable description of the validation failure. */
  message: string
}

/**
 * Discriminated-union result of a non-throwing SMS content validation.
 */
export type SmsContentSafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: SmsContentValidationError[] }
