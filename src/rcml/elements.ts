/**
 * RCML Element Builders
 *
 * Functions for creating RCML email template elements.
 */

import type {
  RCMLProseMirrorDoc,
  RCMLDocument,
  RCMLSection,
  RCMLColumn,
  RCMLColumnChild,
  RCMLHeading,
  RCMLText,
  RCMLButton,
  RCMLImage,
  RCMLLogo,
  RCMLVideo,
  RCMLSpacer,
  RCMLDivider,
  RCMLLoop,
  RCMLSwitch,
  RCMLBrandStyle,
  RCMLPreview,
  RCMLAttributes,
  RCMLFont,
  RCMLPlainText,
} from '../types';

// ============================================================================
// Internal Defaults
// ============================================================================

/** Default colors used across element builders. Internal only — not exported. */
const ELEMENT_DEFAULTS = {
  HEADING_COLOR: '#333333',
  TEXT_COLOR: '#1A1A1A',
  BUTTON_BG_COLOR: '#333333',
  BUTTON_TEXT_COLOR: '#FFFFFF',
  DOCUMENT_BG_COLOR: '#F5F5F5',
  DIVIDER_BORDER_COLOR: '#CCCCCC',
} as const;

// ============================================================================
// Document Creation
// ============================================================================

/**
 * Style configuration for email templates.
 * These are applied via rc-attributes in the document head.
 */
export interface EmailStyleConfig {
  /**
   * Rule.io brand style ID (required for editor compatibility).
   * Get this from Rule.io Settings → Brand.
   * The editor requires this even though actual styling comes from rc-attributes.
   */
  brandStyleId: string;
  /** Logo image URL */
  logoUrl?: string;
  /** Logo width (default: 96px) */
  logoWidth?: string;
  /** Logo link URL (e.g., website homepage) */
  logoHref?: string;
  /** Primary color for headings and buttons */
  primaryColor?: string;
  /** Secondary/accent color for dividers and links */
  accentColor?: string;
  /** Background color for email body */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Button background color (defaults to primaryColor) */
  buttonColor?: string;
  /** Heading font family */
  headingFontFamily?: string;
  /** Body text font family */
  bodyFontFamily?: string;
}

export interface CreateRCMLDocumentOptions {
  /** Preview text shown in email clients */
  preheader?: string;
  /** Background color of the email body (can also be set in styles) */
  backgroundColor?: string;
  /** Width of the email content (default: 600px) */
  width?: string;
  /**
   * Style configuration for the template.
   * These are applied via rc-attributes in the document head.
   */
  styles?: EmailStyleConfig;
  /**
   * @deprecated Use `styles` instead. Brand style ID is only for Rule.io editor reference
   * and doesn't actually apply styling. Use `styles` to define colors, fonts, and logo directly.
   */
  brandStyleId?: string;
  /** Email sections */
  sections: (RCMLSection | RCMLLoop | RCMLSwitch)[];
}

/**
 * Create rc-attributes element with style definitions
 */
function createAttributesFromStyles(styles: EmailStyleConfig): RCMLAttributes {
  const children: RCMLAttributes['children'] = [];

  // Logo style class (rc-logo uses rc-class="rcml-logo-style" to reference this)
  if (styles.logoUrl) {
    children.push({
      tagName: 'rc-class',
      attributes: {
        name: 'rcml-logo-style',
        src: styles.logoUrl,
        width: styles.logoWidth || '96px',
      },
    });
  }

  // Body default background
  if (styles.backgroundColor) {
    children.push({
      tagName: 'rc-body',
      attributes: {
        'background-color': styles.backgroundColor,
      },
    });
  }

  // Button default color
  if (styles.buttonColor || styles.primaryColor) {
    children.push({
      tagName: 'rc-button',
      attributes: {
        'background-color': styles.buttonColor || styles.primaryColor || ELEMENT_DEFAULTS.BUTTON_BG_COLOR,
      },
    });
  }

  return {
    tagName: 'rc-attributes',
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * Create a basic RCML document structure
 *
 * @example
 * ```typescript
 * const doc = createRCMLDocument({
 *   preheader: 'Your order is confirmed!',
 *   styles: {
 *     logoUrl: 'https://example.com/logo.png',
 *     primaryColor: '#333333',
 *     accentColor: '#0066CC',
 *     backgroundColor: '#F5F5F5',
 *   },
 *   sections: [
 *     createCenteredSection({
 *       children: [
 *         createLogo(), // Will use logoUrl from styles
 *         createHeading('Welcome!'),
 *         createText('Thank you for your order.'),
 *       ]
 *     })
 *   ]
 * });
 * ```
 */
export function createRCMLDocument(options: CreateRCMLDocumentOptions): RCMLDocument {
  const headChildren: (RCMLAttributes | RCMLBrandStyle | RCMLPreview | RCMLFont | RCMLPlainText)[] =
    [];

  // Add styles to head
  if (options.styles) {
    // rc-brand-style is REQUIRED for Rule.io editor compatibility
    // The editor will error with "No brand style node found in head" without it
    headChildren.push({
      tagName: 'rc-brand-style',
      attributes: {
        id: options.styles.brandStyleId,
      },
    });

    // rc-attributes is where actual styling comes from
    headChildren.push(createAttributesFromStyles(options.styles));
  }

  // Legacy support: brandStyleId only (deprecated)
  if (options.brandStyleId && !options.styles) {
    headChildren.push({
      tagName: 'rc-brand-style',
      attributes: {
        id: options.brandStyleId,
      },
    });
  }

  if (options.preheader) {
    headChildren.push({
      tagName: 'rc-preview',
      content: options.preheader,
    });
  }

  // Determine background color from styles or direct option
  const bgColor =
    options.styles?.backgroundColor || options.backgroundColor || ELEMENT_DEFAULTS.DOCUMENT_BG_COLOR;

  return {
    tagName: 'rcml',
    children: [
      {
        tagName: 'rc-head',
        children: headChildren.length > 0 ? headChildren : undefined,
      },
      {
        tagName: 'rc-body',
        attributes: {
          'background-color': bgColor,
          width: options.width || '600px',
        },
        children: options.sections,
      },
    ],
  };
}

// ============================================================================
// Section Creation
// ============================================================================

export interface CreateSectionOptions {
  /** Background color */
  backgroundColor?: string;
  /** Padding (CSS format, e.g., "20px 0") */
  padding?: string;
  /** Column children */
  children: RCMLColumnChild[];
}

/**
 * Create a section with a single centered column
 */
export function createCenteredSection(options: CreateSectionOptions): RCMLSection {
  return {
    tagName: 'rc-section',
    attributes: {
      'background-color': options.backgroundColor,
      padding: options.padding || '20px 0',
    },
    children: [
      {
        tagName: 'rc-column',
        attributes: {
          padding: '0 20px',
        },
        children: options.children,
      },
    ],
  };
}

export interface CreateTwoColumnSectionOptions {
  /** Background color */
  backgroundColor?: string;
  /** Padding (CSS format) */
  padding?: string;
  /** Left column width (e.g., "50%") */
  leftWidth?: string;
  /** Right column width (e.g., "50%") */
  rightWidth?: string;
  /** Left column children */
  leftChildren: RCMLColumnChild[];
  /** Right column children */
  rightChildren: RCMLColumnChild[];
}

/**
 * Create a two-column section
 */
export function createTwoColumnSection(options: CreateTwoColumnSectionOptions): RCMLSection {
  return {
    tagName: 'rc-section',
    attributes: {
      'background-color': options.backgroundColor,
      padding: options.padding || '20px 0',
    },
    children: [
      {
        tagName: 'rc-column',
        attributes: {
          width: options.leftWidth || '50%',
          padding: '0 10px 0 20px',
        },
        children: options.leftChildren,
      },
      {
        tagName: 'rc-column',
        attributes: {
          width: options.rightWidth || '50%',
          padding: '0 20px 0 10px',
        },
        children: options.rightChildren,
      },
    ],
  };
}

/**
 * Create a custom section with explicit columns
 */
export function createSection(
  columns: RCMLColumn[],
  options?: {
    backgroundColor?: string;
    padding?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
  }
): RCMLSection {
  return {
    tagName: 'rc-section',
    attributes: {
      'background-color': options?.backgroundColor,
      padding: options?.padding || '20px 0',
      'text-align': options?.textAlign,
    },
    children: columns,
  };
}

/**
 * Create a column
 */
export function createColumn(
  children: RCMLColumnChild[],
  options?: {
    width?: string;
    backgroundColor?: string;
    padding?: string;
    verticalAlign?: 'top' | 'middle' | 'bottom';
  }
): RCMLColumn {
  return {
    tagName: 'rc-column',
    attributes: {
      width: options?.width,
      'background-color': options?.backgroundColor,
      padding: options?.padding || '0 20px',
      'vertical-align': options?.verticalAlign,
    },
    children,
  };
}

// ============================================================================
// Content Elements
// ============================================================================

/**
 * Create ProseMirror document from plain text
 */
export function createProseMirrorDoc(text: string): RCMLProseMirrorDoc {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  };
}

type FontWeight = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export interface CreateHeadingOptions {
  align?: 'left' | 'center' | 'right';
  color?: string;
  fontSize?: string;
  fontWeight?: FontWeight;
  fontFamily?: string;
  padding?: string;
}

/**
 * Create a heading element
 *
 * @example
 * ```typescript
 * createHeading('Welcome!', {
 *   align: 'center',
 *   color: '#333333',
 *   fontSize: '28px'
 * })
 * ```
 */
export function createHeading(text: string, options?: CreateHeadingOptions): RCMLHeading {
  return {
    tagName: 'rc-heading',
    attributes: {
      align: options?.align || 'center',
      color: options?.color || ELEMENT_DEFAULTS.HEADING_COLOR,
      'font-size': options?.fontSize || '28px',
      'font-weight': options?.fontWeight || '700',
      padding: options?.padding || '0 0 20px 0',
      'font-family': options?.fontFamily || 'Georgia, serif',
    },
    content: createProseMirrorDoc(text),
  };
}

export interface CreateTextOptions {
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  lineHeight?: string;
  padding?: string;
}

/**
 * Create a text element
 *
 * @example
 * ```typescript
 * createText('Thank you for your order.', {
 *   align: 'center',
 *   color: '#333333'
 * })
 * ```
 */
export function createText(text: string, options?: CreateTextOptions): RCMLText {
  return {
    tagName: 'rc-text',
    attributes: {
      align: options?.align || 'left',
      color: options?.color || ELEMENT_DEFAULTS.TEXT_COLOR,
      'font-size': options?.fontSize || '16px',
      'line-height': options?.lineHeight || '1.6',
      padding: options?.padding || '0 0 16px 0',
      'font-family': options?.fontFamily || 'Helvetica, Arial, sans-serif',
    },
    content: createProseMirrorDoc(text),
  };
}

export interface CreateButtonOptions {
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  padding?: string;
  innerPadding?: string;
  fontSize?: string;
  fontFamily?: string;
}

/**
 * Create a button element
 *
 * @example
 * ```typescript
 * createButton('View Order', 'https://example.com/orders/123', {
 *   backgroundColor: '#333333',
 *   color: '#FFFFFF'
 * })
 * ```
 */
export function createButton(
  text: string,
  href: string,
  options?: CreateButtonOptions
): RCMLButton {
  return {
    tagName: 'rc-button',
    attributes: {
      href,
      align: options?.align || 'center',
      'background-color': options?.backgroundColor || ELEMENT_DEFAULTS.BUTTON_BG_COLOR,
      color: options?.color || ELEMENT_DEFAULTS.BUTTON_TEXT_COLOR,
      'border-radius': options?.borderRadius || '8px',
      'inner-padding': options?.innerPadding || '14px 28px',
      padding: options?.padding || '10px 0 20px 0',
      'font-size': options?.fontSize || '16px',
      'font-family': options?.fontFamily || 'Helvetica, Arial, sans-serif',
    },
    content: createProseMirrorDoc(text),
  };
}

export interface CreateImageOptions {
  alt?: string;
  width?: string;
  height?: string;
  href?: string;
  align?: 'left' | 'center' | 'right';
  padding?: string;
  borderRadius?: string;
}

/**
 * Create an image element
 */
export function createImage(src: string, options?: CreateImageOptions): RCMLImage {
  return {
    tagName: 'rc-image',
    attributes: {
      src,
      alt: options?.alt || '',
      width: options?.width,
      height: options?.height,
      href: options?.href,
      align: options?.align || 'center',
      padding: options?.padding || '0 0 20px 0',
      'border-radius': options?.borderRadius,
    },
  };
}

export interface CreateLogoOptions {
  /**
   * Direct logo URL. If provided, overrides rc-class reference.
   * If not provided, logo uses rc-class="rcml-logo-style" which
   * references the logo defined in styles config.
   */
  src?: string;
  /** Custom rc-class name (default: rcml-logo-style) */
  rcClass?: string;
  /** Logo width (default: 96px) */
  width?: string;
  /** Padding around logo */
  padding?: string;
  /** Link URL when logo is clicked */
  href?: string;
  /** Alt text for accessibility */
  alt?: string;
}

/**
 * Create a logo element
 *
 * The logo can be defined in two ways:
 * 1. Via `styles.logoUrl` in createRCMLDocument() - uses rc-class reference
 * 2. Via direct `src` option here - embeds URL directly
 *
 * @example
 * ```typescript
 * // Using styles config (recommended)
 * createRCMLDocument({
 *   styles: { logoUrl: 'https://example.com/logo.png' },
 *   sections: [createCenteredSection({ children: [createLogo()] })]
 * });
 *
 * // Using direct src
 * createLogo({ src: 'https://example.com/logo.png', width: '120px' });
 * ```
 */
export function createLogo(options?: CreateLogoOptions): RCMLLogo {
  // If src is provided directly, use it instead of rc-class
  if (options?.src) {
    return {
      tagName: 'rc-logo',
      attributes: {
        src: options.src,
        width: options.width || '96px',
        padding: options.padding || '20px 0',
        href: options.href,
        alt: options.alt || '',
      },
    };
  }

  // Otherwise use rc-class reference to styles config
  return {
    tagName: 'rc-logo',
    attributes: {
      'rc-class': options?.rcClass || 'rcml-logo-style',
      width: options?.width || '96px',
      padding: options?.padding || '20px 0',
      href: options?.href,
      alt: options?.alt || '',
    },
  };
}

/**
 * Create a spacer element
 */
export function createSpacer(height?: string): RCMLSpacer {
  return {
    tagName: 'rc-spacer',
    attributes: {
      height: height || '20px',
    },
  };
}

export interface CreateDividerOptions {
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  width?: string;
  padding?: string;
}

/**
 * Create a divider element
 */
export function createDivider(options?: CreateDividerOptions): RCMLDivider {
  return {
    tagName: 'rc-divider',
    attributes: {
      'border-color': options?.borderColor || ELEMENT_DEFAULTS.DIVIDER_BORDER_COLOR,
      'border-style': options?.borderStyle || 'solid',
      'border-width': options?.borderWidth || '1px',
      width: options?.width || '100%',
      padding: options?.padding || '20px 0',
    },
  };
}

export interface CreateVideoOptions {
  alt?: string;
  width?: string;
  height?: string;
  href?: string;
  buttonUrl?: string;
  align?: 'left' | 'center' | 'right';
  padding?: string;
  borderRadius?: string;
}

/**
 * Create a video element (shows thumbnail with play button overlay)
 */
export function createVideo(src: string, options?: CreateVideoOptions): RCMLVideo {
  return {
    tagName: 'rc-video',
    attributes: {
      src,
      alt: options?.alt || '',
      width: options?.width,
      height: options?.height,
      href: options?.href,
      'button-url': options?.buttonUrl,
      align: options?.align || 'center',
      padding: options?.padding || '0 0 20px 0',
      'border-radius': options?.borderRadius,
    },
  };
}
