# Changelog

## 0.4.0-beta.0 (2026-05-14)

### Initial Beta Release

First public beta of `@rulecom/rcml` — RCML (Rule Campaign Markup Language) builders, validators, and converters.

#### Features

- **Element factories** — typed factory functions for all RCML email elements:
  text, heading, button, image, logo, video, spacer, divider, section, column,
  social, loop, switch, and structural elements (body, head, wrapper, group)
- **Content helpers** — `createTextNode`, `createPlaceholderNode`,
  `createInlineContent`, and other ProseMirror-compatible content constructors
- **RFM builders** — `createCustomField`, `createLoopValue`, `createLink`,
  `createFont` for dynamic merge fields and directives
- **Validation** — `validateEmailTemplate` and `safeValidateEmailTemplate`
  with structured `EmailTemplateValidationError` reporting
- **Format converters** — `rfmToJson`/`jsonToRfm` and `rcmlToXml`/`xmlToRcml`
  for round-trip transforms between RCML, RFM, JSON, and XML
- **Theme API** — `createTheme`, `applyTheme`, `getTheme` for brand-aware
  template styling (colors, fonts, spacing)
- **Full TypeScript types** for all RCML node shapes and attribute maps
