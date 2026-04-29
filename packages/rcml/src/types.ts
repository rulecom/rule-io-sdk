/**
 * RCML (Rule Communication Markup Language) Types
 *
 * Complete TypeScript types for Rule.io's RCML email template format.
 * Based on official Rule.io V6 Editor documentation.
 *
 * RCML is an abstract tag-based language for creating email templates from
 * predefined components. It can be used as XML-like code or JSON-like AST.
 * All v6 templates are stored in JSON format and rendered to HTML by the server.
 *
 * @see https://github.com/rulecom/wiki/wiki/RCML-Components
 */

import type { RCMLDocumentRoot } from '@rule-io/core';

// ============================================================================
// ProseMirror Document Types (for rich text content)
// ============================================================================

/**
 * ProseMirror document structure used for rc-text, rc-heading, and rc-button content
 * @see https://github.com/rulecom/wiki/wiki/RCML-content
 */
export interface RCMLProseMirrorDoc {
  type: 'doc';
  content: RCMLProseMirrorNode[];
}

/**
 * ProseMirror node — discriminated union keyed on `type`.
 *
 * - `paragraph` — block container that holds inline children
 * - `text` — inline text run with optional marks (font, link)
 * - `placeholder` — merge-field token resolved at send time
 *
 * NOTE: This was changed from an interface to a discriminated union type in
 * v0.x. A union gives better narrowing via `node.type`, but it does not
 * support `interface X extends RCMLProseMirrorNode` or declaration merging.
 * This is acceptable for a pre-1.0 SDK with no published compatibility
 * contract. If you need to extend, use intersection types instead:
 *   `type MyNode = RCMLProseMirrorNode & { custom: string }`
 */
export type RCMLProseMirrorNode =
  | { type: 'paragraph'; content?: RCMLProseMirrorNode[] }
  | { type: 'text'; text: string; marks?: RCMLProseMirrorMark[] }
  | { type: 'placeholder'; attrs: { type: string; name: string; value: string | number; original: string } };

/**
 * ProseMirror inline mark.
 *
 * Rule.io supports two mark types:
 * - `font` — inline CSS overrides (`font-weight`, `font-style`,
 *   `text-decoration`, `color`, `font-size`, etc.)
 * - `link` — hyperlink (`href`, `target`, `no-tracked`)
 *
 * To apply bold, italic, or underline, use a `font` mark:
 * ```ts
 * { type: 'font', attrs: { 'font-weight': 'bold' } }           // bold
 * { type: 'font', attrs: { 'font-style': 'italic' } }          // italic
 * { type: 'font', attrs: { 'text-decoration': 'underline' } }  // underline
 * ```
 */
export interface RCMLProseMirrorMark {
  type: 'font' | 'link';
  attrs?: Record<string, string | boolean>;
}

// ============================================================================
// RCML Document Structure
// ============================================================================

/**
 * RCML Document root structure.
 * An RCML document always starts with an `rcml` tag.
 * It can contain only `rc-head` and `rc-body` tags.
 *
 * Extends {@link RCMLDocumentRoot} from `@rule-io/core` — core defines the
 * minimal `{ tagName: 'rcml' }` shape so vendor-contract types there can
 * reference an RCML document root without dragging the full tree in.
 */
export interface RCMLDocument extends RCMLDocumentRoot {
  id?: string;
  tagName: 'rcml';
  children: [RCMLHead, RCMLBody];
}

/**
 * rc-head contains head components related to the document such as
 * default settings overrides, selected brand style, or custom email pre-header.
 */
export interface RCMLHead {
  id?: string;
  tagName: 'rc-head';
  children?: (RCMLAttributes | RCMLBrandStyle | RCMLPreview | RCMLFont | RCMLPlainText)[];
}

/**
 * Inside rc-attributes, a tag citing one RCML component overrides default settings.
 * rc-class tags create a named group of RCML attributes you can apply to components.
 */
export interface RCMLAttributes {
  id?: string;
  tagName: 'rc-attributes';
  children?: (RCMLClass | RCMLBodyStyle | RCMLSectionStyle | RCMLButtonStyle | RCMLSocialConfig)[];
}

/**
 * rc-class creates a named group of RCML attributes.
 * Apply using `rc-class` attribute on body components.
 */
export interface RCMLClass {
  id?: string;
  tagName: 'rc-class';
  attributes: {
    /** Name identifier for the class */
    name: string;
    'background-color'?: string;
    color?: string;
    'font-family'?: string;
    'font-size'?: string;
    'font-weight'?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    'font-style'?: 'normal' | 'italic' | 'oblique';
    'line-height'?: string;
    'letter-spacing'?: string;
    'text-decoration'?: 'none' | 'underline' | 'overline' | 'line-through';
    'text-transform'?: 'capitalize' | 'uppercase' | 'lowercase';
    /** Source URL (for logo style) */
    src?: string;
    width?: string;
  };
}

export interface RCMLBodyStyle {
  id?: string;
  tagName: 'rc-body';
  attributes: {
    'background-color'?: string;
  };
}

export interface RCMLSectionStyle {
  id?: string;
  tagName: 'rc-section';
  attributes: {
    'background-color'?: string;
  };
}

export interface RCMLButtonStyle {
  id?: string;
  tagName: 'rc-button';
  attributes: {
    'background-color'?: string;
  };
}

export interface RCMLSocialConfig {
  id?: string;
  tagName: 'rc-social';
  children: RCMLSocialElement[];
}

/**
 * rc-brand-style is only used for persisting the selected brand style ID.
 * It is for editor internal use only.
 *
 * Important: Changing this ID without updating rc-attributes won't change
 * the template. The brand style settings are applied through rc-attributes.
 */
export interface RCMLBrandStyle {
  id?: string;
  tagName: 'rc-brand-style';
  attributes: {
    /** Selected brand style ID */
    id: string;
  };
}

/**
 * rc-preview sets the pre-header displayed in recipient's inbox.
 */
export interface RCMLPreview {
  id?: string;
  tagName: 'rc-preview';
  content?: string;
}

export interface RCMLFont {
  id?: string;
  tagName: 'rc-font';
  attributes: {
    name: string;
    href: string;
  };
}

export interface RCMLPlainText {
  id?: string;
  tagName: 'rc-plain-text';
  content: {
    type: 'text';
    text: string;
  };
}

// ============================================================================
// RCML Body Structure
// ============================================================================

/**
 * rc-body is the main container for email content.
 */
export interface RCMLBody {
  id?: string;
  tagName: 'rc-body';
  attributes?: {
    /** Background color of the email body */
    'background-color'?: string;
    /** Width of the email body (default: 600px) */
    width?: string;
  };
  children: RCMLBodyChild[];
}

/**
 * Top-level child element of an RCML body.
 * Sections, loops, and conditional switches can appear directly inside rc-body.
 */
export type RCMLBodyChild = RCMLSection | RCMLLoop | RCMLSwitch;

/**
 * Sections are used as rows within your email to structure the layout.
 * The full-width property manages background width (default 600px, 100% when enabled).
 */
export interface RCMLSection {
  id?: string;
  tagName: 'rc-section';
  attributes?: {
    'background-color'?: string;
    'background-url'?: string;
    'background-repeat'?: 'repeat' | 'no-repeat';
    'background-size'?: 'auto' | 'cover' | 'contain';
    'background-position'?: string;
    'background-position-x'?: 'left' | 'center' | 'right';
    'background-position-y'?: 'top' | 'center' | 'bottom';
    border?: string;
    'border-bottom'?: string;
    'border-left'?: string;
    'border-right'?: string;
    'border-top'?: string;
    'border-radius'?: string;
    'css-class'?: string;
    direction?: 'ltr' | 'rtl';
    /** Whether the section spans full width */
    'full-width'?: 'full-width' | 'false';
    /** Hide on desktop or mobile */
    hide?: 'desktop' | 'mobile';
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    'text-align'?: 'left' | 'center' | 'right' | 'justify';
    'text-padding'?: string;
  };
  /** Up to 4 columns */
  children: RCMLColumn[];
}

/**
 * Columns enable horizontal organization of content within sections.
 * They must be located under rc-section tags.
 * To be responsive, columns are expressed in terms of percentage.
 *
 * Note: Columns cannot be nested into columns, and sections cannot be nested into columns.
 */
export interface RCMLColumn {
  id?: string;
  tagName: 'rc-column';
  attributes?: {
    'background-color'?: string;
    border?: string;
    'border-bottom'?: string;
    'border-left'?: string;
    'border-right'?: string;
    'border-top'?: string;
    'border-radius'?: string;
    'css-class'?: string;
    direction?: 'ltr' | 'rtl';
    'inner-background-color'?: string;
    'inner-border'?: string;
    'inner-border-bottom'?: string;
    'inner-border-left'?: string;
    'inner-border-right'?: string;
    'inner-border-top'?: string;
    'inner-border-radius'?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    'vertical-align'?: 'top' | 'middle' | 'bottom';
    width?: string;
  };
  children: RCMLColumnChild[];
}

// ============================================================================
// RCML Content Elements
// ============================================================================

export type RCMLColumnChild =
  | RCMLText
  | RCMLHeading
  | RCMLButton
  | RCMLImage
  | RCMLLogo
  | RCMLVideo
  | RCMLSpacer
  | RCMLDivider
  | RCMLSocial;

/**
 * rc-text displays text in your email.
 * Note: Arbitrary HTML is disabled for security reasons (XSS prevention).
 */
export interface RCMLText {
  id?: string;
  tagName: 'rc-text';
  attributes?: {
    align?: 'left' | 'center' | 'right' | 'justify';
    color?: string;
    'container-background-color'?: string;
    'css-class'?: string;
    'rc-class'?: string;
    'font-family'?: string;
    'font-size'?: string;
    'font-style'?: 'normal' | 'italic' | 'oblique';
    'font-weight'?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    height?: string;
    'letter-spacing'?: string;
    'line-height'?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    'text-decoration'?: 'none' | 'underline' | 'overline' | 'line-through';
    'text-transform'?: 'capitalize' | 'uppercase' | 'lowercase';
    'vertical-align'?: 'top' | 'middle' | 'bottom';
  };
  content: RCMLProseMirrorDoc;
}

/**
 * rc-heading is identical to rc-text but for semantic differentiation (title vs body text).
 */
export interface RCMLHeading {
  id?: string;
  tagName: 'rc-heading';
  attributes?: {
    align?: 'left' | 'center' | 'right' | 'justify';
    color?: string;
    'container-background-color'?: string;
    'css-class'?: string;
    'rc-class'?: string;
    'font-family'?: string;
    'font-size'?: string;
    'font-style'?: 'normal' | 'italic' | 'oblique';
    'font-weight'?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    height?: string;
    'letter-spacing'?: string;
    'line-height'?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    'text-decoration'?: 'none' | 'underline' | 'overline' | 'line-through';
    'text-transform'?: 'capitalize' | 'uppercase' | 'lowercase';
    'vertical-align'?: 'top' | 'middle' | 'bottom';
  };
  content: RCMLProseMirrorDoc;
}

/**
 * rc-button displays a customizable button.
 */
export interface RCMLButton {
  id?: string;
  tagName: 'rc-button';
  attributes?: {
    align?: 'left' | 'center' | 'right';
    'background-color'?: string;
    border?: string;
    'border-bottom'?: string;
    'border-left'?: string;
    'border-right'?: string;
    'border-top'?: string;
    'border-radius'?: string;
    color?: string;
    'container-background-color'?: string;
    'css-class'?: string;
    'rc-class'?: string;
    'font-family'?: string;
    'font-size'?: string;
    'font-style'?: 'normal' | 'italic' | 'oblique';
    'font-weight'?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    height?: string;
    href?: string;
    'inner-padding'?: string;
    'letter-spacing'?: string;
    'line-height'?: string;
    name?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    rel?: string;
    target?: '_blank' | '_self' | '_parent' | '_top';
    'text-align'?: 'left' | 'center' | 'right';
    'text-decoration'?: 'none' | 'underline' | 'overline' | 'line-through';
    'text-transform'?: 'capitalize' | 'uppercase' | 'lowercase';
    title?: string;
    'vertical-align'?: 'top' | 'middle' | 'bottom';
    width?: string;
  };
  content: RCMLProseMirrorDoc;
}

/**
 * rc-image displays a responsive image.
 * If no width is provided, the image will use the parent column width.
 */
export interface RCMLImage {
  id?: string;
  tagName: 'rc-image';
  attributes: {
    src: string;
    align?: 'left' | 'center' | 'right';
    'align-on-mobile'?: 'left' | 'center' | 'right';
    alt?: string;
    border?: string;
    'border-bottom'?: string;
    'border-left'?: string;
    'border-right'?: string;
    'border-top'?: string;
    'border-radius'?: string;
    'container-background-color'?: string;
    'css-class'?: string;
    'fluid-on-mobile'?: 'true' | 'false';
    'font-size'?: string;
    height?: string;
    href?: string;
    'max-height'?: string;
    name?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    rel?: string;
    target?: '_blank' | '_self' | '_parent' | '_top';
    title?: string;
    width?: string;
  };
}

/**
 * rc-logo is identical to rc-image but for semantic reasons.
 * It's used to identify where to put the logo from the brand style.
 */
export interface RCMLLogo {
  id?: string;
  tagName: 'rc-logo';
  attributes?: {
    align?: 'left' | 'center' | 'right';
    'align-on-mobile'?: 'left' | 'center' | 'right';
    alt?: string;
    border?: string;
    'border-bottom'?: string;
    'border-left'?: string;
    'border-right'?: string;
    'border-top'?: string;
    'border-radius'?: string;
    'container-background-color'?: string;
    'css-class'?: string;
    'fluid-on-mobile'?: 'true' | 'false';
    'font-size'?: string;
    height?: string;
    href?: string;
    'max-height'?: string;
    name?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    rel?: string;
    /** Source URL of the logo (when not using rc-class) */
    src?: string;
    target?: '_blank' | '_self' | '_parent' | '_top';
    title?: string;
    /** Default: 96px */
    width?: string;
    'rc-class'?: string;
  };
}

/**
 * rc-video is similar to rc-image but includes a button-url for play button overlay.
 */
export interface RCMLVideo {
  id?: string;
  tagName: 'rc-video';
  attributes: {
    src: string;
    align?: 'left' | 'center' | 'right';
    'align-on-mobile'?: 'left' | 'center' | 'right';
    alt?: string;
    border?: string;
    'border-bottom'?: string;
    'border-left'?: string;
    'border-right'?: string;
    'border-top'?: string;
    'border-radius'?: string;
    /** URL for the play button overlay */
    'button-url'?: string;
    'container-background-color'?: string;
    'css-class'?: string;
    'fluid-on-mobile'?: 'true' | 'false';
    'font-size'?: string;
    height?: string;
    href?: string;
    'max-height'?: string;
    name?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    rel?: string;
    target?: '_blank' | '_self' | '_parent' | '_top';
    title?: string;
    width?: string;
  };
}

/**
 * rc-spacer displays a blank space.
 */
export interface RCMLSpacer {
  id?: string;
  tagName: 'rc-spacer';
  attributes?: {
    'container-background-color'?: string;
    'css-class'?: string;
    /** Default: 32px */
    height?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
  };
}

/**
 * rc-divider displays a horizontal divider similar to an HTML border.
 */
export interface RCMLDivider {
  id?: string;
  tagName: 'rc-divider';
  attributes?: {
    align?: 'left' | 'center' | 'right';
    /** Default: #000000 */
    'border-color'?: string;
    /** Default: solid */
    'border-style'?:
      | 'none'
      | 'hidden'
      | 'dotted'
      | 'dashed'
      | 'solid'
      | 'double'
      | 'groove'
      | 'ridge'
      | 'inset'
      | 'outset';
    /** Default: 1px */
    'border-width'?: string;
    'container-background-color'?: string;
    'css-class'?: string;
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    /** Default: 100% */
    width?: string;
  };
}

/**
 * rc-social displays social network icons with optional labels.
 */
export interface RCMLSocial {
  id?: string;
  tagName: 'rc-social';
  attributes?: {
    align?: 'left' | 'center' | 'right';
    'border-radius'?: string;
    color?: string;
    'container-background-color'?: string;
    'css-class'?: string;
    'font-family'?: string;
    'font-size'?: string;
    'font-style'?: 'normal' | 'italic' | 'oblique';
    'font-weight'?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    'icon-size'?: string;
    'icon-height'?: string;
    'icon-padding'?: string;
    'inner-padding'?: string;
    'line-height'?: string;
    mode?: 'horizontal' | 'vertical';
    padding?: string;
    'padding-top'?: string;
    'padding-bottom'?: string;
    'padding-left'?: string;
    'padding-right'?: string;
    'padding-on-mobile'?: string;
    'table-layout'?: 'auto' | 'fixed';
    'text-decoration'?: 'none' | 'underline' | 'overline' | 'line-through';
    'text-padding'?: string;
    'vertical-align'?: 'top' | 'middle' | 'bottom';
  };
  children: RCMLSocialElement[];
}

/**
 * rc-social-element represents a single social network icon.
 * Default icons are transparent, allowing background-color to be the icon color.
 */
export interface RCMLSocialElement {
  id?: string;
  tagName: 'rc-social-element';
  attributes: {
    /** Social network name */
    name: string;
    /** Link URL */
    href: string;
    /** Custom icon URL */
    src?: string;
    'background-color'?: string;
  };
  /** Optional label text */
  content?: string;
}

// ============================================================================
// RCML Control Flow Elements
// ============================================================================

/**
 * rc-loop enables iteration over array data in sections.
 * @see https://github.com/rulecom/wiki/wiki/RCML-Components#rc-loop
 */
export interface RCMLLoop {
  id?: string;
  tagName: 'rc-loop';
  attributes: {
    /** Type of loop for handling array data */
    'loop-type': 'news-feed' | 'remote-content' | 'custom-field' | 'xml-doc';
    /** URL or custom field ID depending on loop-type */
    'loop-value': string;
    /** Maximum number of iterations */
    'loop-max-iterations'?: number;
    /** Path within xml-doc (only for xml-doc loop-type) */
    'loop-path'?: string;
    /** Start index from the source list (min: 0) */
    'loop-range-start'?: number;
    /** End index from the source list (min: 0) */
    'loop-range-end'?: number;
  };
  children: RCMLSection[];
}

/**
 * rc-switch is a grouping container for rc-case components.
 * @see https://github.com/rulecom/wiki/wiki/RCML-Components#rc-switch
 */
export interface RCMLSwitch {
  id?: string;
  tagName: 'rc-switch';
  children: RCMLCase[];
}

/**
 * rc-case defines a section variant to render based on subscriber data.
 * Each rc-case can contain only one section.
 * @see https://github.com/rulecom/wiki/wiki/RCML-Components#rc-case
 */
export interface RCMLCase {
  id?: string;
  tagName: 'rc-case';
  attributes: {
    /** If false, required validation is skipped. Default: true */
    'case-active'?: boolean;
    /** Case type. Required. */
    'case-type': 'default' | 'segment' | 'tag' | 'custom-field';
    /** Custom field ID. Required if case-type is 'custom-field' */
    'case-property'?: number;
    /** Condition. Required if case-type is segment, tag, or custom-field */
    'case-condition'?: 'eq' | 'ne';
    /** Value. For segment/tag: must be tag/segment ID. Required if case-type is segment, tag, or custom-field */
    'case-value'?: string | number;
  };
  children: RCMLSection[];
}
