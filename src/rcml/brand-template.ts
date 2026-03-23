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
import type { RCMLDocument, RCMLProseMirrorDoc } from '../types';
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
  /** Logo URL */
  logoUrl: string;
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
  /** Heading font URL */
  headingFontUrl: string;
  /** Body font family */
  bodyFont: string;
  /** Body font URL */
  bodyFontUrl: string;
  /** Text color */
  textColor: string;
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

  const sanitizedLogoUrl = sanitizeUrl(brandStyle.logoUrl);
  if (!sanitizedLogoUrl) {
    throw new RuleConfigError('createBrandHead: invalid or unsafe logoUrl');
  }
  const sanitizedHeadingFontUrl = sanitizeUrl(brandStyle.headingFontUrl);
  if (!sanitizedHeadingFontUrl) {
    throw new RuleConfigError('createBrandHead: invalid or unsafe headingFontUrl');
  }
  const sanitizedBodyFontUrl = sanitizeUrl(brandStyle.bodyFontUrl);
  if (!sanitizedBodyFontUrl) {
    throw new RuleConfigError('createBrandHead: invalid or unsafe bodyFontUrl');
  }

  return {
    tagName: 'rc-head',
    id: generateId(),
    children: [
      // Brand style reference (required for editor)
      {
        tagName: 'rc-brand-style',
        id: generateId(),
        attributes: { id: brandStyle.brandStyleId },
      },
      // Full brand style attributes
      {
        tagName: 'rc-attributes',
        id: generateId(),
        children: [
          // Body default
          {
            tagName: 'rc-body',
            id: generateId(),
            attributes: { 'background-color': brandStyle.bodyBackgroundColor },
          },
          // Section default
          {
            tagName: 'rc-section',
            id: generateId(),
            attributes: { 'background-color': brandStyle.sectionBackgroundColor },
          },
          // Button default
          {
            tagName: 'rc-button',
            id: generateId(),
            attributes: { 'background-color': brandStyle.buttonColor },
          },
          // Logo style class
          {
            tagName: 'rc-class',
            id: generateId(),
            attributes: {
              name: 'rcml-logo-style',
              src: sanitizedLogoUrl,
            },
          },
          // Brand color class
          {
            tagName: 'rc-class',
            id: generateId(),
            attributes: {
              name: 'rcml-brand-color',
              'background-color': brandStyle.brandColor,
            },
          },
          // Paragraph style
          {
            tagName: 'rc-class',
            id: generateId(),
            attributes: {
              name: 'rcml-p-style',
              'font-family': brandStyle.bodyFont,
              'font-size': '16px',
              color: brandStyle.textColor,
              'line-height': '120%',
              'letter-spacing': '0em',
              'font-weight': '400',
              'font-style': 'normal',
              'text-decoration': 'none',
            },
          },
          // H1 style
          {
            tagName: 'rc-class',
            id: generateId(),
            attributes: {
              name: 'rcml-h1-style',
              'font-family': brandStyle.headingFont,
              'font-size': '36px',
              color: brandStyle.textColor,
              'line-height': '120%',
              'letter-spacing': '0em',
              'font-weight': '700',
              'font-style': 'normal',
              'text-decoration': 'none',
            },
          },
          // H2 style
          {
            tagName: 'rc-class',
            id: generateId(),
            attributes: {
              name: 'rcml-h2-style',
              'font-family': brandStyle.headingFont,
              'font-size': '28px',
              color: brandStyle.textColor,
              'line-height': '120%',
              'letter-spacing': '0em',
              'font-weight': '700',
              'font-style': 'normal',
              'text-decoration': 'none',
            },
          },
          // H3 style
          {
            tagName: 'rc-class',
            id: generateId(),
            attributes: {
              name: 'rcml-h3-style',
              'font-family': brandStyle.headingFont,
              'font-size': '24px',
              color: brandStyle.textColor,
              'line-height': '120%',
              'letter-spacing': '0em',
              'font-weight': '700',
              'font-style': 'normal',
              'text-decoration': 'none',
            },
          },
          // H4 style
          {
            tagName: 'rc-class',
            id: generateId(),
            attributes: {
              name: 'rcml-h4-style',
              'font-family': brandStyle.headingFont,
              'font-size': '18px',
              color: brandStyle.textColor,
              'line-height': '120%',
              'letter-spacing': '0em',
              'font-weight': '700',
              'font-style': 'normal',
              'text-decoration': 'none',
            },
          },
          // Label style (for buttons)
          {
            tagName: 'rc-class',
            id: generateId(),
            attributes: {
              name: 'rcml-label-style',
              'font-family': brandStyle.bodyFont,
              'font-size': '14px',
              color: brandStyle.brandColor,
              'line-height': '120%',
              'letter-spacing': '0em',
              'font-weight': '400',
              'font-style': 'normal',
              'text-decoration': 'none',
            },
          },
        ],
      },
      // Preview/preheader
      {
        tagName: 'rc-preview',
        id: generateId(),
        ...(options?.preheader ? { content: options.preheader } : {}),
      },
      // Plain text fallback
      {
        tagName: 'rc-plain-text',
        id: generateId(),
        content: {
          type: 'text' as const,
          text: plainTextContent,
        },
      },
      // Font definitions
      {
        tagName: 'rc-font',
        id: generateId(),
        attributes: {
          name: brandStyle.headingFont.split(',')[0].trim(),
          href: sanitizedHeadingFontUrl,
        },
      },
      {
        tagName: 'rc-font',
        id: generateId(),
        attributes: {
          name: brandStyle.bodyFont.split(',')[0].trim(),
          href: sanitizedBodyFontUrl,
        },
      },
    ],
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
 * @param logoUrl - Direct logo URL for the logo image.
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
          'padding-on-mobile': '0 20px',
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
              'padding-on-mobile': '20px 0',
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
): { tagName: 'rc-heading'; id: string; attributes: Record<string, string>; content: RCMLProseMirrorDoc } {
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
): { tagName: 'rc-text'; id: string; attributes: Record<string, string>; content: RCMLProseMirrorDoc } {
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
): { tagName: 'rc-button'; id: string; attributes: Record<string, string>; content: RCMLProseMirrorDoc } {
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
          'padding-on-mobile': '0 20px',
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
        ],
      },
    ],
  } as RCMLDocument['children'][1]['children'][0];
}
