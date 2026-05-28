# Exporting Data

> **Enterprise feature.** The exports API is available on Enterprise Rule.io plans.

Exports give you raw event and subscriber data in bulk — useful for populating a data warehouse, building custom reports, or auditing delivery history. This is different from the [analytics API](./tracking-performance), which returns pre-aggregated summaries. Exports return the underlying records.

## Exporting dispatcher data

A "dispatcher" is a campaign or automation. This export returns a list of dispatchers and their basic metadata for a given date range:

```typescript
const result = await client.exports.dispatchers({
  date_from: '2025-01-15',
  date_to:   '2025-01-15',  // same day — max range is 1 day
});
```

> **The date range is limited to 1 day.** To export data for a longer period, make multiple requests with consecutive single-day ranges.

*→ [`RuleExportDispatcherRecord`](/api/client/src/interfaces/RuleExportDispatcherRecord)*

## Exporting statistics

The statistics export returns per-subscriber engagement events (opens, clicks, bounces, etc.):

```typescript
const result = await client.exports.statistics({
  date_from: '2025-01-15',
  date_to:   '2025-01-15',
  statistic_types: ['open', 'click'],
});
```

### Handling pagination

Statistics exports can be large. The API uses token-based pagination:

```typescript
let nextPageToken: string | undefined;

do {
  const result = await client.exports.statistics({
    date_from: '2025-01-15',
    date_to:   '2025-01-15',
    statistic_types: ['open', 'click'],
    next_page_token: nextPageToken,
  });

  const rows = result.data?.rows ?? [];
  // process rows...

  nextPageToken = result.data?.next_page_token ?? undefined;
} while (nextPageToken);
```

### Decoded message names

The API encodes `message_name` fields in base64. The SDK decodes them automatically by default (`decodeNames: true`). Set `decodeNames: false` if you need the raw encoded values:

```typescript
const result = await client.exports.statistics({
  date_from: '2025-01-15',
  date_to:   '2025-01-15',
  decodeNames: false,  // keep base64 encoding
});
```

*→ [`RuleExportStatisticsParams`](/api/client/src/interfaces/RuleExportStatisticsParams) · [`RuleExportStatisticRecord`](/api/client/src/interfaces/RuleExportStatisticRecord)*

## Exporting subscribers

Export a list of subscribers created or updated in a date range:

```typescript
const result = await client.exports.subscribers({
  date_from: '2025-01-01',
  date_to:   '2025-01-01',
});
```

*→ [`RuleExportSubscriberRecord`](/api/client/src/interfaces/RuleExportSubscriberRecord)*

## Next steps

- For aggregated summaries without raw event data: [Tracking Performance](./tracking-performance)
- To suppress exported unsubscribers: [Managing Suppressions](./managing-suppressions)
