/**
 * Samfora Automation Definitions
 *
 * Swedish charitable-donation automations for the Samfora platform.
 * Each automation assembles its RCML document inline from the generic
 * brand-template helpers — no vertical-specific template builders exist
 * for donations, and the user chose "reuse generic templates only".
 *
 * Default copy ships in Swedish to match Samfora's market. Consumers can
 * still override any field value via the merged `TemplateConfigV2`.
 */

import type { VendorAutomation, VendorConsumerConfig } from '../types';
import type { RCMLDocument, RCMLBodyChild } from '../../types';
import type { CustomFieldMap, FooterConfig } from '../../rcml';
import { SAMFORA_FIELDS } from './fields';
import { SAMFORA_TAGS } from './tags';
import {
  createBrandTemplate,
  createContentSection,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createDocWithPlaceholders,
  createPlaceholder,
  createTextNode,
  createFooterSection,
  validateCustomFields,
} from '../../rcml';
// `createLogoSection` is an internal helper (not in the barrel) shared by
// hospitality/ecommerce templates. Imported directly to keep the Samfora
// preset consistent with those builders — every other preset's emails lead
// with the account logo, and earlier this preset was silently missing it.
import { createLogoSection } from '../../rcml/brand-template';
import { RuleConfigError } from '../../errors';

// ============================================================================
// Swedish copy fixtures
// ============================================================================

interface DonationConfirmationText {
  readonly preheader: string;
  readonly heading: string;
  readonly intro: string;
  readonly detailsHeading: string;
  readonly amountLabel: string;
  readonly causeLabel: string;
  readonly dateLabel: string;
  readonly referenceLabel: string;
  readonly ctaButton: string;
  readonly signOff: string;
}

const DONATION_CONFIRMATION_FIRST_TEXT: DonationConfirmationText = {
  preheader: 'Tack för din första gåva!',
  heading: 'Tack för din första gåva',
  intro:
    'Din gåva har tagits emot. 100 % av beloppet går direkt till det ändamål du har valt.',
  detailsHeading: 'Gåvans detaljer',
  amountLabel: 'Belopp',
  causeLabel: 'Ändamål',
  dateLabel: 'Datum',
  referenceLabel: 'Referens',
  ctaButton: 'Se mitt konto',
  signOff: 'Varmt välkommen till Samfora — vi är glada att ha dig med oss.',
} as const;

const DONATION_CONFIRMATION_SECOND_TEXT: DonationConfirmationText = {
  preheader: 'Tack för att du ger igen!',
  heading: 'Tack för att du ger igen',
  intro:
    'Det betyder mycket att du väljer att ge en gång till. Din gåva är mottagen och går oavkortat till det ändamål du valt.',
  detailsHeading: 'Gåvans detaljer',
  amountLabel: 'Belopp',
  causeLabel: 'Ändamål',
  dateLabel: 'Datum',
  referenceLabel: 'Referens',
  ctaButton: 'Se mitt konto',
  signOff: 'Tack för att du fortsätter göra skillnad.',
} as const;

const DONATION_CONFIRMATION_RETURNING_TEXT: DonationConfirmationText = {
  preheader: 'Ännu en gåva som gör skillnad',
  heading: 'Ännu en gåva som gör skillnad',
  intro:
    'Tack för ditt fortsatta stöd. Din gåva har mottagits och går direkt till det ändamål du valt.',
  detailsHeading: 'Gåvans detaljer',
  amountLabel: 'Belopp',
  causeLabel: 'Ändamål',
  dateLabel: 'Datum',
  referenceLabel: 'Referens',
  ctaButton: 'Se mitt konto',
  signOff: 'Det är tack vare givare som du som vi kan fortsätta vårt arbete.',
} as const;

const MONTHLY_DONATION_TEXT = {
  preheader: 'Din månadsgåva är mottagen',
  heading: 'Månadsgåva mottagen',
  intro:
    'Din månadsgåva har dragits och skickats vidare till det ändamål du har valt. Tack för att du ger regelbundet.',
  detailsHeading: 'Gåvans detaljer',
  amountLabel: 'Belopp',
  causeLabel: 'Ändamål',
  dateLabel: 'Dragningsdatum',
  referenceLabel: 'Referens',
  ctaButton: 'Hantera månadsgåva',
  signOff: 'Tack för att du är månadsgivare hos Samfora.',
} as const;

const WELCOME_TEXT = {
  preheader: 'Välkommen till Samfora',
  heading: 'Välkommen till Samfora',
  intro:
    'Kul att du är här! Samfora är ditt konto för ditt givande — samla dina gåvor, följ dina ändamål och bidra till en värld som mår bättre.',
  listHeading: 'Så här kommer du igång',
  stepOne: 'Välj ett ändamål som berör dig.',
  stepTwo: 'Ge en engångsgåva eller starta ett månadsgivande.',
  stepThree: 'Följ effekten av ditt givande från ditt konto.',
  ctaButton: 'Utforska ändamål',
  signOff: 'Varmt välkommen — vi ses på plattformen.',
} as const;

const TAX_SUMMARY_TEXT = {
  preheader: 'Din gåvosammanställning för skatteavdrag',
  heading: 'Din gåvosammanställning',
  intro:
    'Här är en sammanställning av dina gåvor under året. Du kan använda den för att göra skatteavdrag för gåvor i din deklaration.',
  detailsHeading: 'Sammanställning',
  yearLabel: 'Skatteår',
  totalLabel: 'Totalt givet',
  deductibleLabel: 'Avdragsgillt belopp',
  ctaButton: 'Ladda ner kvitto',
  disclaimer:
    'Vi rapporterar dina gåvor till Skatteverket enligt gällande regler för gåvoskatteavdrag.',
  signOff: 'Tack för ditt engagemang under året.',
} as const;

// ============================================================================
// Placeholder helper
// ============================================================================

/**
 * Look up a placeholder for a field name, throwing if it isn't mapped.
 * Callers should pre-validate with `validateCustomFields`; this is a
 * defensive backstop so the non-null assertion doesn't appear inline.
 */
function fieldPlaceholder(customFields: CustomFieldMap, fieldName: string) {
  const id = customFields[fieldName];
  if (id === undefined) {
    throw new RuleConfigError(
      `samfora: missing customFields entry for "${fieldName}"`,
    );
  }
  return createPlaceholder(fieldName, id);
}

// ============================================================================
// Footer (Swedish defaults)
// ============================================================================

/**
 * Swedish footer text defaults. `createFooterSection()` ships with English
 * link text as its own default — without these, an out-of-the-box Samfora
 * email mixes Swedish body copy with English footer links, which conflicts
 * with the preset's stated Swedish-first intent.
 *
 * Consumer overrides still win per-field because `config.footer` is
 * spread after the defaults.
 */
const SAMFORA_FOOTER_DEFAULTS: FooterConfig = {
  viewInBrowserText: 'Öppna i webbläsare',
  unsubscribeText: 'Avregistrera',
};

function samforaFooterSection(override: FooterConfig | undefined): RCMLBodyChild {
  return createFooterSection({ ...SAMFORA_FOOTER_DEFAULTS, ...override });
}

/**
 * Swedish plain-text fallback. `createBrandHead()` otherwise defaults to
 * English ("View this email in your browser: ..." / "Unsubscribe: ...") —
 * same class of leak as the footer links. Passed explicitly into every
 * `createBrandTemplate` call below.
 */
const SAMFORA_PLAIN_TEXT =
  'Öppna e-postmeddelandet i webbläsaren: %Link:WebBrowser%\n\n---\nAvregistrera: %Link:Unsubscribe%';

// ============================================================================
// Shared section builders
// ============================================================================

/**
 * Build a labelled summary row (label on one line, value placeholder below).
 * Kept simple for readability — one row renders as two short paragraphs.
 */
function summaryRow(label: string, valueContent: ReturnType<typeof createDocWithPlaceholders>): RCMLBodyChild {
  return createContentSection([
    createBrandText(
      createDocWithPlaceholders([createTextNode(label)]),
      { padding: '8px 0 2px 0' },
    ),
    createBrandText(valueContent, { padding: '0 0 8px 0' }),
  ]);
}

function greetingSection(
  greeting: string,
  firstNameId: number,
): RCMLBodyChild {
  return createContentSection([
    createBrandHeading(
      createDocWithPlaceholders([
        createTextNode(`${greeting}, `),
        createPlaceholder(SAMFORA_FIELDS.donorFirstName, firstNameId),
      ]),
      1,
    ),
  ]);
}

function paragraphSection(text: string): RCMLBodyChild {
  return createContentSection([
    createBrandText(createDocWithPlaceholders([createTextNode(text)])),
  ]);
}

function ctaSection(label: string, href: string): RCMLBodyChild {
  return createContentSection([
    createBrandButton(
      createDocWithPlaceholders([createTextNode(label)]),
      href,
    ),
  ]);
}

// ============================================================================
// Template builders
// ============================================================================

function buildDonationConfirmationTemplate(
  config: VendorConsumerConfig,
  text: DonationConfirmationText,
): RCMLDocument {
  validateCustomFields(
    config.customFields,
    {
      donorFirstName: SAMFORA_FIELDS.donorFirstName,
      donationAmount: SAMFORA_FIELDS.donationAmount,
      donationDate: SAMFORA_FIELDS.donationDate,
      donationRef: SAMFORA_FIELDS.donationRef,
      causeName: SAMFORA_FIELDS.causeName,
    },
    'samforaDonationConfirmation',
  );

  const cf = config.customFields;
  const firstNameId = cf[SAMFORA_FIELDS.donorFirstName];

  const sections: RCMLBodyChild[] = [
    ...createLogoSection(config.brandStyle.logoUrl),
    greetingSection(text.heading, firstNameId),
    paragraphSection(text.intro),
    createContentSection([
      createBrandHeading(
        createDocWithPlaceholders([createTextNode(text.detailsHeading)]),
        3,
      ),
    ]),
    summaryRow(
      text.amountLabel,
      createDocWithPlaceholders([
        fieldPlaceholder(cf, SAMFORA_FIELDS.donationAmount),
        ...(cf[SAMFORA_FIELDS.donationCurrency] !== undefined
          ? [
              createTextNode(' '),
              fieldPlaceholder(cf, SAMFORA_FIELDS.donationCurrency),
            ]
          : []),
      ]),
    ),
    summaryRow(
      text.causeLabel,
      createDocWithPlaceholders([fieldPlaceholder(cf, SAMFORA_FIELDS.causeName)]),
    ),
    summaryRow(
      text.dateLabel,
      createDocWithPlaceholders([fieldPlaceholder(cf, SAMFORA_FIELDS.donationDate)]),
    ),
    summaryRow(
      text.referenceLabel,
      createDocWithPlaceholders([fieldPlaceholder(cf, SAMFORA_FIELDS.donationRef)]),
    ),
    ctaSection(text.ctaButton, config.websiteUrl),
    paragraphSection(text.signOff),
    samforaFooterSection(config.footer),
  ];

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: text.preheader,
    plainText: SAMFORA_PLAIN_TEXT,
    sections,
  });
}

function buildMonthlyDonationTemplate(config: VendorConsumerConfig): RCMLDocument {
  validateCustomFields(
    config.customFields,
    {
      donorFirstName: SAMFORA_FIELDS.donorFirstName,
      donationAmount: SAMFORA_FIELDS.donationAmount,
      donationDate: SAMFORA_FIELDS.donationDate,
      donationRef: SAMFORA_FIELDS.donationRef,
      causeName: SAMFORA_FIELDS.causeName,
    },
    'samforaMonthlyDonation',
  );

  const cf = config.customFields;
  const firstNameId = cf[SAMFORA_FIELDS.donorFirstName];
  const t = MONTHLY_DONATION_TEXT;

  const sections: RCMLBodyChild[] = [
    ...createLogoSection(config.brandStyle.logoUrl),
    greetingSection(t.heading, firstNameId),
    paragraphSection(t.intro),
    createContentSection([
      createBrandHeading(
        createDocWithPlaceholders([createTextNode(t.detailsHeading)]),
        3,
      ),
    ]),
    summaryRow(
      t.amountLabel,
      createDocWithPlaceholders([
        fieldPlaceholder(cf, SAMFORA_FIELDS.donationAmount),
        ...(cf[SAMFORA_FIELDS.donationCurrency] !== undefined
          ? [
              createTextNode(' '),
              fieldPlaceholder(cf, SAMFORA_FIELDS.donationCurrency),
            ]
          : []),
      ]),
    ),
    summaryRow(
      t.causeLabel,
      createDocWithPlaceholders([fieldPlaceholder(cf, SAMFORA_FIELDS.causeName)]),
    ),
    summaryRow(
      t.dateLabel,
      createDocWithPlaceholders([fieldPlaceholder(cf, SAMFORA_FIELDS.donationDate)]),
    ),
    summaryRow(
      t.referenceLabel,
      createDocWithPlaceholders([fieldPlaceholder(cf, SAMFORA_FIELDS.donationRef)]),
    ),
    ctaSection(t.ctaButton, config.websiteUrl),
    paragraphSection(t.signOff),
    samforaFooterSection(config.footer),
  ];

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: t.preheader,
    plainText: SAMFORA_PLAIN_TEXT,
    sections,
  });
}

function buildWelcomeTemplate(config: VendorConsumerConfig): RCMLDocument {
  validateCustomFields(
    config.customFields,
    { donorFirstName: SAMFORA_FIELDS.donorFirstName },
    'samforaWelcome',
  );

  const firstNameId = config.customFields[SAMFORA_FIELDS.donorFirstName];
  const t = WELCOME_TEXT;

  const sections: RCMLBodyChild[] = [
    ...createLogoSection(config.brandStyle.logoUrl),
    greetingSection(t.heading, firstNameId),
    paragraphSection(t.intro),
    createContentSection([
      createBrandHeading(
        createDocWithPlaceholders([createTextNode(t.listHeading)]),
        3,
      ),
      createBrandText(createDocWithPlaceholders([createTextNode(`1. ${t.stepOne}`)])),
      createBrandText(createDocWithPlaceholders([createTextNode(`2. ${t.stepTwo}`)])),
      createBrandText(createDocWithPlaceholders([createTextNode(`3. ${t.stepThree}`)])),
    ]),
    ctaSection(t.ctaButton, config.websiteUrl),
    paragraphSection(t.signOff),
    samforaFooterSection(config.footer),
  ];

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: t.preheader,
    plainText: SAMFORA_PLAIN_TEXT,
    sections,
  });
}

function buildTaxSummaryTemplate(config: VendorConsumerConfig): RCMLDocument {
  validateCustomFields(
    config.customFields,
    {
      donorFirstName: SAMFORA_FIELDS.donorFirstName,
      taxYear: SAMFORA_FIELDS.taxYear,
      totalLifetimeAmount: SAMFORA_FIELDS.totalLifetimeAmount,
      taxDeductibleAmount: SAMFORA_FIELDS.taxDeductibleAmount,
    },
    'samforaTaxSummary',
  );

  const cf = config.customFields;
  const firstNameId = cf[SAMFORA_FIELDS.donorFirstName];
  const t = TAX_SUMMARY_TEXT;

  const sections: RCMLBodyChild[] = [
    ...createLogoSection(config.brandStyle.logoUrl),
    greetingSection(t.heading, firstNameId),
    paragraphSection(t.intro),
    createContentSection([
      createBrandHeading(
        createDocWithPlaceholders([createTextNode(t.detailsHeading)]),
        3,
      ),
    ]),
    summaryRow(
      t.yearLabel,
      createDocWithPlaceholders([fieldPlaceholder(cf, SAMFORA_FIELDS.taxYear)]),
    ),
    summaryRow(
      t.totalLabel,
      createDocWithPlaceholders([
        fieldPlaceholder(cf, SAMFORA_FIELDS.totalLifetimeAmount),
        ...(cf[SAMFORA_FIELDS.donationCurrency] !== undefined
          ? [
              createTextNode(' '),
              fieldPlaceholder(cf, SAMFORA_FIELDS.donationCurrency),
            ]
          : []),
      ]),
    ),
    summaryRow(
      t.deductibleLabel,
      createDocWithPlaceholders([
        fieldPlaceholder(cf, SAMFORA_FIELDS.taxDeductibleAmount),
        ...(cf[SAMFORA_FIELDS.donationCurrency] !== undefined
          ? [
              createTextNode(' '),
              fieldPlaceholder(cf, SAMFORA_FIELDS.donationCurrency),
            ]
          : []),
      ]),
    ),
    paragraphSection(t.disclaimer),
    ctaSection(t.ctaButton, config.websiteUrl),
    paragraphSection(t.signOff),
    samforaFooterSection(config.footer),
  ];

  return createBrandTemplate({
    brandStyle: config.brandStyle,
    preheader: t.preheader,
    plainText: SAMFORA_PLAIN_TEXT,
    sections,
  });
}

// ============================================================================
// Automation definitions
// ============================================================================

/**
 * Create the full set of Samfora automation definitions.
 *
 * Three donation-confirmation variants are differentiated by
 * `conditions.hasTag` against donor-lifecycle tags — same pattern as
 * `shopify-abandoned-cart` uses `conditions.notHasTag`.
 */
export function createSamforaAutomations(): VendorAutomation[] {
  return [
    {
      id: 'samfora-donation-confirmation-first',
      name: 'Samfora Donation Confirmation (first gift)',
      description:
        'Sent to first-time donors after a one-time donation is received',
      triggerTag: SAMFORA_TAGS.donationReceived,
      conditions: { hasTag: [SAMFORA_TAGS.donorFirstGift] },
      subject: 'Tack för din första gåva!',
      preheader: DONATION_CONFIRMATION_FIRST_TEXT.preheader,
      templateBuilder: (config) =>
        buildDonationConfirmationTemplate(config, DONATION_CONFIRMATION_FIRST_TEXT),
    },
    {
      id: 'samfora-donation-confirmation-second',
      name: 'Samfora Donation Confirmation (second gift)',
      description:
        'Sent to returning donors making their second one-time donation',
      triggerTag: SAMFORA_TAGS.donationReceived,
      conditions: { hasTag: [SAMFORA_TAGS.donorSecondGift] },
      subject: 'Tack för att du ger igen!',
      preheader: DONATION_CONFIRMATION_SECOND_TEXT.preheader,
      templateBuilder: (config) =>
        buildDonationConfirmationTemplate(config, DONATION_CONFIRMATION_SECOND_TEXT),
    },
    {
      id: 'samfora-donation-confirmation-returning',
      name: 'Samfora Donation Confirmation (returning donor)',
      description:
        'Sent to loyal donors on their third or later one-time donation',
      triggerTag: SAMFORA_TAGS.donationReceived,
      conditions: { hasTag: [SAMFORA_TAGS.donorReturning] },
      subject: 'Tack för din gåva',
      preheader: DONATION_CONFIRMATION_RETURNING_TEXT.preheader,
      templateBuilder: (config) =>
        buildDonationConfirmationTemplate(
          config,
          DONATION_CONFIRMATION_RETURNING_TEXT,
        ),
    },
    {
      id: 'samfora-monthly-donation-confirmation',
      name: 'Samfora Monthly Donation Confirmation',
      description: 'Sent when a scheduled monthly donation is processed',
      triggerTag: SAMFORA_TAGS.monthlyDonation,
      subject: 'Månadsgåva mottagen',
      preheader: MONTHLY_DONATION_TEXT.preheader,
      templateBuilder: buildMonthlyDonationTemplate,
    },
    {
      id: 'samfora-welcome',
      name: 'Samfora Welcome',
      description: 'Sent when a new donor creates a Samfora account',
      triggerTag: SAMFORA_TAGS.newDonor,
      subject: 'Välkommen till Samfora',
      preheader: WELCOME_TEXT.preheader,
      templateBuilder: buildWelcomeTemplate,
    },
    {
      id: 'samfora-annual-tax-summary',
      name: 'Samfora Annual Tax Summary',
      description:
        'Year-end summary of donations for Swedish gåvoskatteavdrag reporting',
      triggerTag: SAMFORA_TAGS.annualTaxSummary,
      subject: 'Din gåvosammanställning',
      preheader: TAX_SUMMARY_TEXT.preheader,
      templateBuilder: buildTaxSummaryTemplate,
    },
  ];
}
