/**
 * Brand-Based Template Builder
 *
 * Creates RCML templates that properly use Rule.io brand styles.
 * This approach extracts the full brand style attributes from a base template
 * and uses proper placeholder nodes for merge fields.
 *
 * ## Key Learnings (API Quirks)
 *
 * 1. **Brand Style**: The `rc-brand-style` element MUST be in the document head
 *    with an `id` attribute referencing the brand style ID from Rule.io.
 *
 * 2. **Placeholder Nodes**: For merge fields, you MUST use placeholder nodes,
 *    NOT `{{...}}` syntax. The placeholder structure is:
 *    ```json
 *    {
 *      "type": "placeholder",
 *      "attrs": {
 *        "type": "CustomField",
 *        "original": "[CustomField:169233]",
 *        "name": "Booking.FirstName",
 *        "value": 169233  // The custom field ID
 *      }
 *    }
 *    ```
 *
 * 3. **Custom Field IDs**: Must be obtained from `/api/v2/customizations` endpoint.
 *    Each Rule.io account has different field IDs.
 *
 * @see .claude/RULE_IO_SETUP_GUIDE.md for complete setup instructions
 * @see .claude/RCML_REFERENCE.md for RCML element documentation
 */

import type { RCMLDocument, RCMLProseMirrorDoc } from '../types';

// ============================================================================
// Custom Field Definitions
// ============================================================================

/**
 * Custom field IDs from Rule.io.
 * These are specific to the Blacksta Vingård account.
 * Get these from: GET https://app.rule.io/api/v2/customizations
 */
export interface CustomFieldMap {
  [fieldName: string]: number;
}

/**
 * Default custom field IDs for Blacksta Vingård
 */
export const BLACKSTA_CUSTOM_FIELDS: CustomFieldMap = {
  'Booking.FirstName': 169233,
  'Booking.LastName': 169234,
  'Booking.ServiceType': 169235,
  'Booking.CheckInDate': 169236,
  'Booking.CheckOutDate': 169237,
  'Booking.BookingRef': 169238,
  'Booking.TotalGuests': 169239,
  'Booking.TotalPrice': 169240,
  'Booking.RoomName': 169241,
};

// ============================================================================
// Placeholder Node Creation
// ============================================================================

/**
 * Create a ProseMirror placeholder node for a custom field
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
 * Create a text node
 */
export function createTextNode(text: string): { type: 'text'; text: string } {
  return { type: 'text', text };
}

/**
 * Create a ProseMirror document with mixed text and placeholders
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
// Brand Style Base Template
// ============================================================================

/**
 * Brand style configuration
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
 * Default brand style for Blacksta Vingård (ID: 10261)
 */
export const BLACKSTA_BRAND_STYLE: BrandStyleConfig = {
  brandStyleId: '10261',
  logoUrl: 'https://img.rule.io/14518/698261295cbf5',
  buttonColor: '#C9A962',
  bodyBackgroundColor: '#f3f3f3',
  sectionBackgroundColor: '#ffffff',
  brandColor: '#f6f8f9',
  headingFont: "'Tenor Sans', sans-serif",
  headingFontUrl: 'https://app.rule.io/brand-style/10261/font/4744/css',
  bodyFont: "'Pontano Sans Regular', sans-serif",
  bodyFontUrl: 'https://app.rule.io/brand-style/10261/font/4578/css',
  textColor: '#1A1A1A',
};

/**
 * Create the rc-head element with full brand style attributes
 */
export function createBrandHead(
  brandStyle: BrandStyleConfig,
  preheader?: string
): RCMLDocument['children'][0] {
  return {
    tagName: 'rc-head',
    children: [
      // Brand style reference (required for editor)
      {
        tagName: 'rc-brand-style',
        attributes: { id: brandStyle.brandStyleId },
      },
      // Full brand style attributes
      {
        tagName: 'rc-attributes',
        children: [
          // Body default
          {
            tagName: 'rc-body',
            attributes: { 'background-color': brandStyle.bodyBackgroundColor },
          },
          // Section default
          {
            tagName: 'rc-section',
            attributes: { 'background-color': brandStyle.sectionBackgroundColor },
          },
          // Button default
          {
            tagName: 'rc-button',
            attributes: { 'background-color': brandStyle.buttonColor },
          },
          // Logo style class
          {
            tagName: 'rc-class',
            attributes: {
              name: 'rcml-logo-style',
              src: brandStyle.logoUrl,
            },
          },
          // Brand color class
          {
            tagName: 'rc-class',
            attributes: {
              name: 'rcml-brand-color',
              'background-color': brandStyle.brandColor,
            },
          },
          // Paragraph style
          {
            tagName: 'rc-class',
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
            attributes: {
              name: 'rcml-label-style',
              'font-family': brandStyle.bodyFont,
              'font-size': '14px',
              color: '#FFFFFF',
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
        ...(preheader ? { content: { type: 'text' as const, text: preheader } } : {}),
      },
      // Plain text fallback
      {
        tagName: 'rc-plain-text',
        content: {
          type: 'text' as const,
          text: `Klicka här för att läsa mailet på webben: %Link:WebBrowser%\n\n---\nKlicka här för att avregistrera dig från detta nyhetsbrev: %Link:Unsubscribe%`,
        },
      },
      // Font definitions
      {
        tagName: 'rc-font',
        attributes: {
          name: brandStyle.headingFont.split(',')[0].trim(),
          href: brandStyle.headingFontUrl,
        },
      },
      {
        tagName: 'rc-font',
        attributes: {
          name: brandStyle.bodyFont.split(',')[0].trim(),
          href: brandStyle.bodyFontUrl,
        },
      },
    ],
  } as RCMLDocument['children'][0];
}

// ============================================================================
// Simple Template Builder
// ============================================================================

export interface SimpleTemplateConfig {
  /** Brand style to use */
  brandStyle?: BrandStyleConfig;
  /** Custom field mapping */
  customFields?: CustomFieldMap;
  /** Preview text */
  preheader?: string;
  /** Email body sections */
  sections: RCMLDocument['children'][1]['children'];
}

/**
 * Create a simple RCML document using brand styles
 */
export function createBrandTemplate(config: SimpleTemplateConfig): RCMLDocument {
  const brandStyle = config.brandStyle || BLACKSTA_BRAND_STYLE;

  return {
    tagName: 'rcml',
    children: [
      createBrandHead(brandStyle, config.preheader),
      {
        tagName: 'rc-body',
        children: config.sections,
      },
    ],
  };
}

// ============================================================================
// Brand-Style Element Helpers
// ============================================================================

/**
 * Create a logo element using brand style
 */
export function createBrandLogo(): RCMLDocument['children'][1]['children'][0] {
  return {
    tagName: 'rc-section',
    children: [
      {
        tagName: 'rc-column',
        attributes: {
          padding: '0 20px',
          'padding-on-mobile': '0 20px',
        },
        children: [
          {
            tagName: 'rc-logo',
            attributes: {
              'rc-class': 'rcml-logo-style',
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
 * Create a heading using brand style
 */
export function createBrandHeading(
  content: RCMLProseMirrorDoc,
  level: 1 | 2 | 3 | 4 = 1
): { tagName: 'rc-heading'; attributes: Record<string, string>; content: RCMLProseMirrorDoc } {
  return {
    tagName: 'rc-heading',
    attributes: {
      'rc-class': `rcml-h${level}-style`,
    },
    content,
  };
}

/**
 * Create a text element using brand style
 */
export function createBrandText(
  content: RCMLProseMirrorDoc,
  options?: { align?: 'left' | 'center' | 'right'; padding?: string }
): { tagName: 'rc-text'; attributes: Record<string, string>; content: RCMLProseMirrorDoc } {
  return {
    tagName: 'rc-text',
    attributes: {
      'rc-class': 'rcml-p-style',
      ...(options?.align && { align: options.align }),
      ...(options?.padding && { padding: options.padding }),
    },
    content,
  };
}

/**
 * Create a button using brand style
 */
export function createBrandButton(
  content: RCMLProseMirrorDoc,
  href: string
): { tagName: 'rc-button'; attributes: Record<string, string>; content: RCMLProseMirrorDoc } {
  return {
    tagName: 'rc-button',
    attributes: {
      href,
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
 * Create a content section
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
    attributes: {
      ...(options?.padding && { padding: options.padding }),
      ...(options?.backgroundColor && { 'background-color': options.backgroundColor }),
    },
    children: [
      {
        tagName: 'rc-column',
        attributes: { padding: '0 20px' },
        children:
          children as unknown as RCMLDocument['children'][1]['children'][0]['children'][0]['children'],
      },
    ],
  } as RCMLDocument['children'][1]['children'][0];
}

/**
 * Create the footer section with unsubscribe links
 */
export function createFooterSection(): RCMLDocument['children'][1]['children'][0] {
  return {
    tagName: 'rc-section',
    attributes: {
      padding: '20px 0px 20px 0px',
      'background-color': '#f3f3f3',
    },
    children: [
      {
        tagName: 'rc-column',
        attributes: {
          padding: '0 20px',
          'padding-on-mobile': '0 20px',
        },
        children: [
          {
            tagName: 'rc-text',
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
                      text: 'Öppna i webbläsare',
                      marks: [
                        {
                          type: 'font',
                          attrs: {
                            'font-size': '10px',
                            'text-decoration': 'underline',
                            color: '#666666',
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
                      marks: [{ type: 'font', attrs: { 'font-size': '10px', color: '#666666' } }],
                    },
                    { type: 'text', text: ' ' },
                    {
                      type: 'text',
                      text: 'Avregistrera',
                      marks: [
                        {
                          type: 'font',
                          attrs: {
                            'font-size': '10px',
                            'text-decoration': 'underline',
                            color: '#666666',
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
