# Subscriber Identifiers

Most operations that act on a single subscriber accept a `SubscriberIdentifier` — an object that pinpoints exactly one subscriber. Four forms are supported:

| Form | Field | Example |
|---|---|---|
| Email address | `email` | `{ email: 'jane@example.com' }` |
| Numeric Rule.io ID | `id` | `{ id: 1042 }` |
| Phone number | `phoneNumber` | `{ phoneNumber: '+46701234567' }` |
| Custom identifier | `customIdentifier` | `{ customIdentifier: 'ext-user-123' }` |

Exactly one field must be present — the type is a discriminated union, so TypeScript enforces this at compile time.

## Choosing an identifier

**Email** is the most common choice for integrations that track users by email address.

**Numeric ID** is useful when you have already fetched a subscriber (e.g. via `getByEmail()`) and want to reference the same record without repeating the email lookup. The `id` field on the returned `Subscriber` object holds this value.

**Phone number** is the natural choice when your system tracks contacts by phone — for example in SMS-first flows.

**Custom identifier** maps to an ID from your own system (an external user ID, a CRM key, etc.). Use it when you want to reference a subscriber without storing their Rule.io ID or email address.

## Examples

```typescript
// By email
await client.subscribers.addSubscriberTag({ email: 'jane@example.com' }, 'vip');

// By numeric Rule.io ID
await client.subscribers.addSubscriberTag({ id: 1042 }, 'vip');

// By phone number
await client.subscribers.addSubscriberTag({ phoneNumber: '+46701234567' }, 'vip');

// By custom identifier
await client.subscribers.addSubscriberTag({ customIdentifier: 'ext-user-123' }, 'vip');
```

*→ [`SubscriberIdentifier`](/api/client/src/type-aliases/SubscriberIdentifier)*
