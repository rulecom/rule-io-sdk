# Switches

`<rc-switch>` lets different email content be shown to different recipients based on their tags, segments, or custom field values — without creating separate templates. All the content variants live in one document; the renderer picks one at send time.

Without switches, showing different content to different audiences requires maintaining separate templates — one for VIP members, one for regular subscribers, one for lapsed users. Any structural change, like a new footer or an updated header, has to be applied to every variant. A switch puts all variants in one document: one place to update, one version to track in version control.

## How it works

`rc-switch` holds one or more `rc-case` children. At send time, the renderer evaluates the cases top to bottom and renders the first one whose condition matches the recipient. A `case-type="default"` case provides the fallback when nothing else matches. If there is no default and no condition matches, `rc-switch` renders nothing.

Each `rc-case` wraps exactly one `rc-section`, so every branch can contain a full row of content.

## Practical uses

Common applications: showing a discount offer only to subscribers with a specific tag; rendering a language-specific greeting based on a subscriber custom field; displaying a loyalty-tier benefit section for members above a certain spending threshold and hiding it for everyone else.

The `default` case is important: without it, any recipient who doesn't match a condition sees a blank space where the switch is — not an error, just silence. Always include a default case unless an empty section is intentional.

## Related

- [`<rc-switch>` reference](/packages/rcml/email/rcml/body/control-flow/rc-switch) — attributes, condition types, and examples
- [`<rc-case>` reference](/packages/rcml/email/rcml/body/control-flow/rc-case)
