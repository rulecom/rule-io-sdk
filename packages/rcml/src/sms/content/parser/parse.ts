/**
 * Internal: SMS RFM (SMS Rule Flavor Markdown) string → SmsContentJson conversion.
 *
 * SMS RFM is a markdown-directive-based format:
 *   - `:link[text]{href="..." track="true|false" shorten="true|false"}` → text node with link mark
 *   - `::placeholder{type="..." original="..." name="..." value="..." max-length="..."}` → placeholder node
 *   - `[Type:Name]` → shorthand placeholder (backward-compatible, converted to `::placeholder{...}` before parsing)
 *   - `\\\n` (backslash + newline) or bare `\n` within a paragraph → hardbreak node
 *   - `\n\n` (double newline) → paragraph boundary
 *   - Everything else → text node
 *
 * @internal
 */

import type { Root, PhrasingContent, Paragraph } from 'mdast'
import type { TextDirective, LeafDirective } from 'mdast-util-directive'
import { parse } from '../../../email/content/parser/parse.js'
import { validate } from '../../../email/content/parser/validate.js'
import { preprocessMarkdown, ATOM_TOKEN_DELIMITER, ATOM_TOKEN_SEPARATOR, COLON_ESCAPE } from '../../../email/content/parser/preprocess.js'
import { formatErrors } from '../../../email/content/parser/format.js'
import { RcmlValidationError } from '../../../email/content/parser/parse.js'
import { smsRfmConfig } from '../flavors/sms-rfm.js'
import type {
  SmsContentJson,
  SmsHardbreakNode,
  SmsInlineNode,
  SmsParagraphNode,
  SmsPlaceholderNode,
  SmsPlaceholderType,
  SmsTextNode,
  SmsLinkMark,
} from '../json-validator/types.js'

// ─── Step 1: [Type:Name] shorthand expansion ──────────────────────────────────

/**
 * Matches `[Type:Name]` shorthand placeholders for the known SMS placeholder types only,
 * and only when NOT preceded by `="` (inside a directive attribute value).
 *
 * Restricting to known types prevents `[https://...]` URLs inside `:link[...]{}` brackets
 * from being erroneously expanded. The negative lookbehind for `="` prevents
 * `[CustomField:Name]` tokens inside `original="..."` attribute values from being
 * expanded a second time.
 */
const SHORTHAND_PLACEHOLDER_RE = /(?<!=")(\[(CustomField|Subscriber|User|RemoteContent|Date|Link):([^\]]+)\])/g

/**
 * Convert `[Type:Name]` shorthand tokens to `::placeholder{...}` directive syntax
 * so they are handled uniformly by the remark-directive pipeline.
 *
 * Colons in attribute values are escaped with COLON_ESCAPE to prevent
 * remark-directive from interpreting `:Name` sequences inside attribute values as inline
 * text directives. `convertLeafPlaceholder` decodes them back to `:`.
 *
 * @internal
 */
function expandPlaceholderShorthand(input: string): string {
  return input.replace(SHORTHAND_PLACEHOLDER_RE, (_, full: string, rawType: string, name: string) => {
    const escapedFull = full.replace(/:/g, COLON_ESCAPE)
    const escapedName = name.replace(/:/g, COLON_ESCAPE)

    return `::placeholder{type="${rawType}" original="${escapedFull}" name="${escapedName}" value="" max-length=""}`
  })
}

// ─── Step 2: Convert bare \n (within a paragraph) to \\n (remark hard break) ─

/**
 * Convert lone `\n` (not part of `\n\n`) to `\\\n` so that remark produces
 * `break` (hardbreak) nodes rather than treating them as soft line wraps.
 *
 * Strategy: split on `\n\n` (paragraph boundaries), replace `\n` with `\\\n`
 * in each segment, then rejoin with `\n\n`.
 *
 * @internal
 */
function normalizeHardbreaks(input: string): string {
  const segments = input.split('\n\n')

  return segments.map((segment) => segment.replace(/\n/g, '\\\n')).join('\n\n')
}

// ─── Step 3: MDAST → SmsContentJson conversion ───────────────────────────────

/** @internal */
function convertDoc(ast: Root): SmsContentJson {
  const paragraphs: SmsParagraphNode[] = []

  for (const block of ast.children) {
    if (block.type === 'paragraph') {
      paragraphs.push(convertParagraph(block as Paragraph))
    } else if (block.type === 'leafDirective') {
      // A ::placeholder{...} that ended up at block level (not tokenized by
      // preprocessMarkdown because it was the only thing on its line). Wrap it in a paragraph.
      const d = block as unknown as LeafDirective

      if (d.name === 'placeholder') {
        const node = convertLeafPlaceholder((d.attributes ?? {}) as Record<string, string | null | undefined>)

        paragraphs.push({ type: 'paragraph', content: [node] })
      }
    }
  }

  if (paragraphs.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  return { type: 'doc', content: paragraphs }
}

/** @internal */
function convertParagraph(node: Paragraph): SmsParagraphNode {
  const content = node.children.flatMap((child) => convertInlineNode(child, []))

  if (content.length === 0) {
    return { type: 'paragraph' }
  }

  return { type: 'paragraph', content }
}

/**
 * Convert a single MDAST phrasing content node to SMS inline node(s).
 * `inheritedMarks` carries any link mark from an enclosing `:link` directive.
 * @internal
 */
function convertInlineNode(node: PhrasingContent, inheritedMarks: SmsLinkMark[]): SmsInlineNode[] {
  const type = node.type as string

  switch (type) {
    case 'text': {
      const textNode = node as unknown as { type: string; value: string }

      if (textNode.value.includes(ATOM_TOKEN_DELIMITER)) {
        return expandAtomTokens(textNode.value, inheritedMarks)
      }

      if (textNode.value.length > 0) {
        return [makeTextNode(textNode.value, inheritedMarks)]
      }

      return []
    }

    case 'break':
      return [{ type: 'hardbreak', attrs: { isInline: false } } satisfies SmsHardbreakNode]

    case 'textDirective': {
      const d = node as unknown as TextDirective

      if (d.name === 'link') {
        return convertLinkDirective(d)
      }

      return []
    }

    case 'leafDirective': {
      const d = node as unknown as LeafDirective

      if (d.name === 'placeholder') {
        return [convertLeafPlaceholder((d.attributes ?? {}) as Record<string, string | null | undefined>)]
      }

      return []
    }

    default:
      return []
  }
}

/**
 * Convert a `:link[...]{href track shorten}` textDirective into a sequence of
 * SMS inline nodes, each carrying the link mark.
 * @internal
 */
function convertLinkDirective(node: TextDirective): SmsInlineNode[] {
  const raw = (node.attributes ?? {}) as Record<string, string | null | undefined>
  const mark: SmsLinkMark = {
    type: 'link',
    attrs: {
      href: raw['href'] ?? '',
      track: raw['track'] !== 'false',
      shorten: raw['shorten'] !== 'false',
    },
  }

  return node.children.flatMap((child) => convertInlineNode(child as PhrasingContent, [mark]))
}

/** @internal */
function convertLeafPlaceholder(raw: Record<string, string | null | undefined>): SmsPlaceholderNode {
  const get = (key: string): string | undefined => {
    const v = raw[key]

    return v == null || v === '' ? undefined : v
  }

  // Decode COLON_ESCAPE back to ':' for values that went through expandPlaceholderShorthand
  const decodeColons = (s: string): string => s.replace(new RegExp(COLON_ESCAPE, 'g'), ':')

  return {
    type: 'placeholder',
    attrs: {
      type: (raw['type'] ?? 'Subscriber') as SmsPlaceholderType,
      name: decodeColons(raw['name'] ?? ''),
      original: decodeColons(raw['original'] ?? ''),
      value: coerceAttrValue(raw['value']),
      'max-length': get('max-length') ?? null,
    },
  } satisfies SmsPlaceholderNode
}

/** @internal */
function makeTextNode(text: string, marks: SmsLinkMark[]): SmsTextNode {
  if (marks.length > 0) {
    return { type: 'text', text, marks }
  }

  return { type: 'text', text }
}

// ─── PUA atom token expansion ─────────────────────────────────────────────────

/**
 * Expand PUA-tokenized inline atoms (produced by `preprocessMarkdown`) inside
 * a plain text string, producing a mix of SmsTextNode and SmsPlaceholderNode values.
 * @internal
 */
function expandAtomTokens(text: string, inheritedMarks: SmsLinkMark[]): SmsInlineNode[] {
  const result: SmsInlineNode[] = []
  const parts = text.split(ATOM_TOKEN_DELIMITER)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] ?? ''

    if (i % 2 === 0) {
      if (part.length > 0) {
        result.push(makeTextNode(part, inheritedMarks))
      }
    } else {
      // Token: "nameATOM_TOKEN_SEPARATORrawAttrs"
      const sepIdx = part.indexOf(ATOM_TOKEN_SEPARATOR)
      const name = sepIdx >= 0 ? part.slice(0, sepIdx) : part
      const attrsStr = sepIdx >= 0 ? part.slice(sepIdx + 1) : ''

      if (name === 'placeholder') {
        const rawAttrs = parseTokenAttrs(attrsStr)

        result.push(convertLeafPlaceholder(rawAttrs))
      }
    }
  }

  return result
}

/** Parse `key="val"` pairs from a PUA token attr string. @internal */
function parseTokenAttrs(attrsStr: string): Record<string, string | undefined> {
  const decoded = attrsStr.replace(new RegExp(COLON_ESCAPE, 'g'), ':')
  const result: Record<string, string | undefined> = {}
  const re = /([\w-]+)=(?:"([^"]*)"|(\S+))/g
  let m: RegExpExecArray | null

  while ((m = re.exec(decoded)) !== null) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    result[m[1] as string] = m[2] !== undefined ? m[2] : m[3]
  }

  return result
}

// ─── Attr value coercion ──────────────────────────────────────────────────────

/**
 * Coerce a directive attribute value:
 * - Missing, null, or empty string → `null`
 * - Numeric string → number
 * - Everything else → string as-is
 */
function coerceAttrValue(raw: string | null | undefined): string | number | null {
  if (raw == null || raw === '') return null

  const n = Number(raw)

  if (raw.trim() !== '' && !Number.isNaN(n)) return n

  return raw
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Parse an SMS RFM string into an {@link SmsContentJson} document.
 *
 * Accepts both:
 * - `:link[text]{href track shorten}` directive syntax
 * - `::placeholder{type original name value max-length}` directive syntax
 * - `[Type:Name]` shorthand (backward-compatible)
 * - Bare `\n` within a paragraph (backward-compatible; treated as hardbreak)
 * - `\\\n` (backslash + newline; standard markdown hard break)
 *
 * Throws {@link RcmlValidationError} if the input contains unsupported constructs.
 *
 * @internal — called by the public `smsRfmToJson` wrapper.
 */
export function parseSmsRfm(input: string): SmsContentJson {
  if (input === '') {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  // Step 1: expand [Type:Name] shorthand to ::placeholder{...} directive syntax
  const expanded = expandPlaceholderShorthand(input)

  // Step 2: convert bare \n to \\\n so remark produces break nodes (preserves \n\n boundaries)
  const hardbreaksNormalized = normalizeHardbreaks(expanded)

  // Step 3: tokenize inline ::placeholder atoms so remark sees them as text
  const preprocessed = preprocessMarkdown(hardbreaksNormalized)

  // Step 4: parse with unified + remark-directive
  const { ast } = parse(preprocessed, { position: false })

  // Step 5: validate against SMS RFM flavor
  const validation = validate(ast, smsRfmConfig)

  if (!validation.valid) {
    throw new RcmlValidationError(validation.errors, formatErrors(validation) ?? 'Validation failed')
  }

  // Step 6: convert MDAST → SmsContentJson
  return convertDoc(ast)
}
