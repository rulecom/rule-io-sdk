/**
 * Shipping-update email template builder.
 *
 * Renders a lightweight shipping notification when only base fields
 * are supplied and upgrades to a full legally-binding receipt when
 * the optional receipt fields (seller, line items, financial summary,
 * legal links, buyer details) are mapped.
 */

import { sanitizeUrl } from '@rule-io/core'
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

const TEMPLATE_XML = loadTemplate(import.meta.url, './shipping-update.xml')

/**
 * Configuration accepted by {@link createShippingUpdateEmail}.
 */
export interface ShippingUpdateConfig {
  theme: EmailTheme
  customFields: CustomFieldMap
  trackingUrl: string
  footer?: FooterConfig
  text: {
    preheader: string
    heading: string
    greeting: string
    message: string
    orderRefLabel: string
    trackingLabel?: string
    estimatedDeliveryLabel?: string
    ctaButton: string

    // Receipt fields (all optional — extend shipping update into a legal receipt)
    /** Label for order date row */
    orderDateLabel?: string
    /** Label for customer email row */
    customerEmailLabel?: string
    /** Label for billing address row */
    billingAddressLabel?: string
    /** Label for payment method row */
    paymentMethodLabel?: string
    /** Label for company name row */
    companyLabel?: string
    /** Label for VAT/tax ID row */
    vatLabel?: string
    /** Label for shipping carrier row */
    carrierLabel?: string
    /** Label for shipping address row */
    shippingAddressLabel?: string
    /** Label for shipping cost row */
    shippingCostLabel?: string
    /** Heading for the line items section */
    lineItemsHeading?: string
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string
    /** Label for unit price in line items (default: 'Unit price: ') */
    itemUnitPriceLabel?: string
    /** Label for line total in line items (default: 'Line total: ') */
    itemLineTotalLabel?: string
    /** Label for subtotal row */
    subtotalLabel?: string
    /** Label for tax row */
    taxLabel?: string
    /** Label for discount row */
    discountLabel?: string
    /** Label for total row */
    totalLabel?: string
    /** Legal receipt confirmation text */
    legalText?: string
    /** Return policy link text */
    returnPolicyText?: string
    /** Return policy URL */
    returnPolicyUrl?: string
    /** Terms and conditions link text */
    termsText?: string
    /** Terms and conditions URL */
    termsUrl?: string
    /** Label for the "confirmed" step of the status tracker */
    statusConfirmedLabel?: string
    /** Label for the "shipped" step of the status tracker */
    statusShippedLabel?: string
    /** Label for the "delivered" step of the status tracker */
    statusDeliveredLabel?: string
  }
  fieldNames: {
    firstName: string
    orderRef: string
    trackingNumber?: string
    estimatedDelivery?: string

    // Receipt fields (all optional)
    /** Full customer name for legal identification */
    customerFullName?: string
    /** Customer email */
    customerEmail?: string
    /** Order/transaction date */
    orderDate?: string
    /** Billing address */
    billingAddress?: string
    /** Seller company name */
    companyName?: string
    /** VAT/tax registration number */
    vatNumber?: string
    /** Payment method used */
    paymentMethod?: string
    /** Currency code */
    currency?: string
    /** Pre-tax subtotal */
    subtotal?: string
    /** Tax amount */
    taxAmount?: string
    /** Discount amount */
    discountAmount?: string
    /** Shipping cost */
    shippingCost?: string
    /** Shipping address */
    shippingAddress?: string
    /** Shipping carrier */
    shippingCarrier?: string
    /** Order total */
    totalPrice?: string
    /** Repeatable items field (for rc-loop) */
    items?: string
    /** Line item: product name */
    itemName?: string
    /** Line item: quantity */
    itemQuantity?: string
    /** Line item: unit price */
    itemUnitPrice?: string
    /** Line item: line total */
    itemTotal?: string
    /** Line item: SKU */
    itemSku?: string
  }
}

/**
 * Create a shipping-update email template.
 *
 * @param config - Caller configuration.
 * @returns A themed {@link RcmlDocument}.
 */
export function createShippingUpdateEmail(
  config: ShippingUpdateConfig,
): RcmlDocument {
  return withTemplateContext('createShippingUpdateEmail', () => {
    const { customFields, fieldNames, text, theme } = config

    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
    }

    if (text.trackingLabel && fieldNames.trackingNumber) fieldsToValidate.trackingNumber = fieldNames.trackingNumber
    if (text.estimatedDeliveryLabel && fieldNames.estimatedDelivery) fieldsToValidate.estimatedDelivery = fieldNames.estimatedDelivery
    if (text.orderDateLabel && fieldNames.orderDate) fieldsToValidate.orderDate = fieldNames.orderDate
    if (text.customerEmailLabel && fieldNames.customerEmail) fieldsToValidate.customerEmail = fieldNames.customerEmail
    if (text.billingAddressLabel && fieldNames.billingAddress) fieldsToValidate.billingAddress = fieldNames.billingAddress
    if (text.paymentMethodLabel && fieldNames.paymentMethod) fieldsToValidate.paymentMethod = fieldNames.paymentMethod
    if (text.companyLabel && fieldNames.companyName) fieldsToValidate.companyName = fieldNames.companyName
    if (text.vatLabel && fieldNames.vatNumber) fieldsToValidate.vatNumber = fieldNames.vatNumber
    if (text.carrierLabel && fieldNames.shippingCarrier) fieldsToValidate.shippingCarrier = fieldNames.shippingCarrier
    if (text.shippingAddressLabel && fieldNames.shippingAddress) fieldsToValidate.shippingAddress = fieldNames.shippingAddress
    if (text.subtotalLabel && fieldNames.subtotal) fieldsToValidate.subtotal = fieldNames.subtotal
    if (text.taxLabel && fieldNames.taxAmount) fieldsToValidate.taxAmount = fieldNames.taxAmount
    if (text.discountLabel && fieldNames.discountAmount) fieldsToValidate.discountAmount = fieldNames.discountAmount
    if (text.shippingCostLabel && fieldNames.shippingCost) fieldsToValidate.shippingCost = fieldNames.shippingCost
    if (text.totalLabel && fieldNames.totalPrice) fieldsToValidate.totalPrice = fieldNames.totalPrice
    if (fieldNames.customerFullName) fieldsToValidate.customerFullName = fieldNames.customerFullName
    if (fieldNames.items && fieldNames.itemName) fieldsToValidate.items = fieldNames.items
    validateRequiredFields(customFields, fieldsToValidate)

    // Derived flags (same semantics as the old template).
    const hasStatusTracker = !!(
      text.statusConfirmedLabel && text.statusShippedLabel && text.statusDeliveredLabel
    )
    const hasCompanyRow = !!(text.companyLabel && fieldNames.companyName)
    const hasVatRow = !!(text.vatLabel && fieldNames.vatNumber)
    const hasSellerRows = hasCompanyRow || hasVatRow

    const hasOrderRefRow = !!text.orderRefLabel
    const hasOrderDateRow = !!(text.orderDateLabel && fieldNames.orderDate)
    const hasPaymentRow = !!(text.paymentMethodLabel && fieldNames.paymentMethod)
    const hasCustomerEmailRow = !!(text.customerEmailLabel && fieldNames.customerEmail)
    const hasOrderDetailRows =
      hasOrderRefRow || hasOrderDateRow || hasPaymentRow || hasCustomerEmailRow

    const hasShippingAddressRow = !!(text.shippingAddressLabel && fieldNames.shippingAddress)
    const hasCarrierRow = !!(text.carrierLabel && fieldNames.shippingCarrier)
    const hasTrackingRow = !!(text.trackingLabel && fieldNames.trackingNumber)
    const hasEstimatedDeliveryRow = !!(text.estimatedDeliveryLabel && fieldNames.estimatedDelivery)
    const hasShippingRows =
      hasShippingAddressRow || hasCarrierRow || hasTrackingRow || hasEstimatedDeliveryRow

    const hasLineItemLoop = !!(fieldNames.items && fieldNames.itemName)
    const hasLineItemsHeading = hasLineItemLoop && !!text.lineItemsHeading

    const hasSubtotalRow = !!(text.subtotalLabel && fieldNames.subtotal)
    const hasDiscountRow = !!(text.discountLabel && fieldNames.discountAmount)
    const hasTaxRow = !!(text.taxLabel && fieldNames.taxAmount)
    const hasShippingCostRow = !!(text.shippingCostLabel && fieldNames.shippingCost)
    const hasTotalRow = !!(text.totalLabel && fieldNames.totalPrice)
    const hasFinancialRows =
      hasSubtotalRow || hasDiscountRow || hasTaxRow || hasShippingCostRow || hasTotalRow

    const hasCustomerFullNameRow = !!fieldNames.customerFullName
    const hasBillingAddressRow = !!(text.billingAddressLabel && fieldNames.billingAddress)
    const hasBuyerRows = hasCustomerFullNameRow || hasBillingAddressRow

    // Status tracker steps — pre-compute widths + colours so the XML
    // template can iterate without running theme math.
    const statusSteps = hasStatusTracker
      ? (() => {
          const baseWidth = Math.floor(100 / 3)
          const remainder = 100 - baseWidth * 3
          const activeBg = theme.colors.primary?.hex ?? '#0066CC'
          const inactiveBg = theme.colors.secondary?.hex ?? '#F3F3F3'
          const activeFg = '#FFFFFF'
          const inactiveFg = '#333333'
          const labels = [
            text.statusConfirmedLabel ?? '',
            text.statusShippedLabel ?? '',
            text.statusDeliveredLabel ?? '',
          ]
          const activeIndex = 1 // Shipped

          return labels.map((label, i) => ({
            label,
            width: `${String(baseWidth + (i === 0 ? remainder : 0))}%`,
            bg: i <= activeIndex ? activeBg : inactiveBg,
            fg: i <= activeIndex ? activeFg : inactiveFg,
          }))
        })()
      : []

    // Legal section link URLs — sanitised up front so malformed URLs
    // fail fast.
    const safeReturnPolicyUrl =
      text.returnPolicyText && text.returnPolicyUrl
        ? sanitizeUrl(text.returnPolicyUrl) || undefined
        : undefined
    const safeTermsUrl =
      text.termsText && text.termsUrl
        ? sanitizeUrl(text.termsUrl) || undefined
        : undefined
    const hasReturnPolicy = !!safeReturnPolicyUrl
    const hasTerms = !!safeTermsUrl
    const hasLegalText = !!text.legalText
    const hasLegalSection = hasLegalText || hasReturnPolicy || hasTerms

    const data = {
      text: {
        preheader: text.preheader,
        heading: text.heading,
        greeting: text.greeting,
        message: text.message,
        orderRefLabel: text.orderRefLabel,
        trackingLabel: text.trackingLabel ?? '',
        estimatedDeliveryLabel: text.estimatedDeliveryLabel ?? '',
        ctaButton: text.ctaButton,
        orderDateLabel: text.orderDateLabel ?? '',
        customerEmailLabel: text.customerEmailLabel ?? '',
        billingAddressLabel: text.billingAddressLabel ?? '',
        paymentMethodLabel: text.paymentMethodLabel ?? '',
        companyLabel: text.companyLabel ?? '',
        vatLabel: text.vatLabel ?? '',
        carrierLabel: text.carrierLabel ?? '',
        shippingAddressLabel: text.shippingAddressLabel ?? '',
        shippingCostLabel: text.shippingCostLabel ?? '',
        lineItemsHeading: text.lineItemsHeading ?? '',
        itemSkuLabel: text.itemSkuLabel ?? 'SKU: ',
        itemQtyLabel: text.itemQtyLabel ?? 'Qty: ',
        itemUnitPriceLabel: text.itemUnitPriceLabel ?? 'Unit price: ',
        itemLineTotalLabel: text.itemLineTotalLabel ?? 'Line total: ',
        subtotalLabel: text.subtotalLabel ?? '',
        taxLabel: text.taxLabel ?? '',
        discountLabel: text.discountLabel ?? '',
        totalLabel: text.totalLabel ?? '',
        legalText: text.legalText ?? '',
        returnPolicyText: text.returnPolicyText ?? '',
        termsText: text.termsText ?? '',
      },
      fieldNames: {
        firstName: fieldNames.firstName,
        orderRef: fieldNames.orderRef,
        trackingNumber: fieldNames.trackingNumber ?? '',
        estimatedDelivery: fieldNames.estimatedDelivery ?? '',
        customerFullName: fieldNames.customerFullName ?? '',
        customerEmail: fieldNames.customerEmail ?? '',
        orderDate: fieldNames.orderDate ?? '',
        billingAddress: fieldNames.billingAddress ?? '',
        companyName: fieldNames.companyName ?? '',
        vatNumber: fieldNames.vatNumber ?? '',
        paymentMethod: fieldNames.paymentMethod ?? '',
        subtotal: fieldNames.subtotal ?? '',
        taxAmount: fieldNames.taxAmount ?? '',
        discountAmount: fieldNames.discountAmount ?? '',
        shippingCost: fieldNames.shippingCost ?? '',
        shippingAddress: fieldNames.shippingAddress ?? '',
        shippingCarrier: fieldNames.shippingCarrier ?? '',
        totalPrice: fieldNames.totalPrice ?? '',
        itemName: fieldNames.itemName ?? '',
        itemQuantity: fieldNames.itemQuantity ?? '',
        itemUnitPrice: fieldNames.itemUnitPrice ?? '',
        itemTotal: fieldNames.itemTotal ?? '',
        itemSku: fieldNames.itemSku ?? '',
      },
      customFieldsById: {
        firstName: String(customFields[fieldNames.firstName]),
        orderRef: String(customFields[fieldNames.orderRef]),
        trackingNumber:
          hasTrackingRow && fieldNames.trackingNumber
            ? String(customFields[fieldNames.trackingNumber])
            : '',
        estimatedDelivery:
          hasEstimatedDeliveryRow && fieldNames.estimatedDelivery
            ? String(customFields[fieldNames.estimatedDelivery])
            : '',
        customerFullName: hasCustomerFullNameRow && fieldNames.customerFullName
          ? String(customFields[fieldNames.customerFullName])
          : '',
        customerEmail:
          hasCustomerEmailRow && fieldNames.customerEmail
            ? String(customFields[fieldNames.customerEmail])
            : '',
        orderDate:
          hasOrderDateRow && fieldNames.orderDate
            ? String(customFields[fieldNames.orderDate])
            : '',
        billingAddress:
          hasBillingAddressRow && fieldNames.billingAddress
            ? String(customFields[fieldNames.billingAddress])
            : '',
        companyName:
          hasCompanyRow && fieldNames.companyName
            ? String(customFields[fieldNames.companyName])
            : '',
        vatNumber:
          hasVatRow && fieldNames.vatNumber
            ? String(customFields[fieldNames.vatNumber])
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
          hasShippingAddressRow && fieldNames.shippingAddress
            ? String(customFields[fieldNames.shippingAddress])
            : '',
        shippingCarrier:
          hasCarrierRow && fieldNames.shippingCarrier
            ? String(customFields[fieldNames.shippingCarrier])
            : '',
        totalPrice:
          hasTotalRow && fieldNames.totalPrice
            ? String(customFields[fieldNames.totalPrice])
            : '',
      },
      // Derived flags.
      hasLogo: !!theme.images.logo?.url,
      hasStatusTracker,
      hasSellerRows,
      hasCompanyRow,
      hasVatRow,
      hasOrderDetailRows,
      hasOrderRefRow,
      hasOrderDateRow,
      hasPaymentRow,
      hasCustomerEmailRow,
      hasShippingRows,
      hasShippingAddressRow,
      hasCarrierRow,
      hasTrackingRow,
      hasEstimatedDeliveryRow,
      hasLineItemLoop,
      hasLineItemsHeading,
      hasItemSku: !!fieldNames.itemSku,
      hasItemQuantity: !!fieldNames.itemQuantity,
      hasItemUnitPrice: !!fieldNames.itemUnitPrice,
      hasItemTotal: !!fieldNames.itemTotal,
      hasFinancialRows,
      hasSubtotalRow,
      hasDiscountRow,
      hasTaxRow,
      hasShippingCostRow,
      hasTotalRow,
      hasBuyerRows,
      hasCustomerFullNameRow,
      hasBillingAddressRow,
      hasLegalSection,
      hasLegalText,
      hasReturnPolicy,
      hasTerms,
      // Pre-resolved scalars.
      logoUrl: theme.images.logo?.url ?? '',
      secondaryBg: theme.colors.secondary?.hex ?? '',
      trackingUrl: config.trackingUrl,
      itemsCustomFieldId:
        hasLineItemLoop && fieldNames.items
          ? String(customFields[fieldNames.items])
          : '',
      safeReturnPolicyUrl: safeReturnPolicyUrl ?? '',
      safeTermsUrl: safeTermsUrl ?? '',
      // Status tracker iterated via @for.
      statusSteps,
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
