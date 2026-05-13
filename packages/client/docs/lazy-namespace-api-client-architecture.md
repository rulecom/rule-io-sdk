# Architecture Document: Lazy Namespace Public API Client

## 1. Overview

This document defines the target architecture for a **public TypeScript API wrapper client**.

Primary goals:

- **Simple public API**
- **Strong typing**
- **Excellent IDE autocomplete**
- **Scalable to hundreds/thousands of endpoints**
- **No mega-client class**
- **Lazy resource initialization**
- **Single shared HTTP transport**
- **Clear separation of concerns**
- **Easy testing**
- **Easy code generation integration**
- **Backward-compatible evolution**
- **Predictable error handling**
- **Consistent implementation patterns**

Target usage:

```ts
const client = new ApiClient({
  apiKey: process.env.API_KEY,
});

await client.users.get("123");
await client.users.list();

await client.projects.create({...});

await client.billing.invoices.list();
await client.billing.subscriptions.cancel(id);
```

Public ergonomics should feel like:

> **one client instance → discoverable namespaces → discoverable methods**

Internally:

> **modular namespace clients + shared transport + lazy instantiation**

---

# 2. Core Architectural Principles

## 2.1 Root client is composition root only

`ApiClient` is **NOT** business logic.

It should:

Responsibilities:

- accept configuration
- validate configuration
- initialize shared transport
- lazily expose namespaces
- expose shared helpers (optional)

It should NOT:

- implement endpoint logic
- implement serialization logic
- build URLs manually
- know endpoint schemas
- implement retries itself
- parse business responses

Bad:

```ts
class ApiClient {
  getUser() {}
  listUsers() {}
  createUser() {}
  createProject() {}
  cancelInvoice() {}
}
```

Good:

```ts
client.users.get()
client.users.list()
client.projects.create()
client.billing.invoices.cancel()
```

Rule:

> Root client composes resource clients only.

---

## 2.2 API docs define namespace boundaries

Namespaces should mirror API docs grouping.

Example docs:

```text
Users
Projects
Billing
Files
Webhooks
Analytics
```

Client:

```ts
client.users
client.projects
client.billing
client.files
client.webhooks
client.analytics
```

Never invent arbitrary grouping.

SDK should feel familiar to API docs readers.

Rule:

> API documentation sections are the primary namespace design source.

---

## 2.3 Large namespaces become nested namespaces

If namespace grows too large:

Bad:

```ts
client.billing.listInvoices()
client.billing.createInvoice()
client.billing.cancelSubscription()
client.billing.getUsage()
client.billing.getTaxRates()
```

Good:

```ts
client.billing.invoices.list()
client.billing.invoices.create()

client.billing.subscriptions.cancel()

client.billing.usage.get()

client.billing.taxRates.list()
```

Rule:

> Split by conceptual domain.

---

## 2.4 Everything shares one transport

There must be exactly one transport instance.

Never:

```ts
new UsersClient(new Transport())
new ProjectsClient(new Transport())
```

Always:

```ts
const transport = new Transport(config);

new UsersClient(transport);
new ProjectsClient(transport);
new BillingClient(transport);
```

Why:

Shared:

- auth
- keepalive
- pooling
- retry logic
- interceptors
- metrics
- tracing
- caching
- rate limiting

Rule:

> One client → one transport.

---

# 3. Lazy Namespace Architecture

## 3.1 Why lazy

Do NOT eagerly instantiate every namespace.

Bad:

```ts
constructor() {
  this.users = new UsersClient(...)
  this.projects = new ProjectsClient(...)
  this.billing = new BillingClient(...)
  this.analytics = new AnalyticsClient(...)
  this.files = new FilesClient(...)
}
```

Problems:

- startup overhead
- memory waste
- unnecessary constructor work
- slower tests
- circular dependency risk

Good:

Instantiate on first access.

```ts
client.users
```

→ construct UsersClient once

then cache.

Subsequent:

```ts
client.users
```

→ return cached instance

Rule:

> Namespace construction must be lazy.

---

## 3.2 Lazy cache implementation

Preferred implementation:

factory map.

```ts
private readonly resources = new Map<string, unknown>();
```

Accessor:

```ts
protected lazy<T>(
  key: string,
  factory: () => T,
): T
```

Behavior:

If cached:

→ return cached

Else:

→ create

→ cache

→ return

Advantages:

- DRY
- single cache mechanism
- trivial extension
- uniform implementation

Rule:

> Use centralized lazy cache.

---

## 3.3 Stable singleton namespace instances

Must guarantee:

```ts
client.users === client.users
```

always true.

Same for nested:

```ts
client.billing === client.billing
client.billing.invoices === client.billing.invoices
```

Namespaces are singleton-per-client-instance.

Rule:

> Resource instances are cached singletons.

---

# 4. Resource Client Design

## 4.1 One class = one namespace

Example:

```text
UsersClient
ProjectsClient
BillingClient
InvoicesClient
SubscriptionsClient
```

Naming:

`<Namespace>Client`

Rule:

> Explicit resource client classes.

---

## 4.2 Extend BaseResource

Common parent:

```ts
abstract class BaseResource
```

Contains:

```ts
protected transport
```

Optional shared helpers:

- path join
- pagination helper
- cursor builder
- serialization helper

Rule:

> All namespace clients inherit common base.

---

## 4.3 Resource clients are stateless

Clients should hold:

Allowed:

- transport
- lazy nested namespace cache

Not allowed:

- mutable endpoint state
- cached request results
- auth state duplication

Bad:

```ts
this.lastUser
this.cachedResponse
this.currentToken
```

Good:

pure endpoint wrappers.

Rule:

> Resource clients are stateless facades.

---

## 4.4 Endpoint methods are thin wrappers

Good:

```ts
get(id) {
  return this.transport.get(...)
}
```

Bad:

massive logic.

Business logic belongs server-side.

Client logic should remain thin.

Allowed:

- validation
- serialization
- normalization
- convenience helpers

Rule:

> Endpoint wrappers should be thin.

---

# 5. Transport Layer

## 5.1 Transport owns HTTP concerns

Transport handles:

- fetch adapter
- base URL
- headers
- auth
- retries
- timeout
- parsing
- content negotiation
- error mapping
- tracing
- middleware
- cancellation
- upload/download streaming

Rule:

> HTTP complexity lives only in transport.

---

## 5.2 Uniform methods

Expose:

```ts
get()
post()
put()
patch()
delete()
request()
```

Uniform signatures.

Rule:

> Consistent transport API.

---

## 5.3 Error normalization

Never leak raw fetch errors.

Normalize into SDK errors.

Examples:

```ts
ApiError
ValidationError
AuthError
RateLimitError
NotFoundError
NetworkError
TimeoutError
```

Rule:

> Throw typed SDK errors only.

---

# 6. Namespace Method Guidelines

Methods should be predictable.

Collection:

```ts
list()
create()
search()
count()
```

Entity:

```ts
get()
update()
delete()
archive()
restore()
```

Actions:

```ts
cancel()
publish()
send()
retry()
```

Avoid random naming.

Rule:

> Consistent verbs.

---

# 7. Type System

Use explicit request/response types.

Never:

```ts
Promise<any>
```

Always:

```ts
Promise<User>
```

Requests:

```ts
CreateUserRequest
UpdateUserRequest
ListUsersParams
```

Responses:

```ts
User
PaginatedUsersResponse
```

Rule:

> No any.

---

# 8. File Layout

Recommended:

```text
src/
  client.ts
  transport.ts
  config.ts
  errors.ts

  core/
    base-resource.ts
    lazy-resource-cache.ts

  resources/
    users/
      users.client.ts
      users.types.ts

    projects/
      projects.client.ts
      projects.types.ts

    billing/
      billing.client.ts

      invoices/
        invoices.client.ts
        invoices.types.ts

      subscriptions/
        subscriptions.client.ts
        subscriptions.types.ts
```

Rule:

> Namespace folder mirrors client namespace tree.

---

# 9. Testing Rules

Unit test:

- transport
- lazy caching
- namespace access
- endpoint URL construction
- serialization
- error mapping

Must verify:

```ts
client.users === client.users
```

Must verify nested singleton.

Rule:

> Lazy singleton behavior must be tested.

---

# 10. Claude Code Refactor Requirements

When refactoring:

Claude must:

1. identify namespaces
2. split mega classes
3. introduce BaseResource
4. introduce Transport
5. introduce root ApiClient
6. implement centralized lazy cache
7. convert public surface to namespaces
8. preserve typing
9. preserve backward compatibility where possible
10. add tests

Must avoid:

- duplicated transport logic
- eager initialization
- stateful resource classes
- circular imports
- giant files

Success criteria:

Public API becomes:

```ts
client.namespace.method()
client.namespace.subnamespace.method()
```

Internals become:

```text
Root client
→ lazy cache
→ resource clients
→ single transport
```

This is the target architecture.
