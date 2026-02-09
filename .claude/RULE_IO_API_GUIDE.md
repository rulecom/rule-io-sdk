# Rule.io API Quick Reference

## API Versions

- **v2** (`https://app.rule.io/api/v2`) - Subscribers, Tags
- **v3** (`https://app.rule.io/api/v3`) - Editor (Automail, Message, Template, Dynamic Set)

## Authentication

All requests require: `Authorization: Bearer <API_KEY>`

v3 additionally requires: `Content-Type: application/json;charset=utf-8`

## ⚠️ Known API Quirks

### 1. Trigger Type Must Be UPPERCASE
```
✅ trigger.type = "TAG"
❌ trigger.type = "tag"   ← API error message incorrectly suggests this
```

### 2. Two-Step Automail Creation
Cannot set trigger during creation. Must:
1. `POST /editor/automail` (create, get ID)
2. `PUT /editor/automail/{id}` (set trigger + sendout_type)

### 3. Template Names Must Be Unique
Add timestamp to avoid conflicts: `"My Template - 1706000000000"`

### 4. Tag ID Required for Triggers
Triggers use numeric tag ID, not tag name.
Look up via `GET /api/v2/tags` first.

### 5. Subscriber Field Prefixing
Fields must be prefixed with group name: `Booking.FirstName`, not `FirstName`.

### 6. Singular vs Plural Endpoint
- `GET /subscribers/{email}` - Get subscriber
- `GET /subscriber/{email}/fields` - Get fields (note: singular!)

## Endpoints Used by SDK

### v2 Subscriber API
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/subscribers` | Create/update subscriber |
| GET | `/subscribers/{email}?identified_by=email` | Get subscriber |
| DELETE | `/subscribers/{email}?identified_by=email` | Delete subscriber |
| POST | `/subscribers/{email}/tags?identified_by=email` | Add tags |
| DELETE | `/subscribers/{email}/tags/{tag}?identified_by=email` | Remove tag |
| GET | `/subscribers/{email}/tags?identified_by=email` | Get tags |
| GET | `/subscriber/{email}/fields?identified_by=email` | Get fields |
| GET | `/tags` | List all tags |

### v3 Editor API
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/editor/automail` | Create automail |
| GET | `/editor/automail/{id}` | Get automail |
| PUT | `/editor/automail/{id}` | Update automail |
| DELETE | `/editor/automail/{id}` | Delete automail |
| POST | `/editor/message` | Create message |
| GET | `/editor/message/{id}` | Get message |
| PUT | `/editor/message/{id}` | Update message |
| DELETE | `/editor/message/{id}` | Delete message |
| POST | `/editor/template` | Create template |
| GET | `/editor/template/{id}` | Get template |
| PUT | `/editor/template/{id}` | Update template |
| DELETE | `/editor/template/{id}` | Delete template |
| POST | `/editor/dynamic-set` | Create dynamic set |
| GET | `/editor/dynamic-set/{id}` | Get dynamic set |
| DELETE | `/editor/dynamic-set/{id}` | Delete dynamic set |

## Rate Limiting

- Returns `429` with `Retry-After` header
- SDK throws `RuleApiError` with `statusCode: 429`
- Check with `error.isRateLimited()`
