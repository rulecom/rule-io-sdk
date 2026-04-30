/**
 * Generic Email Templates
 *
 * Vertical-agnostic templates that fit any business — newsletters,
 * onboarding, transactional notifications — without e-commerce or
 * hospitality-specific structure.
 *
 * All text and configuration must be provided by the consumer —
 * no hardcoded defaults for any specific business.
 *
 * Note: The footer section defaults to English link text ("View in browser",
 * "Unsubscribe") when no `footer` config is provided. Pass a `footer` object
 * to override with your own locale.
 */

import type { CustomFieldMap, EmailTheme, FooterConfig } from '@rule-io/core';
import {
  createDividerElement,
  createSocialElement,
  createSocialChildElement,
  type RcmlBodyChild,
  type RcmlColumnChild,
  type RcmlDocument,
  type RcmlText,
} from '@rule-io/rcml';
import {
  accentBackground,
  brandHeading,
  brandText,
  buildThemedDocument,
  contentSection,
  ctaSection,
  docWithNodes,
  footerSection,
  greetingSection,
  maybeLogoSection,
  textNode,
  validateRequiredFields,
  withTemplateContext,
} from '@rule-io/rcml';

function dividerSection(): RcmlBodyChild {
  return contentSection([createDividerElement({ attrs: { padding: '10px 0' } })], { padding: '0' });
}

// ============================================================================
// Welcome Email Template
// ============================================================================

export interface WelcomeEmailConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    /** Hero heading rendered on the brand-color banner (e.g. "Welcome!") */
    heading: string;
    greeting: string;
    intro: string;
    ctaButton: string;
    /** Optional heading above the benefits / value-prop list */
    benefitsHeading?: string;
    /**
     * Optional list of benefit bullets rendered as individual rows.
     * Each entry is rendered verbatim as plain text.
     */
    benefits?: string[];
    /** Optional heading above the welcome discount callout */
    discountHeading?: string;
    /** Optional explanatory text above the discount code (e.g. "Use at checkout") */
    discountMessage?: string;
    /**
     * Optional static discount/promo code. Rendered verbatim — this is a
     * fixed welcome code shared with all new subscribers, not a merge field.
     */
    discountCode?: string;
    /** Optional closing / sign-off paragraph rendered after the CTA */
    closing?: string;
  };
  fieldNames: {
    firstName: string;
  };
}

/**
 * Create a welcome email template for new subscribers.
 *
 * Typical trigger: a subscriber opts into the newsletter or signs up for
 * an account. Renders a hero banner, a personalized greeting, optional
 * benefits list, optional welcome discount callout, a CTA button, and
 * social icons when `theme.links` is populated.
 *
 * Vertical-agnostic — pair with any trigger tag (newsletter signup,
 * account creation, form submission, etc.).
 *
 * @example
 * ```typescript
 * const email = createWelcomeEmail({
 *   theme: myEmailTheme,
 *   customFields: { 'Subscriber.FirstName': 169233 },
 *   websiteUrl: 'https://example.com',
 *   text: {
 *     preheader: 'Welcome to the family!',
 *     heading: 'Welcome!',
 *     greeting: 'Hi',
 *     intro: "Thanks for subscribing. We're glad to have you.",
 *     ctaButton: 'Learn More',
 *   },
 *   fieldNames: { firstName: 'Subscriber.FirstName' },
 * });
 * ```
 */
export function createWelcomeEmail(config: WelcomeEmailConfig): RcmlDocument {
  return withTemplateContext('createWelcomeEmail', () => {
    const { theme, customFields, fieldNames, text } = config;

    validateRequiredFields(customFields, { firstName: fieldNames.firstName });

    const socialElements = Object.values(theme.links)
      .filter((link): link is NonNullable<typeof link> => link !== undefined)
      .map((link) => {
        try {
          return createSocialChildElement({
            attrs: { name: link.type, href: link.url },
          });
        } catch {
          return undefined;
        }
      })
      .filter((el): el is NonNullable<typeof el> => el !== undefined);
    const hasSocial = socialElements.length > 0;

    const sections: RcmlBodyChild[] = [
      ...maybeLogoSection(theme),

      // Hero banner — brand-accent background
      contentSection(
        [brandHeading(docWithNodes([textNode(text.heading)]), 1)],
        { padding: '20px 0', backgroundColor: accentBackground(theme) },
      ),

      dividerSection(),

      greetingSection(
        text.greeting,
        text.intro,
        fieldNames.firstName,
        customFields[fieldNames.firstName]!,
      ),
    ];

    const benefits = text.benefits ?? [];

    if (benefits.length > 0) {
      sections.push(dividerSection());
      const benefitRows: RcmlText[] = [];

      if (text.benefitsHeading !== undefined) {
        benefitRows.push(
          brandText(docWithNodes([textNode(text.benefitsHeading)]), { align: 'center' }),
        );
      }

      for (const benefit of benefits) {
        benefitRows.push(
          brandText(docWithNodes([textNode(`• ${benefit}`)]), { align: 'center' }),
        );
      }

      sections.push(contentSection(benefitRows, { padding: '20px 0' }));
    }

    if (text.discountCode !== undefined) {
      sections.push(dividerSection());
      const discountRows: RcmlColumnChild[] = [];

      if (text.discountHeading !== undefined) {
        discountRows.push(brandHeading(docWithNodes([textNode(text.discountHeading)]), 2));
      }

      if (text.discountMessage !== undefined) {
        discountRows.push(
          brandText(docWithNodes([textNode(text.discountMessage)]), { align: 'center' }),
        );
      }

      discountRows.push(brandHeading(docWithNodes([textNode(text.discountCode)]), 2));
      sections.push(
        contentSection(discountRows, {
          padding: '20px 0',
          backgroundColor: accentBackground(theme),
        }),
      );
    }

    sections.push(ctaSection(text.ctaButton, config.websiteUrl));

    if (text.closing !== undefined) {
      sections.push(
        contentSection(
          [brandText(docWithNodes([textNode(text.closing)]), { align: 'center' })],
          { padding: '10px 0' },
        ),
      );
    }

    if (hasSocial) {
      sections.push(
        contentSection(
          [createSocialElement({ attrs: { align: 'center' }, children: socialElements })],
          { padding: '10px 0' },
        ),
      );
    }

    sections.push(footerSection(config.footer));

    return buildThemedDocument(theme, sections, text.preheader);
  });
}
