import { describe, expect, it } from 'vitest'

import { TemplateCompileError, compileTemplate } from './index.js'

describe('errors — surface', () => {
  it('exposes line / column / frame on TemplateCompileError', () => {
    try {
      compileTemplate({
        template: '<a href="@{nope}"/>',
        copy: {},
        context: {},
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

  it('points line:column at the offending construct', () => {
    try {
      compileTemplate({
        // Error on line 2, inside the @{…} binding
        template: '<a\n  href="@{missing}"/>',
        copy: {},
        context: {},
      })
      expect.fail('should have thrown')
    } catch (err) {
      const e = err as TemplateCompileError

      expect(e.line).toBe(2)
      // Column points at the `@{` inside the quoted value.
      expect(e.column).toBeGreaterThanOrEqual(3)
    }
  })

  it('reports "Message key not found" for missing <?copy?> keys', () => {
    try {
      compileTemplate({
        template: '<a><?copy hero.subtitle?></a>',
        copy: { hero: { title: 'x' } },
        context: {},
      })
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('Message key not found: hero.subtitle')
    }
  })

  it('reports "<?else?> without preceding <?if?>"', () => {
    try {
      compileTemplate({
        template: '<?else?><x/><?endif?>',
        copy: {},
        context: {},
      })
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain(`without preceding '<?if?>'`)
    }
  })

  it('reports "<?for?> iterable must evaluate to array"', () => {
    try {
      compileTemplate({
        template: '<?for let x of y?><x/><?endfor?>',
        copy: {},
        context: { y: 'nope' },
      })
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as Error).message).toContain('<?for?> iterable must evaluate to array')
    }
  })

  it('reports "Unknown identifier" for missing @{…} binding target', () => {
    expect(() =>
      compileTemplate({
        template: '<a href="@{nope}"/>',
        copy: {},
        context: {},
      }),
    ).toThrow(/Unknown identifier: nope/)
  })
})
