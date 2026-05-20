## 0.4.0-beta.4 (2026-05-20)

### 🩹 Fixes

- **rcml:** scope attr-override relaxation and align RcmlAttributesChild types ([d0727d1](https://github.com/rulecom/rule-io-sdk/commit/d0727d1))
- **rcml:** enforce minProperties:1 on font-mark attrs in JSON schema ([3367d58](https://github.com/rulecom/rule-io-sdk/commit/3367d58))
- **rcml:** fix lint errors in json-schema.ts ([c3530c3](https://github.com/rulecom/rule-io-sdk/commit/c3530c3))
- **rcml:** propagate logo src to rc-logo body nodes in applyTheme ([68f1d99](https://github.com/rulecom/rule-io-sdk/commit/68f1d99))
- **rcml:** allow sparse font marks in ProseMirror content JSON schema ([c417af9](https://github.com/rulecom/rule-io-sdk/commit/c417af9))
- **rcml:** drop spurious children/content from attribute-default bg nodes ([8607393](https://github.com/rulecom/rule-io-sdk/commit/8607393))
- **rcml:** add content schemas for rc-preview, rc-plain-text, and rc-raw ([fcb0e7f](https://github.com/rulecom/rule-io-sdk/commit/fcb0e7f))
- **rcml:** accept attribute-override nodes in rc-attributes without children/content ([e4896f2](https://github.com/rulecom/rule-io-sdk/commit/e4896f2))
- **rcml:** add missing T.Font/T.Class to specs and fix buildBgNode override nodes ([e602e90](https://github.com/rulecom/rule-io-sdk/commit/e602e90))

### ❤️ Thank You

- Claude Sonnet 4.6
- Oleksandr Ryzhyk

## 0.4.0-beta.3 (2026-05-18)

This was a version bump only for rcml to align it with other projects, there were no code changes.

## 0.4.0-beta.2 (2026-05-14)

### 🩹 Fixes

- **deps:** sync package versions with release and fix lock file consistency ([bb0d50f](https://github.com/rulecom/rule-io-sdk/commit/bb0d50f))

### ❤️ Thank You

- Claude Sonnet 4.6
- Oleksandr Ryzhyk

## 0.4.0-beta.1 (2026-05-14)

### 🩹 Fixes

- **deps:** resolve npm audit vulnerabilities ([d2b9d41](https://github.com/rulecom/rule-io-sdk/commit/d2b9d41))

### ❤️ Thank You

- Claude Sonnet 4.6
- Oleksandr Ryzhyk

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
