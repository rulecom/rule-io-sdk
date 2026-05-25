# Loops

`<rc-loop>` renders a block of email content once per item in a data feed — news feed, remote URL, custom field, or XML source. The loop's child `rc-section` is duplicated for each item, up to a configurable maximum.

Without loops, a "recommended products" section featuring five items would require five separately-authored sections, each manually configured with a product image, name, and link. When the product data changes, every section needs updating. A loop describes the section structure once; the renderer fills it in from the feed at send time.

## Loop variables

Inside the loop, individual fields from the current item are inserted using `::loop-value` atoms in `rc-text` and `rc-heading` content. A `loop-value` atom identifies its data source by the `loop-value` attribute of the enclosing `rc-loop`, and the specific field by an index name — for example, a news item's title, image URL, or link.

## Personalization and limits

A `loop-type="remote-content"` loop fetches data from a URL, and that URL can contain `[Subscriber:...]` and `[CustomField:...]` tokens that are resolved per recipient before the request is made. This enables personalized feeds — each subscriber sees items relevant to their history — without pre-generating per-subscriber content.

`loop-max-iterations` prevents emails from growing uncontrollably. A news feed may have 200 articles; a product catalog could have thousands. Without a cap, the compiled email could become enormous and trigger spam filters or delivery failures. Set a limit that matches the design intent (typically 3–10 items for a newsletter block).

## Related

- [`<rc-loop>` reference](/packages/rcml/email/rcml/body/control-flow/rc-loop) — attributes, source types, and examples
- [`loop-value` node](/packages/rcml/email/content/inline-nodes/loop-value) — the inline atom used inside loop content
