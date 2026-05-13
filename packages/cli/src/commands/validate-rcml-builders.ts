/**
 * Local RCML element builders for the `validate-rcml` showcase command.
 *
 * Encodes the `rc-class` / layout conventions the Rule.io editor expects
 * so the showcase template renders identically once `applyTheme`
 * decorates the head from a consumer-supplied theme.
 *
 * Originally lived in `@rulecom/rcml`'s `brand-elements.ts`. After every
 * vendor template migrated to the XML / `createEmailTemplate` pattern,
 * this CLI showcase was the only consumer left, so the helpers were
 * inlined here and the rcml export retired.
 */

import { randomUUID } from 'node:crypto'

import type { EmailTheme, FooterConfig } from '@rulecom/core'
import { RuleConfigError, sanitizeUrl } from '@rulecom/core'

import {
  applyTheme,
  type Json,
  type RcmlBodyChild,
  type RcmlButton,
  type RcmlColumnChild,
  type RcmlDocument,
  type RcmlHead,
  type RcmlHeading,
  type RcmlLoop,
  type RcmlSection,
  type RcmlText,
} from '@rulecom/rcml'

// ─── Inline nodes ───────────────────────────────────────────────────────────

export interface PlaceholderNode {
  type: 'placeholder';
  attrs: {
    type: 'CustomField';
    value: number;
    name: string;
    original: string;
    'max-length': string | null;
  };
}
export interface LoopValueNode {
  type: 'loop-value';
  attrs: { original: string; value: string; index: string };
}
export interface TextNode {
  type: 'text';
  text: string;
}
export type InlineNode = TextNode | PlaceholderNode | LoopValueNode;

export function genId(): string {
  return randomUUID();
}

export function textNode(text: string): TextNode {
  return { type: 'text', text };
}

export function placeholder(fieldName: string, fieldId: number): PlaceholderNode {
  return {
    type: 'placeholder',
    attrs: {
      type: 'CustomField',
      value: fieldId,
      name: fieldName,
      original: `[CustomField:${String(fieldId)}]`,
      'max-length': null,
    },
  };
}

export function loopFieldPlaceholder(jsonKey: string): LoopValueNode {
  return {
    type: 'loop-value',
    attrs: {
      original: `[LoopValue:${jsonKey}]`,
      value: jsonKey,
      index: jsonKey,
    },
  };
}

export function docWithNodes(nodes: readonly InlineNode[]): Json {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [...nodes] }],
  } as unknown as Json;
}

// ─── Brand-typed element builders ───────────────────────────────────────────

export function brandHeading(content: Json, level: 1 | 2 | 3 | 4 = 1): RcmlHeading {
  return {
    tagName: 'rc-heading',
    id: genId(),
    attributes: { 'rc-class': `rcml-h${String(level)}-style` },
    content,
  };
}

export function brandText(
  content: Json,
  options?: { align?: 'left' | 'center' | 'right'; padding?: string }
): RcmlText {
  return {
    tagName: 'rc-text',
    id: genId(),
    attributes: {
      'rc-class': 'rcml-p-style',
      ...(options?.align !== undefined && { align: options.align }),
      ...(options?.padding !== undefined && { padding: options.padding }),
    },
    content,
  };
}

export function brandButton(content: Json, href: string): RcmlButton {
  const safe = sanitizeUrl(href);

  if (!safe) {
    throw new RuleConfigError('brandButton: invalid or unsafe URL');
  }

  return {
    tagName: 'rc-button',
    id: genId(),
    attributes: {
      href: safe,
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

export function contentSection(
  children: readonly RcmlColumnChild[],
  options?: { padding?: string; backgroundColor?: string }
): RcmlSection {
  const padding = options?.padding ?? '20px 0';

  return {
    tagName: 'rc-section',
    id: genId(),
    attributes: {
      padding,
      ...(options?.backgroundColor !== undefined && {
        'background-color': options.backgroundColor,
      }),
    },
    children: [
      {
        tagName: 'rc-column',
        id: genId(),
        attributes: { padding: '0 20px' },
        children: [...children],
      },
    ],
  } as unknown as RcmlSection;
}

export function logoSection(logoUrl: string): RcmlSection {
  const safeSrc = sanitizeUrl(logoUrl);

  if (!safeSrc) {
    throw new RuleConfigError('logoSection: invalid or unsafe logoUrl');
  }

  return {
    tagName: 'rc-section',
    id: genId(),
    children: [
      {
        tagName: 'rc-column',
        id: genId(),
        attributes: { padding: '0 20px' },
        children: [
          {
            tagName: 'rc-logo',
            id: genId(),
            attributes: {
              'rc-class': 'rcml-logo-style rc-initial-logo',
              src: safeSrc,
              width: '96px',
              padding: '20px 0',
            },
          },
        ],
      },
    ],
  } as unknown as RcmlSection;
}

// ─── Footer ─────────────────────────────────────────────────────────────────

export function footerSection(config?: FooterConfig): RcmlSection {
  const viewText = config?.viewInBrowserText ?? 'View in browser';
  const unsubText = config?.unsubscribeText ?? 'Unsubscribe';
  const textColor = config?.textColor ?? '#666666';
  const fontSize = config?.fontSize ?? '10px';

  return {
    tagName: 'rc-section',
    id: genId(),
    attributes: { padding: '20px 0px 20px 0px' },
    children: [
      {
        tagName: 'rc-column',
        id: genId(),
        attributes: { padding: '0 20px' },
        children: [
          {
            tagName: 'rc-text',
            id: genId(),
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
                      marks: [
                        { type: 'font', attrs: { 'font-size': fontSize, color: textColor } },
                      ],
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
            id: genId(),
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
                { type: 'paragraph', content: [{ type: 'text', text: 'Certified by Rule' }] },
              ],
            },
          },
        ],
      },
    ],
  } as unknown as RcmlSection;
}

// ─── Loop (brand-styled) ────────────────────────────────────────────────────

export function brandLoop(
  fieldId: number,
  children: readonly RcmlSection[],
  options?: { maxIterations?: number; rangeStart?: number; rangeEnd?: number },
): RcmlLoop {
  return {
    tagName: 'rc-loop',
    id: genId(),
    attributes: {
      'loop-type': 'custom-field',
      'loop-value': String(fieldId),
      ...(options?.maxIterations !== undefined && {
        'loop-max-iterations': options.maxIterations,
      }),
      ...(options?.rangeStart !== undefined && { 'loop-range-start': options.rangeStart }),
      ...(options?.rangeEnd !== undefined && { 'loop-range-end': options.rangeEnd }),
    },
    children: [...children],
  } as unknown as RcmlLoop;
}

// ─── Doc wrapping ───────────────────────────────────────────────────────────

/**
 * Wrap the built body in an `<rcml>` document and run `applyTheme` so
 * the head gets populated (brand-style id, fonts, social links, colour
 * palette) from `theme`. The optional preheader is prepended to the
 * head as an `<rc-preview>` that survives `applyTheme`'s overlay.
 */
export function buildThemedDocument(
  theme: EmailTheme,
  sections: readonly RcmlBodyChild[],
  preheader?: string,
): RcmlDocument {
  const head: RcmlHead = {
    tagName: 'rc-head',
    id: genId(),
    children:
      preheader !== undefined
        ? ([{ tagName: 'rc-preview', id: genId(), content: preheader }] as RcmlHead['children'])
        : [],
  };

  const baseDoc: RcmlDocument = {
    tagName: 'rcml',
    id: genId(),
    children: [
      head,
      { tagName: 'rc-body', id: genId(), children: [...sections] },
    ],
  };

  return applyTheme(baseDoc, theme);
}
