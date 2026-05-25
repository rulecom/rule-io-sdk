# Containers

Layout containers define the two-dimensional grid of an email. Content elements live inside columns; columns live inside sections.

Email clients — especially Outlook on Windows — don't support modern CSS layout. RCML compiles sections and columns to table-based HTML (`<table><tr><td>`), which renders consistently across Outlook, Gmail, Apple Mail, and mobile clients. The section/column abstraction hides this complexity: you describe rows and cells; RCML generates the table markup.

## Nesting hierarchy

```
rc-body
  └─ rc-wrapper  (optional — shared background or padding around a group of sections)
       └─ rc-section  (horizontal row)
            ├─ rc-column  (vertical cell)
            │    └─ content elements  (rc-text, rc-image, rc-button, …)
            └─ rc-group  (optional — keeps its columns side-by-side on mobile)
                 └─ rc-column  (vertical cell)
                      └─ content elements  (rc-text, rc-image, rc-button, …)
```

`rc-wrapper` is optional. Sections can sit directly inside `rc-body`. `rc-group` is optional; columns can also sit directly inside `rc-section`.

## Container elements

| Element | Purpose |
|---------|---------|
| [`<rc-section>`](/packages/rcml/email/rcml/body/layout/rc-section) | Full-width horizontal row. The primary layout unit. Contains one or more columns (up to 20). |
| [`<rc-column>`](/packages/rcml/email/rcml/body/layout/rc-column) | Vertical cell inside a section. All content elements live here. |
| [`<rc-wrapper>`](/packages/rcml/email/rcml/body/layout/rc-wrapper) | Groups one or more sections under a shared background image or colour. |
| [`<rc-group>`](/packages/rcml/email/rcml/body/layout/rc-group) | Pass-through container that keeps its columns side-by-side on mobile. |

Use `rc-wrapper` when multiple adjacent sections should share a visual context — a background colour or image that spans a header image, a headline, and a sub-heading row together. Without a wrapper you'd need to set the same background on each section individually and keep them in sync.

Use `rc-group` when a set of columns should stay side-by-side on mobile. By default, mobile email clients stack columns vertically. `rc-group` prevents that for the columns it contains — useful for icon-label pairs, small product thumbnails, or any layout that looks broken when stacked.

## Related

- [Elements](/packages/rcml/email/concepts/basic/elements) — the content elements that go inside columns
- [`<rc-section>` reference](/packages/rcml/email/rcml/body/layout/rc-section)
- [`<rc-column>` reference](/packages/rcml/email/rcml/body/layout/rc-column)
- [`<rc-wrapper>` reference](/packages/rcml/email/rcml/body/layout/rc-wrapper)
- [`<rc-group>` reference](/packages/rcml/email/rcml/body/layout/rc-group)
