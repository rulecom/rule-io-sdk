/**
 * Order confirmation email template builder.
 *
 * Consumes the v1.1 XML template at `./order-confirmation.xml` and
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

const TEMPLATE_XML = loadTemplate(import.meta.url, './order-confirmation.xml')

/**
 * Configuration accepted by {@link createOrderConfirmationEmail}.
 */
export interface OrderConfirmationConfig {
  theme: EmailTheme
  customFields: CustomFieldMap
  websiteUrl: string
  footer?: FooterConfig
  text: {
    preheader: string
    greeting: string
    intro: string
    detailsHeading: string
    orderRefLabel: string
    itemsLabel?: string
    totalLabel: string
    shippingLabel?: string
    ctaButton: string
    /** Heading above the line items loop section */
    lineItemsHeading?: string
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string
    /** Label for unit price in line items (default: 'Price: ') */
    itemUnitPriceLabel?: string
    /** Label for subtotal in line items (default: 'Subtotal: ') */
    itemSubtotalLabel?: string
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string
    /** Leading text for the hero heading (e.g. "Order") — rendered as "{prefix} {orderRef} {suffix}" */
    heroHeadingPrefix?: string
    /** Trailing text for the hero heading (e.g. "confirmed") */
    heroHeadingSuffix?: string
    /** Label for order date row (e.g. "Order date") */
    orderDateLabel?: string
    /** Label for payment method row (e.g. "Payment") */
    paymentMethodLabel?: string
    /** Label for financial summary subtotal row */
    subtotalLabel?: string
    /** Label for financial summary tax row */
    taxLabel?: string
    /** Label for financial summary discount row */
    discountLabel?: string
    /** Label for financial summary shipping cost row */
    shippingCostLabel?: string
    /** Heading above the shipping address block (e.g. "Shipping to") */
    shippingAddressHeading?: string
  }
  fieldNames: {
    firstName: string
    orderRef: string
    totalPrice: string
    items?: string
    shippingAddress?: string
    /** Line item sub-field: product name (enables rc-loop rendering) */
    itemName?: string
    /** Line item sub-field: quantity */
    itemQuantity?: string
    /** Line item sub-field: unit price */
    itemUnitPrice?: string
    /** Line item sub-field: line total */
    itemTotal?: string
    /** Line item sub-field: SKU */
    itemSku?: string
    /** Order date custom field */
    orderDate?: string
    /** Payment method custom field */
    paymentMethod?: string
    /** Pre-tax subtotal */
    subtotal?: string
    /** Tax amount */
    taxAmount?: string
    /** Discount amount */
    discountAmount?: string
    /** Shipping cost */
    shippingCost?: string
    /** Shipping address line 2 */
    shippingAddress2?: string
    /** Shipping city */
    shippingCity?: string
    /** Shipping ZIP / postal code */
    shippingZip?: string
    /** Shipping country code */
    shippingCountryCode?: string
  }
}

/**
 * Create an order confirmation email template.
 *
 * @param config - Caller configuration (theme, custom field map, text
 *   labels, field-name overrides, optional footer).
 * @returns A themed {@link RcmlDocument}.
 */
export function createOrderConfirmationEmail(
  config: OrderConfirmationConfig,
): RcmlDocument {
  return withTemplateContext('createOrderConfirmationEmail', () => {
    const { theme, customFields, fieldNames, text } = config

    // Pre-validate the logo URL so the error message path-traces
    // back to this builder rather than a downstream applyTheme failure.
    if (theme.images.logo?.url !== undefined) {
      if (!sanitizeUrl(theme.images.logo.url)) {
        throw new RuleConfigError('createBrandLogo: invalid or unsafe logoUrl')
      }
    }

    const hasExtendedAddress = !!(
      fieldNames.shippingAddress2 ||
      fieldNames.shippingCity ||
      fieldNames.shippingZip ||
      fieldNames.shippingCountryCode
    )

    if (hasExtendedAddress && !fieldNames.shippingAddress) {
      throw new RuleConfigError(
        'fieldNames.shippingAddress is required when any of ' +
          'shippingAddress2, shippingCity, shippingZip, or shippingCountryCode is provided',
      )
    }

    // Derived flags (same semantics as the old template).
    const hasFinancialSummary = !!(
      (fieldNames.subtotal && text.subtotalLabel) ||
      (fieldNames.discountAmount && text.discountLabel) ||
      (fieldNames.taxAmount && text.taxLabel) ||
      (fieldNames.shippingCost && text.shippingCostLabel)
    )
    const hasLineItemLoop = !!(fieldNames.items && fieldNames.itemName)
    const hasInlineItemsRow = !!(fieldNames.items && !fieldNames.itemName && text.itemsLabel)
    const hasInlineShippingRow =
      !hasExtendedAddress && !!text.shippingLabel && !!fieldNames.shippingAddress
    const rendersShippingAddress =
      hasInlineShippingRow || (hasExtendedAddress && !!fieldNames.shippingAddress)
    const hasOrderMetaRow = !!(text.orderDateLabel && fieldNames.orderDate)
    const hasPaymentRow = !!(text.paymentMethodLabel && fieldNames.paymentMethod)
    const hasHeroHeading = !!(text.heroHeadingPrefix || text.heroHeadingSuffix)

    // Row-level flags for the financial summary — one per row.
    const hasSubtotalRow = !!(text.subtotalLabel && fieldNames.subtotal)
    const hasDiscountRow = !!(text.discountLabel && fieldNames.discountAmount)
    const hasTaxRow = !!(text.taxLabel && fieldNames.taxAmount)
    const hasShippingCostRow = !!(text.shippingCostLabel && fieldNames.shippingCost)

    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
      totalPrice: fieldNames.totalPrice,
    }

    if ((hasLineItemLoop || hasInlineItemsRow) && fieldNames.items) {
      fieldsToValidate.items = fieldNames.items
    }

    if (rendersShippingAddress && fieldNames.shippingAddress) {
      fieldsToValidate.shippingAddress = fieldNames.shippingAddress
    }

    if (hasExtendedAddress) {
      if (fieldNames.shippingAddress2) fieldsToValidate.shippingAddress2 = fieldNames.shippingAddress2
      if (fieldNames.shippingCity) fieldsToValidate.shippingCity = fieldNames.shippingCity
      if (fieldNames.shippingZip) fieldsToValidate.shippingZip = fieldNames.shippingZip
      if (fieldNames.shippingCountryCode) fieldsToValidate.shippingCountryCode = fieldNames.shippingCountryCode
    }

    if (hasOrderMetaRow && fieldNames.orderDate) fieldsToValidate.orderDate = fieldNames.orderDate
    if (hasPaymentRow && fieldNames.paymentMethod) fieldsToValidate.paymentMethod = fieldNames.paymentMethod
    if (hasSubtotalRow && fieldNames.subtotal) fieldsToValidate.subtotal = fieldNames.subtotal
    if (hasDiscountRow && fieldNames.discountAmount) fieldsToValidate.discountAmount = fieldNames.discountAmount
    if (hasTaxRow && fieldNames.taxAmount) fieldsToValidate.taxAmount = fieldNames.taxAmount
    if (hasShippingCostRow && fieldNames.shippingCost) fieldsToValidate.shippingCost = fieldNames.shippingCost
    validateRequiredFields(customFields, fieldsToValidate)

    const resolvedShippingAddressHeading = text.shippingAddressHeading ?? text.shippingLabel

    const data = {
      text: {
        preheader: text.preheader,
        greeting: text.greeting,
        intro: text.intro,
        detailsHeading: text.detailsHeading,
        orderRefLabel: text.orderRefLabel,
        itemsLabel: text.itemsLabel ?? '',
        totalLabel: text.totalLabel,
        shippingLabel: text.shippingLabel ?? '',
        ctaButton: text.ctaButton,
        lineItemsHeading: text.lineItemsHeading ?? '',
        itemQtyLabel: text.itemQtyLabel ?? 'Qty: ',
        itemUnitPriceLabel: text.itemUnitPriceLabel ?? 'Price: ',
        itemSubtotalLabel: text.itemSubtotalLabel ?? 'Subtotal: ',
        itemSkuLabel: text.itemSkuLabel ?? 'SKU: ',
        orderDateLabel: text.orderDateLabel ?? '',
        paymentMethodLabel: text.paymentMethodLabel ?? '',
        subtotalLabel: text.subtotalLabel ?? '',
        taxLabel: text.taxLabel ?? '',
        discountLabel: text.discountLabel ?? '',
        shippingCostLabel: text.shippingCostLabel ?? '',
      },
      // Field-resolution scaffolding for RFM atoms.
      fieldNames: {
        firstName: fieldNames.firstName,
        orderRef: fieldNames.orderRef,
        totalPrice: fieldNames.totalPrice,
        items: fieldNames.items ?? '',
        itemName: fieldNames.itemName ?? '',
        itemQuantity: fieldNames.itemQuantity ?? '',
        itemUnitPrice: fieldNames.itemUnitPrice ?? '',
        itemTotal: fieldNames.itemTotal ?? '',
        itemSku: fieldNames.itemSku ?? '',
        orderDate: fieldNames.orderDate ?? '',
        paymentMethod: fieldNames.paymentMethod ?? '',
        subtotal: fieldNames.subtotal ?? '',
        taxAmount: fieldNames.taxAmount ?? '',
        discountAmount: fieldNames.discountAmount ?? '',
        shippingCost: fieldNames.shippingCost ?? '',
        shippingAddress: fieldNames.shippingAddress ?? '',
        shippingAddress2: fieldNames.shippingAddress2 ?? '',
        shippingCity: fieldNames.shippingCity ?? '',
        shippingZip: fieldNames.shippingZip ?? '',
        shippingCountryCode: fieldNames.shippingCountryCode ?? '',
      },
      customFieldsById: {
        firstName: String(customFields[fieldNames.firstName]),
        orderRef: String(customFields[fieldNames.orderRef]),
        totalPrice: String(customFields[fieldNames.totalPrice]),
        items:
          (hasLineItemLoop || hasInlineItemsRow) && fieldNames.items
            ? String(customFields[fieldNames.items])
            : '',
        orderDate:
          hasOrderMetaRow && fieldNames.orderDate
            ? String(customFields[fieldNames.orderDate])
            : '',
        paymentMethod:
          hasPaymentRow && fieldNames.paymentMethod
            ? String(customFields[fieldNames.paymentMethod])
            : '',
        subtotal:
          hasSubtotalRow && fieldNames.subtotal
            ? String(customFields[fieldNames.subtotal])
            : '',
        taxAmount:
          hasTaxRow && fieldNames.taxAmount
            ? String(customFields[fieldNames.taxAmount])
            : '',
        discountAmount:
          hasDiscountRow && fieldNames.discountAmount
            ? String(customFields[fieldNames.discountAmount])
            : '',
        shippingCost:
          hasShippingCostRow && fieldNames.shippingCost
            ? String(customFields[fieldNames.shippingCost])
            : '',
        shippingAddress:
          rendersShippingAddress && fieldNames.shippingAddress
            ? String(customFields[fieldNames.shippingAddress])
            : '',
        shippingAddress2: fieldNames.shippingAddress2
          ? String(customFields[fieldNames.shippingAddress2])
          : '',
        shippingCity: fieldNames.shippingCity
          ? String(customFields[fieldNames.shippingCity])
          : '',
        shippingZip: fieldNames.shippingZip
          ? String(customFields[fieldNames.shippingZip])
          : '',
        shippingCountryCode: fieldNames.shippingCountryCode
          ? String(customFields[fieldNames.shippingCountryCode])
          : '',
      },
      // Derived flags driving @if blocks.
      hasLogo: !!theme.images.logo?.url,
      hasHeroHeading,
      hasOrderMetaRow,
      hasPaymentRow,
      hasInlineItemsRow,
      hasInlineShippingRow,
      hasFinancialSummary,
      hasSubtotalRow,
      hasDiscountRow,
      hasTaxRow,
      hasShippingCostRow,
      hasLineItemLoop,
      hasLineItemsHeading: hasLineItemLoop && !!text.lineItemsHeading,
      hasItemSku: !!fieldNames.itemSku,
      hasItemQuantity: !!fieldNames.itemQuantity,
      hasItemUnitPrice: !!fieldNames.itemUnitPrice,
      hasItemTotal: !!fieldNames.itemTotal,
      hasExtendedAddress,
      hasShippingAddressHeading: !!resolvedShippingAddressHeading,
      hasShippingAddress2: !!fieldNames.shippingAddress2,
      hasShippingCity: !!fieldNames.shippingCity,
      hasShippingZip: !!fieldNames.shippingZip,
      hasShippingCountryCode: !!fieldNames.shippingCountryCode,
      // Pre-resolved scalars.
      logoUrl: theme.images.logo?.url ?? '',
      secondaryBg: theme.colors.secondary?.hex ?? '',
      websiteUrl: config.websiteUrl,
      shippingAddressHeading: resolvedShippingAddressHeading ?? '',
      itemsCustomFieldId:
        hasLineItemLoop && fieldNames.items
          ? String(customFields[fieldNames.items])
          : '',
      // Hero heading — prefix/suffix with the space baked in so the
      // template can concat without ternaries.
      heroHeadingPrefixPadded: text.heroHeadingPrefix
        ? `${text.heroHeadingPrefix} `
        : '',
      heroHeadingSuffixPadded: text.heroHeadingSuffix
        ? ` ${text.heroHeadingSuffix}`
        : '',
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
