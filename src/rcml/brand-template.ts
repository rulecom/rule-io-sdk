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
import type { RCMLButton, RCMLDocument, RCMLHeading, RCMLProseMirrorDoc, RCMLLoop, RCMLSection, RCMLText } from '../types';
import { RuleConfigError } from '../errors';
import { sanitizeUrl } from './utils';

/**
 * Generate a unique UUID v4 for RCML node identification.
 */
function generateId(): string {
  return randomUUID();
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
    { type: 'text'; text: string } | { type: 'placeholder'; attrs: Record<string, unknown> }
  >
): RCMLProseMirrorDoc {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: content as RCMLProseMirrorDoc['content'][0]['content'],
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
    sectionBackgroundColor: '#ffffff',
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
): RCMLDocument['children'][0] {
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
  const attributeChildren: Array<Record<string, unknown>> = [
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
    { tagName: 'rc-class', id: generateId(), attributes: { name: 'rcml-label-style', 'font-family': brandStyle.bodyFont, 'font-size': '14px', color: '#FFFFFF', 'line-height': '120%', 'letter-spacing': '0em', 'font-weight': '400', 'font-style': 'normal', 'text-decoration': 'none' } },
  );

  // Build head children
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RCML head children have varied shapes
  const headChildren: Array<any> = [
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
  } as RCMLDocument['children'][0];
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
  sections: RCMLDocument['children'][1]['children'];
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
 * This function validates `logoUrl` for safety and creates the body `rc-logo`
 * node, but it does not set that URL as `src` on the element. The editor
 * resolves the displayed logo via `rc-class: rcml-logo-style`, using the
 * brand style defined in the document head by {@link createBrandHead}. To
 * affect the rendered logo, the same URL must also be configured in
 * `BrandStyleConfig.logoUrl`.
 *
 * @param logoUrl - Logo URL to validate before creating the logo body node
 */
export function createBrandLogo(logoUrl: string): RCMLDocument['children'][1]['children'][0] {
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
              width: '96px',
              padding: '20px 0',
            },
          },
        ],
      },
    ],
  } as RCMLDocument['children'][1]['children'][0];
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
  children: Array<
    | ReturnType<typeof createBrandHeading>
    | ReturnType<typeof createBrandText>
    | ReturnType<typeof createBrandButton>
  >,
  options?: { padding?: string; backgroundColor?: string }
): RCMLDocument['children'][1]['children'][0] {
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
        children:
          children as unknown as RCMLDocument['children'][1]['children'][0]['children'][0]['children'],
      },
    ],
  } as RCMLDocument['children'][1]['children'][0];
}

/**
 * Create the default editor content section with brand style class references.
 *
 * This produces the same "bare minimum" content the Rule.io editor generates
 * when creating a new email from a brand style: a placeholder image, heading,
 * body text, and button — all connected to the brand via `rc-class` attributes.
 *
 * @param options - Optional overrides for the default placeholder texts
 *
 * @example
 * ```typescript
 * const section = createDefaultContentSection();
 * ```
 */
export function createDefaultContentSection(options?: {
  headingText?: string;
  bodyText?: string;
  buttonText?: string;
}): RCMLDocument['children'][1]['children'][0] {
  const heading = options?.headingText ?? 'Replace this title';
  const body = options?.bodyText ?? 'Click into this box to change the font settings. Edit this text to include additional information and a description of the image.';
  const button = options?.buttonText ?? 'Click me!';

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
            },
            content: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: button }] }],
            },
          },
        ],
      },
    ],
  } as RCMLDocument['children'][1]['children'][0];
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
): RCMLDocument['children'][1]['children'][0] {
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
  } as RCMLDocument['children'][1]['children'][0];
}
