/**
 * Hospitality Email Templates
 *
 * Pre-built templates for hotels, restaurants, and experiences.
 * These templates build branded RCML bodies and apply the consumer's
 * {@link EmailTheme} via `applyTheme`, which decorates the head with
 * brand-style id, fonts, social links, and the colour palette.
 *
 * All text and configuration must be provided by the consumer —
 * no hardcoded defaults for any specific business.
 *
 * Note: The footer section defaults to English link text ("View in browser",
 * "Unsubscribe") when no `footer` config is provided. Pass a `footer` object
 * to override with your own locale.
 */

import { randomUUID } from 'node:crypto';
import type {
  CustomFieldMap,
  EmailTheme,
  FooterConfig,
} from '@rule-io/core';
import { EmailThemeColorType, RuleConfigError, sanitizeUrl } from '@rule-io/core';
import type {
  Json,
  RcmlBodyChild,
  RcmlButton,
  RcmlDocument,
  RcmlHead,
  RcmlHeading,
  RcmlSection,
  RcmlText,
} from '@rule-io/rcml';
import { applyTheme } from '@rule-io/rcml';

// ============================================================================
// Local RCML helpers — terse replacements for the retired brand-template
// builders. Encode the same `rc-class` / layout conventions the Rule.io
// editor expects so the generated documents keep rendering identically
// once `applyTheme` fills in the head from `config.theme`.
// ============================================================================

function genId(): string {
  return randomUUID();
}

interface PlaceholderNode {
  type: 'placeholder';
  attrs: {
    type: 'CustomField';
    value: number;
    name: string;
    original: string;
    'max-length': string | null;
  };
}
interface TextNode {
  type: 'text';
  text: string;
}
type InlineNode = TextNode | PlaceholderNode;

function textNode(text: string): TextNode {
  return { type: 'text', text };
}

function placeholder(fieldName: string, fieldId: number): PlaceholderNode {
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

function docWithNodes(nodes: readonly InlineNode[]): Json {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [...nodes] }],
  } as unknown as Json;
}

function brandHeading(content: Json, level: 1 | 2 | 3 | 4 = 1): RcmlHeading {
  return {
    tagName: 'rc-heading',
    id: genId(),
    attributes: { 'rc-class': `rcml-h${String(level)}-style` },
    content,
  };
}

function brandText(
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

function brandButton(content: Json, href: string): RcmlButton {
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

function contentSection(
  children: readonly (RcmlHeading | RcmlText | RcmlButton)[],
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

function logoSection(logoUrl: string): RcmlSection {
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

function footerSection(config?: FooterConfig): RcmlSection {
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

/** Zero-or-one-element array containing the logo section. */
function maybeLogoSection(theme: EmailTheme): RcmlBodyChild[] {
  const url = theme.images.logo?.url;

  return url !== undefined && url !== '' ? [logoSection(url)] : [];
}

/** Greeting block = heading with `${greeting}, [firstNamePlaceholder]` + intro paragraph. */
function greetingSection(
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

function ctaSection(label: string, href: string): RcmlSection {
  return contentSection([brandButton(docWithNodes([textNode(label)]), href)]);
}

/**
 * Validate that every logical→rule-io field mapping referenced in
 * `fieldNames` has a matching entry in `customFields`. Undefined entries
 * are skipped (supports optional fields in the config).
 */
function validateRequiredFields(
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
function withTemplateContext<T>(templateName: string, fn: () => T): T {
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
function buildThemedDocument(
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
function accentBackground(theme: EmailTheme): string | undefined {
  return theme.colors[EmailThemeColorType.Secondary]?.hex;
}

// ============================================================================
// Template Configuration
// ============================================================================

export interface ReservationTemplateConfig {
  /** Typed email theme applied to the built document (required) */
  theme: EmailTheme;
  /** Custom field ID mapping (required) */
  customFields: CustomFieldMap;
  /** Website URL for buttons */
  websiteUrl: string;
  /** Footer configuration for localization */
  footer?: FooterConfig;
  /** All display text — fully configurable for localization */
  text: {
    preheader: string;
    greeting: string;
    intro: string;
    detailsHeading: string;
    referenceLabel: string;
    serviceLabel: string;
    roomLabel?: string;
    checkInLabel: string;
    checkOutLabel?: string;
    guestsLabel: string;
    totalPriceLabel?: string;
    currency?: string;
    ctaButton: string;
  };
  /** Field names used in your Rule.io custom fields */
  fieldNames: {
    firstName: string;
    bookingRef: string;
    serviceType: string;
    checkInDate: string;
    checkOutDate?: string;
    totalGuests: string;
    totalPrice?: string;
    roomName?: string;
  };
}

// ============================================================================
// Reservation Confirmation Template
// ============================================================================

/**
 * Create a reservation confirmation email template.
 *
 * @example
 * ```typescript
 * const email = createReservationConfirmationEmail({
 *   theme: myEmailTheme,
 *   customFields: myFields,
 *   websiteUrl: 'https://example.com',
 *   text: { ... },
 *   fieldNames: { ... },
 * });
 * ```
 */
export function createReservationConfirmationEmail(
  config: ReservationTemplateConfig,
): RcmlDocument {
  return withTemplateContext('createReservationConfirmationEmail', () => {
    const { customFields, fieldNames, text, theme } = config;

    validateRequiredFields(customFields, fieldNames);

    const detailRows: RcmlText[] = [
      brandText(
        docWithNodes([
          textNode(`${text.referenceLabel}: `),
          placeholder(fieldNames.bookingRef, customFields[fieldNames.bookingRef]!),
        ]),
      ),
      brandText(
        docWithNodes([
          textNode(`${text.serviceLabel}: `),
          placeholder(fieldNames.serviceType, customFields[fieldNames.serviceType]!),
        ]),
      ),
    ];

    if (fieldNames.roomName !== undefined && text.roomLabel !== undefined) {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.roomLabel}: `),
            placeholder(fieldNames.roomName, customFields[fieldNames.roomName]!),
          ]),
        ),
      );
    }

    detailRows.push(
      brandText(
        docWithNodes([
          textNode(`${text.checkInLabel}: `),
          placeholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]!),
        ]),
      ),
    );

    if (fieldNames.checkOutDate !== undefined && text.checkOutLabel !== undefined) {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.checkOutLabel}: `),
            placeholder(fieldNames.checkOutDate, customFields[fieldNames.checkOutDate]!),
          ]),
        ),
      );
    }

    detailRows.push(
      brandText(
        docWithNodes([
          textNode(`${text.guestsLabel}: `),
          placeholder(fieldNames.totalGuests, customFields[fieldNames.totalGuests]!),
        ]),
      ),
    );

    if (fieldNames.totalPrice !== undefined && text.totalPriceLabel !== undefined) {
      const priceContent: InlineNode[] =
        text.currency !== undefined
          ? [
              textNode(`${text.totalPriceLabel}: `),
              placeholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]!),
              textNode(` ${text.currency}`),
            ]
          : [
              textNode(`${text.totalPriceLabel}: `),
              placeholder(fieldNames.totalPrice, customFields[fieldNames.totalPrice]!),
            ];

      detailRows.push(brandText(docWithNodes(priceContent)));
    }

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),
      greetingSection(
        text.greeting,
        text.intro,
        fieldNames.firstName,
        customFields[fieldNames.firstName]!,
      ),
      contentSection(
        [
          brandHeading(docWithNodes([textNode(text.detailsHeading)]), 2),
          ...detailRows,
        ],
        { padding: '20px 0', backgroundColor: accentBackground(theme) },
      ),
      ctaSection(text.ctaButton, config.websiteUrl),
      footerSection(config.footer),
    ];

    return buildThemedDocument(theme, sections, text.preheader);
  });
}

// ============================================================================
// Reservation Cancellation Template
// ============================================================================

export interface ReservationCancellationConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    heading: string;
    greeting: string;
    message: string;
    referenceLabel: string;
    followUp: string;
    ctaButton: string;
  };
  fieldNames: {
    firstName: string;
    bookingRef: string;
  };
}

/**
 * Create a reservation cancellation email template.
 */
export function createReservationCancellationEmail(
  config: ReservationCancellationConfig,
): RcmlDocument {
  return withTemplateContext('createReservationCancellationEmail', () => {
    const { customFields, fieldNames, text, theme } = config;

    validateRequiredFields(customFields, fieldNames);

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),
      contentSection(
        [
          brandHeading(docWithNodes([textNode(text.heading)]), 1),
          brandText(
            docWithNodes([
              textNode(`${text.greeting} `),
              placeholder(fieldNames.firstName, customFields[fieldNames.firstName]!),
              textNode(','),
            ]),
          ),
          brandText(docWithNodes([textNode(text.message)])),
          brandText(
            docWithNodes([
              textNode(`${text.referenceLabel}: `),
              placeholder(fieldNames.bookingRef, customFields[fieldNames.bookingRef]!),
            ]),
          ),
          brandText(docWithNodes([textNode(text.followUp)])),
        ],
        { padding: '20px 0' },
      ),
      ctaSection(text.ctaButton, config.websiteUrl),
      footerSection(config.footer),
    ];

    return buildThemedDocument(theme, sections, text.preheader);
  });
}

// ============================================================================
// Reservation Reminder Template
// ============================================================================

export interface ReservationReminderConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    intro: string;
    detailsHeading: string;
    dateLabel: string;
    roomLabel?: string;
    practicalInfoHeading?: string;
    practicalInfo?: string;
    ctaButton: string;
  };
  fieldNames: {
    firstName: string;
    checkInDate: string;
    checkOutDate?: string;
    roomName?: string;
  };
}

/**
 * Create a reservation reminder email template.
 */
export function createReservationReminderEmail(
  config: ReservationReminderConfig,
): RcmlDocument {
  return withTemplateContext('createReservationReminderEmail', () => {
    const { customFields, fieldNames, text, theme } = config;

    validateRequiredFields(customFields, fieldNames);

    const detailRows: RcmlText[] = [];

    if (fieldNames.checkOutDate !== undefined) {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.dateLabel}: `),
            placeholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]!),
            textNode(' - '),
            placeholder(fieldNames.checkOutDate, customFields[fieldNames.checkOutDate]!),
          ]),
        ),
      );
    } else {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.dateLabel}: `),
            placeholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]!),
          ]),
        ),
      );
    }

    if (fieldNames.roomName !== undefined && text.roomLabel !== undefined) {
      detailRows.push(
        brandText(
          docWithNodes([
            textNode(`${text.roomLabel}: `),
            placeholder(fieldNames.roomName, customFields[fieldNames.roomName]!),
          ]),
        ),
      );
    }

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),
      greetingSection(
        text.greeting,
        text.intro,
        fieldNames.firstName,
        customFields[fieldNames.firstName]!,
      ),
      contentSection(
        [
          brandHeading(docWithNodes([textNode(text.detailsHeading)]), 2),
          ...detailRows,
        ],
        { padding: '20px 0', backgroundColor: accentBackground(theme) },
      ),
    ];

    if (text.practicalInfoHeading !== undefined && text.practicalInfo !== undefined) {
      sections.push(
        contentSection(
          [
            brandHeading(docWithNodes([textNode(text.practicalInfoHeading)]), 3),
            brandText(docWithNodes([textNode(text.practicalInfo)])),
            brandButton(docWithNodes([textNode(text.ctaButton)]), config.websiteUrl),
          ],
          { padding: '20px 0' },
        ),
      );
    } else {
      sections.push(ctaSection(text.ctaButton, config.websiteUrl));
    }

    sections.push(footerSection(config.footer));

    return buildThemedDocument(theme, sections, text.preheader);
  });
}

// ============================================================================
// Feedback Request Template
// ============================================================================

export interface FeedbackRequestConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  feedbackUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    message: string;
    ctaButton: string;
  };
  fieldNames: {
    firstName: string;
  };
}

/**
 * Create a feedback/review request email template.
 * Works for post-stay, post-purchase, or any review request.
 */
export function createFeedbackRequestEmail(config: FeedbackRequestConfig): RcmlDocument {
  return withTemplateContext('createFeedbackRequestEmail', () => {
    const { customFields, fieldNames, text, theme } = config;

    validateRequiredFields(customFields, fieldNames);

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),
      greetingSection(
        text.greeting,
        text.message,
        fieldNames.firstName,
        customFields[fieldNames.firstName]!,
      ),
      ctaSection(text.ctaButton, config.feedbackUrl),
      footerSection(config.footer),
    ];

    return buildThemedDocument(theme, sections, text.preheader);
  });
}

// ============================================================================
// Reservation Request (Pending) Template
// ============================================================================

export interface ReservationRequestConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    message: string;
    detailsHeading: string;
    referenceLabel: string;
    dateLabel: string;
    guestsLabel: string;
  };
  fieldNames: {
    firstName: string;
    bookingRef: string;
    checkInDate: string;
    checkOutDate?: string;
    totalGuests: string;
  };
}

/**
 * Create a reservation request confirmation email (for pending/manual approval flows).
 */
export function createReservationRequestEmail(
  config: ReservationRequestConfig,
): RcmlDocument {
  return withTemplateContext('createReservationRequestEmail', () => {
    const { customFields, fieldNames, text, theme } = config;

    validateRequiredFields(customFields, fieldNames);

    const dateContent: InlineNode[] =
      fieldNames.checkOutDate !== undefined
        ? [
            textNode(`${text.dateLabel}: `),
            placeholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]!),
            textNode(' - '),
            placeholder(fieldNames.checkOutDate, customFields[fieldNames.checkOutDate]!),
          ]
        : [
            textNode(`${text.dateLabel}: `),
            placeholder(fieldNames.checkInDate, customFields[fieldNames.checkInDate]!),
          ];

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),
      greetingSection(
        text.greeting,
        text.message,
        fieldNames.firstName,
        customFields[fieldNames.firstName]!,
      ),
      contentSection(
        [
          brandHeading(docWithNodes([textNode(text.detailsHeading)]), 2),
          brandText(
            docWithNodes([
              textNode(`${text.referenceLabel}: `),
              placeholder(fieldNames.bookingRef, customFields[fieldNames.bookingRef]!),
            ]),
          ),
          brandText(docWithNodes(dateContent)),
          brandText(
            docWithNodes([
              textNode(`${text.guestsLabel}: `),
              placeholder(fieldNames.totalGuests, customFields[fieldNames.totalGuests]!),
            ]),
          ),
        ],
        { padding: '20px 0', backgroundColor: accentBackground(theme) },
      ),
      footerSection(config.footer),
    ];

    return buildThemedDocument(theme, sections, text.preheader);
  });
}
