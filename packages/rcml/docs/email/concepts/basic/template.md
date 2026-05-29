# Template

An RCML template is a JSON tree with a fixed two-part structure: `rc-head` carries invisible metadata, and `rc-body` carries everything the recipient sees.

```
<rcml>
  ├─ <rc-head>   — metadata: fonts, default styles, named classes, preview text, brand style
  └─ <rc-body>   — visible content: sections, columns, content elements
```

The head/body split separates *brand appearance* from *message content*. `rc-head` holds everything that makes the email look like your brand — fonts, colour defaults, social links, logo. `rc-body` holds what the email says — the sections, images, text, and calls to action. Keeping them separate means you can update a brand colour without touching the content, or reuse the same template layout with a different visual identity.

## rc-head

`rc-head` is not rendered into the email HTML. Its children configure the defaults and resources that `rc-body` elements draw on:

- [`<rc-brand-style>`](/packages/rcml/email/rcml/head/rc-brand-style) — references a saved brand-style preset by numeric ID
- [`<rc-font>`](/packages/rcml/email/rcml/head/rc-font) — registers a web font loaded from a URL
- [`<rc-attributes>`](/packages/rcml/email/rcml/head/rc-attributes) — sets default attribute values for body elements
- [`<rc-preview>`](/packages/rcml/email/rcml/head/rc-preview) — sets the inbox preview text shown before the email is opened
- [`<rc-class>`](/packages/rcml/email/rcml/head/rc-class) — defines a named reusable style class
- [`<rc-plain-text>`](/packages/rcml/email/rcml/head/rc-plain-text) — provides the plain-text fallback version of the email

The theme system writes directly into `rc-head`. Calling `applyTheme(doc, theme)` populates `rc-head` with default-attribute nodes and named classes, leaving `rc-body` untouched. This is why the split matters in practice — templates are built once and themed separately. See [Theme](/packages/rcml/email/concepts/basic/theme).

## rc-body

`rc-body` holds the visible email content, organised as a row-column grid. Sections contain columns, and columns contain content elements. See [Containers](/packages/rcml/email/concepts/basic/containers) for how the grid is structured and [Elements](/packages/rcml/email/concepts/basic/elements) for what goes inside the columns.

## Related

- [Containers](/packages/rcml/email/concepts/basic/containers)
- [Elements](/packages/rcml/email/concepts/basic/elements)
- [RCML Reference](/packages/rcml/email/rcml/)
