/**
 * `renderTemplate(xml, context)` — public entry point of
 * `@rule-io/templates`.
 *
 * Processes an Angular-like XML template: evaluates `*ngIf` / `*ngFor` /
 * `[attr]` directives and runs `{{ expression }}` interpolation inside
 * text content, then serialises back to XML.
 *
 * @public
 */

import { XMLBuilder, XMLParser } from 'fast-xml-parser'

import { evaluateExpression, type Scope } from './expression.js'
import { TemplateRenderError, type TemplateContext } from './types.js'

/**
 * Process `xml` against `context` and return the interpolated XML
 * string. See the package README and {@link TemplateContext} for the
 * supported syntax.
 *
 * @public
 */
const ATTR_PREFIX = '@_'

export function renderTemplate(xml: string, context: TemplateContext): string {
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: ATTR_PREFIX,
    allowBooleanAttributes: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    unpairedTags: [],
  })

  const tree = parser.parse(xml) as PreservedOrderTree

  const processed = walkNodes(tree, [context as Scope], '')

  const builder = new XMLBuilder({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: ATTR_PREFIX,
    suppressEmptyNode: false,
    format: false,
    // Keep `"` un-escaped in text content so RFM syntax like
    // `::placeholder{name="firstName"}` survives the round-trip.
    // Attribute values still get proper escaping from the builder.
    processEntities: false,
  })

  return builder.build(processed) as string
}

export { TemplateRenderError } from './types.js'
export type { TemplateContext } from './types.js'

// ─── Internal tree model ────────────────────────────────────────────────────

/**
 * `fast-xml-parser`'s `preserveOrder: true` shape: each node is a single-
 * key object. The key is either an element tag (whose value is an array
 * of child nodes) or a special key like `#text` / `?xml` / `!--` (whose
 * value is the text content). Attributes live on a sibling `:@` key.
 */
type PreservedOrderNode = Record<string, unknown>
type PreservedOrderTree = PreservedOrderNode[]

const ATTR_KEY = ':@'
const TEXT_KEY = '#text'

// ─── Walker ─────────────────────────────────────────────────────────────────

function walkNodes(
  nodes: PreservedOrderTree,
  scopes: readonly Scope[],
  path: string,
): PreservedOrderTree {
  const out: PreservedOrderTree = []

  for (const node of nodes) {
    const result = walkNode(node, scopes, path)

    if (Array.isArray(result)) {
      out.push(...result)
    } else if (result !== undefined) {
      out.push(result)
    }
  }

  return out
}

/**
 * Returns the transformed node (or an array of nodes for `*ngFor`), or
 * `undefined` if the node is dropped (e.g. `*ngIf` with falsy
 * expression).
 */
function walkNode(
  node: PreservedOrderNode,
  scopes: readonly Scope[],
  path: string,
): PreservedOrderNode | PreservedOrderNode[] | undefined {
  // Find the tag key (first non-:@ key)
  const tag = elementTag(node)

  if (tag === undefined) {
    return node
  }

  if (tag === TEXT_KEY) {
    // Text node: interpolate {{ … }}
    const raw = node[TEXT_KEY]
    const text = typeof raw === 'string' ? raw : String(raw)

    return { [TEXT_KEY]: interpolateText(text, scopes, `${path}/#text`) }
  }

  // Structural element: extract attrs (may contain *ngIf / *ngFor / [attr])
  const attrs = extractAttributes(node)
  const children = (node[tag] as PreservedOrderTree | undefined) ?? []
  const nodePath = `${path}/${tag}`

  // *ngFor — repeat element for each item
  const ngForExpr = attrs['*ngFor']

  if (ngForExpr !== undefined) {
    const forSpec = parseForExpression(ngForExpr, nodePath)
    const collection = safeEvaluate(forSpec.expression, scopes, nodePath)

    if (!Array.isArray(collection)) {
      throw new TemplateRenderError(
        `*ngFor expression did not resolve to an array: '${forSpec.expression}'`,
        nodePath,
      )
    }

    const results: PreservedOrderNode[] = []

    for (let i = 0; i < collection.length; i++) {
      const itemScope: Scope = {
        [forSpec.itemName]: collection[i],
        $index: i,
        $first: i === 0,
        $last: i === collection.length - 1,
      }
      // Clone attrs minus *ngFor, *ngIf (handled inside the iteration body)
      const innerNode = cloneNodeStrip(node, ['*ngFor'])
      const result = walkNode(innerNode, [...scopes, itemScope], nodePath)

      if (Array.isArray(result)) results.push(...result)
      else if (result !== undefined) results.push(result)
    }

    return results
  }

  // *ngIf — drop element if expression is falsy
  const ngIfExpr = attrs['*ngIf']

  if (ngIfExpr !== undefined) {
    const value = safeEvaluate(ngIfExpr, scopes, nodePath)

    if (!value) return undefined
  }

  // Process attributes: evaluate [attr] bindings, strip * directives
  const newAttrs: Record<string, string> = {}

  for (const [name, rawValue] of Object.entries(attrs)) {
    if (name === '*ngIf' || name === '*ngFor') continue
    // fast-xml-parser yields `true` for valueless boolean attributes;
    // coerce so downstream string ops always see a string.
    const raw = typeof rawValue === 'string' ? rawValue : String(rawValue)

    if (name.startsWith('[') && name.endsWith(']')) {
      const bareName = name.slice(1, -1)
      const evaluated = safeEvaluate(raw, scopes, nodePath)

      // Omit attribute when the bound expression resolves to undefined/null
      if (evaluated === undefined || evaluated === null) continue

      newAttrs[bareName] = escapeXmlAttr(String(evaluated))
      continue
    }

    // Plain attribute — interpolate `{{ }}` then escape `"` (interpolation
    // already escaped `& < >`) so the XMLBuilder sees a valid attr value.
    newAttrs[name] = interpolateAttr(raw, scopes, `${nodePath}/@${name}`)
  }

  // Recurse into children
  const newChildren = walkNodes(children, scopes, nodePath)

  // Build the transformed node. Attributes go back under `:@` with the
  // `@_` prefix restored so XMLBuilder serialises them as attributes.
  const result: PreservedOrderNode = { [tag]: newChildren }

  if (Object.keys(newAttrs).length > 0) {
    const prefixed: Record<string, string> = {}

    for (const [name, value] of Object.entries(newAttrs)) {
      prefixed[`${ATTR_PREFIX}${name}`] = value
    }

    result[ATTR_KEY] = prefixed
  }

  return result
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return the element tag (first key other than `:@`). */
function elementTag(node: PreservedOrderNode): string | undefined {
  for (const key of Object.keys(node)) {
    if (key !== ATTR_KEY) return key
  }

  return undefined
}

/**
 * Extract the node's attributes (stored under `:@` key by fast-xml-parser's
 * preserveOrder mode, each attribute name prefixed with `@_`). Returns a
 * plain `{ attrName: value }` map with the prefix stripped.
 */
function extractAttributes(node: PreservedOrderNode): Record<string, string> {
  const attrs = node[ATTR_KEY]

  if (!attrs || typeof attrs !== 'object') return {}

  const out: Record<string, string> = {}

  for (const [prefixed, value] of Object.entries(attrs as Record<string, string>)) {
    const name = prefixed.startsWith(ATTR_PREFIX) ? prefixed.slice(ATTR_PREFIX.length) : prefixed

    out[name] = value
  }

  return out
}

/** Clone node minus the named (unprefixed) attribute keys. */
function cloneNodeStrip(node: PreservedOrderNode, stripAttrs: string[]): PreservedOrderNode {
  const clone: PreservedOrderNode = {}

  for (const [key, value] of Object.entries(node)) {
    if (key === ATTR_KEY) {
      const attrs = { ...(value as Record<string, string>) }

      for (const strip of stripAttrs) {
        delete attrs[`${ATTR_PREFIX}${strip}`]
      }

      if (Object.keys(attrs).length > 0) clone[ATTR_KEY] = attrs
      continue
    }

    clone[key] = value
  }

  return clone
}

/**
 * Run `{{ expression }}` interpolation on a raw text or attribute value.
 * Undefined/null interpolations render as empty strings.
 */
function interpolateText(text: string, scopes: readonly Scope[], path: string): string {
  // Fast path: no interpolations
  if (!text.includes('{{')) return text

  let out = ''
  let i = 0

  while (i < text.length) {
    const open = text.indexOf('{{', i)

    if (open === -1) {
      out += text.slice(i)
      break
    }

    out += text.slice(i, open)
    const close = text.indexOf('}}', open + 2)

    if (close === -1) {
      throw new TemplateRenderError(
        `Unterminated interpolation starting at offset ${String(open)} in '${text}'`,
        path,
      )
    }

    const expr = text.slice(open + 2, close).trim()
    const value = safeEvaluate(expr, scopes, path)

    out += escapeXml(stringify(value))
    i = close + 2
  }

  return out
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return ''

  return String(value)
}

/**
 * Escape `&`, `<`, `>` for safe insertion into XML text content. `"` is
 * deliberately NOT escaped so RFM inline syntax like
 * `::placeholder{name="firstName"}` survives the round-trip intact;
 * `fast-xml-parser`'s `processEntities: false` builder option passes
 * the encoded form through unchanged.
 */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Escape `&`, `<`, `>`, `"` for safe insertion into an XML attribute
 * value. `"` must be escaped because XMLBuilder wraps attributes with
 * double-quote delimiters; an unescaped `"` would terminate the
 * attribute prematurely.
 */
function escapeXmlAttr(s: string): string {
  return escapeXml(s).replace(/"/g, '&quot;')
}

/**
 * Interpolate `{{ expression }}` placeholders in an attribute value
 * (called on `attr="..."` raw values). Differs from
 * {@link interpolateText} only in that the resulting value is further
 * escaped for attribute context (`"` → `&quot;`).
 */
function interpolateAttr(raw: string, scopes: readonly Scope[], path: string): string {
  const textRendered = interpolateText(raw, scopes, path)

  // interpolateText already escaped `& < >`; apply the `"` pass here so
  // authors writing a plain attribute with embedded quotes (via `{{ }}`)
  // still produce valid XML.
  return textRendered.replace(/"/g, '&quot;')
}

interface ForSpec {
  itemName: string
  expression: string
}

/** Parse `let X of Y` into `{ itemName: 'X', expression: 'Y' }`. */
function parseForExpression(raw: string, path: string): ForSpec {
  const m = /^\s*let\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+of\s+(.+)$/s.exec(raw)

  if (!m) {
    throw new TemplateRenderError(
      `Invalid *ngFor expression: '${raw}' (expected 'let item of collection')`,
      path,
    )
  }

  return { itemName: m[1]!, expression: m[2]!.trim() }
}

/** Evaluate with errors re-wrapped to carry the node path. */
function safeEvaluate(expr: string, scopes: readonly Scope[], path: string): unknown {
  try {
    return evaluateExpression(expr, scopes)
  } catch (err) {
    if (err instanceof TemplateRenderError) {
      throw new TemplateRenderError(err.message, path, err.source)
    }

    throw new TemplateRenderError(
      `Evaluation error: ${err instanceof Error ? err.message : String(err)}`,
      path,
      expr,
    )
  }
}
