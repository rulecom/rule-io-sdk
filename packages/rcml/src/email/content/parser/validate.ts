import type { ZodType } from 'zod'
import type { Root, RootContent, PhrasingContent } from 'mdast'
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive'
import type { FlavorConfig } from '../flavors/types.js'
import type { ValidationError, ValidationResult } from './types.js'

// ─── Baseline nodes always allowed ────────────────────────────────────────────

const BASELINE_BLOCK_NODES = new Set(['root', 'paragraph'])

// ─── Human-readable labels for MDAST node types ────────────────────────────────

const NODE_LABEL: Record<string, string> = {
  heading: 'heading (`#`)',
  blockquote: 'blockquote (`>`)',
  code: 'fenced code block',
  inlineCode: 'inline code',
  image: 'image (`![]()`)',
  thematicBreak: 'thematic break (`---`)',
  html: 'raw HTML',
  table: 'table',
  strong: 'native bold (`**text**`)',
  emphasis: 'native italic (`*text*`)',
  delete: 'strikethrough (`~~text~~`)',
  link: 'native link (`[text](url)`)',
  break: 'hard break',
  list: 'list',
  listItem: 'list item',
}

// ─── Validator ─────────────────────────────────────────────────────────────────

/**
 * Validate an MDAST Root node against the rules defined in a `FlavorConfig`.
 *
 * Returns a `ValidationResult` with all errors found. Errors include source
 * line/column (when position info is present) and human-readable messages
 * suitable for MCP iteration.
 *
 * @internal
 */
export function validate(ast: Root, config: FlavorConfig): ValidationResult {
  const errors: ValidationError[] = []

  visitBlock(ast.children, [], config, errors)

  return { valid: errors.length === 0, errors }
}

// ─── Error builder ─────────────────────────────────────────────────────────────

/**
 * Construct a {@link ValidationError} with an optional source location.
 * @internal
 */
function makeError(
  path: string[],
  loc: { line: number; column: number } | undefined,
  message: string,
): ValidationError {
  const err: ValidationError = { path: path.join(' > '), message }

  if (loc !== undefined) {
    err.line = loc.line
    err.column = loc.column
  }

  return err
}

// ─── Attribute normaliser ──────────────────────────────────────────────────────

/**
 * Normalise a raw directive attribute map by replacing `null` values with `undefined`.
 * @internal
 */
function normaliseAttrs(
  raw: Record<string, string | null | undefined> | null | undefined,
): Record<string, string | undefined> {
  if (raw == null) return {}
  const out: Record<string, string | undefined> = {}

  for (const [k, v] of Object.entries(raw)) {
    out[k] = v ?? undefined
  }

  return out
}

// ─── Block walker ──────────────────────────────────────────────────────────────

/**
 * Walk a sequence of block nodes, collecting validation errors.
 * @internal
 */
function visitBlock(
  nodes: RootContent[],
  path: string[],
  config: FlavorConfig,
  errors: ValidationError[],
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    if (node === undefined) continue
    const nodePath = [...path, `${node.type}[${i}]`]
    const loc = node.position?.start

    if (BASELINE_BLOCK_NODES.has(node.type)) {
      if (node.type === 'paragraph') {
        visitInline(node.children, nodePath, config, errors)
      }

      continue
    }

    if (node.type === 'leafDirective') {
      validateLeafDirective(node, nodePath, config, errors)
      continue
    }

    if (node.type === 'containerDirective') {
      validateContainerDirective(node, nodePath, config, errors)
      continue
    }

    if (config.allowedBlockNodes.has(node.type)) {
      // Recurse into list / listItem children
      if ('children' in node && Array.isArray(node.children)) {
        visitBlock(node.children, nodePath, config, errors)
      }

      continue
    }

    // Not in baseline, not a container directive, not in allowedBlockNodes → error
    const label = NODE_LABEL[node.type] ?? `"${node.type}"`

    errors.push(makeError(nodePath, loc, `${label} is not supported in ${config.name} content.`))
  }
}

// ─── Inline walker ─────────────────────────────────────────────────────────────

/**
 * Walk a sequence of inline nodes, collecting validation errors.
 * @internal
 */
function visitInline(
  nodes: PhrasingContent[],
  path: string[],
  config: FlavorConfig,
  errors: ValidationError[],
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    if (node === undefined) continue
    const nodePath = [...path, `${node.type}[${i}]`]
    const loc = node.position?.start
    const type = node.type as string

    if (type === 'text') continue

    if (type === 'textDirective') {
      validateTextDirective(node as unknown as TextDirective, nodePath, config, errors)
      continue
    }

    if (type === 'leafDirective') {
      validateLeafDirective(node as unknown as LeafDirective, nodePath, config, errors)
      continue
    }

    // remark-directive can place containerDirectives inline within paragraphs
    if (type === 'containerDirective') {
      validateContainerDirective(node as unknown as ContainerDirective, nodePath, config, errors)
      continue
    }

    if (type === 'break') {
      if (!config.allowedBlockNodes.has('break')) {
        errors.push(makeError(nodePath, loc, `hard break is not supported as inline content in ${config.name}.`))
      }

      continue
    }

    const label = NODE_LABEL[type] ?? `"${type}"`

    errors.push(makeError(nodePath, loc, `${label} is not supported as inline content in ${config.name}.`))
  }
}

// ─── Directive validators ──────────────────────────────────────────────────────

/**
 * Validate a `:name[...]{...}` text directive against the flavor's allowed set and its Zod schema.
 * @internal
 */
function validateTextDirective(
  node: TextDirective,
  path: string[],
  config: FlavorConfig,
  errors: ValidationError[],
): void {
  const loc = node.position?.start

  if (!config.allowedTextDirectives.has(node.name)) {
    const allowed = [...config.allowedTextDirectives.keys()].map((n) => `:${n}`).join(', ')

    errors.push(makeError(path, loc, `Unknown text directive ":${node.name}". Supported: ${allowed}.`))

    return
  }

  const schema = config.allowedTextDirectives.get(node.name) ?? null

  if (schema !== null) {
    runZodValidation(schema, normaliseAttrs(node.attributes), path, loc, errors)
  }

  if (node.children.length > 0) {
    visitInline(node.children, path, config, errors)
  }
}

/**
 * Validate a `::name{...}` leaf directive against the flavor's allowed set and its Zod schema.
 * @internal
 */
function validateLeafDirective(
  node: LeafDirective,
  path: string[],
  config: FlavorConfig,
  errors: ValidationError[],
): void {
  const loc = node.position?.start

  if (!config.allowedLeafDirectives.has(node.name)) {
    const allowed = [...config.allowedLeafDirectives.keys()].map((n) => `::${n}`).join(', ')

    errors.push(makeError(path, loc, `Unknown leaf directive "::${node.name}". Supported: ${allowed}.`))

    return
  }

  const schema = config.allowedLeafDirectives.get(node.name) ?? null

  if (schema !== null) {
    runZodValidation(schema, normaliseAttrs(node.attributes), path, loc, errors)
  }
}

/**
 * Validate a `:::name{...}` container directive against the flavor's allowed set and its Zod schema.
 * @internal
 */
function validateContainerDirective(
  node: ContainerDirective,
  path: string[],
  config: FlavorConfig,
  errors: ValidationError[],
): void {
  const loc = node.position?.start

  if (!config.allowedContainerDirectives.has(node.name)) {
    const allowed = [...config.allowedContainerDirectives.keys()].map((n) => `:::${n}`).join(', ')

    errors.push(makeError(path, loc, `Unknown container directive ":::${node.name}". Supported: ${allowed}.`))

    return
  }

  const schema = config.allowedContainerDirectives.get(node.name) ?? null

  if (schema !== null) {
    runZodValidation(schema, normaliseAttrs(node.attributes), path, loc, errors)
  }

  if (node.children.length > 0) {
    visitBlock(node.children, path, config, errors)
  }
}

// ─── Zod error runner ──────────────────────────────────────────────────────────

/**
 * Run a Zod schema against directive attributes and append any failures to `errors`.
 * @internal
 */
function runZodValidation(
  schema: ZodType,
  attrs: Record<string, string | undefined>,
  path: string[],
  loc: { line: number; column: number } | undefined,
  errors: ValidationError[],
): void {
  const result = schema.safeParse(attrs)

  if (result.success) return

  for (const issue of result.error.issues) {
    const attrPath = issue.path.length > 0 ? ` (attribute "${issue.path.join('.')}")` : ''

    errors.push(makeError(path, loc, `${issue.message}${attrPath}`))
  }
}
