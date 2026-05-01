/**
 * Unit tests for the interpolation-body parser.
 *
 * `parseInterpolation` dispatches on the first token of the body to
 * one of four shapes: `message` (`t:…`), `data` (`data:…`), `local`
 * (identifier path), or `loopMeta` (`$index` / `$count` / …). These
 * tests exercise each branch directly — not via `compileTemplate` —
 * so a regression in dispatch shows up here first rather than as a
 * cascading integration failure.
 */

import { describe, expect, it } from 'vitest'

import { TemplateCompileError } from '../errors.js'
import { parseInterpolation } from './interpolation.js'

const baseLoc = { offset: 0, line: 1, column: 1 } as const
const run = (body: string): ReturnType<typeof parseInterpolation> =>
  parseInterpolation({ body, baseLoc, source: body, sourcePath: 'test.xml' })

describe('parseInterpolation — shapes', () => {
  it('parses a bare message key', () => {
    const expr = run('t:hero.title')

    expect(expr).toEqual({ kind: 'message', key: ['hero', 'title'], params: [] })
  })

  it('parses a message key with a single param', () => {
    const expr = run('t:hero.title(name=data:user.name)')

    expect(expr.kind).toBe('message')
    if (expr.kind !== 'message') return
    expect(expr.key).toEqual(['hero', 'title'])
    expect(expr.params).toHaveLength(1)
    expect(expr.params[0]!.name).toBe('name')
    expect(expr.params[0]!.value.kind).toBe('dataPath')
  })

  it('parses a message key with multiple params', () => {
    const expr = run('t:k(a=data:x, b=data:y)')

    expect(expr.kind).toBe('message')
    if (expr.kind !== 'message') return
    expect(expr.params.map((p) => p.name)).toEqual(['a', 'b'])
  })

  it('parses a data path', () => {
    expect(run('data:user.name')).toEqual({
      kind: 'data',
      path: ['user', 'name'],
    })
  })

  it('parses a single-segment data path', () => {
    expect(run('data:x')).toEqual({ kind: 'data', path: ['x'] })
  })

  it('parses a local path', () => {
    expect(run('item.label')).toEqual({
      kind: 'local',
      path: ['item', 'label'],
    })
  })

  it('parses a bare identifier as a one-segment local path', () => {
    expect(run('item')).toEqual({ kind: 'local', path: ['item'] })
  })

  it('parses a loop-meta variable', () => {
    expect(run('$index')).toEqual({ kind: 'loopMeta', name: '$index' })
  })

  it('parses each supported loop-meta name', () => {
    for (const name of ['$index', '$count', '$first', '$last', '$even', '$odd']) {
      expect(run(name)).toEqual({ kind: 'loopMeta', name })
    }
  })
})

describe('parseInterpolation — rejections', () => {
  it('rejects an empty body', () => {
    expect(() => run('')).toThrow(TemplateCompileError)
    expect(() => run('   ')).toThrow(/Empty interpolation/)
  })

  it('rejects an unknown loop-meta name', () => {
    expect(() => run('$nope')).toThrow(/Unknown loop-meta variable '\$nope'/)
  })

  it('rejects trailing tokens after a data path', () => {
    expect(() => run('data:x bogus')).toThrow(/Unexpected token/)
  })

  it('rejects trailing tokens after a local path', () => {
    expect(() => run('item bogus')).toThrow(/Unexpected token/)
  })

  it('rejects trailing tokens after a loop-meta variable', () => {
    expect(() => run('$index bogus')).toThrow(/Unexpected token/)
  })

  it('rejects trailing tokens after a message key (no params)', () => {
    expect(() => run('t:hi bogus')).toThrow(/Unexpected token.*after message key/)
  })

  it('rejects trailing tokens after message params', () => {
    expect(() => run('t:hi(a=1) bogus')).toThrow(
      /Unexpected token.*after message params/,
    )
  })

  it('rejects a leading number / literal / punctuation', () => {
    expect(() => run('42')).toThrow(/Unexpected token/)
    expect(() => run('(a)')).toThrow(/Unexpected token/)
  })

  it('rejects a message key that is not an identifier', () => {
    // `t:` followed by a non-ident token — readDottedPath raises
    // "Expected identifier".
    expect(() => run('t:42')).toThrow(/Expected identifier/)
  })

  it('rejects a trailing dot in a dotted path', () => {
    expect(() => run('data:a.')).toThrow(/Expected identifier after '\.'/)
  })

  it('rejects a malformed message-param binding missing `=`', () => {
    // `parseMessageParam` expects `ident = expr`. When the `=` is
    // absent, its internal `consume('equals', …)` throws — this
    // exercises that error path.
    expect(() => run('t:k(a bogus)')).toThrow(TemplateCompileError)
  })
})
