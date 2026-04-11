# CLAUDE.md - Read Before Every Task

## The Golden Rule

**When stuck or unsure: STOP -> READ -> ASK -> then CODE**

Don't hack workarounds. Don't guess. Ask the user.

---

## Critical Rules (Violations Break Consumers)

### 1. Zero Runtime Dependencies

This is a standalone SDK. No external runtime dependencies allowed.
Dev dependencies (tsup, vitest, typescript) are fine.

### 2. Backward Compatibility

Every public export is a contract. Breaking changes require:
- Major version bump
- Migration guide in CHANGELOG.md
- Deprecation warnings in the previous minor release

### 3. No Hardcoded Business Logic

Templates, tags, and configurations must be parameterized.
The SDK serves multiple verticals (hospitality, e-commerce, generic).

```typescript
// WRONG - Hardcoded for one customer
const DEFAULT_COLOR = '#2D5016';
const VENUE_NAME = 'Some Business';

// CORRECT - Consumer provides config
function createTemplate(config: TemplateConfig) { ... }
```

### 4. Type Safety

- No `any` types (except in catch blocks)
- All public functions must have explicit return types
- All public types must be exported from `src/index.ts`

### 5. URL Sanitization

RCML element builders that accept URL parameters (`href`, `src`) should
sanitize those values with `sanitizeUrl()` from `src/rcml/utils.ts` when
wiring them into RCML output. This prevents `javascript:` and `data:`
URI injection.

Text content does NOT need `escapeHtml()` — RCML is structured JSON
(ProseMirror nodes), not raw HTML. Rule.io's renderer handles text
encoding. `escapeHtml()` remains available for consumers who build
raw HTML outside of RCML.

---

## Important Rules (Violations Cause Bugs)

### 6. Test Everything

Happy path + edge cases + error cases. See `.claude/rules/testing.md`.

### 7. Consistent API Design

- Methods that fetch a single resource return `T | null` (not throw on 404)
- Methods that create/update return the response type
- All async methods must handle errors with `RuleApiError`

### 8. RCML Documents Must Be Valid

Template builders must produce valid RCML that Rule.io accepts.
Test with actual API calls when possible.

### 9. Keep Exports Clean

`src/index.ts` is the single public entry point. Every export there is a
public API commitment. Don't export internal utilities.

---

## Commands

```bash
npm run build         # Build with tsup
npm run dev           # Build in watch mode
npm run test          # Run tests
npm run test:watch    # Tests in watch mode
npm run type-check    # TypeScript

/review               # Code review (RUN BEFORE COMMIT)
/commit               # Smart commit (runs /review first)
/test                 # Run tests with coverage
/critique             # Self-critique your changes
/publish              # Prepare for npm publish
/api-docs             # Generate API documentation
```

---

## Project Stack

- **Language:** TypeScript (strict mode)
- **Build:** tsup (CJS + ESM dual output)
- **Test:** Vitest
- **Target:** Node.js >= 18
- **Output:** `dist/` (index.js, index.mjs, index.d.ts)

---

## Architecture

```
src/
├── index.ts                  # Public API entry point
├── client.ts                 # RuleClient (v2 + v3 API methods)
├── constants.ts              # API URLs, RuleTags
├── errors.ts                 # RuleApiError, RuleConfigError
├── types/
│   ├── index.ts              # Re-exports
│   ├── api.ts                # API request/response types
│   └── rcml.ts               # RCML document types
├── rcml/
│   ├── index.ts              # Re-exports
│   ├── elements.ts           # Low-level RCML element builders
│   ├── brand-template.ts     # Brand-aware template utilities
│   ├── hospitality-templates.ts  # Hotel/restaurant email templates
│   ├── ecommerce-templates.ts    # E-commerce email templates
│   └── utils.ts              # escapeHtml, sanitizeUrl, etc.
└── automation-configs-v2.ts  # Automation types and utilities
```

---

## Template Verticals

The SDK supports multiple business verticals:

**Hospitality** (hotels, restaurants, experiences):
- `createReservationConfirmationEmail()`
- `createReservationCancellationEmail()`
- `createReservationReminderEmail()`
- `createFeedbackRequestEmail()`
- `createReservationRequestEmail()`

**E-commerce** (online stores):
- `createOrderConfirmationEmail()`
- `createShippingUpdateEmail()`
- `createAbandonedCartEmail()`
- `createOrderCancellationEmail()`

All templates require consumer-provided configuration (brand style, text, field mappings).
No hardcoded defaults for any specific business.

---

## More Detail When Needed

| Topic           | Document                                |
| --------------- | --------------------------------------- |
| Rule.io API     | @.claude/RULE_IO_API_REFERENCE.md       |
| SDK Design      | @.claude/SDK_DESIGN_PRINCIPLES.md       |

---

**Quality > Speed. If unclear, ask the user.**
