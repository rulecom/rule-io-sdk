/**
 * Brand-Based Template Builder
 *
 * Creates RCML templates that use Rule.io brand styles.
 * This approach uses the brand style attributes from your Rule.io account
 * and proper placeholder nodes for merge fields.
 *
 * ## Key Concepts
 *
 * 1. **Brand Style**: The `rc-brand-style` element MUST be in the document head
 *    with an `id` attribute referencing the brand style ID from Rule.io.
 *
 * 2. **Placeholder Nodes**: For merge fields, use placeholder nodes,
 *    NOT `{{...}}` syntax. The placeholder structure is:
 *    ```json
 *    {
 *      "type": "placeholder",
 *      "attrs": {
 *        "type": "CustomField",
 *        "original": "[CustomField:169233]",
 *        "name": "Order.CustomerName",
 *        "value": 169233
 *      }
 *    }
 *    ```
 *
 * 3. **Custom Field IDs**: Must be obtained from `/api/v2/customizations` endpoint.
 *    Each Rule.io account has different field IDs.
 */

import { randomUUID } from 'node:crypto';
import { RuleConfigError, sanitizeUrl } from '@rule-io/core';
import type { BrandStyleConfig, CustomFieldMap, FooterConfig } from '@rule-io/core';
import type { Json, RcmlAttributes, RcmlBodyChild, RcmlButton, RcmlColumn, RcmlColumnChild, RcmlDocument, RcmlHead, RcmlHeading, RcmlLoop, RcmlSection, RcmlText } from '@rule-io/rcml';
import { createTextNode } from '@rule-io/rcml';

// Re-export from core so existing `import { BrandStyleConfig } from '@rule-io/rcml'`
// consumers keep compiling after the types moved to core.
export type { BrandStyleConfig, CustomFieldMap, FooterConfig };

/**
 * Minimal structural types describing the Rule.io brand-style API response
 * shape consumed by {@link toBrandStyleConfig} and {@link resolvePreferredBrandStyle}.
 *
 * Defined locally (rather than importing from `@rule-io/client`) to keep
 * `@rule-io/rcml` free of any dependency on the HTTP client package. The
 * authoritative, richer `RuleBrandStyle*` type family lives in `@rule-io/client`
 * and is structurally assignable to these interfaces at call sites.
 */
export interface BrandStyleResource {
  id: number;
  name: string;
  colours?: Array<{ type: string; hex: string }> | null;
  fonts?: Array<{ type: string; name?: string | null; origin_name?: string | null; url?: string | null }> | null;
  images?: Array<{ type?: string | null; public_path?: string | null }> | null;
  links?: Array<{ type: string; link: string }> | null;
}
export interface BrandStyleListItem {
  id: number;
  name: string;
  is_default?: boolean;
}

/**
 * Generate a unique UUID v4 for RCML node identification.
 */
function generateId(): string {
  return randomUUID();
}

// ============================================================================
// Error Context Helper
// ============================================================================

/**
 * Re-throw a `RuleConfigError` with the template function name prepended.
 *
 * Builder functions like `createBrandButton` throw errors such as
 * `"createBrandButton: invalid or unsafe URL"`. When called from a
 * template function (e.g. `createOrderConfirmationEmail`), the outer
 * template name is lost. This helper catches `RuleConfigError` and
 * prepends the template name so callers see where the problem originated.
 *
 * @internal
 */
export function withTemplateContext<T>(templateName: string, fn: () => T): T {
  try {
    return fn();
  } catch (error: unknown) {
    if (error instanceof RuleConfigError) {
      const wrapped = new RuleConfigError(`${templateName} > ${error.message}`, { cause: error });

      if (error.stack) {
        const lines = error.stack.split('\n');

        lines[0] = `${wrapped.name}: ${wrapped.message}`;
        wrapped.stack = lines.join('\n');
      }

      throw wrapped;
    }

    throw error;
  }
}

// ============================================================================
// Custom Field Definitions
// ============================================================================

// `CustomFieldMap` now lives in `@rule-io/core` and is re-exported at the top of this file.

/**
 * Validate that all required field names have corresponding entries in the custom fields map.
 * Throws `RuleConfigError` if any required field is missing.
 *
 * `templateName` is optional. Omit it when calling from inside `withTemplateContext`
 * — the wrapper already prefixes the template name, so passing it here would
 * duplicate the prefix (e.g. "createFoo > createFoo: missing …"). Pass it when
 * validating outside a template-context wrapper so the error still identifies
 * the caller.
 */
export function validateCustomFields(
  customFields: CustomFieldMap,
  fieldNames: Record<string, string | undefined>,
  templateName?: string
): void {
  for (const [key, fieldName] of Object.entries(fieldNames)) {
    if (fieldName !== undefined && customFields[fieldName] === undefined) {
      const prefix = templateName ? `${templateName}: ` : '';

      throw new RuleConfigError(
        `${prefix}missing customFields entry for fieldNames.${key} ("${fieldName}")`
      );
    }
  }
}

// ============================================================================
// Placeholder Node Creation
// ============================================================================

/**
 * Create a ProseMirror placeholder node for a custom field.
 *
 * @param fieldName - The custom field name (e.g., 'Order.CustomerName')
 * @param fieldId - The numeric field ID from Rule.io
 *
 * @example
 * ```typescript
 * createPlaceholder('Order.CustomerName', 169233)
 * ```
 */
export function createPlaceholder(
  fieldName: string,
  fieldId: number
): { type: 'placeholder'; attrs: { type: string; original: string; name: string; value: number } } {
  return {
    type: 'placeholder',
    attrs: {
      type: 'CustomField',
      original: `[CustomField:${fieldId}]`,
      name: fieldName,
      value: fieldId,
    },
  };
}

/**
 * Create a ProseMirror placeholder node for a loop sub-field (JSON key).
 *
 * Used inside `rc-loop` blocks to reference properties of the current
 * iteration item. Unlike `createPlaceholder`, this uses a JSON key name
 * (string) instead of a numeric field ID.
 *
 * @param jsonKey - The JSON property key (e.g., 'title', 'price', 'quantity')
 *
 * @example
 * ```typescript
 * // Inside an rc-loop over Order.Products:
 * createLoopFieldPlaceholder('title')   // → product title
 * createLoopFieldPlaceholder('price')   // → product price
 * ```
 */
export function createLoopFieldPlaceholder(
  jsonKey: string
): { type: 'placeholder'; attrs: { type: string; original: string; name: string; value: string } } {
  return {
    type: 'placeholder',
    attrs: {
      type: 'LoopValue',
      original: `[LoopValue:${jsonKey}]`,
      name: jsonKey,
      value: jsonKey,
    },
  };
}

// `createTextNode` lives in `@rule-io/rcml` (from `email/create-rcml-element.ts`).
// Re-export it here so consumers who previously imported from `@rule-io/rcml` and
// now migrate to `@rule-io/client` for brand-template symbols still have it to hand.
export { createTextNode } from '@rule-io/rcml';

/**
 * Create a ProseMirror document with mixed text and placeholder nodes.
 *
 * @example
 * ```typescript
 * const doc = createDocWithPlaceholders([
 *   createTextNode('Hello '),
 *   createPlaceholder('Order.CustomerName', 169233),
 *   createTextNode('!'),
 * ]);
 * ```
 */
export function createDocWithPlaceholders(
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'placeholder'; attrs: { type: string; name: string; value: string | number; original: string } }
  >
): Json {
  // The legacy placeholder shape lacks `max-length`, which the canonical
  // `PlaceholderNode` in `email/` marks as required. Cast through `unknown`
  // to preserve the legacy runtime shape while letting the return type stay
  // `Json` for downstream consumers — validateEmailTemplate tolerates the
  // gap today; a future pass can canonicalise the shape.
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content,
      },
    ],
  } as unknown as Json;
}

// ============================================================================
// Brand Style Configuration
// ============================================================================

// `BrandStyleConfig` now lives in `@rule-io/core` and is re-exported at the top of this file.

/**
 * Convert a Rule.io brand style API response to a `BrandStyleConfig` for template building.
 *
 * This maps the API's colour/font/image arrays to the flat config object that
 * `createBrandHead()` and `createBrandTemplate()` expect.
 *
 * @param data - Brand style object from `GET /api/v3/brand-styles/{id}`
 * @returns A `BrandStyleConfig` ready for use with template builders
 *
 * @example
 * ```typescript
 * const brandStyle = await client.getBrandStyle(976);
 * const config = toBrandStyleConfig(brandStyle);
 * const doc = createBrandTemplate({ brandStyle: config, sections: [...] });
 * ```
 */
export function toBrandStyleConfig(data: BrandStyleResource): BrandStyleConfig {
  const colours = data.colours ?? [];
  const fonts = data.fonts ?? [];
  const images = data.images ?? [];

  const findColour = (type: string): string | undefined =>
    colours.find((c) => c.type === type)?.hex;
  const findFont = (type: string) =>
    fonts.find((f) => f.type === type);
  const findImage = (type: string) =>
    images.find((i) => i.type === type);

  const titleFont = findFont('title');
  const bodyFont = findFont('body');
  const logoImage = findImage('logo') ?? images[0];

  const links = data.links ?? [];

  return {
    brandStyleId: String(data.id),
    logoUrl: logoImage?.public_path ?? undefined,
    buttonColor: findColour('accent') ?? '#333333',
    bodyBackgroundColor: findColour('side') ?? findColour('light') ?? '#F5F5F5',
    sectionBackgroundColor: findColour('light') ?? '#ffffff',
    brandColor: findColour('brand') ?? '#333333',
    headingFont: titleFont ? `'${titleFont.origin_name ?? titleFont.name}', sans-serif` : "'Helvetica', sans-serif",
    headingFontUrl: titleFont?.url ?? undefined,
    bodyFont: bodyFont ? `'${bodyFont.origin_name ?? bodyFont.name}', sans-serif` : "'Helvetica', sans-serif",
    bodyFontUrl: bodyFont?.url ?? undefined,
    textColor: findColour('dark') ?? '#0F0F1F',
    socialLinks: links.length > 0
      ? links.map((l) => ({ name: l.type === 'website' ? 'web' : l.type, href: l.link }))
      : undefined,
  };
}

/**
 * Minimal client shape required by {@link resolvePreferredBrandStyle}.
 *
 * Kept structural so the helper accepts either a full `RuleClient` or a test
 * double without dragging in a circular import from `client.ts`.
 */
export interface BrandStyleResolverClient {
  listBrandStyles(): Promise<{ data?: BrandStyleListItem[] | null }>;
  getBrandStyle(
    brandStyleId: number,
  ): Promise<{ data?: BrandStyleResource } | null>;
}

/**
 * Result of {@link resolvePreferredBrandStyle}.
 */
export interface ResolvedBrandStyle {
  /** The brand style ID that was resolved. */
  id: number;
  /** The brand style name, if provided by the API. */
  name?: string;
  /** The converted config, ready to pass to `createBrandTemplate` and friends. */
  brandStyle: BrandStyleConfig;
  /**
   * How the brand style was picked:
   * - `'override'`: `overrideId` was supplied by the caller.
   * - `'default'`: picked via `is_default: true` on the account's brand styles.
   * - `'fallback'`: no `is_default` flag on any style — first in the list was used.
   *
   * Callers that want to warn on fallback can check for `'fallback'`.
   */
  source: 'override' | 'default' | 'fallback';
}

/**
 * Resolve the account's preferred brand style and convert it to a
 * ready-to-use `BrandStyleConfig`.
 *
 * Discovery rules:
 * 1. If `overrideId` is provided, fetch that brand style directly.
 * 2. Otherwise, list all brand styles and pick the one with `is_default: true`.
 * 3. If no style is flagged as default, fall back to the first in the list
 *    (the `source` field is set to `'fallback'` so callers can warn).
 *
 * Use this in deploy/provisioning scripts so each account's preferred brand
 * style is respected — never hardcode brand style IDs, since a customer's
 * preferred style can change and list order is not guaranteed.
 *
 * @param client - `RuleClient` (or any object with `listBrandStyles` + `getBrandStyle`)
 * @param overrideId - Optional brand style ID to fetch directly, skipping discovery
 * @throws `RuleConfigError` if no brand styles exist, or the given ID is not found
 *
 * @example
 * ```typescript
 * const client = new RuleClient(apiKey);
 * const { id, brandStyle, source } = await resolvePreferredBrandStyle(client);
 * if (source === 'fallback') console.warn('No is_default style — using first');
 * ```
 */
export async function resolvePreferredBrandStyle(
  client: BrandStyleResolverClient,
  overrideId?: number,
): Promise<ResolvedBrandStyle> {
  if (overrideId !== undefined) {
    // TypeScript's `number` type doesn't exclude NaN, Infinity, negatives, or
    // non-integers — reject them up front so callers see a clear error instead
    // of a confusing `/brand-styles/NaN` 404.
    if (!Number.isInteger(overrideId) || overrideId <= 0) {
      throw new RuleConfigError(
        `Invalid brand style id ${String(overrideId)}: expected a positive integer.`,
      );
    }

    const resp = await client.getBrandStyle(overrideId);

    if (!resp?.data) {
      throw new RuleConfigError(`Brand style ${overrideId} not found`);
    }

    return {
      id: overrideId,
      name: resp.data.name,
      brandStyle: toBrandStyleConfig(resp.data),
      source: 'override',
    };
  }

  const listResp = await client.listBrandStyles();
  const styles = listResp.data ?? [];

  if (styles.length === 0) {
    throw new RuleConfigError('No brand styles available in the account');
  }

  const preferredIdx = styles.findIndex((s) => s.is_default);
  const preferred = preferredIdx === -1 ? styles[0] : styles[preferredIdx];
  const source: 'default' | 'fallback' =
    preferredIdx === -1 ? 'fallback' : 'default';

  const resp = await client.getBrandStyle(preferred.id);

  if (!resp?.data) {
    throw new RuleConfigError(`Brand style ${preferred.id} not found`);
  }

  // Prefer the fetched detail's name over `preferred.name` from the list item
  // — they usually match, but the fetch reflects the authoritative, fresh value
  // if the list was stale or the name changed between calls.
  return {
    id: preferred.id,
    name: resp.data.name,
    brandStyle: toBrandStyleConfig(resp.data),
    source,
  };
}

/**
 * Create the rc-head element with full brand style attributes.
 */
export function createBrandHead(
  brandStyle: BrandStyleConfig,
  options?: {
    /** Preview/preheader text shown in email clients */
    preheader?: string;
    /** Plain text fallback content */
    plainText?: string;
  }
): RcmlHead {
  const plainTextContent = options?.plainText
    ?? 'View this email in your browser: %Link:WebBrowser%\n\n---\nUnsubscribe: %Link:Unsubscribe%';

  // Validate logo URL if provided
  let sanitizedLogoUrl: string | undefined;

  if (brandStyle.logoUrl) {
    sanitizedLogoUrl = sanitizeUrl(brandStyle.logoUrl);

    if (!sanitizedLogoUrl) {
      throw new RuleConfigError('createBrandHead: invalid or unsafe logoUrl');
    }
  }

  // Validate font URLs if provided
  let sanitizedHeadingFontUrl: string | undefined;

  if (brandStyle.headingFontUrl) {
    sanitizedHeadingFontUrl = sanitizeUrl(brandStyle.headingFontUrl);

    if (!sanitizedHeadingFontUrl) {
      throw new RuleConfigError('createBrandHead: invalid or unsafe headingFontUrl');
    }
  }

  let sanitizedBodyFontUrl: string | undefined;

  if (brandStyle.bodyFontUrl) {
    sanitizedBodyFontUrl = sanitizeUrl(brandStyle.bodyFontUrl);

    if (!sanitizedBodyFontUrl) {
      throw new RuleConfigError('createBrandHead: invalid or unsafe bodyFontUrl');
    }
  }

  // Build rc-attributes children. The legacy brand head puts rc-class and
  // rc-social nodes under rc-attributes (and rc-font directly under rc-head
  // below); the canonical RcmlAttributesChild / RcmlHeadChild unions don't
  // allow that. The Rule.io renderer tolerates it, so we preserve the legacy
  // shape and cast at the array boundary.
  const attributeChildren = [
    { tagName: 'rc-body', id: generateId(), attributes: { 'background-color': brandStyle.bodyBackgroundColor } },
    { tagName: 'rc-section', id: generateId(), attributes: { 'background-color': brandStyle.sectionBackgroundColor } },
    { tagName: 'rc-button', id: generateId(), attributes: { 'background-color': brandStyle.buttonColor } },
  ] as unknown as RcmlAttributes['children'];

  if (sanitizedLogoUrl) {
    attributeChildren.push({
      tagName: 'rc-class', id: generateId(),
      attributes: { name: 'rcml-logo-style', src: sanitizedLogoUrl },
    } as unknown as RcmlAttributes['children'][number]);
  }

  if (brandStyle.socialLinks && brandStyle.socialLinks.length > 0) {
    const sanitizedLinks = brandStyle.socialLinks
      .map((link) => ({ name: link.name, href: sanitizeUrl(link.href) }))
      .filter((link): link is { name: string; href: string } => !!link.href);

    if (sanitizedLinks.length > 0) {
      attributeChildren.push({
        tagName: 'rc-social', id: generateId(),
        children: sanitizedLinks.map((link) => ({
          tagName: 'rc-social-element', id: generateId(),
          attributes: { name: link.name, href: link.href },
        })),
      } as unknown as RcmlAttributes['children'][number]);
    }
  }

  attributeChildren.push(
    ...([
      { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-brand-color', 'background-color': brandStyle.brandColor } },
      { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-p-style', 'font-family': brandStyle.bodyFont, 'font-size': '16px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '400', 'font-style': 'normal', 'text-decoration': 'none' } },
      { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-h1-style', 'font-family': brandStyle.headingFont, 'font-size': '36px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '700', 'font-style': 'normal', 'text-decoration': 'none' } },
      { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-h2-style', 'font-family': brandStyle.headingFont, 'font-size': '28px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '700', 'font-style': 'normal', 'text-decoration': 'none' } },
      { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-h3-style', 'font-family': brandStyle.headingFont, 'font-size': '24px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '700', 'font-style': 'normal', 'text-decoration': 'none' } },
      { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-h4-style', 'font-family': brandStyle.headingFont, 'font-size': '18px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '700', 'font-style': 'normal', 'text-decoration': 'none' } },
      { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-label-style', 'font-family': brandStyle.bodyFont, 'font-size': '14px', color: brandStyle.buttonTextColor ?? '#FFFFFF', 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '400', 'font-style': 'normal', 'text-decoration': 'none' } },
    ] as unknown as RcmlAttributes['children']),
  );

  // Build head children
  const headChildren = [
    { tagName: 'rc-brand-style', id: generateId(), attributes: { id: brandStyle.brandStyleId } },
    { tagName: 'rc-attributes', id: generateId(), children: attributeChildren },
    { tagName: 'rc-preview', id: generateId(), ...(options?.preheader ? { content: options.preheader } : {}) },
    { tagName: 'rc-plain-text', id: generateId(), content: { type: 'text' as const, text: plainTextContent } },
  ] as unknown as RcmlHead['children'];

  // Add font definitions only when URLs are available (system fonts don't need them)
  if (sanitizedHeadingFontUrl) {
    headChildren.push({
      tagName: 'rc-font', id: generateId(),
      attributes: { name: brandStyle.headingFont.split(',')[0].trim(), href: sanitizedHeadingFontUrl },
    } as unknown as RcmlHead['children'][number]);
  }

  if (sanitizedBodyFontUrl) {
    headChildren.push({
      tagName: 'rc-font', id: generateId(),
      attributes: { name: brandStyle.bodyFont.split(',')[0].trim(), href: sanitizedBodyFontUrl },
    } as unknown as RcmlHead['children'][number]);
  }

  return {
    tagName: 'rc-head',
    id: generateId(),
    children: headChildren,
  } as RcmlHead;
}

// ============================================================================
// Simple Template Builder
// ============================================================================

export interface SimpleTemplateConfig {
  /** Brand style to use (required) */
  brandStyle: BrandStyleConfig;
  /** Preview text shown in email clients */
  preheader?: string;
  /** Plain text fallback content */
  plainText?: string;
  /** Email body sections */
  sections: RcmlBodyChild[];
}

/**
 * Create an RCML document using brand styles.
 *
 * @example
 * ```typescript
 * const doc = createBrandTemplate({
 *   brandStyle: myBrandStyle,
 *   preheader: 'Your order has been confirmed!',
 *   sections: [
 *     createContentSection([
 *       createBrandHeading(createDocWithPlaceholders([
 *         createTextNode('Thank you, '),
 *         createPlaceholder('Order.CustomerName', 169233),
 *         createTextNode('!'),
 *       ])),
 *     ]),
 *   ],
 * });
 * ```
 */
export function createBrandTemplate(config: SimpleTemplateConfig): RcmlDocument {
  return {
    tagName: 'rcml',
    id: generateId(),
    children: [
      createBrandHead(config.brandStyle, {
        preheader: config.preheader,
        plainText: config.plainText,
      }),
      {
        tagName: 'rc-body',
        id: generateId(),
        children: config.sections,
      },
    ],
  };
}

// ============================================================================
// Brand-Style Element Helpers
// ============================================================================

/**
 * Create a logo element using brand style.
 *
 * The `logoUrl` is sanitized for safety and set as `src` on the `rc-logo`
 * element. The element also carries `rc-class: rcml-logo-style` so that the
 * Rule.io editor can resolve additional styling from the brand head defined
 * by {@link createBrandHead}.
 *
 * @param logoUrl - Logo image URL (must be a safe http/https URL)
 */
export function createBrandLogo(logoUrl: string): RcmlBodyChild {
  const sanitizedSrc = sanitizeUrl(logoUrl);

  if (!sanitizedSrc) {
    throw new RuleConfigError('createBrandLogo: invalid or unsafe logoUrl');
  }

  return {
    tagName: 'rc-section',
    id: generateId(),
    children: [
      {
        tagName: 'rc-column',
        id: generateId(),
        attributes: {
          padding: '0 20px',
        },
        children: [
          {
            tagName: 'rc-logo',
            id: generateId(),
            attributes: {
              'rc-class': 'rcml-logo-style rc-initial-logo',
              src: sanitizedSrc,
              width: '96px',
              padding: '20px 0',
            },
          },
        ],
      },
    ],
  } as RcmlBodyChild;
}

/**
 * Create a heading using brand style.
 */
export function createBrandHeading(
  content: Json,
  level: 1 | 2 | 3 | 4 = 1
): RcmlHeading {
  return {
    tagName: 'rc-heading',
    id: generateId(),
    attributes: {
      'rc-class': `rcml-h${level}-style`,
    },
    content,
  };
}

/**
 * Create a text element using brand style.
 */
export function createBrandText(
  content: Json,
  options?: { align?: 'left' | 'center' | 'right'; padding?: string }
): RcmlText {
  return {
    tagName: 'rc-text',
    id: generateId(),
    attributes: {
      'rc-class': 'rcml-p-style',
      ...(options?.align && { align: options.align }),
      ...(options?.padding && { padding: options.padding }),
    },
    content,
  };
}

/**
 * Create a button using brand style.
 */
export function createBrandButton(
  content: Json,
  href: string
): RcmlButton {
  const sanitizedHref = sanitizeUrl(href);

  if (!sanitizedHref) {
    throw new RuleConfigError('createBrandButton: invalid or unsafe URL');
  }

  return {
    tagName: 'rc-button',
    id: generateId(),
    attributes: {
      href: sanitizedHref,
      align: 'center',
      border: 'none',
      'border-radius': '8px',
      'inner-padding': '10px 16px',
      padding: '0 0 20px 0',
      'text-align': 'center',
      'vertical-align': 'middle',
      'rc-class': 'rcml-label-style',
    },
    content,
  };
}

/**
 * Create a content section with a single column.
 */
export function createContentSection(
  children: RcmlColumnChild[],
  options?: { padding?: string; backgroundColor?: string }
): RcmlBodyChild {
  return {
    tagName: 'rc-section',
    id: generateId(),
    attributes: {
      ...(options?.padding && { padding: options.padding }),
      ...(options?.backgroundColor && { 'background-color': options.backgroundColor }),
    },
    children: [
      {
        tagName: 'rc-column',
        id: generateId(),
        attributes: { padding: '0 20px' },
        children,
      },
    ],
  } as RcmlBodyChild;
}

/**
 * Create the default editor content section with brand style class references.
 *
 * This produces the same "bare minimum" content the Rule.io editor generates
 * when creating a new email from a brand style: a placeholder image, heading,
 * body text, and button — all connected to the brand via `rc-class` attributes.
 *
 * @param options - Optional overrides for the default placeholder texts and button URL
 * @param options.headingText - Heading text (default: 'Replace this title')
 * @param options.bodyText - Body paragraph text
 * @param options.buttonText - Button label (default: 'Click me!')
 * @param options.buttonUrl - Button href. Invalid/unsafe URLs are silently ignored
 *   (button renders without an href).
 *
 * @example
 * ```typescript
 * const section = createDefaultContentSection({
 *   buttonUrl: 'https://example.com',
 * });
 * ```
 */
export function createDefaultContentSection(options?: {
  headingText?: string;
  bodyText?: string;
  buttonText?: string;
  buttonUrl?: string;
}): RcmlBodyChild {
  const heading = options?.headingText ?? 'Replace this title';
  const body = options?.bodyText ?? 'Click into this box to change the font settings. Edit this text to include additional information and a description of the image.';
  const button = options?.buttonText ?? 'Click me!';
  const buttonHref = options?.buttonUrl ? sanitizeUrl(options.buttonUrl) || undefined : undefined;

  return {
    tagName: 'rc-section',
    id: generateId(),
    attributes: {
      padding: '20px 0',
    },
    children: [
      {
        tagName: 'rc-column',
        id: generateId(),
        attributes: { padding: '0 20px' },
        children: [
          {
            tagName: 'rc-image',
            id: generateId(),
            attributes: {
              padding: '0 0 20px 0',
              src: 'https://app.rule.io/img/editor/image.png',
            },
          },
          {
            tagName: 'rc-heading',
            id: generateId(),
            attributes: { 'rc-class': 'rcml-h1-style' },
            content: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: heading }] }],
            },
          },
          {
            tagName: 'rc-text',
            id: generateId(),
            attributes: { 'rc-class': 'rcml-p-style' },
            content: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
            },
          },
          {
            tagName: 'rc-button',
            id: generateId(),
            attributes: {
              align: 'center',
              border: 'none',
              'border-radius': '8px',
              'inner-padding': '10px 16px',
              padding: '0 0 20px 0',
              'padding-bottom': '20px',
              'text-align': 'center',
              'vertical-align': 'middle',
              'rc-class': 'rcml-label-style',
              ...(buttonHref && { href: buttonHref }),
            },
            content: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: button }] }],
            },
          },
        ],
      },
    ],
  } as RcmlBodyChild;
}

/**
 * Create a brand-aware loop element that iterates over a repeatable custom field.
 *
 * Constructs an RCML loop with UUID generation for the RCML node ID,
 * consistent with other brand-template builders.
 *
 * @param fieldId - The numeric Rule.io custom field ID for the repeatable field
 * @param children - Sections to render for each iteration
 * @param options - Optional loop configuration (max iterations, range)
 *
 * @example
 * ```typescript
 * createBrandLoop(200005, [
 *   createContentSection([
 *     createBrandText(createDocWithPlaceholders([
 *       createPlaceholder('Order.Items.Name', 200010),
 *     ])),
 *   ]),
 * ], { maxIterations: 20 })
 * ```
 */
export function createBrandLoop(
  fieldId: number,
  children: RcmlSection[],
  options?: { maxIterations?: number; rangeStart?: number; rangeEnd?: number }
): RcmlLoop {
  return {
    tagName: 'rc-loop',
    id: generateId(),
    attributes: {
      'loop-type': 'custom-field',
      'loop-value': String(fieldId),
      ...(options?.maxIterations !== undefined && { 'loop-max-iterations': options.maxIterations }),
      ...(options?.rangeStart !== undefined && { 'loop-range-start': options.rangeStart }),
      ...(options?.rangeEnd !== undefined && { 'loop-range-end': options.rangeEnd }),
    },
    children,
  };
}

// `FooterConfig` now lives in `@rule-io/core` and is re-exported at the top of this file.

/**
 * Create a footer section with unsubscribe and web browser links.
 *
 * @param config - Optional footer configuration. All text is configurable
 *   for localization.
 *
 * @example
 * ```typescript
 * // English (default)
 * createFooterSection()
 *
 * // Swedish
 * createFooterSection({
 *   viewInBrowserText: 'Öppna i webbläsare',
 *   unsubscribeText: 'Avregistrera',
 * })
 * ```
 */
export function createFooterSection(
  config?: FooterConfig
): RcmlBodyChild {
  const viewText = config?.viewInBrowserText ?? 'View in browser';
  const unsubText = config?.unsubscribeText ?? 'Unsubscribe';
  const bgColor = config?.backgroundColor ?? '#f3f3f3';
  const textColor = config?.textColor ?? '#666666';
  const fontSize = config?.fontSize ?? '10px';

  return {
    tagName: 'rc-section',
    id: generateId(),
    attributes: {
      padding: '20px 0px 20px 0px',
      'background-color': bgColor,
    },
    children: [
      {
        tagName: 'rc-column',
        id: generateId(),
        attributes: {
          padding: '0 20px',
        },
        children: [
          {
            tagName: 'rc-text',
            id: generateId(),
            attributes: {
              align: 'center',
              padding: '0px 0px 10px 0px',
              'rc-class': 'rcml-p-style',
            },
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: viewText,
                      marks: [
                        {
                          type: 'font',
                          attrs: {
                            'font-size': fontSize,
                            'text-decoration': 'underline',
                            color: textColor,
                          },
                        },
                        {
                          type: 'link',
                          attrs: {
                            href: '[Link:WebBrowser]',
                            target: '_blank',
                            'no-tracked': 'true',
                          },
                        },
                      ],
                    },
                    { type: 'text', text: ' ' },
                    {
                      type: 'text',
                      text: '|',
                      marks: [{ type: 'font', attrs: { 'font-size': fontSize, color: textColor } }],
                    },
                    { type: 'text', text: ' ' },
                    {
                      type: 'text',
                      text: unsubText,
                      marks: [
                        {
                          type: 'font',
                          attrs: {
                            'font-size': fontSize,
                            'text-decoration': 'underline',
                            color: textColor,
                          },
                        },
                        {
                          type: 'link',
                          attrs: {
                            href: '[Link:Unsubscribe]',
                            target: '_blank',
                            'no-tracked': 'true',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          {
            tagName: 'rc-text',
            id: generateId(),
            attributes: {
              align: 'center',
              padding: '10px 0px 0px 0px',
              'font-family': "'Helvetica', sans-serif",
              'font-style': 'normal',
              'line-height': '120%',
              'letter-spacing': '0em',
              color: textColor,
              'font-weight': '400',
              'text-decoration': 'none',
              'font-size': fontSize,
            },
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Certified by Rule' }],
                },
              ],
            },
          },
        ],
      },
    ],
  } as RcmlBodyChild;
}

// ============================================================================
// Internal Template Section Helpers
// ============================================================================

/**
 * Create the optional logo section spread element.
 *
 * Returns an array with zero or one elements, designed to be spread
 * into a sections array: `...createLogoSection(config.brandStyle.logoUrl)`
 *
 * @internal Not exported from barrel — used by template builders only.
 */
export function createLogoSection(logoUrl?: string): RcmlBodyChild[] {
  return logoUrl ? [createBrandLogo(logoUrl)] : [];
}

/**
 * Create a greeting section with caller-provided greeting text, a first-name
 * placeholder, and centered intro text.
 *
 * This is the standard greeting pattern used by most template builders:
 * a heading with the provided greeting, a placeholder for the first-name
 * custom field, an exclamation mark, and a centered intro paragraph below.
 *
 * @internal Not exported from barrel — used by template builders only.
 */
export function createGreetingSection(
  greeting: string,
  intro: string,
  firstNameFieldName: string,
  firstNameFieldId: number
): RcmlBodyChild {
  return createContentSection(
    [
      createBrandHeading(
        createDocWithPlaceholders([
          createTextNode(`${greeting} `),
          createPlaceholder(firstNameFieldName, firstNameFieldId),
          createTextNode('!'),
        ])
      ),
      createBrandText(
        createDocWithPlaceholders([createTextNode(intro)]),
        { align: 'center' }
      ),
    ],
    { padding: '20px 0' }
  );
}

/**
 * Create a CTA button wrapped in a content section.
 *
 * @internal Not exported from barrel — used by template builders only.
 */
export function createCtaSection(buttonText: string, url: string): RcmlBodyChild {
  return createContentSection(
    [
      createBrandButton(
        createDocWithPlaceholders([createTextNode(buttonText)]),
        url
      ),
    ],
    { padding: '20px 0' }
  );
}

// ============================================================================
// Generic Reusable Section Helpers
// ============================================================================

/**
 * Wrap a list of optional brand-text rows in a content section.
 *
 * `undefined` entries are filtered out so callers can conditionally build rows
 * without needing to filter(Boolean) at the call site. Returns `undefined`
 * when no rows remain, so callers can push the result with `??`-chaining or
 * a simple truthy check.
 *
 * @example
 * ```typescript
 * const section = createSummaryRowsSection(
 *   [
 *     customFields['Order.Subtotal'] && createBrandText(...),
 *     createBrandText(...),
 *   ],
 *   { backgroundColor: brandStyle.brandColor, padding: '20px 0' }
 * );
 * if (section) sections.push(section);
 * ```
 */
export function createSummaryRowsSection(
  rows: Array<RcmlText | undefined | false | null>,
  options?: { backgroundColor?: string; padding?: string }
): RcmlBodyChild | undefined {
  const filtered = rows.filter((r): r is RcmlText => !!r);

  if (filtered.length === 0) return undefined;

  return createContentSection(filtered, {
    padding: options?.padding ?? '20px 0',
    ...(options?.backgroundColor && { backgroundColor: options.backgroundColor }),
  });
}

/**
 * A single step in a {@link createStatusTrackerSection} tracker.
 */
export interface StatusTrackerStep {
  /** Label shown inside the step column (e.g. "Confirmed", "Shipped") */
  label: string;
}

export interface CreateStatusTrackerSectionOptions {
  /** Ordered list of steps. Typically 2-4 entries. */
  steps: StatusTrackerStep[];
  /**
   * Zero-based index of the currently-active step. Steps at or below
   * `activeIndex` are highlighted with the brand button color; later steps
   * use the neutral brand color.
   */
  activeIndex: number;
  /** Brand style config — drives active/inactive colors. */
  brandStyle: BrandStyleConfig;
  /** Section padding (default: '10px 0'). */
  padding?: string;
}

/**
 * Create a horizontal multi-column status tracker.
 *
 * Each step renders as an equal-width column with centered label text. Steps
 * up to and including `activeIndex` are filled with the brand's button color
 * (typically the accent); subsequent steps use the neutral brand color.
 *
 * @example
 * ```typescript
 * createStatusTrackerSection({
 *   steps: [{ label: 'Confirmed' }, { label: 'Shipped' }, { label: 'Delivered' }],
 *   activeIndex: 1,
 *   brandStyle,
 * });
 * ```
 */
export function createStatusTrackerSection(
  options: CreateStatusTrackerSectionOptions
): RcmlBodyChild {
  const { steps, activeIndex, brandStyle } = options;

  if (steps.length === 0) {
    throw new RuleConfigError('createStatusTrackerSection: steps must not be empty');
  }

  if (steps.length > 4) {
    throw new RuleConfigError(
      'createStatusTrackerSection: steps must contain at most 4 items (RcmlSection supports up to 4 columns)'
    );
  }

  if (activeIndex < 0 || activeIndex >= steps.length) {
    throw new RuleConfigError(
      `createStatusTrackerSection: activeIndex ${activeIndex} is out of range [0, ${steps.length - 1}]`
    );
  }

  // Distribute width so columns sum to 100%. Math.floor alone would yield
  // 99% for 3 steps; we give the rounding remainder to the first column.
  const baseWidth = Math.floor(100 / steps.length);
  const remainder = 100 - baseWidth * steps.length;
  const inactiveBg = brandStyle.brandColor;
  const activeBg = brandStyle.buttonColor;
  const activeFg = brandStyle.buttonTextColor ?? '#FFFFFF';
  const inactiveFg = brandStyle.textColor;

  // Legacy font marks only set color + font-weight; canonical FontMark
  // declares all 8 style fields (nullable). Rule.io accepts the partial
  // shape, so cast at the array boundary.
  const columns = steps.map((step, idx) => {
    const widthPercent = `${baseWidth + (idx === 0 ? remainder : 0)}%`;
    const isActive = idx <= activeIndex;
    const bg = isActive ? activeBg : inactiveBg;
    const fg = isActive ? activeFg : inactiveFg;

    return {
      tagName: 'rc-column',
      id: generateId(),
      attributes: {
        width: widthPercent,
        'background-color': bg,
        padding: '14px 8px',
        'vertical-align': 'middle',
      },
      children: [
        {
          tagName: 'rc-text',
          id: generateId(),
          attributes: {
            align: 'center',
            'rc-class': 'rcml-p-style',
          },
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: step.label,
                    marks: [
                      {
                        type: 'font',
                        attrs: { color: fg, 'font-weight': '700' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  });

  return {
    tagName: 'rc-section',
    id: generateId(),
    attributes: {
      padding: options.padding ?? '10px 0',
    },
    children: columns as unknown as RcmlColumn[],
  };
}

export interface CreateAddressBlockOptions {
  /** Pre-built ProseMirror docs — one per visible line. */
  lines: Json[];
  /** Optional heading rendered above the lines (level 4). */
  heading?: string;
  /** Section padding (default: '10px 0'). */
  padding?: string;
  /** Section background color override. */
  backgroundColor?: string;
}

/**
 * Create a stacked address / multi-line detail block.
 *
 * Callers assemble the visible lines as ProseMirror docs (mixing text and
 * placeholders) and pass them in — the helper wraps them in brand-styled
 * text rows plus an optional heading. Returns `undefined` when `lines` is
 * empty so consumers can skip the push without extra branching.
 *
 * @example
 * ```typescript
 * const shipping = createAddressBlock({
 *   heading: 'Shipping to',
 *   lines: [
 *     createDocWithPlaceholders([createPlaceholder('Order.ShippingAddress1', id1)]),
 *     createDocWithPlaceholders([
 *       createPlaceholder('Order.ShippingCity', id2),
 *       createTextNode(', '),
 *       createPlaceholder('Order.ShippingZip', id3),
 *     ]),
 *   ],
 * });
 * if (shipping) sections.push(shipping);
 * ```
 */
export function createAddressBlock(
  options: CreateAddressBlockOptions
): RcmlBodyChild | undefined {
  if (options.lines.length === 0) return undefined;

  const children: RcmlColumnChild[] = [];

  if (options.heading) {
    children.push(
      createBrandHeading(
        createDocWithPlaceholders([createTextNode(options.heading)]),
        4
      )
    );
  }

  for (const doc of options.lines) {
    children.push(createBrandText(doc));
  }

  return createContentSection(children, {
    padding: options.padding ?? '10px 0',
    ...(options.backgroundColor && { backgroundColor: options.backgroundColor }),
  });
}
