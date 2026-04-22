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

import type { RCMLBodyChild, RCMLColumnChild, RCMLDocument, RCMLText } from '../types';
import {
  createBrandTemplate,
  createBrandHeading,
  createBrandText,
  createContentSection,
  createFooterSection,
  createTextNode,
  createDocWithPlaceholders,
  createLogoSection,
  createGreetingSection,
  createCtaSection,
  type BrandStyleConfig,
  type CustomFieldMap,
  type FooterConfig,
  validateCustomFields,
  withTemplateContext,
} from './brand-template';
import { createDivider, createSocial, createSocialElement } from './elements';

function dividerSection(): RCMLBodyChild {
  return createContentSection([createDivider({ padding: '10px 0' })], { padding: '0' });
}

// ============================================================================
// Welcome Email Template
// ============================================================================

export interface WelcomeEmailConfig {
  brandStyle: BrandStyleConfig;
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
 * social icons when `brandStyle.socialLinks` is configured.
 *
 * Vertical-agnostic — pair with any trigger tag (newsletter signup,
 * account creation, form submission, etc.).
 *
 * @example
 * ```typescript
 * const email = createWelcomeEmail({
 *   brandStyle: myBrandStyle,
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
export function createWelcomeEmail(config: WelcomeEmailConfig): RCMLDocument {
  const templateName = 'createWelcomeEmail';

  return withTemplateContext(templateName, () => {
    const { brandStyle, customFields, fieldNames, text } = config;

    validateCustomFields(customFields, {
      firstName: fieldNames.firstName,
    });

    const socialLinks = brandStyle.socialLinks ?? [];
    const socialElements = socialLinks
      .map((link) => {
        try {
          return createSocialElement({ name: link.name, href: link.href });
        } catch {
          return undefined;
        }
      })
      .filter((el): el is NonNullable<typeof el> => !!el);
    const hasSocial = socialElements.length > 0;

    const sections: RCMLBodyChild[] = [
      ...createLogoSection(brandStyle.logoUrl),

      // Hero banner — brand background
      createContentSection(
        [createBrandHeading(createDocWithPlaceholders([createTextNode(text.heading)]), 1)],
        { padding: '20px 0', backgroundColor: brandStyle.brandColor }
      ),

      dividerSection(),

      createGreetingSection(
        text.greeting,
        text.intro,
        fieldNames.firstName,
        customFields[fieldNames.firstName]
      ),
    ];

    const benefits = text.benefits ?? [];
    if (benefits.length > 0) {
      sections.push(dividerSection());
      const benefitRows: RCMLText[] = [];
      if (text.benefitsHeading) {
        benefitRows.push(
          createBrandText(
            createDocWithPlaceholders([createTextNode(text.benefitsHeading)]),
            { align: 'center' }
          )
        );
      }
      for (const benefit of benefits) {
        benefitRows.push(
          createBrandText(
            createDocWithPlaceholders([createTextNode(`• ${benefit}`)]),
            { align: 'center' }
          )
        );
      }
      sections.push(createContentSection(benefitRows, { padding: '20px 0' }));
    }

    if (text.discountCode) {
      sections.push(dividerSection());
      const discountRows: RCMLColumnChild[] = [];
      if (text.discountHeading) {
        discountRows.push(
          createBrandHeading(
            createDocWithPlaceholders([createTextNode(text.discountHeading)]),
            2
          )
        );
      }
      if (text.discountMessage) {
        discountRows.push(
          createBrandText(
            createDocWithPlaceholders([createTextNode(text.discountMessage)]),
            { align: 'center' }
          )
        );
      }
      discountRows.push(
        createBrandHeading(
          createDocWithPlaceholders([createTextNode(text.discountCode)]),
          2
        )
      );
      sections.push(
        createContentSection(discountRows, {
          padding: '20px 0',
          backgroundColor: brandStyle.brandColor,
        })
      );
    }

    sections.push(createCtaSection(text.ctaButton, config.websiteUrl));

    if (text.closing) {
      sections.push(
        createContentSection(
          [
            createBrandText(
              createDocWithPlaceholders([createTextNode(text.closing)]),
              { align: 'center' }
            ),
          ],
          { padding: '10px 0' }
        )
      );
    }

    if (hasSocial) {
      sections.push(
        createContentSection([createSocial(socialElements, { align: 'center' })], {
          padding: '10px 0',
        })
      );
    }

    sections.push(createFooterSection(config.footer));

    return createBrandTemplate({
      brandStyle: brandStyle,
      preheader: text.preheader,
      sections,
    });
  });
}
