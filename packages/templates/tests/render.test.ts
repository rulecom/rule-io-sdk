import { describe, expect, it } from 'vitest'

import { TemplateRenderError, renderTemplate } from '../src/index.js'

// ────────────────────────────────────────────────────────────────────────────
// Interpolation
// ────────────────────────────────────────────────────────────────────────────

describe('renderTemplate — {{ interpolation }}', () => {
  it('substitutes a bare identifier', () => {
    const out = renderTemplate('<a>Hello {{ name }}</a>', { name: 'world' })

    expect(out).toBe('<a>Hello world</a>')
  })

  it('resolves nested paths', () => {
    const out = renderTemplate(
      '<a>{{ user.profile.name }}</a>',
      { user: { profile: { name: 'Ada' } } },
    )

    expect(out).toBe('<a>Ada</a>')
  })

  it('supports optional chaining', () => {
    const out = renderTemplate('<a>{{ user?.name }}</a>', { user: undefined })

    expect(out).toBe('<a></a>')
  })

  it('resolves index access', () => {
    const out = renderTemplate(
      '<a>{{ map[key] }}</a>',
      { map: { foo: 'bar' }, key: 'foo' },
    )

    expect(out).toBe('<a>bar</a>')
  })

  it('renders undefined / null as empty string', () => {
    expect(renderTemplate('<a>[{{ missing }}]</a>', {})).toBe('<a>[]</a>')
    expect(renderTemplate('<a>[{{ v }}]</a>', { v: null })).toBe('<a>[]</a>')
  })

  it('supports nullish coalescing for defaults', () => {
    const out = renderTemplate(
      '<a>{{ label ?? "SKU" }}: value</a>',
      { label: undefined },
    )

    expect(out).toBe('<a>SKU: value</a>')
  })

  it('supports logical operators', () => {
    expect(
      renderTemplate('<a>{{ a && b }}</a>', { a: 1, b: 'yes' }),
    ).toBe('<a>yes</a>')
    expect(
      renderTemplate('<a>{{ a || b }}</a>', { a: '', b: 'fallback' }),
    ).toBe('<a>fallback</a>')
  })

  it('runs multiple interpolations in one text run', () => {
    const out = renderTemplate(
      '<a>{{ first }} {{ middle }} {{ last }}</a>',
      { first: 'A', middle: 'B', last: 'C' },
    )

    expect(out).toBe('<a>A B C</a>')
  })

  it('interpolates plain attributes', () => {
    const out = renderTemplate(
      '<a title="Hello {{ name }}">x</a>',
      { name: 'world' },
    )

    expect(out).toContain('title="Hello world"')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// *ngIf
// ────────────────────────────────────────────────────────────────────────────

describe('renderTemplate — *ngIf', () => {
  it('keeps element when expression is truthy', () => {
    const out = renderTemplate(
      '<root><a *ngIf="show">kept</a></root>',
      { show: true },
    )

    expect(out).toContain('<a>kept</a>')
  })

  it('drops element when expression is falsy', () => {
    const out = renderTemplate(
      '<root><a *ngIf="show">dropped</a></root>',
      { show: false },
    )

    expect(out).not.toContain('<a>')
  })

  it('strips the *ngIf attribute from the rendered element', () => {
    const out = renderTemplate(
      '<root><a *ngIf="show" class="c">x</a></root>',
      { show: true },
    )

    expect(out).not.toContain('*ngIf')
    expect(out).toContain('class="c"')
  })

  it('accepts complex boolean expressions', () => {
    const context = { text: { foo: 'a' }, fieldNames: { bar: 'b' } }
    const out = renderTemplate(
      '<r><a *ngIf="text.foo &amp;&amp; fieldNames.bar">ok</a></r>',
      context,
    )

    expect(out).toContain('ok')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// *ngFor
// ────────────────────────────────────────────────────────────────────────────

describe('renderTemplate — *ngFor', () => {
  it('repeats an element for every item', () => {
    const out = renderTemplate(
      '<root><li *ngFor="let item of items">{{ item }}</li></root>',
      { items: ['x', 'y', 'z'] },
    )

    expect(out).toContain('<li>x</li>')
    expect(out).toContain('<li>y</li>')
    expect(out).toContain('<li>z</li>')
  })

  it('exposes $index / $first / $last', () => {
    const out = renderTemplate(
      '<root><li *ngFor="let x of xs">{{ $index }}:{{ x }}:{{ $first }}:{{ $last }}</li></root>',
      { xs: ['a', 'b'] },
    )

    expect(out).toContain('<li>0:a:true:false</li>')
    expect(out).toContain('<li>1:b:false:true</li>')
  })

  it('renders nothing when the collection is empty', () => {
    const out = renderTemplate(
      '<root><li *ngFor="let x of xs">{{ x }}</li></root>',
      { xs: [] },
    )

    expect(out).not.toContain('<li>')
  })

  it('throws when expression is not an array', () => {
    expect(() =>
      renderTemplate(
        '<root><li *ngFor="let x of xs">{{ x }}</li></root>',
        { xs: 'oops' },
      ),
    ).toThrow(TemplateRenderError)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// [attr] property binding
// ────────────────────────────────────────────────────────────────────────────

describe('renderTemplate — [attr] binding', () => {
  it('evaluates the expression and writes the bare attribute', () => {
    const out = renderTemplate(
      '<a [href]="url">x</a>',
      { url: 'https://example.com' },
    )

    expect(out).toContain('href="https://example.com"')
    expect(out).not.toContain('[href]')
  })

  it('omits the attribute when the expression is undefined', () => {
    const out = renderTemplate(
      '<a [href]="url" class="c">x</a>',
      { url: undefined },
    )

    expect(out).not.toContain('href=')
    expect(out).toContain('class="c"')
  })

  it('coerces numbers to string', () => {
    const out = renderTemplate(
      '<a [n]="count">x</a>',
      { count: 42 },
    )

    expect(out).toContain('n="42"')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Context functions
// ────────────────────────────────────────────────────────────────────────────

describe('renderTemplate — context functions', () => {
  it('can call functions registered in context', () => {
    const out = renderTemplate(
      '<a>{{ greet("Ada") }}</a>',
      { greet: (n: string) => `Hello, ${n}` },
    )

    expect(out).toBe('<a>Hello, Ada</a>')
  })

  it('supports chaining calls with member access', () => {
    const out = renderTemplate(
      '<a>{{ field("firstName") }}</a>',
      { field: (k: string) => `::placeholder{name="${k}"}` },
    )

    expect(out).toBe('<a>::placeholder{name="firstName"}</a>')
  })

  it('throws when calling a non-function', () => {
    expect(() =>
      renderTemplate('<a>{{ notFn() }}</a>', { notFn: 42 }),
    ).toThrow(TemplateRenderError)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Error surface
// ────────────────────────────────────────────────────────────────────────────

describe('renderTemplate — errors', () => {
  it('throws TemplateRenderError with path on malformed expression', () => {
    try {
      renderTemplate('<root><a>{{ 1 + }}</a></root>', {})
      expect.fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateRenderError)
      expect((err as TemplateRenderError).path).toContain('/root/a')
    }
  })

  it('throws on unterminated interpolation', () => {
    expect(() =>
      renderTemplate('<a>{{ unterminated</a>', {}),
    ).toThrow(TemplateRenderError)
  })

  it('throws on malformed *ngFor', () => {
    expect(() =>
      renderTemplate(
        '<r><a *ngFor="item in items">{{ item }}</a></r>',
        { items: [1, 2] },
      ),
    ).toThrow(TemplateRenderError)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Nested directives
// ────────────────────────────────────────────────────────────────────────────

describe('renderTemplate — nested directives', () => {
  it('*ngFor inside *ngIf', () => {
    const out = renderTemplate(
      '<root><ul *ngIf="show"><li *ngFor="let x of xs">{{ x }}</li></ul></root>',
      { show: true, xs: ['a', 'b'] },
    )

    expect(out).toContain('<ul>')
    expect(out).toContain('<li>a</li>')
    expect(out).toContain('<li>b</li>')
  })

  it('*ngIf inside *ngFor', () => {
    const out = renderTemplate(
      '<root><li *ngFor="let x of xs"><span *ngIf="x.visible">{{ x.label }}</span></li></root>',
      {
        xs: [
          { visible: true, label: 'a' },
          { visible: false, label: 'b' },
          { visible: true, label: 'c' },
        ],
      },
    )

    expect(out).toContain('<span>a</span>')
    expect(out).not.toContain('<span>b</span>')
    expect(out).toContain('<span>c</span>')
  })

  it('same element with both *ngFor and *ngIf on the inner logic', () => {
    // Angular-style: *ngIf is evaluated once per iteration inside the *ngFor scope
    const out = renderTemplate(
      '<root><li *ngFor="let x of xs" *ngIf="x &gt; 1">{{ x }}</li></root>',
      { xs: [1, 2, 3] },
    )

    // Items with x > 1 (2 and 3) survive; 1 is dropped
    expect(out).toContain('<li>2</li>')
    expect(out).toContain('<li>3</li>')
    expect(out).not.toContain('<li>1</li>')
  })
})
