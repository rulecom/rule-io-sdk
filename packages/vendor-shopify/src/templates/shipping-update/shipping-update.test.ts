/**
 * Unit tests for {@link createShippingUpdateEmail}.
 *
 * Covers: baseline shipping-notification shape, receipt upgrade
 * (seller + financial + legal sections), line-item loop defaults +
 * overrides, status tracker rendering, and validation/render-gate
 * parity on optional receipt fields.
 */

import { describe, expect, it } from 'vitest'

import type { CustomFieldMap } from '@rule-io/core'
import { RuleConfigError } from '@rule-io/core'
import { statusTrackerSection as createStatusTrackerSection } from '@rule-io/rcml'

import {
  TEST_THEME,
  assertValidRCMLDocument,
  docToString,
} from '../../test-fixtures.js'
import { createShippingUpdateEmail } from './shipping-update.js'

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  'Subscriber.FirstName': 200001,
  'Order.Number': 200003,
  'Order.TotalPrice': 200005,
  'Order.Products': 200014,
  'Order.ShippingAddress1': 200016,
  'Order.TrackingNumber': 200021,
  'Order.EstimatedDelivery': 200022,
  'Order.CustomerFullName': 200023,
  'Order.CustomerEmail': 200024,
  'Order.OrderDate': 200025,
  'Order.BillingAddress': 200026,
  'Order.CompanyName': 200027,
  'Order.VATNumber': 200028,
  'Order.PaymentMethod': 200029,
  'Order.Subtotal': 200030,
  'Order.TaxAmount': 200031,
  'Order.DiscountAmount': 200032,
  'Order.ShippingCost': 200033,
  'Order.ShippingCarrier': 200034,
  'Order.Currency': 200009,
}

describe('createShippingUpdateEmail', () => {
  it('should produce valid RCML', () => {
    const doc = createShippingUpdateEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      trackingUrl: 'https://track.example.com',
      text: {
        preheader: 'Your order has shipped!',
        heading: 'Your Order is On Its Way',
        greeting: 'Hi',
        message: 'your order has been shipped.',
        orderRefLabel: 'Order',
        trackingLabel: 'Tracking #',
        estimatedDeliveryLabel: 'Estimated Delivery',
        ctaButton: 'Track Package',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        trackingNumber: 'Order.TrackingNumber',
        estimatedDelivery: 'Order.EstimatedDelivery',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    expect(json).toContain('Track Package')
    expect(json).toContain('https://track.example.com')
    expect(json).toContain('200021') // TrackingNumber field ID
  })

  it('should work without optional tracking fields', () => {
    const doc = createShippingUpdateEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      trackingUrl: 'https://track.example.com',
      text: {
        preheader: 'Shipped!',
        heading: 'Shipped',
        greeting: 'Hi',
        message: 'your order shipped.',
        orderRefLabel: 'Order',
        ctaButton: 'Track',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
      },
    })

    assertValidRCMLDocument(doc)
  })

  it('should render receipt sections when receipt fields provided', () => {
    const doc = createShippingUpdateEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      trackingUrl: 'https://track.example.com',
      text: {
        preheader: 'Shipped!',
        heading: 'Shipping Confirmation & Receipt',
        greeting: 'Hi',
        message: 'your order has been shipped!',
        orderRefLabel: 'Order',
        trackingLabel: 'Tracking',
        estimatedDeliveryLabel: 'Est. delivery',
        ctaButton: 'Track Shipment',
        companyLabel: 'Seller',
        vatLabel: 'VAT',
        orderDateLabel: 'Date',
        paymentMethodLabel: 'Payment',
        customerEmailLabel: 'Email',
        shippingAddressLabel: 'Ship to',
        carrierLabel: 'Carrier',
        lineItemsHeading: 'Items',
        subtotalLabel: 'Subtotal',
        taxLabel: 'Tax',
        discountLabel: 'Discount',
        shippingCostLabel: 'Shipping',
        totalLabel: 'Total',
        billingAddressLabel: 'Bill to',
        legalText: 'This is your receipt.',
        returnPolicyText: 'Return Policy',
        returnPolicyUrl: 'https://shop.example.com/returns',
        termsText: 'Terms',
        termsUrl: 'https://shop.example.com/terms',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        trackingNumber: 'Order.TrackingNumber',
        estimatedDelivery: 'Order.EstimatedDelivery',
        customerFullName: 'Order.CustomerFullName',
        customerEmail: 'Order.CustomerEmail',
        orderDate: 'Order.OrderDate',
        billingAddress: 'Order.BillingAddress',
        companyName: 'Order.CompanyName',
        vatNumber: 'Order.VATNumber',
        paymentMethod: 'Order.PaymentMethod',
        currency: 'Order.Currency',
        subtotal: 'Order.Subtotal',
        taxAmount: 'Order.TaxAmount',
        discountAmount: 'Order.DiscountAmount',
        shippingCost: 'Order.ShippingCost',
        shippingAddress: 'Order.ShippingAddress1',
        shippingCarrier: 'Order.ShippingCarrier',
        totalPrice: 'Order.TotalPrice',
        items: 'Order.Products',
        itemName: 'name',
        itemQuantity: 'quantity',
        itemUnitPrice: 'price',
        itemTotal: 'total',
        itemSku: 'sku',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    // Receipt sections present
    expect(json).toContain('Seller')
    expect(json).toContain('VAT')
    expect(json).toContain('Subtotal')
    expect(json).toContain('Tax')
    expect(json).toContain('Total')
    expect(json).toContain('This is your receipt.')
    expect(json).toContain('Return Policy')
    expect(json).toContain('https://shop.example.com/returns')

    // Loop block for line items
    expect(json).toContain('rc-loop')
    expect(json).toContain('custom-field')
    expect(json).toContain('200014') // Products field ID as loop-value

    // Line item sub-fields in loop (JSON key names)
    expect(json).toContain('[LoopValue:name]')
    expect(json).toContain('[LoopValue:sku]')
  })

  it('should use default English labels for ShippingUpdate line items', () => {
    const doc = createShippingUpdateEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      trackingUrl: 'https://track.example.com',
      text: {
        preheader: 'Shipped!',
        heading: 'Shipped',
        greeting: 'Hi',
        message: 'shipped.',
        orderRefLabel: 'Order',
        ctaButton: 'Track',
        lineItemsHeading: 'Items',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        items: 'Order.Products',
        itemName: 'name',
        itemQuantity: 'quantity',
        itemUnitPrice: 'price',
        itemTotal: 'total',
        itemSku: 'sku',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    expect(json).toContain('SKU: ')
    expect(json).toContain('Qty: ')
    expect(json).toContain('Unit price: ')
    expect(json).toContain('Line total: ')
  })

  it('should use custom labels for ShippingUpdate line items when provided', () => {
    const doc = createShippingUpdateEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      trackingUrl: 'https://track.example.com',
      text: {
        preheader: 'Shipped!',
        heading: 'Shipped',
        greeting: 'Hi',
        message: 'shipped.',
        orderRefLabel: 'Order',
        ctaButton: 'Track',
        lineItemsHeading: 'Items',
        itemSkuLabel: 'Artikelnr: ',
        itemQtyLabel: 'Antal: ',
        itemUnitPriceLabel: 'Styckpris: ',
        itemLineTotalLabel: 'Radsumma: ',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        items: 'Order.Products',
        itemName: 'name',
        itemQuantity: 'quantity',
        itemUnitPrice: 'price',
        itemTotal: 'total',
        itemSku: 'sku',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    expect(json).toContain('Artikelnr: ')
    expect(json).toContain('Antal: ')
    expect(json).toContain('Styckpris: ')
    expect(json).toContain('Radsumma: ')

    expect(json).not.toContain('SKU: ')
    expect(json).not.toContain('Qty: ')
    expect(json).not.toContain('Unit price: ')
    expect(json).not.toContain('Line total: ')
  })

  it('should render identically to base when no receipt fields provided', () => {
    const baseDoc = createShippingUpdateEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      trackingUrl: 'https://track.example.com',
      text: {
        preheader: 'Shipped!',
        heading: 'Shipped',
        greeting: 'Hi',
        message: 'shipped.',
        orderRefLabel: 'Order',
        ctaButton: 'Track',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
      },
    })

    assertValidRCMLDocument(baseDoc)
    const json = docToString(baseDoc)

    expect(json).not.toContain('rc-loop')
    expect(json).not.toContain('Subtotal')
    expect(json).not.toContain('receipt')
  })

  it('renders a 3-step status tracker when all three labels supplied', () => {
    const doc = createShippingUpdateEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      trackingUrl: 'https://track.example.com',
      text: {
        preheader: 'Shipped',
        heading: 'On its way',
        greeting: 'Hi',
        message: 'shipped!',
        orderRefLabel: 'Order',
        ctaButton: 'Track',
        statusConfirmedLabel: 'Confirmed',
        statusShippedLabel: 'Shipped',
        statusDeliveredLabel: 'Delivered',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('Confirmed')
    expect(json).toContain('Shipped')
    expect(json).toContain('Delivered')
    // Active step (Shipped, activeIndex=1) uses the button color as background
    expect(json).toContain('#0066CC')
  })

  it('omits the status tracker when any step label is missing', () => {
    const doc = createShippingUpdateEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      trackingUrl: 'https://track.example.com',
      text: {
        preheader: 'Shipped',
        heading: 'On its way',
        greeting: 'Hi',
        message: 'shipped!',
        orderRefLabel: 'Order',
        ctaButton: 'Track',
        // Only two of three labels supplied — tracker should NOT render
        statusConfirmedLabel: 'Confirmed',
        statusShippedLabel: 'Shipped',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
      },
    })

    const json = docToString(doc)

    expect(json).not.toContain('Confirmed')
    expect(json).not.toContain('Delivered')
  })

  it('does not throw when optional receipt fields are mapped without their labels', () => {
    expect(() =>
      createShippingUpdateEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'your order has shipped.',
          orderRefLabel: 'Order',
          ctaButton: 'Track',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          trackingNumber: 'Order.MissingTracking',
          orderDate: 'Order.MissingDate',
          billingAddress: 'Order.MissingBilling',
          companyName: 'Order.MissingCompany',
          vatNumber: 'Order.MissingVat',
          subtotal: 'Order.MissingSubtotal',
          taxAmount: 'Order.MissingTax',
          totalPrice: 'Order.MissingTotal',
        },
      }),
    ).not.toThrow()
  })

  it('still throws when a field whose label is set is missing from customFields', () => {
    expect(() =>
      createShippingUpdateEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        trackingUrl: 'https://track.example.com',
        text: {
          preheader: 'Shipped',
          heading: 'Shipped',
          greeting: 'Hi',
          message: 'your order has shipped.',
          orderRefLabel: 'Order',
          trackingLabel: 'Tracking',
          ctaButton: 'Track',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          trackingNumber: 'Order.MissingTracking',
        },
      }),
    ).toThrow(RuleConfigError)
  })
})

// ============================================================================
// Status-tracker builder: rejection tests (exported from rcml package)
// ============================================================================

describe('statusTrackerSection (rcml helper used by shipping-update)', () => {
  it('rejects status trackers with more than 4 steps', () => {
    expect(() =>
      createStatusTrackerSection({
        steps: [
          { label: 'a' },
          { label: 'b' },
          { label: 'c' },
          { label: 'd' },
          { label: 'e' },
        ],
        activeIndex: 0,
        theme: TEST_THEME,
      }),
    ).toThrow(RuleConfigError)
  })

  it('rejects status trackers with activeIndex out of range', () => {
    expect(() =>
      createStatusTrackerSection({
        steps: [{ label: 'a' }, { label: 'b' }],
        activeIndex: 5,
        theme: TEST_THEME,
      }),
    ).toThrow(RuleConfigError)
    expect(() =>
      createStatusTrackerSection({
        steps: [{ label: 'a' }, { label: 'b' }],
        activeIndex: -1,
        theme: TEST_THEME,
      }),
    ).toThrow(RuleConfigError)
  })

  it('rejects empty step lists', () => {
    expect(() =>
      createStatusTrackerSection({
        steps: [],
        activeIndex: 0,
        theme: TEST_THEME,
      }),
    ).toThrow(RuleConfigError)
  })

  it('distributes rounding remainder so column widths sum to 100%', () => {
    const section = createStatusTrackerSection({
      steps: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
      activeIndex: 0,
      theme: TEST_THEME,
    })
    const widths = (
      section as { children: { attributes: { width: string } }[] }
    ).children.map((col) => parseInt(col.attributes.width, 10))

    expect(widths.reduce((a, b) => a + b, 0)).toBe(100)
  })
})
