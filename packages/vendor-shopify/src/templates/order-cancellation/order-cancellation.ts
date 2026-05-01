/**
 * Order cancellation email template builder.
 *
 * Consumes the v1.1 XML template at `./order-cancellation.xml` and
 * the parameterised message tree at `./messages.ts`, then hands both
 * to {@link compileTemplate} along with a pre-resolved data object.
 * The rendered XML is parsed into an {@link RcmlDocument} and themed
 * via `applyTheme`.
 */

import { RuleConfigError, sanitizeUrl } from '@rule-io/core'
import type { CustomFieldMap, EmailTheme, FooterConfig } from '@rule-io/core'
import {
  applyTheme,
  validateRequiredFields,
  withTemplateContext,
  xmlToRcml,
  type RcmlDocument,
} from '@rule-io/rcml'
import { compileTemplate, loadTemplate } from '@rule-io/templates'

import { messages } from './messages.js'

const TEMPLATE_XML = loadTemplate(import.meta.url, './order-cancellation.xml')

/**
 * Configuration accepted by {@link createOrderCancellationEmail}.
 */
export interface OrderCancellationConfig {
  theme: EmailTheme
  customFields: CustomFieldMap
  websiteUrl: string
  footer?: FooterConfig
  text: {
    preheader: string
    heading: string
    greeting: string
    message: string
    orderRefLabel: string
    followUp: string
    ctaButton: string
    /** Label for optional order date row */
    orderDateLabel?: string
    /** Optional support/refund callout text — rendered centered when supplied */
    supportText?: string
    /** Optional support email — rendered as a mailto link beside supportText */
    supportEmail?: string
    /** Optional support URL — rendered as a link beside supportText */
    supportUrl?: string
  }
  fieldNames: {
    firstName: string
    orderRef: string
    /** Optional order date custom field */
    orderDate?: string
  }
}

/**
 * Create an order cancellation email template.
 *
 * @param config - Caller configuration (theme, custom field map, text
 *   labels, field-name overrides, optional support link / footer).
 * @returns A themed {@link RcmlDocument} ready to be passed to
 *   `client.createAutomation` or similar.
 */
export function createOrderCancellationEmail(
  config: OrderCancellationConfig,
): RcmlDocument {
  return withTemplateContext('createOrderCancellationEmail', () => {
    const { theme, customFields, fieldNames, text } = config

    const hasOrderDate = !!(text.orderDateLabel && fieldNames.orderDate)
    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
    }

    if (hasOrderDate && fieldNames.orderDate) {
      fieldsToValidate.orderDate = fieldNames.orderDate
    }

    validateRequiredFields(customFields, fieldsToValidate)

    // Support-link selection: prefer explicit URL over email; fail fast on
    // malformed emails so we never produce broken mailto links.
    let supportLinkHref: string | undefined
    let supportLinkText: string | undefined

    if (text.supportText) {
      const safeSupportUrl = text.supportUrl ? sanitizeUrl(text.supportUrl) : undefined

      if (safeSupportUrl) {
        supportLinkHref = safeSupportUrl
        supportLinkText = safeSupportUrl
      } else if (text.supportEmail) {
        if (!/^[^\s\x00-\x1F\x7F?#&/:]+@[^\s\x00-\x1F\x7F?#&/:]+$/.test(text.supportEmail)) {
          throw new RuleConfigError(
            `supportEmail "${text.supportEmail}" is not a valid email address`,
          )
        }

        supportLinkHref = `mailto:${encodeURIComponent(text.supportEmail)}`
        supportLinkText = text.supportEmail
      }
    }

    const data = {
      // Caller-provided text with `??` defaults pre-resolved.
      text: {
        preheader: text.preheader,
        heading: text.heading,
        greeting: text.greeting,
        message: text.message,
        orderRefLabel: text.orderRefLabel,
        orderDateLabel: text.orderDateLabel ?? '',
        followUp: text.followUp,
        ctaButton: text.ctaButton,
        supportText: text.supportText ?? '',
      },
      // Field-resolution scaffolding for the RFM `customField` atom.
      fieldNames: {
        firstName: fieldNames.firstName,
        orderRef: fieldNames.orderRef,
        orderDate: fieldNames.orderDate ?? '',
      },
      customFieldsById: {
        firstName: String(customFields[fieldNames.firstName]),
        orderRef: String(customFields[fieldNames.orderRef]),
        orderDate: fieldNames.orderDate
          ? String(customFields[fieldNames.orderDate])
          : '',
      },
      // Derived flags driving @if blocks.
      hasLogo: !!theme.images.logo?.url,
      hasOrderDate,
      hasSupportText: !!text.supportText,
      hasSupportLink: !!supportLinkHref,
      // Pre-resolved scalars replacing `?.` / `??` expressions.
      logoUrl: theme.images.logo?.url ?? '',
      secondaryBg: theme.colors.secondary?.hex ?? '',
      websiteUrl: config.websiteUrl,
      supportLinkHref: supportLinkHref ?? '',
      supportLinkText: supportLinkText ?? '',
      // Footer defaults pre-resolved.
      footer: {
        viewInBrowserText: config.footer?.viewInBrowserText ?? 'View in browser',
        unsubscribeText: config.footer?.unsubscribeText ?? 'Unsubscribe',
        fontSize: config.footer?.fontSize ?? '10px',
        textColor: config.footer?.textColor ?? '#666666',
      },
    }

    const { xml: interpolatedXml } = compileTemplate({
      template: TEMPLATE_XML,
      copy: messages,
      context: data,
    })

    const baseDoc = xmlToRcml(interpolatedXml)

    return applyTheme(baseDoc, theme)
  })
}
