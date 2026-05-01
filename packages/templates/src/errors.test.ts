import { describe, expect, it } from 'vitest'

import { TemplateCompileError, compileTemplate } from './index.js'

describe('errors — surface', () => {
  it('exposes line / column / frame on TemplateCompileError', () => {
    try {
      compileTemplate({
        templateSrc: '<a>{{data:nope}}</a>',
        locale: 'en',
        messages: {},
        data: {},
      })
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateCompileError)
      const e = err as TemplateCompileError

      expect(e.line).toBeGreaterThanOrEqual(1)
      expect(e.column).toBeGreaterThanOrEqual(1)
      expect(e.frame).toContain('^')
    }
  })

  it('surfaces sourcePath in the error message', () => {
    try {
      compileTemplate({
        templateSrc: '<a>{{data:x}}</a>',
        locale: 'en',
        messages: {},
        data: {},
        sourcePath: '/tmp/foo.xml',
      })
      expect.fail('should have thrown')
    } catch (err) {
      const e = err as TemplateCompileError

      expect(e.sourcePath).toBe('/tmp/foo.xml')
      expect(e.message).toContain('/tmp/foo.xml')
    }
  })

  it('points line:column at the offending construct', () => {
    try {
      compileTemplate({
        // Error on line 2, column where `data:missing` starts
        templateSrc: '<a>\n  {{data:missing}}\n</a>',
        locale: 'en',
        messages: {},
        data: {},
      })
      expect.fail('should have thrown')
    } catch (err) {
      const e = err as TemplateCompileError

      expect(e.line).toBe(2)
      // Column is the location of `{{` — "  {{" → column 3
      expect(e.column).toBeGreaterThanOrEqual(3)
    }
  })

  it('reports "Message key not found" for missing messages', () => {
    try {
      compileTemplate({
        templateSrc: '<a>{{t:hero.subtitle}}</a>',
        locale: 'en',
        messages: { hero: { title: 'x' } },
        data: {},
      })
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('Message key not found: hero.subtitle')
    }
  })

  it('reports "@else without preceding @if"', () => {
    try {
      compileTemplate({
        templateSrc: '@else { <x/> }',
        locale: 'en',
        messages: {},
        data: {},
      })
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain(`without preceding '@if'`)
    }
  })

  it('reports "@for iterable must evaluate to array"', () => {
    try {
      compileTemplate({
        templateSrc: '@for (let x of data:y) {<x/>}',
        locale: 'en',
        messages: {},
        data: { y: 'nope' },
      })
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('@for iterable must evaluate to array')
    }
  })
})
