# Managing Brand Styles

Brand styles define your visual identity in emails — logo, accent colors, fonts, and social links. The RCML template builders use brand styles to produce consistently branded emails without you having to specify design values in every template.

You can manage brand styles through the API or in the Rule.io UI under **Settings → Brand**.

## Finding the account's default brand style

Use `resolvePreferredBrandStyle()` from `@rulecom/sdk` — it returns the style flagged `is_default` on the account, falling back to the first in the list if none is marked default. Do not hardcode brand style IDs; a customer's preferred style can change:

```typescript
import { resolvePreferredBrandStyle } from '@rulecom/sdk';

const { id: brandStyleId, brandStyle, source } =
  await resolvePreferredBrandStyle(client);

if (source === 'fallback') {
  console.warn('No default brand style set — using first in list');
}
```

If you need to target a specific style (e.g. from an environment variable), pass it as the second argument:

```typescript
const { id } = await resolvePreferredBrandStyle(client, 12345);
```

## Listing brand styles

```typescript
const styles = await client.brandStyles.list();
```

## Getting a specific brand style

```typescript
const style = await client.brandStyles.get(brandStyleId);
```

Returns `null` if the ID doesn't exist.

## Auto-detecting brand from your domain

Rule.io can infer brand colors and logo from a live website. This is the quickest way to create a first brand style:

```typescript
const result = await client.brandStyles.createFromDomain({
  domain: 'example.com',
});
const brandStyleId = result.data!.id!;
```

*→ [`RuleBrandStyleCreateRequest`](/api/client/src/interfaces/RuleBrandStyleCreateRequest)*

## Creating a brand style manually

Specify each visual element explicitly:

```typescript
const result = await client.brandStyles.createManually({
  name: 'Acme Brand',
  colours: [
    { type: 'accent',     hex: '#0066CC', brightness: 50 },
    { type: 'background', hex: '#FFFFFF', brightness: 95 },
  ],
  fonts: [
    { type: 'title', name: 'Helvetica', origin: 'system' },
    { type: 'body',  name: 'Arial',     origin: 'system' },
  ],
  links: {
    website:  'https://example.com',
    facebook: 'https://facebook.com/example',
  },
  images: {
    logo: 'https://example.com/logo.png',
  },
});
```

*→ [`RuleBrandStyleManualRequest`](/api/client/src/type-aliases/RuleBrandStyleManualRequest)*

## Updating a brand style

`brandStyles.update()` is a PATCH — only the fields you provide are changed:

```typescript
await client.brandStyles.update(brandStyleId, {
  name: 'Acme Brand v2',
  colours: [
    { type: 'accent', hex: '#003399', brightness: 30 },
  ],
});
```

*→ [`RuleBrandStyleUpdateRequest`](/api/client/src/interfaces/RuleBrandStyleUpdateRequest)*

## Deleting a brand style

```typescript
await client.brandStyles.delete(brandStyleId);
```

> **Note**: Deletion fails if the brand style is the only one on the account. Create a replacement first, then delete the old one.

## Next steps

- Pass `brandStyleId` to the RCML template builders: [@rulecom/rcml documentation](/packages/rcml/)
- Build a complete campaign email: [Running Campaigns](./running-campaigns)
