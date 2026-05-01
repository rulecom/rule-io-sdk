/**
 * Parse the body of a `{{ … }}` interpolation into a typed
 * {@link InterpolationExpression}.
 *
 * The body is dispatched on its first token: `t:` → parameterised
 * message, `data:` → data path, `$ident` → loop-meta variable,
 * identifier → local path. Any other token shape is a parse error.
 *
 * @internal
 */

import { TemplateCompileError } from '../errors.js'
import type { ExpressionNode } from '../expression/ast.js'
import { tokeniseExpression, type ExprToken } from '../expression/lexer.js'
import { parseMessageParams } from '../expression/parser.js'
import type { SourceLoc } from '../source/loc.js'
import type { LoopMetaName } from '../types.js'
import type { InterpolationExpression } from './ast.js'

const LOOP_META_NAMES: ReadonlySet<string> = new Set([
  '$index',
  '$count',
  '$first',
  '$last',
  '$even',
  '$odd',
])

/**
 * Inputs for {@link parseInterpolation}. The tokeniser runs against
 * `body`, but `source` and `baseLoc` are needed so any error points
 * back into the outer template source rather than the isolated
 * interpolation substring.
 */
export interface ParseInterpolationOptions {
  /** Raw expression source (content between `{{` and `}}`). */
  readonly body: string
  /** Location of the first character inside `{{` in the outer source. */
  readonly baseLoc: SourceLoc
  /** Full outer template source — used for error frames. */
  readonly source: string
  /** Optional file path for error prefixes. */
  readonly sourcePath?: string
}

/**
 * Parse one `{{…}}` interpolation body.
 *
 * @param opts - Body plus enough context (outer source, base
 *   location, optional path) to report errors into the outer source.
 * @returns A typed {@link InterpolationExpression} describing which
 *   namespace (`message` / `data` / `local` / `loopMeta`) the
 *   interpolation resolves from.
 */
export function parseInterpolation(
  opts: ParseInterpolationOptions,
): InterpolationExpression {
  const tokens = tokeniseExpression(opts.body, {
    source: opts.source,
    sourcePath: opts.sourcePath,
    baseLoc: opts.baseLoc,
  })

  if (tokens.length === 0 || tokens[0]!.type === 'eof') {
    throw new TemplateCompileError(
      `Empty interpolation`,
      opts.baseLoc,
      opts.source,
      opts.sourcePath,
    )
  }

  const first = tokens[0]!

  // t:key.path  or  t:key.path(name=expr, …)
  if (first.type === 'ident' && first.value === 't' && tokens[1]?.type === 'colon') {
    const key = readDottedPath(tokens, 2, opts.source, opts.sourcePath)
    const afterKeyIdx = 2 + key.consumed

    // Optional message params
    let params: { name: string; value: ExpressionNode }[] = []

    if (tokens[afterKeyIdx]?.type === 'lparen') {
      params = parseMessageParams(
        tokens.slice(afterKeyIdx),
        opts.source,
        opts.sourcePath,
      )
      // After parseMessageParams is done we expect EOF.
      // parseMessageParams consumes `(…)` fully; anything left is an error.
      const remaining = tokens.slice(afterKeyIdx + countThroughRParen(tokens, afterKeyIdx))
      const tail = remaining[0]

      if (tail !== undefined && tail.type !== 'eof') {
        throw new TemplateCompileError(
          `Unexpected token '${tail.value}' after message params`,
          tail.loc,
          opts.source,
          opts.sourcePath,
        )
      }
    } else if (tokens[afterKeyIdx]?.type !== 'eof') {
      const tail = tokens[afterKeyIdx]!

      throw new TemplateCompileError(
        `Unexpected token '${tail.value}' after message key`,
        tail.loc,
        opts.source,
        opts.sourcePath,
      )
    }

    return { kind: 'message', key: key.path, params }
  }

  // data:path.to.value
  if (first.type === 'ident' && first.value === 'data' && tokens[1]?.type === 'colon') {
    const path = readDottedPath(tokens, 2, opts.source, opts.sourcePath)
    const after = tokens[2 + path.consumed]

    if (after !== undefined && after.type !== 'eof') {
      throw new TemplateCompileError(
        `Unexpected token '${after.value}' after data path`,
        after.loc,
        opts.source,
        opts.sourcePath,
      )
    }

    return { kind: 'data', path: path.path }
  }

  // Loop-meta: $index, $first, ...
  if (first.type === 'dollarIdent') {
    if (!LOOP_META_NAMES.has(first.value)) {
      throw new TemplateCompileError(
        `Unknown loop-meta variable '${first.value}'`,
        first.loc,
        opts.source,
        opts.sourcePath,
      )
    }

    const after = tokens[1]

    if (after !== undefined && after.type !== 'eof') {
      throw new TemplateCompileError(
        `Unexpected token '${after.value}' after loop-meta variable`,
        after.loc,
        opts.source,
        opts.sourcePath,
      )
    }

    return { kind: 'loopMeta', name: first.value as LoopMetaName }
  }

  // Local variable: identifier(.identifier)*
  if (first.type === 'ident') {
    const path = readDottedPath(tokens, 0, opts.source, opts.sourcePath)
    const after = tokens[path.consumed]

    if (after !== undefined && after.type !== 'eof') {
      throw new TemplateCompileError(
        `Unexpected token '${after.value}' after local path`,
        after.loc,
        opts.source,
        opts.sourcePath,
      )
    }

    return { kind: 'local', path: path.path }
  }

  throw new TemplateCompileError(
    `Unexpected token '${first.value}' in interpolation`,
    first.loc,
    opts.source,
    opts.sourcePath,
  )
}

function readDottedPath(
  tokens: ExprToken[],
  from: number,
  source: string,
  sourcePath: string | undefined,
): { path: string[]; consumed: number } {
  const first = tokens[from]

  if (first === undefined || first.type !== 'ident') {
    throw new TemplateCompileError(
      `Expected identifier`,
      first?.loc ?? tokens[tokens.length - 1]!.loc,
      source,
      sourcePath,
    )
  }

  const path: string[] = [first.value]
  let i = from + 1

  while (tokens[i]?.type === 'dot') {
    i++
    const seg = tokens[i]

    if (seg === undefined || seg.type !== 'ident') {
      throw new TemplateCompileError(
        `Expected identifier after '.'`,
        seg?.loc ?? tokens[i - 1]!.loc,
        source,
        sourcePath,
      )
    }

    path.push(seg.value)
    i++
  }

  return { path, consumed: i - from }
}

function countThroughRParen(tokens: ExprToken[], from: number): number {
  let i = from
  let depth = 0

  while (i < tokens.length) {
    const t = tokens[i]!

    if (t.type === 'lparen') depth++
    else if (t.type === 'rparen') {
      depth--
      if (depth === 0) return i - from + 1
    } else if (t.type === 'eof') {
      return i - from
    }

    i++
  }

  return i - from
}
