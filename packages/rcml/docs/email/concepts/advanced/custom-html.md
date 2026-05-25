# Custom HTML

`<rc-raw>` injects an HTML string verbatim into the compiled email output, bypassing all RCML structural checks. It is an escape hatch for cases that RCML's layout model cannot express.

RCML compiles to table-based HTML because that is the only layout model that renders consistently across all major email clients. This means the structural elements (`rc-section`, `rc-column`, etc.) map to `<table>`, `<tr>`, and `<td>` — a constrained subset of HTML. Anything that requires markup outside that model cannot be expressed through RCML elements, which is where `rc-raw` comes in.

## When to use `rc-raw`

- **Microsoft Office conditional comments** — `<!--[if mso]>…<![endif]-->` for Outlook rendering fallbacks.
- **Vendor-specific tracking pixels** — when a pixel `<img>` tag must be placed exactly and `rc-image` adds unwanted wrapper markup.
- **Structural HTML not expressible in RCML** — rare edge cases requiring specific table or cell markup outside what the layout containers provide.

## Caution

Content in `rc-raw` is inserted as-is into the compiled output, bypassing all validation. Malformed HTML or unclosed tags don't just break the raw block — they can corrupt everything that follows it in the compiled email. The template may look correct in preview tools but render broken in a recipient's inbox. Because the error is silent, it can go undetected until a real send. Use standard RCML elements whenever they can express what you need, and keep `rc-raw` content minimal and well-tested.

## Related

- [`<rc-raw>` reference](/packages/rcml/email/rcml/body/content/rc-raw) — attributes and usage examples
