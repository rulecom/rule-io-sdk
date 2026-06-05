# Exports

> **Enterprise feature.** The exports API is available on Enterprise Rule.io plans.

Exports give you raw event and subscriber data in bulk — useful for populating a data warehouse, building custom reports, or auditing delivery history. This is different from the [analytics API](./analytics), which returns pre-aggregated summaries. Exports return the underlying records.

## Exporting dispatcher data

A "dispatcher" is a campaign or automation. This export returns a list of dispatchers and their basic metadata for a given date range:

```typescript
const records = await client.exports.dispatchers({
  dateFrom: '2025-01-15',
  dateTo:   '2025-01-15',  // same day — max range is 1 day
});
```

> **The date range is limited to 1 day.** To export data for a longer period, make multiple requests with consecutive single-day ranges.

*→ [`ExportDispatcherRecord`](/api/client/src/interfaces/ExportDispatcherRecord)*

## Exporting statistics

The statistics export returns per-subscriber engagement events (opens, clicks, bounces, etc.):

```typescript
const result = await client.exports.statistics({
  dateFrom: '2025-01-15',
  dateTo:   '2025-01-15',
  statisticTypes: ['open', 'link'],
});
```

### Handling pagination

Statistics exports can be large. The API uses token-based pagination:

```typescript
let nextPageToken: string | undefined;

do {
  const result = await client.exports.statistics({
    dateFrom: '2025-01-15',
    dateTo:   '2025-01-15',
    statisticTypes: ['open', 'link'],
    nextPageToken,
  });

  // process result.data...

  nextPageToken = result.nextPageToken ?? undefined;
} while (nextPageToken);
```

### Decoded message names

Rule.io returns `object.name` base64-encoded for records where `object.type === 'message'`. The SDK decodes these automatically by default (`decodeNames: true`). Set `decodeNames: false` if you need the raw encoded values:

```typescript
const result = await client.exports.statistics({
  dateFrom: '2025-01-15',
  dateTo:   '2025-01-15',
  decodeNames: false,  // keep base64 encoding
});
```

*→ [`ExportStatisticsParams`](/api/client/src/interfaces/ExportStatisticsParams) · [`ExportStatisticRecord`](/api/client/src/interfaces/ExportStatisticRecord)*

## Exporting subscribers

Export a list of subscribers created or updated in a date range:

```typescript
const records = await client.exports.subscribers({
  dateFrom: '2025-01-01',
  dateTo:   '2025-01-01',
});
```

*→ [`ExportSubscriberRecord`](/api/client/src/interfaces/ExportSubscriberRecord)*

## Next steps

- For aggregated summaries without raw event data: [Analytics](./analytics)
- To suppress exported unsubscribers: [Managing Suppressions](./managing-suppressions)
