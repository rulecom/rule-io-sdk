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
import type { RCMLAttributes, RCMLBodyChild, RCMLButton, RCMLColumn, RCMLColumnChild, RCMLDocument, RCMLHead, RCMLHeading, RCMLProseMirrorDoc, RCMLLoop, RCMLSection, RCMLText } from '../types';
import { RuleConfigError } from '../errors';
import { sanitizeUrl } from './utils';

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

/**
 * Maps custom field names to their Rule.io field IDs.
 *
 * Get your field IDs from: `GET https://app.rule.io/api/v2/customizations`
 *
 * @example
 * ```typescript
 * const myFields: CustomFieldMap = {
 *   'Order.CustomerName': 169233,
 *   'Order.OrderRef': 169234,
 *   'Order.TotalPrice': 169235,
 * };
 * ```
 */
export interface CustomFieldMap {
  [fieldName: string]: number;
}

/**
 * Validate that all required field names have corresponding entries in the custom fields map.
 * Throws `RuleConfigError` if any required field is missing.
 */
export function validateCustomFields(
  customFields: CustomFieldMap,
  fieldNames: Record<string, string | undefined>,
  templateName: string
): void {
  for (const [key, fieldName] of Object.entries(fieldNames)) {
    if (fieldName !== undefined && customFields[fieldName] === undefined) {
      throw new RuleConfigError(
        `${templateName}: missing customFields entry for fieldNames.${key} ("${fieldName}")`
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

/**
 * Create a text node for use in ProseMirror documents.
 */
export function createTextNode(text: string): { type: 'text'; text: string } {
  return { type: 'text', text };
}

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
): RCMLProseMirrorDoc {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content,
      },
    ],
  };
}

// ============================================================================
// Brand Style Configuration
// ============================================================================

/**
 * Brand style configuration for Rule.io templates.
 *
 * Get these values from your Rule.io account:
 * - Brand style ID: Settings → Brand
 * - Font URLs: Inspect the brand style in Rule.io's editor
 *
 * @example
 * ```typescript
 * const myBrandStyle: BrandStyleConfig = {
 *   brandStyleId: '12345',
 *   logoUrl: 'https://example.com/logo.png',
 *   buttonColor: '#0066CC',
 *   bodyBackgroundColor: '#f3f3f3',
 *   sectionBackgroundColor: '#ffffff',
 *   brandColor: '#f6f8f9',
 *   headingFont: "'Helvetica Neue', sans-serif",
 *   headingFontUrl: 'https://app.rule.io/brand-style/12345/font/1234/css',
 *   bodyFont: "'Arial', sans-serif",
 *   bodyFontUrl: 'https://app.rule.io/brand-style/12345/font/5678/css',
 *   textColor: '#1A1A1A',
 * };
 * ```
 */
export interface BrandStyleConfig {
  /** Brand style ID from Rule.io */
  brandStyleId: string;
  /** Logo URL (optional — some brand styles have no logo) */
  logoUrl?: string;
  /** Button background color */
  buttonColor: string;
  /** Body background color */
  bodyBackgroundColor: string;
  /** Section background color */
  sectionBackgroundColor: string;
  /** Brand color for sections */
  brandColor: string;
  /** Heading font family */
  headingFont: string;
  /** Heading font URL (optional — system fonts have no URL) */
  headingFontUrl?: string;
  /** Body font family */
  bodyFont: string;
  /** Body font URL (optional — system fonts have no URL) */
  bodyFontUrl?: string;
  /** Text color */
  textColor: string;
  /** Button text/label color (default: '#FFFFFF') */
  buttonTextColor?: string;
  /** Social media links from brand style */
  socialLinks?: Array<{ name: string; href: string }>;
}

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
export function toBrandStyleConfig(data: import('../types').RuleBrandStyle): BrandStyleConfig {
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
): RCMLHead {
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

  // Build rc-attributes children
  const attributeChildren: NonNullable<RCMLAttributes['children']> = [
    { tagName: 'rc-body', id: generateId(), attributes: { 'background-color': brandStyle.bodyBackgroundColor } },
    { tagName: 'rc-section', id: generateId(), attributes: { 'background-color': brandStyle.sectionBackgroundColor } },
    { tagName: 'rc-button', id: generateId(), attributes: { 'background-color': brandStyle.buttonColor } },
  ];

  if (sanitizedLogoUrl) {
    attributeChildren.push({
      tagName: 'rc-class', id: generateId(),
      attributes: { name: 'rcml-logo-style', src: sanitizedLogoUrl },
    });
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
      });
    }
  }

  attributeChildren.push(
    { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-brand-color', 'background-color': brandStyle.brandColor } },
    { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-p-style', 'font-family': brandStyle.bodyFont, 'font-size': '16px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '400', 'font-style': 'normal', 'text-decoration': 'none' } },
    { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-h1-style', 'font-family': brandStyle.headingFont, 'font-size': '36px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '700', 'font-style': 'normal', 'text-decoration': 'none' } },
    { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-h2-style', 'font-family': brandStyle.headingFont, 'font-size': '28px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '700', 'font-style': 'normal', 'text-decoration': 'none' } },
    { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-h3-style', 'font-family': brandStyle.headingFont, 'font-size': '24px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '700', 'font-style': 'normal', 'text-decoration': 'none' } },
    { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-h4-style', 'font-family': brandStyle.headingFont, 'font-size': '18px', color: brandStyle.textColor, 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '700', 'font-style': 'normal', 'text-decoration': 'none' } },
    { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-label-style', 'font-family': brandStyle.bodyFont, 'font-size': '14px', color: brandStyle.buttonTextColor ?? '#FFFFFF', 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '400', 'font-style': 'normal', 'text-decoration': 'none' } },
  );

  // Build head children
  const headChildren: NonNullable<RCMLHead['children']> = [
    { tagName: 'rc-brand-style', id: generateId(), attributes: { id: brandStyle.brandStyleId } },
    { tagName: 'rc-attributes', id: generateId(), children: attributeChildren },
    { tagName: 'rc-preview', id: generateId(), ...(options?.preheader ? { content: options.preheader } : {}) },
    { tagName: 'rc-plain-text', id: generateId(), content: { type: 'text' as const, text: plainTextContent } },
  ];

  // Add font definitions only when URLs are available (system fonts don't need them)
  if (sanitizedHeadingFontUrl) {
    headChildren.push({
      tagName: 'rc-font', id: generateId(),
      attributes: { name: brandStyle.headingFont.split(',')[0].trim(), href: sanitizedHeadingFontUrl },
    });
  }
  if (sanitizedBodyFontUrl) {
    headChildren.push({
      tagName: 'rc-font', id: generateId(),
      attributes: { name: brandStyle.bodyFont.split(',')[0].trim(), href: sanitizedBodyFontUrl },
    });
  }

  return {
    tagName: 'rc-head',
    id: generateId(),
    children: headChildren,
  } as RCMLHead;
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
  sections: RCMLBodyChild[];
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
export function createBrandTemplate(config: SimpleTemplateConfig): RCMLDocument {
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
export function createBrandLogo(logoUrl: string): RCMLBodyChild {
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
  } as RCMLBodyChild;
}

/**
 * Create a heading using brand style.
 */
export function createBrandHeading(
  content: RCMLProseMirrorDoc,
  level: 1 | 2 | 3 | 4 = 1
): RCMLHeading {
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
  content: RCMLProseMirrorDoc,
  options?: { align?: 'left' | 'center' | 'right'; padding?: string }
): RCMLText {
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
  content: RCMLProseMirrorDoc,
  href: string
): RCMLButton {
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
  children: RCMLColumnChild[],
  options?: { padding?: string; backgroundColor?: string }
): RCMLBodyChild {
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
  } as RCMLBodyChild;
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
}): RCMLBodyChild {
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
  } as RCMLBodyChild;
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
  children: RCMLSection[],
  options?: { maxIterations?: number; rangeStart?: number; rangeEnd?: number }
): RCMLLoop {
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

export interface FooterConfig {
  /** "View in browser" link text (default: 'View in browser') */
  viewInBrowserText?: string;
  /** Unsubscribe link text (default: 'Unsubscribe') */
  unsubscribeText?: string;
  /** Footer background color (default: '#f3f3f3') */
  backgroundColor?: string;
  /** Footer text color (default: '#666666') */
  textColor?: string;
  /** Footer text size (default: '10px') */
  fontSize?: string;
}

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
): RCMLBodyChild {
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
  } as RCMLBodyChild;
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
export function createLogoSection(logoUrl?: string): RCMLBodyChild[] {
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
): RCMLBodyChild {
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
export function createCtaSection(buttonText: string, url: string): RCMLBodyChild {
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
  rows: Array<RCMLText | undefined | false | null>,
  options?: { backgroundColor?: string; padding?: string }
): RCMLBodyChild | undefined {
  const filtered = rows.filter((r): r is RCMLText => !!r);
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
): RCMLBodyChild {
  const { steps, activeIndex, brandStyle } = options;
  if (steps.length === 0) {
    throw new RuleConfigError('createStatusTrackerSection: steps must not be empty');
  }
  if (steps.length > 4) {
    throw new RuleConfigError(
      'createStatusTrackerSection: steps must contain at most 4 items (RCMLSection supports up to 4 columns)'
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

  const columns: RCMLColumn[] = steps.map((step, idx) => {
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
    children: columns,
  };
}

export interface CreateAddressBlockOptions {
  /** Pre-built ProseMirror docs — one per visible line. */
  lines: RCMLProseMirrorDoc[];
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
): RCMLBodyChild | undefined {
  if (options.lines.length === 0) return undefined;

  const children: RCMLColumnChild[] = [];
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
