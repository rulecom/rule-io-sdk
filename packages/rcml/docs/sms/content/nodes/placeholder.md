# `placeholder`

An inline atom that is replaced at render time with a dynamic value — a subscriber
field, custom field value, user attribute, remote content, formatted date, or
system-managed link.

## Attributes

| Attribute | Required | Type | Description |
|-----------|----------|------|-------------|
| `type` | Yes | enum | The placeholder category. Determines what `original` contains. |
| `name` | Yes | string | Human-readable display label shown in the editor chip. |
| `original` | Yes | string | The backend token substituted at send time. |
| `value` | Yes | string \| number \| null | Resolved preview value shown in the editor, or `null` when not yet resolved. |
| `max-length` | Yes | string \| null | Maximum character length (truncates and appends `…`), or `null` for no limit. |

Allowed `type` values: `"CustomField"` | `"Subscriber"` | `"User"` | `"Date"` | `"RemoteContent"` | `"Link"`

## Children

None (inline atom, leaf node).

## Parent nodes

- [`paragraph`](./paragraph)

## Available in

- SMS RFM (`rc-sms`)

## SMS RFM syntax

The recommended form is the `::placeholder{…}` directive:

```
Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null}!
Your total: ::placeholder{type="CustomField" original="[CustomField:Order.Total]" name="Order.Total" value=null max-length=null}
```

The five attributes are required in the directive form:

| Attribute | Value when null |
|-----------|----------------|
| `type` | — (always required) |
| `original` | — (always required) |
| `name` | — (always required) |
| `value` | Write `value=null` explicitly |
| `max-length` | Write `max-length=null` explicitly |

### Compact shorthand

`[Type:Name]` is a backward-compatible shorthand the parser also accepts. It is
appropriate for embedding tokens inside URLs and attribute values — for example, as the
`href` of a `:link` mark:

```
:link[Unsubscribe]{href="[Link:Unsubscribe]" track="false" shorten="false"}
```

It is **not** the recommended form for SMS RFM content nodes. Use `::placeholder{…}` for
any dynamic value that appears as text in the message.

### Serializer output

`jsonToSmsRfm` emits the compact `[Type:Name]` shorthand when both `value` and
`max-length` are null, and the `::placeholder{…}` directive form otherwise. This is an
output optimization — the parser accepts both forms as input.

---

## Subscriber

Inserts a standard subscriber profile field.

| `original` token | `name` | Field |
|-----------------|--------|-------|
| `[Subscriber:email]` | `"Email"` | Email address |
| `[Subscriber:phone_number]` | `"Phone number"` | Phone number |
| `[Subscriber:language]` | `"Language"` | Language code |

**JSON:**

```json
{
  "type": "placeholder",
  "attrs": {
    "type": "Subscriber",
    "name": "First name",
    "original": "[Subscriber:FirstName]",
    "value": null,
    "max-length": null
  }
}
```

**SMS RFM:**

```
Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null}!
```

With a resolved preview value:

```
Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value="Jane" max-length=null}!
```

---

## User

Inserts a field from the sender's Rule.io account profile.

| `original` token | `name` | Field |
|-----------------|--------|-------|
| `[User:CompanyName]` | `"Company name"` | Account company name |
| `[User:Street]` | `"Street"` | Account street address |
| `[User:Zip]` | `"Zip"` | Account postal code |
| `[User:City]` | `"City"` | Account city |
| `[User:EmailAddress]` | `"Email address"` | Account email |

**JSON:**

```json
{
  "type": "placeholder",
  "attrs": {
    "type": "User",
    "name": "Company name",
    "original": "[User:CompanyName]",
    "value": null,
    "max-length": null
  }
}
```

**SMS RFM:**

```
Sent by ::placeholder{type="User" original="[User:CompanyName]" name="Company name" value=null max-length=null}
```

---

## CustomField

Inserts a subscriber custom field value. The `original` token uses `Group.Field` dot
notation. An optional `::N` suffix in the token and a matching `max-length` attribute
truncate the value to N characters and append `…`.

**JSON (no truncation):**

```json
{
  "type": "placeholder",
  "attrs": {
    "type": "CustomField",
    "name": "Order.Total",
    "original": "[CustomField:Order.Total]",
    "value": null,
    "max-length": null
  }
}
```

**JSON (truncated to 20 characters):**

```json
{
  "type": "placeholder",
  "attrs": {
    "type": "CustomField",
    "name": "Order.Total",
    "original": "[CustomField:Order.Total::20]",
    "value": null,
    "max-length": "20"
  }
}
```

**SMS RFM (no truncation):**

```
Your total: ::placeholder{type="CustomField" original="[CustomField:Order.Total]" name="Order.Total" value=null max-length=null}
```

**SMS RFM (truncated to 20 characters):**

```
Your total: ::placeholder{type="CustomField" original="[CustomField:Order.Total::20]" name="Order.Total" value=null max-length="20"}
```

---

## Date

Inserts a formatted date computed at send time. `value` is always `null`. The date
source and output format are encoded entirely in the `original` token.

**Date source options:**

| Token | Source |
|-------|--------|
| `[Date:now::Y-m-d]` | Current date |
| `[Date:tomorrow::Y-m-d]` | Tomorrow |
| `[Date:yesterday::Y-m-d]` | Yesterday |
| `[Date:in-2-days::Y-m-d]` | N days from now (replace `2` with any number) |
| `[Date:3-days-ago::Y-m-d]` | N days ago (replace `3` with any number) |
| `[Date:[CustomField:Order.CreatedAt]::Y-m-d]` | From a subscriber custom field |

**Format** (the part after `::` at the end of the token): PHP date format string.
Supported values: `Y-m-d`, `d.m.Y`, `m-d-Y`, `m/d/Y`, `d/m/Y`.

**JSON:**

```json
{
  "type": "placeholder",
  "attrs": {
    "type": "Date",
    "name": "Offer expires",
    "original": "[Date:tomorrow::d.m.Y]",
    "value": null,
    "max-length": null
  }
}
```

**SMS RFM:**

```
Offer valid until ::placeholder{type="Date" original="[Date:tomorrow::d.m.Y]" name="Offer expires" value=null max-length=null}.
```

---

## RemoteContent

Fetches content from a remote URL at send time and inserts the response body. `name` is
always `"RemoteContent"`. The URL may contain nested `[CustomField:…]`,
`[Subscriber:…]`, and `[User:…]` tokens that are resolved before the request is made.

**JSON:**

```json
{
  "type": "placeholder",
  "attrs": {
    "type": "RemoteContent",
    "name": "RemoteContent",
    "original": "[RemoteContent:https://api.example.com/promo]",
    "value": null,
    "max-length": null
  }
}
```

With nested tokens in the URL:

```json
{
  "type": "placeholder",
  "attrs": {
    "type": "RemoteContent",
    "name": "RemoteContent",
    "original": "[RemoteContent:https://api.example.com/offer?id=[CustomField:Order.Id]&email=[Subscriber:email]]",
    "value": null,
    "max-length": null
  }
}
```

**SMS RFM:**

```
::placeholder{type="RemoteContent" original="[RemoteContent:https://api.example.com/promo]" name="RemoteContent" value=null max-length=null}
```

---

## Link

Inserts a system-managed link URL — Rule's pre-defined system links such as the
unsubscribe URL or the web-browser-view URL. Use this token when you want the raw
URL visible in the message body rather than as linked text.

| `original` token | Link type |
|-----------------|-----------|
| `[Link:Unsubscribe]` | Unsubscribe link |
| `[Link:WebBrowser]` | View in web browser |
| `[Link:Optin]` | Opt-in confirmation |
| `[Link:ShareLink]` | Social share link |
| `[Link:Signup]` | Sign-up link |

**JSON:**

```json
{
  "type": "placeholder",
  "attrs": {
    "type": "Link",
    "name": "Unsubscribe",
    "original": "[Link:Unsubscribe]",
    "value": null,
    "max-length": null
  }
}
```

**SMS RFM:**

```
Reply STOP or unsubscribe here: ::placeholder{type="Link" original="[Link:Unsubscribe]" name="Unsubscribe" value=null max-length=null}
```

### Link tokens in link marks

`[Link:…]` tokens are also the correct form for the `href` attribute of a
[`link` mark](../marks/link) — this is one of the places where the shorthand is
appropriate, because it appears inside an attribute value rather than as a standalone
content node:

```
Reply STOP or unsubscribe: :link[click here]{href="[Link:Unsubscribe]" track="true" shorten="false"}
```

Use the `::placeholder{…}` form when you want the URL rendered as plain text in the
message body; use the link mark form when you want trackable linked text.

---

## Machine-readable token catalog

The complete token reference is available as `smsPlaceholderSpec`:

```typescript
import { smsPlaceholderSpec } from '@rulecom/rcml';

// All SMS-valid token types
Object.keys(smsPlaceholderSpec.tokens)
// → ['CustomField', 'Subscriber', 'User', 'Date', 'RemoteContent', 'Link']

// Token syntax and examples
smsPlaceholderSpec.tokens['Subscriber'].syntax
// '[Subscriber:<field>]'

smsPlaceholderSpec.tokens['Link'].params?.['type'].allowedValues
// → ['Optin', 'Unsubscribe', 'WebBrowser', 'ShareLink', 'Signup']
```

`smsPlaceholderSpec` exposes the six token types available in SMS RFM, each with
its full token syntax, parameter schema, allowed values, and examples — useful as
machine-readable input to LLM-driven generation. See
[Building with LLM](../../building-with-llm) for that workflow.
