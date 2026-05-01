/**
 * Template evaluator tests — exercises the evaluator through the
 * public `compileTemplate` API. Covers:
 *
 *  - control flow (`<?if?>` / `<?elseif?>` / `<?else?>` / `<?for?>`)
 *  - context-aware escaping (attribute bindings + copy output)
 *  - `<?copy?>` PI rendering with and without params
 *  - `@{…}` attribute bindings including mixed literal+binding runs
 *  - error paths (missing identifiers, missing message keys)
 */

import { describe, expect, it } from 'vitest'

import { TemplateCompileError, compileTemplate } from '../index.js'

describe('control flow — <?if?> / <?elseif?> / <?else?>', () => {
  it('renders the first truthy branch', () => {
    const { xml } = compileTemplate({
      template: '<?if a?><a/><?elseif b?><b/><?else?><c/><?endif?>',
      copy: {},
      context: { a: false, b: true },
    })

    expect(xml).toBe('<b/>')
  })

  it('renders <?else?> when all conditions false', () => {
    const { xml } = compileTemplate({
      template: '<?if a?><a/><?elseif b?><b/><?else?><c/><?endif?>',
      copy: {},
      context: { a: false, b: false },
    })

    expect(xml).toBe('<c/>')
  })

  it('renders first branch when it is truthy (second not evaluated)', () => {
    const { xml } = compileTemplate({
      template: '<?if a?><a/><?elseif b?><b/><?endif?>',
      copy: {},
      context: { a: true, b: true },
    })

    expect(xml).toBe('<a/>')
  })

  it('renders nothing when the only <?if?> is falsy and no <?else?>', () => {
    const { xml } = compileTemplate({
      template: '<wrap><?if a?><a/><?endif?></wrap>',
      copy: {},
      context: { a: false },
    })

    expect(xml).toBe('<wrap></wrap>')
  })

  it('supports nested <?if?>', () => {
    const tpl =
      '<?if outer?><?if inner?><both/><?else?><outerOnly/><?endif?><?else?><none/><?endif?>'

    expect(
      compileTemplate({ template: tpl, copy: {}, context: { outer: true, inner: true } }).xml,
    ).toContain('<both/>')
    expect(
      compileTemplate({ template: tpl, copy: {}, context: { outer: true, inner: false } }).xml,
    ).toContain('<outerOnly/>')
    expect(
      compileTemplate({ template: tpl, copy: {}, context: { outer: false } }).xml,
    ).toContain('<none/>')
  })

  it('rejects <?else?> without preceding <?if?>', () => {
    expect(() =>
      compileTemplate({
        template: '<?else?><x/><?endif?>',
        copy: {},
        context: {},
      }),
    ).toThrow(/without preceding '<\?if\?>'/)
  })

  it('rejects multiple <?else?> blocks', () => {
    expect(() =>
      compileTemplate({
        template: '<?if true?><x/><?else?><y/><?else?><z/><?endif?>',
        copy: {},
        context: {},
      }),
    ).toThrow(/Only one '<\?else\?>' block allowed/)
  })

  it('rejects `<?elseif?>` after `<?else?>`', () => {
    expect(() =>
      compileTemplate({
        template: '<?if true?><x/><?else?><y/><?elseif false?><z/><?endif?>',
        copy: {},
        context: {},
      }),
    ).toThrow(/'<\?elseif\?>' after '<\?else\?>'/)
  })
})

describe('control flow — <?for?>', () => {
  it('iterates a simple array of objects', () => {
    const { xml } = compileTemplate({
      template: '<ul><?for let item of items?><li title="@{item.label}"/><?endfor?></ul>',
      copy: {},
      context: { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] },
    })

    expect(xml).toBe('<ul><li title="a"/><li title="b"/><li title="c"/></ul>')
  })

  it('iterates without "let" prefix', () => {
    const { xml } = compileTemplate({
      template: '<ul><?for item of items?><li title="@{item.label}"/><?endfor?></ul>',
      copy: {},
      context: { items: [{ label: 'x' }] },
    })

    expect(xml).toBe('<ul><li title="x"/></ul>')
  })

  it('renders nothing for an empty array', () => {
    const { xml } = compileTemplate({
      template: '<ul><?for let x of xs?><li title="@{x}"/><?endfor?></ul>',
      copy: {},
      context: { xs: [] },
    })

    expect(xml).toBe('<ul></ul>')
  })

  it('nested <?for?> — inner scope shadows outer', () => {
    const { xml } = compileTemplate({
      template:
        '<?for let r of rows?><r><?for let c of r.cells?><c v="@{c}"/><?endfor?></r><?endfor?>',
      copy: {},
      context: {
        rows: [
          { cells: ['a', 'b'] },
          { cells: ['x'] },
        ],
      },
    })

    expect(xml).toContain('<r><c v="a"/><c v="b"/></r>')
    expect(xml).toContain('<r><c v="x"/></r>')
  })

  it('throws when iterable is not an array', () => {
    expect(() =>
      compileTemplate({
        template: '<?for let x of bogus?><x/><?endfor?>',
        copy: {},
        context: { bogus: 'not-array' },
      }),
    ).toThrow(TemplateCompileError)
  })

  it('rejects `<?for?>` header with missing loop-variable name', () => {
    expect(() =>
      compileTemplate({
        template: '<?for . of xs?><x/><?endfor?>',
        copy: {},
        context: { xs: [] },
      }),
    ).toThrow(/Expected loop variable name/)
  })

  it('rejects `<?for?>` header with missing `of` keyword', () => {
    expect(() =>
      compileTemplate({
        template: '<?for let item xs?><x/><?endfor?>',
        copy: {},
        context: { xs: [] },
      }),
    ).toThrow(/Expected 'of'/)
  })

  it('parses `<?for?>` header spread across newlines', () => {
    const { xml } = compileTemplate({
      template: '<?for\n  let item\n  of xs\n?><i v="@{item}"/><?endfor?>',
      copy: {},
      context: { xs: ['a', 'b'] },
    })

    expect(xml).toBe('<i v="a"/><i v="b"/>')
  })

  it('shadowing — <?for?> variable shadows same-named data key', () => {
    // `user` exists at both the `data` top level (string "outer")
    // and as the `<?for?>` loop variable (each admin object).
    const { xml } = compileTemplate({
      template: '<?for let user of admins?><a n="@{user.name}"/><?endfor?>',
      copy: {},
      context: {
        user: 'outer',
        admins: [{ name: 'ada' }, { name: 'grace' }],
      },
    })

    expect(xml).toBe('<a n="ada"/><a n="grace"/>')
    expect(xml).not.toContain('outer')
  })

  it('<?if?> inside <?for?> filters items', () => {
    const { xml } = compileTemplate({
      template:
        '<ul><?for let x of xs?><?if x.visible?><li title="@{x.label}"/><?endif?><?endfor?></ul>',
      copy: {},
      context: {
        xs: [
          { visible: true, label: 'a' },
          { visible: false, label: 'b' },
          { visible: true, label: 'c' },
        ],
      },
    })

    expect(xml).toBe('<ul><li title="a"/><li title="c"/></ul>')
  })
})

describe('<?copy?> — text-node escaping', () => {
  it('escapes & in copy output', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy m x=x?></a>',
      copy: { m: '{{x}}' },
      context: { x: 'Cats & Dogs' },
    })

    expect(xml).toBe('<a>Cats &amp; Dogs</a>')
  })

  it('escapes < and > in copy output', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy m x=x?></a>',
      copy: { m: '{{x}}' },
      context: { x: '3 > 2 < 4' },
    })

    expect(xml).toBe('<a>3 &gt; 2 &lt; 4</a>')
  })

  it('preserves " and \' in copy output', () => {
    const { xml } = compileTemplate({
      template: '<a><?copy m x=x?></a>',
      copy: { m: '{{x}}' },
      context: { x: `She said "hi" and it's nice` },
    })

    expect(xml).toBe(`<a>She said "hi" and it's nice</a>`)
  })
})

describe('@{…} — attribute escaping', () => {
  it('escapes & < > in double-quoted attrs', () => {
    const { xml } = compileTemplate({
      template: '<a title="@{x}">body</a>',
      copy: {},
      context: { x: 'A & B < C > D' },
    })

    expect(xml).toBe('<a title="A &amp; B &lt; C &gt; D">body</a>')
  })

  it('escapes the matching quote delimiter only', () => {
    const dbl = compileTemplate({
      template: `<a t="@{x}">b</a>`,
      copy: {},
      context: { x: `He said "hi"` },
    })

    expect(dbl.xml).toBe(`<a t="He said &quot;hi&quot;">b</a>`)

    const sgl = compileTemplate({
      template: `<a t='@{x}'>b</a>`,
      copy: {},
      context: { x: `It's here` },
    })

    expect(sgl.xml).toBe(`<a t='It&apos;s here'>b</a>`)
  })
})

describe('static text verbatim', () => {
  it('passes through static RFM atoms unchanged', () => {
    const { xml } = compileTemplate({
      template: '<rc-text>::placeholder{name="foo" value="42"}</rc-text>',
      copy: {},
      context: {},
    })

    expect(xml).toBe('<rc-text>::placeholder{name="foo" value="42"}</rc-text>')
  })
})

describe('attribute values — mixed literal + @{} bindings', () => {
  it('concatenates literal + binding parts', () => {
    const { xml } = compileTemplate({
      template: '<a href="https://example.com/users/@{id}?x=y">go</a>',
      copy: {},
      context: { id: 42 },
    })

    expect(xml).toBe('<a href="https://example.com/users/42?x=y">go</a>')
  })
})

describe('error cases', () => {
  it('throws on missing data path in @{…} binding', () => {
    expect(() =>
      compileTemplate({
        template: '<a t="@{user.name}"/>',
        copy: {},
        context: {},
      }),
    ).toThrow(/Unknown identifier: user\.name/)
  })

  it('throws on missing data path in <?copy?> param', () => {
    expect(() =>
      compileTemplate({
        template: '<a><?copy m name=user.name?></a>',
        copy: { m: 'Hi {{name}}' },
        context: {},
      }),
    ).toThrow(/Unknown identifier: user\.name/)
  })

  it('throws on unknown <?copy?> key', () => {
    expect(() =>
      compileTemplate({
        template: '<a><?copy nope?></a>',
        copy: {},
        context: {},
      }),
    ).toThrow(/Message key not found: nope/)
  })
})

describe('value stringification — through @{…} bindings', () => {
  it('JSON-stringifies object values', () => {
    const { xml } = compileTemplate({
      template: '<a title="@{obj}"/>',
      copy: {},
      context: { obj: { k: 1 } },
    })

    // The matching double-quote inside the stringified JSON is
    // escaped by the attribute-escape policy.
    expect(xml).toBe('<a title="{&quot;k&quot;:1}"/>')
  })

  it('JSON-stringifies array values', () => {
    const { xml } = compileTemplate({
      template: '<a title="@{arr}"/>',
      copy: {},
      context: { arr: [1, 2, 3] },
    })

    expect(xml).toBe('<a title="[1,2,3]"/>')
  })

  it('coerces numbers and booleans to string', () => {
    const { xml } = compileTemplate({
      template: '<a n="@{n}" b="@{b}"/>',
      copy: {},
      context: { n: 42, b: false },
    })

    expect(xml).toBe('<a n="42" b="false"/>')
  })
})
