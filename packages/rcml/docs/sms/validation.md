# Validation

`validateSmsDocument` and `safeValidateSmsDocument` check an SMS document against the
full SMS schema before submission. Validation runs two sequential passes — structure then
content — and returns a unified issue list with machine-readable error codes.

## Document validation

Use document-level validation when you have an `SmsDocument` object (from
`createSmsDocument`, `xmlToSms`, or built by hand) and want to confirm it is ready to
submit.

| Function | On failure |
|---|---|
| `validateSmsDocument` | Throws `SmsDocumentValidationError` |
| `safeValidateSmsDocument` | Returns `{ success: false, errors }` |

```typescript
import { validateSmsDocument, safeValidateSmsDocument } from '@rulecom/rcml';

// Throwing variant — errors surface as exceptions
const doc = validateSmsDocument(candidate);

// Non-throwing variant — inspect or forward the error list
const result = safeValidateSmsDocument(candidate);
if (!result.success) {
  console.error(result.errors);
}
```

The validator runs two passes on every call:

1. **Structural** — verifies that `tagName` is `'rc-sms'`, `attributes` is an empty
   object, and `content` is present.
2. **Content** — validates the `SmsContentJson` against the SMS JSON Schema (AJV), checking
   that only valid node types, mark types, and placeholder type values are used.

Both passes always run. A failure in the first pass does not suppress the second — you
get the full issue list in a single call.

### Error codes

| Code | Meaning |
|---|---|
| `STRUCTURE_INVALID` | `tagName`, `attributes`, or the presence of `content` failed structural checks |
| `CONTENT_REQUIRED` | The `content` field is null or missing |
| `CONTENT_INVALID` | The `SmsContentJson` value failed JSON Schema validation |

All codes are available on the `SmsDocumentErrorCodes` constant:

```typescript
import { SmsDocumentErrorCodes, safeValidateSmsDocument } from '@rulecom/rcml';

const result = safeValidateSmsDocument(doc);
if (!result.success) {
  const structureErrors = result.errors.filter(
    (e) => e.code === SmsDocumentErrorCodes.STRUCTURE_INVALID,
  );
}
```

## Content validation

Use content-level validation when you have a raw `SmsContentJson` value — for example,
when receiving editor state from the Rule frontend — and want to validate it before
embedding it in a document.

| Function | On failure |
|---|---|
| `validateSmsJson` | Throws `SmsContentParseError` |
| `safeParseSmsJson` | Returns `{ success: false, errors }` |

```typescript
import { validateSmsJson, safeParseSmsJson } from '@rulecom/rcml';

// Throwing variant
const content = validateSmsJson(rawJson);

// Non-throwing variant
const result = safeParseSmsJson(rawJson);
if (!result.success) {
  console.error(result.errors);
}
```

## Error types

### `SmsDocumentValidationError`

Thrown by `validateSmsDocument`. Its `.errors` array contains every issue found
across both passes:

```typescript
class SmsDocumentValidationError extends Error {
  readonly errors: SmsDocumentValidationIssue[];
}

type SmsDocumentValidationIssue = {
  path: string;                  // e.g. '/content/content/0'
  code: SmsDocumentErrorCode;
  message: string;
};
```

### `SmsContentParseError`

Thrown by `validateSmsJson`. Its `.errors` array contains AJV-derived content
validation issues:

```typescript
class SmsContentParseError extends Error {
  readonly errors: SmsContentValidationError[];
}

type SmsContentValidationError = {
  path: string;
  message: string;
};
```

### `SmsXmlParseError`

Thrown by `xmlToSms` when XML parsing or `rc-sms` root validation fails. Use
`safeXmlToSms` for the non-throwing variant:

```typescript
import { safeXmlToSms, SmsXmlErrorCodes } from '@rulecom/rcml';

const result = safeXmlToSms(xmlString);
if (!result.success) {
  const parseFailures = result.errors.filter(
    (e) => e.code === SmsXmlErrorCodes.XML_PARSE_ERROR,
  );
}
```

| Code | Meaning |
|---|---|
| `XML_PARSE_ERROR` | The XML string could not be parsed |
| `ROOT_INVALID` | The root element is not `<rc-sms>` |
| `SFM_PARSE_ERROR` | The text content inside `<rc-sms>` is not valid SFM |

## Related

- [Building programmatically](./building-programmatically) — constructing documents
- [`validateSmsDocument`](/api/rcml/src/functions/validateSmsDocument) — API reference
- [`safeValidateSmsDocument`](/api/rcml/src/functions/safeValidateSmsDocument) — API reference
- [`validateSmsJson`](/api/rcml/src/functions/validateSmsJson) — API reference
- [`safeParseSmsJson`](/api/rcml/src/functions/safeParseSmsJson) — API reference
- [`safeXmlToSms`](/api/rcml/src/functions/safeXmlToSms) — API reference
