/**
 * Brand-typed RCML element helpers for templates that render against an
 * {@link EmailTheme}.
 *
 * Terse shorthands that encode the `rc-class` / layout conventions the
 * Rule.io editor expects so generated documents render identically once
 * `applyTheme` decorates the head from a consumer-supplied theme.
 *
 * Consumed by the `@rule-io/vendor-*` packages and the `@rule-io/cli`
 * validate-rcml / deploy commands.
 *
 * @public
 */

import { randomUUID } from 'node:crypto'
import type { EmailTheme, FooterConfig, CustomFieldMap } from '@rule-io/core'
import { EmailThemeColorType, RuleConfigError, sanitizeUrl } from '@rule-io/core'

import { applyTheme } from './apply-theme.js'
import type {
  Json,
} from './validate-rcml-json.js'
import type {
  RcmlBodyChild,
  RcmlButton,
  RcmlColumnChild,
  RcmlDocument,
  RcmlHead,
  RcmlHeading,
  RcmlLoop,
  RcmlSection,
  RcmlText,
} from './rcml-types.js'

// ─── Inline nodes ───────────────────────────────────────────────────────────

export interface BrandPlaceholderNode {
  type: 'placeholder';
  attrs: {
    type: 'CustomField';
    value: number;
    name: string;
    original: string;
    'max-length': string | null;
  };
}
export interface BrandLoopValueNode {
  type: 'loop-value';
  attrs: { original: string; value: string; index: string };
}
export interface BrandTextNode {
  type: 'text';
  text: string;
}
export type BrandInlineNode = BrandTextNode | BrandPlaceholderNode | BrandLoopValueNode;

export function genId(): string {
  return randomUUID();
}

export function textNode(text: string): BrandTextNode {
  return { type: 'text', text };
}

export function placeholder(fieldName: string, fieldId: number): BrandPlaceholderNode {
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

export function loopFieldPlaceholder(jsonKey: string): BrandLoopValueNode {
  return {
    type: 'loop-value',
    attrs: {
      original: `[LoopValue:${jsonKey}]`,
      value: jsonKey,
      index: jsonKey,
    },
  };
}

export function docWithNodes(nodes: readonly BrandInlineNode[]): Json {
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
    throw new RuleConfigError('createBrandButton: invalid or unsafe URL');
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
    throw new RuleConfigError('createBrandLogo: invalid or unsafe logoUrl');
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

export function maybeLogoSection(theme: EmailTheme): RcmlBodyChild[] {
  const url = theme.images.logo?.url;

  return url !== undefined && url !== '' ? [logoSection(url)] : [];
}

export function greetingSection(
  greeting: string,
  intro: string,
  firstNameField: string,
  firstNameId: number,
): RcmlSection {
  return contentSection([
    brandHeading(
      docWithNodes([textNode(`${greeting}, `), placeholder(firstNameField, firstNameId)]),
      1,
    ),
    brandText(docWithNodes([textNode(intro)])),
  ]);
}

export function ctaSection(label: string, href: string): RcmlSection {
  return contentSection([brandButton(docWithNodes([textNode(label)]), href)]);
}

/**
 * Filter falsy entries and wrap the rest in one `rc-section > rc-column`
 * block. Returns `undefined` when nothing remains.
 */
export function summaryRowsSection(
  rows: Array<RcmlText | undefined | false | null>,
  options?: { padding?: string; backgroundColor?: string },
): RcmlSection | undefined {
  const kept = rows.filter((r): r is RcmlText => Boolean(r));

  if (kept.length === 0) return undefined;

  return contentSection(kept, options);
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

/**
 * Brand-aware `rc-loop` element that iterates over a repeatable custom
 * field.
 */
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

// ─── Status tracker ─────────────────────────────────────────────────────────

export interface StatusTrackerStep {
  /** Label shown inside the step column (e.g. "Confirmed", "Shipped") */
  readonly label: string;
}

export interface StatusTrackerSectionOptions {
  /** Ordered list of steps. Typically 2-4 entries. */
  readonly steps: readonly StatusTrackerStep[];
  /**
   * Zero-based index of the currently-active step. Steps at or below
   * `activeIndex` are highlighted; later steps use the neutral
   * background.
   */
  readonly activeIndex: number;
  /** Theme driving active / inactive colours. */
  readonly theme: EmailTheme;
  /** Section padding (default: '10px 0'). */
  readonly padding?: string;
}

/**
 * Horizontal multi-column status tracker. Equal-width columns with
 * highlighted styling for steps at or below `activeIndex`. Falls back
 * to neutral colour values when the theme does not carry them.
 */
export function statusTrackerSection(options: StatusTrackerSectionOptions): RcmlBodyChild {
  const { steps, activeIndex, theme } = options;

  if (steps.length === 0) {
    throw new RuleConfigError('createStatusTrackerSection: steps must not be empty');
  }

  if (steps.length > 4) {
    throw new RuleConfigError(
      'createStatusTrackerSection: steps must contain at most 4 items (RcmlSection supports up to 4 columns)',
    );
  }

  if (activeIndex < 0 || activeIndex >= steps.length) {
    throw new RuleConfigError(
      `createStatusTrackerSection: activeIndex ${String(activeIndex)} is out of range [0, ${String(steps.length - 1)}]`,
    );
  }

  const baseWidth = Math.floor(100 / steps.length);
  const remainder = 100 - baseWidth * steps.length;
  const activeBg = theme.colors[EmailThemeColorType.Primary]?.hex ?? '#0066CC';
  const inactiveBg = theme.colors[EmailThemeColorType.Secondary]?.hex ?? '#F3F3F3';
  const activeFg = '#FFFFFF';
  const inactiveFg = '#333333';

  const columns = steps.map((step, idx) => {
    const widthPercent = `${String(baseWidth + (idx === 0 ? remainder : 0))}%`;
    const isActive = idx <= activeIndex;
    const bg = isActive ? activeBg : inactiveBg;
    const fg = isActive ? activeFg : inactiveFg;

    return {
      tagName: 'rc-column',
      id: genId(),
      attributes: {
        width: widthPercent,
        'background-color': bg,
        padding: '14px 8px',
        'vertical-align': 'middle',
      },
      children: [
        {
          tagName: 'rc-text',
          id: genId(),
          attributes: { align: 'center', 'rc-class': 'rcml-p-style' },
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
                      { type: 'font', attrs: { color: fg, 'font-weight': '700' } },
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
    id: genId(),
    attributes: { padding: options.padding ?? '10px 0' },
    children: columns,
  } as unknown as RcmlSection;
}

// ─── Address block ──────────────────────────────────────────────────────────

export interface AddressBlockOptions {
  /** Pre-built ProseMirror docs — one per visible line. */
  readonly lines: readonly Json[];
  /** Optional heading rendered above the lines (level 4). */
  readonly heading?: string;
  /** Section padding (default: '10px 0'). */
  readonly padding?: string;
  /** Section background color override. */
  readonly backgroundColor?: string;
}

/**
 * Stacked address / multi-line detail block. Callers assemble the
 * visible lines as ProseMirror docs (via {@link docWithNodes}) and
 * pass them in. Returns `undefined` when `lines` is empty.
 */
export function addressBlock(options: AddressBlockOptions): RcmlBodyChild | undefined {
  if (options.lines.length === 0) return undefined;

  const children: RcmlColumnChild[] = [];

  if (options.heading !== undefined) {
    children.push(brandHeading(docWithNodes([textNode(options.heading)]), 4));
  }

  for (const doc of options.lines) {
    children.push(brandText(doc));
  }

  return contentSection(children, {
    padding: options.padding ?? '10px 0',
    ...(options.backgroundColor !== undefined && { backgroundColor: options.backgroundColor }),
  });
}

// ─── Validation + doc wrapping ──────────────────────────────────────────────

/**
 * Require every `fieldNames` logical→rule-io mapping to be present in
 * `customFields`. Throws `RuleConfigError` listing the missing entries.
 */
export function validateRequiredFields(
  customFields: CustomFieldMap,
  fieldNames: Record<string, string | undefined>,
): void {
  const missing: string[] = [];

  for (const [logical, fieldName] of Object.entries(fieldNames)) {
    if (fieldName !== undefined && customFields[fieldName] === undefined) {
      missing.push(`${logical} (mapped to "${fieldName}")`);
    }
  }

  if (missing.length > 0) {
    throw new RuleConfigError(
      `missing customFields entries: ${missing.join(', ')}`,
    );
  }
}

/**
 * Wrap errors thrown by `fn` with a template-name prefix so callers can
 * correlate failures with the builder that triggered them.
 */
export function withTemplateContext<T>(templateName: string, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof RuleConfigError) {
      throw new RuleConfigError(`${templateName} > ${err.message}`);
    }

    throw err;
  }
}

/**
 * Wrap the built body in an `<rcml>` document and run `applyTheme` so the
 * head gets populated (brand-style id, fonts, social links, colour
 * palette) from `theme`. The optional preheader is prepended to the head
 * as an `<rc-preview>` that survives `applyTheme`'s overlay.
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

/** Convenience: the theme's Secondary colour slot used as accent-section background. */
export function accentBackground(theme: EmailTheme): string | undefined {
  return theme.colors[EmailThemeColorType.Secondary]?.hex;
}
