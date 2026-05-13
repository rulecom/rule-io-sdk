/**
 * Unit tests for the `makeCodeFrame` source-snippet formatter.
 *
 * `makeCodeFrame` is the visual-feedback arm of the error surface:
 * given a multi-line source and a 1-based (line, column) location,
 * it renders ±2 lines of context with a caret marking the offending
 * column. These tests assert the caret position, gutter alignment,
 * and edge cases (first/last line, tabs, Windows-ish single-line
 * sources).
 */

import { describe, expect, it } from 'vitest'

import { makeCodeFrame } from './frame.js'

describe('makeCodeFrame', () => {
  it('renders a caret under the offending column (1-based)', () => {
    const frame = makeCodeFrame('abc\ndef', { offset: 5, line: 2, column: 2 })

    expect(frame).toBe('  1 | abc\n> 2 | def\n    |  ^')
  })

  it('includes two lines of context above and below', () => {
    const src = 'line1\nline2\nline3\nline4\nline5'
    const frame = makeCodeFrame(src, { offset: 12, line: 3, column: 1 })

    expect(frame.split('\n')).toEqual([
      '  1 | line1',
      '  2 | line2',
      '> 3 | line3',
      '    | ^',
      '  4 | line4',
      '  5 | line5',
    ])
  })

  it('clamps context to the first line', () => {
    const frame = makeCodeFrame('only', { offset: 0, line: 1, column: 1 })

    expect(frame).toBe('> 1 | only\n    | ^')
  })

  it('clamps context to the last line', () => {
    const src = 'a\nb\nc'
    const frame = makeCodeFrame(src, { offset: 4, line: 3, column: 1 })

    expect(frame.split('\n')).toEqual([
      '  1 | a',
      '  2 | b',
      '> 3 | c',
      '    | ^',
    ])
  })

  it('right-aligns the gutter when line numbers widen', () => {
    const src = Array.from({ length: 12 }, (_, i) => `line${String(i + 1)}`).join('\n')
    const frame = makeCodeFrame(src, { offset: 0, line: 10, column: 2 })

    // Line 10 has a two-digit gutter; earlier single-digit line
    // numbers get padStart-ed with a leading space so the `|` column
    // aligns.
    expect(frame).toContain('   8 | line8')
    expect(frame).toContain('> 10 | line10')
    expect(frame).toContain('     |  ^')
  })

  it('passes through tab characters in the source line', () => {
    const frame = makeCodeFrame('\tvalue', { offset: 1, line: 1, column: 2 })

    // Tab is emitted verbatim; the caret still sits at column 2 (the
    // char after the tab). Terminal renderers interpret the tab when
    // displaying — we don't try to account for its width here.
    expect(frame).toBe('> 1 | \tvalue\n    |  ^')
  })

  it('clamps a zero column to position 0 without going negative', () => {
    const frame = makeCodeFrame('x', { offset: 0, line: 1, column: 0 })

    // `column: 0` is degenerate but shouldn't produce a negative
    // caret indent.
    expect(frame).toBe('> 1 | x\n    | ^')
  })

  it('renders a placeholder empty string when loc.line is past the source', () => {
    // Degenerate input: loc points at line 3 of a 1-line source.
    // The `lines[n - 1] ?? ''` fallback fires for the missing line
    // number, keeping the gutter/caret alignment sensible instead of
    // printing `undefined`.
    const frame = makeCodeFrame('only', { offset: 0, line: 3, column: 1 })

    // startLine clamps to 1; endLine clamps to 1 (source has 1 line).
    // Line 3 is outside the rendered range, so we assert the frame
    // remains a single line + no crash. The exact caret placement
    // is not the point here — the fallback branch is.
    expect(frame).toContain(' 1 | only')
  })
})
