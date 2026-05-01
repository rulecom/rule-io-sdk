/**
 * Unit tests for {@link createOrderConfirmationEmail}.
 *
 * Covers: baseline RCML shape, optional sections (items loop, hero
 * heading, financial summary, extended shipping address), line-item
 * label defaults, label overrides, validation/render-gate parity,
 * and template-context error wrapping.
 */

import { describe, expect, it } from 'vitest'

import type { CustomFieldMap } from '@rule-io/core'
import { RuleConfigError } from '@rule-io/core'

import {
  TEST_THEME,
  assertValidRCMLDocument,
  docToString,
} from '../../test-fixtures.js'
import { createOrderConfirmationEmail } from './order-confirmation.js'

const TEST_CUSTOM_FIELDS: CustomFieldMap = {
  'Subscriber.FirstName': 200001,
  'Order.Number': 200003,
  'Order.Date': 200004,
  'Order.TotalPrice': 200005,
  'Order.Products': 200014,
  'Order.ShippingAddress1': 200016,
  'Order.ShippingCity': 200018,
  'Order.ShippingZip': 200019,
  'Order.ShippingCountryCode': 200020,
  'Order.Subtotal': 200030,
  'Order.TaxAmount': 200031,
  'Order.DiscountAmount': 200032,
  'Order.ShippingCost': 200033,
}

describe('createOrderConfirmationEmail', () => {
  it('should produce valid RCML', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com/orders',
      text: {
        preheader: 'Your order has been confirmed!',
        greeting: 'Hi',
        intro: 'Thank you for your order. Here are the details:',
        detailsHeading: 'Order Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View Order',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    expect(json).toContain('Order Summary')
    expect(json).toContain('200001') // FirstName field ID
    expect(json).toContain('200003') // Order.Number field ID
  })

  it('should include optional items and shipping fields', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Order confirmed',
        greeting: 'Hello',
        intro: 'Your order is confirmed.',
        detailsHeading: 'Summary',
        orderRefLabel: 'Order #',
        itemsLabel: 'Items',
        totalLabel: 'Total',
        shippingLabel: 'Ship to',
        ctaButton: 'Track Order',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        items: 'Order.Products',
        shippingAddress: 'Order.ShippingAddress1',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    expect(json).toContain('Items')
    expect(json).toContain('Ship to')
    expect(json).toContain('200014') // Products field ID
    expect(json).toContain('200016') // ShippingAddress1 field ID
  })

  it('should work without optional fields', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Done.',
        detailsHeading: 'Order',
        orderRefLabel: 'Ref',
        totalLabel: 'Total',
        ctaButton: 'View',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    // Should NOT have items/shipping labels
    expect(json).not.toContain('Items')
    expect(json).not.toContain('Ship to')
  })

  it('should render rc-loop when item sub-fields are provided', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        items: 'Order.Products',
        itemName: 'name',
        itemQuantity: 'quantity',
        itemUnitPrice: 'price',
        itemTotal: 'total',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    // Loop block present
    expect(json).toContain('rc-loop')
    expect(json).toContain('custom-field')
    expect(json).toContain('200014') // Products field as loop-value

    // Line item sub-fields (JSON key names, not numeric IDs)
    expect(json).toContain('[LoopValue:name]')
    expect(json).toContain('[LoopValue:quantity]')
    expect(json).toContain('[LoopValue:price]')
    expect(json).toContain('[LoopValue:total]')
  })

  it('should use custom label values when provided', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
        itemQtyLabel: 'Antal: ',
        itemUnitPriceLabel: 'Pris: ',
        itemSubtotalLabel: 'Delsumma: ',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        items: 'Order.Products',
        itemName: 'name',
        itemQuantity: 'quantity',
        itemUnitPrice: 'price',
        itemTotal: 'total',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    // Custom labels should appear
    expect(json).toContain('Antal: ')
    expect(json).toContain('Pris: ')
    expect(json).toContain('Delsumma: ')

    // Default English labels should NOT appear
    expect(json).not.toContain('Qty: ')
    expect(json).not.toContain('Price: ')
    expect(json).not.toContain('Subtotal: ')
  })

  it('should use default English labels when custom labels not provided', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        items: 'Order.Products',
        itemName: 'name',
        itemQuantity: 'quantity',
        itemUnitPrice: 'price',
        itemTotal: 'total',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    // Default English labels should appear
    expect(json).toContain('Qty: ')
    expect(json).toContain('Price: ')
    expect(json).toContain('Subtotal: ')
  })

  it('should fall back to single-field items when no sub-fields', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Summary',
        orderRefLabel: 'Order',
        itemsLabel: 'Items',
        totalLabel: 'Total',
        ctaButton: 'View',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        items: 'Order.Products',
      },
    })

    assertValidRCMLDocument(doc)
    const json = docToString(doc)

    // Should NOT have a loop
    expect(json).not.toContain('rc-loop')
    // Should have the items field as a single placeholder
    expect(json).toContain('200014') // Products field ID
  })

  it('renders the hero heading when prefix/suffix text supplied', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Order Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
        heroHeadingPrefix: 'Order',
        heroHeadingSuffix: 'confirmed',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
      },
    })

    const json = docToString(doc)

    // Hero heading wraps orderRef placeholder with prefix/suffix text
    expect(json).toContain('Order ')
    expect(json).toContain(' confirmed')
  })

  it('renders a two-column meta row when orderDate label+field supplied', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Order Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
        orderDateLabel: 'Order date',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        orderDate: 'Order.Date',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('Order date')
    expect(json).toContain('200004') // Order.Date field ID
  })

  it('renders financial summary when any financial field is mapped', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Order Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
        subtotalLabel: 'Subtotal',
        taxLabel: 'Tax',
        discountLabel: 'Discount',
        shippingCostLabel: 'Shipping',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        subtotal: 'Order.Subtotal',
        taxAmount: 'Order.TaxAmount',
        discountAmount: 'Order.DiscountAmount',
        shippingCost: 'Order.ShippingCost',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('Subtotal: ')
    expect(json).toContain('Tax: ')
    expect(json).toContain('Discount: ')
    expect(json).toContain('Shipping: ')
    expect(json).toContain('200030') // Order.Subtotal
    expect(json).toContain('200033') // Order.ShippingCost
  })

  it('renders address block when extended shipping fields are mapped', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Order Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
        shippingAddressHeading: 'Shipping to',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        shippingAddress: 'Order.ShippingAddress1',
        shippingCity: 'Order.ShippingCity',
        shippingZip: 'Order.ShippingZip',
        shippingCountryCode: 'Order.ShippingCountryCode',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('Shipping to')
    expect(json).toContain('200016') // address1
    expect(json).toContain('200018') // city
    expect(json).toContain('200019') // zip
    expect(json).toContain('200020') // country
  })

  it('omits hero heading, meta row, financial summary and address block when not configured', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Order Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
      },
    })

    const json = docToString(doc)

    expect(json).not.toContain('Order date')
    expect(json).not.toContain('Subtotal: ')
    expect(json).not.toContain('Shipping to')
  })

  it('throws when an extended shipping field is mapped without shippingAddress', () => {
    expect(() =>
      createOrderConfirmationEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          // shippingAddress intentionally omitted
          shippingCity: 'Order.ShippingCity',
        },
      }),
    ).toThrow(RuleConfigError)
  })

  it('keeps total in details box when financial fields are mapped without labels', () => {
    // Regression: hasFinancialSummary requires both fieldName + label
    // so a mapped field with no label cannot relocate the total row.
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Order Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        subtotal: 'Order.Subtotal',
      },
    })

    const json = docToString(doc)

    // Total still rendered exactly once (in the details box)
    expect(json.match(/Total: /g)).toHaveLength(1)
    expect(json).not.toContain('Subtotal: ')
  })

  it('renders SKU loop row when itemSku sub-field is provided', () => {
    const doc = createOrderConfirmationEmail({
      theme: TEST_THEME,
      customFields: TEST_CUSTOM_FIELDS,
      websiteUrl: 'https://shop.example.com',
      text: {
        preheader: 'Confirmed',
        greeting: 'Hi',
        intro: 'Thanks!',
        detailsHeading: 'Order Summary',
        orderRefLabel: 'Order',
        totalLabel: 'Total',
        ctaButton: 'View',
        itemSkuLabel: 'SKU: ',
      },
      fieldNames: {
        firstName: 'Subscriber.FirstName',
        orderRef: 'Order.Number',
        totalPrice: 'Order.TotalPrice',
        items: 'Order.Products',
        itemName: 'name',
        itemSku: 'sku',
      },
    })

    const json = docToString(doc)

    expect(json).toContain('SKU: ')
    expect(json).toContain('[LoopValue:sku]')
  })

  it('does not throw when optional fields are mapped without their render partners', () => {
    expect(() =>
      createOrderConfirmationEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          subtotal: 'Order.MissingSubtotal',
          discountAmount: 'Order.MissingDiscount',
          taxAmount: 'Order.MissingTax',
          shippingCost: 'Order.MissingShipping',
          paymentMethod: 'Order.MissingPayment',
          orderDate: 'Order.MissingDate',
        },
      }),
    ).not.toThrow()
  })

  it('still throws when a field whose render partners are set is missing from customFields', () => {
    expect(() =>
      createOrderConfirmationEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          subtotalLabel: 'Subtotal',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
          subtotal: 'Order.MissingSubtotal',
        },
      }),
    ).toThrow(RuleConfigError)
  })

  it('does not duplicate the template name prefix in validation errors', () => {
    // Regression: validateCustomFields + withTemplateContext used to
    // duplicate the prefix. The prefix must appear exactly once.
    try {
      createOrderConfirmationEmail({
        theme: TEST_THEME,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://shop.example.com',
        text: {
          preheader: 'Confirmed',
          greeting: 'Hi',
          intro: 'Thanks!',
          detailsHeading: 'Order Summary',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.MissingOrderRef',
          totalPrice: 'Order.TotalPrice',
        },
      })
      throw new Error('expected throw')
    } catch (error) {
      expect(error).toBeInstanceOf(RuleConfigError)
      const msg = (error as RuleConfigError).message

      expect(msg).toBe(
        'createOrderConfirmationEmail > missing customFields entries: orderRef (mapped to "Order.MissingOrderRef")',
      )
      expect(msg.split('createOrderConfirmationEmail').length - 1).toBe(1)
    }
  })
})

describe('template error context (order-confirmation)', () => {
  it('should include template name when createBrandLogo throws inside builder', () => {
    const badTheme: typeof TEST_THEME = {
      ...TEST_THEME,
      images: {
        logo: { type: 'logo' as const, url: 'javascript:void(0)' },
      },
    }

    expect(() =>
      createOrderConfirmationEmail({
        theme: badTheme,
        customFields: TEST_CUSTOM_FIELDS,
        websiteUrl: 'https://example.com',
        text: {
          preheader: 'Test',
          greeting: 'Hi',
          intro: 'Intro',
          detailsHeading: 'Details',
          orderRefLabel: 'Order',
          totalLabel: 'Total',
          ctaButton: 'View',
        },
        fieldNames: {
          firstName: 'Subscriber.FirstName',
          orderRef: 'Order.Number',
          totalPrice: 'Order.TotalPrice',
        },
      }),
    ).toThrow('createOrderConfirmationEmail > createBrandLogo: invalid or unsafe logoUrl')
  })
})
