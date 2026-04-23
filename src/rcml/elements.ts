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
  RCMLCase,
  RCMLSocial,
  RCMLSocialElement,
  RCMLBrandStyle,
  RCMLPreview,
  RCMLAttributes,
  RCMLFont,
  RCMLPlainText,
} from '../types';
import { sanitizeUrl } from './utils';
import { RuleConfigError } from '../errors';

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
  if (options.sections.length === 0) {
    throw new RuleConfigError('createRCMLDocument: at least one section is required');
  }

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
 * @throws {RuleConfigError} If `href` is not a valid http/https URL
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
  const sanitizedHref = sanitizeUrl(href);
  if (!sanitizedHref) {
    throw new RuleConfigError('createButton: invalid or unsafe URL for `href`');
  }
  return {
    tagName: 'rc-button',
    attributes: {
      href: sanitizedHref,
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
 *
 * `src` is sanitized and must be a valid http/https URL.
 * If `options.href` is provided, it is also sanitized and will be omitted
 * from the generated element when invalid or unsafe.
 *
 * @throws {RuleConfigError} If `src` is not a valid http/https URL
 */
export function createImage(src: string, options?: CreateImageOptions): RCMLImage {
  const sanitizedSrc = sanitizeUrl(src);
  if (!sanitizedSrc) {
    throw new RuleConfigError('createImage: invalid or unsafe `src` URL');
  }
  return {
    tagName: 'rc-image',
    attributes: {
      src: sanitizedSrc,
      alt: options?.alt || '',
      width: options?.width,
      height: options?.height,
      href: options?.href ? sanitizeUrl(options.href) || undefined : undefined,
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

// ============================================================================
// Loop Element
// ============================================================================

export interface CreateLoopOptions {
  /** The numeric Rule.io custom field ID for the repeatable field */
  fieldId: number;
  /** Maximum number of iterations (optional) */
  maxIterations?: number;
  /** Start index for range-based iteration (optional) */
  rangeStart?: number;
  /** End index for range-based iteration (optional) */
  rangeEnd?: number;
}

/**
 * Create a loop element that iterates over a repeatable custom field.
 *
 * Uses `loop-type: 'custom-field'` to iterate over array-style fields
 * (e.g., order line items). Each iteration renders the provided sections.
 *
 * @param options - Loop configuration with the repeatable field ID
 * @param children - Sections to render for each iteration
 *
 * @example
 * ```typescript
 * createLoop(
 *   { fieldId: 200005, maxIterations: 20 },
 *   [
 *     createCenteredSection({
 *       children: [createText('Item name here')]
 *     })
 *   ]
 * )
 * ```
 */
export function createLoop(options: CreateLoopOptions, children: RCMLSection[]): RCMLLoop {
  return {
    tagName: 'rc-loop',
    attributes: {
      'loop-type': 'custom-field',
      'loop-value': String(options.fieldId),
      ...(options.maxIterations !== undefined && { 'loop-max-iterations': options.maxIterations }),
      ...(options.rangeStart !== undefined && { 'loop-range-start': options.rangeStart }),
      ...(options.rangeEnd !== undefined && { 'loop-range-end': options.rangeEnd }),
    },
    children,
  };
}

// ============================================================================
// Video Element
// ============================================================================

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
 *
 * `src` must be a valid http/https URL or this function throws. Optional
 * `options.href` and `options.buttonUrl` are also sanitized; if either value
 * is invalid or unsafe, it is silently omitted from the returned element.
 *
 * @throws {RuleConfigError} If `src` is not a valid http/https URL
 */
export function createVideo(src: string, options?: CreateVideoOptions): RCMLVideo {
  const sanitizedSrc = sanitizeUrl(src);
  if (!sanitizedSrc) {
    throw new RuleConfigError('createVideo: invalid or unsafe `src` URL');
  }
  return {
    tagName: 'rc-video',
    attributes: {
      src: sanitizedSrc,
      alt: options?.alt || '',
      width: options?.width,
      height: options?.height,
      href: options?.href ? sanitizeUrl(options.href) || undefined : undefined,
      'button-url': options?.buttonUrl ? sanitizeUrl(options.buttonUrl) || undefined : undefined,
      align: options?.align || 'center',
      padding: options?.padding || '0 0 20px 0',
      'border-radius': options?.borderRadius,
    },
  };
}

// ============================================================================
// Social Elements
// ============================================================================

export interface CreateSocialElementOptions {
  /** Social network name (e.g., 'facebook', 'instagram', 'x') */
  name: string;
  /** Link URL for the social profile */
  href: string;
  /** Custom icon URL (optional — Rule.io provides default icons) */
  src?: string;
  /** Icon background color */
  backgroundColor?: string;
  /** Optional label text displayed beside the icon */
  label?: string;
}

/**
 * Create a single social element (icon + link).
 *
 * `href` is sanitized and must be a valid http/https URL.
 * If `options.src` is provided, it is also sanitized; invalid values are silently omitted.
 *
 * @throws {RuleConfigError} If `href` is not a valid http/https URL
 *
 * @example
 * ```typescript
 * createSocialElement({
 *   name: 'facebook',
 *   href: 'https://facebook.com/mypage',
 * })
 * ```
 */
export function createSocialElement(options: CreateSocialElementOptions): RCMLSocialElement {
  const sanitizedHref = sanitizeUrl(options.href);
  if (!sanitizedHref) {
    throw new RuleConfigError('createSocialElement: invalid or unsafe URL for `href`');
  }
  const sanitizedSrc = options.src ? sanitizeUrl(options.src) : '';
  return {
    tagName: 'rc-social-element',
    attributes: {
      name: options.name,
      href: sanitizedHref,
      ...(sanitizedSrc ? { src: sanitizedSrc } : {}),
      ...(options.backgroundColor ? { 'background-color': options.backgroundColor } : {}),
    },
    ...(options.label ? { content: options.label } : {}),
  };
}

export interface CreateSocialOptions {
  /** Alignment of the social icons row */
  align?: 'left' | 'center' | 'right';
  /** Layout mode */
  mode?: 'horizontal' | 'vertical';
  /** Icon size (e.g., '24px') */
  iconSize?: string;
  /** Padding around individual icons */
  iconPadding?: string;
  /** Padding around the entire social block */
  padding?: string;
  /** Border radius for icon backgrounds */
  borderRadius?: string;
  /** Icon color (applied via font color) */
  color?: string;
  /** Font size for labels */
  fontSize?: string;
  /** Font family for labels */
  fontFamily?: string;
}

/**
 * Create a social icons container with one or more social elements.
 *
 * @param elements - Array of social element children
 * @param options - Layout and style options
 *
 * @example
 * ```typescript
 * createSocial([
 *   createSocialElement({ name: 'facebook', href: 'https://facebook.com/mypage' }),
 *   createSocialElement({ name: 'instagram', href: 'https://instagram.com/mypage' }),
 *   createSocialElement({ name: 'x', href: 'https://x.com/myhandle' }),
 * ], { align: 'center', iconSize: '24px' })
 * ```
 */
export function createSocial(
  elements: RCMLSocialElement[],
  options?: CreateSocialOptions,
): RCMLSocial {
  return {
    tagName: 'rc-social',
    attributes: {
      align: options?.align || 'center',
      ...(options?.mode ? { mode: options.mode } : {}),
      ...(options?.iconSize ? { 'icon-size': options.iconSize } : {}),
      ...(options?.iconPadding ? { 'icon-padding': options.iconPadding } : {}),
      ...(options?.padding ? { padding: options.padding } : {}),
      ...(options?.borderRadius ? { 'border-radius': options.borderRadius } : {}),
      ...(options?.color ? { color: options.color } : {}),
      ...(options?.fontSize ? { 'font-size': options.fontSize } : {}),
      ...(options?.fontFamily ? { 'font-family': options.fontFamily } : {}),
    },
    children: elements,
  };
}

// ============================================================================
// Switch / Case Elements (Conditional Content)
// ============================================================================

interface CreateDefaultCaseOptions {
  /** Default fallback case — renders when no other case matches */
  caseType: 'default';
  /** Whether validation is active (default: true) */
  caseActive?: boolean;
}

interface CreateSegmentOrTagCaseOptions {
  /** Case type — determines what the condition checks against */
  caseType: 'segment' | 'tag';
  /** Condition operator */
  caseCondition: 'eq' | 'ne';
  /** Value to compare against (segment or tag ID) */
  caseValue: string | number;
  /** Whether validation is active (default: true) */
  caseActive?: boolean;
}

interface CreateCustomFieldCaseOptions {
  /** Case type — checks against a custom field value */
  caseType: 'custom-field';
  /** Custom field ID */
  caseProperty: number;
  /** Condition operator */
  caseCondition: 'eq' | 'ne';
  /** Value to compare against */
  caseValue: string | number;
  /** Whether validation is active (default: true) */
  caseActive?: boolean;
}

export type CreateCaseOptions =
  | CreateDefaultCaseOptions
  | CreateSegmentOrTagCaseOptions
  | CreateCustomFieldCaseOptions;

/**
 * Create a conditional case element within a switch.
 *
 * Each case contains exactly one section that renders when the condition matches.
 * Use `caseType: 'default'` for the fallback case.
 *
 * @param options - Condition configuration
 * @param children - Single-element array containing the section to render
 *
 * @example
 * ```typescript
 * // Default fallback case
 * createCase({ caseType: 'default' }, [
 *   createCenteredSection({ children: [createText('Default content')] })
 * ])
 *
 * // Tag-based condition
 * createCase(
 *   { caseType: 'tag', caseCondition: 'eq', caseValue: 42 },
 *   [createCenteredSection({ children: [createText('VIP content')] })]
 * )
 * ```
 */
export function createCase(options: CreateCaseOptions, children: [RCMLSection]): RCMLCase {
  // Runtime check protects JS callers who bypass the [RCMLSection] tuple type.
  const childCount = (children as readonly RCMLSection[]).length;
  if (childCount !== 1) {
    throw new RuleConfigError(
      `createCase: each rc-case must contain exactly one section, got ${childCount}`,
    );
  }

  if (options.caseType !== 'default') {
    if (!options.caseCondition) {
      throw new RuleConfigError(
        `createCase: caseCondition is required when caseType is '${options.caseType}'`,
      );
    }
    if (options.caseValue === undefined) {
      throw new RuleConfigError(
        `createCase: caseValue is required when caseType is '${options.caseType}'`,
      );
    }
    if (options.caseType === 'custom-field' && options.caseProperty === undefined) {
      throw new RuleConfigError(
        "createCase: caseProperty is required when caseType is 'custom-field'",
      );
    }
  }

  const attrs: RCMLCase['attributes'] = {
    'case-type': options.caseType,
  };

  if (options.caseType !== 'default') {
    attrs['case-condition'] = options.caseCondition;
    attrs['case-value'] = options.caseValue;
    if (options.caseType === 'custom-field') {
      attrs['case-property'] = options.caseProperty;
    }
  }

  if (options.caseActive !== undefined) {
    attrs['case-active'] = options.caseActive;
  }

  return { tagName: 'rc-case', attributes: attrs, children };
}

/**
 * Create a switch element for conditional content rendering.
 *
 * A switch groups multiple cases, each with a condition. Only the first
 * matching case is rendered. Use a 'default' case as fallback.
 *
 * @param cases - Array of case elements (use `createCase()` to build these)
 *
 * @example
 * ```typescript
 * createSwitch([
 *   createCase(
 *     { caseType: 'tag', caseCondition: 'eq', caseValue: 42 },
 *     [createCenteredSection({ children: [createText('VIP members')] })]
 *   ),
 *   createCase(
 *     { caseType: 'default' },
 *     [createCenteredSection({ children: [createText('Regular content')] })]
 *   ),
 * ])
 * ```
 */
export function createSwitch(cases: RCMLCase[]): RCMLSwitch {
  return {
    tagName: 'rc-switch',
    children: cases,
  };
}
