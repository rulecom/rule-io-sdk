// ─── Font ─────────────────────────────────────────────────────────────────────

/**
 * Typed representation of `:font` directive attributes, with CSS-hyphenated
 * names converted to camelCase for easier downstream consumption.
 * @internal
 */
export interface FontAttrs {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: string;
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
}

// ─── Inline nodes ─────────────────────────────────────────────────────────────

/**
 * A plain text run.
 * @internal
 */
export interface IrText {
  type: 'text';
  value: string;
}

/**
 * `:font[…]{…}` — styled text span.
 * @internal
 */
export interface IrFont {
  type: 'font';
  attrs: FontAttrs;
  children: IrInline[];
}

/**
 * `:link[…]{href="…"}` — hyperlink.
 * @internal
 */
export interface IrLink {
  type: 'link';
  href: string;
  target?: '_blank';
  noTracked?: boolean;
  children: IrInline[];
}

/**
 * Hard line break (`\` at end of line).
 * @internal
 */
export interface IrHardBreak {
  type: 'hardBreak';
}

/**
 * Union of all inline node types produced by the transformer.
 * @internal
 */
export type IrInline = IrText | IrFont | IrLink | IrHardBreak | IrPlaceholder | IrLoopValue | IrPlaceholderValueFragment;

// ─── Placeholder attrs ────────────────────────────────────────────────────────

/**
 * Typed representation of `:::placeholder` directive attributes.
 * @internal
 */
export interface PlaceholderAttrs {
  type: 'CustomField' | 'Subscriber' | 'User' | 'RemoteContent' | 'Date';
  value: string | number | null;
  name: string;
  original: string;
  maxLength?: string;
}

// ─── Block nodes ──────────────────────────────────────────────────────────────

/**
 * A paragraph containing inline nodes.
 * @internal
 */
export interface IrParagraph {
  type: 'paragraph';
  children: IrInline[];
}

/**
 * `- item` — unordered list.
 * @internal
 */
export interface IrBulletList {
  type: 'bulletList';
  children: IrListItem[];
}

/**
 * `1. item` — ordered list.
 * @internal
 */
export interface IrOrderedList {
  type: 'orderedList';
  children: IrListItem[];
}

/**
 * A single item inside a bullet or ordered list.
 * @internal
 */
export interface IrListItem {
  type: 'listItem';
  children: IrBlock[];
}

/**
 * `:::align{value="center"}` — block alignment wrapper.
 * @internal
 */
export interface IrAlign {
  type: 'align';
  value: 'left' | 'center' | 'right';
  children: IrBlock[];
}

/**
 * `::placeholder{type="…" value="…" name="…" original="…"}` — inline placeholder atom.
 * @internal
 */
export interface IrPlaceholder {
  type: 'placeholder';
  attrs: PlaceholderAttrs;
}

/**
 * `::loop-value{original="…" value="…" index="…"}` — loop variable reference atom.
 * @internal
 */
export interface IrLoopValue {
  type: 'loopValue';
  original: string;
  value: string;
  index: string;
  children: IrBlock[];
}

/**
 * `::placeholder-value-fragment{text="…"}` — text fragment inside a nested placeholder.
 * @internal
 */
export interface IrPlaceholderValueFragment {
  type: 'placeholderValueFragment';
  /** The text content of the fragment, from the `text` directive attribute. */
  text: string;
  children: IrBlock[];
}

/**
 * Union of all top-level block node types produced by the transformer.
 * @internal
 */
export type IrBlock =
  | IrParagraph
  | IrBulletList
  | IrOrderedList
  | IrAlign
  | IrPlaceholder
  | IrLoopValue
  | IrPlaceholderValueFragment;

// ─── Document root ────────────────────────────────────────────────────────────

/**
 * The root IR node — result of calling `transform(ast)`.
 * @internal
 */
export interface IrDoc {
  type: 'doc';
  children: IrBlock[];
}
