/**
 * E-commerce Email Templates
 *
 * Pre-built templates for online stores: order confirmations,
 * shipping updates, abandoned cart recovery, and cancellations.
 *
 * All text and configuration must be provided by the consumer —
 * no hardcoded defaults for any specific business.
 *
 * Note: Line-item labels (e.g. "Qty: ", "Price: ", "SKU: ") default to
 * English when not overridden via the `text` config. The footer section
 * also defaults to English link text ("View in browser", "Unsubscribe")
 * when no `footer` config is provided. Pass the corresponding config
 * fields to override with your own locale.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { RuleConfigError, sanitizeUrl } from '@rule-io/core';
import type { CustomFieldMap, EmailTheme, FooterConfig } from '@rule-io/core';
import { applyTheme, xmlToRcml, type RcmlDocument } from '@rule-io/rcml';
import {
  validateRequiredFields,
  withTemplateContext,
} from '@rule-io/rcml';
import { renderTemplate } from '@rule-io/templates';

import { makeTemplateHelpers } from './templates/_helpers.js';

// ─── XML template loading ───────────────────────────────────────────────────

const TEMPLATES_DIR = fileURLToPath(new URL('./templates/', import.meta.url));

const ORDER_CANCELLATION_XML = readFileSync(
  `${TEMPLATES_DIR}order-cancellation.xml`,
  'utf8',
);

const ABANDONED_CART_XML = readFileSync(
  `${TEMPLATES_DIR}abandoned-cart.xml`,
  'utf8',
);

const SHIPPING_UPDATE_XML = readFileSync(
  `${TEMPLATES_DIR}shipping-update.xml`,
  'utf8',
);

const ORDER_CONFIRMATION_XML = readFileSync(
  `${TEMPLATES_DIR}order-confirmation.xml`,
  'utf8',
);

// ============================================================================
// Order Confirmation Template
// ============================================================================

export interface OrderConfirmationConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    intro: string;
    detailsHeading: string;
    orderRefLabel: string;
    itemsLabel?: string;
    totalLabel: string;
    shippingLabel?: string;
    ctaButton: string;
    /** Heading above the line items loop section */
    lineItemsHeading?: string;
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string;
    /** Label for unit price in line items (default: 'Price: ') */
    itemUnitPriceLabel?: string;
    /** Label for subtotal in line items (default: 'Subtotal: ') */
    itemSubtotalLabel?: string;
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string;
    /** Leading text for the hero heading (e.g. "Order") — rendered as "{prefix} {orderRef} {suffix}" */
    heroHeadingPrefix?: string;
    /** Trailing text for the hero heading (e.g. "confirmed") */
    heroHeadingSuffix?: string;
    /** Label for order date row (e.g. "Order date") */
    orderDateLabel?: string;
    /** Label for payment method row (e.g. "Payment") */
    paymentMethodLabel?: string;
    /** Label for financial summary subtotal row */
    subtotalLabel?: string;
    /** Label for financial summary tax row */
    taxLabel?: string;
    /** Label for financial summary discount row */
    discountLabel?: string;
    /** Label for financial summary shipping cost row */
    shippingCostLabel?: string;
    /** Heading above the shipping address block (e.g. "Shipping to") */
    shippingAddressHeading?: string;
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
    totalPrice: string;
    items?: string;
    shippingAddress?: string;
    /** Line item sub-field: product name (enables rc-loop rendering) */
    itemName?: string;
    /** Line item sub-field: quantity */
    itemQuantity?: string;
    /** Line item sub-field: unit price */
    itemUnitPrice?: string;
    /** Line item sub-field: line total */
    itemTotal?: string;
    /** Line item sub-field: SKU */
    itemSku?: string;
    /** Order date custom field */
    orderDate?: string;
    /** Payment method custom field */
    paymentMethod?: string;
    /** Pre-tax subtotal */
    subtotal?: string;
    /** Tax amount */
    taxAmount?: string;
    /** Discount amount */
    discountAmount?: string;
    /** Shipping cost */
    shippingCost?: string;
    /** Shipping address line 2 */
    shippingAddress2?: string;
    /** Shipping city */
    shippingCity?: string;
    /** Shipping ZIP / postal code */
    shippingZip?: string;
    /** Shipping country code */
    shippingCountryCode?: string;
  };
}

/**
 * Create an order confirmation email template.
 *
 * @example
 * ```typescript
 * const email = createOrderConfirmationEmail({
 *   theme: myEmailTheme,
 *   customFields: myFields,
 *   websiteUrl: 'https://myshop.com',
 *   text: {
 *     preheader: 'Your order has been confirmed!',
 *     greeting: 'Hi',
 *     intro: 'Thank you for your order. Here are the details:',
 *     detailsHeading: 'Order Summary',
 *     orderRefLabel: 'Order',
 *     totalLabel: 'Total',
 *     ctaButton: 'View Order',
 *   },
 *   fieldNames: {
 *     firstName: 'Order.CustomerName',
 *     orderRef: 'Order.OrderRef',
 *     totalPrice: 'Order.Total',
 *   },
 * });
 * ```
 */
export function createOrderConfirmationEmail(config: OrderConfirmationConfig): RcmlDocument {
  return withTemplateContext('createOrderConfirmationEmail', () => {
    const { theme, customFields, fieldNames, text } = config;

    // Pre-validate the logo URL so the error message path-traces back to
    // this builder (the XML template just passes the URL through
    // `[src]`, and the downstream `applyTheme` failure would read as
    // `applyTheme: invalid or unsafe URL for logo image` rather than
    // the caller-facing `createBrandLogo: invalid or unsafe logoUrl`).
    if (theme.images.logo?.url !== undefined) {
      if (!sanitizeUrl(theme.images.logo.url)) {
        throw new RuleConfigError('createBrandLogo: invalid or unsafe logoUrl');
      }
    }

    const hasExtendedAddress = !!(
      fieldNames.shippingAddress2 ||
      fieldNames.shippingCity ||
      fieldNames.shippingZip ||
      fieldNames.shippingCountryCode
    );

    if (hasExtendedAddress && !fieldNames.shippingAddress) {
      throw new RuleConfigError(
        'fieldNames.shippingAddress is required when any of ' +
          'shippingAddress2, shippingCity, shippingZip, or shippingCountryCode is provided'
      );
    }

    // Derived flags mirror the branches the legacy implementation computed;
    // the XML template renders around these via `*ngIf`.
    const hasFinancialSummary = !!(
      (fieldNames.subtotal && text.subtotalLabel) ||
      (fieldNames.discountAmount && text.discountLabel) ||
      (fieldNames.taxAmount && text.taxLabel) ||
      (fieldNames.shippingCost && text.shippingCostLabel)
    );
    const hasLineItemLoop = !!(fieldNames.items && fieldNames.itemName);
    const hasInlineItemsRow = !!(fieldNames.items && !fieldNames.itemName && text.itemsLabel);
    const hasInlineShippingRow = !hasExtendedAddress && !!text.shippingLabel && !!fieldNames.shippingAddress;
    const rendersShippingAddress = hasInlineShippingRow || (hasExtendedAddress && !!fieldNames.shippingAddress);
    const hasOrderMetaRow = !!(text.orderDateLabel && fieldNames.orderDate);
    const hasPaymentRow = !!(text.paymentMethodLabel && fieldNames.paymentMethod);

    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
      totalPrice: fieldNames.totalPrice,
    };

    if ((hasLineItemLoop || hasInlineItemsRow) && fieldNames.items) {
      fieldsToValidate.items = fieldNames.items;
    }

    if (rendersShippingAddress && fieldNames.shippingAddress) {
      fieldsToValidate.shippingAddress = fieldNames.shippingAddress;
    }

    if (hasExtendedAddress) {
      if (fieldNames.shippingAddress2) fieldsToValidate.shippingAddress2 = fieldNames.shippingAddress2;
      if (fieldNames.shippingCity) fieldsToValidate.shippingCity = fieldNames.shippingCity;
      if (fieldNames.shippingZip) fieldsToValidate.shippingZip = fieldNames.shippingZip;
      if (fieldNames.shippingCountryCode) fieldsToValidate.shippingCountryCode = fieldNames.shippingCountryCode;
    }

    if (hasOrderMetaRow && fieldNames.orderDate) fieldsToValidate.orderDate = fieldNames.orderDate;
    if (hasPaymentRow && fieldNames.paymentMethod) fieldsToValidate.paymentMethod = fieldNames.paymentMethod;
    if (fieldNames.subtotal && text.subtotalLabel) fieldsToValidate.subtotal = fieldNames.subtotal;
    if (fieldNames.discountAmount && text.discountLabel) fieldsToValidate.discountAmount = fieldNames.discountAmount;
    if (fieldNames.taxAmount && text.taxLabel) fieldsToValidate.taxAmount = fieldNames.taxAmount;
    if (fieldNames.shippingCost && text.shippingCostLabel) fieldsToValidate.shippingCost = fieldNames.shippingCost;
    validateRequiredFields(customFields, fieldsToValidate);

    const { field, loopValue } = makeTemplateHelpers(customFields, fieldNames);

    const context = {
      theme,
      text,
      fieldNames,
      customFields,
      websiteUrl: config.websiteUrl,
      footer: config.footer ?? {},
      hasLineItemLoop,
      hasInlineItemsRow,
      hasInlineShippingRow,
      hasOrderMetaRow,
      hasFinancialSummary,
      hasExtendedAddress,
      shippingAddressHeading: text.shippingAddressHeading ?? text.shippingLabel,
      field,
      loopValue,
    };

    const interpolatedXml = renderTemplate(ORDER_CONFIRMATION_XML, context);
    const baseDoc = xmlToRcml(interpolatedXml);

    return applyTheme(baseDoc, theme);
  });
}

// ============================================================================
// Shipping Update Template
// ============================================================================

export interface ShippingUpdateConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  trackingUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    heading: string;
    greeting: string;
    message: string;
    orderRefLabel: string;
    trackingLabel?: string;
    estimatedDeliveryLabel?: string;
    ctaButton: string;

    // Receipt fields (all optional — extend shipping update into a legal receipt)
    /** Label for order date row */
    orderDateLabel?: string;
    /** Label for customer email row */
    customerEmailLabel?: string;
    /** Label for billing address row */
    billingAddressLabel?: string;
    /** Label for payment method row */
    paymentMethodLabel?: string;
    /** Label for company name row */
    companyLabel?: string;
    /** Label for VAT/tax ID row */
    vatLabel?: string;
    /** Label for shipping carrier row */
    carrierLabel?: string;
    /** Label for shipping address row */
    shippingAddressLabel?: string;
    /** Label for shipping cost row */
    shippingCostLabel?: string;
    /** Heading for the line items section */
    lineItemsHeading?: string;
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string;
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string;
    /** Label for unit price in line items (default: 'Unit price: ') */
    itemUnitPriceLabel?: string;
    /** Label for line total in line items (default: 'Line total: ') */
    itemLineTotalLabel?: string;
    /** Label for subtotal row */
    subtotalLabel?: string;
    /** Label for tax row */
    taxLabel?: string;
    /** Label for discount row */
    discountLabel?: string;
    /** Label for total row */
    totalLabel?: string;
    /** Legal receipt confirmation text */
    legalText?: string;
    /** Return policy link text */
    returnPolicyText?: string;
    /** Return policy URL */
    returnPolicyUrl?: string;
    /** Terms and conditions link text */
    termsText?: string;
    /** Terms and conditions URL */
    termsUrl?: string;
    /** Label for the "confirmed" step of the status tracker */
    statusConfirmedLabel?: string;
    /** Label for the "shipped" step of the status tracker */
    statusShippedLabel?: string;
    /** Label for the "delivered" step of the status tracker */
    statusDeliveredLabel?: string;
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
    trackingNumber?: string;
    estimatedDelivery?: string;

    // Receipt fields (all optional)
    /** Full customer name for legal identification */
    customerFullName?: string;
    /** Customer email */
    customerEmail?: string;
    /** Order/transaction date */
    orderDate?: string;
    /** Billing address */
    billingAddress?: string;
    /** Seller company name */
    companyName?: string;
    /** VAT/tax registration number */
    vatNumber?: string;
    /** Payment method used */
    paymentMethod?: string;
    /** Currency code */
    currency?: string;
    /** Pre-tax subtotal */
    subtotal?: string;
    /** Tax amount */
    taxAmount?: string;
    /** Discount amount */
    discountAmount?: string;
    /** Shipping cost */
    shippingCost?: string;
    /** Shipping address */
    shippingAddress?: string;
    /** Shipping carrier */
    shippingCarrier?: string;
    /** Order total */
    totalPrice?: string;
    /** Repeatable items field (for rc-loop) */
    items?: string;
    /** Line item: product name */
    itemName?: string;
    /** Line item: quantity */
    itemQuantity?: string;
    /** Line item: unit price */
    itemUnitPrice?: string;
    /** Line item: line total */
    itemTotal?: string;
    /** Line item: SKU */
    itemSku?: string;
  };
}

/**
 * Create a shipping update email template.
 *
 * When only the base fields are provided, renders a lightweight shipping
 * notification. When receipt fields are provided (seller info, line items,
 * financial summary, legal text), renders a full legally-binding receipt.
 */
export function createShippingUpdateEmail(config: ShippingUpdateConfig): RcmlDocument {
  return withTemplateContext('createShippingUpdateEmail', () => {
    const { customFields, fieldNames, text, theme } = config;

    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
    };

    if (text.trackingLabel && fieldNames.trackingNumber) fieldsToValidate.trackingNumber = fieldNames.trackingNumber;
    if (text.estimatedDeliveryLabel && fieldNames.estimatedDelivery) fieldsToValidate.estimatedDelivery = fieldNames.estimatedDelivery;
    if (text.orderDateLabel && fieldNames.orderDate) fieldsToValidate.orderDate = fieldNames.orderDate;
    if (text.customerEmailLabel && fieldNames.customerEmail) fieldsToValidate.customerEmail = fieldNames.customerEmail;
    if (text.billingAddressLabel && fieldNames.billingAddress) fieldsToValidate.billingAddress = fieldNames.billingAddress;
    if (text.paymentMethodLabel && fieldNames.paymentMethod) fieldsToValidate.paymentMethod = fieldNames.paymentMethod;
    if (text.companyLabel && fieldNames.companyName) fieldsToValidate.companyName = fieldNames.companyName;
    if (text.vatLabel && fieldNames.vatNumber) fieldsToValidate.vatNumber = fieldNames.vatNumber;
    if (text.carrierLabel && fieldNames.shippingCarrier) fieldsToValidate.shippingCarrier = fieldNames.shippingCarrier;
    if (text.shippingAddressLabel && fieldNames.shippingAddress) fieldsToValidate.shippingAddress = fieldNames.shippingAddress;
    if (text.subtotalLabel && fieldNames.subtotal) fieldsToValidate.subtotal = fieldNames.subtotal;
    if (text.taxLabel && fieldNames.taxAmount) fieldsToValidate.taxAmount = fieldNames.taxAmount;
    if (text.discountLabel && fieldNames.discountAmount) fieldsToValidate.discountAmount = fieldNames.discountAmount;
    if (text.shippingCostLabel && fieldNames.shippingCost) fieldsToValidate.shippingCost = fieldNames.shippingCost;
    if (text.totalLabel && fieldNames.totalPrice) fieldsToValidate.totalPrice = fieldNames.totalPrice;
    if (fieldNames.customerFullName) fieldsToValidate.customerFullName = fieldNames.customerFullName;
    if (fieldNames.items && fieldNames.itemName) fieldsToValidate.items = fieldNames.items;
    validateRequiredFields(customFields, fieldsToValidate);

    // Derived flags drive every conditional section.
    const hasStatusTracker = !!(
      text.statusConfirmedLabel && text.statusShippedLabel && text.statusDeliveredLabel
    );
    const hasSellerRows = !!(
      (text.companyLabel && fieldNames.companyName) ||
      (text.vatLabel && fieldNames.vatNumber)
    );
    const hasOrderDetailRows = !!(
      fieldNames.orderRef &&
      text.orderRefLabel // orderRef always present; gate on label existing
    ) || !!(
      (text.orderDateLabel && fieldNames.orderDate) ||
      (text.paymentMethodLabel && fieldNames.paymentMethod) ||
      (text.customerEmailLabel && fieldNames.customerEmail)
    );
    const hasShippingRows = !!(
      (text.shippingAddressLabel && fieldNames.shippingAddress) ||
      (text.carrierLabel && fieldNames.shippingCarrier) ||
      (text.trackingLabel && fieldNames.trackingNumber) ||
      (text.estimatedDeliveryLabel && fieldNames.estimatedDelivery)
    );
    const hasLineItemLoop = !!(fieldNames.items && fieldNames.itemName);
    const hasFinancialRows = !!(
      (text.subtotalLabel && fieldNames.subtotal) ||
      (text.discountLabel && fieldNames.discountAmount) ||
      (text.taxLabel && fieldNames.taxAmount) ||
      (text.shippingCostLabel && fieldNames.shippingCost) ||
      (text.totalLabel && fieldNames.totalPrice)
    );
    const hasBuyerRows = !!(
      fieldNames.customerFullName ||
      (text.billingAddressLabel && fieldNames.billingAddress)
    );

    // Status tracker steps (when enabled) — pre-compute widths + colours so the
    // XML can iterate without running theme math.
    const statusSteps = hasStatusTracker
      ? (() => {
          const baseWidth = Math.floor(100 / 3);
          const remainder = 100 - baseWidth * 3;
          const activeBg = theme.colors.primary?.hex ?? '#0066CC';
          const inactiveBg = theme.colors.secondary?.hex ?? '#F3F3F3';
          const activeFg = '#FFFFFF';
          const inactiveFg = '#333333';
          const labels = [
            text.statusConfirmedLabel ?? '',
            text.statusShippedLabel ?? '',
            text.statusDeliveredLabel ?? '',
          ];
          const activeIndex = 1; // Shipped

          return labels.map((label, i) => ({
            label,
            width: `${String(baseWidth + (i === 0 ? remainder : 0))}%`,
            bg: i <= activeIndex ? activeBg : inactiveBg,
            fg: i <= activeIndex ? activeFg : inactiveFg,
          }));
        })()
      : [];

    // Legal section link URLs — sanitised up front so malformed URLs fail fast
    // and the template's `*ngIf="safeReturnPolicyUrl"` check is trivially
    // reliable.
    const safeReturnPolicyUrl =
      text.returnPolicyText && text.returnPolicyUrl
        ? sanitizeUrl(text.returnPolicyUrl) || undefined
        : undefined;
    const safeTermsUrl =
      text.termsText && text.termsUrl
        ? sanitizeUrl(text.termsUrl) || undefined
        : undefined;
    const hasLegalSection = !!(text.legalText || safeReturnPolicyUrl || safeTermsUrl);

    const { field, loopValue } = makeTemplateHelpers(customFields, fieldNames);

    const context = {
      theme,
      text,
      fieldNames,
      customFields,
      trackingUrl: config.trackingUrl,
      footer: config.footer ?? {},
      hasStatusTracker,
      statusSteps,
      hasSellerRows,
      hasOrderDetailRows,
      hasShippingRows,
      hasLineItemLoop,
      hasFinancialRows,
      hasBuyerRows,
      hasLegalSection,
      safeReturnPolicyUrl,
      safeTermsUrl,
      field,
      loopValue,
    };

    const interpolatedXml = renderTemplate(SHIPPING_UPDATE_XML, context);
    const baseDoc = xmlToRcml(interpolatedXml);

    return applyTheme(baseDoc, theme);
  });
}

// ============================================================================
// Abandoned Cart Template
// ============================================================================

export interface AbandonedCartConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  cartUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    greeting: string;
    message: string;
    reminder: string;
    ctaButton: string;
    /** Heading above the line items loop section */
    lineItemsHeading?: string;
    /** Label for quantity in line items (default: 'Qty: ') */
    itemQtyLabel?: string;
    /** Label for unit price in line items (default: 'Price: ') */
    itemUnitPriceLabel?: string;
    /** Label for SKU in line items (default: 'SKU: ') */
    itemSkuLabel?: string;
    /** Label for the cart total row */
    totalLabel?: string;
  };
  fieldNames: {
    firstName: string;
    /** Repeatable items field (enables rc-loop rendering) */
    items?: string;
    /** Line item sub-field: product name */
    itemName?: string;
    /** Line item sub-field: quantity */
    itemQuantity?: string;
    /** Line item sub-field: unit price */
    itemUnitPrice?: string;
    /** Line item sub-field: SKU */
    itemSku?: string;
    /** Cart total */
    totalPrice?: string;
  };
}

/**
 * Create an abandoned cart recovery email template.
 */
export function createAbandonedCartEmail(config: AbandonedCartConfig): RcmlDocument {
  return withTemplateContext('createAbandonedCartEmail', () => {
    const { theme, customFields, fieldNames, text } = config;

    const hasLineItemLoop = !!(fieldNames.items && fieldNames.itemName);
    const hasTotalRow = !!(text.totalLabel && fieldNames.totalPrice);

    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
    };

    if (hasLineItemLoop && fieldNames.items) fieldsToValidate.items = fieldNames.items;
    if (hasTotalRow && fieldNames.totalPrice) fieldsToValidate.totalPrice = fieldNames.totalPrice;
    validateRequiredFields(customFields, fieldsToValidate);

    // Precompute the social link list for the template.
    const socialLinkEntries = Object.values(theme.links);
    const hasSocial = socialLinkEntries.length > 0;

    const { field, loopValue } = makeTemplateHelpers(customFields, fieldNames);

    const context = {
      theme,
      text,
      fieldNames,
      customFields,
      cartUrl: config.cartUrl,
      footer: config.footer ?? {},
      hasLineItemLoop,
      hasTotalRow,
      hasSocial,
      socialLinkEntries,
      field,
      loopValue,
    };

    const interpolatedXml = renderTemplate(ABANDONED_CART_XML, context);
    const baseDoc = xmlToRcml(interpolatedXml);

    return applyTheme(baseDoc, theme);
  });
}

// ============================================================================
// Order Cancellation Template
// ============================================================================

export interface OrderCancellationConfig {
  theme: EmailTheme;
  customFields: CustomFieldMap;
  websiteUrl: string;
  footer?: FooterConfig;
  text: {
    preheader: string;
    heading: string;
    greeting: string;
    message: string;
    orderRefLabel: string;
    followUp: string;
    ctaButton: string;
    /** Label for optional order date row */
    orderDateLabel?: string;
    /** Optional support/refund callout text — rendered centered when supplied */
    supportText?: string;
    /** Optional support email — rendered as a mailto link beside supportText */
    supportEmail?: string;
    /** Optional support URL — rendered as a link beside supportText */
    supportUrl?: string;
  };
  fieldNames: {
    firstName: string;
    orderRef: string;
    /** Optional order date custom field */
    orderDate?: string;
  };
}

/**
 * Create an order cancellation email template.
 *
 * Renders the XML template at `./templates/order-cancellation.xml` against
 * a context assembled from the caller's `config`; the resulting document
 * is then themed via `applyTheme`.
 */
export function createOrderCancellationEmail(config: OrderCancellationConfig): RcmlDocument {
  return withTemplateContext('createOrderCancellationEmail', () => {
    const { theme, customFields, fieldNames, text } = config;

    const hasOrderDate = !!(text.orderDateLabel && fieldNames.orderDate);
    const fieldsToValidate: Record<string, string> = {
      firstName: fieldNames.firstName,
      orderRef: fieldNames.orderRef,
    };

    if (hasOrderDate && fieldNames.orderDate) {
      fieldsToValidate.orderDate = fieldNames.orderDate;
    }

    validateRequiredFields(customFields, fieldsToValidate);

    // Support-link selection: prefer explicit URL over email; fail fast on
    // malformed emails so we never produce broken mailto links.
    let supportLinkHref: string | undefined;
    let supportLinkText: string | undefined;

    if (text.supportText) {
      const safeSupportUrl = text.supportUrl ? sanitizeUrl(text.supportUrl) : undefined;

      if (safeSupportUrl) {
        supportLinkHref = safeSupportUrl;
        supportLinkText = safeSupportUrl;
      } else if (text.supportEmail) {
        if (!/^[^\s\x00-\x1F\x7F?#&/:]+@[^\s\x00-\x1F\x7F?#&/:]+$/.test(text.supportEmail)) {
          throw new RuleConfigError(
            `supportEmail "${text.supportEmail}" is not a valid email address`
          );
        }

        supportLinkHref = `mailto:${encodeURIComponent(text.supportEmail)}`;
        supportLinkText = text.supportEmail;
      }
    }

    const { field, loopValue } = makeTemplateHelpers(customFields, fieldNames);

    const context = {
      theme,
      text,
      fieldNames,
      customFields,
      websiteUrl: config.websiteUrl,
      footer: config.footer ?? {},
      hasOrderDate,
      supportLinkHref,
      supportLinkText,
      field,
      loopValue,
    };

    const interpolatedXml = renderTemplate(ORDER_CANCELLATION_XML, context);
    const baseDoc = xmlToRcml(interpolatedXml);

    return applyTheme(baseDoc, theme);
  });
}
