# Triggering Tag Automations

When you assign a tag to a subscriber, Rule.io can optionally fire a tag-triggered automation at the same time. The SDK gives you three focused methods for this — each encoding a distinct intent so you don't have to remember low-level flags.

For creating and managing the automations themselves, see [Setting Up Automations](./setting-up-automations).

## Quick reference

| Method | When to use |
|---|---|
| `addSubscriberTag()` | Assign the tag silently — no automation fires |
| `triggerTagAutomation()` | Fire once if not already triggered; safe to repeat |
| `forceTagAutomation()` | Always start a new pass, even if one already ran |
| `resetTagAutomation()` | Cancel pending messages, then start a fresh pass |

---

## Trigger once

```typescript
await client.subscribers.triggerTagAutomation(
  { email: 'customer@example.com' },
  'onboarding',
);
```

**Use this when:** you want the automation to run exactly once per subscriber. Safe to call multiple times — if the automation already fired, this is a no-op.

**Detailed behaviour:**

| Subscriber state | Result |
|---|---|
| Does not have the tag | Tag added; automation triggered from step 1 |
| Has the tag; automation not yet triggered | No tag change; automation triggered |
| Has the tag; automation in progress (e.g. 1 of 3 messages sent) | No-op — pending messages 2 and 3 still send on their original schedule |
| Has the tag; automation completed | No-op — automation does **not** re-fire |

This is the right choice for welcome flows, onboarding sequences, and any automation that should run at most once.

---

## Force a new pass

```typescript
await client.subscribers.forceTagAutomation(
  { email: 'customer@example.com' },
  'promo-spring',
);
```

**Use this when:** you need to re-send the automation regardless of history — for example, re-running a promotional sequence for subscribers who already received it.

**Detailed behaviour:**

| Subscriber state | Result |
|---|---|
| Does not have the tag | Tag added; automation triggered from step 1 |
| Has the tag; automation in progress (1 of 3 sent) | Pending messages 2 and 3 **remain scheduled**; a second full pass (all 3) also starts — the subscriber receives both |
| Has the tag; automation completed | A new full pass starts |

> **Note:** If an automation is in progress, `forceTagAutomation()` starts an additional pass *on top of* the existing one. The subscriber will receive the pending messages from the original pass *and* all messages from the new pass. Use `resetTagAutomation()` if you want a clean restart instead.

---

## Cancel and restart

```typescript
await client.subscribers.resetTagAutomation(
  { email: 'customer@example.com' },
  'onboarding',
);
```

**Use this when:** the subscriber is mid-sequence and you want to restart from the beginning without them receiving duplicate messages.

**Detailed behaviour:**

| Subscriber state | Result |
|---|---|
| Does not have the tag | Tag added; automation triggered from step 1 |
| Has the tag; automation in progress (1 of 3 sent) | Pending messages 2 and 3 **cancelled**; fresh pass starts from step 1 |
| Has the tag; automation completed | A new full pass starts |

This is the right choice when something changed (a plan upgrade, a support interaction) that makes the original pass stale.

---

## Assigning a tag silently

Use `addSubscriberTag()` when you want to add the tag without firing any automation:

```typescript
await client.subscribers.addSubscriberTag(
  { email: 'customer@example.com' },
  'internal-flag',
);
```

No automation mode is specified, so Rule.io applies the tag and does not trigger any automation.

---

## Skipping segment sync

By default, Rule.io recalculates segment membership after each tag operation. Pass `{ syncSegments: false }` to skip it:

```typescript
await client.subscribers.addSubscriberTag(
  { email: 'customer@example.com' },
  'onboarding',
  { syncSegments: false },
);
```

One common reason to skip is when your Rule.io account has autosync configured — in that case the per-call recalculation is redundant and the autosync will handle membership updates on its own schedule.

The same option is available on `addSubscriberTag()`, `forceTagAutomation()`, and `resetTagAutomation()`.

---

## Subscriber identifiers

All four methods accept any `SubscriberIdentifier` — you can identify the subscriber by email, numeric ID, phone number, or custom identifier:

```typescript
await client.subscribers.triggerTagAutomation({ email: 'customer@example.com' }, 'welcome');
await client.subscribers.triggerTagAutomation({ id: 1042 }, 'welcome');
await client.subscribers.triggerTagAutomation({ phoneNumber: '+46701234567' }, 'welcome');
await client.subscribers.triggerTagAutomation({ customIdentifier: 'ext-user-123' }, 'welcome');
```

---

## Next steps

- Create and manage automations: [Setting Up Automations](./setting-up-automations)
- Add tags without automation control: [Organizing with Tags](./organizing-with-tags)
- Run a one-off campaign instead: [Running Campaigns](./running-campaigns)
