# SMS RFM

**SMS RFM** (SMS Rule Flavor Markdown) is the source text format used inside an
`<rc-sms>` element. It is a compact, human-readable string that compiles to the
[`SmsContentJson`](./sms-document) tree. Writing SMS RFM is far more concise than
constructing `SmsContentJson` by hand, and it is the form the XML representation
of an SMS template stores in the body of `<rc-sms>`.

This page describes the format conceptually — what constructs it has and how
they map to the document model. For the functions that parse and serialise it,
see [Building programmatically](../building-programmatically).

## What SMS RFM contains

An SMS RFM string is built from four constructs:

1. **Paragraphs** — separated by blank lines.
2. **Hard breaks** — forced line breaks inside a paragraph.
3. **Placeholders** — dynamic values substituted at send time.
4. **Links** — text that becomes a hyperlink with tracking and shortening flags.

That is the entire format. Plain text written between these constructs becomes
text nodes verbatim.

## Paragraphs

A paragraph is a block of text on consecutive lines. A blank line ends one
paragraph and starts the next:

```
First paragraph.

Second paragraph.
```

See [`paragraph`](../content/nodes/paragraph) for the node reference.

## Hard breaks

A hard break is a line break that stays inside the same paragraph. Write a
backslash at the end of a line, or two trailing spaces, to insert one:

```
First line\
Second line — same paragraph
```

See [`hardbreak`](../content/nodes/hardbreak) for the node reference and the
distinction between hard breaks and paragraph boundaries.

## Placeholders

A placeholder inserts a dynamic value — a subscriber field, custom field,
account attribute, formatted date, fetched remote content, or system-managed
link URL.

The recommended form is the `::placeholder{…}` directive:

```
Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null}!
```

Six token types are available: `Subscriber`, `User`, `CustomField`, `Date`,
`RemoteContent`, and `Link`. The `original` attribute holds the backend token
(in `[Type:Name]` format) the Rule platform substitutes at send time.

Plain-text `[Type:Name]` tokens belong inside the `original` attribute of a
`::placeholder{…}` directive (as shown above) or inside a URL value such as
`href="[Link:Unsubscribe]"`. They are not a way to write a placeholder as
body content — use the `::placeholder{…}` directive for that.

See [`placeholder`](../content/nodes/placeholder) for the full attribute table,
the catalogue of all six token types, and per-token examples.

## Links

A link wraps a span of text in a hyperlink. The `:link[…]{…}` directive provides
the destination URL, a tracking flag, and a URL-shortening flag:

```
Click :link[here]{href="https://example.com" track="true" shorten="true"} to track your order.
```

Inside `href` a plain-text `[Link:…]` token is the right form for
system-managed URLs:

```
:link[Unsubscribe]{href="[Link:Unsubscribe]" track="false" shorten="false"}
```

See the [link mark](../content/marks/link) page for the full attribute reference.

## A complete example

A short marketing message exercising all four constructs:

```
Hi ::placeholder{type="Subscriber" original="[Subscriber:FirstName]" name="First name" value=null max-length=null},\
your order ::placeholder{type="CustomField" original="[CustomField:Order.Id]" name="Order.Id" value=null max-length=null} has shipped.

Track it here: :link[track shipment]{href="https://example.com/track/[CustomField:Order.Id]" track="true" shorten="true"}

Reply STOP to unsubscribe.
```

This compiles to a three-paragraph `SmsContentJson` document — a greeting with a
hard break and two placeholders, a tracking link, and a footer — exactly the
shape described on the [SMS document](./sms-document) page.

## Related

- [`paragraph`](../content/nodes/paragraph) — paragraph node reference
- [`hardbreak`](../content/nodes/hardbreak) — hard break node reference
- [`text`](../content/nodes/text) — text node reference
- [`placeholder`](../content/nodes/placeholder) — placeholder node reference and token catalogue
- [link mark](../content/marks/link) — link mark reference
- [SMS document](./sms-document) — the document model SMS RFM compiles to
- [Building programmatically](../building-programmatically) — `smsRfmToJson` / `jsonToSmsRfm` and the rest of the API
